-- =====================================================
-- AUTOUSATA Database Cleanup Script
-- =====================================================
-- Purpose: Clean all transactional data while preserving users and KYC documents
-- Cleans: VEHICLES, AUCTIONS, BIDS, PAYMENTS, ESCROWS, related tables
-- Preserves: USERS, KYC_DOCUMENTS
-- 
-- WARNING: This script will DELETE ALL data from the specified tables
-- Make sure to backup your database before running this script
-- =====================================================

-- Enable output for status messages
SET SERVEROUTPUT ON;

BEGIN
    DBMS_OUTPUT.PUT_LINE('========================================');
    DBMS_OUTPUT.PUT_LINE('Starting Database Cleanup...');
    DBMS_OUTPUT.PUT_LINE('========================================');
    DBMS_OUTPUT.PUT_LINE('');

    -- =====================================================
    -- STEP 1: Delete WEBHOOK_DELIVERY_LOG
    -- (References WEBHOOK_SUBSCRIPTIONS)
    -- =====================================================
    DBMS_OUTPUT.PUT_LINE('Step 1: Cleaning WEBHOOK_DELIVERY_LOG...');
    DELETE FROM DIP.WEBHOOK_DELIVERY_LOG;
    DBMS_OUTPUT.PUT_LINE('  - Deleted ' || SQL%ROWCOUNT || ' webhook delivery log entries');
    COMMIT;

    -- =====================================================
    -- STEP 2: Delete WEBHOOK_SUBSCRIPTIONS
    -- (May reference auction events)
    -- =====================================================
    DBMS_OUTPUT.PUT_LINE('Step 2: Cleaning WEBHOOK_SUBSCRIPTIONS...');
    DELETE FROM DIP.WEBHOOK_SUBSCRIPTIONS;
    DBMS_OUTPUT.PUT_LINE('  - Deleted ' || SQL%ROWCOUNT || ' webhook subscriptions');
    COMMIT;

    -- =====================================================
    -- STEP 3: Delete WEBHOOK_EVENTS
    -- (Stripe webhook tracking)
    -- =====================================================
    DBMS_OUTPUT.PUT_LINE('Step 3: Cleaning WEBHOOK_EVENTS...');
    DELETE FROM DIP.WEBHOOK_EVENTS;
    DBMS_OUTPUT.PUT_LINE('  - Deleted ' || SQL%ROWCOUNT || ' webhook events');
    COMMIT;

    -- =====================================================
    -- STEP 4: Delete USER_RATINGS
    -- (References AUCTIONS)
    -- =====================================================
    DBMS_OUTPUT.PUT_LINE('Step 4: Cleaning USER_RATINGS...');
    DELETE FROM DIP.USER_RATINGS;
    DBMS_OUTPUT.PUT_LINE('  - Deleted ' || SQL%ROWCOUNT || ' user ratings');
    COMMIT;

    -- =====================================================
    -- STEP 5: Delete NOTIFICATIONS
    -- (References AUCTIONS and PAYMENTS)
    -- =====================================================
    DBMS_OUTPUT.PUT_LINE('Step 5: Cleaning NOTIFICATIONS...');
    DELETE FROM DIP.NOTIFICATIONS;
    DBMS_OUTPUT.PUT_LINE('  - Deleted ' || SQL%ROWCOUNT || ' notifications');
    COMMIT;

    -- =====================================================
    -- STEP 6: Delete SELLER_PAYOUTS
    -- (References ESCROWS)
    -- =====================================================
    DBMS_OUTPUT.PUT_LINE('Step 6: Cleaning SELLER_PAYOUTS...');
    BEGIN
        EXECUTE IMMEDIATE 'DELETE FROM DIP.SELLER_PAYOUTS';
        DBMS_OUTPUT.PUT_LINE('  - Deleted ' || SQL%ROWCOUNT || ' seller payout records');
        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -942 THEN
                DBMS_OUTPUT.PUT_LINE('  - SELLER_PAYOUTS table does not exist, skipping...');
            ELSE
                RAISE;
            END IF;
    END;

    -- =====================================================
    -- STEP 7: Delete ESCROWS
    -- (References PAYMENTS, AUCTIONS, VEHICLES)
    -- =====================================================
    DBMS_OUTPUT.PUT_LINE('Step 7: Cleaning ESCROWS...');
    DELETE FROM DIP.ESCROWS;
    DBMS_OUTPUT.PUT_LINE('  - Deleted ' || SQL%ROWCOUNT || ' escrow records');
    COMMIT;

    -- =====================================================
    -- STEP 8: Break circular dependency - Update AUCTIONS
    -- (Set PAYMENT_ID to NULL to allow PAYMENTS deletion)
    -- =====================================================
    DBMS_OUTPUT.PUT_LINE('Step 8: Breaking circular dependency in AUCTIONS...');
    UPDATE DIP.AUCTIONS SET PAYMENT_ID = NULL WHERE PAYMENT_ID IS NOT NULL;
    DBMS_OUTPUT.PUT_LINE('  - Updated ' || SQL%ROWCOUNT || ' auction payment references');
    COMMIT;

    -- =====================================================
    -- STEP 9: Delete PAYMENTS
    -- (References AUCTIONS, VEHICLES)
    -- =====================================================
    DBMS_OUTPUT.PUT_LINE('Step 9: Cleaning PAYMENTS...');
    DELETE FROM DIP.PAYMENTS;
    DBMS_OUTPUT.PUT_LINE('  - Deleted ' || SQL%ROWCOUNT || ' payment records');
    COMMIT;

    -- =====================================================
    -- STEP 10: Delete BIDS
    -- (References AUCTIONS)
    -- =====================================================
    DBMS_OUTPUT.PUT_LINE('Step 10: Cleaning BIDS...');
    DELETE FROM DIP.BIDS;
    DBMS_OUTPUT.PUT_LINE('  - Deleted ' || SQL%ROWCOUNT || ' bid records');
    COMMIT;

    -- =====================================================
    -- STEP 11: Delete AUCTIONS
    -- (References VEHICLES)
    -- =====================================================
    DBMS_OUTPUT.PUT_LINE('Step 11: Cleaning AUCTIONS...');
    DELETE FROM DIP.AUCTIONS;
    DBMS_OUTPUT.PUT_LINE('  - Deleted ' || SQL%ROWCOUNT || ' auction records');
    COMMIT;

    -- =====================================================
    -- STEP 12: Delete INSPECTION_REPORTS
    -- (Referenced by VEHICLES)
    -- Note: Delete before VEHICLES to avoid FK constraint issues
    -- =====================================================
    DBMS_OUTPUT.PUT_LINE('Step 12: Cleaning INSPECTION_REPORTS...');
    DELETE FROM DIP.INSPECTION_REPORTS;
    DBMS_OUTPUT.PUT_LINE('  - Deleted ' || SQL%ROWCOUNT || ' inspection reports');
    COMMIT;

    -- =====================================================
    -- STEP 13: Delete VEHICLES
    -- (Base table for most relationships)
    -- =====================================================
    DBMS_OUTPUT.PUT_LINE('Step 13: Cleaning VEHICLES...');
    DELETE FROM DIP.VEHICLES;
    DBMS_OUTPUT.PUT_LINE('  - Deleted ' || SQL%ROWCOUNT || ' vehicle records');
    COMMIT;

    -- =====================================================
    -- Summary
    -- =====================================================
    DBMS_OUTPUT.PUT_LINE('');
    DBMS_OUTPUT.PUT_LINE('========================================');
    DBMS_OUTPUT.PUT_LINE('Database Cleanup Completed Successfully!');
    DBMS_OUTPUT.PUT_LINE('========================================');
    DBMS_OUTPUT.PUT_LINE('');
    DBMS_OUTPUT.PUT_LINE('Preserved tables:');
    DBMS_OUTPUT.PUT_LINE('  - USERS');
    DBMS_OUTPUT.PUT_LINE('  - KYC_DOCUMENTS');
    DBMS_OUTPUT.PUT_LINE('  - USER_MODERATION_LOGS');
    DBMS_OUTPUT.PUT_LINE('');
    DBMS_OUTPUT.PUT_LINE('All transactional data has been removed.');
    DBMS_OUTPUT.PUT_LINE('Users can now create fresh listings, auctions, and transactions.');
    
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('');
        DBMS_OUTPUT.PUT_LINE('========================================');
        DBMS_OUTPUT.PUT_LINE('ERROR: Cleanup failed!');
        DBMS_OUTPUT.PUT_LINE('========================================');
        DBMS_OUTPUT.PUT_LINE('Error Code: ' || SQLCODE);
        DBMS_OUTPUT.PUT_LINE('Error Message: ' || SQLERRM);
        DBMS_OUTPUT.PUT_LINE('');
        DBMS_OUTPUT.PUT_LINE('Rolling back all changes...');
        ROLLBACK;
        RAISE;
