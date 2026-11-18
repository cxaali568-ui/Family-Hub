import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (params: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    profileImage?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<User>;
  uploadAvatar: (file: File, onProgress?: (p: number) => void) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CACHED_USER_KEY = 'familyhub_cached_user_v1';

const readCachedUser = (): User | null => {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.id ? (parsed as User) : null;
  } catch {
    return null;
  }
};

const writeCachedUser = (u: User | null) => {
  try {
    if (u) {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(CACHED_USER_KEY);
      // Clear cached family lists on sign out
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('familyhub_cached_families_') || k.startsWith('familyhub_cached_members_')) {
          localStorage.removeItem(k);
        }
      });
    }
  } catch {
    // Ignore storage quota / private mode errors
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => readCachedUser());
  const [loading, setLoading] = useState<boolean>(() => !readCachedUser());

  useEffect(() => {
    // Real-time Firebase Authentication listener verifies session in background
    const unsubscribe = authService.onAuthStateChanged((authUser, authLoading) => {
      if (authUser) {
        writeCachedUser(authUser);
        setUser(authUser);
      } else if (!authLoading) {
        // Real security/sign-out event: no active Firebase session
        writeCachedUser(null);
        setUser(null);
      }
      setLoading(authLoading);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const u = await authService.login(email, password);
      writeCachedUser(u);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const register = async (params: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    profileImage?: string;
  }): Promise<User> => {
    setLoading(true);
    try {
      const u = await authService.register(params);
      writeCachedUser(u);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await authService.logout();
      writeCachedUser(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    await authService.forgotPassword(email);
  };

  const updateProfile = async (updates: Partial<User>): Promise<User> => {
    if (!user) throw new Error('Not logged in');
    const updated = await authService.updateUserProfile(user.id, updates);
    writeCachedUser(updated);
    setUser(updated);
    return updated;
  };

  const uploadAvatar = async (file: File, onProgress?: (p: number) => void): Promise<string> => {
    if (!user) throw new Error('Not logged in');
    const url = await authService.uploadUserAvatar(user.id, file, onProgress);
    setUser((prev) => {
      const next = prev ? { ...prev, avatar: url, profileImage: url } : null;
      writeCachedUser(next);
      return next;
    });
    return url;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        forgotPassword,
        updateProfile,
        uploadAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
