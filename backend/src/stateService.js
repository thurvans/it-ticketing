import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { config } from "./config.js";
import { ensureDatabaseExists, pool, withTransaction } from "./db.js";
import { signAccessToken, verifyAccessToken } from "./jwt.js";
import {
  assertMailDeliveryConfigured,
  buildFrontendUrl,
  sendAccountActivationEmail,
  sendPasswordResetEmail,
} from "./mailService.js";
import { deleteStoredObjects, signObjectUrl, uploadObjectBuffer } from "./storageService.js";
import { ATTACHMENT_MAX_MB } from "./shared/attachmentRules.js";
import {
  WORKSPACE_LOGO_MAX_BYTES,
  validateWorkspaceLogoDescriptor,
} from "./shared/workspaceLogoRules.js";
import {
  getDefaultRolePermissions,
  getDefaultSystemSettings,
  PROFILE_ID_LENGTH,
  PROFILE_ID_START,
  REPORT_GROUP_BY_OPTIONS,
  ROLES,
} from "./shared/workspaceSchema.js";

const REPORT_GROUP_BY_OPTION_SET = new Set(REPORT_GROUP_BY_OPTIONS);
const DEFAULT_SYSTEM_SETTINGS = getDefaultSystemSettings();
const DEFAULT_ROLE_PERMISSIONS = getDefaultRolePermissions();
const AUTH_ACTION_TYPES = {
  ACCOUNT_ACTIVATION: "account_activation",
  PASSWORD_RESET: "password_reset",
};

function nowIso() {
  return new Date().toISOString();
}

