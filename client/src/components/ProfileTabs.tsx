import React from 'react';
import cn from '../pages/profile.module.scss';
import type { Product } from '../types';

interface Tab {
  id: 'dashboard' | 'market' | 'oqim' | 'stats' | 'payments';
  label: string;
  icon?: React.ReactNode;
}

interface ProfileTabsProps {
  activeTab: 'dashboard' | 'market' | 'oqim' | 'stats' | 'payments';
  onTabChange: (tab: 'dashboard' | 'market' | 'oqim' | 'stats' | 'payments') => void;
  children: React.ReactNode;
}

/**
 * Компонент вкладок профиля
 * Вынесен из Profile.tsx для улучшения структуры
 */
export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  onTabChange,
  children,
}) => {
  const tabs: Tab[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'market', label: 'Market' },
    { id: 'oqim', label: 'Oqim' },
    { id: 'stats', label: 'Stats' },
    { id: 'payments', label: 'Payments' },
  ];

  return (
    <div className={cn.profileContainer}>
      <div className={cn.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`${cn.tab} ${activeTab === tab.id ? cn.activeTab : ''}`}
            aria-pressed={activeTab === tab.id}
            aria-label={tab.label}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={cn.tabContent}>
        {children}
      </div>
    </div>
  );
};

export default ProfileTabs;

