const express = require("express");
const {
  allocateStationController,
  startChargingController,
  completetChargingController,
  cancelAllocationController,
  expireAllocationsController,
} = require("../controllers/allocation.controller");

const router = express.Router();

router.post("/", allocateStationController);
router.post("/start", startChargingController);
router.post("/complete", completetChargingController);
router.post("/cancel", cancelAllocationController);
router.post("/expire", expireAllocationsController);

module.exports = router;