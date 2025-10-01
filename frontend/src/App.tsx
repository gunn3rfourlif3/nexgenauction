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
import AdminCreateAuction from './pages/AdminCreateAuction';
import CreateAuction from './pages/CreateAuction';
import CheckoutTest from './pages/CheckoutTest';

// Import context
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auctions" element={<AuctionCatalog />} />
              <Route path="/auctions/:id" element={<AuctionDetailPage />} />
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
              <Route path="/admin/create-auction" element={<AdminCreateAuction />} />
              <Route path="/checkout-test" element={<CheckoutTest />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  </NotificationProvider>
  );
}

export default App;
