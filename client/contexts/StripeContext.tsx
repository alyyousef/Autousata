import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';

interface StripeContextType {
  stripe: Stripe | null;
  isLoading: boolean;
  error: string | null;
}

const StripeContext = createContext<StripeContextType>({
  stripe: null,
  isLoading: true,
  error: null,
});

export const useStripe = () => {
  const context = useContext(StripeContext);
  if (!context) {
    throw new Error('useStripe must be used within StripeProvider');
  }
  return context;
};

interface StripeProviderProps {
  children: React.ReactNode;
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

        if (!publishableKey) {
          throw new Error('Stripe publishable key is not configured');
        }

        if (!publishableKey.startsWith('pk_')) {
          console.warn('Invalid Stripe key format. Expected key starting with pk_');
        }

        const stripeInstance = await loadStripe(publishableKey);

        if (!stripeInstance) {
          throw new Error('Failed to load Stripe');
        }

        setStripe(stripeInstance);
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing Stripe:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize Stripe');
        setIsLoading(false);
      }
    };

    initializeStripe();
  }, []);

  return (
    <StripeContext.Provider value={{ stripe, isLoading, error }}>
      {children}
    </StripeContext.Provider>
  );
};

export default StripeContext;
