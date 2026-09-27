const { allocateStation, startCharging, completeCharging, cancelAllocation, expireAllocations } = require("../services/allocation.service");

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

const startChargingController = async (req, res) => {
  try {
    const { allocationId, initialBattery } = req.body;

    if (!allocationId || initialBattery === undefined) {
      return res.status(400).json({
        error: "allocationId and initialBattery are required",
      });
    }

    const allocation = await startCharging({
      allocationId,
      initialBattery,
    });

    res.status(200).json({
      message: "Charging started",
      allocation,
    });
  } catch (error) {
    if (error.message === "ALLOCATION_NOT_FOUND") {
      return res.status(404).json({
        error: "Allocation not found",
      });
    }

    if (error.message === "INVALID_ALLOCATION_STATUS") {
      return res.status(409).json({
        error: "Allocation is not in ALLOCATED state",
      });
    }

    if (error.message === "ALLOCATION_EXPIRED") {
      return res.status(409).json({
        error: "Allocation has expired",
      });
    }

    res.status(500).json({
      error: "Failed to start charging",
    });
  }
};

const completetChargingController = async (req, res) => {
  try {
    const { allocationId, finalBattery } = req.body;

    if (!allocationId) {
      return res.status(400).json({
        error: "Allocation-Id is required",
      });
    }

    const allocation = await completeCharging({
      allocationId,
      finalBattery,
    });

    res.status(200).json({
      message: "Charging completed",
      allocation,
    });
  } catch (error) {
    if (error.message === "ALLOCATION_NOT_FOUND") {
      return res.status(404).json({
        error: "Allocation not found",
      });
    }

    if (error.message === "INVALID_ALLOCATION_STATUS") {
      return res.status(409).json({
        error: "Allocation is not in CHARGING state",
      });
    }

    if (error.message === "INVALID_FINAL_BATTERY") {
      return res.status(400).json({
        error: "Final battery cannot be lower than initial battery",
      });
    }

    res.status(500).json({
      error: "Failed to complete charging",
    });
  }
};

const cancelAllocationController = async (req, res) => {
  try {
    const { allocationId } = req.body;

    if (!allocationId) {
      return res.status(400).json({
        error: "allocationId is required",
      });
    }

    const allocation = await cancelAllocation({
      allocationId,
    });

    res.status(200).json({
      message: "Allocation cancelled",
      allocation,
    });
  } catch (error) {
    if (error.message === "ALLOCATION_NOT_FOUND") {
      return res.status(404).json({
        error: "Allocation not found",
      });
    }

    if (error.message === "INVALID_ALLOCATION_STATUS") {
      return res.status(409).json({
        error: "Allocation is not in ALLOCATED state",
      });
    }

    res.status(500).json({
      error: "Failed to cancel allocation",
    });
  }
};

const expireAllocationsController = async (req, res) => {
  try {
    const expiredAllocationIds = await expireAllocations();

    res.status(200).json({
      message: "Expired allocations processed",
      expiredCount: expiredAllocationIds.length,
      expiredAllocationIds,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to expire allocations",
    });
  }
};

module.exports = {
  allocateStationController,
  startChargingController,
  completetChargingController,
  cancelAllocationController,
  expireAllocationsController,
};
