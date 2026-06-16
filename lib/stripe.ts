import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is missing from environment variables. Stripe features will fail.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-05-27.dahlia' as any, // Use type assertion or correct string based on SDK

  appInfo: {
    name: 'RosterSync',
    version: '1.0.0',
  },
});
