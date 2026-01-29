const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { v4: uuidv4 } = require('uuid');
const devWallet = require('../services/devWalletStore');
const isDev = (process.env.NODE_ENV === 'development');
const isDbDisabledInDev = isDev && process.env.FORCE_DB_CONNECTION !== 'true';

// Get account balance and basic info
const getAccountBalance = async (req, res) => {
  try {
    if (isDbDisabledInDev) {
      const w = devWallet.getWallet(req.user.id);
      return res.json({
        success: true,
        data: {
          balance: w.balance || 0,
          currency: w.currency || 'USD',
          lastTransactionDate: w.lastTransactionDate,
          formattedBalance: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: w.currency || 'USD'
          }).format(w.balance || 0)
        }
      });
    }
    const user = await User.findById(req.user.id).select('accountBalance currency lastTransactionDate');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        balance: user.accountBalance || 0,
        currency: user.currency || 'USD',
        lastTransactionDate: user.lastTransactionDate,
        formattedBalance: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: user.currency || 'USD'
        }).format(user.accountBalance || 0)
      }
    });
  } catch (error) {
    console.error('Get account balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get transaction history with pagination
const getTransactionHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type; // Filter by transaction type
    const status = req.query.status; // Filter by status
    
    const skip = (page - 1) * limit;
    
    // Build query
    const query = { user: req.user.id };
    if (type) query.type = type;
    if (status) query.status = status;
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('auction', 'title')
      .select('-gatewayResponse -internalNotes');
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalTransactions: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get specific transaction details
const getTransactionDetails = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId,
      user: req.user.id
    }).populate('auction', 'title description');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Get transaction details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Top-up account (deposit funds)
const topUpAccount = async (req, res) => {
  try {
    const { amount, paymentMethod, currency = 'USD' } = req.body;
    
    // In development with DB disabled, use dev wallet store
    if (isDbDisabledInDev) {
      const result = devWallet.topUp(req.user.id, { amount, currency, paymentMethod });
      return res.json({
        success: true,
        message: 'Account topped up successfully',
        data: {
          transaction: {
            id: result.transaction.transactionId,
            amount: result.transaction.amount,
            currency: result.transaction.currency,
            status: result.transaction.status,
            createdAt: result.transaction.createdAt
          },
          newBalance: result.newBalance,
          formattedBalance: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: result.currency || 'USD'
          }).format(result.newBalance)
        }
      });
    }

    // In development mode with DB enabled, simulate successful payment
    if (isDev) {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const balanceBefore = user.accountBalance || 0;
      const balanceAfter = balanceBefore + parseFloat(amount);
      
      // Create transaction record (ensure schema compliance)
      const transaction = new Transaction({
        transactionId: uuidv4(),
        type: 'deposit',
        category: 'wallet',
        user: req.user.id,
        amount: parseFloat(amount),
        currency: currency,
        exchangeRate: 1.0,
        baseAmount: parseFloat(amount),
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        status: 'completed',
        // Use allowed enum for dev deposits
        paymentMethod: 'wallet',
        description: `Account top-up via ${paymentMethod || 'internal'}`,
        gatewayTransactionId: `dev_${uuidv4()}`,
        processedAt: new Date(),
        metadata: {
          source: 'development',
          reference: 'dev_topup',
          tags: ['dev', 'topup']
        }
      });
      
      await transaction.save();
      
      // Update user balance
      user.accountBalance = balanceAfter;
      user.lastTransactionDate = new Date();
      await user.save();
      
      return res.json({
        success: true,
        message: 'Account topped up successfully',
        data: {
          transaction: {
            id: transaction.transactionId,
            amount: transaction.amount,
            currency: transaction.currency,
            status: transaction.status,
            createdAt: transaction.createdAt
          },
          newBalance: balanceAfter,
          formattedBalance: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
          }).format(balanceAfter)
        }
      });
    }
    
    // In production, integrate with payment gateway (Stripe, PayPal, etc.)
    // This is a placeholder for actual payment processing
    res.status(501).json({
      success: false,
      message: 'Payment processing not implemented in production mode'
    });
    
  } catch (error) {
    console.error('Top-up account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Withdraw funds (placeholder - requires additional verification)
const withdrawFunds = async (req, res) => {
  try {
    const { amount, withdrawalMethod } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const currentBalance = user.accountBalance || 0;
    
    if (currentBalance < parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    // In development mode, simulate withdrawal
    if (process.env.NODE_ENV === 'development') {
      const balanceBefore = currentBalance;
      const balanceAfter = balanceBefore - parseFloat(amount);
      
      // Create transaction record
      const transaction = new Transaction({
        transactionId: uuidv4(),
        type: 'withdrawal',
        category: 'wallet',
        user: req.user.id,
        amount: parseFloat(amount),
        currency: user.currency || 'USD',
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        status: 'completed',
        paymentMethod: withdrawalMethod || 'development',
        description: `Withdrawal via ${withdrawalMethod || 'development'}`,
        gatewayTransactionId: `dev_withdrawal_${uuidv4()}`,
        processedAt: new Date()
      });
      
      await transaction.save();
      
      // Update user balance
      user.accountBalance = balanceAfter;
      user.lastTransactionDate = new Date();
      await user.save();
      
      return res.json({
        success: true,
        message: 'Withdrawal processed successfully',
        data: {
          transaction: {
            id: transaction.transactionId,
            amount: transaction.amount,
            currency: transaction.currency,
            status: transaction.status,
            createdAt: transaction.createdAt
          },
          newBalance: balanceAfter
        }
      });
    }
    
    // In production, implement actual withdrawal processing
    res.status(501).json({
      success: false,
      message: 'Withdrawal processing not implemented in production mode'
    });
    
  } catch (error) {
    console.error('Withdraw funds error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get account statistics
const getAccountStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's current balance
    const user = await User.findById(userId).select('accountBalance currency');
    
    // Get transaction statistics
    const stats = await Transaction.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentActivity = await Transaction.find({
      user: userId,
      createdAt: { $gte: thirtyDaysAgo }
    }).countDocuments();
    
    // Format statistics
    const formattedStats = {
      currentBalance: user?.accountBalance || 0,
      currency: user?.currency || 'USD',
      transactionStats: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount
        };
        return acc;
      }, {}),
      recentActivity: recentActivity,
      totalTransactions: stats.reduce((sum, stat) => sum + stat.count, 0)
    };
    
    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Get account stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getAccountBalance,
  getTransactionHistory,
  getTransactionDetails,
  topUpAccount,
  withdrawFunds,
  getAccountStats
};