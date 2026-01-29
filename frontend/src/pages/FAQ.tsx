import React from 'react';
import { Link } from 'react-router-dom';

const FAQ: React.FC = () => {
  const qa = [
    {
      q: 'How do I start bidding?',
      a: 'Register, verify your email, update your account details, register participation for the auction (if required), then place bids when the auction is active.'
    },
    {
      q: 'Do I need a deposit?',
      a: 'Some auctions require a refundable deposit. Bank details and your unique payment reference are shown under the auction Bank Details page.'
    },
    {
      q: 'What fees apply?',
      a: 'Buyer’s commission, VAT, and STC are specified per lot. If VAT/STC are not specified for a lot, they do not apply.'
    },
    {
      q: 'Where can I see my registrations and refunds?',
      a: 'Navigate to the auction page or your dashboard and open the registrations panel to view deposit status and request refunds.'
    },
    {
      q: 'Why do I see “Preparing Lots…”?',
      a: 'It indicates the catalog is being prepared. You can still register participation and return later to browse available lots.'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Frequently Asked Questions</h1>
      <div className="space-y-6">
        {qa.map((item, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-1">{item.q}</h2>
            <p className="text-gray-700">{item.a}</p>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Link to="/support" className="text-blue-600">Go to Help Center</Link>
      </div>
    </div>
  );
};

export default FAQ;