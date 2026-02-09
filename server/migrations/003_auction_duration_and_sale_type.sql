-- Migration 003: Auction Duration & Sale Type Support
-- Adds DURATION_DAYS column to AUCTIONS for deferred start/end time calculation on admin approval.
-- No changes needed on VEHICLES table — sale type is inferred from presence of an AUCTIONS row.

-- 1. Add DURATION_DAYS column to AUCTIONS
ALTER TABLE DIP.AUCTIONS ADD (DURATION_DAYS NUMBER(3) DEFAULT 3);

-- 2. Backfill existing auctions: compute duration from END_TIME - START_TIME
UPDATE DIP.AUCTIONS
SET DURATION_DAYS = GREATEST(1, ROUND(EXTRACT(DAY FROM (END_TIME - START_TIME))))
WHERE DURATION_DAYS IS NULL;

-- 3. Add index for public vehicle browse (non-auctioned, active vehicles)
CREATE INDEX IDX_VEHICLES_STATUS_ACTIVE ON DIP.VEHICLES (STATUS)
    TABLESPACE USERS;

COMMENT ON COLUMN DIP.AUCTIONS.DURATION_DAYS IS 'Auction duration in days set by seller. Used to calculate START_TIME/END_TIME on admin approval.';
