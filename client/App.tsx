import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import AppLayout from './layouts/AppLayout';
import PublicLayout from './layouts/PublicLayout';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import HowItWorksPage from './pages/HowItWorksPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import TermsPage from './pages/TermsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AuctionDetailPage from './pages/AuctionDetailPage';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CreateListingPage from './pages/CreateListingPage';
import ProfilePage from './pages/ProfilePage';
import ListingDetailPage from './pages/ListingDetailPage';
import AuctionsPage from './pages/AuctionsPage';
import VerifyEmailPage from './pages/VerifyEmailPage'; // <--- Import belongs here at the top!

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} /> {/* <--- Route added correctly here */}
          <Route path="/browse" element={<HomePage />} />
          <Route path="/auctions" element={<AuctionsPage />} />
          <Route path="/listing/:id" element={<ListingDetailPage />} />
          <Route path="/sell" element={<CreateListingPage />} />
          <Route path="/sell/:id" element={<CreateListingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route element={<AppLayout user={user} />}>
          {/* Protected Routes */}
          <Route path="/auction/:id" element={<AuctionDetailPage />} />
          <Route path="/dashboard" element={<SellerDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;