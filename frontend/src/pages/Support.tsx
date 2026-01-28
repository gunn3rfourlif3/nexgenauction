import React from 'react';
import { Link } from 'react-router-dom';

const Support: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Help Center</h1>
      <p className="text-gray-700 mb-6">Your quick guide to using Nexus Auctions.</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-2">Getting Started</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Register your account with your name, surname, email and password. <Link to="/register" className="text-blue-600">Register Now</Link></li>
            <li>Verify your email to activate your account. You can resend verification from your profile if needed.</li>
            <li>Update your account details once-off with phone and address for compliance.</li>
            <li>Browse auctions and start bidding when the auction is active.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Register Your Participation</h2>
          <p className="text-gray-700">Please remember to register your participation in each auction before bidding. Registration may require a refundable deposit depending on the auction settings.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Deposits</h2>
          <p className="text-gray-700 mb-2">For auctions requiring a refundable deposit, bank details and the unique payment reference are available under the auction’s Bank Details page.</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Use the exact payment reference provided in the auction to ensure automated matching.</li>
            <li>Upload your deposit receipt in your registration panel for faster verification.</li>
            <li>Refunds can be requested after the auction from your registration panel.</li>
          </ul>
          <div className="mt-2"><Link to="/auctions" className="text-blue-600">Find an auction</Link></div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Fees and Taxes</h2>
          <p className="text-gray-700">The Buyer's Commission, VAT (if applicable), and STC (if applicable) are specified per Lot. You will not be charged VAT if it is not specified for the specific lot.</p>
          <p className="text-gray-700">Bid calculation example: Your Bid (+VAT if applicable) + Buyer's Commission (e.g. 10%) (+VAT if applicable) [and STC if applicable].</p>
          <div className="mt-2"><Link to="/admin/fees" className="text-blue-600">Admin: configure default fees</Link></div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Preparing Lots</h2>
          <p className="text-gray-700">When an auction is being prepared and no lots are available yet, you may see a Preparing Lots status. You can still register your participation and return later to browse lots.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Support</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li><Link to="/faq" className="text-blue-600">FAQ</Link></li>
            <li><Link to="/contact" className="text-blue-600">Contact Support</Link></li>
            <li><Link to="/terms" className="text-blue-600">Terms of Service</Link></li>
            <li><Link to="/privacy" className="text-blue-600">Privacy Policy</Link></li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default Support;