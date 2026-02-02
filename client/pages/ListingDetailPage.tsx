import React from 'react';
import PlaceholderPage from '../components/PlaceholderPage';

const ListingDetailPage: React.FC = () => (
  <PlaceholderPage
    title="Listing Details"
    subtitle="This listing view is coming soon. You'll be able to see photos, specs, and bid history here."
    primaryAction={{ label: 'Back to browse', to: '/browse' }}
    secondaryAction={{ label: 'How it Works', to: '/how-it-works' }}
  />
);

export default ListingDetailPage;
