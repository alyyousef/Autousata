import { Auction, LandingStats, Vehicle } from './types';
import { MOCK_AUCTIONS } from './constants';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mapToFeaturedVehicles = (auctions: Auction[]): Vehicle[] =>
  auctions.map(auction => auction.vehicle).slice(0, 3);

export const fetchLandingTeasers = async (): Promise<Vehicle[]> => {
  await delay(500);
  return mapToFeaturedVehicles(MOCK_AUCTIONS);
};

export const fetchLandingStats = async (): Promise<LandingStats> => {
  await delay(400);
  return {
    activeListings: 286,
    verifiedSellers: 124,
    avgTimeToSell: '9 days',
    escrowProtected: '100%'
  };
};
