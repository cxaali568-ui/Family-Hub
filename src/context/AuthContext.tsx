import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  demoUsers: User[];
  switchUser: (userId: string) => void;
  login: (emailOrPhone: string, password: string) => Promise<User>;
  register: (params: {
    fullName: string;
    emailOrPhone: string;
    password: string;
    role?: Role;
    avatar?: string;
  }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [demoUsers, setDemoUsers] = useState<User[]>(() => authService.getAllDemoUsers());

  const switchUser = (userId: string) => {
    const updated = authService.switchUser(userId);
    if (updated) {
      setUser(updated);
    }
  };

  const login = async (emailOrPhone: string, password: string): Promise<User> => {
    const u = await authService.login(emailOrPhone, password);
    setUser(u);
    setDemoUsers(authService.getAllDemoUsers());
    return u;
  };

  const register = async (params: {
    fullName: string;
    emailOrPhone: string;
    password: string;
    role?: Role;
    avatar?: string;
  }): Promise<User> => {
    const u = await authService.register({
      fullName: params.fullName,
      emailOrPhone: params.emailOrPhone,
      passwordPlaintext: params.password,
      role: params.role,
      avatar: params.avatar,
    });
    setUser(u);
    setDemoUsers(authService.getAllDemoUsers());
    return u;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  useEffect(() => {
    setUser(authService.getCurrentUser());
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        demoUsers,
        switchUser,
        login,
        register,
        logout,
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
