import { useState, useEffect, createContext, useContext } from 'react';
import { authAPI, userAPI } from '../services/api';
const AuthContext = createContext();
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchUserProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      setProfile(response.data);
      return response.data;
    } catch (err) {
      console.error('Ошибка при получении профиля:', err);
      return null;
    }
  };
  useEffect(() => {
    let cancelled = false;
    const initializeAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        setUser({ token });
        await fetchUserProfile();
      }
      if (!cancelled) setLoading(false);
    };
    initializeAuth();
    return ()=>{ cancelled = true; };
  }, []);
  const signin = async (phone, password) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.signin(phone, password);
      const { access_token, refresh_token } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      setUser({ 
        token: access_token,
        refreshToken: refresh_token 
      });
      await fetchUserProfile();
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Ошибка входа';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const signup = async (phone, password) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.signup(phone, password);
      const { access_token, refresh_token } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      setUser({ 
        token: access_token,
        refreshToken: refresh_token 
      });
      await fetchUserProfile();
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Ошибка регистрации';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Ошибка при выходе:', err);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setProfile(null);
      setError(null);
    }
  };
  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem('refresh_token');
      if (!refreshTokenValue) {
        throw new Error('No refresh token');
      }
      const response = await authAPI.refreshToken(refreshTokenValue);
      const { access_token, refresh_token } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      setUser(prev => ({
        ...prev,
        token: access_token,
        refreshToken: refresh_token
      }));
      return access_token;
    } catch (err) {
      logout();
      throw err;
    }
  };
  const value = {
    user,
    profile,
    loading,
    error,
    signin,
    signup,
    logout,
    refreshToken,
    fetchUserProfile,
    isAuthenticated: !!user
  };
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
