import { createContext, useContext, useState } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (parsed?.message) return parsed.message;
    } catch {
      if (data.trim()) return data;
    }
  }
  return data?.message || error?.message || fallback;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const storeAuth = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      storeAuth(data.token, data.user);
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, message: getErrorMessage(error, 'Login failed') };
    } finally {
      setLoading(false);
    }
  };

  const requestLoginOtp = async (email) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/request-otp', { email });
      return {
        success: true,
        message: data.message || 'OTP sent successfully',
        devOtp: data.devOtp
      };
    } catch (error) {
      return { success: false, message: getErrorMessage(error, 'Failed to request OTP') };
    } finally {
      setLoading(false);
    }
  };

  const loginWithOtp = async (email, otp) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login-otp', { email, otp });
      storeAuth(data.token, data.user);
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, message: getErrorMessage(error, 'OTP login failed') };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', userData);
      storeAuth(data.token, data.user);
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, message: getErrorMessage(error, 'Registration failed') };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (userData) => {
    const updated = { ...user, ...userData };
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isFarmer: user?.role === 'farmer',
      login,
      requestLoginOtp,
      loginWithOtp,
      register,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
