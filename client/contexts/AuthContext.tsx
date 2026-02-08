import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { apiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  // UPDATE 1: Added profileImage as an optional 6th parameter
  register: (firstName: string, lastName: string, email: string, phone: string, password: string, profileImage?: File) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizeRole = (role: unknown): UserRole => {
    const r = String(role ?? '').trim().toUpperCase();
    if (r === UserRole.ADMIN) return UserRole.ADMIN;
    if (r === UserRole.SELLER) return UserRole.SELLER;
    if (r === UserRole.DEALER) return UserRole.DEALER;
    if (r === UserRole.BUYER) return UserRole.BUYER;
    if (r === UserRole.BANK) return UserRole.BANK;
    if (r === UserRole.GUEST) return UserRole.GUEST;
    if (r === 'CLIENT') return UserRole.BUYER;
    return UserRole.BUYER;
  };

  const normalizeUser = (raw: any): User => {
    const nameFromParts = [raw?.firstName, raw?.lastName].filter(Boolean).join(' ').trim();
    const name = (raw?.name || nameFromParts || raw?.email || '').trim();

    return {
      id: String(raw?.id ?? raw?._id ?? ''),
      name,
      email: String(raw?.email ?? ''),
      phone: raw?.phone ? String(raw.phone) : undefined,
      role: normalizeRole(raw?.role),
      isKycVerified: Boolean(raw?.isKycVerified ?? raw?.kycVerified ?? false),
      avatar: raw?.avatar || raw?.profileImage || undefined,
      location: raw?.location,
      emailVerified: raw?.emailVerified,
      phoneVerified: raw?.phoneVerified,
    };
  };

  useEffect(() => {
    // Check if user is logged in on mount
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await apiService.getCurrentUser();
          if (response.data?.user) {
            setUser(normalizeUser(response.data.user));
          } else {
            // Token invalid? Clear everything
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
        } catch (error) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      if (response.data?.user) {
        const normalized = normalizeUser(response.data.user);
        setUser(normalized);
        return { success: true, user: normalized };
      }
      return { success: false, error: response.error || 'Login failed' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (firstName: string, lastName: string, email: string, phone: string, password: string, profileImage?: File) => {
    try {
      const response = await apiService.register(firstName, lastName, email, phone, password, profileImage);
      if (response.data?.user) {
        setUser(normalizeUser(response.data.user));
        return { success: true };
      }
      return { success: false, error: response.error || 'Registration failed' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    await apiService.logout();
    setUser(null);
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};