const express = require("express");
const {
  searchStationsController,
} = require("../controllers/station.controller");

const router = express.Router();

router.get("/search", searchStationsController);

module.exports = router;
