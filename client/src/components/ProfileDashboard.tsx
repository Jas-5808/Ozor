import React from 'react';
import cn from '../pages/profile.module.scss';
import { formatPrice } from '../utils/helpers';

interface ProfileDashboardProps {
  userBalance: number | null;
  balanceLoading: boolean;
  totals: {
    total: number;
    hold: number;
    paid: number;
    earned: number;
  };
}

/**
 * Компонент дашборда профиля
 * Показывает баланс и статистику
 */
export const ProfileDashboard: React.FC<ProfileDashboardProps> = ({
  userBalance,
  balanceLoading,
  totals,
}) => {
  return (
    <div className={cn.dashboard}>
      <div className={cn.balanceCard}>
        <h3>Баланс</h3>
        {balanceLoading ? (
          <div className={cn.loading}>Загрузка...</div>
        ) : (
          <div className={cn.balanceAmount}>
            {userBalance !== null ? formatPrice(userBalance) : '—'}
          </div>
        )}
      </div>

      <div className={cn.statsGrid}>
        <div className={cn.statCard}>
          <h4>Всего заказов</h4>
          <p className={cn.statValue}>{totals.total}</p>
        </div>
        <div className={cn.statCard}>
          <h4>В обработке</h4>
          <p className={cn.statValue}>{totals.hold}</p>
        </div>
        <div className={cn.statCard}>
          <h4>Оплачено</h4>
          <p className={cn.statValue}>{totals.paid}</p>
        </div>
        <div className={cn.statCard}>
          <h4>Заработано</h4>
          <p className={cn.statValue}>{formatPrice(totals.earned)}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileDashboard;

