import { Navigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { useSystemAccess } from "@/hooks/useSystemAccess";

const PERMISSION_FALLBACK_PATHS = {
  user: "/user/tickets",
  technician: "/technician/tickets",
  admin: "/admin/tickets",
  super_admin: "/admin/tickets",
};

export default function PermissionGuard({ permissionKey, children }) {
  const { profile } = useAuth();
  const { loading, hasPermission } = useSystemAccess();

  if (!profile) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner label="Memeriksa hak akses..." />
      </div>
    );
  }

  if (!hasPermission(permissionKey)) {
    return <Navigate to={PERMISSION_FALLBACK_PATHS[profile.role] || "/login"} replace />;
  }

  return children;
}
