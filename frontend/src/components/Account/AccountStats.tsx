import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { apiEndpoints } from '../../services/api';
import { toast } from 'react-hot-toast';

interface AccountStatsData {
  currentBalance: number;
  currency: string;
  transactionStats: {
    [key: string]: {
      count: number;
      totalAmount: number;
    };
  };
  recentActivity: number;
  totalTransactions: number;
}

interface AccountStatsProps {
  refreshTrigger?: number;
}

const AccountStats: React.FC<AccountStatsProps> = ({ refreshTrigger }) => {
  const [stats, setStats] = useState<AccountStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await apiEndpoints.account.getStats();
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        toast.error('Failed to fetch account stats');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Error loading account statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStatCards = () => {
    if (!stats) return [];

    const cards = [
      {
        title: 'Current Balance',
        value: formatCurrency(stats.currentBalance, stats.currency),
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      {
        title: 'Total Transactions',
        value: stats.totalTransactions.toString(),
        icon: Activity,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'Recent Activity (30 days)',
        value: stats.recentActivity.toString(),
        icon: TrendingUp,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      }
    ];

    // Add deposit stats if available
    if (stats.transactionStats.deposit) {
      cards.push({
        title: 'Total Deposits',
        value: formatCurrency(stats.transactionStats.deposit.totalAmount, stats.currency),
        icon: TrendingUp,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      });
    }

    // Add withdrawal stats if available
    if (stats.transactionStats.withdrawal) {
      cards.push({
        title: 'Total Withdrawals',
        value: formatCurrency(stats.transactionStats.withdrawal.totalAmount, stats.currency),
        icon: TrendingDown,
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      });
    }

    return cards;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Account Statistics
          </h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statCards = getStatCards();

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Account Statistics
        </h3>
      </div>
      <div className="p-6">
        {stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${card.bgColor}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          {card.title}
                        </p>
                        <p className={`text-2xl font-bold ${card.color}`}>
                          {card.value}
                        </p>
                      </div>
                      <Icon className={`h-8 w-8 ${card.color}`} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Transaction Breakdown */}
            {Object.keys(stats.transactionStats).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Transaction Breakdown</h3>
                <div className="space-y-3">
                  {Object.entries(stats.transactionStats).map(([type, data]) => (
                    <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium capitalize">{type.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-600">{data.count} transactions</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(data.totalAmount, stats.currency)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Avg: {formatCurrency(data.totalAmount / data.count, stats.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No statistics available</p>
          </div>
        )}
       </div>
     </div>
   );
 };

export default AccountStats;