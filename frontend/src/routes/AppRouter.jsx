import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import PermissionGuard from "@/components/common/PermissionGuard";
import RoleGuard from "@/components/common/RoleGuard";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import PublicOnlyRoute from "@/components/common/PublicOnlyRoute";
import AppLayout from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME } from "@/utils/constants";

const AccessControlPage = lazy(() => import("@/pages/admin/AccessControlPage"));
const ActivateAccountPage = lazy(() => import("@/pages/auth/ActivateAccountPage"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminTicketDetailPage = lazy(() => import("@/pages/admin/AdminTicketDetailPage"));
const AdminTicketsPage = lazy(() => import("@/pages/admin/AdminTicketsPage"));
const AuditLogsPage = lazy(() => import("@/pages/admin/AuditLogsPage"));
const AdminAnnouncementsPage = lazy(() => import("@/pages/admin/AdminAnnouncementsPage"));
const AdminProfilePage = lazy(() => import("@/pages/admin/AdminProfilePage"));
const CategoriesPage = lazy(() => import("@/pages/admin/CategoriesPage"));
const ReportsPage = lazy(() => import("@/pages/admin/ReportsPage"));
const SettingsPage = lazy(() => import("@/pages/admin/SettingsPage"));
const SlaPage = lazy(() => import("@/pages/admin/SlaPage"));
const TechniciansPage = lazy(() => import("@/pages/admin/TechniciansPage"));
const UsersPage = lazy(() => import("@/pages/admin/UsersPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));
const NotFoundPage = lazy(() => import("@/pages/common/NotFoundPage"));
const AssignedTicketsPage = lazy(() => import("@/pages/technician/AssignedTicketsPage"));
const ActiveTicketsPage = lazy(() => import("@/pages/technician/ActiveTicketsPage"));
const TechnicianAnnouncementsPage = lazy(() => import("@/pages/technician/TechnicianAnnouncementsPage"));
const TechnicianDashboardPage = lazy(() => import("@/pages/technician/TechnicianDashboardPage"));
const TechnicianHistoryPage = lazy(() => import("@/pages/technician/TechnicianHistoryPage"));
const TechnicianProfilePage = lazy(() => import("@/pages/technician/TechnicianProfilePage"));
const TechnicianTicketDetailPage = lazy(() => import("@/pages/technician/TechnicianTicketDetailPage"));
const UserAnnouncementsPage = lazy(() => import("@/pages/user/UserAnnouncementsPage"));
const UserCreateTicketPage = lazy(() => import("@/pages/user/UserCreateTicketPage"));
const UserDashboardPage = lazy(() => import("@/pages/user/UserDashboardPage"));
const UserProfilePage = lazy(() => import("@/pages/user/UserProfilePage"));
const UserTicketDetailPage = lazy(() => import("@/pages/user/UserTicketDetailPage"));
const UserTicketsPage = lazy(() => import("@/pages/user/UserTicketsPage"));

function RouteLoadingScreen() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingSpinner label="Memuat halaman..." />
    </div>
  );
}

function renderLazyPage(element) {
  return <Suspense fallback={<RouteLoadingScreen />}>{element}</Suspense>;
}

function renderPermissionPage(permissionKey, element) {
  return renderLazyPage(<PermissionGuard permissionKey={permissionKey}>{element}</PermissionGuard>);
}

function HomeRedirect() {
  const { isAuthenticated, profile } = useAuth();

  if (!isAuthenticated || !profile) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={ROLE_HOME[profile.role] || "/login"} replace />;
}

function UserRoutes() {
  return (
    <RoleGuard allowedRoles={["user"]}>
      <Outlet />
    </RoleGuard>
  );
}

function TechnicianRoutes() {
  return (
    <RoleGuard allowedRoles={["technician"]}>
      <Outlet />
    </RoleGuard>
  );
}

function AdminRoutes() {
  return (
    <RoleGuard allowedRoles={["admin", "super_admin"]}>
      <Outlet />
    </RoleGuard>
  );
}

function SuperAdminRoutes() {
  return (
    <RoleGuard allowedRoles={["super_admin"]}>
      <Outlet />
    </RoleGuard>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={renderLazyPage(<LoginPage />)} />
        <Route path="/register" element={renderLazyPage(<RegisterPage />)} />
        <Route path="/activate-account" element={renderLazyPage(<ActivateAccountPage />)} />
        <Route path="/forgot-password" element={renderLazyPage(<ForgotPasswordPage />)} />
        <Route path="/reset-password" element={renderLazyPage(<ResetPasswordPage />)} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomeRedirect />} />

        <Route element={<AppLayout />}>
          <Route path="user" element={<UserRoutes />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route
              path="dashboard"
              element={renderPermissionPage("dashboard_access", <UserDashboardPage />)}
            />
            <Route path="tickets" element={renderLazyPage(<UserTicketsPage />)} />
            <Route
              path="tickets/create"
              element={renderPermissionPage("ticket_create", <UserCreateTicketPage />)}
            />
            <Route path="tickets/:id" element={renderLazyPage(<UserTicketDetailPage />)} />
            <Route path="announcements" element={renderLazyPage(<UserAnnouncementsPage />)} />
            <Route path="profile" element={renderLazyPage(<UserProfilePage />)} />
          </Route>

          <Route path="technician" element={<TechnicianRoutes />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route
              path="dashboard"
              element={renderPermissionPage("dashboard_access", <TechnicianDashboardPage />)}
            />
            <Route path="tickets" element={renderLazyPage(<AssignedTicketsPage />)} />
            <Route path="in-progress" element={renderLazyPage(<ActiveTicketsPage />)} />
            <Route path="history" element={renderLazyPage(<TechnicianHistoryPage />)} />
            <Route path="tickets/:id" element={renderLazyPage(<TechnicianTicketDetailPage />)} />
            <Route path="announcements" element={renderLazyPage(<TechnicianAnnouncementsPage />)} />
            <Route path="profile" element={renderLazyPage(<TechnicianProfilePage />)} />
          </Route>

          <Route path="admin" element={<AdminRoutes />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route
              path="dashboard"
              element={renderPermissionPage("dashboard_access", <AdminDashboardPage />)}
            />
            <Route path="tickets" element={renderLazyPage(<AdminTicketsPage />)} />
            <Route path="tickets/:id" element={renderLazyPage(<AdminTicketDetailPage />)} />
            <Route path="users" element={renderPermissionPage("user_management", <UsersPage />)} />
            <Route path="technicians" element={renderPermissionPage("technician_management", <TechniciansPage />)} />
            <Route path="categories" element={renderPermissionPage("category_management", <CategoriesPage />)} />
            <Route path="sla" element={renderPermissionPage("sla_management", <SlaPage />)} />
            <Route
              path="announcements"
              element={renderPermissionPage("announcement_management", <AdminAnnouncementsPage />)}
            />
            <Route path="reports" element={renderPermissionPage("report_access", <ReportsPage />)} />
            <Route path="audit-logs" element={renderPermissionPage("audit_log_access", <AuditLogsPage />)} />
            <Route path="profile" element={renderLazyPage(<AdminProfilePage />)} />
            <Route path="settings" element={renderLazyPage(<SettingsPage mode="overview" />)} />
          </Route>

          <Route path="super-admin" element={<SuperAdminRoutes />}>
            <Route index element={<Navigate to="settings" replace />} />
            <Route
              path="settings"
              element={renderPermissionPage("system_settings_manage", <SettingsPage mode="manage" />)}
            />
            <Route
              path="access-control"
              element={renderPermissionPage("permission_management", <AccessControlPage />)}
            />
          </Route>

          <Route path="*" element={renderLazyPage(<NotFoundPage />)} />
        </Route>
      </Route>

      <Route path="*" element={renderLazyPage(<NotFoundPage />)} />
    </Routes>
  );
}
