# Stripe Sandbox Setup Guide

This guide will help you set up Stripe in test mode for the Autousata payment integration.

## Step 1: Create Stripe Account

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Sign up for a free Stripe account
3. You'll automatically start in **Test Mode** (look for the toggle in the top-right)

## Step 2: Get API Keys

1. In the Stripe Dashboard, ensure you're in **Test Mode** (toggle should show "Test")
2. Navigate to: **Developers → API Keys**
3. You'll see two keys:
   - **Publishable key** (`pk_test_...`) - Safe to use in frontend
   - **Secret key** (`sk_test_...`) - Keep secure, backend only
4. Click "Reveal test key" to see the secret key

## Step 3: Configure Environment Variables

### Server (.env)
```bash
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxx  # Get this in Step 4
```

### Client (.env)
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxxxxxxxxxx
```

## Step 4: Set Up Webhooks (Local Testing)

### Option A: Using Stripe CLI (Recommended)
1. Install Stripe CLI: [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
2. Login: `stripe login`
3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to http://localhost:5000/api/webhooks/stripe
   ```
4. Copy the webhook signing secret (`whsec_...`) to your `.env` file

### Option B: Using ngrok (For Production-like Testing)
1. Install ngrok: [https://ngrok.com/download](https://ngrok.com/download)
2. Start your server: `npm run dev`
3. Expose with ngrok: `ngrok http 5000`
4. In Stripe Dashboard → **Developers → Webhooks → Add endpoint**
   - URL: `https://your-ngrok-url.ngrok.io/api/webhooks/stripe`
   - Events to listen for:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`
5. Copy the webhook signing secret to your `.env` file

## Step 5: Test Cards

Stripe provides special test card numbers:

| Card Number         | Result                    | Use Case              |
|---------------------|---------------------------|-----------------------|
| 4242 4242 4242 4242 | Success                   | Normal payment        |
| 4000 0000 0000 9995 | Declined (insufficient)   | Test payment failure  |
| 4000 0000 0000 0002 | Declined (generic)        | Test error handling   |
| 4000 0025 0000 3155 | Requires authentication   | Test 3D Secure        |

**Instructions:**
- Use any future expiry date (e.g., `12/34`)
- Use any 3-digit CVC (e.g., `123`)
- Use any name

## Step 6: Enable EGP Currency

1. In Stripe Dashboard → **Settings → Payment methods**
2. Scroll to **Supported currencies**
3. Ensure **EGP (Egyptian Pound)** is enabled
4. If not, click "Add" and select EGP

## Step 7: Test the Integration

### Backend Start
```bash
cd server
npm run dev
```

### Client Start
```bash
cd client
npm run dev
```

### Webhook Listener (in separate terminal)
```bash
stripe listen --forward-to http://localhost:5000/api/webhooks/stripe
```

### Test Flow
1. Place a bid and win an auction
2. Navigate to payment page
3. Enter test card: `4242 4242 4242 4242`
4. Submit payment
5. Check webhook terminal for `payment_intent.succeeded` event
6. Verify in Stripe Dashboard → **Payments** that transaction appears
7. Check your database that PAYMENTS and ESCROWS records were created

## Step 8: Monitor in Stripe Dashboard

- **Payments**: View all test transactions
- **Logs**: See API requests and webhook deliveries
- **Events**: Full event history with JSON payloads
- **Webhooks**: Check delivery status and retry failed webhooks

## Common Issues

### Webhook not receiving events
- Ensure Stripe CLI is running: `stripe listen --forward-to ...`
- Check webhook secret matches in `.env`
- Verify endpoint returns 200 status

### Payment fails immediately
- Check you're using test mode keys (start with `pk_test_` / `sk_test_`)
- Verify card number is correct test card
- Check Stripe Dashboard → Logs for error details

### Currency not supported
- Ensure EGP is enabled in Stripe settings
- Stripe started supporting EGP in 2020, account may need verification

## Production Checklist (Future)

When ready to go live:
- [ ] Switch Stripe Dashboard to **Live Mode**
- [ ] Get live API keys (`sk_live_...` / `pk_live_...`)
- [ ] Update environment variables with live keys
- [ ] Configure production webhook endpoint (HTTPS required)
- [ ] Complete Stripe account verification (business details, banking)
- [ ] Test with real small-amount transactions
- [ ] Set up Stripe Connect for seller payouts
- [ ] Enable fraud detection rules

## Resources

- [Stripe Testing Docs](https://stripe.com/docs/testing)
- [Webhook Testing](https://stripe.com/docs/webhooks/test)
- [Stripe CLI Docs](https://stripe.com/docs/stripe-cli)
- [Payment Intents API](https://stripe.com/docs/api/payment_intents)
