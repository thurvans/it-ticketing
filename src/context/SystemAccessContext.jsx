import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultRolePermissions, getDefaultSystemSettings } from "@/utils/systemAccess";
import { getRolePermissionsForRole, getSystemAccessConfig } from "@/services/systemAccessService";

const SystemAccessContext = createContext(null);

export function SystemAccessProvider({ children }) {
  const { user, profile } = useAuth();
  const [systemSettings, setSystemSettings] = useState(getDefaultSystemSettings());
  const [rolePermissions, setRolePermissions] = useState(getDefaultRolePermissions());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSystemAccess = useCallback(async (includePermissions = Boolean(user?.id)) => {
    try {
      const nextConfig = await getSystemAccessConfig({ includePermissions });
      setSystemSettings(nextConfig.systemSettings);
      setRolePermissions(nextConfig.rolePermissions);
      setError(null);
      return nextConfig;
    } catch (loadError) {
      console.error(loadError);
      setSystemSettings(getDefaultSystemSettings());
      setRolePermissions(getDefaultRolePermissions());
      setError(loadError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      await loadSystemAccess(Boolean(user?.id));
    }

    bootstrap();
  }, [loadSystemAccess, user?.id]);

  const permissions = useMemo(
    () => getRolePermissionsForRole(profile?.role, rolePermissions),
    [profile?.role, rolePermissions],
  );

  function hasPermission(permissionKey) {
    if (!permissionKey) {
      return true;
    }

    return Boolean(permissions?.[permissionKey]);
  }

  const value = useMemo(
    () => ({
      loading,
      error,
      systemSettings,
      rolePermissions,
      permissions,
      hasPermission,
      reloadSystemAccess: loadSystemAccess,
    }),
    [error, loading, permissions, rolePermissions, systemSettings, loadSystemAccess],
  );

  return <SystemAccessContext.Provider value={value}>{children}</SystemAccessContext.Provider>;
}

export function useSystemAccessContext() {
  const context = useContext(SystemAccessContext);

  if (!context) {
    throw new Error("useSystemAccessContext harus digunakan di dalam SystemAccessProvider.");
  }

  return context;
}