function generateId(prefix = "id") {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function generateActionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashActionToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function addHoursToNow(hours) {
  return new Date(Date.now() + Math.max(1, hours) * 60 * 60 * 1000).toISOString();
}

function addMinutesToNow(minutes) {
  return new Date(Date.now() + Math.max(1, minutes) * 60 * 1000).toISOString();
}

function assertPasswordStrength(password, message = "Password minimal 8 karakter.") {
  if (String(password || "").trim().length < 8) {
    throw new Error(message);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function queryOne(client, text, params = []) {
  const result = await client.query(text, params);
  return result.rows[0] || null;
}

async function generateProfileId(client = pool) {
  const row = await queryOne(client, "select nextval('profile_id_seq')::bigint as next_id");
  const nextId = Number(row?.next_id || 0);

  if (!Number.isFinite(nextId) || nextId < PROFILE_ID_START) {
    throw new Error("Gagal menghasilkan ID profile baru.");
  }

  if (nextId > 999999) {
    throw new Error("ID profile 6 digit sudah habis. Perlu perluasan format ID.");
  }

  return String(nextId).padStart(PROFILE_ID_LENGTH, "0");
}

function mapRows(rows) {
  return clone(rows || []);
}

function buildSystemSettingsFromRows(rows) {
  const settings = {
    ...DEFAULT_SYSTEM_SETTINGS,
  };

  for (const row of rows || []) {
    settings[row.key] = normalizeSystemSettingValue(row.key, row.value);
  }

  return settings;
}

async function enrichSystemSettingsForClient(settings) {
  const normalizedSettings = {
    ...clone(settings || DEFAULT_SYSTEM_SETTINGS),
  };

  normalizedSettings.logo_signed_url = await signObjectUrl(normalizedSettings.logo_url || "");
  return normalizedSettings;
}

function buildRolePermissionsFromRows(rows) {
  const rolePermissions = clone(DEFAULT_ROLE_PERMISSIONS);

  for (const row of rows || []) {
    if (rolePermissions[row.role]) {
      rolePermissions[row.role][row.permission_key] = Boolean(row.is_allowed);
    }
  }

  return rolePermissions;
}

function flattenRolePermissions(rolePermissions) {
  return Object.entries(rolePermissions || {}).flatMap(([role, permissions]) =>
    Object.entries(permissions || {}).map(([permissionKey, isAllowed]) => ({
      role,
      permission_key: permissionKey,
      is_allowed: Boolean(isAllowed),
    })),
  );
}

function coerceBoolean(value, fallback = false) {
  if (value == null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function coerceNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSystemSettingValue(key, value) {
  const fallback = DEFAULT_SYSTEM_SETTINGS[key];

  if (key === "attachment_limit_mb") {
    const normalizedValue = coerceNumber(value, fallback);
    return Math.max(1, Math.min(normalizedValue, ATTACHMENT_MAX_MB));
  }

  if (typeof fallback === "boolean") {
    return coerceBoolean(value, fallback);
  }

  if (typeof fallback === "number") {
    return coerceNumber(value, fallback);
  }

  const nextValue = String(value ?? "").trim();

  if (key === "default_report_group_by") {
    return REPORT_GROUP_BY_OPTION_SET.has(nextValue) ? nextValue : fallback;
  }

  return nextValue || fallback;
}

function normalizeSystemSettingsPayload(payload = {}) {
  return Object.keys(DEFAULT_SYSTEM_SETTINGS).reduce((accumulator, key) => {
    accumulator[key] = normalizeSystemSettingValue(key, payload[key]);
    return accumulator;
  }, {});
}

function normalizeRolePermissionsPayload(payload = {}) {
  return Object.entries(DEFAULT_ROLE_PERMISSIONS).reduce((accumulator, [role, permissions]) => {
    accumulator[role] = Object.keys(permissions).reduce((permissionBucket, permissionKey) => {
      if (role === "super_admin") {
        permissionBucket[permissionKey] = true;
        return permissionBucket;
      }

      if (Object.prototype.hasOwnProperty.call(payload?.[role] || {}, permissionKey)) {
        permissionBucket[permissionKey] = Boolean(payload[role][permissionKey]);
        return permissionBucket;
      }

      permissionBucket[permissionKey] = permissions[permissionKey];
      return permissionBucket;
    }, {});

    return accumulator;
  }, {});
}

function assertSuperAdminProfile(profile) {
  if (profile?.role !== "super_admin") {
    throw new Error("Hanya super admin yang dapat mengelola konfigurasi sistem dan permission matrix.");
  }
}

async function createDomainTables(client) {
  await client.query(`
    create table if not exists auth_accounts (
      id text primary key,
      profile_id text not null unique,
      email text not null,
      password_hash text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create unique index if not exists auth_accounts_email_unique_idx
      on auth_accounts (lower(email));

    create table if not exists profiles (
      id text primary key,
      full_name text not null,
      email text not null,
      role text not null,
      department text,
      position text,
      specialization text,
      phone text,
      is_active boolean not null default true,
      email_verification_status text not null default 'verified',
      email_verified_at timestamptz,
      created_at timestamptz not null,
      updated_at timestamptz not null
    );

    create unique index if not exists profiles_email_unique_idx
      on profiles (lower(email));

    create index if not exists profiles_role_idx
      on profiles (role);

    create sequence if not exists profile_id_seq
      increment by 1
      minvalue 100001
      maxvalue 999999
      start with 100001;

    create table if not exists auth_action_tokens (
      id text primary key,
      profile_id text not null references profiles(id) on delete cascade,
      email text not null,
      type text not null,
      token_hash text not null unique,
      expires_at timestamptz not null,
      consumed_at timestamptz,
      created_at timestamptz not null default now()
    );

    create index if not exists auth_action_tokens_profile_type_idx
      on auth_action_tokens (profile_id, type, created_at desc);

    create table if not exists ticket_categories (
      id text primary key,
      name text not null,
      description text,
      is_active boolean not null default true,
      sort_order integer not null default 1,
      created_at timestamptz not null,
      updated_at timestamptz not null
    );

    create table if not exists sla_settings (
      id text primary key,
      priority text not null,
      response_time_hours integer not null,
      resolution_time_hours integer not null,
      is_active boolean not null default true,
      created_at timestamptz not null,
      updated_at timestamptz not null
    );

    create unique index if not exists sla_settings_priority_unique_idx
      on sla_settings (priority);

    create table if not exists system_settings (
      key text primary key,
      value jsonb not null
    );

    create table if not exists role_permissions (
      role text not null,
      permission_key text not null,
      is_allowed boolean not null default false,
      primary key (role, permission_key)
    );

    create table if not exists announcements (
      id text primary key,
      title text not null,
      content text not null,
      is_active boolean not null default true,
      start_date timestamptz not null,
      end_date timestamptz not null,
      created_by text references profiles(id) on delete set null,
      created_at timestamptz not null,
      updated_at timestamptz not null
    );

    create index if not exists announcements_active_window_idx
      on announcements (is_active, start_date desc, end_date desc);

    create table if not exists tickets (
      id text primary key,
      ticket_number text unique,
      title text not null,
      description text not null,
      category_id text not null references ticket_categories(id) on delete restrict,
      priority text not null,
      status text not null,
      created_by text not null references profiles(id) on delete restrict,
      assigned_to text references profiles(id) on delete set null,
      department text,
      location text,
      contact_number text,
      sla_deadline timestamptz,
      resolved_at timestamptz,
      closed_at timestamptz,
      rating integer,
      feedback text,
      created_at timestamptz not null,
      updated_at timestamptz not null
    );

    create index if not exists tickets_created_by_idx
      on tickets (created_by);

    create index if not exists tickets_assigned_to_idx
      on tickets (assigned_to);

    create index if not exists tickets_category_idx
      on tickets (category_id);

    create index if not exists tickets_status_idx
      on tickets (status);

    create index if not exists tickets_priority_idx
      on tickets (priority);

    create index if not exists tickets_created_at_idx
      on tickets (created_at desc);

    create index if not exists tickets_updated_at_idx
      on tickets (updated_at desc);

    create table if not exists ticket_attachments (
      id text primary key,
      ticket_id text not null references tickets(id) on delete cascade,
      uploaded_by text references profiles(id) on delete set null,
      file_name text not null,
      file_url text not null,
      file_type text,
      file_size bigint not null default 0,
      created_at timestamptz not null
    );

    create index if not exists ticket_attachments_ticket_idx
      on ticket_attachments (ticket_id, created_at asc);

    create table if not exists ticket_comments (
      id text primary key,
      ticket_id text not null references tickets(id) on delete cascade,
      user_id text references profiles(id) on delete set null,
      comment text not null,
      is_internal boolean not null default false,
      created_at timestamptz not null
    );

    create index if not exists ticket_comments_ticket_idx
      on ticket_comments (ticket_id, created_at asc);

    create table if not exists ticket_comment_attachments (
      id text primary key,
      ticket_id text not null references tickets(id) on delete cascade,
      comment_id text not null references ticket_comments(id) on delete cascade,
      uploaded_by text references profiles(id) on delete set null,
      file_name text not null,
      file_url text not null,
      file_type text,
      file_size bigint not null default 0,
      created_at timestamptz not null
    );

    create index if not exists ticket_comment_attachments_ticket_idx
      on ticket_comment_attachments (ticket_id, created_at asc);

    create table if not exists ticket_logs (
      id text primary key,
      ticket_id text not null references tickets(id) on delete cascade,
      user_id text references profiles(id) on delete set null,
      action text not null,
      old_value text,
      new_value text,
      description text,
      created_at timestamptz not null
    );

    create index if not exists ticket_logs_ticket_idx
      on ticket_logs (ticket_id, created_at asc);

    create table if not exists notifications (
      id text primary key,
      user_id text not null references profiles(id) on delete cascade,
      title text not null,
      message text not null,
      type text not null,
      is_read boolean not null default false,
      related_ticket_id text references tickets(id) on delete set null,
      created_at timestamptz not null
    );

    create index if not exists notifications_user_created_idx
      on notifications (user_id, created_at desc);

    create table if not exists audit_logs (
      id text primary key,
      user_id text references profiles(id) on delete set null,
      action text not null,
      module text not null,
      target_id text,
      description text,
      ip_address text,
      created_at timestamptz not null
    );

    create index if not exists audit_logs_created_idx
      on audit_logs (created_at desc);

    create index if not exists audit_logs_module_idx
      on audit_logs (module);
  `);

  await client.query(`
    alter table profiles
      add column if not exists email_verification_status text not null default 'verified';

    alter table profiles
      add column if not exists email_verified_at timestamptz;
  `);

  await client.query(
    `
      select setval(
        'profile_id_seq',
        greatest(
          (
            select coalesce(max(case when id ~ '^\\d{6}$' then id::integer end), $1)::integer
            from profiles
          ),
          $1
        ),
        true
      )
    `,
    [PROFILE_ID_START - 1],
  );
}

async function readSystemSettingsRows(client = pool) {
  const result = await client.query(`
    select key, value
    from system_settings
    order by key asc
  `);

  return mapRows(result.rows);
}

async function readRolePermissionRows(client = pool) {
  const result = await client.query(`
    select role, permission_key, is_allowed
    from role_permissions
    order by role asc, permission_key asc
  `);

  return mapRows(result.rows);
}

async function ensureDefaultSystemAccess(client) {
  for (const [key, value] of Object.entries(DEFAULT_SYSTEM_SETTINGS)) {
    await client.query(
      `
        insert into system_settings (key, value)
        values ($1, $2::jsonb)
        on conflict (key) do nothing
      `,
      [key, JSON.stringify(value)],
    );
  }

  for (const permission of flattenRolePermissions(DEFAULT_ROLE_PERMISSIONS)) {
    await client.query(
      `
        insert into role_permissions (role, permission_key, is_allowed)
        values ($1, $2, $3)
        on conflict (role, permission_key) do nothing
      `,
      [permission.role, permission.permission_key, permission.is_allowed],
    );
  }
}

export async function initializeDatabase() {
  if (config.autoCreateDatabase) {
    await ensureDatabaseExists();
  }

  await createDomainTables(pool);

  await withTransaction(async (client) => {
    await ensureDefaultSystemAccess(client);
  });
}

export async function getSystemAccessConfig(client = pool) {
  const [systemSettingsRows, rolePermissionRows] = await Promise.all([
    readSystemSettingsRows(client),
    readRolePermissionRows(client),
  ]);

  return {
    systemSettings: await enrichSystemSettingsForClient(buildSystemSettingsFromRows(systemSettingsRows)),
    rolePermissions: buildRolePermissionsFromRows(rolePermissionRows),
  };
}

export async function getPublicSystemAccess(client = pool) {
  const { systemSettings } = await getSystemAccessConfig(client);
  return {
    systemSettings: clone(systemSettings),
  };
}

export async function saveSystemSettings(actorProfile, payload) {
  assertSuperAdminProfile(actorProfile);
  const nextSettings = normalizeSystemSettingsPayload(payload);

  const { savedSettings, previousLogoUrl } = await withTransaction(async (client) => {
    const previousSettings = buildSystemSettingsFromRows(await readSystemSettingsRows(client));

    for (const [key, value] of Object.entries(nextSettings)) {
      await client.query(
        `
          insert into system_settings (key, value)
          values ($1, $2::jsonb)
          on conflict (key) do update
          set value = excluded.value
        `,
        [key, JSON.stringify(value)],
      );
    }

    await insertAuditLogRow(
      {
        user_id: actorProfile.id,
        action: "update_system_settings",
        module: "system_settings",
        target_id: "workspace-config",
        description: "Memperbarui konfigurasi sistem inti workspace.",
      },
      client,
    );

    return {
      savedSettings: nextSettings,
      previousLogoUrl: previousSettings.logo_url || "",
    };
  });

  if (previousLogoUrl && previousLogoUrl !== savedSettings.logo_url) {
    try {
      await deleteStoredObjects([previousLogoUrl]);
    } catch (error) {
      console.error("Gagal menghapus logo workspace lama dari storage:", error);
    }
  }

  return enrichSystemSettingsForClient(savedSettings);
}

export async function saveRolePermissions(actorProfile, payload) {
  assertSuperAdminProfile(actorProfile);
  const nextPermissions = normalizeRolePermissionsPayload(payload);

  return withTransaction(async (client) => {
    await client.query("delete from role_permissions");

    for (const permission of flattenRolePermissions(nextPermissions)) {
      await client.query(
        `
          insert into role_permissions (role, permission_key, is_allowed)
          values ($1, $2, $3)
        `,
        [permission.role, permission.permission_key, permission.is_allowed],
      );
    }

    await insertAuditLogRow(
      {
        user_id: actorProfile.id,
        action: "update_role_permissions",
        module: "role_permissions",
        target_id: "permission-matrix",
        description: "Memperbarui matriks permission untuk seluruh role aplikasi.",
      },
      client,
    );

    return nextPermissions;
  });
}

export async function uploadWorkspaceLogoBinary(actorProfile, payload) {
  assertSuperAdminProfile(actorProfile);

  const fileName = String(payload?.fileName || payload?.file_name || "workspace-logo").trim() || "workspace-logo";
  const fileType = String(payload?.fileType || payload?.file_type || "application/octet-stream").trim()
    || "application/octet-stream";
  const buffer = Buffer.isBuffer(payload?.buffer) ? payload.buffer : Buffer.from(payload?.buffer || []);
  const fileSize = buffer.length;
  const validationMessage = validateWorkspaceLogoDescriptor(
    {
      fileName,
      fileType,
      fileSize,
    },
    { maxFileSizeBytes: WORKSPACE_LOGO_MAX_BYTES },
  );

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const uploadedLogo = await uploadObjectBuffer(
    {
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      buffer,
    },
    {
      scope: "workspace-logo",
    },
  );

  return {
    ...uploadedLogo,
    signed_url: await signObjectUrl(uploadedLogo.file_url),
  };
}

async function findAccountByEmail(email, client = pool) {
  return queryOne(client, "select * from auth_accounts where lower(email) = lower($1)", [normalizeEmail(email)]);
}

async function findAccountByProfileId(profileId, client = pool) {
  return queryOne(client, "select * from auth_accounts where profile_id = $1", [profileId]);
}

async function findProfileById(profileId, client = pool) {
  return queryOne(
    client,
    `
      select
        id,
        full_name,
        email,
        role,
        department,
        position,
        specialization,
        phone,
        is_active,
        email_verification_status,
        email_verified_at,
        created_at,
        updated_at
      from profiles
      where id = $1
    `,
    [profileId],
  );
}

async function invalidateAuthActionTokens(profileId, type, client = pool) {
  await client.query(
    `
      delete from auth_action_tokens
      where profile_id = $1
        and type = $2
        and consumed_at is null
    `,
    [profileId, type],
  );
}

async function issueAuthActionToken({ profileId, email, type, expiresAt }, client = pool) {
  const plainToken = generateActionToken();

  await invalidateAuthActionTokens(profileId, type, client);
  await client.query(
    `
      insert into auth_action_tokens (id, profile_id, email, type, token_hash, expires_at, created_at)
      values ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      generateId("auth-token"),
      profileId,
      email,
      type,
      hashActionToken(plainToken),
      expiresAt,
      nowIso(),
    ],
  );

  return plainToken;
}

async function consumeAuthActionToken(type, token, client = pool) {
  const tokenHash = hashActionToken(token);
  const record = await queryOne(
    client,
    `
      select id, profile_id, email, type, expires_at, consumed_at, created_at
      from auth_action_tokens
      where type = $1
        and token_hash = $2
      for update
    `,
    [type, tokenHash],
  );

  if (!record) {
    throw new Error("Token tidak valid atau sudah tidak tersedia.");
  }

  if (record.consumed_at) {
    throw new Error("Token sudah pernah digunakan.");
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    throw new Error("Token sudah kedaluwarsa. Silakan minta link baru.");
  }

  await client.query(
    `
      update auth_action_tokens
      set consumed_at = $2
      where id = $1
    `,
    [record.id, nowIso()],
  );

  return record;
}

async function insertAuditLogRow(entry, client = pool) {
  await client.query(
    `
      insert into audit_logs (id, user_id, action, module, target_id, description, ip_address, created_at)
      values ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      entry.id || generateId("audit"),
      entry.user_id || null,
      entry.action,
      entry.module,
      entry.target_id || null,
      entry.description || null,
      entry.ip_address || "127.0.0.1",
      entry.created_at || nowIso(),
    ],
  );
}

export async function getSessionData(token, client = pool) {
  if (!token) {
    return null;
  }

  let payload = null;

  try {
    payload = verifyAccessToken(token);
  } catch {
    return null;
  }

  const profile = await findProfileById(payload?.sub, client);

  if (!profile) {
    return null;
  }

  return {
    token,
    user: {
      id: profile.id,
      email: profile.email,
    },
    profile,
  };
}

function assertActiveProfile(profile) {
  if (profile?.is_active === false) {
    throw new Error("Akun Anda sedang nonaktif. Hubungi admin IT untuk mengaktifkan kembali akses.");
  }
}

function assertVerifiedProfile(profile) {
  if (profile?.email_verification_status === "pending") {
    throw new Error("Akun belum diaktivasi. Silakan cek email Anda untuk link aktivasi akun.");
  }
}

export async function signInWithPassword(email, password, metadata = {}) {
  const account = await findAccountByEmail(email);

  if (!account) {
    throw new Error("Email atau password tidak sesuai.");
  }

  const isValid = await bcrypt.compare(password, account.password_hash);

  if (!isValid) {
    throw new Error("Email atau password tidak sesuai.");
  }

  const profile = await findProfileById(account.profile_id);

  if (!profile) {
    throw new Error("Profil akun tidak ditemukan.");
  }

  assertActiveProfile(profile);
  assertVerifiedProfile(profile);

  const token = signAccessToken(profile, metadata);

  return {
    token,
    user: {
      id: profile.id,
      email: profile.email,
    },
    profile,
  };
}

function buildSelfProfilePayload(payload) {
  return {
    full_name: payload.full_name?.trim() || "",
    department: payload.department?.trim() || "",
    position: payload.position?.trim() || "",
    specialization: payload.specialization?.trim() || "",
    phone: payload.phone?.trim() || "",
  };
}

function buildManagedProfilePayload(payload) {
  return {
    full_name: payload.full_name?.trim() || "",
    email: normalizeEmail(payload.email),
    role: payload.role || "user",
    department: payload.department?.trim() || "",
    position: payload.position?.trim() || "",
    specialization: payload.specialization?.trim() || "",
    phone: payload.phone?.trim() || "",
    is_active: payload.is_active !== false,
  };
}

function assertManagedRoleAllowed(currentProfile, targetRole, nextRole) {
  const actorRole = currentProfile?.role || "";

  if (!["admin", "super_admin"].includes(actorRole)) {
    throw new Error("Anda tidak memiliki izin untuk mengelola akun pengguna.");
  }

  if (actorRole !== "super_admin" && [targetRole, nextRole].some((role) => ["admin", "super_admin"].includes(role))) {
    throw new Error("Hanya super admin yang dapat mengelola akun admin.");
  }
}

export async function registerUser(payload, metadata = {}) {
  const email = normalizeEmail(payload.email);
  const fullName = payload.full_name?.trim() || "";
  const password = String(payload.password || "");

  if (!fullName) {
    throw new Error("Nama lengkap wajib diisi.");
  }

  if (!email) {
    throw new Error("Email wajib diisi.");
  }

  assertPasswordStrength(password);
  assertMailDeliveryConfigured();

  return withTransaction(async (client) => {
    const systemSettings = await getPublicSystemAccess(client);

    if (systemSettings.systemSettings.allow_self_registration === false) {
      throw new Error("Registrasi mandiri saat ini dinonaktifkan. Hubungi admin IT untuk pembuatan akun.");
    }

    const existingAccount = await findAccountByEmail(email, client);

    if (existingAccount) {
      throw new Error("Email sudah terdaftar.");
    }

    const profileId = await generateProfileId(client);
    const timestamp = nowIso();
    const profile = {
      id: profileId,
      full_name: fullName,
      email,
      role: "user",
      department: payload.department?.trim() || "",
      position: payload.position?.trim() || "",
      phone: payload.phone?.trim() || "",
      is_active: true,
      email_verification_status: "pending",
      email_verified_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    };

    await client.query(
      `
        insert into profiles (
          id, full_name, email, role, department, position, specialization, phone, is_active,
          email_verification_status, email_verified_at, created_at, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
      [
        profile.id,
        profile.full_name,
        profile.email,
        profile.role,
        profile.department || null,
        profile.position || null,
        profile.specialization || null,
        profile.phone || null,
        true,
        profile.email_verification_status,
        profile.email_verified_at,
        profile.created_at,
        profile.updated_at,
      ],
    );

    await insertAuditLogRow({
      user_id: profileId,
      action: "register_profile",
      module: "profiles",
      target_id: profileId,
      description: `Registrasi akun baru untuk ${profile.full_name}.`,
      created_at: timestamp,
    }, client);

    await client.query(
      `
        insert into auth_accounts (id, profile_id, email, password_hash, created_at, updated_at)
        values ($1, $2, $3, $4, now(), now())
      `,
      [generateId("account"), profileId, email, await bcrypt.hash(password, 10)],
    );

    const activationToken = await issueAuthActionToken(
      {
        profileId,
        email,
        type: AUTH_ACTION_TYPES.ACCOUNT_ACTIVATION,
        expiresAt: addHoursToNow(config.accountActivationTtlHours),
      },
      client,
    );

    await sendAccountActivationEmail({
      recipientName: profile.full_name,
      recipientEmail: email,
      activationUrl: buildFrontendUrl(`/activate-account?token=${encodeURIComponent(activationToken)}`),
    });

    return {
      token: null,
      message: "Pendaftaran berhasil. Cek email Anda untuk mengaktifkan akun sebelum login.",
      requires_activation: true,
      user: {
        id: profileId,
        email,
      },
      profile,
    };
  });
}

export async function updateOwnProfile(profileId, updates) {
  const existingProfile = await findProfileById(profileId);

  if (!existingProfile) {
    throw new Error("Profil tidak ditemukan.");
  }

  const payload = buildSelfProfilePayload(updates);
  const updatedAt = nowIso();

  await pool.query(
    `
      update profiles
      set
        full_name = $2,
        department = $3,
        position = $4,
        specialization = $5,
        phone = $6,
        updated_at = $7
      where id = $1
    `,
    [
      profileId,
      payload.full_name,
      payload.department || null,
      payload.position || null,
      payload.specialization || null,
      payload.phone || null,
      updatedAt,
    ],
  );

  return findProfileById(profileId);
}

export async function updateOwnPassword(profileId, password) {
  const account = await findAccountByProfileId(profileId);

  if (!account) {
    throw new Error("Akun pengguna tidak ditemukan.");
  }

  assertPasswordStrength(password, "Password baru minimal 8 karakter.");

  await pool.query(
    `
      update auth_accounts
      set password_hash = $2,
          updated_at = now()
      where profile_id = $1
    `,
    [profileId, await bcrypt.hash(password, 10)],
  );
}

export async function saveManagedProfile(actorProfile, payload) {
  return withTransaction(async (client) => {
    const normalized = buildManagedProfilePayload(payload);

    if (!normalized.full_name) {
      throw new Error("Nama lengkap wajib diisi.");
    }

    if (!normalized.email) {
      throw new Error("Email wajib diisi.");
    }

    if (!ROLES.includes(normalized.role)) {
      throw new Error("Role pengguna tidak valid.");
    }

    if (!payload.id && !payload.password?.trim()) {
      throw new Error("Password wajib diisi untuk akun baru.");
    }

    if (!payload.id) {
      assertPasswordStrength(payload.password?.trim(), "Password akun baru minimal 8 karakter.");
    }

    if (payload.id === actorProfile?.id && (normalized.role !== actorProfile.role || normalized.is_active === false)) {
      throw new Error("Akun Anda sendiri tidak dapat diubah role atau statusnya dari halaman ini.");
    }

    const existingProfile = payload.id ? await findProfileById(payload.id, client) : null;

    assertManagedRoleAllowed(actorProfile, existingProfile?.role, normalized.role);

    const conflictingAccount = await findAccountByEmail(normalized.email, client);

    if (conflictingAccount && conflictingAccount.profile_id !== payload.id) {
      throw new Error("Email sudah dipakai oleh akun lain.");
    }

    const timestamp = nowIso();
    let savedProfile = null;

    if (payload.id) {
      const account = await findAccountByProfileId(payload.id, client);

      if (!existingProfile || !account) {
        throw new Error("Akun pengguna tidak ditemukan.");
      }

      await client.query(
        `
          update profiles
          set
            full_name = $2,
            email = $3,
            role = $4,
            department = $5,
            position = $6,
            specialization = $7,
            phone = $8,
            is_active = $9,
            updated_at = $10
          where id = $1
        `,
        [
          payload.id,
          normalized.full_name,
          normalized.email,
          normalized.role,
          normalized.department || null,
          normalized.position || null,
          normalized.specialization || null,
          normalized.phone || null,
          normalized.is_active,
          timestamp,
        ],
      );

      await client.query(
        `
          update auth_accounts
          set email = $2,
              password_hash = case when $3 is null then password_hash else $3 end,
              updated_at = now()
          where profile_id = $1
        `,
        [
          payload.id,
          normalized.email,
          payload.password?.trim() ? await bcrypt.hash(payload.password.trim(), 10) : null,
        ],
      );

      savedProfile = await findProfileById(payload.id, client);
    } else {
      const profileId = await generateProfileId(client);
      savedProfile = {
        id: profileId,
        ...normalized,
        created_at: timestamp,
        updated_at: timestamp,
      };

      await client.query(
        `
          insert into profiles (
            id, full_name, email, role, department, position, specialization, phone, is_active,
            email_verification_status, email_verified_at, created_at, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `,
        [
          savedProfile.id,
          savedProfile.full_name,
          savedProfile.email,
          savedProfile.role,
          savedProfile.department || null,
          savedProfile.position || null,
          savedProfile.specialization || null,
          savedProfile.phone || null,
          savedProfile.is_active,
          "verified",
          timestamp,
          savedProfile.created_at,
          savedProfile.updated_at,
        ],
      );

      await client.query(
        `
          insert into auth_accounts (id, profile_id, email, password_hash, created_at, updated_at)
          values ($1, $2, $3, $4, now(), now())
        `,
        [generateId("account"), profileId, normalized.email, await bcrypt.hash(payload.password.trim(), 10)],
      );
    }

    await insertAuditLogRow({
      user_id: actorProfile.id,
      action: payload.id ? "update_profile" : "create_profile",
      module: "profiles",
      target_id: savedProfile.id,
      description: payload.id
        ? `Memperbarui akun ${savedProfile.full_name} (${savedProfile.role}).`
        : `Menambahkan akun ${savedProfile.full_name} (${savedProfile.role}).`,
      created_at: timestamp,
    }, client);

    return savedProfile;
  });
}

export async function deleteManagedProfile(actorProfile, profileId) {
  return withTransaction(async (client) => {
    if (!profileId) {
      throw new Error("Akun pengguna tidak valid.");
    }

    if (profileId === actorProfile?.id) {
      throw new Error("Akun Anda sendiri tidak dapat dihapus.");
    }

    const existingProfile = await findProfileById(profileId, client);

    assertManagedRoleAllowed(actorProfile, existingProfile?.role, existingProfile?.role);

    if (!existingProfile) {
      throw new Error("Akun pengguna tidak ditemukan.");
    }

    const ticketRelationRow = await queryOne(
      client,
      `
        select count(*)::int as count
        from tickets
        where created_by = $1 or assigned_to = $1
      `,
      [profileId],
    );
    const isLinkedToTicket = Number(ticketRelationRow?.count || 0) > 0;

    if (isLinkedToTicket) {
      throw new Error("Akun tidak dapat dihapus karena masih memiliki relasi tiket. Nonaktifkan akun sebagai gantinya.");
    }

    await client.query("delete from notifications where user_id = $1", [profileId]);
    await client.query("delete from auth_action_tokens where profile_id = $1", [profileId]);
    await client.query("update audit_logs set user_id = null where user_id = $1", [profileId]);
    await client.query("delete from profiles where id = $1", [profileId]);
    await client.query("delete from auth_accounts where profile_id = $1", [profileId]);

    await insertAuditLogRow({
      user_id: actorProfile.id,
      action: "delete_profile",
      module: "profiles",
      target_id: profileId,
      description: `Menghapus akun ${existingProfile.full_name} (${existingProfile.role}).`,
      created_at: nowIso(),
    }, client);

    return profileId;
  });
}

export async function requestPasswordReset(email, metadata = {}) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("Email wajib diisi.");
  }

  assertMailDeliveryConfigured();

  await withTransaction(async (client) => {
    const account = await findAccountByEmail(normalizedEmail, client);

    if (!account) {
      return;
    }

    const profile = await findProfileById(account.profile_id, client);

    if (!profile || profile.is_active === false || profile.email_verification_status === "pending") {
      return;
    }

    const resetToken = await issueAuthActionToken(
      {
        profileId: profile.id,
        email: normalizedEmail,
        type: AUTH_ACTION_TYPES.PASSWORD_RESET,
        expiresAt: addMinutesToNow(config.passwordResetTtlMinutes),
      },
      client,
    );

    await sendPasswordResetEmail({
      recipientName: profile.full_name,
      recipientEmail: profile.email,
      resetUrl: buildFrontendUrl(`/reset-password?token=${encodeURIComponent(resetToken)}`),
    });

    await insertAuditLogRow(
      {
        user_id: profile.id,
        action: "request_password_reset",
        module: "auth",
        target_id: profile.id,
        description: `Permintaan reset password untuk ${profile.email}.`,
        ip_address: metadata.ipAddress || "127.0.0.1",
        created_at: nowIso(),
      },
      client,
    );
  });

  return {
    ok: true,
    message: "Jika email terdaftar, instruksi reset password telah dikirim.",
  };
}

export async function activateAccount(token, metadata = {}) {
  const normalizedToken = String(token || "").trim();

  if (!normalizedToken) {
    throw new Error("Token aktivasi wajib diisi.");
  }

  return withTransaction(async (client) => {
    const actionToken = await consumeAuthActionToken(AUTH_ACTION_TYPES.ACCOUNT_ACTIVATION, normalizedToken, client);
    const profile = await findProfileById(actionToken.profile_id, client);

    if (!profile) {
      throw new Error("Profil akun tidak ditemukan.");
    }

    await client.query(
      `
        update profiles
        set email_verification_status = 'verified',
            email_verified_at = coalesce(email_verified_at, $2),
            updated_at = $2
        where id = $1
      `,
      [profile.id, nowIso()],
    );

    await insertAuditLogRow(
      {
        user_id: profile.id,
        action: "activate_account",
        module: "auth",
        target_id: profile.id,
        description: `Aktivasi akun berhasil untuk ${profile.email}.`,
        ip_address: metadata.ipAddress || "127.0.0.1",
        created_at: nowIso(),
      },
      client,
    );

    return {
      ok: true,
      message: "Akun berhasil diaktivasi. Silakan login.",
    };
  });
}

export async function resetPasswordWithToken(token, password, metadata = {}) {
  const normalizedToken = String(token || "").trim();

  if (!normalizedToken) {
    throw new Error("Token reset password wajib diisi.");
  }

  assertPasswordStrength(password, "Password baru minimal 8 karakter.");

  return withTransaction(async (client) => {
    const actionToken = await consumeAuthActionToken(AUTH_ACTION_TYPES.PASSWORD_RESET, normalizedToken, client);
    const account = await findAccountByProfileId(actionToken.profile_id, client);
    const profile = await findProfileById(actionToken.profile_id, client);

    if (!account || !profile) {
      throw new Error("Akun pengguna tidak ditemukan.");
    }

    await client.query(
      `
        update auth_accounts
        set password_hash = $2,
            updated_at = now()
        where profile_id = $1
      `,
      [profile.id, await bcrypt.hash(password.trim(), 10)],
    );

    await insertAuditLogRow(
      {
        user_id: profile.id,
        action: "reset_password",
        module: "auth",
        target_id: profile.id,
        description: `Reset password berhasil untuk ${profile.email}.`,
        ip_address: metadata.ipAddress || "127.0.0.1",
        created_at: nowIso(),
      },
      client,
    );

    return {
      ok: true,
      message: "Password berhasil diperbarui. Silakan login dengan password baru Anda.",
    };
  });
}
