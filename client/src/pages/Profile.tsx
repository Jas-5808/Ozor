import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userAPI } from '../services/api';
import cn from './style.module.scss';
interface ProfileData {
  id: string;
  user_id: string;
  balance: number;
  location: string | null;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  avatar: string | null;
  email: string | null;
}
export function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { user, isAuthenticated, logout } = useAuth();
  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);
  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await userAPI.getProfile();
      setProfile(response.data);
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке профиля');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };
  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Ошибка при выходе:', err);
    }
  };
  if (!isAuthenticated) {
    return (
      <div className="container">
        <div className={cn.profile_content}>
          <h2>Необходима авторизация</h2>
          <p>Для просмотра профиля необходимо войти в систему</p>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="container">
        <div className={cn.profile_content}>
          <p>Загрузка профиля...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container">
        <div className={cn.profile_content}>
          <div className={cn.error_message}>
            <p>Ошибка: {error}</p>
            <button onClick={fetchProfile} className={cn.btn_primary}>
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="container">
      <div className={cn.profile_content}>
        <div className={cn.profile_header}>
          <h2 className={cn.title}>Профиль пользователя</h2>
          <button onClick={handleLogout} className={cn.logout_btn}>
            Выйти
          </button>
        </div>
        {profile && (
          <div className={cn.profile_info}>
            <div className={cn.profile_section}>
              <h3>Основная информация</h3>
              <div className={cn.info_grid}>
                <div className={cn.info_item}>
                  <label>ID пользователя:</label>
                  <span>{profile.user_id}</span>
                </div>
                <div className={cn.info_item}>
                  <label>Имя:</label>
                  <span>{profile.first_name || 'Не указано'}</span>
                </div>
                <div className={cn.info_item}>
                  <label>Фамилия:</label>
                  <span>{profile.last_name || 'Не указано'}</span>
                </div>
                <div className={cn.info_item}>
                  <label>Email:</label>
                  <span>{profile.email || 'Не указан'}</span>
                </div>
                <div className={cn.info_item}>
                  <label>Баланс:</label>
                  <span className={cn.balance}>{profile.balance} сум</span>
                </div>
                <div className={cn.info_item}>
                  <label>Местоположение:</label>
                  <span>{profile.location || 'Не указано'}</span>
                </div>
              </div>
            </div>
            {profile.bio && (
              <div className={cn.profile_section}>
                <h3>О себе</h3>
                <p className={cn.bio}>{profile.bio}</p>
              </div>
            )}
            {profile.avatar && (
              <div className={cn.profile_section}>
                <h3>Аватар</h3>
                <img src={profile.avatar} alt="Аватар" className={cn.avatar} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
export default Profile;