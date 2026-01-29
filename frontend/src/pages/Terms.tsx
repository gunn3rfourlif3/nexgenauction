import React from 'react';

const Terms: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-2">Per-Lot Applicability</h2>
          <p>The Buyer's Commission, VAT, and STC are specified for each lot. Charges apply only if specified for the lot.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">Bidding</h2>
          <p>Bidders must have a verified account and, where required, a registered participation for the auction. Bids are binding. Minimum increments apply as indicated on each lot.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">Deposits</h2>
          <p>Some auctions require a refundable registration deposit. Deposits must include the exact payment reference. Refunds are processed after the auction subject to settlement and compliance checks.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">Payments</h2>
          <p>Invoices include item price, applicable commission, VAT, STC, shipping and other fees. Payment methods and settlement timelines are communicated per auction.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">Account</h2>
          <p>Users must maintain accurate profile information. The platform may restrict bidding for incomplete accounts or unverified emails.</p>
        </section>
      </div>
    </div>
  );
};

export default Terms;