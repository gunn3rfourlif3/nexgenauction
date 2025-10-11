import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiEndpoints } from '../services/api';
import { useNotification } from './NotificationContext';

interface User {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  profileImage?: string;
  googleId?: string;
  facebookId?: string;
  githubId?: string;
  role: 'user' | 'admin' | 'super';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (userData: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showSuccess } = useNotification();

  const isAuthenticated = !!user && !!token;

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error initializing auth state:', error);
        // Clear invalid data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Verify token validity on app load
  useEffect(() => {
    const verifyToken = async () => {
      if (token && user) {
        try {
          await apiEndpoints.auth.profile();
          // Token is valid, user data is already set
        } catch (error) {
          // Only logout on clear auth failures
          const status = (error as any)?.response?.status;
          const message = (error as any)?.response?.data?.message || '';
          const isTokenError = /Token expired|Invalid token|Access denied\. No token provided|User not found|Account is deactivated/i.test(message);
          if (status === 401 && isTokenError) {
            console.error('Token invalid or expired, logging out.');
            logout();
          } else {
            console.warn('Profile check failed but not an auth error; keeping session.');
          }
        }
      }
    };

    if (!isLoading && token) {
      verifyToken();
    }
  }, [token, isLoading, user]);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await apiEndpoints.auth.login({ email, password });
      
      if (response.data.success) {
        // Handle both development and production response structures
        let userData, userToken;
        
        if (response.data.data) {
          // Production format: { success, message, data: { user, token } }
          ({ user: userData, token: userToken } = response.data.data);
        } else {
          // Development format: { success, message, token, user }
          userData = response.data.user;
          userToken = response.data.token;
        }
        
        // Update state
        setUser(userData);
        setToken(userToken);
        
        // Store in localStorage
        localStorage.setItem('token', userToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Show success notification
        showSuccess(`Welcome back, ${userData.firstName || userData.username}!`);
        
        return { success: true };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed. Please try again.' 
      };
    }
  };

  const register = async (userData: any): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await apiEndpoints.auth.register(userData);
      
      // Debug: Log the entire response structure
      console.log('Registration response:', response);
      console.log('Response data:', response.data);
      console.log('Response data.data:', response.data.data);
      
      if (response.data.success) {
        // Check if response.data.data exists before destructuring
        if (response.data.data && response.data.data.user && response.data.data.token) {
          const { user: newUser, token: userToken } = response.data.data;
          
          // Update state
          setUser(newUser);
          setToken(userToken);
          
          // Store in localStorage
          localStorage.setItem('token', userToken);
          localStorage.setItem('user', JSON.stringify(newUser));
          
          // Show success notification
          showSuccess(`Welcome to NexGen Auction, ${newUser.firstName || newUser.username}! Your account has been created successfully.`);
          
          return { success: true };
        } else {
          console.error('Invalid response structure:', response.data);
          return { success: false, message: 'Invalid response from server' };
        }
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed. Please try again.' 
      };
    }
  };

  const logout = () => {
    // Clear state
    setUser(null);
    setToken(null);
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Optional: Call logout endpoint
    try {
      apiEndpoints.auth.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    }

    // Redirect to home page after sign out
    // Using hard redirect to ensure app state resets cleanly
    window.location.href = '/';
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const refreshUser = async () => {
    if (!token) return;

    try {
      const response = await apiEndpoints.auth.profile();
      if (response.data.success) {
        const userData = response.data.data.user;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      // Only logout if clearly unauthorized
      const status = (error as any)?.response?.status;
      const message = (error as any)?.response?.data?.message || '';
      const isTokenError = /Token expired|Invalid token|Access denied\. No token provided|User not found|Account is deactivated/i.test(message);
      if (status === 401 && isTokenError) {
        console.error('Failed to refresh user: auth error, logging out.');
        logout();
      } else {
        console.warn('Failed to refresh user data; retaining current session.');
      }
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;