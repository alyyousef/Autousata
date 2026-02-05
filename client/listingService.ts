import { Listing, ListingStatus } from './types';

const STORAGE_KEY = 'AUTOUSATA_listings';

const loadListings = (): Listing[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as Listing[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveListings = (listings: Listing[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
};

const nowIso = () => new Date().toISOString();

export const listingService = {
  getAll(): Listing[] {
    return loadListings();
  },
  getById(id: string): Listing | undefined {
    return loadListings().find(listing => listing.id === id);
  },
  getByStatus(status: ListingStatus): Listing[] {
    return loadListings().filter(listing => listing.status === status);
  },
  create(listing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>): Listing {
    const listings = loadListings();
    const newListing: Listing = {
      ...listing,
      id: `lst-${Date.now()}`,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    listings.unshift(newListing);
    saveListings(listings);
    return newListing;
  },
  update(id: string, updates: Partial<Listing>): Listing | undefined {
    const listings = loadListings();
    const index = listings.findIndex(listing => listing.id === id);
    if (index === -1) {
      return undefined;
    }
    const updated: Listing = {
      ...listings[index],
      ...updates,
      updatedAt: nowIso()
    };
    listings[index] = updated;
    saveListings(listings);
    return updated;
  },
  setStatus(id: string, status: ListingStatus): Listing | undefined {
    return this.update(id, { status });
  }
};
