import React, { useState } from 'react';
import { History, BarChart3 } from 'lucide-react';
import AccountBalance from './AccountBalance';
import TopUpForm from './TopUpForm';
import TransactionHistory from './TransactionHistory';
import AccountStats from './AccountStats';

const AccountSection: React.FC = () => {
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('transactions');

  const handleTopUpSuccess = () => {
    setShowTopUpForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (showTopUpForm) {
    return (
      <div className="space-y-6">
        <TopUpForm
          onSuccess={handleTopUpSuccess}
          onCancel={() => setShowTopUpForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AccountBalance
        onTopUpClick={() => setShowTopUpForm(true)}
        onRefresh={handleRefresh}
      />

      {/* Custom Tab System */}
      <div className="w-full">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <History className="h-4 w-4" />
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Statistics
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'transactions' && (
            <TransactionHistory key={refreshTrigger} />
          )}
          {activeTab === 'stats' && (
            <AccountStats key={refreshTrigger} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountSection;