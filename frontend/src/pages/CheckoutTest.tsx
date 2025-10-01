import React, { useState } from 'react';
import CheckoutFlow from '../components/checkout/CheckoutFlow';
import PaymentStatus from '../components/checkout/PaymentStatus';
import PaymentNotifications from '../components/checkout/PaymentNotifications';
import './CheckoutTest.css';

const CheckoutTest: React.FC = () => {
  const [currentView, setCurrentView] = useState<'demo' | 'checkout' | 'status'>('demo');
  const [testPaymentId, setTestPaymentId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(true);

  // Sample auction data for testing
  const sampleAuction = {
    id: 'auction_test_123',
    title: 'Vintage Rolex Submariner Watch',
    currentBid: 15000,
    currency: 'USD',
    seller: {
      id: 'seller_456',
      name: 'Premium Timepieces'
    },
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
      'https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=400'
    ]
  };

  const handleCheckoutSuccess = (paymentResult: any) => {
    console.log('Checkout successful:', paymentResult);
    setTestPaymentId(paymentResult.paymentIntent.id);
    setCurrentView('status');
    
    // Show success message
    alert('Payment successful! Redirecting to payment status...');
  };

  const handleCheckoutCancel = () => {
    console.log('Checkout cancelled');
    setCurrentView('demo');
  };

  const handleCheckoutError = (error: string) => {
    console.error('Checkout error:', error);
    alert(`Checkout error: ${error}`);
  };

  const handlePaymentStatusChange = (status: string) => {
    console.log('Payment status changed:', status);
  };

  const handleNotificationClick = (notification: any) => {
    console.log('Notification clicked:', notification);
    if (notification.paymentId) {
      setTestPaymentId(notification.paymentId);
      setCurrentView('status');
    }
  };

  const renderDemoView = () => (
    <div className="checkout-test-demo">
      <div className="demo-header">
        <h1>Payment System Demo</h1>
        <p>Test the complete checkout flow with sample auction data</p>
      </div>

      <div className="demo-controls">
        <div className="control-group">
          <h3>Test Components</h3>
          <div className="control-buttons">
            <button 
              onClick={() => setCurrentView('checkout')} 
              className="btn-primary"
            >
              🛒 Test Checkout Flow
            </button>
            <button 
              onClick={() => setCurrentView('status')} 
              className="btn-secondary"
              disabled={!testPaymentId}
            >
              📊 View Payment Status
            </button>
            <button 
              onClick={() => setShowNotifications(!showNotifications)} 
              className="btn-secondary"
            >
              🔔 {showNotifications ? 'Hide' : 'Show'} Notifications
            </button>
          </div>
        </div>

        <div className="control-group">
          <h3>Sample Auction</h3>
          <div className="auction-preview">
            <img src={sampleAuction.images[0]} alt={sampleAuction.title} />
            <div className="auction-details">
              <h4>{sampleAuction.title}</h4>
              <p>Current Bid: ${sampleAuction.currentBid.toLocaleString()}</p>
              <p>Seller: {sampleAuction.seller.name}</p>
              <p>Currency: {sampleAuction.currency}</p>
            </div>
          </div>
        </div>

        <div className="control-group">
          <h3>Test Scenarios</h3>
          <div className="test-scenarios">
            <div className="scenario">
              <h4>💳 Successful Payment</h4>
              <p>Use test card: 4242 4242 4242 4242</p>
              <p>Any future expiry date and CVC</p>
            </div>
            <div className="scenario">
              <h4>❌ Declined Payment</h4>
              <p>Use test card: 4000 0000 0000 0002</p>
              <p>Any future expiry date and CVC</p>
            </div>
            <div className="scenario">
              <h4>⚠️ Insufficient Funds</h4>
              <p>Use test card: 4000 0000 0000 9995</p>
              <p>Any future expiry date and CVC</p>
            </div>
          </div>
        </div>

        <div className="control-group">
          <h3>API Endpoints</h3>
          <div className="api-endpoints">
            <div className="endpoint">
              <code>POST /api/payments/intent</code>
              <span>Create payment intent</span>
            </div>
            <div className="endpoint">
              <code>POST /api/payments/:id/confirm</code>
              <span>Confirm payment</span>
            </div>
            <div className="endpoint">
              <code>GET /api/payments/:id</code>
              <span>Get payment details</span>
            </div>
            <div className="endpoint">
              <code>GET /api/currencies/supported</code>
              <span>Get supported currencies</span>
            </div>
            <div className="endpoint">
              <code>GET /api/currencies/rates</code>
              <span>Get exchange rates</span>
            </div>
          </div>
        </div>
      </div>

      <div className="demo-footer">
        <p>
          <strong>Note:</strong> This is a test environment. No real payments will be processed.
          Use the test card numbers provided above to simulate different payment scenarios.
        </p>
      </div>
    </div>
  );

  const renderCheckoutView = () => (
    <div className="checkout-test-flow">
      <div className="flow-header">
        <button onClick={() => setCurrentView('demo')} className="back-btn">
          ← Back to Demo
        </button>
        <h2>Checkout Flow Test</h2>
      </div>
      
      <CheckoutFlow
        auction={sampleAuction}
        onSuccess={handleCheckoutSuccess}
        onCancel={handleCheckoutCancel}
        onError={handleCheckoutError}
      />
    </div>
  );

  const renderStatusView = () => (
    <div className="checkout-test-status">
      <div className="status-header">
        <button onClick={() => setCurrentView('demo')} className="back-btn">
          ← Back to Demo
        </button>
        <h2>Payment Status Test</h2>
      </div>
      
      {testPaymentId ? (
        <PaymentStatus
          paymentId={testPaymentId}
          onStatusChange={handlePaymentStatusChange}
        />
      ) : (
        <div className="no-payment">
          <p>No payment to display. Complete a checkout flow first.</p>
          <button onClick={() => setCurrentView('checkout')} className="btn-primary">
            Start Checkout
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="checkout-test">
      {currentView === 'demo' && renderDemoView()}
      {currentView === 'checkout' && renderCheckoutView()}
      {currentView === 'status' && renderStatusView()}
      
      {showNotifications && (
        <PaymentNotifications
          userId="test_user_123"
          onNotificationClick={handleNotificationClick}
          maxNotifications={5}
        />
      )}
    </div>
  );
};

export default CheckoutTest;