import React from 'react';
import { X, AlertTriangle, DollarSign } from 'lucide-react';

interface BidConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bidAmount: number;
  currentBid: number;
  auctionTitle: string;
  loading?: boolean;
}

const BidConfirmationModal: React.FC<BidConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  bidAmount,
  currentBid,
  auctionTitle,
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Confirm Your Bid</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-gray-600">Please review your bid carefully</span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm text-gray-600">Auction</p>
              <p className="font-medium text-gray-900 truncate">{auctionTitle}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Current Bid</p>
                <p className="font-medium text-gray-900">${currentBid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Your Bid</p>
                <p className="font-semibold text-green-600 text-lg">${bidAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Bid Commitment</p>
                <p>By placing this bid, you agree to purchase this item if you win the auction.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? 'Placing Bid...' : 'Confirm Bid'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BidConfirmationModal;