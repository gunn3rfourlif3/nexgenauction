import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiEndpoints } from '../services/api';

type CurrencyContextValue = {
  currency: string;
  loading: boolean;
  setCurrency: (code: string) => void;
  formatCurrency: (amount: number) => string;
  refresh: () => Promise<void>;
};

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = async () => {
    try {
      setLoading(true);
      const res = await apiEndpoints.settings.currency.get();
      const code = res?.data?.data?.currency?.defaultCurrency || 'USD';
      setCurrency(code);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const formatCurrency = useMemo(() => {
    return (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  }, [currency]);

  const value: CurrencyContextValue = { currency, loading, setCurrency, formatCurrency, refresh };
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
};