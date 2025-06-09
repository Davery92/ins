import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'pending' | 'active' | 'disabled';
  role: 'user' | 'admin';
  companyId: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  registerAdmin: (companyName: string, domain: string, email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const API_BASE_URL = '/api';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('riskninja-token');
    const savedUser = localStorage.getItem('riskninja-user');
    
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user data:', error);
        localStorage.removeItem('riskninja-token');
        localStorage.removeItem('riskninja-user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    const loginUrl = `${API_BASE_URL}/auth/login`;
    console.log('[AuthContext] login URL:', loginUrl);
    
    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setToken(data.token);
      setUser(data.user);
      
      // Save to localStorage
      localStorage.setItem('riskninja-token', data.token);
      localStorage.setItem('riskninja-user', JSON.stringify(data.user));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, firstName: string, lastName: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    const registerUrl = `${API_BASE_URL}/auth/register`;
    console.log('[AuthContext] register URL:', registerUrl);
    
    try {
      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setToken(data.token);
      setUser(data.user);
      
      // Save to localStorage
      localStorage.setItem('riskninja-token', data.token);
      localStorage.setItem('riskninja-user', JSON.stringify(data.user));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const registerAdmin = async (
    companyName: string,
    domain: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, domain, email, password, firstName, lastName }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Admin registration failed');
      }
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('riskninja-token', data.token);
      localStorage.setItem('riskninja-user', JSON.stringify(data.user));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('riskninja-token');
    localStorage.removeItem('riskninja-user');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    registerAdmin,
    logout,
    isLoading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 