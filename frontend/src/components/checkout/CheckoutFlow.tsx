import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './CheckoutFlow.css';

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_demo');

interface CheckoutFlowProps {
  auction: {
    id: string;
    title: string;
    currentBid: number;
    currency: string;
    seller: {
      id: string;
      name: string;
    };
    images: string[];
  };
  onSuccess: (paymentResult: any) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

interface PaymentSummary {
  itemPrice: number;
  buyersPremium: number;
  platformFee: number;
  paymentProcessingFee: number;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
}

interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const CheckoutFlow: React.FC<CheckoutFlowProps> = ({ auction, onSuccess, onCancel, onError }) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutFlowContent 
        auction={auction}
        onSuccess={onSuccess}
        onCancel={onCancel}
        onError={onError}
      />
    </Elements>
  );
};

const CheckoutFlowContent: React.FC<CheckoutFlowProps> = ({ auction, onSuccess, onCancel, onError }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [step, setStep] = useState<'summary' | 'shipping' | 'payment' | 'processing' | 'success'>('summary');
  const [loading, setLoading] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  });
  const [selectedCurrency, setSelectedCurrency] = useState(auction.currency);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>([]);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);

  useEffect(() => {
    loadSupportedCurrencies();
    calculatePaymentSummary();
  }, [auction, selectedCurrency]);

  const loadSupportedCurrencies = async () => {
    try {
      const response = await fetch('/api/currencies/supported');
      const data = await response.json();
      
      if (data.success) {
        setSupportedCurrencies(data.data.currencies.map((c: any) => c.code));
        
        // Load exchange rates if currency is different from auction currency
        if (selectedCurrency !== auction.currency) {
          await loadExchangeRates();
        }
      }
    } catch (error) {
      console.error('Failed to load supported currencies:', error);
    }
  };

  const loadExchangeRates = async () => {
    try {
      const response = await fetch(`/api/currencies/rates?from=${auction.currency}&to=${selectedCurrency}`);
      const data = await response.json();
      
      if (data.success) {
        setExchangeRates(data.data.rates);
      }
    } catch (error) {
      console.error('Failed to load exchange rates:', error);
    }
  };

  const calculatePaymentSummary = async () => {
    try {
      const baseAmount = auction.currentBid;
      const convertedAmount = selectedCurrency !== auction.currency 
        ? baseAmount * (exchangeRates[selectedCurrency] || 1)
        : baseAmount;

      // Calculate fees (these would typically come from the backend)
      const buyersPremium = convertedAmount * 0.10; // 10% buyer's premium
      const platformFee = convertedAmount * 0.05; // 5% platform fee
      const paymentProcessingFee = (convertedAmount * 0.029) + 0.30; // Stripe fees
      const shippingCost = 15.00; // Fixed shipping cost for demo
      const taxAmount = (convertedAmount + buyersPremium) * 0.08; // 8% tax

      const totalAmount = convertedAmount + buyersPremium + platformFee + paymentProcessingFee + shippingCost + taxAmount;

      setPaymentSummary({
        itemPrice: convertedAmount,
        buyersPremium,
        platformFee,
        paymentProcessingFee,
        shippingCost,
        taxAmount,
        totalAmount,
        currency: selectedCurrency
      });
    } catch (error) {
      console.error('Failed to calculate payment summary:', error);
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    setSelectedCurrency(newCurrency);
    if (newCurrency !== auction.currency) {
      await loadExchangeRates();
    }
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateShippingAddress()) {
      setStep('payment');
    }
  };

  const validateShippingAddress = (): boolean => {
    const required = ['street', 'city', 'state', 'zipCode', 'country'];
    return required.every(field => shippingAddress[field as keyof ShippingAddress].trim() !== '');
  };

  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/api/payments/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          auctionId: auction.id,
          amount: paymentSummary?.totalAmount,
          currency: selectedCurrency,
          savePaymentMethod
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setPaymentIntent(data.data.paymentIntent);
        return data.data.paymentIntent;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw error;
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements || !paymentSummary) {
      return;
    }

    setLoading(true);
    setStep('processing');

    try {
      // Create payment intent
      const intent = await createPaymentIntent();
      
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Confirm payment
      const { error, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(intent.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            address: {
              line1: shippingAddress.street,
              city: shippingAddress.city,
              state: shippingAddress.state,
              postal_code: shippingAddress.zipCode,
              country: shippingAddress.country
            }
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (confirmedIntent?.status === 'succeeded') {
        // Confirm payment on backend
        await confirmPaymentOnBackend(confirmedIntent.id);
        setStep('success');
        onSuccess({
          paymentIntent: confirmedIntent,
          paymentSummary,
          shippingAddress
        });
      }
    } catch (error: any) {
      console.error('Payment failed:', error);
      onError(error.message || 'Payment failed');
      setStep('payment');
    } finally {
      setLoading(false);
    }
  };

  const confirmPaymentOnBackend = async (paymentIntentId: string) => {
    try {
      const response = await fetch(`/api/payments/${paymentIntent.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          paymentIntentId,
          shippingAddress
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Failed to confirm payment on backend:', error);
      throw error;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const renderSummaryStep = () => (
    <div className="checkout-step summary-step">
      <h2>Order Summary</h2>
      
      <div className="auction-details">
        <div className="auction-image">
          <img src={auction.images[0]} alt={auction.title} />
        </div>
        <div className="auction-info">
          <h3>{auction.title}</h3>
          <p>Seller: {auction.seller.name}</p>
          <p>Winning Bid: {formatCurrency(auction.currentBid, auction.currency)}</p>
        </div>
      </div>

      <div className="currency-selector">
        <label htmlFor="currency">Payment Currency:</label>
        <select 
          id="currency" 
          value={selectedCurrency} 
          onChange={(e) => handleCurrencyChange(e.target.value)}
        >
          {supportedCurrencies.map(currency => (
            <option key={currency} value={currency}>{currency}</option>
          ))}
        </select>
      </div>

      {paymentSummary && (
        <div className="payment-breakdown">
          <div className="breakdown-item">
            <span>Item Price:</span>
            <span>{formatCurrency(paymentSummary.itemPrice, selectedCurrency)}</span>
          </div>
          <div className="breakdown-item">
            <span>Buyer's Premium (10%):</span>
            <span>{formatCurrency(paymentSummary.buyersPremium, selectedCurrency)}</span>
          </div>
          <div className="breakdown-item">
            <span>Platform Fee (5%):</span>
            <span>{formatCurrency(paymentSummary.platformFee, selectedCurrency)}</span>
          </div>
          <div className="breakdown-item">
            <span>Payment Processing:</span>
            <span>{formatCurrency(paymentSummary.paymentProcessingFee, selectedCurrency)}</span>
          </div>
          <div className="breakdown-item">
            <span>Shipping:</span>
            <span>{formatCurrency(paymentSummary.shippingCost, selectedCurrency)}</span>
          </div>
          <div className="breakdown-item">
            <span>Tax (8%):</span>
            <span>{formatCurrency(paymentSummary.taxAmount, selectedCurrency)}</span>
          </div>
          <div className="breakdown-item total">
            <span>Total:</span>
            <span>{formatCurrency(paymentSummary.totalAmount, selectedCurrency)}</span>
          </div>
        </div>
      )}

      <div className="step-actions">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={() => setStep('shipping')} className="btn-primary">Continue to Shipping</button>
      </div>
    </div>
  );

  const renderShippingStep = () => (
    <div className="checkout-step shipping-step">
      <h2>Shipping Address</h2>
      
      <form onSubmit={handleShippingSubmit}>
        <div className="form-group">
          <label htmlFor="street">Street Address</label>
          <input
            type="text"
            id="street"
            value={shippingAddress.street}
            onChange={(e) => setShippingAddress({...shippingAddress, street: e.target.value})}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="city">City</label>
            <input
              type="text"
              id="city"
              value={shippingAddress.city}
              onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="state">State</label>
            <input
              type="text"
              id="state"
              value={shippingAddress.state}
              onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="zipCode">ZIP Code</label>
            <input
              type="text"
              id="zipCode"
              value={shippingAddress.zipCode}
              onChange={(e) => setShippingAddress({...shippingAddress, zipCode: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="country">Country</label>
            <select
              id="country"
              value={shippingAddress.country}
              onChange={(e) => setShippingAddress({...shippingAddress, country: e.target.value})}
              required
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="JP">Japan</option>
              <option value="IN">India</option>
            </select>
          </div>
        </div>

        <div className="step-actions">
          <button type="button" onClick={() => setStep('summary')} className="btn-secondary">Back</button>
          <button type="submit" className="btn-primary">Continue to Payment</button>
        </div>
      </form>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="checkout-step payment-step">
      <h2>Payment Information</h2>
      
      <div className="payment-summary-mini">
        <p>Total: {paymentSummary && formatCurrency(paymentSummary.totalAmount, selectedCurrency)}</p>
      </div>

      <form onSubmit={handlePaymentSubmit}>
        <div className="card-element-container">
          <label>Card Details</label>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={savePaymentMethod}
              onChange={(e) => setSavePaymentMethod(e.target.checked)}
            />
            Save payment method for future purchases
          </label>
        </div>

        <div className="step-actions">
          <button type="button" onClick={() => setStep('shipping')} className="btn-secondary" disabled={loading}>
            Back
          </button>
          <button type="submit" className="btn-primary" disabled={!stripe || loading}>
            {loading ? 'Processing...' : `Pay ${paymentSummary && formatCurrency(paymentSummary.totalAmount, selectedCurrency)}`}
          </button>
        </div>
      </form>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="checkout-step processing-step">
      <div className="processing-animation">
        <div className="spinner"></div>
      </div>
      <h2>Processing Payment</h2>
      <p>Please wait while we process your payment. Do not close this window.</p>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="checkout-step success-step">
      <div className="success-icon">✓</div>
      <h2>Payment Successful!</h2>
      <p>Your payment has been processed successfully. You will receive a confirmation email shortly.</p>
      
      <div className="order-details">
        <h3>Order Details</h3>
        <p><strong>Item:</strong> {auction.title}</p>
        <p><strong>Amount Paid:</strong> {paymentSummary && formatCurrency(paymentSummary.totalAmount, selectedCurrency)}</p>
        <p><strong>Payment Method:</strong> Card ending in ****</p>
        <p><strong>Shipping Address:</strong> {shippingAddress.street}, {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}</p>
      </div>

      <div className="step-actions">
        <button onClick={() => window.location.href = '/dashboard'} className="btn-primary">
          Go to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="checkout-flow">
      <div className="checkout-header">
        <div className="progress-bar">
          <div className={`progress-step ${step === 'summary' ? 'active' : 'completed'}`}>
            <span>1</span>
            <label>Summary</label>
          </div>
          <div className={`progress-step ${step === 'shipping' ? 'active' : ['payment', 'processing', 'success'].includes(step) ? 'completed' : ''}`}>
            <span>2</span>
            <label>Shipping</label>
          </div>
          <div className={`progress-step ${step === 'payment' ? 'active' : ['processing', 'success'].includes(step) ? 'completed' : ''}`}>
            <span>3</span>
            <label>Payment</label>
          </div>
          <div className={`progress-step ${['processing', 'success'].includes(step) ? 'active' : ''}`}>
            <span>4</span>
            <label>Complete</label>
          </div>
        </div>
      </div>

      <div className="checkout-content">
        {step === 'summary' && renderSummaryStep()}
        {step === 'shipping' && renderShippingStep()}
        {step === 'payment' && renderPaymentStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'success' && renderSuccessStep()}
      </div>
    </div>
  );
};

export default CheckoutFlow;