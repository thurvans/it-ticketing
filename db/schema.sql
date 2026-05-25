begin;

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
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create unique index if not exists profiles_email_unique_idx
  on profiles (lower(email));

create index if not exists profiles_role_idx
  on profiles (role);

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

commit;
