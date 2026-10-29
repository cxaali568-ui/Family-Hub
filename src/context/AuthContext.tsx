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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Real-time Firebase Authentication listener
    const unsubscribe = authService.onAuthStateChanged((authUser, authLoading) => {
      setUser(authUser);
      setLoading(authLoading);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const u = await authService.login(email, password);
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
    setUser(updated);
    return updated;
  };

  const uploadAvatar = async (file: File, onProgress?: (p: number) => void): Promise<string> => {
    if (!user) throw new Error('Not logged in');
    const url = await authService.uploadUserAvatar(user.id, file, onProgress);
    setUser((prev) => (prev ? { ...prev, avatar: url, profileImage: url } : null));
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
