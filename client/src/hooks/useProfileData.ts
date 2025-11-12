import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { shopAPI, paymentAPI } from '../services/api';
import { useProducts } from './useProducts';
import { useFlows } from './useFlows';
import type { ReferralResponse } from '../types/api';
import { logger } from '../utils/logger';

interface ReferralStats {
  id: string;
  title: string;
  code: string;
  total: number;
  hold: number;
  paid: number;
  earned: number;
}

interface ProfileDataReturn {
  // Referrals
  apiFlows: ReferralResponse[];
  apiFlowsLoading: boolean;
  apiFlowsError: string | null;
  referralStats: ReferralStats[];
  totals: {
    total: number;
    hold: number;
    paid: number;
    earned: number;
  };
  
  // Balance
  userBalance: number | null;
  balanceLoading: boolean;
  
  // Actions
  loadReferrals: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

/**
 * Хук для управления данными профиля
 * Выносит логику из компонента Profile для улучшения чистоты кода
 */
export function useProfileData(): ProfileDataReturn {
  const { isAuthenticated } = useAuth();
  const { products } = useProducts();
  const { flows } = useFlows();
  
  // Referrals state
  const [apiFlows, setApiFlows] = useState<ReferralResponse[]>([]);
  const [apiFlowsLoading, setApiFlowsLoading] = useState<boolean>(false);
  const [apiFlowsError, setApiFlowsError] = useState<string | null>(null);
  
  // Balance state
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);

  // Product map for quick lookup
  const productById = useMemo(() => {
    const map = new Map<string, typeof products[0]>();
    (products || []).forEach((p) => {
      if (p?.product_id) {
        map.set(p.product_id, p);
      }
    });
    return map;
  }, [products]);

  // Load referrals
  const loadReferrals = async (): Promise<void> => {
    try {
      setApiFlowsLoading(true);
      setApiFlowsError(null);
      const res = await shopAPI.getReferrals();
      const data = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.users || res.data?.data || []);
      setApiFlows(data);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Yuklashda xatolik';
      setApiFlowsError(errorMessage);
      logger.errorWithContext(error, { context: 'loadReferrals' });
    } finally {
      setApiFlowsLoading(false);
    }
  };

  // Load balance
  const refreshBalance = async (): Promise<void> => {
    try {
      setBalanceLoading(true);
      const res = await paymentAPI.getUserBalance();
      const value = typeof res?.data?.balance === 'number' 
        ? res.data.balance 
        : 0;
      setUserBalance(value);
    } catch (error) {
      setUserBalance(null);
      logger.errorWithContext(error, { context: 'refreshBalance' });
    } finally {
      setBalanceLoading(false);
    }
  };

  // Load referrals on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    if (apiFlows.length === 0) {
      loadReferrals();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load balance on mount
  useEffect(() => {
    if (isAuthenticated) {
      refreshBalance();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute referral stats
  const referralStats = useMemo(() => {
    return (apiFlows || []).map((r) => {
      const orders = Array.isArray(r?.orders) ? r.orders : [];
      const total = orders.length;
      const paid = orders.filter(
        (o) => String(o?.status || '').toLowerCase() === 'delivered'
      ).length;
      const hold = total - paid;
      const product = productById.get(r.product_id);
      const commission: number = Number(product?.refferal_price) || 0;
      const earned = commission > 0 
        ? commission * paid 
        : (typeof r?.total_earned === 'number' ? r.total_earned : 0);
      
      return {
        id: r.id,
        title: r.product_name || r.title || '',
        code: r.link || r.code || '',
        total,
        hold,
        paid,
        earned,
      };
    });
  }, [apiFlows, productById]);

  // Compute totals
  const totals = useMemo(() => {
    return referralStats.reduce(
      (acc, stat) => ({
        total: acc.total + stat.total,
        hold: acc.hold + stat.hold,
        paid: acc.paid + stat.paid,
        earned: acc.earned + stat.earned,
      }),
      { total: 0, hold: 0, paid: 0, earned: 0 }
    );
  }, [referralStats]);

  return {
    apiFlows,
    apiFlowsLoading,
    apiFlowsError,
    referralStats,
    totals,
    userBalance,
    balanceLoading,
    loadReferrals,
    refreshBalance,
  };
}

