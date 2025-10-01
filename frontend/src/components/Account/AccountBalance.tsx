import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, RefreshCw } from 'lucide-react';
import { apiEndpoints } from '../../services/api';
import { toast } from 'react-hot-toast';

interface AccountBalanceData {
  balance: number;
  currency: string;
  lastTransactionDate: string | null;
  formattedBalance: string;
}

interface AccountBalanceProps {
  onTopUpClick: () => void;
  onRefresh?: () => void;
}

const AccountBalance: React.FC<AccountBalanceProps> = ({ onTopUpClick, onRefresh }) => {
  const [balanceData, setBalanceData] = useState<AccountBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const response = await apiEndpoints.account.getBalance();
      if (response.data.success) {
        setBalanceData(response.data.data);
      } else {
        toast.error('Failed to fetch balance');
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast.error('Error fetching balance');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBalance();
    if (onRefresh) {
      onRefresh();
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            <h3 className="text-lg font-medium">Account Balance</h3>
          </div>
        </div>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          <h3 className="text-lg font-medium">Account Balance</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="text-3xl font-bold text-green-600">
            {balanceData?.formattedBalance || '$0.00'}
          </div>
          <p className="text-sm text-gray-500">
            Available Balance
          </p>
        </div>

        {balanceData?.lastTransactionDate && (
          <div className="text-sm text-gray-500">
            Last transaction: {new Date(balanceData.lastTransactionDate).toLocaleDateString()}
          </div>
        )}

        <div className="flex gap-2">
          <button 
            onClick={onTopUpClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <TrendingUp className="h-4 w-4" />
            Top Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountBalance;