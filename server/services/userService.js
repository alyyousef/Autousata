const oracledb = require('oracledb');
const db = require('../config/db');
const sendEmail = require('./emailService').sendEmail;

const sellerlistings=async(userId)=>{
    let connection;
    try{
        connection=await db.getConnection();
        const result=await connection.execute(
            `SELECT v.*, U.ID AS BUYER_ID, U.EMAIL AS BUYER_EMAIL, U.FIRST_NAME || ' ' || U.LAST_NAME AS BUYER_NAME, U.PHONE AS BUYER_PHONE, E.TOTAL_AMOUNT_EGP,E.COMMISSION_EGP,E.PROCESSOR_FEE_EGP,E.STATUS AS ESCROW_STATUS,E.SELLER_PAYOUT_EGP
            FROM DIP.VEHICLES V LEFT JOIN DIP.ESCROWS E ON V.ID=E.VEHICLE_ID LEFT JOIN DIP.USERS U ON E.BUYER_ID=U.ID
            WHERE V.SELLER_ID=:userId`,
            {userId},
            { outFormat: oracledb.OUT_FORMAT_OBJECT }

        );
        return result.rows.map((v) => ({
            id: v.ID,
            sellerId: v.SELLER_ID,
            make: v.MAKE,
            model: v.MODEL,
            year: v.YEAR_MFG,
            milage: v.MILEAGE_KM,
            vin: v.VIN,
            plate_number: v.PLATE_NUMBER,
            color: v.COLOR,
            body_type: v.BODY_TYPE,
            transmission: v.TRANSMISSION,
            fuel_type: v.FUEL_TYPE,
            seats: v.SEATS, 
            car_condition: v.CAR_CONDITION,
            price: v.PRICE_EGP, 
            status: v.STATUS,
            currency: v.CURRENCY,
            description: v.DESCRIPTION,
            location: v.LOCATION_CITY,
            features: v.FEATURES,
            inspection_req: v.INSPECTION_REQ,
            inspection_report: v.INSPECTION_REPORT_ID,
            createdAt: v.CREATED_AT,
            updatedAt: v.UPDATED_AT,
            publishedAt: v.PUBLISHED_AT,
            deletedAt: v.DELETED_AT,
            viewCount: v.VIEW_COUNT,
            sale_type: v.SALE_TYPE,
            images:v.IMAGES,
            buyer:{
                id:v.BUYER_ID,
                name:v.BUYER_NAME,
                email:v.BUYER_EMAIL,
                phone:v.BUYER_PHONE
            },
            total_amount_egp:v.TOTAL_AMOUNT_EGP,
            commission_egp:v.COMMISSION_EGP,
            processor_fee_egp:v.PROCESSOR_FEE_EGP,
            seller_payout_egp:v.SELLER_PAYOUT_EGP,
            escrow_status:v.ESCROW_STATUS
           
        }));
    }
    catch(error){
        console.error('Error fetching user listings:',error);
        throw error;
    }
    finally{
        if(connection){
            try{
                await connection.close();

            }
            catch(err){
                console.error('Error closing connection:',err);
            }
        }
    }
}

const garagelisting=async(userId)=>{
    let connection;
    try{
        connection= await db.getConnection();
        const result= await connection.execute(
            `SELECT V.*, E.SELLER_ID,E.TOTAL_AMOUNT_EGP,E.COMMISSION_EGP,E.PROCESSOR_FEE_EGP,E.STATUS AS ESCROW_STATUS,E.SELLER_PAYOUT_EGP
            FROM DIP.ESCROWS E JOIN DIP.VEHICLES V ON E.VEHICLE_ID=V.ID
            WHERE E.BUYER_ID=:userId`,
            {userId},
            { outFormat: oracledb.OUT_FORMAT_OBJECT }

        )

        return result.rows.map((v) => ({
            id: v.ID,
            sellerId: v.SELLER_ID,
            make: v.MAKE,
            model: v.MODEL,
            year: v.YEAR_MFG,
            milage: v.MILEAGE_KM,
            vin: v.VIN,
            plate_number: v.PLATE_NUMBER,
            color: v.COLOR,
            body_type: v.BODY_TYPE,
            transmission: v.TRANSMISSION,
            fuel_type: v.FUEL_TYPE,
            seats: v.SEATS, 
            car_condition: v.CAR_CONDITION,
            price: v.PRICE_EGP, 
            status: v.STATUS,
            currency: v.CURRENCY,
            description: v.DESCRIPTION,
            location: v.LOCATION_CITY,
            features: v.FEATURES,
            inspection_req: v.INSPECTION_REQ,
            inspection_report: v.INSPECTION_REPORT_ID,
            createdAt: v.CREATED_AT,
            updatedAt: v.UPDATED_AT,
            publishedAt: v.PUBLISHED_AT,
            deletedAt: v.DELETED_AT,
            viewCount: v.VIEW_COUNT,
            sale_type: v.SALE_TYPE,
            images:v.IMAGES,
            total_amount_egp:v.TOTAL_AMOUNT_EGP,
            commission_egp:v.COMMISSION_EGP,
            processor_fee_egp:v.PROCESSOR_FEE_EGP,
            seller_payout_egp:v.SELLER_PAYOUT_EGP,
            escrow_status:v.ESCROW_STATUS
        }));
    }
    catch(error){
        console.error('Error fetching user listings:',error);
        throw error;
    }
    finally{
        if(connection){
            try{
                await connection.close();

            }
            catch(err){
                console.error('Error closing connection:',err);
            }
        }
    }
}

