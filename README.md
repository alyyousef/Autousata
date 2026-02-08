<div align="center">

# AUTOUSATA

### European excellence, powered by Egyptian spirit

![Oracle](https://img.shields.io/badge/-Oracle-F80000?style=flat-square&logo=oracle&logoColor=white)
![Flask](https://img.shields.io/badge/-Flask-black?style=flat-square&logo=flask)
![Next.js](https://img.shields.io/badge/-Next.js-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/-React-black?style=flat-square&logo=react)
![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)
![JavaScript](https://img.shields.io/badge/-JavaScript-black?style=flat-square&logo=javascript)
![Python](https://img.shields.io/badge/-Python-3776AB?style=flat-square&logo=python&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/-TailwindCSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Git](https://img.shields.io/badge/-Git-black?style=flat-square&logo=git)
![GitHub](https://img.shields.io/badge/-GitHub-181717?style=flat-square&logo=github)

<br>

</div>

AUTOUSATA is Egypt's most trusted used car auction platform, combining European-grade discipline with Egyptian spirit to transform how Egyptians buy, sell, and auction vehicles. We replace uncertainty with verified information, fair pricing, integrated financing, and transparent ownership transfers—turning "Ya Rab" into "I'm sure."

## Motivation

Egypt's used car market worth EGP 282-301 billion (USD 6.0-6.4 billion) remains fragmented, undigitized, and plagued by trust issues. Traditional dealerships operate with opacity, hidden defects go undisclosed, financing reaches only 5% of buyers, and ownership transfers involve bureaucratic nightmares.

AUTOUSATA solves these challenges through:

- Rigorous third-party vehicle inspections with 200-point condition reports
- Transparent auction mechanics with real-time bidding and fair pricing algorithms
- Seamless financing integration with 5-8 partner banks (CIB, Banque Misr, NBE)
- Escrow-based payment protection ensuring secure fund transfers
- Streamlined ownership documentation handled through Ministry of Interior coordination
- Trust infrastructure replacing personal favors with systematic verification

**Mission:** Build the most trusted, most efficient way to buy, sell, and auction used cars in Egypt by bringing European-grade discipline to a market that has never had it, and doing it with Egyptian spirit: respect, fairness, and أمانة.

**Vision:** A used-car market where people don't "hope" they made the right decision. They know.

## Build Status

**Current Status**
- ~~Planning & Documentation~~ (Done!)
- ~~Entity Schema Design~~ (Done!)
- Week 1 Sprint (In Progress)

**Week 1 Development Plan**
- Wednesday-Thursday: Database schema setup (Oracle), Basic Flask API with JWT authentication
- Friday-Saturday: Auction bidding system, Payment integration (Paymob sandbox), User registration/login
- Sunday-Monday: Testing, bug fixes, deploy to production, basic monitoring setup
- Tuesday: Final polish, load testing, launch preparation

**Code Quality & Architecture**
- Database schema follows strict normalization principles with comprehensive foreign key relationships
- Role-Based Access Control (RBAC) implemented at entity level for Buyers, Sellers, Inspectors, Admins
- State machines designed for Auction lifecycle (Draft → Scheduled → Live → Ended → Settled)
- Payment lifecycle follows industry standards (Pending → Processing → Completed → Failed/Refunded)
- Escrow system ensures fund safety with dual-confirmation release mechanism
- API endpoints secured with JWT tokens and role-based middleware
- All monetary values stored as DECIMAL(15,2) for precision
- UUID primary keys across all entities for scalability
- Comprehensive indexing strategy for performance optimization

**Data Model Highlights**
- 10 core entities: USER, KYC_DOCUMENT, VEHICLE, INSPECTION_REPORT, AUCTION, BID, PAYMENT, ESCROW, NOTIFICATION, USER_RATING
- Referential integrity enforced with CASCADE/RESTRICT rules
- Soft delete implementation for audit trail preservation
- JSONB fields for flexible feature storage (vehicle features, notification channels)
- Graduated bid increment system based on price tiers

**Security & Compliance**
- bcrypt password hashing with 12-round cost factor
- Phone and email verification required before transactions
- KYC (Know Your Customer) document verification for all sellers
- Payment gateway webhook signature validation (HMAC-SHA256)
- Egyptian Personal Data Protection Law 151/2020 compliance
- Ministry of Interior dealer license application in progress

## Code Style

This project follows strict coding standards to ensure enterprise-grade quality:

**Python/Flask Backend:**
- PEP 8 compliance with 4-space indentation
- Type hints for function signatures
- Comprehensive docstrings for all public methods
- SQLAlchemy ORM for database abstraction
- Flask-RESTful for clean API structure
- Environment variables for all secrets (python-dotenv)

**JavaScript/Next.js Frontend:**
- ES6+ modern JavaScript syntax
- Functional React components with Hooks
- Next.js 14 App Router for server-side rendering
- Consistent file naming: kebab-case for components, camelCase for utilities

**General Conventions:**
- Meaningful variable names (no abbreviations except industry-standard like UUID, API, JWT)
- Consistent indentation (4 spaces Python, 2 spaces JavaScript)
- Comprehensive comments for complex business logic
- Git commit messages follow conventional commits format

**Color Palette:**
The project uses a professional palette reflecting trust and clarity:

- **Primary Brand Color:** `#001845` 🟦 (Deep Navy - Authority & Trust)
- **Text & Backgrounds:** `#ffffff` ⬜ (White - Clarity)
- **Interactive Elements:** `#4C3BCF` 🟪 (Royal Purple - Premium Quality)
- **Accent & Highlights:** `#002966` 🟦 (Dark Blue - Reliability)
- **Success States:** `#28a745` 🟢 (Green - Verified/Approved)
- **Warning States:** `#ffc107` 🟡 (Amber - Pending Review)
- **Error States:** `#dc3545` 🔴 (Red - Rejected/Failed)

**Typography:**
- **Headings:** Playfair Display (Elegance & Authority)
- **Body Text:** Inter (Readability & Modern Feel)
- **Monospace (Code/Numbers):** Fira Code (Technical Precision)

## Tech/Framework Used

**Backend Stack:**

- **Flask** - Lightweight Python web framework (Version: 2.3.0)
- **Flask-RESTful** - RESTful API toolkit for Flask (Version: 0.3.10)
- **SQLAlchemy** - Python SQL toolkit and ORM (Version: 2.0.0)
- **Oracle Database** - Enterprise-grade relational database (Version: 21c)
- **JWT (PyJWT)** - JSON Web Token authentication (Version: 2.8.0)
- **bcrypt** - Password hashing library (Version: 4.0.1)

**Frontend Stack:**

- **Next.js** - React framework with App Router (Version: 14.0.0)
- **React** - Frontend library for UI components (Version: 18.2.0)
- **TailwindCSS** - Utility-first CSS framework (Version: 3.3.0)
- **Axios** - HTTP client for API calls (Version: 1.6.0)

**Additional Technologies & Libraries:**

**Backend:**
- **Paymob Integration** - Payment gateway for Egyptian market
- **Stripe** - International payment processing (future expansion)
- **python-dotenv** - Environment variable management
- **gunicorn** - WSGI HTTP server for production
- **Redis** - Session management and caching

**Frontend:**
- **react-router-dom** - Client-side routing
- **lucide-react** - Icon library for modern UI
- **date-fns** - Date manipulation and formatting
- **react-hook-form** - Form validation and management
- **recharts** - Data visualization for analytics dashboards

**Infrastructure:**
- **Nginx** - Reverse proxy and load balancer
- **AWS EC2** - Server hosting (t3.medium instance)
- **Sentry** - Error tracking and monitoring (free tier)
- **UptimeRobot** - Uptime monitoring

# AUTOUSATA - Feature List

## Authentication & User Management

### Multi-Role Registration System

- **Buyer Registration:** Sign up with email, phone, password, full name (no KYC required)
- **Seller Registration:** Sign up with email, phone, password + mandatory KYC document submission (National ID/Passport/Driver's License)
- **Vendor Registration:** Business registration with company name, tax card upload, company logo verification
- **Inspector Registration:** Invite-only system by admin with background check and insurance verification
- Phone verification via OTP (One-Time Password) sent via SMS
- Email verification with automatic redirect to login page
- Login restricted until both phone and email are verified

### KYC & Identity Verification

- Sellers upload government-issued ID documents (front, back, selfie with document)
- Document validation: expiry date, issue date, date of birth verification (18+ requirement)
- Admin review queue with 48-hour SLA for KYC approval/rejection
- Automatic User.kyc_status update upon document approval
- Anti-fraud measures: face verification via selfie, document number validation
- Rejection reason tracking for transparency

### Admin & Role Management

- Admins assign correct roles to Staff/TA/Professor after registration
- Role-based access control matrix for all entities (10 core entities)
- Admins can create other Admin/Event Office accounts
- Admins can delete Admin/Event Office accounts
- User banning capability with ban reason documentation
- View all users with status filters (active/blocked/banned)

### Login & Session Management

- JWT-based authentication with access tokens (4-hour expiry)
- Refresh token mechanism for persistent sessions
- Logout functionality with token invalidation
- Role extraction from JWT payload for authorization
- IP address and user agent logging for fraud detection

---

## Vehicle Listing & Inventory Management

### Vehicle Listing Creation (Sellers Only)

- Create listings with comprehensive details: make, model, year, mileage, VIN, plate number, color, body type, transmission, fuel type, seats
- Condition assessment (excellent/good/fair/poor)
- Title status documentation (clean/salvage/rebuilt)
- Price setting in EGP with reserve price (hidden from buyers)
- Location specification with city, latitude/longitude coordinates
- Rich-text description (max 5000 characters)
- JSONB features array (AC, power windows, airbags, sunroof, etc.)
- Image upload support for vehicle photos
- Draft listings (visible only to seller, editable before publication)

### Vehicle Search & Discovery

- Browse all active vehicle listings
- Search by make, model, year, price range, location
- Filter by body type, transmission, fuel type, condition
- Sort by price (ascending/descending), mileage, year, listing date
- Geographic search by city or proximity
- View count tracking for analytics
- Favorite vehicles for later viewing

### Vehicle Status Lifecycle

- **Draft:** Seller preparing listing, not visible to buyers
- **Active:** Published and available for auction (requires passed inspection)
- **Sold:** Auction completed with winning bid ≥ reserve price
- **Delisted:** Seller canceled or admin removed

### Inspection Requirements

- All vehicles must pass third-party inspection before becoming active
- Inspection report linked to vehicle entity
- 200-point condition assessment
- Photos and PDF report attachment
- Pass/fail status determines listing eligibility
- Inspection immutable after approval (audit trail)

---

## Auction System

### Auction Creation & Management

- **Seller-Initiated Auctions:** Sellers schedule auctions for their verified vehicles
- **Auction Parameters:**
  - Start time and end time (24, 48, or 72-hour durations)
  - Reserve price (minimum acceptable bid, hidden from buyers)
  - Starting bid (first bid minimum, public)
  - Minimum bid increment (graduated based on current bid)
- **Auto-Extend Mechanism:** If bid placed in final 5 minutes, auction extends by 5 minutes (max 3 extensions)
- **Auction States:** Draft → Scheduled → Live → Ended → Settled

### Live Auction Features

- Real-time current bid display (polling every 30 seconds in Week 1, WebSocket in future)
- Leading bidder indicator (masked for privacy)
- Bid count and time remaining countdown
- "Reserve Not Met" badge if current bid below reserve price
- Auction history showing all accepted bids
- Automatic settlement upon auction end if reserve met

### Graduated Bid Increment System

- **EGP 0–1,000:** Increment = EGP 50
- **EGP 1,000–10,000:** Increment = EGP 100
- **EGP 10,000–50,000:** Increment = EGP 500
- **EGP 50,000–100,000:** Increment = EGP 1,000
- **EGP 100,000+:** Increment = EGP 5,000

### Proxy Bidding (Future Feature)

- Users set maximum bid amount
- System automatically bids up to proxy limit
- Prevents bid sniping and manual monitoring

---

## Bidding System

### Placing Bids

- **Buyer Requirements:** Active account, phone verified, not banned
- **Bid Validation:** Amount ≥ (current_bid + minimum_increment)
- **Seller Restriction:** Sellers cannot bid on their own auctions
- **Financing Check:** System verifies buyer has sufficient cash OR financing pre-approval
- **Bid Submission:** Instant feedback (accepted/outbid/rejected)
- **IP & User Agent Logging:** Fraud detection and audit trail

### Bid Statuses

- **Accepted:** Bid became the leading bid
- **Outbid:** Another bid surpassed this bid
- **Rejected:** Did not meet minimum increment or validation failed

### Bid History & Transparency

- View all accepted bids on an auction (amount, timestamp, masked bidder ID)
- Personal bid history (all auctions participated in)
- Bid leaderboard (top bids on active auctions)
- Notification when outbid

### Bid Retraction (Limited)

- Buyers can retract bids within 1 hour of placement (if not leading bid)
- Admin can retract bids in case of fraud or technical error
- Retraction history logged for abuse prevention

---

## Payment & Escrow System

### Payment Integration (Paymob)

- **Supported Methods:** Credit/debit cards (Visa, Mastercard), mobile wallets (Fawry)
- **Payment Flow:** Winner receives payment link → enters payment form → Paymob processes → webhook confirms completion
- **Payment States:** Pending → Processing → Completed OR Failed
- **Retry Mechanism:** Up to 3 retries with exponential backoff for failed payments
- **48-Hour Payment Window:** Buyers must complete payment within 48 hours of auction end

### Transaction Fees

- **Seller Commission:** 2.5% (Year 1), scaling to 3.5-4% (Year 3)
- **Buyer Fee:** 0.5% (Year 1), scaling to 1-2% (Year 3)
- **Payment Processor Fee:** 2.8% + EGP 0.75 (Paymob standard)
- **Total Take Rate:** 3% (Year 1) → 4.5-6% (Year 3)

### Escrow Protection

- All winning bid amounts held in escrow until ownership transfer complete
- **Escrow States:** Held → Released OR Refunded
- **Release Conditions:** BOTH seller upload ownership docs AND buyer confirm receipt
- **Auto-Release:** 7 days after escrow creation if no dispute filed
- **Dispute Resolution:** Either party can file dispute within 7-day window; admin manually resolves

### Seller Payout

- **Payout Calculation:** winning_bid - seller_commission - processor_fee
- **Payout Method:** Bank transfer (2-3 business days after escrow release)
- **Payout Reference:** Transaction ID provided for tracking

### Refund Mechanism

- **Buyer Cancellation (Pre-Payment):** Full refund to payment method
- **Dispute Resolution Refund:** Admin-initiated refund after dispute investigation
- **Failed Payment Refund:** Automatic if payment fails after multiple retries

---

## Inspection System

### Inspection Request Workflow

1. Seller creates vehicle listing (draft state)
2. Seller schedules inspection via platform
3. Inspector assigned based on location and availability
4. Inspector conducts on-site 200-point inspection
5. Inspector uploads photos, report, and pass/fail status
6. Admin reviews and approves inspection report
7. If passed, vehicle status changes to "Active" and can be auctioned

### Inspection Report Details

- **Vehicle Condition Assessment:** Engine, transmission, suspension, interior, paint
- **Odometer Verification:** Inspector confirms mileage matches listing
- **Accident History:** Previous damage or repairs documented
- **Mechanical Issues:** Problems found and severity
- **Required Repairs:** What needs fixing before sale
- **Estimated Repair Cost:** Inspector's estimate for repairs
- **Inspection Photos:** Array of photo URLs (exterior, interior, engine bay, undercarriage)
- **PDF Report:** Downloadable comprehensive report

### Inspector Management

- **Inspector Onboarding:** Admin invites inspectors, verifies credentials, assigns regions
- **Inspection Scheduling:** Inspectors manage their calendar, accept/reject requests
- **Per-Inspection Compensation:** Negotiated fee per completed inspection
- **Quality Control:** Admin reviews inspector performance, can deactivate low-quality inspectors

---

## Financing Integration

### Bank Partnership Network

- **Partner Banks:** CIB (Commercial International Bank), Banque Misr, NBE (National Bank of Egypt), Crédit Agricole Egypt, Carofi, Valu Shift
- **Financing Model:** AUTOUSATA acts as facilitator/broker, does NOT lend directly
- **Pre-Approval Process:** Buyers submit income, employment, credit info; bank approves/rejects
- **Loan Terms:** 60% LTV (Loan-to-Value) typical; 3-5 year terms; interest rates set by bank

### Revenue Model

- **Origination Fee:** 1.5-2% on approved loan amount (split with partner bank)
- **Referral Commission:** 0.5-1% if third-party lenders used
- **Year 1 Target:** 5-10% of cars financed
- **Year 3 Target:** 20-25% of cars financed (EGP 11.28-14.10 million/month revenue)

### Financing User Experience

- Buyers see "Get Pre-Approved" option during auction viewing
- Pre-approval result shown instantly (subject to bank verification)
- Approved buyers can bid with confidence (financing guaranteed)
- Loan disbursement happens after escrow release
- Monthly payment calculator shown on vehicle listing

---

## Notification System

### Multi-Channel Notifications

- **Email:** Account verification, auction updates, payment receipts, escrow status
- **SMS:** OTP verification, outbid alerts, auction ending soon (1 hour before)
- **In-App:** Real-time notifications for bids, auction status, messages
- **Push Notifications (Future):** Mobile app alerts for critical events

### Notification Types

- **OTP Verification:** Phone/email verification codes
- **Auction Starting:** Auction goes live (for sellers and watchlist users)
- **Auction Ending Soon:** 1 day before, 1 hour before end time
- **Outbid Alert:** Another user placed higher bid
- **Auction Won:** Winning bid notification
- **Payment Due:** Reminder to complete payment within 48 hours
- **Escrow Status:** Funds held, released, refunded
- **Ownership Transfer:** Documents uploaded, transfer complete
- **Inspection Complete:** Report ready for review

### Notification Preferences

- Users can disable non-critical notifications per channel
- Critical notifications (OTP, payment alerts) always sent
- Digest mode for batching non-critical notifications (daily/weekly email)
- Notification retention: 90 days in database, then archived to S3

---

## User Ratings & Feedback

### Rating System

- **Rating Context:** Post-transaction only (after escrow release)
- **Rating Directions:** 
  - Buyer rates Seller (seller_rating)
  - Seller rates Buyer (buyer_rating)
- **Rating Score:** 1-5 stars (integer scale)
- **Category Scores (JSONB):** Communication, accuracy, responsiveness, professionalism
- **Written Feedback:** Max 1000 characters comment
- **Positive/Negative Aspects:** Array fields for structured feedback
- **Recommendation:** Boolean "would recommend" flag

### Rating Visibility & Trust

- **Verified Purchase Badge:** Ratings only visible after escrow release
- **One Rating Per Auction Per Direction:** Prevents spam
- **Edit Window:** Raters can edit/delete within 30 days of posting
- **Dispute Mechanism:** Rated user can dispute a rating; admin reviews and resolves
- **Helpful Count:** Other users vote on rating helpfulness

### Seller/Buyer Reputation Score

- Aggregate rating displayed on user profile (cached, updated on new rating)
- Total ratings count shown for credibility
- Recent ratings highlighted (last 10)
- Response rate and average response time (future feature)

---

## Admin Dashboard & Moderation

### KYC Review Queue

- View all pending KYC submissions sorted by submission date
- Download uploaded documents (ID front/back, selfie)
- Approve or reject with reason
- 48-hour SLA tracking with alerts for overdue reviews
- Bulk approval for high-volume processing

### Listing Moderation

- Review flagged listings (reported by users for violations)
- Delist vehicles with prohibited content or fraudulent info
- Ban users for repeated violations
- View listing analytics (views, favorites, bid activity)

### Payment & Transaction Monitoring

- View all payments by status (pending, completed, failed)
- Refund processing interface
- Dispute resolution dashboard (view dispute details, adjudicate)
- Fraud detection alerts (unusual bid patterns, payment anomalies)

### User Management

- View all users with filters (role, status, KYC status)
- Ban/unban users with ban reason documentation
- Reset user passwords (security action)
- View user activity logs (logins, bids, payments)

### Reporting & Analytics

- **Sales Reports:** Revenue by event type, date range, geographic region
- **Attendance Reports:** Total bidders, winning bidders, conversion rates
- **Inventory Reports:** Active listings, sold vehicles, average days to sale
- **Financing Reports:** Loan approval rates, financing penetration by price tier
- **Inspector Performance:** Inspections completed, average turnaround time

---

## Security & Compliance

### Authentication Security

- **Password Requirements:** Min 8 characters, 1 uppercase, 1 number, 1 special character
- **bcrypt Hashing:** 12-round cost factor for password storage
- **JWT Token Security:** HMAC-SHA256 signing, 4-hour expiry, refresh token mechanism
- **Rate Limiting:** Nginx-based rate limiting (100 requests/minute per IP)

### Data Protection

- **HTTPS Encryption:** Let's Encrypt SSL certificates
- **SQL Injection Protection:** SQLAlchemy parameterized queries
- **XSS Protection:** React automatic escaping, Content Security Policy headers
- **CSRF Protection:** Token-based validation for state-changing requests
- **Sensitive Data Masking:** Phone numbers, email addresses partially masked in logs

### Regulatory Compliance

- **Egyptian Personal Data Protection Law 151/2020:** Privacy policy, data processing agreements, user consent
- **Ministry of Interior Dealer License:** Application in progress for vehicle ownership transfer facilitation
- **CBE Payment Processing Compliance:** Partner with licensed payment processors (Paymob, Fawry)
- **Tax Compliance:** Corporate income tax (22.5%), VAT (14% where applicable), employee income tax withholding

### Audit Trails

- All state-changing operations logged (user actions, payment status changes, escrow releases)
- Immutable financial records (Payment, Escrow entities ON DELETE RESTRICT)
- Webhook signature validation for payment gateway callbacks
- IP address and user agent logging for fraud investigation

---

## Geographic Expansion Roadmap

### Phase 1: Cairo (Months 1-6)

- New Cairo inspection center (primary hub)
- 70% of Egypt's used car market concentrated in Cairo
- Target: 1,500 cars/month by Month 6

### Phase 2: Alexandria (Months 7-12)

- Alexandria inspection center (250 sqm facility)
- Second-largest city with 10-15% of market
- Target: Additional 500 cars/month

### Phase 3: Tier 2 Cities (Year 2)

- Giza, Sharqia, Qalyubia inspection centers
- 15-20% additional market coverage
- Target: 3,500 cars/month total

### Phase 4: Delta & Upper Egypt (Year 3+)

- Assiut, Luxor, Sohag for long-tail coverage
- Mobile inspection units for remote areas
- Target: 5,500+ cars/month total

---

## Code Examples

*Code examples demonstrating key functionality patterns*

**Example: Creating an Auction with Validation**
```python
from flask import request, jsonify
from models import Auction, Vehicle, User
from datetime import datetime, timedelta
import uuid

@app.route('/api/auctions', methods=['POST'])
@jwt_required()
def create_auction():
    current_user = get_jwt_identity()
    data = request.get_json()
    
    vehicle = Vehicle.query.get(data['vehicle_id'])
    
    # Validation: Only vehicle owner can create auction
    if vehicle.seller_id != current_user['user_id']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Validation: Vehicle must have passed inspection
    if not vehicle.inspection_report_id or vehicle.inspection_report.status != 'passed':
        return jsonify({'error': 'Vehicle must pass inspection first'}), 400
    
    # Validation: One active auction per vehicle
    existing = Auction.query.filter_by(vehicle_id=vehicle.id, status='live').first()
    if existing:
        return jsonify({'error': 'Vehicle already has active auction'}), 400
    
    auction = Auction(
        id=uuid.uuid4(),
        vehicle_id=vehicle.id,
        seller_id=current_user['user_id'],
        start_time=datetime.fromisoformat(data['start_time']),
        end_time=datetime.fromisoformat(data['end_time']),
        reserve_price_egp=data['reserve_price'],
        starting_bid_egp=data['starting_bid'],
        current_bid_egp=data['starting_bid'],
        status='scheduled'
    )
    
    db.session.add(auction)
    db.session.commit()
    
    return jsonify(auction.to_dict()), 201
```

**Example: Placing a Bid with Increment Validation**
```python
from flask import request, jsonify
from models import Bid, Auction
import uuid

def calculate_minimum_increment(current_bid):
    """Graduated bid increment based on current price"""
    if current_bid < 1000:
        return 50
    elif current_bid < 10000:
        return 100
    elif current_bid < 50000:
        return 500
    elif current_bid < 100000:
        return 1000
    else:
        return 5000

@app.route('/api/bids', methods=['POST'])
@jwt_required()
def place_bid():
    current_user = get_jwt_identity()
    data = request.get_json()
    
    auction = Auction.query.get(data['auction_id'])
    
    # Validation: Auction must be live
    if auction.status != 'live':
        return jsonify({'error': 'Auction not active'}), 400
    
    # Validation: Seller cannot bid on own auction
    if auction.seller_id == current_user['user_id']:
        return jsonify({'error': 'Cannot bid on your own auction'}), 403
    
    # Validation: Check minimum increment
    min_increment = calculate_minimum_increment(auction.current_bid_egp)
    min_bid = auction.current_bid_egp + min_increment
    
    if data['amount'] < min_bid:
        return jsonify({
            'error': f'Bid must be at least EGP {min_bid}',
            'minimum_increment': min_increment
        }), 400
    
    # Mark previous leading bid as outbid
    if auction.leading_bidder_id:
        prev_bid = Bid.query.filter_by(
            auction_id=auction.id,
            bidder_id=auction.leading_bidder_id,
            status='accepted'
        ).first()
        if prev_bid:
            prev_bid.status = 'outbid'
    
    # Create new bid
    bid = Bid(
        id=uuid.uuid4(),
        auction_id=auction.id,
        bidder_id=current_user['user_id'],
        amount_egp=data['amount'],
        status='accepted',
        source='manual'
    )
    
    # Update auction
    auction.current_bid_egp = data['amount']
    auction.leading_bidder_id = current_user['user_id']
    auction.bid_count += 1
    
    db.session.add(bid)
    db.session.commit()
    
    # Send notification to previous bidder
    send_notification(prev_bid.bidder_id, 'outbid', auction.id)
    
    return jsonify(bid.to_dict()), 201
```

**Example: Escrow Release with Dual Confirmation**
```python
from flask import request, jsonify
from models import Escrow, Payment
from datetime import datetime

@app.route('/api/escrow/<escrow_id>/confirm', methods='POST'])
@jwt_required()
def confirm_escrow():
    current_user = get_jwt_identity()
    data = request.get_json()
    
    escrow = Escrow.query.get(escrow_id)
    
    # Seller confirmation: ownership docs uploaded
    if current_user['user_id'] == escrow.seller_id:
        if not data.get('documents_uploaded'):
            return jsonify({'error': 'Must upload ownership documents'}), 400
        escrow.seller_transfer_confirmed = datetime.utcnow()
    
    # Buyer confirmation: vehicle received
    elif current_user['user_id'] == escrow.buyer_id:
        if not data.get('vehicle_received'):
            return jsonify({'error': 'Must confirm vehicle receipt'}), 400
        escrow.buyer_received_confirmed = datetime.utcnow()
    
    else:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Check if both parties confirmed
    if escrow.seller_transfer_confirmed and escrow.buyer_received_confirmed:
        escrow.both_parties_confirmed = datetime.utcnow()
        escrow.status = 'released'
        escrow.released_at = datetime.utcnow()
        
        # Initiate bank transfer to seller
        initiate_payout(escrow)
        
        return jsonify({
            'message': 'Escrow released, payout initiated',
            'escrow': escrow.to_dict()
        }), 200
    
    db.session.commit()
    return jsonify({'message': 'Confirmation recorded', 'escrow': escrow.to_dict()}), 200
```

**Example: Next.js Auction Card Component**
```jsx
import { Clock, Users, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AuctionCard({ auction }) {
  const [timeRemaining, setTimeRemaining] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(auction.end_time);
      const diff = end - now;
      
      if (diff <= 0) {
        setTimeRemaining('Ended');
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [auction.end_time]);
  
  const reserveMet = auction.current_bid_egp >= auction.reserve_price_egp;
  
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <img 
        src={auction.vehicle.images[0]} 
        alt={`${auction.vehicle.make} ${auction.vehicle.model}`}
        className="w-full h-48 object-cover rounded-lg mb-4"
      />
      
      <h3 className="text-xl font-bold text-[#001845] mb-2">
        {auction.vehicle.year} {auction.vehicle.make} {auction.vehicle.model}
      </h3>
      
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-gray-500">Current Bid</p>
          <p className="text-2xl font-bold text-[#4C3BCF]">
            EGP {auction.current_bid_egp.toLocaleString()}
          </p>
        </div>
        
        {!reserveMet && (
          <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
            Reserve Not Met
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-1">
          <Clock size={16} />
          <span>{timeRemaining}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users size={16} />
          <span>{auction.bid_count} bids</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp size={16} />
          <span>{auction.vehicle.mileage_km.toLocaleString()} km</span>
        </div>
      </div>
      
      <button 
        onClick={() => window.location.href = `/auction/${auction.id}`}
        className="w-full bg-[#4C3BCF] text-white py-2 rounded-full hover:bg-[#002966] transition-colors"
      >
        Place Bid
      </button>
    </div>
  );
}
```

## Installation

**Prerequisites:**
- Python 3.11+
- Node.js 18+
- Oracle Database 21c or PostgreSQL 14+
- npm or yarn package manager
- Git
- Redis (for session management)

**Step-by-Step Installation Guide:**

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/AUTOUSATA.git
   cd AUTOUSATA
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   # or
   yarn install
   ```

4. **Set up Oracle/PostgreSQL Database**
   ```bash
   # Create database
   createdb AUTOUSATA_db
   
   # Run migrations (SQLAlchemy)
   cd ../backend
   flask db upgrade
   ```

5. **Configure Environment Variables**
   
   Create `.env` file in `backend/` directory:
   ```env
   DATABASE_URL=oracle://user:password@localhost:1521/ORCL
   # Or for PostgreSQL: postgresql://user:password@localhost:5432/AUTOUSATA_db
   JWT_SECRET_KEY=your-secret-key-here
   PAYMOB_API_KEY=your-paymob-api-key
   PAYMOB_INTEGRATION_ID=your-integration-id
   REDIS_URL=redis://localhost:6379/0
   FLASK_ENV=development
   ```
   
   Create `.env.local` file in `frontend/` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXT_PUBLIC_PAYMOB_PUBLIC_KEY=your-public-key
   ```

6. **Start Redis Server**
   ```bash
   redis-server
   ```

7. **Start the Development Servers**
   
   Backend (Flask):
   ```bash
   cd backend
   flask run
   # Server runs on http://localhost:5000
   ```
   
   Frontend (Next.js):
   ```bash
   cd frontend
   npm run dev
   # or
   yarn dev
   # Server runs on http://localhost:3000
   ```

**Troubleshooting Common Issues:**

1. **Oracle Database Connection Errors:**
   ```bash
   # Install Oracle Instant Client
   # macOS
   brew tap InstantClientTap/instantclient
   brew install instantclient-basic
   
   # Set environment variables
   export ORACLE_HOME=/usr/local/lib/instantclient
   export LD_LIBRARY_PATH=$ORACLE_HOME:$LD_LIBRARY_PATH
   ```

2. **SQLAlchemy Migration Issues:**
   ```bash
   # Reset database (development only!)
   flask db downgrade base
   flask db upgrade
   ```

3. **Next.js Build Errors:**
   ```bash
   # Clear cache and rebuild
   rm -rf .next
   npm run build
   ```

4. **Redis Connection Refused:**
   ```bash
   # Check Redis is running
   redis-cli ping
   # Should return PONG
   
   # If not, start Redis
   redis-server /usr/local/etc/redis.conf
   ```

5. **Port Already in Use:**
   ```bash
   # Find and kill process using port 5000
   lsof -ti:5000 | xargs kill -9
   
   # Or use different port
   flask run --port 5001
   ```

## API Reference

**Base URL:** http://localhost:5000/api

**Authentication:** All protected endpoints require `Authorization: Bearer <JWT_TOKEN>` header

### Core Endpoints

**Authentication:** `/api/auth`
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/verify-phone` - Phone OTP verification
- `POST /auth/verify-email` - Email verification
- `POST /auth/refresh` - Refresh JWT token

**Users:** `/api/users`
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update current user profile
- `GET /users/:id` - Get user profile by ID (public info only)
- `POST /users/kyc` - Submit KYC documents

**Vehicles:** `/api/vehicles`
- `GET /vehicles` - List all active vehicles (with filters)
- `POST /vehicles` - Create vehicle listing (seller only)
- `GET /vehicles/:id` - Get vehicle details
- `PUT /vehicles/:id` - Update vehicle listing (seller only)
- `DELETE /vehicles/:id` - Delete draft listing (seller only)

**Auctions:** `/api/auctions`
- `GET /auctions` - List all live auctions
- `POST /auctions` - Create auction (seller only)
- `GET /auctions/:id` - Get auction details
- `PUT /auctions/:id` - Update auction (draft only)
- `POST /auctions/:id/start` - Start auction manually

**Bids:** `/api/bids`
- `GET /bids` - Get user's bid history
- `POST /bids` - Place a bid
- `GET /bids/auction/:auction_id` - Get auction bid history

**Payments:** `/api/payments`
- `POST /payments` - Initiate payment
- `GET /payments/:id` - Get payment status
- `POST /payments/webhook` - Paymob webhook endpoint

**Escrow:** `/api/escrow`
- `GET /escrow/:id` - Get escrow status
- `POST /escrow/:id/confirm` - Confirm transfer/receipt
- `POST /escrow/:id/dispute` - File dispute

**Inspections:** `/api/inspections`
- `POST /inspections/request` - Request inspection (seller)
- `GET /inspections/:id` - Get inspection report
- `PUT /inspections/:id` - Update inspection (inspector only)

**Admin:** `/api/admin`
- `GET /admin/kyc` - KYC review queue
- `PUT /admin/kyc/:id/approve` - Approve KYC
- `PUT /admin/kyc/:id/reject` - Reject KYC
- `GET /admin/users` - List all users
- `PUT /admin/users/:id/ban` - Ban user

## How to Use?

**Getting Started Guide:**

**For Buyers:**
1. Create an account with email and phone number
2. Verify phone (OTP) and email (link)
3. Browse active auctions by category, price range, or location
4. View detailed vehicle information and inspection reports
5. (Optional) Get pre-approved for financing through partner banks
6. Place bids on auctions you're interested in
7. If you win, complete payment within 48 hours
8. Confirm vehicle receipt after ownership transfer
9. Rate the seller to build trust in the community

**For Sellers:**
1. Create an account and verify phone/email
2. Submit KYC documents (National ID + selfie)
3. Wait for admin approval (48-hour SLA)
4. Create vehicle listing with comprehensive details
5. Schedule third-party inspection
6. Once inspection passes, publish listing and create auction
7. Set reserve price (minimum acceptable), starting bid, and duration
8. Monitor bids in real-time during auction
9. If reserve met and auction ends, upload ownership transfer documents
10. Receive payout 2-3 days after buyer confirms receipt
11. Rate the buyer

**For Inspectors:**
1. Receive invitation from admin (invite-only system)
2. Accept inspection requests in your region
3. Conduct on-site 200-point vehicle inspection
4. Upload photos, report, and pass/fail status
5. Submit inspection for admin review
6. Receive per-inspection compensation

**For Admins:**
1. Access admin dashboard at `/admin`
2. Review KYC submissions in approval queue
3. Approve/reject with reasons (48-hour SLA)
4. Monitor active auctions and transactions
5. Resolve payment disputes through escrow adjudication
6. Ban users for violations
7. Generate revenue and performance reports

**Detailed Usage Instructions:** Comprehensive video tutorials and user guides available at `docs.AUTOUSATA.com` (coming soon)

## Contribute

We welcome contributions from developers passionate about transforming Egypt's automotive market!

**Areas for Contribution:**
- Implement real-time bidding with WebSockets (replacing 30-second polling)
- Add advanced fraud detection using machine learning
- Build mobile apps (iOS/Android) using React Native
- Expand payment gateway integrations (Stripe, Fawry, Vodafone Cash)
- Create dealer analytics dashboard with predictive pricing
- Implement peer-to-peer lending module (subject to CBE approval)
- Add 360° virtual vehicle tours and AR inspection features
- Optimize database queries and add Redis caching layer
- Write comprehensive unit and integration tests
- Improve accessibility (WCAG 2.1 AA compliance)

**How to Contribute:**
1. **Fork the Repository:** Create your own fork of the project
2. **Create a Branch:** Make a new branch for your feature or bugfix
   ```bash
   git checkout -b feature/real-time-bidding
   ```
3. **Make Your Changes:** Implement improvements following code style guidelines
4. **Write Tests:** Add unit tests for new features
5. **Test Locally:** Ensure all tests pass
   ```bash
   # Backend tests
   cd backend
   pytest
   
   # Frontend tests
   cd frontend
   npm run test
   ```
6. **Commit Your Changes:** Use conventional commit format
   ```bash
   git commit -m "feat: add WebSocket real-time bidding"
   ```
7. **Push to Your Fork:** Push changes to your forked repository
8. **Submit a Pull Request:** Open a PR with clear description of changes and motivation

**Code Review Process:**
- All PRs reviewed by 2+ team members
- CI/CD pipeline must pass (linting, tests, build)
- Security scan for vulnerabilities
- Performance impact assessment for critical paths

## Credits

**Development Team:** Maya, Hala, Kevin, Ahmed, Ali

**Founders & Leadership:**
- Project Lead & Product Manager
- Lead Backend Engineer (Flask/Oracle)
- Lead Frontend Engineer (Next.js/React)
- DevOps & Infrastructure Engineer


**Acknowledgments:**

This project was developed as part of MLG Internship Program 2026.

We would like to sincerely thank:

- **MLG Engineers** Eng Elgohary, Eng Ashraf, Eng George
- **Open-Source Community:** For the incredible frameworks and tools that power AUTOUSATA

**Inspiration & Resources:**

- **International Benchmarks:** Cars24 (India), Copart (US), Manheim (US), Sylndr (Egypt)
- **Market Research:** TechSci Research, Mordor Intelligence, DataBridge, Credence Research
- **Industry Reports:** Wamda, MENAbytes, TechCrunch Middle East, Enterprise
- **Technical Documentation:** Flask documentation, Next.js documentation, SQLAlchemy documentation, Oracle Database documentation
- **Design Inspiration:** Stripe, Linear, Vercel for clean UI/UX patterns

*Additional credits and acknowledgments will be added as the project evolves.*

## License

**License Type:**
Distributed under the MIT License. See `LICENSE` for more information.

**Third-Party Licenses:**
- Paymob SDK - Licensed under Paymob Terms of Service
- Oracle Database - Licensed under Oracle Technology Network License Agreement
- Stripe (Future) - Licensed under Stripe Terms of Service

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Oracle](https://img.shields.io/badge/Database-Oracle-F80000?style=flat-square&logo=oracle)](https://www.oracle.com/database/)
[![Paymob](https://img.shields.io/badge/Payments-Paymob-00A650?style=flat-square)](https://paymob.com)

---

**Project Repository:** [github.com/your-org/AUTOUSATA](https://github.com/your-org/AUTOUSATA)

**Documentation:** [docs.AUTOUSATA.com](https://docs.AUTOUSATA.com) (coming soon)

**Contact:** 
- **General Inquiries:** info@AUTOUSATA.com
- **Technical Support:** support@AUTOUSATA.com
- **Business Partnerships:** partnerships@AUTOUSATA.com

**Social Media:**
- Twitter: [@AUTOUSATA](https://twitter.com/AUTOUSATA)
- LinkedIn: [AUTOUSATA](https://linkedin.com/company/AUTOUSATA)
- Instagram: [@AUTOUSATA_egypt](https://instagram.com/AUTOUSATA_egypt)

**Last Updated:** January 2026

---

<div align="center">

### Master of Your Car. Master of Your Deal.

**European excellence, powered by Egyptian spirit**

*Built with أمانة (trust) for Egypt's automotive future*

</div>
