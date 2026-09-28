import { User, Role } from '../types';
import { INITIAL_USERS } from './mockData';

const AUTH_USER_KEY = 'familyhub_auth_user_id';

class AuthService {
  private users: User[] = [...INITIAL_USERS];
  private currentUserId: string = 'user-tariq'; // Default demo user

  constructor() {
    const saved = localStorage.getItem(AUTH_USER_KEY);
    if (saved && this.users.some(u => u.id === saved)) {
      this.currentUserId = saved;
    }
  }

  getCurrentUser(): User | null {
    return this.users.find(u => u.id === this.currentUserId) || null;
  }

  getAllDemoUsers(): User[] {
    return [...this.users];
  }

  switchUser(userId: string): User | null {
    const found = this.users.find(u => u.id === userId);
    if (found) {
      this.currentUserId = userId;
      localStorage.setItem(AUTH_USER_KEY, userId);
      return found;
    }
    return null;
  }

  async login(emailOrPhone: string, _passwordPlaintext: string): Promise<User> {
    // In production, this calls the secure backend / Firebase Auth
    // Password is treated securely and never stored plain in frontend state
    const normalized = emailOrPhone.trim().toLowerCase();
    const user = this.users.find(
      u => u.email.toLowerCase() === normalized || (u.phone && u.phone.includes(normalized))
    );
    if (user) {
      this.currentUserId = user.id;
      localStorage.setItem(AUTH_USER_KEY, user.id);
      return user;
    }

    // If new credentials in demo, create a new authenticated session
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: emailOrPhone.split('@')[0] || 'Family Member',
      email: normalized.includes('@') ? normalized : `${normalized}@familyhub.local`,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80',
      roleInFamily: 'member',
      status: 'online',
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    this.currentUserId = newUser.id;
    localStorage.setItem(AUTH_USER_KEY, newUser.id);
    return newUser;
  }

  async register(params: {
    fullName: string;
    emailOrPhone: string;
    passwordPlaintext: string;
    role?: Role;
    avatar?: string;
  }): Promise<User> {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: params.fullName.trim(),
      email: params.emailOrPhone.includes('@') ? params.emailOrPhone : `${params.emailOrPhone}@familyhub.local`,
      phone: !params.emailOrPhone.includes('@') ? params.emailOrPhone : undefined,
      avatar: params.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80',
      roleInFamily: params.role || 'member',
      status: 'online',
      createdAt: new Date().toISOString(),
    };

    this.users.push(newUser);
    this.currentUserId = newUser.id;
    localStorage.setItem(AUTH_USER_KEY, newUser.id);
    return newUser;
  }

  logout(): void {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

export const authService = new AuthService();
