// Initialize Stripe client with development-safe guard
let stripe;
const isDev = process.env.NODE_ENV === 'development';
const skipDb = process.env.FORCE_DB_CONNECTION === 'false';
const stripeKey = process.env.STRIPE_SECRET_KEY;

if (stripeKey) {
  stripe = require('stripe')(stripeKey);
} else {
  // In development without Stripe key, provide a mock client to prevent startup failure
  if (isDev) {
    console.warn('Stripe: STRIPE_SECRET_KEY not set. Using mock Stripe client in development.');
    const makeMockIntent = (overrides = {}) => ({
      id: 'pi_mock_' + Date.now(),
      client_secret: 'cs_mock_' + Date.now(),
      status: 'requires_confirmation',
      ...overrides
    });
    stripe = {
      paymentIntents: {
        create: async () => makeMockIntent(),
        confirm: async (id) => makeMockIntent({ id, status: 'requires_capture' }),
        capture: async (id, params) => makeMockIntent({ id, status: 'succeeded', captured_amount: params?.amount_to_capture ?? undefined }),
        cancel: async (id) => makeMockIntent({ id, status: 'canceled' }),
        retrieve: async (id) => makeMockIntent({ id })
      },
      refunds: {
        create: async (params) => ({ id: 're_mock_' + Date.now(), status: 'succeeded', ...params })
      },
      payouts: {
        create: async (params) => ({ id: 'po_mock_' + Date.now(), status: 'paid', arrival_date: Math.floor(Date.now()/1000) + 86400, ...params })
      },
      webhooks: {
        constructEvent: (payload, signature, webhookSecret) => ({
          id: 'evt_mock_' + Date.now(),
          type: 'payment_intent.succeeded',
          data: { object: makeMockIntent({ status: 'succeeded' }) }
        })
      }
    };
  } else {
    throw new Error('Stripe configuration error: STRIPE_SECRET_KEY is not set');
  }
}
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

class StripeService {
  constructor() {
    this.stripe = stripe;
  }

  /**
   * Create a payment intent for auction payment
   * @param {Object} params - Payment parameters
   * @returns {Object} Payment intent
   */
  async createPaymentIntent({
    amount,
    currency = 'usd',
    auctionId,
    buyerId,
    sellerId,
    description,
    metadata = {}
  }) {
    try {
      // Convert amount to cents for Stripe
      const amountInCents = Math.round(amount * 100);
      
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        description,
        metadata: {
          auctionId,
          buyerId,
          sellerId,
          ...metadata
        },
        capture_method: 'manual', // Hold funds in escrow
        confirmation_method: 'manual',
        confirm: false
      });

