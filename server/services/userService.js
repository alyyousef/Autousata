const oracledb = require('oracledb');
const db = require('../config/db');

const sellerlistings=async(userId)=>{
    let connection;
    try{
        connection=await db.getConnection();
        const result=await connection.execute(
            `SELECT *
            FROM DIP.VEHICLES
            WHERE SELLER_ID=:userId`,
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

module.exports={
    sellerlistings,
    garagelisting
}