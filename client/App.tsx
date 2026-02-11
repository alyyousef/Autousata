import React, { useEffect, useLayoutEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { StripeProvider } from './contexts/StripeContext';

import AppLayout from './layouts/AppLayout';
import PublicLayout from './layouts/PublicLayout';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import HowItWorksPage from './pages/HowItWorksPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import TermsPage from './pages/TermsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CreateListingPage from './pages/CreateListingPage';
import ProfilePage from './pages/ProfilePage';
import ListingDetailPage from './pages/ListingDetailPage';
import AuctionsPage from './pages/AuctionsPage';
import PaymentPage from './pages/PaymentPage';
import PaymentConfirmationPage from './pages/PaymentConfirmationPage';
import VerifyEmailPage from './pages/VerifyEmailPage'; // <--- Import belongs here at the top!

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    const raf = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    });
    return () => window.cancelAnimationFrame(raf);
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
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/payment/:id" element={<PaymentPage />} />
          <Route path="/payment/:id/confirmation" element={<PaymentConfirmationPage />} />
        </Route>

        <Route element={<AppLayout user={user} />}>
          {/* Protected Routes */}
          <Route path="/auction/:id" element={<ListingDetailPage />} />
          <Route path="/dashboard" element={<SellerDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    const root = document.documentElement;
    const storedTheme = window.localStorage.getItem('theme');
    if (storedTheme === 'dark') {
      root.classList.add('theme-dark');
      return;
    }
    if (storedTheme === 'light') {
      root.classList.remove('theme-dark');
    }
  }, []);

  return (
    <StripeProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </StripeProvider>
  );
};

export default App;
