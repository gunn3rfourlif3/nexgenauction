import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Import components
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import AuctionCatalog from './pages/AuctionCatalog';
import AuctionDetailPage from './pages/AuctionDetailPage';
import Watchlist from './pages/Watchlist';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import LiveBidding from './components/LiveBidding';
import AdminSystemSettings from './pages/AdminSystemSettings';
import Support from './pages/Support';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import FAQ from './pages/FAQ';
import CreateAuction from './pages/CreateAuction';
import EditAuction from './pages/EditAuction';
import CheckoutTest from './pages/CheckoutTest';
import ChatAssistant from './components/ChatAssistant';

// Import context
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { CurrencyProvider } from './contexts/CurrencyContext';

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <CurrencyProvider>
        <Router>
        <div className="min-h-screen bg-white text-black flex flex-col">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auctions" element={<AuctionCatalog />} />
  <Route path="/auctions/:id" element={<AuctionDetailPage />} />
              <Route path="/auctions/:id/edit" element={<EditAuction />} />
              <Route path="/admin/auctions/:id/edit" element={<EditAuction />} />
              <Route path="/auctions/:id/bid" element={<LiveBidding />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/profile" element={<Profile />} />
        <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/create-auction" element={<CreateAuction />} />
              <Route path="/admin/system" element={<AdminSystemSettings />} />
              <Route path="/support" element={<Support />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/checkout-test" element={<CheckoutTest />} />
            </Routes>
          </main>
          <Footer />
          <ChatAssistant />
        </div>
      </Router>
        </CurrencyProvider>
    </AuthProvider>
  </NotificationProvider>
  );
}

export default App;
