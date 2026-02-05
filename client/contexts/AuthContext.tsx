import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { apiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  // UPDATE 1: Added profileImage as an optional 6th parameter
  register: (firstName: string, lastName: string, email: string, phone: string, password: string, profileImage?: File) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const response = await apiService.getCurrentUser();
          if (response.data?.user) {
            setUser(response.data.user);
          } else {
            localStorage.removeItem('authToken');
          }
        } catch (error) {
          localStorage.removeItem('authToken');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      if (response.data?.token) {
        localStorage.setItem('authToken', response.data.token);
      }
      if (response.data?.user) {
        setUser(response.data.user);
        return { success: true };
      }
      return { success: false, error: response.error || 'Login failed' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  // UPDATE 2: Accepting the profileImage parameter
  const register = async (firstName: string, lastName: string, email: string, phone: string, password: string, profileImage?: File) => {
    try {
      // UPDATE 3: Passing it to the API service
      const response = await apiService.register(firstName, lastName, email, phone, password, profileImage);

      if (response.data?.token) {
        localStorage.setItem('authToken', response.data.token);
      }
      if (response.data?.user) {
        setUser(response.data.user);
        return { success: true };
      }
      return { success: false, error: response.error || 'Registration failed' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('authToken');
    }
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