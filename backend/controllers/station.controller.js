const { searchStations, getStations, getStationById } = require("../services/station.service");

const searchStationsController = async (req, res) => {
  try {
    const { latitude, longitude, battery, connector } = req.query;

    if (
      latitude === undefined ||
      longitude === undefined ||
      battery === undefined ||
      !connector
    ) {
      return res.status(400).json({
        error: "location, battery and connector are required",
      });
    }

    const stations = await searchStations({
      latitude,
      longitude,
      battery,
      connector,
    });

    res.json({
      filters: {
        latitude,
        longitude,
        battery,
        connector,
      },
      stations,
    });
  } catch (error) {
    console.error("Search stations error:", error);

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
    console.error("Get stations error:", error);
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
    console.error("Get station error:", error);

    res.status(500).json({
      error: "Failed to fetch charging station",
    });
  }
};

module.exports = {
  searchStationsController,
  getStationsController,
  getStationByIdController
};
