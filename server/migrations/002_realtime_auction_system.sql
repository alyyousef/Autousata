-- =====================================================
-- Real-Time Auction System - Database Migrations
-- =====================================================
-- Execute these SQL statements in your Oracle database
-- to support Socket.IO real-time bidding and webhooks
-- 
-- HOW TO RUN:
-- 1. Connect to your Oracle database:
--    sqlplus username/password@database
-- 2. Run this entire script:
--    @server/migrations/002_realtime_auction_system.sql
-- 3. Check for success messages (green checkmarks ✓)
-- 
-- This script is IDEMPOTENT - safe to run multiple times!
-- =====================================================

-- Enable output from DBMS_OUTPUT.PUT_LINE
SET SERVEROUTPUT ON;

-- 1. Create optimized composite index for auction scheduler
-- This dramatically improves performance for queries like:
-- WHERE STATUS='live' AND END_TIME BETWEEN NOW() AND NOW() + INTERVAL '5' MINUTE

-- Drop old indexes if they exist (using PL/SQL exception handling)
BEGIN
    EXECUTE IMMEDIATE 'DROP INDEX IDX_AUCTIONS_STATUS';
    DBMS_OUTPUT.PUT_LINE('✓ Dropped old index IDX_AUCTIONS_STATUS');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -1418 THEN -- ORA-01418: specified index does not exist
            RAISE;
        ELSE
            DBMS_OUTPUT.PUT_LINE('! Index IDX_AUCTIONS_STATUS does not exist, skipping');
        END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP INDEX IDX_AUCTIONS_ENDTIME';
    DBMS_OUTPUT.PUT_LINE('✓ Dropped old index IDX_AUCTIONS_ENDTIME');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -1418 THEN
            RAISE;
        ELSE
            DBMS_OUTPUT.PUT_LINE('! Index IDX_AUCTIONS_ENDTIME does not exist, skipping');
        END IF;
END;
/

-- Create composite index
BEGIN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_AUCTIONS_STATUS_ENDTIME ON AUCTIONS(STATUS, END_TIME)';
    DBMS_OUTPUT.PUT_LINE('✓ Created composite index IDX_AUCTIONS_STATUS_ENDTIME');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -955 THEN
            DBMS_OUTPUT.PUT_LINE('! Index IDX_AUCTIONS_STATUS_ENDTIME already exists, skipping');
        ELSE
            RAISE;
        END IF;
END;
/

-- 2. Create WEBHOOK_SUBSCRIPTIONS table for user webhook registrations
-- Note: WEBHOOK_EVENTS table already exists for Stripe idempotency
BEGIN
    EXECUTE IMMEDIATE 'CREATE TABLE WEBHOOK_SUBSCRIPTIONS (
        ID VARCHAR2(36) PRIMARY KEY,
        USER_ID VARCHAR2(36) NOT NULL,
        EVENT_TYPE VARCHAR2(50) NOT NULL,
        WEBHOOK_URL VARCHAR2(500) NOT NULL,
        SECRET_KEY VARCHAR2(100) NOT NULL,
        IS_ACTIVE NUMBER(1) DEFAULT 1 NOT NULL,
        CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT FK_WH_SUB_USER FOREIGN KEY (USER_ID) REFERENCES USERS(ID) ON DELETE CASCADE,
        CONSTRAINT CHK_WH_SUB_ACTIVE CHECK (IS_ACTIVE IN (0, 1)),
        CONSTRAINT CHK_WH_EVENT_TYPE CHECK (EVENT_TYPE IN (
            ''bid.placed'',
            ''auction.ending_soon'',
            ''user.outbid'',
            ''auction.ended'',
            ''auction.winner_declared''
        ))
    )';
    DBMS_OUTPUT.PUT_LINE('✓ Created WEBHOOK_SUBSCRIPTIONS table');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -955 THEN -- ORA-00955: name is already used by an existing object
            DBMS_OUTPUT.PUT_LINE('! WEBHOOK_SUBSCRIPTIONS table already exists, skipping');
        ELSE
            RAISE;
        END IF;
END;
/

-- Add indexes for webhook subscriptions
BEGIN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_WH_SUB_USER ON WEBHOOK_SUBSCRIPTIONS(USER_ID)';
    DBMS_OUTPUT.PUT_LINE('✓ Created index IDX_WH_SUB_USER');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -955 THEN
            DBMS_OUTPUT.PUT_LINE('! Index IDX_WH_SUB_USER already exists, skipping');
        ELSE
            RAISE;
        END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_WH_SUB_EVENT ON WEBHOOK_SUBSCRIPTIONS(EVENT_TYPE, IS_ACTIVE)';
    DBMS_OUTPUT.PUT_LINE('✓ Created index IDX_WH_SUB_EVENT');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -955 THEN
            DBMS_OUTPUT.PUT_LINE('! Index IDX_WH_SUB_EVENT already exists, skipping');
        ELSE
            RAISE;
        END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_WH_SUB_ACTIVE ON WEBHOOK_SUBSCRIPTIONS(IS_ACTIVE)';
    DBMS_OUTPUT.PUT_LINE('✓ Created index IDX_WH_SUB_ACTIVE');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -955 THEN
            DBMS_OUTPUT.PUT_LINE('! Index IDX_WH_SUB_ACTIVE already exists, skipping');
        ELSE
            RAISE;
        END IF;
