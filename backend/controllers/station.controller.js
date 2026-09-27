const { searchStations, getStations, getStationById } = require("../services/station.service");

const searchStationsController = async (req, res) => {
  try {
    const { latitude, longitude, battery, vehicleId } = req.query;

    if (latitude === undefined) {
      return res.status(400).json({ field: "latitude", error: "Latitude is required to search nearby stations" });
    }
    if (longitude === undefined) {
      return res.status(400).json({ field: "longitude", error: "Longitude is required to search nearby stations" });
    }
    if (battery === undefined) {
      return res.status(400).json({ field: "battery", error: "Battery level is required to find compatible stations" });
    }

    const stations = await searchStations({
      latitude,
      longitude,
      battery,
      vehicleId,
    });

    res.json(stations);
  } catch (error) {
    res.status(500).json({
      error: "Failed to search charging stations",
    });
  }
};

const getStationsController = async (req, res) => {
  try {
    const stations = await getStations();
    res.json(stations);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch charging stations",
    });
  }
};

const getStationByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    const station = await getStationById(id);

    if (!station) {
      return res.status(404).json({
        error: "Charging station not found",
      });
    }

    res.json(station);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch charging station",
    });
  }
};

module.exports = {
  searchStationsController,
  getStationsController,
  getStationByIdController,
};
