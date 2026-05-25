import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  activateAccount,
  refreshProfile,
  register,
  requestPasswordReset,
  resetPasswordWithToken,
  restoreSession,
  signIn,
  signOut,
  updateProfile,
  updatePassword,
} from "@/services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const authStateRef = useRef({ user: null, profile: null });

  function commitAuthState(nextUser, nextProfile) {
    const normalizedUser = nextProfile ? nextUser : null;
    const normalizedProfile = nextProfile ?? null;

    authStateRef.current = {
      user: normalizedUser,
      profile: normalizedProfile,
    };

    setUser(normalizedUser);
    setProfile(normalizedProfile);
  }

  useEffect(() => {
    let ignore = false;

    function applyAuthState(nextUser, nextProfile) {
      if (ignore) {
        return;
      }

      commitAuthState(nextUser, nextProfile);
    }

    async function bootstrap() {
      try {
        const session = await restoreSession();
        applyAuthState(session.user, session.profile);
      } catch (error) {
        console.error(error);
        applyAuthState(null, null);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleSignIn(payload) {
    const session = await signIn(payload);
    commitAuthState(session.user, session.profile);
    return session;
  }

  async function handleRegister(payload) {
    const session = await register(payload);

    if (session.token && session.user && session.profile) {
      commitAuthState(session.user, session.profile);
    }

    return session;
  }

  async function handleSignOut() {
    await signOut();
    commitAuthState(null, null);
  }

  async function reloadProfile() {
    if (!user?.id) {
      return null;
    }

    const nextProfile = await refreshProfile(user.id);
    commitAuthState(user, nextProfile);
    return nextProfile;
  }

  async function handleUpdateProfile(payload) {
    if (!user?.id) {
      throw new Error("Session user tidak tersedia.");
    }

    const nextProfile = await updateProfile(user.id, payload);
    commitAuthState(user, nextProfile);
    return nextProfile;
  }

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: Boolean(user && profile),
    signIn: handleSignIn,
    register: handleRegister,
    signOut: handleSignOut,
    activateAccount,
    requestPasswordReset,
    resetPasswordWithToken,
    updateProfile: handleUpdateProfile,
    updatePassword,
    reloadProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext harus digunakan di dalam AuthProvider.");
  }

  return context;
}
