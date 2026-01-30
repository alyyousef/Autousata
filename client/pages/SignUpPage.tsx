import React from 'react';
import PlaceholderPage from '../components/PlaceholderPage';

const SignUpPage: React.FC = () => (
  <PlaceholderPage
    title="Create your Autousata account"
    subtitle="We're preparing a streamlined onboarding flow for buyers and sellers. Reserve your spot today."
    primaryAction={{ label: 'Browse cars', to: '/browse' }}
    secondaryAction={{ label: 'Log in', to: '/login' }}
  />
);

export default SignUpPage;
