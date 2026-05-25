import { Navigate } from "react-router-dom";
import { ROLE_HOME } from "@/utils/constants";
import { useAuth } from "@/hooks/useAuth";

export default function RoleGuard({ allowedRoles, children }) {
  const { profile } = useAuth();

  if (!profile) {
    return null;
  }

  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to={ROLE_HOME[profile.role] || "/login"} replace />;
  }

  return children;
}

