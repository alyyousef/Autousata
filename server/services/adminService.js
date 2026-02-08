const oracledb = require("oracledb");



const getVehicles = async () => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT * FROM DIP.VEHICLES ORDER BY CREATED_AT DESC`,
            [],
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
        }));
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};



const filterstatusVehicles = async (filter) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT * 
             FROM DIP.VEHICLES
             WHERE LOWER(STATUS) = LOWER(:status)
             ORDER BY CREATED_AT DESC`,
            { status: filter },
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
        }));
    } catch (error) {
        console.error('Error filtering vehicles by status:', error);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};

const searchVehicles = async (searchTerm) => {
    let connection; 
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT *
                FROM DIP.VEHICLES
                WHERE LOWER(MAKE) LIKE LOWER(:search)
                    OR LOWER(MODEL) LIKE LOWER(:search)
                    OR LOWER(LOCATION_CITY) LIKE LOWER(:search)
                ORDER BY CREATED_AT DESC`,
            { search: `%${searchTerm}%` },
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
        }));
    }
    catch (error) {
        console.error('Error searching vehicles:', error);
        throw error;
    }
    finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }   
    }
};

const updateVehicleStatus = async (vehicleId, newStatus) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `UPDATE DIP.VEHICLES
             SET STATUS = :status, UPDATED_AT = CURRENT_TIMESTAMP
             WHERE ID = :vehicleId`,
            { 
                status: newStatus,
                vehicleId: vehicleId 
            },
            { autoCommit: true }
        );
        
        return {
            success: result.rowsAffected > 0,
            rowsAffected: result.rowsAffected
        };
    } catch (error) {
        console.error('Error updating vehicle status:', error);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};



const acceptVehicle = async (vehicleId) => {
    return updateVehicleStatus(vehicleId, 'active');
};




const rejectVehicle = async (vehicleId) => {
    return updateVehicleStatus(vehicleId, 'delisted');
};



const acceptinspectionrep = async (inspectionId) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `UPDATE DIP.INSPECTION_REPORTS
             SET STATUS = 'passed', REPORT_GENERATED_AT = CURRENT_TIMESTAMP
             WHERE ID = :inspectionId`,
            { inspectionId },
            { autoCommit: true }
        );
        
        return {
            success: result.rowsAffected > 0,
            rowsAffected: result.rowsAffected
        };
    } catch (error) {
        console.error('Error accepting inspection report:', error);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};



const rejectinspectionrep = async (inspectionId) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `UPDATE DIP.INSPECTION_REPORTS
             SET STATUS = 'failed', REPORT_GENERATED_AT = CURRENT_TIMESTAMP
             WHERE ID = :inspectionId`,
            { inspectionId },
            { autoCommit: true }
        );
        
        return {
            success: result.rowsAffected > 0,
            rowsAffected: result.rowsAffected
        };
    } catch (error) {
        console.error('Error rejecting inspection report:', error);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};



const addinspectionreport = async (reportData) => {
    let connection;
    try {
        
        const requiredFields = [
            'vehicleId',
            'inspectorId',
            'inspectionDate',
            'locationCity',
            'odometerReading',
            'overallCondition',
            'engineCond',
            'transmissionCond',
            'suspensionCond',
            'interiorCond',
            'paintCond'
        ];

        const missingFields = requiredFields.filter(field => !reportData[field]);
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        
        const validConditions = ['excellent', 'good', 'fair', 'poor'];
        const conditionFields = {
            overallCondition: reportData.overallCondition,
            engineCond: reportData.engineCond,
            transmissionCond: reportData.transmissionCond,
            suspensionCond: reportData.suspensionCond,
            interiorCond: reportData.interiorCond,
            paintCond: reportData.paintCond
        };

        for (const [fieldName, value] of Object.entries(conditionFields)) {
            if (!validConditions.includes(value.toLowerCase())) {
                throw new Error(`Invalid ${fieldName}: must be one of ${validConditions.join(', ')}`);
            }
        }

        
        const validStatuses = ['pending', 'passed', 'failed'];
        const status = reportData.status ? reportData.status.toLowerCase() : 'pending';
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status: must be one of ${validStatuses.join(', ')}`);
        }

        
        if (reportData.odometerReading < 0) {
            throw new Error('Odometer reading must be a positive number');
        }

        if (reportData.estimatedRepairCost && reportData.estimatedRepairCost < 0) {
            throw new Error('Estimated repair cost must be a positive number');
        }

        connection = await oracledb.getConnection();

        
        const vehicleCheck = await connection.execute(
            `SELECT ID FROM DIP.VEHICLES WHERE ID = :vehicleId`,
            { vehicleId: reportData.vehicleId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (vehicleCheck.rows.length === 0) {
            throw new Error(`Vehicle with ID ${reportData.vehicleId} does not exist`);
        }

        const duplicateCheck = await connection.execute(
            `SELECT ID FROM DIP.INSPECTION_REPORTS WHERE VEHICLE_ID = :vehicleId`,
            { vehicleId: reportData.vehicleId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (duplicateCheck.rows.length > 0) {
            throw new Error(`An inspection report already exists for vehicle ID ${reportData.vehicleId}`);
        }

        
        const inspectorCheck = await connection.execute(
            `SELECT ID, ROLE, IS_ACTIVE, IS_BANNED FROM DIP.USERS WHERE ID = :inspectorId`,
            { inspectorId: reportData.inspectorId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (inspectorCheck.rows.length === 0) {
            throw new Error(`Inspector with ID ${reportData.inspectorId} does not exist`);
        }

        const inspector = inspectorCheck.rows[0];
        if (inspector.ROLE !== 'inspector') {
            throw new Error(`User ${reportData.inspectorId} is not an inspector`);
        }

        if (inspector.IS_ACTIVE !== 1) {
            throw new Error(`Inspector ${reportData.inspectorId} is not active`);
        }

        if (inspector.IS_BANNED === 1) {
            throw new Error(`Inspector ${reportData.inspectorId} is banned`);
        }

        
        const inspectionDate = new Date(reportData.inspectionDate);
        if (isNaN(inspectionDate.getTime())) {
            throw new Error('Invalid inspection date format');
        }

        if (inspectionDate > new Date()) {
            throw new Error('Inspection date cannot be in the future');
        }

        const reportId = require('crypto').randomUUID();
        
        const result = await connection.execute(
            `INSERT INTO DIP.INSPECTION_REPORTS (
                ID,
                VEHICLE_ID,
                INSPECTOR_ID,
                INSPECTION_DATE,
                LOCATION_CITY,
                STATUS,
                ODOMETER_READING,
                OVERALL_CONDITION,
                ENGINE_COND,
                TRANSMISSION_COND,
                SUSPENSION_COND,
                INTERIOR_COND,
                PAINT_COND,
                ACCIDENT_HISTORY,
                MECHANICAL_ISSUES,
                REQUIRED_REPAIRS,
                ESTIMATED_REPAIR_COST,
                INSPECTOR_NOTES,
                PHOTOS_URL,
                REPORT_DOC_URL,
                INSPECTED_AT
            ) VALUES (
                :id,
                :vehicleId,
                :inspectorId,
                TO_DATE(:inspectionDate, 'YYYY-MM-DD'),
                :locationCity,
                :status,
                :odometerReading,
                :overallCondition,
                :engineCond,
                :transmissionCond,
                :suspensionCond,
                :interiorCond,
                :paintCond,
                :accidentHistory,
                :mechanicalIssues,
                :requiredRepairs,
                :estimatedRepairCost,
                :inspectorNotes,
                :photosUrl,
                :reportDocUrl,
                CURRENT_TIMESTAMP
            )`,
            {
                id: reportId,
                vehicleId: reportData.vehicleId,
                inspectorId: reportData.inspectorId,
                inspectionDate: reportData.inspectionDate,
                locationCity: reportData.locationCity,
                status: status,
                odometerReading: reportData.odometerReading,
                overallCondition: reportData.overallCondition.toLowerCase(),
                engineCond: reportData.engineCond.toLowerCase(),
                transmissionCond: reportData.transmissionCond.toLowerCase(),
                suspensionCond: reportData.suspensionCond.toLowerCase(),
                interiorCond: reportData.interiorCond.toLowerCase(),
                paintCond: reportData.paintCond.toLowerCase(),
                accidentHistory: reportData.accidentHistory || null,
                mechanicalIssues: reportData.mechanicalIssues || null,
                requiredRepairs: reportData.requiredRepairs || null,
                estimatedRepairCost: reportData.estimatedRepairCost || null,
                inspectorNotes: reportData.inspectorNotes || null,
                photosUrl: reportData.photosUrl ? JSON.stringify(reportData.photosUrl) : null,
                reportDocUrl: reportData.reportDocUrl || null
            },
            { autoCommit: false }
        );
        
        
        if (result.rowsAffected > 0) {
            await connection.execute(
                `UPDATE DIP.VEHICLES
                 SET INSPECTION_REPORT_ID = :reportId, UPDATED_AT = CURRENT_TIMESTAMP
                 WHERE ID = :vehicleId`,
                {
                    reportId: reportId,
                    vehicleId: reportData.vehicleId
                },
                { autoCommit: false }
            );
            
            await connection.commit();
        } else {
            await connection.rollback();
        }
        
        return {
            success: result.rowsAffected > 0,
            reportId: reportId
        };
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackErr) {
                console.error('Error rolling back transaction:', rollbackErr);
            }
        }
        console.error('Error creating inspection report:', error);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};

module.exports = {
    getVehicles,
    filterstatusVehicles,
    searchVehicles,
    updateVehicleStatus,
    acceptVehicle,
    rejectVehicle,
    acceptinspectionrep,
    rejectinspectionrep,
    addinspectionreport
};