import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { userService } from '../services/api';

interface User {
  id: number;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (token: string) => Promise<User | null>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (token: string): Promise<User | null> => {
    try {
      localStorage.setItem('authToken', token);
      const profile = await userService.getProfile();
      if (profile) {
        const newUser = { id: profile.id, username: profile.username };
        setUser(newUser);
        return newUser;
      }
      return null;
    } catch (error) {
      console.error('Login failed', error);
      localStorage.removeItem('authToken');
      setUser(null);
      return null;
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem('authToken');
    } catch (e) {
      console.error('Failed to remove auth token', e);
    }
    setUser(null);
  };

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const profile = await userService.getProfile().catch(() => null);
          if (profile) {
            setUser({ id: profile.id, username: profile.username });
          } else {
            // Token invalid
            localStorage.removeItem('authToken');
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Token validation failed', error);
        localStorage.removeItem('authToken');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
