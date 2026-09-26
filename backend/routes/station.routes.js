const express = require("express");
const {
  searchStationsController,
  getStationsController,
  getStationByIdController,
} = require("../controllers/station.controller");

const router = express.Router();

router.get("/", getStationsController);
router.get("/search", searchStationsController);
router.get("/:id", getStationByIdController);

module.exports = router;
