import { Navigate, Outlet } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME } from "@/utils/constants";

export default function PublicOnlyRoute() {
  const { loading, isAuthenticated, profile } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner label="Menyiapkan halaman..." />
      </div>
    );
  }

  if (isAuthenticated && profile) {
    return <Navigate to={ROLE_HOME[profile.role] || "/"} replace />;
  }

  return <Outlet />;
}
