-- =====================================================
-- Stripe Payment Integration - Database Migrations
-- =====================================================
-- Execute these SQL statements in your Oracle database
-- to add required fields and tables for payment processing
-- =====================================================

-- 1. Add PAYMENT_DEADLINE column to AUCTIONS table
-- This tracks the 24-hour payment window for auction winners
ALTER TABLE AUCTIONS ADD PAYMENT_DEADLINE TIMESTAMP NULL;

-- Add index for performance
CREATE INDEX idx_auctions_payment_deadline ON AUCTIONS(PAYMENT_DEADLINE);

-- 2. Create WEBHOOK_EVENTS table for idempotency
-- Prevents duplicate processing of Stripe webhook events
CREATE TABLE WEBHOOK_EVENTS (
    ID VARCHAR2(36) PRIMARY KEY,
    EVENT_ID VARCHAR2(255) UNIQUE NOT NULL,
    EVENT_TYPE VARCHAR2(100) NOT NULL,
    PROCESSED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for quick lookup
CREATE INDEX idx_webhook_events_event_id ON WEBHOOK_EVENTS(EVENT_ID);
CREATE INDEX idx_webhook_events_type ON WEBHOOK_EVENTS(EVENT_TYPE);

-- 3. Add indexes to existing PAYMENTS table for performance
CREATE INDEX idx_payments_auction ON PAYMENTS(AUCTION_ID);
CREATE INDEX idx_payments_buyer ON PAYMENTS(BUYER_ID);
CREATE INDEX idx_payments_seller ON PAYMENTS(SELLER_ID);
CREATE INDEX idx_payments_status ON PAYMENTS(STATUS);
CREATE INDEX idx_payments_gateway_order ON PAYMENTS(GATEWAY_ORDER_ID);

-- 4. Add indexes to existing ESCROWS table for performance
CREATE INDEX idx_escrows_payment ON ESCROWS(PAYMENT_ID);
CREATE INDEX idx_escrows_auction ON ESCROWS(AUCTION_ID);
CREATE INDEX idx_escrows_status ON ESCROWS(STATUS);
CREATE INDEX idx_escrows_buyer ON ESCROWS(BUYER_ID);
CREATE INDEX idx_escrows_seller ON ESCROWS(SELLER_ID);

-- 5. Verify PAYMENTS table has all required columns
-- (If not, add them - these should already exist from DATABASE.md)
-- GATEWAY_ORDER_ID - Stripe PaymentIntent ID
-- GATEWAY_TRANS_ID - Stripe Charge ID
-- PROCESSOR_FEE_EGP - Stripe's processing fee

-- Check if columns exist (informational only, no changes needed if they exist)
SELECT COLUMN_NAME 
FROM USER_TAB_COLUMNS 
WHERE TABLE_NAME = 'PAYMENTS' 
AND COLUMN_NAME IN ('GATEWAY_ORDER_ID', 'GATEWAY_TRANS_ID', 'PROCESSOR_FEE_EGP');

-- 6. Verify ESCROWS table has all required columns
-- (If not, add them - these should already exist from DATABASE.md)
-- DISPUTE_REASON - Why the escrow was disputed
-- DISPUTED_AT - When the dispute occurred

-- Check if columns exist (informational only)
SELECT COLUMN_NAME 
FROM USER_TAB_COLUMNS 
WHERE TABLE_NAME = 'ESCROWS' 
AND COLUMN_NAME IN ('DISPUTE_REASON', 'DISPUTED_AT');

-- 7. Add constraints to ensure data integrity
-- Ensure payment status is valid
ALTER TABLE PAYMENTS ADD CONSTRAINT chk_payments_status 
    CHECK (STATUS IN ('pending', 'completed', 'failed', 'refunded', 'cancelled'));

-- Ensure escrow status is valid
ALTER TABLE ESCROWS ADD CONSTRAINT chk_escrows_status 
    CHECK (STATUS IN ('held', 'released', 'disputed', 'refunded'));

-- 8. Create view for payment analytics (optional but useful)
CREATE OR REPLACE VIEW V_PAYMENT_SUMMARY AS
SELECT 
    p.ID as PAYMENT_ID,
    p.AUCTION_ID,
    p.BUYER_ID,
    p.SELLER_ID,
    p.AMOUNT_EGP,
    p.STATUS as PAYMENT_STATUS,
    p.INITIATED_AT,
    p.COMPLETED_AT,
    e.ID as ESCROW_ID,
    e.STATUS as ESCROW_STATUS,
    e.COMMISSION_EGP,
    e.SELLER_PAYOUT_EGP,
    e.BUYER_RECEIVED,
    e.SELLER_TRANSFER,
    a.VEHICLE_ID,
    v.YEAR,
    v.MAKE,
    v.MODEL
FROM PAYMENTS p
LEFT JOIN ESCROWS e ON p.ID = e.PAYMENT_ID
LEFT JOIN AUCTIONS a ON p.AUCTION_ID = a.ID
LEFT JOIN VEHICLES v ON a.VEHICLE_ID = v.ID;

-- 9. Sample query to check migration success
SELECT 
    'AUCTIONS' as TABLE_NAME,
    COUNT(*) as RECORD_COUNT,
    COUNT(PAYMENT_DEADLINE) as HAS_DEADLINE
FROM AUCTIONS
UNION ALL
SELECT 
    'WEBHOOK_EVENTS' as TABLE_NAME,
    COUNT(*) as RECORD_COUNT,
    0 as HAS_DEADLINE
FROM WEBHOOK_EVENTS
UNION ALL
SELECT 
    'PAYMENTS' as TABLE_NAME,
    COUNT(*) as RECORD_COUNT,
    COUNT(GATEWAY_ORDER_ID) as HAS_GATEWAY_ID
FROM PAYMENTS
UNION ALL
SELECT 
    'ESCROWS' as TABLE_NAME,
    COUNT(*) as RECORD_COUNT,
    COUNT(DISPUTED_AT) as HAS_DISPUTED
FROM ESCROWS;

-- =====================================================
-- ROLLBACK SCRIPT (if needed)
-- =====================================================
-- Uncomment and run these if you need to undo migrations

/*
-- Drop indexes
DROP INDEX idx_auctions_payment_deadline;
DROP INDEX idx_webhook_events_event_id;
DROP INDEX idx_webhook_events_type;
DROP INDEX idx_payments_auction;
DROP INDEX idx_payments_buyer;
DROP INDEX idx_payments_seller;
DROP INDEX idx_payments_status;
DROP INDEX idx_payments_gateway_order;
DROP INDEX idx_escrows_payment;
DROP INDEX idx_escrows_auction;
DROP INDEX idx_escrows_status;
DROP INDEX idx_escrows_buyer;
DROP INDEX idx_escrows_seller;

-- Drop constraints
ALTER TABLE PAYMENTS DROP CONSTRAINT chk_payments_status;
ALTER TABLE ESCROWS DROP CONSTRAINT chk_escrows_status;

-- Drop view
DROP VIEW V_PAYMENT_SUMMARY;

-- Drop table
DROP TABLE WEBHOOK_EVENTS;

-- Remove column
ALTER TABLE AUCTIONS DROP COLUMN PAYMENT_DEADLINE;
*/

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Run these migrations in TEST environment first
-- 2. Backup your database before running in PRODUCTION
-- 3. The PAYMENTS and ESCROWS tables should already exist
--    based on your DATABASE.md schema
-- 4. If any columns are missing, consult DATABASE.md
--    and add them before running this migration
-- 5. Test webhook event storage after Stripe setup
-- 6. Monitor index performance and adjust as needed
-- =====================================================
