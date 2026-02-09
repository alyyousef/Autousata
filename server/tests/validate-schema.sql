-- ============================================================
-- AUTOUSATA Auction Database Schema Validation Script
-- ============================================================
-- Run this in SQL*Plus or Oracle SQL Developer to validate
-- your database schema for auction functionality
-- ============================================================

SET PAGESIZE 100
SET LINESIZE 200
SET FEEDBACK ON

PROMPT ============================================================
PROMPT   AUTOUSATA AUCTION SCHEMA VALIDATION
PROMPT ============================================================
PROMPT

-- ============================================================
-- 1. Check if required tables exist
-- ============================================================
PROMPT Checking for required tables...
PROMPT

SELECT 
    'AUCTIONS' AS table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS ✓' ELSE 'MISSING ✗' END AS status
FROM user_tables 
WHERE table_name = 'AUCTIONS'
UNION ALL
SELECT 
    'BIDS' AS table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS ✓' ELSE 'MISSING ✗' END AS status
FROM user_tables 
WHERE table_name = 'BIDS'
UNION ALL
SELECT 
    'VEHICLES' AS table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS ✓' ELSE 'MISSING ✗' END AS status
FROM user_tables 
WHERE table_name = 'VEHICLES'
UNION ALL
SELECT 
    'USERS' AS table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS ✓' ELSE 'MISSING ✗' END AS status
FROM user_tables 
WHERE table_name = 'USERS';

PROMPT

-- ============================================================
-- 2. Validate AUCTIONS table structure
-- ============================================================
PROMPT ============================================================
PROMPT Validating AUCTIONS table structure...
PROMPT ============================================================
PROMPT

DESCRIBE AUCTIONS;

PROMPT
PROMPT Checking for required columns in AUCTIONS table...
PROMPT

WITH required_cols AS (
    SELECT 'ID' AS col_name FROM DUAL UNION ALL
    SELECT 'VEHICLE_ID' FROM DUAL UNION ALL
    SELECT 'SELLER_ID' FROM DUAL UNION ALL
    SELECT 'STATUS' FROM DUAL UNION ALL
    SELECT 'START_TIME' FROM DUAL UNION ALL
    SELECT 'END_TIME' FROM DUAL UNION ALL
    SELECT 'ORIGINAL_END_TIME' FROM DUAL UNION ALL
    SELECT 'RESERVE_PRICE_EGP' FROM DUAL UNION ALL
    SELECT 'STARTING_BID_EGP' FROM DUAL UNION ALL
    SELECT 'CURRENT_BID_EGP' FROM DUAL UNION ALL
    SELECT 'BID_COUNT' FROM DUAL UNION ALL
    SELECT 'MIN_BID_INCREMENT' FROM DUAL UNION ALL
    SELECT 'LEADING_BIDDER_ID' FROM DUAL UNION ALL
    SELECT 'WINNER_ID' FROM DUAL UNION ALL
    SELECT 'PAYMENT_ID' FROM DUAL
)
SELECT 
    r.col_name AS required_column,
    CASE WHEN c.column_name IS NOT NULL THEN 'PRESENT ✓' ELSE 'MISSING ✗' END AS status,
    c.data_type,
    c.nullable
FROM required_cols r
LEFT JOIN user_tab_columns c 
    ON c.table_name = 'AUCTIONS' 
    AND c.column_name = r.col_name
ORDER BY r.col_name;

PROMPT

-- ============================================================
-- 3. Validate BIDS table structure
-- ============================================================
PROMPT ============================================================
PROMPT Validating BIDS table structure...
PROMPT ============================================================
PROMPT

DESCRIBE BIDS;

PROMPT
PROMPT Checking for required columns in BIDS table...
PROMPT