END;
/

-- 3. Create WEBHOOK_DELIVERY_LOG table for debugging and monitoring
BEGIN
    EXECUTE IMMEDIATE 'CREATE TABLE WEBHOOK_DELIVERY_LOG (
        ID VARCHAR2(36) PRIMARY KEY,
        SUBSCRIPTION_ID VARCHAR2(36) NOT NULL,
        EVENT_TYPE VARCHAR2(50) NOT NULL,
        PAYLOAD CLOB NOT NULL,
        RESPONSE_STATUS NUMBER(3),
        RESPONSE_BODY CLOB,
        ATTEMPT_NUMBER NUMBER(2) DEFAULT 1 NOT NULL,
        DELIVERED_AT TIMESTAMP,
        FAILED_AT TIMESTAMP,
        ERROR_MESSAGE CLOB,
        CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT FK_WH_LOG_SUB FOREIGN KEY (SUBSCRIPTION_ID) REFERENCES WEBHOOK_SUBSCRIPTIONS(ID) ON DELETE CASCADE
    )';
    DBMS_OUTPUT.PUT_LINE('✓ Created WEBHOOK_DELIVERY_LOG table');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -955 THEN
            DBMS_OUTPUT.PUT_LINE('! WEBHOOK_DELIVERY_LOG table already exists, skipping');
        ELSE
            RAISE;
        END IF;
END;
/

-- Add indexes for webhook delivery log
BEGIN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_WH_LOG_SUB ON WEBHOOK_DELIVERY_LOG(SUBSCRIPTION_ID)';
    DBMS_OUTPUT.PUT_LINE('✓ Created index IDX_WH_LOG_SUB');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -955 THEN
            DBMS_OUTPUT.PUT_LINE('! Index IDX_WH_LOG_SUB already exists, skipping');
        ELSE
            RAISE;
        END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_WH_LOG_CREATED ON WEBHOOK_DELIVERY_LOG(CREATED_AT)';
    DBMS_OUTPUT.PUT_LINE('✓ Created index IDX_WH_LOG_CREATED');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -955 THEN
            DBMS_OUTPUT.PUT_LINE('! Index IDX_WH_LOG_CREATED already exists, skipping');
        ELSE
            RAISE;
        END IF;
END;
/

-- 4. Add indexes for bid history queries (if not already exist)
-- These may already exist from the original schema
BEGIN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_BIDS_AUCTION_TIME ON BIDS(AUCTION_ID, CREATED_AT DESC)';
    DBMS_OUTPUT.PUT_LINE('✓ Created index IDX_BIDS_AUCTION_TIME');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -955 THEN
            DBMS_OUTPUT.PUT_LINE('! Index IDX_BIDS_AUCTION_TIME already exists, skipping');
        ELSE
            RAISE;
        END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_BIDS_BIDDER ON BIDS(BIDDER_ID)';
    DBMS_OUTPUT.PUT_LINE('✓ Created index IDX_BIDS_BIDDER');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -955 OR SQLCODE = -1408 THEN -- ORA-00955: name exists, ORA-01408: column list already indexed
            DBMS_OUTPUT.PUT_LINE('! Index IDX_BIDS_BIDDER already exists, skipping');
        ELSE
            RAISE;
        END IF;
END;
/

-- 5. Verify existing BIDS table columns are ready for real-time
-- The following columns should already exist:
-- - BID_SOURCE (for 'manual', 'auto_proxy', 'auto_extend')
-- - PROXY_BID_MAX_EGP (for proxy bidding)
-- - STATUS (for 'accepted', 'rejected', 'retracted')
-- - IP_ADDRESS (for tracking bid source)

DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM USER_TAB_COLUMNS 
    WHERE TABLE_NAME = 'BIDS' 
    AND COLUMN_NAME IN ('BID_SOURCE', 'PROXY_BID_MAX_EGP', 'STATUS', 'IP_ADDRESS');
    
    IF v_count = 4 THEN
        DBMS_OUTPUT.PUT_LINE('✓ BIDS table has all required columns for real-time bidding');
    ELSE
        DBMS_OUTPUT.PUT_LINE('! WARNING: BIDS table is missing ' || (4 - v_count) || ' required column(s)');
        DBMS_OUTPUT.PUT_LINE('  Expected: BID_SOURCE, PROXY_BID_MAX_EGP, STATUS, IP_ADDRESS');
    END IF;
