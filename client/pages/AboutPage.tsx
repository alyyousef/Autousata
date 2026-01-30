import React from 'react';
import PlaceholderPage from '../components/PlaceholderPage';

const AboutPage: React.FC = () => (
  <PlaceholderPage
    title="About Autousata"
    subtitle="We are building the most trusted destination for automotive auctions, with verified sellers and seamless escrow-backed transactions."
    primaryAction={{ label: 'Browse Cars', to: '/browse' }}
    secondaryAction={{ label: 'How it Works', to: '/how-it-works' }}
  />
);

export default AboutPage;