WITH required_cols AS (
    SELECT 'ID' AS col_name FROM DUAL UNION ALL
    SELECT 'AUCTION_ID' FROM DUAL UNION ALL
    SELECT 'BIDDER_ID' FROM DUAL UNION ALL
    SELECT 'AMOUNT_EGP' FROM DUAL UNION ALL
    SELECT 'STATUS' FROM DUAL UNION ALL
    SELECT 'BID_SOURCE' FROM DUAL UNION ALL
    SELECT 'CREATED_AT' FROM DUAL
)
SELECT 
    r.col_name AS required_column,
    CASE WHEN c.column_name IS NOT NULL THEN 'PRESENT ✓' ELSE 'MISSING ✗' END AS status,
    c.data_type,
    c.nullable
FROM required_cols r
LEFT JOIN user_tab_columns c 
    ON c.table_name = 'BIDS' 
    AND c.column_name = r.col_name
ORDER BY r.col_name;

PROMPT

-- ============================================================
-- 4. Check Foreign Key Constraints
-- ============================================================
PROMPT ============================================================
PROMPT Checking Foreign Key Constraints...
PROMPT ============================================================
PROMPT

SELECT 
    c.constraint_name,
    c.table_name,
    cc.column_name,
    r.table_name AS referenced_table,
    rc.column_name AS referenced_column
FROM user_constraints c
JOIN user_cons_columns cc ON c.constraint_name = cc.constraint_name
JOIN user_constraints r ON c.r_constraint_name = r.constraint_name
JOIN user_cons_columns rc ON r.constraint_name = rc.constraint_name
WHERE c.constraint_type = 'R'
    AND c.table_name IN ('AUCTIONS', 'BIDS')
ORDER BY c.table_name, cc.position;

PROMPT

-- ============================================================
-- 5. Check Indexes for Performance
-- ============================================================
PROMPT ============================================================
PROMPT Checking Performance Indexes...
PROMPT ============================================================
PROMPT

SELECT 
    i.index_name,
    i.table_name,
    i.uniqueness,
    LISTAGG(ic.column_name, ', ') WITHIN GROUP (ORDER BY ic.column_position) AS columns
FROM user_indexes i
JOIN user_ind_columns ic ON i.index_name = ic.index_name
WHERE i.table_name IN ('AUCTIONS', 'BIDS')
GROUP BY i.index_name, i.table_name, i.uniqueness
ORDER BY i.table_name, i.index_name;

PROMPT
PROMPT Recommended indexes:
PROMPT   - IDX_AUCTIONS_STATUS_ENDTIME (AUCTIONS: STATUS, END_TIME)
PROMPT   - IDX_AUCTIONS_PAYMENT_DEADLINE (AUCTIONS: PAYMENT_DEADLINE)
PROMPT   - IDX_BIDS_AUCTION_TIME (BIDS: AUCTION_ID, CREATED_AT)
PROMPT   - IDX_BIDS_BIDDER (BIDS: BIDDER_ID)
PROMPT

-- ============================================================
-- 6. Check Check Constraints
-- ============================================================
PROMPT ============================================================
PROMPT Checking Status Constraints...
PROMPT ============================================================
PROMPT

SELECT 
    constraint_name,
    table_name,
    SUBSTR(search_condition, 1, 100) AS constraint_condition
FROM user_constraints
WHERE table_name IN ('AUCTIONS', 'BIDS')
    AND constraint_type = 'C'
    AND constraint_name NOT LIKE 'SYS_%'
ORDER BY table_name, constraint_name;

PROMPT

-- ============================================================
-- 7. Sample Data Count
-- ============================================================
PROMPT ============================================================
PROMPT Data Count Summary...
PROMPT ============================================================
PROMPT

SELECT 'AUCTIONS' AS table_name, COUNT(*) AS row_count FROM AUCTIONS
UNION ALL
SELECT 'BIDS', COUNT(*) FROM BIDS
UNION ALL
SELECT 'VEHICLES', COUNT(*) FROM VEHICLES
UNION ALL
SELECT 'USERS', COUNT(*) FROM USERS;

PROMPT

