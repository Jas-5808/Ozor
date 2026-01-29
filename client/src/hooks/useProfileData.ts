import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { paymentAPI, shopAPI } from '../services/api';
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
  product_referal_price: number;
}

interface BalanceSummary {
  total_balance: number;
  available_balance: number;
  total_credits: number;
  total_debits: number;
  active_holds: number;
  referral_pending: number;
  referral_active: number;
  referral_cancelled: number;
  referral_paid: number;
  total_transactions: number;
  total_referral_transactions: number;
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
  balanceSummary: BalanceSummary | null;
  balanceLoading: boolean;
  balanceError: string | null;
  
  // Actions
  loadReferrals: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  /** Удалить реферал из списка оптимистично (без перезагрузки) */
  removeReferralById: (id: string) => void;
}

/**
 * Хук для управления данными профиля
 * Выносит логику из компонента Profile для улучшения чистоты кода
 */
export function useProfileData(): ProfileDataReturn {
  const { isAuthenticated, profile, fetchUserProfile } = useAuth();
  
  // Referrals state
  const [apiFlows, setApiFlows] = useState<ReferralResponse[]>([]);
  const [apiFlowsLoading, setApiFlowsLoading] = useState<boolean>(false);
  const [apiFlowsError, setApiFlowsError] = useState<string | null>(null);
  
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

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

  const removeReferralById = (id: string): void => {
    setApiFlows((prev) => prev.filter((r) => String((r as any)?.id ?? '') !== String(id)));
  };

  const loadBalance = async (): Promise<void> => {
    if (!isAuthenticated) return;
    try {
      setBalanceLoading(true);
      setBalanceError(null);
      const res = await paymentAPI.getBalanceSummary();
      setBalanceSummary((res as any)?.data || null);
    } catch (error) {
      setBalanceError(error instanceof Error ? error.message : 'Balance load error');
      logger.errorWithContext(error, { context: 'loadBalance' });
    } finally {
      setBalanceLoading(false);
    }
  };

  const refreshBalance = async (): Promise<void> => {
    if (!isAuthenticated) return;
    try {
      setBalanceLoading(true);
      setBalanceError(null);
      await fetchUserProfile();
      await loadBalance();
    } catch (error) {
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

  useEffect(() => {
    if (!isAuthenticated) return;
    loadBalance();
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const userBalance = useMemo(() => {
    if (typeof balanceSummary?.available_balance === 'number') {
      return balanceSummary.available_balance;
    }
    return null;
  }, [balanceSummary?.available_balance]);

  // Compute referral stats
  const referralStats = useMemo(() => {
    return (apiFlows || []).map((r) => {
      const orders = Array.isArray(r?.orders) ? r.orders : [];
      const total = orders.length;
      const paid = orders.filter(
        (o) => String(o?.status || '').toLowerCase() === 'delivered'
      ).length;
      const hold = total - paid;

      // Важно: не тянем весь каталог ради расчётов.
      // Используем комиссию, которую возвращает API по рефералке (если есть),
      // иначе fallback на total_earned.
      const productReferalPrice =
        typeof (r as any)?.product_referal_price === 'number'
          ? (r as any).product_referal_price
          : typeof (r as any)?.product_referal_price === 'string'
          ? Number((r as any).product_referal_price) || 0
          : 0;

      const earned =
        productReferalPrice > 0
          ? productReferalPrice * paid
          : (typeof (r as any)?.total_earned === 'number' ? (r as any).total_earned : 0);
      
      return {
        id: r.id,
        title: r.title || r.product_name || '',
        code: r.code || r.link || '',
        total,
        hold,
        paid,
        earned,
        product_referal_price: productReferalPrice,
      };
    });
  }, [apiFlows]);

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
    balanceSummary,
    balanceError,
    loadReferrals,
    refreshBalance,
    removeReferralById,
  };
}

