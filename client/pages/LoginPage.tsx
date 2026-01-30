import React from 'react';
import PlaceholderPage from '../components/PlaceholderPage';

const LoginPage: React.FC = () => (
  <PlaceholderPage
    title="Log in to your account"
    subtitle="Account access and two-factor authentication are being finalized. We'll be ready shortly."
    primaryAction={{ label: 'Create an account', to: '/signup' }}
    secondaryAction={{ label: 'Browse cars', to: '/browse' }}
  />
);

export default LoginPage;
