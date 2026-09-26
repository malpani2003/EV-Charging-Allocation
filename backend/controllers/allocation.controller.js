const { allocateStation } = require("../services/allocation.service");

const allocateStationController = async (req, res) => {
  try {
    const { stationId, userId, vehicleId } = req.body;

    if (!stationId || !userId || !vehicleId) {
      return res.status(400).json({
        error: "stationId, userId and vehicleId are required",
      });
    }

    const allocation = await allocateStation({
      stationId,
      userId,
      vehicleId,
    });

    res.status(201).json(allocation);
  } catch (error) {
    console.error("Allocation error:", error);

    if (error.message === "STATION_NOT_FOUND") {
      return res.status(404).json({
        error: "Charging station not found",
      });
    }

    if (error.message === "NO_SLOTS_AVAILABLE") {
      return res.status(409).json({
        error: "No charging slot available",
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        error: "Invalid userId or vehicleId",
      });
    }

    res.status(500).json({
      error: "Failed to allocate charging station",
    });
  }
};

module.exports = {
  allocateStationController,
};
