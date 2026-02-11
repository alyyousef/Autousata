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
  getVehicleController
} = require("../controllers/adminController");
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
  updateVehicleStatusController,
);
router.patch(
  "/vehicles/:vehicleId/accept",
  authenticate,
  authorize("admin"),
  acceptVehicleController,
);
router.patch(
  "/vehicles/:vehicleId/reject",
  authenticate,
  authorize("admin"),
  rejectVehicleController,
);
router.post(
  "/inspections",
  authenticate,
  authorize("admin"),
  createInspectionReportController,
);
router.patch(
  "/inspections/:inspectionId/accept",
  authenticate,
  authorize("admin"),
  acceptInspectionReportController,
);
router.patch(
  "/inspections/:inspectionId/reject",
  authenticate,
  authorize("admin"),
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
  editreportController,
);

router.get("/vehicles/:vehicleId",authenticate,authorize("admin"),getVehicleController);


const adminFinanceController = require("../controllers/adminFinanceController");

// GET /api/admin/finance/revenue
router.get("/finance/revenue", adminFinanceController.getRevenueDashboard);
module.exports = router;