END;
/

-- =====================================================
-- Verification Queries (Optional - Uncomment to run)
-- =====================================================
/*
PROMPT
PROMPT Verifying cleanup results:
PROMPT ========================================

SELECT 'USERS' AS TABLE_NAME, COUNT(*) AS ROW_COUNT FROM DIP.USERS
UNION ALL
SELECT 'KYC_DOCUMENTS', COUNT(*) FROM DIP.KYC_DOCUMENTS
UNION ALL
SELECT 'VEHICLES', COUNT(*) FROM DIP.VEHICLES
UNION ALL
SELECT 'AUCTIONS', COUNT(*) FROM DIP.AUCTIONS
UNION ALL
SELECT 'BIDS', COUNT(*) FROM DIP.BIDS
UNION ALL
SELECT 'PAYMENTS', COUNT(*) FROM DIP.PAYMENTS
UNION ALL
SELECT 'ESCROWS', COUNT(*) FROM DIP.ESCROWS
UNION ALL
SELECT 'INSPECTION_REPORTS', COUNT(*) FROM DIP.INSPECTION_REPORTS
UNION ALL
SELECT 'NOTIFICATIONS', COUNT(*) FROM DIP.NOTIFICATIONS
UNION ALL
SELECT 'USER_RATINGS', COUNT(*) FROM DIP.USER_RATINGS
UNION ALL
SELECT 'WEBHOOK_EVENTS', COUNT(*) FROM DIP.WEBHOOK_EVENTS
UNION ALL
SELECT 'WEBHOOK_SUBSCRIPTIONS', COUNT(*) FROM DIP.WEBHOOK_SUBSCRIPTIONS
UNION ALL
SELECT 'WEBHOOK_DELIVERY_LOG', COUNT(*) FROM DIP.WEBHOOK_DELIVERY_LOG
ORDER BY TABLE_NAME;

PROMPT
PROMPT ========================================
PROMPT Cleanup verification complete!
PROMPT ========================================
*/
