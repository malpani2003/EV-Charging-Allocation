const { searchStations } = require("../services/station.service");

const searchStationsController = async (req, res) => {
  try {
    const { latitude, longitude, battery, connector } =  req.query;

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

module.exports = {
  searchStationsController,
};
