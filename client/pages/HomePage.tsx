import React from 'react';
import PlaceholderPage from '../components/PlaceholderPage';

const HomePage: React.FC = () => (
  <PlaceholderPage
    title="Browse Cars"
    subtitle="This page is being built. The full browsing experience is coming soon."
    primaryAction={{ label: 'Back to home', to: '/' }}
    secondaryAction={{ label: 'How it Works', to: '/how-it-works' }}
  />
);

export default HomePage;
