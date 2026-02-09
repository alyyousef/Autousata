const {
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
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ error: 'Search parameter is required' });
        }
        const searchResults = await searchVehicles(search);
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
                message: result.auctionActivated
                    ? 'Vehicle accepted and auction is now live'
                    : 'Vehicle accepted successfully (fixed-price listing)',
                vehicleId,
                status: 'active',
                auctionActivated: result.auctionActivated || false
            });
        } else {
            res.status(404).json({ error: 'Vehicle not found or not in draft status' });
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
                message: 'Vehicle rejected and any linked auction cancelled',
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

const selectInspectorController = async (req, res) => {   
    try {
        const inspectors = await selectinspector();
        res.status(200).json({ inspectors });

    }
    catch (error) {
        console.error('Controller - Select inspector error:', error);
        res.status(500).json({ error: 'Failed to fetch inspectors' });
    }
};

const viewReportController = async (req, res) => {
    try {
        const { reportId } = req.params;
        if (!reportId) {
            return res.status(400).json({ error: 'Report ID is required' });
        }
        const report = await viewreport(reportId);
        if (report) {
            res.status(200).json({ report });
        } else {
            res.status(404).json({ error: 'Report not found' });
        }
    } catch (error) {
        console.error('Controller - View report error:', error);
        res.status(500).json({ error: 'Failed to fetch report' });
    }
};

const editreportController = async (req, res) => {
    try {
        const { reportId } = req.params;
        const updateData = req.body;
        if (!reportId) {
            return res.status(400).json({ error: 'Report ID is required' });
        }
        const result = await editreport(reportId, updateData);
        if (result.success) {
            res.status(200).json({
                message: 'Report updated successfully',
                reportId,
                updatedFields: updateData
            });
        } else {
            res.status(404).json({ error: 'Report not found' });
        }
    } catch (error) {
        console.error('Controller - Edit report error:', error);
        res.status(500).json({ error: 'Failed to update report' });
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
    createInspectionReportController,
    selectInspectorController,
    viewReportController,
    editreportController
};