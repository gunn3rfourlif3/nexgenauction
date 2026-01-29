const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const Auction = require('../models/Auction');
const User = require('../models/User');
const stripeService = require('./stripeService');

class EscrowService {
  constructor() {
    this.AUTO_RELEASE_DAYS = 7; // Auto-release after 7 days of delivery
    this.DISPUTE_TIMEOUT_DAYS = 30; // Dispute timeout after 30 days
  }

  /**
   * Hold funds in escrow after successful payment
   * @param {string} paymentId - Payment ID
   * @returns {Object} Escrow hold result
   */
  async holdFunds(paymentId) {
    try {
      const payment = await Payment.findOne({ paymentId })
        .populate('auction')
        .populate('buyer')
        .populate('seller');

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found'
        };
      }

      if (payment.escrowStatus !== 'held') {
        payment.escrowStatus = 'held';
        await payment.save();

        // Create escrow hold transaction
        const transaction = new Transaction({
          transactionId: Transaction.generateTransactionId('escrow_hold'),
          type: 'escrow_hold',
          category: 'auction',
          user: payment.buyer._id,
          auction: payment.auction._id,
          payment: payment._id,
          amount: payment.amount,
          currency: payment.currency,
          exchangeRate: payment.exchangeRate,
          amountInUSD: payment.amountInUSD,
          balanceBefore: 0, // Will be updated by wallet service
          balanceAfter: 0,
          status: 'completed',
          description: `Funds held in escrow for auction ${payment.auction.title}`,
          metadata: {
            source: 'escrow_service',
            paymentId: payment.paymentId
          }
        });

        await transaction.save();

        return {
          success: true,
          message: 'Funds successfully held in escrow',
          escrowStatus: 'held'
        };
      }

