import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { ATTACHMENT_MAX_MB } from "./shared/attachmentRules.js";
import { WORKSPACE_LOGO_MAX_MB } from "./shared/workspaceLogoRules.js";
import {
  activateAccount,
  deleteManagedProfile,
  getSystemAccessConfig,
  getPublicSystemAccess,
  getSessionData,
  initializeDatabase,
  requestPasswordReset,
  registerUser,
  resetPasswordWithToken,
  saveManagedProfile,
  saveRolePermissions,
  saveSystemSettings,
  signInWithPassword,
  uploadWorkspaceLogoBinary,
  updateOwnPassword,
  updateOwnProfile,
} from "./stateService.js";
import {
  addComment,
  addTicketAttachments,
  createAttachmentUploadUrls,
  createTicket,
  deleteAnnouncement,
  deleteCategory,
  deleteTicket,
  getDashboardSummary,
  getTicketDetail,
  getReportSummary,
  listActiveAnnouncements,
  listAdminAnnouncements,
  listAuditLogs,
  listCategories,
  listNotifications,
  listProfiles,
  listSlaSettings,
  listTechnicianMetrics,
  listTickets,
  markAllNotificationsRead,
  markNotificationRead,
  saveAnnouncement,
  saveCategory,
  saveSlaSetting,
  uploadAttachmentBinary,
  updateTicket,
} from "./resourceService.js";

const app = express();
let initializationPromise = null;

process.env.NODE_ENV = config.appEnv;
app.set("env", config.appEnv);

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.frontendOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin tidak diizinkan oleh konfigurasi CORS."));
    },
    credentials: false,
  }),
);
app.use(async (_request, _response, next) => {
  try {
    initializationPromise ||= initializeDatabase();
    await initializationPromise;
    next();
  } catch (error) {
    next(error);
  }
});
app.use(express.json({ limit: "5mb" }));

function getBearerToken(request) {
  const header = request.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" ? token : null;
}

function getRequestMetadata(request) {
  return {
    userAgent: request.headers["user-agent"] || null,
    ipAddress: request.ip || request.socket?.remoteAddress || null,
  };
}

function sendError(response, error, statusCode = 400) {
  response.status(statusCode).json({
    message: error instanceof Error ? error.message : "Terjadi kesalahan pada server.",
  });
}

async function requireAuth(request, response, next) {
  try {
    const token = getBearerToken(request);
    const session = await getSessionData(token);

    if (!session) {
      response.status(401).json({ message: "Session tidak valid atau sudah berakhir." });
      return;
    }

    if (session.profile?.is_active === false) {
      response.status(403).json({
        message: "Akun Anda sedang nonaktif. Hubungi admin IT untuk mengaktifkan kembali akses.",
      });
      return;
    }

    request.session = session;
    next();
  } catch (error) {
    sendError(response, error, 401);
  }
}

function requireAdmin(request, response, next) {
  if (!["admin", "super_admin"].includes(request.session?.profile?.role || "")) {
    response.status(403).json({ message: "Anda tidak memiliki akses untuk aksi ini." });
    return;
  }

  next();
}

function requireSuperAdmin(request, response, next) {
  if (request.session?.profile?.role !== "super_admin") {
    response.status(403).json({ message: "Hanya super admin yang dapat mengakses fitur ini." });
    return;
  }

  next();
}

app.get("/api/health", async (_request, response) => {
  response.json({
    ok: true,
    backend: "express-postgres",
    env: config.appEnv,
    appName: config.appName,
    storage: config.r2BucketName ? "cloudflare-r2" : "none",
  });
});

app.get("/api/public/system-access", async (_request, response) => {
  try {
    response.json(await getPublicSystemAccess());
  } catch (error) {
    sendError(response, error, 500);
  }
});

app.post("/api/auth/login", async (request, response) => {
  try {
    const session = await signInWithPassword(request.body.email, request.body.password, getRequestMetadata(request));
    response.json(session);
  } catch (error) {
    sendError(response, error, 401);
  }
});

