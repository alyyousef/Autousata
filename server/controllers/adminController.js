const {
    getVehicles,
    filterstatusVehicles,
    searchVehicles,
    updateVehicleStatus,
    acceptVehicle,
    rejectVehicle,
    acceptinspectionrep,
    rejectinspectionrep,
    addinspectionreport
} = require('../services/adminService');


const getAllVehicles = async (req, res) => {
    try {
        const vehicles = await getVehicles();
        res.status(200).json({ vehicles });
    } catch (error) {
        console.error('Controller - Get all vehicles error:', error);
        res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
};



const filterVehiclesByStatus = async (req, res) => {
    try {
        const { status } = req.query;
        if (!status) {
            return res.status(400).json({ error: 'Status query parameter is required' });
        }
        const filteredVehicles = await filterstatusVehicles(status);
        res.status(200).json({ vehicles: filteredVehicles });
    } catch (error) {
        console.error('Controller - Filter vehicles error:', error);
        res.status(500).json({ error: 'Failed to filter vehicles' });
    }
};


const searchVehiclesController = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }
        const searchResults = await searchVehicles(query);
        res.status(200).json({ vehicles: searchResults });
    }
    catch (error) { 
        console.error('Controller - Search vehicles error:', error);
        res.status(500).json({ error: 'Failed to search vehicles' });
     }
};

const updateVehicleStatusController = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { status } = req.body;

        if (!vehicleId) {
            return res.status(400).json({ error: 'Vehicle ID is required' });
        }
        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        // Validate status values
        const validStatuses = ['draft', 'active', 'sold', 'delisted'];
        if (!validStatuses.includes(status.toLowerCase())) {
            return res.status(400).json({ 
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
            });
        }

        const result = await updateVehicleStatus(vehicleId, status);
        
        if (result.success) {
            res.status(200).json({ 
                message: 'Vehicle status updated successfully',
                vehicleId,
                newStatus: status
            });
        } else {
            res.status(404).json({ error: 'Vehicle not found' });
        }
    } catch (error) {
        console.error('Controller - Update vehicle status error:', error);
        res.status(500).json({ error: 'Failed to update vehicle status' });
    }
};



const acceptVehicleController = async (req, res) => {
    try {
        const { vehicleId } = req.params;

        if (!vehicleId) {
            return res.status(400).json({ error: 'Vehicle ID is required' });
        }

        const result = await acceptVehicle(vehicleId);
        
        if (result.success) {
            res.status(200).json({ 
                message: 'Vehicle accepted successfully',
                vehicleId,
                status: 'active'
            });
        } else {
            res.status(404).json({ error: 'Vehicle not found' });
        }
    } catch (error) {
        console.error('Controller - Accept vehicle error:', error);
        res.status(500).json({ error: 'Failed to accept vehicle' });
    }
};



const rejectVehicleController = async (req, res) => {
    try {
        const { vehicleId } = req.params;

        if (!vehicleId) {
            return res.status(400).json({ error: 'Vehicle ID is required' });
        }

        const result = await rejectVehicle(vehicleId);
        
        if (result.success) {
            res.status(200).json({ 
                message: 'Vehicle rejected successfully',
                vehicleId,
                status: 'delisted'
            });
        } else {
            res.status(404).json({ error: 'Vehicle not found' });
        }
    } catch (error) {
        console.error('Controller - Reject vehicle error:', error);
        res.status(500).json({ error: 'Failed to reject vehicle' });
    }
};



const acceptInspectionReportController = async (req, res) => {
    try {
        const { inspectionId } = req.params;

        if (!inspectionId) {
            return res.status(400).json({ error: 'Inspection ID is required' });
        }

        const result = await acceptinspectionrep(inspectionId);
        
        if (result.success) {
            res.status(200).json({ 
                message: 'Inspection report accepted successfully',
                inspectionId,
                status: 'passed'
            });
        } else {
            res.status(404).json({ error: 'Inspection report not found' });
        }
    } catch (error) {
        console.error('Controller - Accept inspection report error:', error);
        res.status(500).json({ error: 'Failed to accept inspection report' });
    }
};


const rejectInspectionReportController = async (req, res) => {
    try {
        const { inspectionId } = req.params;

        if (!inspectionId) {
            return res.status(400).json({ error: 'Inspection ID is required' });
        }

        const result = await rejectinspectionrep(inspectionId);
        
        if (result.success) {
            res.status(200).json({ 
                message: 'Inspection report rejected successfully',
                inspectionId,
                status: 'failed'
            });
        } else {
            res.status(404).json({ error: 'Inspection report not found' });
        }
    } catch (error) {
        console.error('Controller - Reject inspection report error:', error);
        res.status(500).json({ error: 'Failed to reject inspection report' });
    }
};


const createInspectionReportController = async (req, res) => {
    try {
        const reportData = req.body;

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
            return res.status(400).json({ 
                error: `Missing required fields: ${missingFields.join(', ')}` 
            });
        }

        const validConditions = ['excellent', 'good', 'fair', 'poor'];
        const conditionFields = [
            'overallCondition',
            'engineCond',
            'transmissionCond'
        ];

        for (const field of conditionFields) {
            if (!validConditions.includes(reportData[field]?.toLowerCase())) {
                return res.status(400).json({ 
                    error: `Invalid ${field}. Must be one of: ${validConditions.join(', ')}` 
                });
            }
        }

        const result = await addinspectionreport(reportData);
        
        if (result.success) {
            res.status(201).json({ 
                message: 'Inspection report created successfully',
                reportId: result.reportId,
                vehicleId: reportData.vehicleId
            });
        } else {
            res.status(500).json({ error: 'Failed to create inspection report' });
        }
    } catch (error) {
        console.error('Controller - Create inspection report error:', error);
        res.status(500).json({ error: 'Failed to create inspection report' });
    }
};

module.exports = {
    getAllVehicles,
    filterVehiclesByStatus,
    searchVehiclesController,
    updateVehicleStatusController,
    acceptVehicleController,
    rejectVehicleController,
    acceptInspectionReportController,
    rejectInspectionReportController,
    createInspectionReportController
};