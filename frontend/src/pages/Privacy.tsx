import React from 'react';

const Privacy: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-2">Overview</h2>
          <p>We collect account information to facilitate registration, verification, compliance, bidding, and payments. We do not sell personal data.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">Information</h2>
          <p>Information includes name, contact details, address, payment references, and transaction data related to auctions.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">Security</h2>
          <p>We use industry practices to protect your data. Do not share your login credentials. Deposits and payments must use the exact reference provided.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">Your Choices</h2>
          <p>You can update your profile, request deposit refunds, and access your invoices from the platform.</p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;