app.post("/api/auth/register", async (request, response) => {
  try {
    const session = await registerUser(request.body, getRequestMetadata(request));
    response.status(201).json(session);
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/auth/activate", async (request, response) => {
  try {
    response.json(await activateAccount(request.body?.token, getRequestMetadata(request)));
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/auth/logout", async (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/auth/session", requireAuth, async (request, response) => {
  response.json({
    user: request.session.user,
    profile: request.session.profile,
  });
});

app.put("/api/auth/profile", requireAuth, async (request, response) => {
  try {
    const profile = await updateOwnProfile(request.session.profile.id, request.body || {});
    response.json({ profile });
  } catch (error) {
    sendError(response, error);
  }
});

app.put("/api/auth/password", requireAuth, async (request, response) => {
  try {
    if (!request.body?.password?.trim()) {
      response.status(400).json({ message: "Password baru wajib diisi." });
      return;
    }

    await updateOwnPassword(request.session.profile.id, request.body.password.trim());
    response.json({ ok: true });
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/auth/password-reset", async (request, response) => {
  try {
    response.json(await requestPasswordReset(request.body?.email, getRequestMetadata(request)));
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/auth/password-reset/confirm", async (request, response) => {
  try {
    response.json(await resetPasswordWithToken(request.body?.token, request.body?.password, getRequestMetadata(request)));
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/system-access", requireAuth, async (_request, response) => {
  try {
    response.json(await getSystemAccessConfig());
  } catch (error) {
    sendError(response, error, 500);
  }
});

app.put("/api/system-access/settings", requireAuth, requireSuperAdmin, async (request, response) => {
  try {
    response.json({
      systemSettings: await saveSystemSettings(request.session.profile, request.body || {}),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.post(
  "/api/system-access/logo-upload",
  requireAuth,
  requireSuperAdmin,
  express.raw({ type: "*/*", limit: `${WORKSPACE_LOGO_MAX_MB}mb` }),
  async (request, response) => {
    try {
      response.status(201).json({
        logo: await uploadWorkspaceLogoBinary(request.session.profile, {
          fileName: request.query.fileName || request.headers["x-upload-file-name"] || "workspace-logo",
          fileType: request.headers["content-type"] || "application/octet-stream",
          buffer: request.body,
        }),
      });
    } catch (error) {
      sendError(response, error);
    }
  },
);

app.put("/api/system-access/permissions", requireAuth, requireSuperAdmin, async (request, response) => {
  try {
    response.json({
      rolePermissions: await saveRolePermissions(request.session.profile, request.body || {}),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/profiles/technicians/metrics", requireAuth, requireAdmin, async (_request, response) => {
  try {
    response.json({
      technicians: await listTechnicianMetrics(),
    });
  } catch (error) {
    sendError(response, error, 500);
  }
});

app.get("/api/profiles", requireAuth, requireAdmin, async (request, response) => {
  try {
    response.json({
      profiles: await listProfiles(request.query.role || ""),
    });
  } catch (error) {
    sendError(response, error, 500);
  }
});

app.post("/api/admin/profiles", requireAuth, requireAdmin, async (request, response) => {
  try {
    const profile = await saveManagedProfile(request.session.profile, request.body || {});
    response.status(201).json({
      profile,
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.put("/api/admin/profiles/:profileId", requireAuth, requireAdmin, async (request, response) => {
  try {
    const profile = await saveManagedProfile(request.session.profile, {
      ...request.body,
      id: request.params.profileId,
    });
    response.json({
      profile,
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.delete("/api/admin/profiles/:profileId", requireAuth, requireAdmin, async (request, response) => {
  try {
    const deletedId = await deleteManagedProfile(request.session.profile, request.params.profileId);
    response.json({
      deletedId,
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/categories", requireAuth, async (_request, response) => {
  try {
    response.json({
      categories: await listCategories(),
    });
  } catch (error) {
    sendError(response, error, 500);
  }
});

app.post("/api/categories", requireAuth, requireAdmin, async (request, response) => {
  try {
    const category = await saveCategory(request.session.profile, request.body || {});
    response.status(201).json({ category });
  } catch (error) {
    sendError(response, error);
  }
});

app.put("/api/categories/:categoryId", requireAuth, requireAdmin, async (request, response) => {
  try {
    const category = await saveCategory(request.session.profile, {
      ...request.body,
      id: request.params.categoryId,
    });
    response.json({ category });
  } catch (error) {
    sendError(response, error);
  }
});

app.delete("/api/categories/:categoryId", requireAuth, requireAdmin, async (request, response) => {
  try {
    const deletedId = await deleteCategory(request.session.profile, request.params.categoryId);
    response.json({ deletedId });
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/admin/sla-settings", requireAuth, requireAdmin, async (_request, response) => {
  try {
    response.json({
      slaSettings: await listSlaSettings(),
    });
  } catch (error) {
    sendError(response, error, 500);
  }
});

app.post("/api/admin/sla-settings", requireAuth, requireAdmin, async (request, response) => {
  try {
    response.status(201).json({
      slaSetting: await saveSlaSetting(request.session.profile, request.body || {}),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.put("/api/admin/sla-settings/:slaId", requireAuth, requireAdmin, async (request, response) => {
  try {
    response.json({
      slaSetting: await saveSlaSetting(request.session.profile, {
        ...request.body,
        id: request.params.slaId,
      }),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/notifications", requireAuth, async (request, response) => {
  try {
    response.json({
      notifications: await listNotifications(request.session.profile.id, {
        limit: request.query.limit,
      }),
    });
  } catch (error) {
    sendError(response, error, 500);
  }
});

app.post("/api/notifications/read-all", requireAuth, async (request, response) => {
  try {
    response.json({
      notifications: await markAllNotificationsRead(request.session.profile.id, {
        limit: request.body?.limit || request.query.limit,
      }),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/notifications/:notificationId/read", requireAuth, async (request, response) => {
  try {
    response.json({
      notifications: await markNotificationRead(request.session.profile.id, request.params.notificationId, {
        limit: request.body?.limit || request.query.limit,
      }),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/announcements/active", requireAuth, async (_request, response) => {
  try {
    response.json({
      announcements: await listActiveAnnouncements(),
    });
  } catch (error) {
    sendError(response, error, 500);
  }
});

app.get("/api/admin/announcements", requireAuth, requireAdmin, async (_request, response) => {
  try {
    response.json({
      announcements: await listAdminAnnouncements(),
    });
  } catch (error) {
    sendError(response, error, 500);
  }
});

app.post("/api/admin/announcements", requireAuth, requireAdmin, async (request, response) => {
  try {
    response.status(201).json({
      announcement: await saveAnnouncement(request.session.profile, request.body || {}),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.put("/api/admin/announcements/:announcementId", requireAuth, requireAdmin, async (request, response) => {
  try {
    response.json({
      announcement: await saveAnnouncement(request.session.profile, {
        ...request.body,
        id: request.params.announcementId,
      }),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.delete("/api/admin/announcements/:announcementId", requireAuth, requireAdmin, async (request, response) => {
  try {
    response.json({
      deletedId: await deleteAnnouncement(request.session.profile, request.params.announcementId),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/admin/audit-logs", requireAuth, requireAdmin, async (_request, response) => {
  try {
    response.json({
      auditLogs: await listAuditLogs(),
    });
  } catch (error) {
    sendError(response, error, 500);
  }
});

app.get("/api/admin/reports/summary", requireAuth, requireAdmin, async (request, response) => {
  try {
    response.json({
      summary: await getReportSummary(request.query || {}),
    });
  } catch (error) {
    sendError(response, error, 500);
  }
});

app.get("/api/dashboard/summary", requireAuth, async (request, response) => {
  try {
    response.json({
      summary: await getDashboardSummary(request.session.profile),
    });
  } catch (error) {
    sendError(response, error, 500);
  }
});

app.post("/api/uploads/presign", requireAuth, async (request, response) => {
  try {
    response.status(201).json({
      uploads: await createAttachmentUploadUrls(request.body || {}, request.session.profile),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.post(
  "/api/uploads/direct",
  requireAuth,
  express.raw({ type: "*/*", limit: `${ATTACHMENT_MAX_MB}mb` }),
  async (request, response) => {
    try {
      response.status(201).json({
        attachment: await uploadAttachmentBinary(
          {
            scope: request.query.scope || "new-ticket",
            ticketId: request.query.ticketId || null,
            fileName: request.query.fileName || request.headers["x-upload-file-name"] || "attachment",
            fileType: request.headers["content-type"] || "application/octet-stream",
            buffer: request.body,
          },
          request.session.profile,
        ),
      });
    } catch (error) {
      sendError(response, error);
    }
  },
);

app.get("/api/tickets", requireAuth, async (request, response) => {
  try {
    response.json({
      tickets: await listTickets(request.session.profile, request.query || {}),
    });
  } catch (error) {
    sendError(response, error, 500);
  }
});

app.get("/api/tickets/:ticketId", requireAuth, async (request, response) => {
  try {
    response.json({
      ticket: await getTicketDetail(request.params.ticketId, request.session.profile),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/tickets", requireAuth, async (request, response) => {
  try {
    response.status(201).json({
      ticket: await createTicket(request.body || {}, request.session.profile),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.put("/api/tickets/:ticketId", requireAuth, async (request, response) => {
  try {
    response.json({
      ticket: await updateTicket(request.params.ticketId, request.body || {}, request.session.profile),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/tickets/:ticketId/attachments", requireAuth, async (request, response) => {
  try {
    response.json({
      ticket: await addTicketAttachments(
        request.params.ticketId,
        request.body?.attachments || [],
        request.session.profile,
      ),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/tickets/:ticketId/comments", requireAuth, async (request, response) => {
  try {
    response.status(201).json({
      ticket: await addComment(request.params.ticketId, request.body || {}, request.session.profile),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.delete("/api/tickets/:ticketId", requireAuth, async (request, response) => {
  try {
    response.json({
      ok: true,
      deletedId: await deleteTicket(request.params.ticketId, request.session.profile),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.use((error, _request, response, _next) => {
  console.error("Backend request gagal:", error);
  sendError(response, error, 500);
});

async function startServer() {
  const server = app.listen(config.port, () => {
    console.log(`Backend Express berjalan di http://localhost:${config.port}`);
  });

  server.on("error", (error) => {
    console.error("Gagal menjalankan backend:", error);
    process.exitCode = 1;
  });
}

if (!process.env.VERCEL) {
  startServer().catch((error) => {
    console.error("Inisialisasi backend gagal:", error);
    process.exitCode = 1;
  });
}

export default app;
