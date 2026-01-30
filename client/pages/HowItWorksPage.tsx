import React from 'react';
import PlaceholderPage from '../components/PlaceholderPage';

const HowItWorksPage: React.FC = () => (
  <PlaceholderPage
    title="How It Works"
    subtitle="From browsing to bidding and final delivery, we make every step transparent and secure. Full walkthroughs are coming soon."
    primaryAction={{ label: 'Start browsing', to: '/browse' }}
    secondaryAction={{ label: 'Sell a car', to: '/sell' }}
  />
);

export default HowItWorksPage;
