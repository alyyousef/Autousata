
import React, { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { User as UserType } from './types';
import { MOCK_USER } from './constants';

import AppLayout from './layouts/AppLayout';
import PublicLayout from './layouts/PublicLayout';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import HowItWorksPage from './pages/HowItWorksPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import AuctionDetailPage from './pages/AuctionDetailPage';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CreateListingPage from './pages/CreateListingPage';
import ProfilePage from './pages/ProfilePage';

const App: React.FC = () => {
  const [user, setUser] = useState<UserType>(MOCK_USER);

  return (
    <HashRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/browse" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
        </Route>

        <Route element={<AppLayout user={user} />}>
          <Route path="/auction/:id" element={<AuctionDetailPage />} />
          <Route path="/sell" element={<CreateListingPage />} />
          <Route path="/dashboard" element={<SellerDashboard user={user} />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/profile" element={<ProfilePage user={user} />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
