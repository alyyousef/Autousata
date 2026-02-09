-- =====================================================
-- Fix Direct Purchase Payment Flow
-- =====================================================
-- This migration fixes issues with direct vehicle purchases:
-- 1. Make AUCTION_ID nullable for direct purchases
-- 2. Add VEHICLE_ID to track direct purchase vehicles
-- =====================================================

-- 1. Add VEHICLE_ID column to PAYMENTS table
-- This is needed for direct purchases where there's no auction
ALTER TABLE PAYMENTS ADD VEHICLE_ID VARCHAR2(36) NULL;

-- Add foreign key constraint
ALTER TABLE PAYMENTS ADD CONSTRAINT FK_PAYMENTS_VEHICLE 
    FOREIGN KEY (VEHICLE_ID) REFERENCES VEHICLES(ID);

-- Add index for performance
CREATE INDEX IDX_PAYMENTS_VEHICLE ON PAYMENTS(VEHICLE_ID);

-- 2. Make AUCTION_ID nullable (in case it has NOT NULL constraint)
-- First, check if there are any existing records with NULL AUCTION_ID
-- Oracle doesn't allow direct modification if NOT NULL constraint exists
-- We need to drop and recreate without NOT NULL

-- Note: This command will fail safely if AUCTION_ID is already nullable
-- You can run this manually: 
-- ALTER TABLE PAYMENTS MODIFY AUCTION_ID NULL;

BEGIN
    EXECUTE IMMEDIATE 'ALTER TABLE PAYMENTS MODIFY AUCTION_ID NULL';
    DBMS_OUTPUT.PUT_LINE('AUCTION_ID is now nullable');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -1451 THEN
            DBMS_OUTPUT.PUT_LINE('AUCTION_ID is already nullable');
        ELSE
            RAISE;
        END IF;
END;
/

-- 3. Add constraint to ensure either AUCTION_ID or VEHICLE_ID is set
ALTER TABLE PAYMENTS ADD CONSTRAINT CHK_PAYMENTS_AUCTION_OR_VEHICLE 
    CHECK (
        (AUCTION_ID IS NOT NULL AND VEHICLE_ID IS NULL) OR
        (AUCTION_ID IS NULL AND VEHICLE_ID IS NOT NULL)
    );

-- 4. Add PURCHASE_TYPE column to distinguish auction vs direct purchases
ALTER TABLE PAYMENTS ADD PURCHASE_TYPE VARCHAR2(20) DEFAULT 'auction' NOT NULL;

-- Add constraint for valid purchase types
ALTER TABLE PAYMENTS ADD CONSTRAINT CHK_PAYMENTS_PURCHASE_TYPE 
    CHECK (PURCHASE_TYPE IN ('auction', 'direct'));

-- 5. Add index for better query performance on purchase type
CREATE INDEX IDX_PAYMENTS_PURCHASE_TYPE ON PAYMENTS(PURCHASE_TYPE);

-- 6. Add VEHICLE_ID to ESCROWS table for direct purchases
ALTER TABLE ESCROWS ADD VEHICLE_ID VARCHAR2(36) NULL;

-- Add foreign key constraint
ALTER TABLE ESCROWS ADD CONSTRAINT FK_ESCROWS_VEHICLE 
    FOREIGN KEY (VEHICLE_ID) REFERENCES VEHICLES(ID);

-- Add index for performance
CREATE INDEX IDX_ESCROWS_VEHICLE ON ESCROWS(VEHICLE_ID);

-- 7. Make AUCTION_ID in ESCROWS nullable for direct purchases
BEGIN
    EXECUTE IMMEDIATE 'ALTER TABLE ESCROWS MODIFY AUCTION_ID NULL';
    DBMS_OUTPUT.PUT_LINE('ESCROWS.AUCTION_ID is now nullable');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -1451 THEN
            DBMS_OUTPUT.PUT_LINE('ESCROWS.AUCTION_ID is already nullable');
        ELSE
            RAISE;
        END IF;
END;
/

-- 8. Add constraint to ensure either AUCTION_ID or VEHICLE_ID is set in ESCROWS
ALTER TABLE ESCROWS ADD CONSTRAINT CHK_ESCROWS_AUCTION_OR_VEHICLE 
    CHECK (
        (AUCTION_ID IS NOT NULL AND VEHICLE_ID IS NULL) OR
        (AUCTION_ID IS NULL AND VEHICLE_ID IS NOT NULL)
    );

-- =====================================================
-- ROLLBACK SCRIPT (if needed)
-- =====================================================
/*
-- Drop ESCROWS constraints and columns
ALTER TABLE ESCROWS DROP CONSTRAINT CHK_ESCROWS_AUCTION_OR_VEHICLE;
ALTER TABLE ESCROWS DROP CONSTRAINT FK_ESCROWS_VEHICLE;
DROP INDEX IDX_ESCROWS_VEHICLE;
ALTER TABLE ESCROWS DROP COLUMN VEHICLE_ID;

-- Drop PAYMENTS constraints, indexes, and columns
DROP INDEX IDX_PAYMENTS_PURCHASE_TYPE;
DROP INDEX IDX_PAYMENTS_VEHICLE;
ALTER TABLE PAYMENTS DROP CONSTRAINT CHK_PAYMENTS_PURCHASE_TYPE;
ALTER TABLE PAYMENTS DROP CONSTRAINT CHK_PAYMENTS_AUCTION_OR_VEHICLE;
ALTER TABLE PAYMENTS DROP CONSTRAINT FK_PAYMENTS_VEHICLE;
ALTER TABLE PAYMENTS DROP COLUMN PURCHASE_TYPE;
ALTER TABLE PAYMENTS DROP COLUMN VEHICLE_ID;
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Verify the PAYMENTS changes
SELECT COLUMN_NAME, NULLABLE, DATA_TYPE 
FROM USER_TAB_COLUMNS 
WHERE TABLE_NAME = 'PAYMENTS' 
AND COLUMN_NAME IN ('AUCTION_ID', 'VEHICLE_ID', 'PURCHASE_TYPE');

-- Verify the ESCROWS changes
SELECT COLUMN_NAME, NULLABLE, DATA_TYPE 
FROM USER_TAB_COLUMNS 
WHERE TABLE_NAME = 'ESCROWS' 
AND COLUMN_NAME IN ('AUCTION_ID', 'VEHICLE_ID');

-- Check PAYMENTS constraints
SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, SEARCH_CONDITION
FROM USER_CONSTRAINTS
WHERE TABLE_NAME = 'PAYMENTS'
AND (CONSTRAINT_NAME LIKE '%AUCTION%' OR CONSTRAINT_NAME LIKE '%VEHICLE%' OR CONSTRAINT_NAME LIKE '%PURCHASE%');

-- Check ESCROWS constraints  
SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, SEARCH_CONDITION
FROM USER_CONSTRAINTS
WHERE TABLE_NAME = 'ESCROWS'
AND (CONSTRAINT_NAME LIKE '%AUCTION%' OR CONSTRAINT_NAME LIKE '%VEHICLE%');
