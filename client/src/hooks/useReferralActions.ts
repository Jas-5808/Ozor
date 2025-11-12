import { useState, useCallback } from 'react';
import { shopAPI } from '../services/api';
import { logger } from '../utils/logger';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../constants';

interface ReferralModalState {
  open: boolean;
  productId?: string;
  link?: string;
  title?: string;
}

interface CreateModalState {
  open: boolean;
  product?: {
    product_id: string;
    product_name: string;
  };
  title: string;
  agree: boolean;
  createdLink?: string | null;
}

interface UseReferralActionsReturn {
  // Dialog state
  dialog: ReferralModalState;
  setDialog: (state: ReferralModalState) => void;
  
  // Create modal state
  createModal: CreateModalState;
  setCreateModal: (state: CreateModalState) => void;
  
  // Loading states
  createLoading: boolean;
  deletingReferralId: string | null;
  
  // Errors
  createError: string | null;
  referralNotice: { type: 'success' | 'error'; message: string } | null;
  
  // Actions
  handleGenerate: (product: { product_id: string; product_name: string }) => void;
  submitCreateReferral: () => Promise<void>;
  handleDeleteReferral: (referralId: string) => Promise<void>;
  handleCopy: (text: string) => Promise<void>;
}

/**
 * Хук для управления действиями с реферальными ссылками
 * Выносит логику из компонента Profile
 */
export function useReferralActions(
  userId: string,
  onSuccess?: () => void
): UseReferralActionsReturn {
  const [dialog, setDialog] = useState<ReferralModalState>({ open: false });
  const [createModal, setCreateModal] = useState<CreateModalState>({
    open: false,
    title: '',
    agree: false,
    createdLink: null,
  });
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingReferralId, setDeletingReferralId] = useState<string | null>(null);
  const [referralNotice, setReferralNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState<string>('');

  const makeReferralLink = useCallback(
    (productId: string): string => {
      const origin = window.location.origin;
      return `${origin}/product/${productId}?ref=${userId}`;
    },
    [userId]
  );

  const handleGenerate = useCallback(
    (product: { product_id: string; product_name: string }) => {
      setCreateError(null);
      setCreateModal({
        open: true,
        product,
        title: product?.product_name || '',
        agree: false,
        createdLink: null,
      });
    },
    []
  );

  const submitCreateReferral = useCallback(async () => {
    if (!createModal.product) return;

    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await shopAPI.createReferral({
        product_id: createModal.product.product_id,
      });

      const link = res.data?.link || makeReferralLink(createModal.product.product_id);
      
      setCreateModal((prev) => ({
        ...prev,
        createdLink: link,
        agree: true,
      }));

      setReferralNotice({
        type: 'success',
        message: SUCCESS_MESSAGES.LINK_COPIED,
      });

      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : ERROR_MESSAGES.UNKNOWN;
      setCreateError(errorMessage);
      setReferralNotice({
        type: 'error',
        message: errorMessage,
      });
      logger.errorWithContext(error, { context: 'submitCreateReferral' });
    } finally {
      setCreateLoading(false);
    }
  }, [createModal.product, makeReferralLink, onSuccess]);

  const handleDeleteReferral = useCallback(async (referralId: string) => {
    setDeletingReferralId(referralId);
    try {
      await shopAPI.deleteReferral(referralId);
      setReferralNotice({
        type: 'success',
        message: 'Реферальная ссылка удалена',
      });
      onSuccess?.();
    } catch (error) {
      setReferralNotice({
        type: 'error',
        message: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN,
      });
      logger.errorWithContext(error, { context: 'handleDeleteReferral' });
    } finally {
      setDeletingReferralId(null);
    }
  }, [onSuccess]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setReferralNotice({
        type: 'success',
        message: SUCCESS_MESSAGES.LINK_COPIED,
      });
      setTimeout(() => {
        setCopied('');
        setReferralNotice(null);
      }, 1500);
    } catch (error) {
      logger.errorWithContext(error, { context: 'handleCopy' });
    }
  }, []);

  return {
    dialog,
    setDialog,
    createModal,
    setCreateModal,
    createLoading,
    deletingReferralId,
    createError,
    referralNotice,
    handleGenerate,
    submitCreateReferral,
    handleDeleteReferral,
    handleCopy,
  };
}

