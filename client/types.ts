
export enum UserRole {
  GUEST = 'GUEST',
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  DEALER = 'DEALER',
  ADMIN = 'ADMIN',
  BANK = 'BANK'
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isKycVerified: boolean;
  avatar?: string;
  location?: {
    city?: string;
    country?: string;
  };
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  vin: string;
  condition: 'Mint' | 'Excellent' | 'Good' | 'Fair';
  description: string;
  images: string[];
  location: string;
}

export type ListingStatus = 'DRAFT' | 'PUBLISHED' | 'DELISTED';

export interface Listing {
  id: string;
  sellerId: string;
  status: ListingStatus;
  title: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  vin: string;
  condition: Vehicle['condition'];
  location: string;
  features: string[];
  description: string;
  notes?: string;
  images: string[];
  startingBid?: number;
  reservePrice?: number;
  inspectionDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Auction {
  id: string;
  vehicle: Vehicle;
  sellerId: string;
  currentBid: number;
  startingBid: number;
  reservePrice: number;
  buyItNowPrice?: number;
  bidCount: number;
  endTime: string;
  status: 'ACTIVE' | 'ENDED' | 'UPCOMING' | 'CANCELLED';
  bids: Bid[];
}

export interface Bid {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  timestamp: string;
}

export interface FinanceOption {
  loanAmount: number;
  monthlyPayment: number;
  apr: number;
  termMonths: number;
}

export interface LandingStats {
  activeListings: number;
  verifiedSellers: number;
  avgTimeToSell: string;
  escrowProtected: string;
}
