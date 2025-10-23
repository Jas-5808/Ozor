import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { authAPI, userAPI } from "../api";

interface User {
  token: string;
  refreshToken?: string;
}

interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  bio?: string;
  location?: string;
  balance?: number;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  signin: (phone: string, password: string) => Promise<any>;
  signup: (phone: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
  fetchUserProfile: () => Promise<Profile | null>;
  isAuthenticated: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fetchUserProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      setProfile(response.data);
      return response.data;
    } catch (err) {
      console.error("Ошибка при получении профиля:", err);
      return null;
    }
  };
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        setUser({ token });
        await fetchUserProfile();
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);
  const signin = async (phone: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.signin(phone, password);
      const { access_token, refresh_token } = response.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      setUser({
        token: access_token,
        refreshToken: refresh_token,
      });
      await fetchUserProfile();
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Ошибка входа";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const signup = async (phone: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.signup(phone, password);
      const { access_token, refresh_token } = response.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      setUser({
        token: access_token,
        refreshToken: refresh_token,
      });
      await fetchUserProfile();
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Ошибка регистрации";
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
      console.error("Ошибка при выходе:", err);
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
      setProfile(null);
      setError(null);
    }
  };
  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem("refresh_token");
      if (!refreshTokenValue) {
        throw new Error("No refresh token");
      }
      const response = await authAPI.refreshToken(refreshTokenValue);
      const { access_token, refresh_token } = response.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      setUser((prev) => ({
        ...prev,
        token: access_token,
        refreshToken: refresh_token,
      }));
      return access_token;
    } catch (err) {
      logout();
      throw err;
    }
  };
  const value: AuthContextType = {
    user,
    profile,
    loading,
    error,
    signin,
    signup,
    logout,
    refreshToken,
    fetchUserProfile,
    isAuthenticated: !!user,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