END;
/

-- 6. Verify AUCTIONS table has auto-extend fields
-- The following columns should already exist:
-- - AUTO_EXTEND_ENABLED
-- - AUTO_EXTEND_MINUTES
-- - MAX_AUTO_EXTENSIONS
-- - AUTO_EXT_COUNT
-- - LEADING_BIDDER_ID

DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM USER_TAB_COLUMNS 
    WHERE TABLE_NAME = 'AUCTIONS' 
    AND COLUMN_NAME IN ('AUTO_EXTEND_ENABLED', 'AUTO_EXTEND_MINUTES', 'MAX_AUTO_EXTENSIONS', 'AUTO_EXT_COUNT', 'LEADING_BIDDER_ID');
    
    IF v_count = 5 THEN
        DBMS_OUTPUT.PUT_LINE('✓ AUCTIONS table has all required columns for auto-extension');
    ELSE
        DBMS_OUTPUT.PUT_LINE('! WARNING: AUCTIONS table is missing ' || (5 - v_count) || ' required column(s)');
        DBMS_OUTPUT.PUT_LINE('  Expected: AUTO_EXTEND_ENABLED, AUTO_EXTEND_MINUTES, MAX_AUTO_EXTENSIONS, AUTO_EXT_COUNT, LEADING_BIDDER_ID');
    END IF;
END;
/

-- 7. Create view for real-time auction monitoring
CREATE OR REPLACE VIEW V_LIVE_AUCTIONS AS
SELECT 
    a.ID as AUCTION_ID,
    a.VEHICLE_ID,
    a.SELLER_ID,
    a.STATUS,
    a.START_TIME,
    a.END_TIME,
    a.ORIGINAL_END_TIME,
    a.CURRENT_BID_EGP,
    a.BID_COUNT,
    a.LEADING_BIDDER_ID,
    a.AUTO_EXT_COUNT,
    v.MAKE,
    v.MODEL,
    v.YEAR_MFG,
    (SELECT COUNT(*) FROM BIDS b WHERE b.AUCTION_ID = a.ID AND b.STATUS = 'accepted') as TOTAL_BIDS,
    CASE 
        WHEN a.END_TIME <= CURRENT_TIMESTAMP THEN 'ENDED'
        WHEN a.END_TIME <= CURRENT_TIMESTAMP + INTERVAL '5' MINUTE THEN 'ENDING_SOON'
        ELSE 'ACTIVE'
    END as URGENCY_STATUS
FROM AUCTIONS a
JOIN VEHICLES v ON a.VEHICLE_ID = v.ID
WHERE a.STATUS = 'live';

BEGIN
    DBMS_OUTPUT.PUT_LINE('✓ Created view V_LIVE_AUCTIONS');
END;
/

-- 8. Add trigger to update WEBHOOK_SUBSCRIPTIONS.UPDATED_AT
CREATE OR REPLACE TRIGGER TRG_WH_SUB_UPDATED_AT
BEFORE UPDATE ON WEBHOOK_SUBSCRIPTIONS
FOR EACH ROW
BEGIN
    :NEW.UPDATED_AT := CURRENT_TIMESTAMP;
END;
/

BEGIN
    DBMS_OUTPUT.PUT_LINE('✓ Created trigger TRG_WH_SUB_UPDATED_AT');
END;
/

COMMIT;

BEGIN
    DBMS_OUTPUT.PUT_LINE('');
    DBMS_OUTPUT.PUT_LINE('=====================================================');
    DBMS_OUTPUT.PUT_LINE('        Migration Complete - Summary');
    DBMS_OUTPUT.PUT_LINE('=====================================================');
    DBMS_OUTPUT.PUT_LINE('✓ Optimized composite index for auction scheduler');
    DBMS_OUTPUT.PUT_LINE('✓ WEBHOOK_SUBSCRIPTIONS table created');
    DBMS_OUTPUT.PUT_LINE('✓ WEBHOOK_DELIVERY_LOG table created');
    DBMS_OUTPUT.PUT_LINE('✓ All indexes created successfully');
    DBMS_OUTPUT.PUT_LINE('✓ Real-time auction monitoring view created');
    DBMS_OUTPUT.PUT_LINE('✓ Webhook subscription trigger created');
    DBMS_OUTPUT.PUT_LINE('');
    DBMS_OUTPUT.PUT_LINE('Your database is now ready for real-time auctions!');
    DBMS_OUTPUT.PUT_LINE('Next: Start the Node.js server to begin Socket.IO');
    DBMS_OUTPUT.PUT_LINE('=====================================================');
END;
/