      return {
        success: true,
        paymentIntent,
        clientSecret: paymentIntent.client_secret
      };
    } catch (error) {
      console.error('Stripe payment intent creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Confirm a payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @param {string} paymentMethodId - Payment method ID
   * @returns {Object} Confirmation result
   */
  async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId
      });

      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      console.error('Stripe payment confirmation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Capture payment from escrow (release to seller)
   * @param {string} paymentIntentId - Payment intent ID
   * @param {number} amountToCapture - Amount to capture (optional)
   * @returns {Object} Capture result
   */
  async capturePayment(paymentIntentId, amountToCapture = null) {
    try {
      const captureParams = {};
      if (amountToCapture) {
        captureParams.amount_to_capture = Math.round(amountToCapture * 100);
      }

      const paymentIntent = await this.stripe.paymentIntents.capture(
        paymentIntentId,
        captureParams
      );

      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      console.error('Stripe payment capture failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cancel payment intent (refund to buyer)
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Object} Cancellation result
   */
  async cancelPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);

      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      console.error('Stripe payment cancellation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a refund
   * @param {string} paymentIntentId - Payment intent ID
   * @param {number} amount - Refund amount
   * @param {string} reason - Refund reason
   * @returns {Object} Refund result
   */
  async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      const refundParams = {
        payment_intent: paymentIntentId,
        reason
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 100);
      }

      const refund = await this.stripe.refunds.create(refundParams);

      return {
        success: true,
        refund
      };
    } catch (error) {
      console.error('Stripe refund creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a payout to seller
   * @param {Object} params - Payout parameters
   * @returns {Object} Payout result
   */
  async createPayout({
    amount,
    currency = 'usd',
    destination,
    description,
    metadata = {}
  }) {
    try {
      const amountInCents = Math.round(amount * 100);

      const payout = await this.stripe.payouts.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        destination,
        description,
        metadata
      });

      return {
        success: true,
        payout
      };
    } catch (error) {
      console.error('Stripe payout creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get payment intent details
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Object} Payment intent details
   */
  async getPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      console.error('Failed to retrieve payment intent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle Stripe webhook events
   * @param {Object} event - Stripe webhook event
   * @returns {Object} Processing result
   */
  async handleWebhookEvent(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          return await this.handlePaymentSucceeded(event.data.object);
        
        case 'payment_intent.payment_failed':
          return await this.handlePaymentFailed(event.data.object);
        
        case 'payment_intent.canceled':
          return await this.handlePaymentCanceled(event.data.object);
        
        case 'charge.dispute.created':
          return await this.handleDisputeCreated(event.data.object);
        
        case 'payout.paid':
          return await this.handlePayoutPaid(event.data.object);
        
        case 'payout.failed':
          return await this.handlePayoutFailed(event.data.object);
        
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
          return { success: true, message: 'Event type not handled' };
      }
    } catch (error) {
      console.error('Webhook event processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle successful payment
   * @param {Object} paymentIntent - Stripe payment intent object
   */
  async handlePaymentSucceeded(paymentIntent) {
    try {
      const payment = await Payment.findOne({
        gatewayTransactionId: paymentIntent.id
      });

      if (payment) {
        payment.status = 'completed';
        payment.escrowStatus = 'held';
        await payment.save();

        // Create transaction record
        await this.createTransactionRecord({
          type: 'payment',
          payment,
          gatewayResponse: paymentIntent
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to handle payment succeeded:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle failed payment
   * @param {Object} paymentIntent - Stripe payment intent object
   */
  async handlePaymentFailed(paymentIntent) {
    try {
      const payment = await Payment.findOne({
        gatewayTransactionId: paymentIntent.id
      });

      if (payment) {
        payment.status = 'failed';
        await payment.save();
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to handle payment failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle canceled payment
   * @param {Object} paymentIntent - Stripe payment intent object
   */
  async handlePaymentCanceled(paymentIntent) {
    try {
      const payment = await Payment.findOne({
        gatewayTransactionId: paymentIntent.id
      });

      if (payment) {
        payment.status = 'cancelled';
        payment.escrowStatus = 'refunded_to_buyer';
        await payment.save();
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to handle payment canceled:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle dispute created
   * @param {Object} dispute - Stripe dispute object
   */
  async handleDisputeCreated(dispute) {
    try {
      const payment = await Payment.findOne({
        gatewayTransactionId: dispute.payment_intent
      });

      if (payment) {
        payment.dispute.isDisputed = true;
        payment.dispute.disputeReason = dispute.reason;
        payment.dispute.disputeDate = new Date(dispute.created * 1000);
        payment.dispute.disputeStatus = 'open';
        payment.escrowStatus = 'disputed';
        await payment.save();
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to handle dispute created:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle successful payout
   * @param {Object} payout - Stripe payout object
   */
  async handlePayoutPaid(payout) {
    try {
      // Update related payment records
      const payments = await Payment.find({
        'metadata.payoutId': payout.id
      });

      for (const payment of payments) {
        payment.escrowStatus = 'released_to_seller';
        payment.escrowReleaseDate = new Date(payout.arrival_date * 1000);
        payment.escrowReleaseReason = 'auto_release';
        await payment.save();
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to handle payout paid:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle failed payout
   * @param {Object} payout - Stripe payout object
   */
  async handlePayoutFailed(payout) {
    try {
      // Handle failed payout logic
      console.error('Payout failed:', payout);
      return { success: true };
    } catch (error) {
      console.error('Failed to handle payout failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create transaction record
   * @param {Object} params - Transaction parameters
   */
  async createTransactionRecord({
    type,
    payment,
    gatewayResponse,
    amount = null,
    description = null
  }) {
    try {
      const transactionData = {
        transactionId: Transaction.generateTransactionId(type),
        type,
        category: 'auction',
        user: payment.buyer,
        auction: payment.auction,
        payment: payment._id,
        amount: amount || payment.amount,
        currency: payment.currency,
        exchangeRate: payment.exchangeRate,
        amountInUSD: amount ? amount * payment.exchangeRate : payment.amountInUSD,
        balanceBefore: 0, // Will be updated by wallet service
        balanceAfter: 0,  // Will be updated by wallet service
        status: 'completed',
        paymentMethod: payment.paymentMethod,
        gatewayTransactionId: payment.gatewayTransactionId,
        gatewayResponse,
        description: description || `${type} for auction ${payment.auction}`,
        metadata: {
          source: 'stripe_webhook',
          paymentId: payment.paymentId
        }
      };

      const transaction = new Transaction(transactionData);
      await transaction.save();

      return transaction;
    } catch (error) {
      console.error('Failed to create transaction record:', error);
      throw error;
    }
  }

  /**
   * Calculate platform fees
   * @param {number} amount - Transaction amount
   * @param {string} type - Transaction type
   * @returns {Object} Fee breakdown
   */
  calculateFees(amount, type = 'payment') {
    const STRIPE_FEE_PERCENTAGE = 0.029; // 2.9%
    const STRIPE_FIXED_FEE = 0.30; // $0.30
    const PLATFORM_FEE_PERCENTAGE = 0.05; // 5%
    const BUYERS_PREMIUM_PERCENTAGE = 0.10; // 10%

    const stripeProcessingFee = (amount * STRIPE_FEE_PERCENTAGE) + STRIPE_FIXED_FEE;
    const platformFee = amount * PLATFORM_FEE_PERCENTAGE;
    const buyersPremium = type === 'payment' ? amount * BUYERS_PREMIUM_PERCENTAGE : 0;

    return {
      paymentProcessingFee: Math.round(stripeProcessingFee * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      buyersPremium: Math.round(buyersPremium * 100) / 100,
      totalFees: Math.round((stripeProcessingFee + platformFee + buyersPremium) * 100) / 100
    };
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {Object} Verification result
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      return {
        success: true,
        event
      };
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new StripeService();