-- ============================================================
-- 8. Auction Status Distribution
-- ============================================================
PROMPT ============================================================
PROMPT Auction Status Distribution...
PROMPT ============================================================
PROMPT

SELECT 
    status,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM AUCTIONS
GROUP BY status
ORDER BY count DESC;

PROMPT

-- ============================================================
-- 9. Recent Auctions Summary
-- ============================================================
PROMPT ============================================================
PROMPT Recent Auctions (Last 10)...
PROMPT ============================================================
PROMPT

SELECT 
    a.id,
    v.make || ' ' || v.model AS vehicle,
    a.status,
    a.current_bid_egp,
    a.bid_count,
    TO_CHAR(a.start_time, 'YYYY-MM-DD HH24:MI') AS start_time,
    TO_CHAR(a.end_time, 'YYYY-MM-DD HH24:MI') AS end_time
FROM AUCTIONS a
JOIN VEHICLES v ON a.vehicle_id = v.id
ORDER BY a.created_at DESC
FETCH FIRST 10 ROWS ONLY;

PROMPT

-- ============================================================
-- 10. Database Views Check
-- ============================================================
PROMPT ============================================================
PROMPT Checking for Recommended Views...
PROMPT ============================================================
PROMPT

SELECT 
    view_name,
    'EXISTS ✓' AS status
FROM user_views
WHERE view_name IN ('V_LIVE_AUCTIONS', 'V_PAYMENT_SUMMARY')
UNION ALL
SELECT 'V_LIVE_AUCTIONS', 'MISSING ✗' 
FROM dual 
WHERE NOT EXISTS (SELECT 1 FROM user_views WHERE view_name = 'V_LIVE_AUCTIONS')
UNION ALL
SELECT 'V_PAYMENT_SUMMARY', 'MISSING ✗' 
FROM dual 
WHERE NOT EXISTS (SELECT 1 FROM user_views WHERE view_name = 'V_PAYMENT_SUMMARY');

PROMPT

-- ============================================================
-- 11. Stored Procedures Check
-- ============================================================
PROMPT ============================================================
PROMPT Checking for Stored Procedures...
PROMPT ============================================================
PROMPT

SELECT 
    object_name,
    object_type,
    status
FROM user_objects
WHERE object_type IN ('PROCEDURE', 'FUNCTION', 'PACKAGE')
    AND object_name LIKE '%AUCTION%' OR object_name LIKE '%BID%'
ORDER BY object_type, object_name;

PROMPT

-- ============================================================
-- 12. Migration Status Check
-- ============================================================
PROMPT ============================================================
PROMPT Checking Migration Status...
PROMPT ============================================================
PROMPT

PROMPT Checking for Migration 001 (Payment Integration) columns:
SELECT 
    CASE WHEN COUNT(*) > 0 THEN 'APPLIED ✓' ELSE 'NOT APPLIED ✗' END AS migration_001_status
FROM user_tab_columns
WHERE table_name = 'AUCTIONS' 
    AND column_name = 'PAYMENT_DEADLINE';

PROMPT
PROMPT Checking for Migration 002 (Real-time Auctions) tables:
SELECT 
    CASE WHEN COUNT(*) > 0 THEN 'APPLIED ✓' ELSE 'NOT APPLIED ✗' END AS migration_002_status
FROM user_tables
WHERE table_name = 'WEBHOOK_SUBSCRIPTIONS';

PROMPT

-- ============================================================
-- VALIDATION COMPLETE
-- ============================================================
PROMPT ============================================================
PROMPT   VALIDATION COMPLETE
PROMPT ============================================================
PROMPT
PROMPT Next Steps:
PROMPT   1. Review any MISSING items above
PROMPT   2. Run migrations if needed (see server/migrations/)
PROMPT   3. Create recommended indexes for performance
PROMPT   4. Test API endpoints using Postman collection
PROMPT   5. Run automated tests: node server/tests/auction-api.test.js
PROMPT
PROMPT ============================================================
