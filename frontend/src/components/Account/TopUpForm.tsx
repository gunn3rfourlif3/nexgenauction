import React, { useState } from 'react';
import { CreditCard, DollarSign, Loader2 } from 'lucide-react';
import { apiEndpoints } from '../../services/api';
import { toast } from 'react-hot-toast';

interface TopUpFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const TopUpForm: React.FC<TopUpFormProps> = ({ onSuccess, onCancel }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('development');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);

  const predefinedAmounts = [10, 25, 50, 100, 250, 500];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amountValue < 0.01 || amountValue > 10000) {
      toast.error('Amount must be between $0.01 and $10,000');
      return;
    }

    setLoading(true);

    try {
      const response = await apiEndpoints.account.topUp({
        amount: amountValue,
        paymentMethod,
        currency
      });

      if (response.data.success) {
        toast.success('Account topped up successfully!');
        onSuccess();
      } else {
        toast.error(response.data.message || 'Top-up failed');
      }
    } catch (error: any) {
      console.error('Top-up error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to process top-up';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePredefinedAmount = (value: number) => {
    setAmount(value.toString());
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-6">
        <CreditCard className="h-5 w-5" />
        <h3 className="text-lg font-medium">Top Up Account</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max="10000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quick Select</label>
          <div className="grid grid-cols-3 gap-2">
            {predefinedAmounts.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handlePredefinedAmount(value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                ${value}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="CAD">CAD - Canadian Dollar</option>
            <option value="AUD">AUD - Australian Dollar</option>
            <option value="JPY">JPY - Japanese Yen</option>
          </select>
        </div>

        <div>
          <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="development">Development Mode (Simulated)</option>
            <option value="credit_card">Credit Card</option>
            <option value="debit_card">Debit Card</option>
            <option value="paypal">PayPal</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-700">
            <strong>Development Mode:</strong> This is a simulated transaction for testing purposes. 
            No real payment will be processed.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Top Up Account'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default TopUpForm;