const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const Auction = require('../models/Auction');
const User = require('../models/User');
const stripeService = require('../services/stripeService');
const escrowService = require('../services/escrowService');
const invoiceService = require('../services/invoiceService');
const currencyService = require('../services/currencyService');

/**
 * Create payment intent for auction payment
 */
const createPaymentIntent = async (req, res) => {
  try {
    const { auctionId, amount, currency = 'USD', paymentMethodId, savePaymentMethod = false } = req.body;
    const userId = req.user.id;

    // Validate currency
    if (!currencyService.isSupportedCurrency(currency)) {
      return res.status(400).json({
        success: false,
        message: 'Currency not supported'
      });
    }

    // Get exchange rate and convert to base currency (USD)
    const exchangeRate = await currencyService.getExchangeRate(currency, 'USD');
    const baseAmount = await currencyService.convertCurrency(amount, currency, 'USD');

    // Find auction
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripeService.createPaymentIntent({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      paymentMethodId,
      customerId: req.user.stripeCustomerId,
      metadata: {
        auctionId,
        userId,
        originalCurrency: currency,
        exchangeRate: exchangeRate.toString(),
        baseAmount: baseAmount.toString()
      }
    });

    // Create payment record
    const payment = new Payment({
      paymentId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      auctionId,
      amount,
      currency,
      exchangeRate,
      baseAmount,
      stripePaymentIntentId: paymentIntent.id,
      status: 'pending',
      paymentMethod: 'stripe',
      escrowStatus: 'pending'
    });

    await payment.save();

    res.json({
      success: true,
      data: {
        paymentIntent: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          status: paymentIntent.status
        },
        payment: {
          id: payment._id,
          paymentId: payment.paymentId,
          amount: payment.amount,
          currency: payment.currency,
          exchangeRate: payment.exchangeRate,
          baseAmount: payment.baseAmount,
          status: payment.status
        }
      }
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
};

/**
 * Confirm payment
 */
const confirmPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    // Find payment
    const payment = await Payment.findOne({ paymentId, buyer: userId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be confirmed. Current status: ${payment.status}`
      });
    }

    // Confirm payment with gateway
    let confirmResult;
    
    if (payment.paymentMethod === 'stripe') {
      confirmResult = await stripeService.confirmPayment(paymentIntentId);
      
      if (!confirmResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Payment confirmation failed',
          error: confirmResult.error
        });
      }
    }

    // Update payment status
    payment.status = 'processing';
    payment.paidAt = new Date();
    await payment.save();

    // Hold funds in escrow
    const escrowResult = await escrowService.holdFunds(paymentId);
    
    if (!escrowResult.success) {
      console.error('Failed to hold funds in escrow:', escrowResult.error);
      // Payment is confirmed but escrow failed - needs manual intervention
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      payment: {
        paymentId: payment.paymentId,
        status: payment.status,
        escrowStatus: payment.escrowStatus,
        paidAt: payment.paidAt
      }
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get payment details
 */
const getPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findOne({ paymentId })
      .populate('auction', 'title description images startingBid currentBid')
      .populate('buyer', 'username email')
      .populate('seller', 'username email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user is authorized to view this payment
    if (payment.buyer._id.toString() !== userId && payment.seller._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get user's payment history
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status, type } = req.query;

    const query = {
      $or: [
        { buyer: userId },
        { seller: userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .populate('auction', 'title images')
      .populate('buyer', 'username')
      .populate('seller', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Release escrow funds to seller
 */
const releaseEscrow = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason = 'item_delivered' } = req.body;
    const userId = req.user.id;

    // Find payment and check authorization
    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Only buyer or admin can release escrow
    if (payment.buyer.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the buyer or admin can release escrow funds'
      });
    }

    const releaseResult = await escrowService.releaseFundsToSeller(paymentId, reason, userId);

    if (!releaseResult.success) {
      return res.status(400).json({
        success: false,
        message: releaseResult.error
      });
    }

    res.json({
      success: true,
      message: releaseResult.message,
      escrowStatus: releaseResult.escrowStatus,
      netAmountToSeller: releaseResult.netAmountToSeller,
      fees: releaseResult.fees
    });
  } catch (error) {
    console.error('Release escrow error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Request refund
 */
const requestRefund = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    // Find payment and check authorization
    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Only buyer can request refund
    if (payment.buyer.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the buyer can request a refund'
      });
    }

    const refundResult = await escrowService.refundFundsToBuyer(paymentId, reason, userId);

    if (!refundResult.success) {
      return res.status(400).json({
        success: false,
        message: refundResult.error
      });
    }

    res.json({
      success: true,
      message: refundResult.message,
      escrowStatus: refundResult.escrowStatus,
      refundAmount: refundResult.refundAmount
    });
  } catch (error) {
    console.error('Request refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Confirm delivery
 */
const confirmDelivery = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { trackingNumber, carrier } = req.body;
    const userId = req.user.id;

    // Find payment and check authorization
    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Only seller can confirm delivery
    if (payment.seller.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the seller can confirm delivery'
      });
    }

    const deliveryResult = await escrowService.confirmDelivery(paymentId, {
      trackingNumber,
      carrier
    });

    if (!deliveryResult.success) {
      return res.status(400).json({
        success: false,
        message: deliveryResult.error
      });
    }

    res.json({
      success: true,
      message: deliveryResult.message,
      autoReleaseDate: deliveryResult.autoReleaseDate
    });
  } catch (error) {
    console.error('Confirm delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get escrow status
 */
const getEscrowStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    // Find payment and check authorization
    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user is authorized to view escrow status
    if (payment.buyer.toString() !== userId && payment.seller.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const escrowResult = await escrowService.getEscrowStatus(paymentId);

    if (!escrowResult.success) {
      return res.status(400).json({
        success: false,
        message: escrowResult.error
      });
    }

    res.json({
      success: true,
      escrowInfo: escrowResult.escrowInfo
    });
  } catch (error) {
    console.error('Get escrow status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get transaction history
 */
const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, type, category, status } = req.query;

    const query = { user: userId };

    if (type) {
      query.type = type;
    }
    if (category) {
      query.category = category;
    }
    if (status) {
      query.status = status;
    }

    const transactions = await Transaction.find(query)
      .populate('auction', 'title')
      .populate('payment', 'paymentId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    // Get transaction summary
    const summary = await Transaction.getTransactionSummary(userId);

    res.json({
      success: true,
      transactions,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Handle Stripe webhook
 */
const handleStripeWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookResult = await stripeService.handleWebhook(req.body, sig);

    if (!webhookResult.success) {
      return res.status(400).json({
        success: false,
        message: webhookResult.error
      });
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  getPayment,
  getPaymentHistory,
  releaseEscrow,
  requestRefund,
  confirmDelivery,
  getEscrowStatus,
  getTransactionHistory,
  handleStripeWebhook
};