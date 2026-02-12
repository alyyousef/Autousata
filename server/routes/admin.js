const express = require("express");
const {
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
  editreportController,
  getVehicleController,
} = require("../controllers/adminController");

const activityLogger = require("../middleware/activityLogger");

const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");

router.get("/vehicles", authenticate, authorize("admin"), getAllVehicles);
router.get(
  "/vehicles/filter",
  authenticate,
  authorize("admin"),
  filterVehiclesByStatus,
);
router.get(
  "/vehicles/search",
  authenticate,
  authorize("admin"),
  searchVehiclesController,
);
router.patch(
  "/vehicles/:vehicleId/status",
  authenticate,
  authorize("admin"),
  activityLogger({
    action: "VEHICLE_STATUS_UPDATE",
    severity: "INFO",
    entityType: "VEHICLE",
    getEntityId: (req) => req.params.vehicleId,
    getDescription: (req) =>
      `Admin updated vehicle status for ${req.params.vehicleId}`,
  }),
  updateVehicleStatusController,
);
router.patch(
  "/vehicles/:vehicleId/accept",
  authenticate,
  authorize("admin"),
  activityLogger({
    action: "VEHICLE_ACCEPT",
    severity: "INFO",
    entityType: "VEHICLE",
    getEntityId: (req) => req.params.vehicleId,
    getDescription: (req) => `Admin accepted vehicle ${req.params.vehicleId}`,
  }),
  acceptVehicleController,
);
router.patch(
  "/vehicles/:vehicleId/reject",
  authenticate,
  authorize("admin"),
  activityLogger({
    action: "VEHICLE_REJECT",
    severity: "WARN",
    entityType: "VEHICLE",
    getEntityId: (req) => req.params.vehicleId,
    getDescription: (req) => `Admin rejected vehicle ${req.params.vehicleId}`,
  }),
  rejectVehicleController,
);
router.post(
  "/inspections",
  authenticate,
  authorize("admin"),
  activityLogger({
    action: "INSPECTION_CREATE",
    severity: "INFO",
    entityType: "INSPECTION_REPORT",
    // entityId created in controller, so we can’t know it here unless controller returns it
    getDescription: () => `Admin created an inspection report`,
  }),
  createInspectionReportController,
);
router.patch(
  "/inspections/:inspectionId/accept",
  authenticate,
  authorize("admin"),
  activityLogger({
    action: "INSPECTION_ACCEPT",
    severity: "INFO",
    entityType: "INSPECTION_REPORT",
    getEntityId: (req) => req.params.inspectionId,
    getDescription: (req) =>
      `Admin accepted inspection report ${req.params.inspectionId}`,
  }),
  acceptInspectionReportController,
);
router.patch(
  "/inspections/:inspectionId/reject",
  authenticate,
  authorize("admin"),
  activityLogger({
    action: "INSPECTION_REJECT",
    severity: "WARN",
    entityType: "INSPECTION_REPORT",
    getEntityId: (req) => req.params.inspectionId,
    getDescription: (req) =>
      `Admin rejected inspection report ${req.params.inspectionId}`,
  }),
  rejectInspectionReportController,
);
router.get(
  "/inspector/select",
  authenticate,
  authorize("admin"),
  selectInspectorController,
);
router.get(
  "/inspections/:reportId",
  authenticate,
  authorize("admin"),
  viewReportController,
);
router.patch(
  "/inspections/:reportId/edit",
  authenticate,
  authorize("admin"),
  activityLogger({
    action: "INSPECTION_EDIT",
    severity: "INFO",
    entityType: "INSPECTION_REPORT",
    getEntityId: (req) => req.params.reportId,
    getDescription: (req) =>
      `Admin attempted to edit inspection report ${req.params.reportId}`,
  }),
  editreportController,
);

router.get(
  "/vehicles/:vehicleId",
  authenticate,
  authorize("admin"),
  getVehicleController,
);

const adminFinanceController = require("../controllers/adminFinanceController");

// GET /api/admin/finance/revenue
router.get("/finance/revenue", adminFinanceController.getRevenueDashboard);
module.exports = router;
