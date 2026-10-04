const express = require("express");
const {
  allocateStationController,
  startChargingController,
  completetChargingController,
  cancelAllocationController,
  getActiveAllocationController,
  expireAllocationsController,
} = require("../controllers/allocation.controller");

const router = express.Router();

router.post("/", allocateStationController);
router.post("/start", startChargingController);
router.post("/complete", completetChargingController);
router.post("/cancel", cancelAllocationController);
router.get("/active", getActiveAllocationController);
router.post("/expire", expireAllocationsController);

module.exports = router;