      return {
        success: true,
        message: 'Funds already held in escrow',
        escrowStatus: payment.escrowStatus
      };
    } catch (error) {
      console.error('Failed to hold funds in escrow:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Release funds to seller
   * @param {string} paymentId - Payment ID
   * @param {string} reason - Release reason
   * @param {string} releasedBy - User ID who released the funds
   * @returns {Object} Release result
   */
  async releaseFundsToSeller(paymentId, reason = 'item_delivered', releasedBy = null) {
    try {
      const payment = await Payment.findOne({ paymentId })
        .populate('auction')
        .populate('buyer')
        .populate('seller');

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found'
        };
      }

      if (payment.escrowStatus !== 'held') {
        return {
          success: false,
          error: `Cannot release funds. Current escrow status: ${payment.escrowStatus}`
        };
      }

      // Check if payment is disputed
      if (payment.dispute.isDisputed && payment.dispute.disputeStatus === 'open') {
        return {
          success: false,
          error: 'Cannot release funds while payment is disputed'
        };
      }

      // Calculate net amount to seller (after fees)
      const fees = stripeService.calculateFees(payment.amount);
      const netAmountToSeller = payment.amount - fees.totalFees;

      // Update payment status
      payment.escrowStatus = 'released_to_seller';
      payment.escrowReleaseDate = new Date();
      payment.escrowReleaseReason = reason;
      await payment.save();

      // Create escrow release transaction
      const releaseTransaction = new Transaction({
        transactionId: Transaction.generateTransactionId('escrow_release'),
        type: 'escrow_release',
        category: 'auction',
        user: payment.seller._id,
        auction: payment.auction._id,
        payment: payment._id,
        amount: netAmountToSeller,
        currency: payment.currency,
        exchangeRate: payment.exchangeRate,
        amountInUSD: netAmountToSeller * payment.exchangeRate,
        balanceBefore: 0, // Will be updated by wallet service
        balanceAfter: 0,
        status: 'completed',
        fees: {
          processingFee: fees.paymentProcessingFee,
          platformFee: fees.platformFee,
          totalFees: fees.totalFees
        },
        description: `Escrow funds released to seller for auction ${payment.auction.title}`,
        metadata: {
          source: 'escrow_service',
          paymentId: payment.paymentId,
          releasedBy: releasedBy || 'system',
          reason
        }
      });

      await releaseTransaction.save();

      // Create payout transaction for fees
      const feeTransaction = new Transaction({
        transactionId: Transaction.generateTransactionId('fee'),
        type: 'fee',
        category: 'fee',
        user: payment.seller._id,
        auction: payment.auction._id,
        payment: payment._id,
        amount: fees.totalFees,
        currency: payment.currency,
        exchangeRate: payment.exchangeRate,
        amountInUSD: fees.totalFees * payment.exchangeRate,
        balanceBefore: 0,
        balanceAfter: 0,
        status: 'completed',
        description: `Platform fees for auction ${payment.auction.title}`,
        metadata: {
          source: 'escrow_service',
          paymentId: payment.paymentId,
          feeBreakdown: fees
        }
      });

      await feeTransaction.save();

      // If using Stripe, capture the payment
      if (payment.paymentMethod === 'stripe') {
        const captureResult = await stripeService.capturePayment(
          payment.gatewayTransactionId,
          payment.amount
        );

        if (!captureResult.success) {
          console.error('Failed to capture Stripe payment:', captureResult.error);
          // Note: Payment status is already updated, but capture failed
          // This should trigger an alert for manual intervention
        }
      }

      return {
        success: true,
        message: 'Funds successfully released to seller',
        netAmountToSeller,
        fees,
        escrowStatus: 'released_to_seller'
      };
    } catch (error) {
      console.error('Failed to release funds to seller:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Refund funds to buyer
   * @param {string} paymentId - Payment ID
   * @param {string} reason - Refund reason
   * @param {string} refundedBy - User ID who initiated the refund
   * @returns {Object} Refund result
   */
  async refundFundsToBuyer(paymentId, reason = 'buyer_request', refundedBy = null) {
    try {
      const payment = await Payment.findOne({ paymentId })
        .populate('auction')
        .populate('buyer')
        .populate('seller');

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found'
        };
      }

      if (payment.escrowStatus !== 'held') {
        return {
          success: false,
          error: `Cannot refund funds. Current escrow status: ${payment.escrowStatus}`
        };
      }

      // Update payment status
      payment.escrowStatus = 'refunded_to_buyer';
      payment.escrowReleaseDate = new Date();
      payment.escrowReleaseReason = reason;
      payment.refund.isRefunded = true;
      payment.refund.refundAmount = payment.amount;
      payment.refund.refundReason = reason;
      payment.refund.refundDate = new Date();
      await payment.save();

      // Create refund transaction
      const refundTransaction = new Transaction({
        transactionId: Transaction.generateTransactionId('refund'),
        type: 'refund',
        category: 'refund',
        user: payment.buyer._id,
        auction: payment.auction._id,
        payment: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        exchangeRate: payment.exchangeRate,
        amountInUSD: payment.amountInUSD,
        balanceBefore: 0, // Will be updated by wallet service
        balanceAfter: 0,
        status: 'completed',
        description: `Refund for auction ${payment.auction.title}`,
        metadata: {
          source: 'escrow_service',
          paymentId: payment.paymentId,
          refundedBy: refundedBy || 'system',
          reason
        }
      });

      await refundTransaction.save();

      // If using Stripe, cancel the payment intent or create a refund
      if (payment.paymentMethod === 'stripe') {
        let stripeResult;
        
        if (payment.status === 'completed') {
          // Create refund for captured payment
          stripeResult = await stripeService.createRefund(
            payment.gatewayTransactionId,
            payment.amount,
            reason
          );
        } else {
          // Cancel uncaptured payment intent
          stripeResult = await stripeService.cancelPaymentIntent(
            payment.gatewayTransactionId
          );
        }

        if (!stripeResult.success) {
          console.error('Failed to process Stripe refund:', stripeResult.error);
          // Note: Payment status is already updated, but Stripe refund failed
          // This should trigger an alert for manual intervention
        } else {
          payment.refund.refundTransactionId = stripeResult.refund?.id || stripeResult.paymentIntent?.id;
          await payment.save();
        }
      }

      return {
        success: true,
        message: 'Funds successfully refunded to buyer',
        refundAmount: payment.amount,
        escrowStatus: 'refunded_to_buyer'
      };
    } catch (error) {
      console.error('Failed to refund funds to buyer:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle item delivery confirmation
   * @param {string} paymentId - Payment ID
   * @param {Object} deliveryInfo - Delivery information
   * @returns {Object} Delivery confirmation result
   */
  async confirmDelivery(paymentId, deliveryInfo = {}) {
    try {
      const payment = await Payment.findOne({ paymentId });

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found'
        };
      }

      // Update shipping information
      if (deliveryInfo.trackingNumber) {
        payment.shipping.trackingNumber = deliveryInfo.trackingNumber;
      }
      if (deliveryInfo.carrier) {
        payment.shipping.carrier = deliveryInfo.carrier;
      }
      
      payment.shipping.deliveredDate = new Date();
      payment.shipping.deliveryStatus = 'delivered';
      await payment.save();

      // Schedule auto-release after specified days
      const autoReleaseDate = new Date();
      autoReleaseDate.setDate(autoReleaseDate.getDate() + this.AUTO_RELEASE_DAYS);

      // In a production environment, you would schedule this with a job queue
      // For now, we'll just log it
      console.log(`Auto-release scheduled for ${autoReleaseDate} for payment ${paymentId}`);

      return {
        success: true,
        message: 'Delivery confirmed. Auto-release scheduled.',
        autoReleaseDate
      };
    } catch (error) {
      console.error('Failed to confirm delivery:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process auto-release of funds
   * @param {string} paymentId - Payment ID
   * @returns {Object} Auto-release result
   */
  async processAutoRelease(paymentId) {
    try {
      const payment = await Payment.findOne({ paymentId });

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found'
        };
      }

      // Check if auto-release conditions are met
      if (payment.escrowStatus !== 'held') {
        return {
          success: false,
          error: 'Funds not held in escrow'
        };
      }

      if (payment.dispute.isDisputed) {
        return {
          success: false,
          error: 'Cannot auto-release disputed payment'
        };
      }

      const deliveryDate = payment.shipping.deliveredDate;
      if (!deliveryDate) {
        return {
          success: false,
          error: 'Item not marked as delivered'
        };
      }

      const daysSinceDelivery = Math.floor(
        (new Date() - deliveryDate) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceDelivery < this.AUTO_RELEASE_DAYS) {
        return {
          success: false,
          error: `Auto-release not due yet. ${this.AUTO_RELEASE_DAYS - daysSinceDelivery} days remaining.`
        };
      }

      // Release funds to seller
      return await this.releaseFundsToSeller(paymentId, 'auto_release', 'system');
    } catch (error) {
      console.error('Failed to process auto-release:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get escrow status for a payment
   * @param {string} paymentId - Payment ID
   * @returns {Object} Escrow status
   */
  async getEscrowStatus(paymentId) {
    try {
      const payment = await Payment.findOne({ paymentId })
        .populate('auction', 'title')
        .populate('buyer', 'username email')
        .populate('seller', 'username email');

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found'
        };
      }

      const escrowInfo = {
        paymentId: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency,
        escrowStatus: payment.escrowStatus,
        escrowReleaseDate: payment.escrowReleaseDate,
        escrowReleaseReason: payment.escrowReleaseReason,
        auction: payment.auction,
        buyer: payment.buyer,
        seller: payment.seller,
        shipping: payment.shipping,
        dispute: payment.dispute,
        canRelease: payment.canReleaseEscrow(),
        autoReleaseEligible: false
      };

      // Check if auto-release is eligible
      if (payment.shipping.deliveredDate && payment.escrowStatus === 'held') {
        const daysSinceDelivery = Math.floor(
          (new Date() - payment.shipping.deliveredDate) / (1000 * 60 * 60 * 24)
        );
        escrowInfo.autoReleaseEligible = daysSinceDelivery >= this.AUTO_RELEASE_DAYS;
        escrowInfo.daysUntilAutoRelease = Math.max(0, this.AUTO_RELEASE_DAYS - daysSinceDelivery);
      }

      return {
        success: true,
        escrowInfo
      };
    } catch (error) {
      console.error('Failed to get escrow status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all payments pending auto-release
   * @returns {Array} Payments pending auto-release
   */
  async getPendingAutoReleases() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.AUTO_RELEASE_DAYS);

      const payments = await Payment.find({
        escrowStatus: 'held',
        'shipping.deliveredDate': { $lte: cutoffDate },
        'dispute.isDisputed': false
      }).populate('auction', 'title')
        .populate('buyer', 'username email')
        .populate('seller', 'username email');

      return {
        success: true,
        payments
      };
    } catch (error) {
      console.error('Failed to get pending auto-releases:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process all pending auto-releases
   * @returns {Object} Batch processing result
   */
  async processPendingAutoReleases() {
    try {
      const pendingResult = await this.getPendingAutoReleases();
      
      if (!pendingResult.success) {
        return pendingResult;
      }

      const results = [];
      
      for (const payment of pendingResult.payments) {
        const releaseResult = await this.processAutoRelease(payment.paymentId);
        results.push({
          paymentId: payment.paymentId,
          result: releaseResult
        });
      }

      const successCount = results.filter(r => r.result.success).length;
      const failureCount = results.length - successCount;

      return {
        success: true,
        message: `Processed ${results.length} auto-releases. ${successCount} successful, ${failureCount} failed.`,
        results
      };
    } catch (error) {
      console.error('Failed to process pending auto-releases:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new EscrowService();