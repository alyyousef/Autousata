
import { Auction, UserRole, User } from './types';
import porsche911Image from '../assests/carsPictures/porsche911.png';
import teslaModelSPlaidImage from '../assests/carsPictures/teslaModelSPlaid.jpg';
import fordBroncoImage from '../assests/carsPictures/fordBroncoF.jpg';

export const MOCK_USER: User = {
  id: 'user-1',
  name: 'Ali Youssef',
  email: 'john@example.com',
  role: UserRole.ADMIN,
  isKycVerified: true,
  avatar: 'https://picsum.photos/seed/user/100/100'
};

export const MOCK_AUCTIONS: Auction[] = [
  {
    id: 'auc-1',
    sellerId: 'user-2',
    vehicle: {
      id: 'veh-1',
      make: 'Porsche',
      model: '911 Carrera',
      year: 2021,
      mileage: 12000,
      vin: 'WPOZZZ99ZLS123456',
      condition: 'Excellent',
      description: 'Stunning 911 in Chalk with Bordeaux Red interior. Sport Chrono package included.',
      images: [porsche911Image],
      location: 'Cairo, Egypt'
    },
    currentBid: 95000,
    startingBid: 80000,
    reservePrice: 92000,
    bidCount: 14,
    endTime: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: 'ACTIVE',
    bids: []
  },
  {
    id: 'auc-2',
    sellerId: 'user-3',
    vehicle: {
      id: 'veh-2',
      make: 'Tesla',
      model: 'Model S Plaid',
      year: 2022,
      mileage: 5000,
      vin: '5YJSA1E22NF123456',
      condition: 'Mint',
      description: 'Tri-motor AWD, Full Self-Driving Capability included. Like new condition.',
      images: [teslaModelSPlaidImage],
      location: 'Giza, Egypt'
    },
    currentBid: 82000,
    startingBid: 75000,
    reservePrice: 85000,
    bidCount: 8,
    endTime: new Date(Date.now() + 3600000 * 5).toISOString(),
    status: 'ACTIVE',
    bids: []
  },
  {
    id: 'auc-3',
    sellerId: 'user-4',
    vehicle: {
      id: 'veh-3',
      make: 'Ford',
      model: 'Bronco First Edition',
      year: 2021,
      mileage: 8000,
      vin: '1FMCU0G12ML123456',
      condition: 'Excellent',
      description: 'Sasquatch package, 4-door, Lightning Blue. Only 7,000 units made.',
      images: [fordBroncoImage],
      location: 'Alexandria, Egypt'
    },
    currentBid: 61000,
    startingBid: 50000,
    reservePrice: 65000,
    bidCount: 22,
    endTime: new Date(Date.now() + 86400000 * 0.5).toISOString(),
    status: 'ACTIVE',
    bids: []
  }
];
