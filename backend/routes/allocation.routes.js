const express = require("express");
const {
  allocateStationController,
} = require("../controllers/allocation.controller");

const router = express.Router();

router.post("/", allocateStationController);

module.exports = router;