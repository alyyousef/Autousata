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
        // Validate status constraint
        const validStatuses = ['draft', 'active', 'sold', 'delisted'];
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

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
            `SELECT ID, ROLE, IS_ACTIVE, IS_BANNED 
            FROM DIP.USERS 
            WHERE ID = :inspectorId`,
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

        // if (inspector.IS_ACTIVE !== 1) {
        //     throw new Error(`Inspector ${reportData.inspectorId} is not active`);
        // }

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
                 SET INSPECTION_REPORT_ID = :reportId, 
                     INSPECTION_REQ = 0,
                     UPDATED_AT = CURRENT_TIMESTAMP
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

const selectinspector= async () => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT ID, FIRST_NAME,ROLE, IS_ACTIVE, IS_BANNED
             FROM DIP.USERS
             WHERE ROLE='inspector'`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return result.rows.map((inspector) => ({
            role: inspector.ROLE,
            id: inspector.ID,
            name: inspector.FIRST_NAME,
            active: inspector.IS_ACTIVE,
            banned: inspector.IS_BANNED
        }));
    }
    catch (error) {
        console.error('Error fetching inspectors:', error);
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

const viewreport= async (reportId) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT * FROM DIP.INSPECTION_REPORTS WHERE ID = :reportId`,
            { reportId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (result.rows.length === 0) {
            throw new Error(`Inspection report with ID ${reportId} not found`);
        }
        const report = result.rows[0];
        return {
            id: report.ID,
            vehicleId: report.VEHICLE_ID,
            inspectorId: report.INSPECTOR_ID,
            inspectionDate: report.INSPECTION_DATE,
            locationCity: report.LOCATION_CITY,
            status: report.STATUS,
            odometerReading: report.ODOMETER_READING,
            overallCondition: report.OVERALL_CONDITION,
            engineCond: report.ENGINE_COND,
            transmissionCond: report.TRANSMISSION_COND,
            suspensionCond: report.SUSPENSION_COND,
            interiorCond: report.INTERIOR_COND,
            paintCond: report.PAINT_COND,
            accidentHistory: report.ACCIDENT_HISTORY,
            mechanicalIssues: report.MECHANICAL_ISSUES,
            requiredRepairs: report.REQUIRED_REPAIRS,
            estimatedRepairCost: report.ESTIMATED_REPAIR_COST,
            inspectorNotes: report.INSPECTOR_NOTES,
            photosUrl: report.PHOTOS_URL ? JSON.parse(report.PHOTOS_URL) : [],
            reportDocUrl: report.REPORT_DOC_URL,
            inspectedAt: report.INSPECTED_AT
        };
    }
    catch (error) {
        console.error('Error fetching inspection report:', error);
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

const editreport= async (reportId, updateData) => {
    let connection;
    try {
        // Validate constraints before update
        const validConditions = ['excellent', 'good', 'fair', 'poor'];
        const validStatuses = ['pending', 'passed', 'failed'];
        const conditionFields = ['overallCondition', 'engineCond', 'transmissionCond', 'suspensionCond', 'interiorCond', 'paintCond'];

        // Validate condition fields
        for (const field of conditionFields) {
            if (updateData[field] && !validConditions.includes(updateData[field])) {
                throw new Error(`Invalid ${field}. Must be one of: ${validConditions.join(', ')}`);
            }
        }

        // Validate status
        if (updateData.status && !validStatuses.includes(updateData.status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        // Validate numeric fields are positive
        if (updateData.odometerReading !== undefined && updateData.odometerReading < 0) {
            throw new Error('Odometer reading must be a positive number');
        }

        if (updateData.estimatedRepairCost !== undefined && updateData.estimatedRepairCost < 0) {
            throw new Error('Estimated repair cost must be a positive number');
        }

        // Validate photosUrl is valid JSON array if provided
        if (updateData.photosUrl) {
            if (!Array.isArray(updateData.photosUrl)) {
                throw new Error('photosUrl must be an array');
            }
        }

        connection = await oracledb.getConnection();
        const fields = [];
        const values = {};
        
        // Map camelCase to UPPER_CASE for database columns
        const columnMapping = {
            vehicleId: 'VEHICLE_ID',
            inspectorId: 'INSPECTOR_ID',
            inspectionDate: 'INSPECTION_DATE',
            locationCity: 'LOCATION_CITY',
            status: 'STATUS',
            odometerReading: 'ODOMETER_READING',
            overallCondition: 'OVERALL_CONDITION',
            engineCond: 'ENGINE_COND',
            transmissionCond: 'TRANSMISSION_COND',
            suspensionCond: 'SUSPENSION_COND',
            interiorCond: 'INTERIOR_COND',
            paintCond: 'PAINT_COND',
            accidentHistory: 'ACCIDENT_HISTORY',
            mechanicalIssues: 'MECHANICAL_ISSUES',
            requiredRepairs: 'REQUIRED_REPAIRS',
            estimatedRepairCost: 'ESTIMATED_REPAIR_COST',
            inspectorNotes: 'INSPECTOR_NOTES',
            photosUrl: 'PHOTOS_URL',
            reportDocUrl: 'REPORT_DOC_URL'
        };

        for (const [key, value] of Object.entries(updateData)) {
            const dbColumn = columnMapping[key] || key.toUpperCase();
            const paramName = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            
            if (key === 'photosUrl' && Array.isArray(value)) {
                fields.push(`${dbColumn} = :${paramName}`);
                values[paramName] = JSON.stringify(value);
            } else if (key === 'inspectionDate') {
                // Handle date field with TO_DATE conversion
                fields.push(`${dbColumn} = TO_DATE(:${paramName}, 'YYYY-MM-DD')`);
                values[paramName] = value;
            } else {
                fields.push(`${dbColumn} = :${paramName}`);
                values[paramName] = value;
            }
        }
        
        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.reportId = reportId;
        const result = await connection.execute(
            `UPDATE DIP.INSPECTION_REPORTS
             SET ${fields.join(', ')}, REPORT_GENERATED_AT = CURRENT_TIMESTAMP
             WHERE ID = :reportId`,
            values,
            { autoCommit: true }
        );
        return {
            success: result.rowsAffected > 0,
            rowsAffected: result.rowsAffected
        };
    } catch (error) {
        console.error('Error updating inspection report:', error);
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
    addinspectionreport,
    selectinspector,
    viewreport,
    editreport
};