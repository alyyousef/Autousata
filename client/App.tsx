import React, { useEffect, useLayoutEffect } from "react";
import {
  HashRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { StripeProvider } from "./contexts/StripeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { UserRole } from "./types";

import ResetPasswordPage from "./pages/ResetPasswordPage";
import AppLayout from "./layouts/AppLayout";
import PublicLayout from "./layouts/PublicLayout";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import PressNewsPage from "./pages/PressNewsPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import TermsPage from "./pages/TermsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import SellerDashboard from "./pages/SellerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsersPage from "./pages/AdminUsersPage";
import CreateListingPage from "./pages/CreateListingPage";
import ProfilePage from "./pages/ProfilePage";
import ListingDetailPage from "./pages/ListingDetailPage";
import AuctionDetailPage from "./pages/AuctionDetailPage";
import AuctionsPage from "./pages/AuctionsPage";
import PaymentPage from "./pages/PaymentPage";
import PaymentConfirmationPage from "./pages/PaymentConfirmationPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import AdminUserProfilePage from "./pages/AdminUserProfilePage";
import AdminRevenueDashboard from "./pages/AdminRevenueDashboard";
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    const raf = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant" as ScrollBehavior,
      });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
};

const RequireAdmin: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== UserRole.ADMIN) return <Navigate to="/browse" replace />;
  return children;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <>
      <ScrollToTop />

      <Routes>
        {/* ===================== PUBLIC ===================== */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/press" element={<PressNewsPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/browse" element={<HomePage />} />
          <Route path="/auctions" element={<AuctionsPage />} />
          <Route path="/listing/:id" element={<ListingDetailPage />} />
          <Route path="/sell" element={<CreateListingPage />} />
          <Route path="/sell/:id" element={<CreateListingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/payment/:id" element={<PaymentPage />} />
          <Route
            path="/payment/:id/confirmation"
            element={<PaymentConfirmationPage />}
          />
        </Route>

        {/* ===================== PROTECTED (Layout) ===================== */}
        <Route element={<AppLayout user={user} />}>
          <Route path="/auction/:id" element={<AuctionDetailPage />} />
          <Route path="/dashboard" element={<SellerDashboard />} />

          {/* ---------- ADMIN PROTECTED ---------- */}
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />

          <Route
            path="/admin/users"
            element={
              <RequireAdmin>
                <AdminUsersPage />
              </RequireAdmin>
            }
          />

          <Route
            path="/admin/users/:userId"
            element={
              <RequireAdmin>
                <AdminUserProfilePage />
              </RequireAdmin>
            }
          />

          <Route
            path="/admin/finance/revenue"
            element={
              <RequireAdmin>
                <AdminRevenueDashboard />
              </RequireAdmin>
            }
          />
        </Route>
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    const root = document.documentElement;
    const storedTheme = window.localStorage.getItem("theme");
    if (storedTheme === "dark") {
      root.classList.add("theme-dark");
      return;
    }
    if (storedTheme === "light") {
      root.classList.remove("theme-dark");
      return;
    }
    window.localStorage.setItem("theme", "light");
    root.classList.remove("theme-dark");
  }, []);

  return (
    <HashRouter>
      <StripeProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </StripeProvider>
    </HashRouter>
  );
};

export default App;