const sellerConfirmation=async(escrow_id)=>{
    let connection;
    try{
        connection=await db.getConnection();
        const result=await connection.execute(
            `UPDATE DIP.ESCROWS
            SET SELLER_TRANSFER=CURRENT_TIMESTAMP
            WHERE ID=:escrow_id`,
            { escrow_id },
            { autoCommit: true }
        );
        return result;
    }
    catch(error){
        console.error('Error updating seller confirmation:',error);
        throw error;
    }
    finally{
        if(connection){
            try{
                await connection.close();
            }
            catch(err){
                console.error('Error closing connection:',err);
            }
        }
    }
}


const buyerConfirmation=async(escrow_id)=>{
    let connection;
    try{
        connection=await db.getConnection();
        const result=await connection.execute(
            `UPDATE DIP.ESCROWS
            SET BUYER_RECEIVED=CURRENT_TIMESTAMP
            WHERE ID=:escrow_id`,
            { escrow_id },
            { autoCommit: true }
        );
        const res=await connection.execute(
            `UPDATE DIP.ESCROWS
            SET STATUS='released'
            WHERE ID=:escrow_id AND SELLER_TRANSFER IS NOT NULL AND BUYER_RECEIVED IS NOT NULL`,
            { escrow_id },
            { autoCommit: true }
        );
        return result+res;
    }
    catch(error){
        console.error('Error updating buyer confirmation:',error);
        throw error;
    }
    finally{
        if(connection){
            try{
                await connection.close();
            }
            catch(err){
                console.error('Error closing connection:',err);
            }
        }
    }
}

const buyerRefund=async(user_id,escrow_id,payment_id,vehicle_id,auction_id )=>{
    let connection;
    try{
        connection= await db.getConnection();
        const escrowUpdate=await connection.execute(
            `UPDATE DIP.ESCROWS
            SET STATUS='refunded'
            WHERE ID=:escrow_id`,
            { escrow_id },
            { autoCommit: true }
        );
        const vehicleReset=await connection.execute(
            `UPDATE DIP.VEHICLES
            SET STATUS='active'
            WHERE ID=:vehicle_id`,
            { vehicle_id },
            { autoCommit: true }
        );
        const paymentUpdate=await connection.execute(
            `UPDATE DIP.PAYMENTS
            SET STATUS='refunded',
            REFUNDED_AT=CURRENT_TIMESTAMP
            WHERE ID=:payment_id`,
            { payment_id },
            { autoCommit: true }
        );

        if(auction_id){
            const nextWinnerResult = await connection.execute(
                `SELECT B.BIDDER_ID, B.AMOUNT_EGP
                FROM DIP.BIDS B
                WHERE B.AUCTION_ID = :auction_id
                  AND B.BIDDER_ID != :user_id
                  AND B.STATUS = 'accepted'
                ORDER BY B.AMOUNT_EGP DESC, B.CREATED_AT DESC
                FETCH FIRST 1 ROW ONLY`,
                { auction_id, user_id },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (nextWinnerResult.rows && nextWinnerResult.rows.length > 0) {
                const nextWinner = nextWinnerResult.rows[0];

                await connection.execute(
                    `UPDATE DIP.AUCTIONS
                    SET STATUS = 'ended',
                        WINNER_ID = :winnerId,
                        LEADING_BIDDER_ID = :winnerId,
                        CURRENT_BID_EGP = :currentBid,
                        PAYMENT_DEADLINE = CURRENT_TIMESTAMP + INTERVAL '24' HOUR
                    WHERE ID = :auction_id`,
                    {
                        auction_id,
                        winnerId: nextWinner.BIDDER_ID,
                        currentBid: nextWinner.AMOUNT_EGP
                    },
                    { autoCommit: true }
                );
                const email=await connection.execute(
                    `SELECT EMAIL FROM DIP.USERS WHERE ID=:winnerId`,
                    { winnerId: nextWinner.BIDDER_ID },
                    { outFormat: oracledb.OUT_FORMAT_OBJECT }
                )
                sendEmail(email.rows[0].EMAIL, 'You are the winner!', 
                    'Congratulations, you have won the auction.\nPlease proceed to payment within 24 hours to secure your purchase.');

                await connection.execute(
                    `UPDATE DIP.VEHICLES
                    SET STATUS='sold'
                    WHERE ID=:vehicle_id`,
                    { vehicle_id },
                    { autoCommit: true }
                );
            } 
        }

        return (escrowUpdate.rowsAffected || 0) + (vehicleReset.rowsAffected || 0) + (paymentUpdate.rowsAffected || 0);
    }
     catch(error){
        console.error('Error updating buyer refund:',error);
        throw error;
    }
    finally{
        if(connection){
            try{
                await connection.close();
            }
            catch(err){
                console.error('Error closing connection:',err);
            }
        }
    }
}

module.exports={
    sellerlistings,
    garagelisting,
    sellerConfirmation,
    buyerConfirmation,
    buyerRefund
}