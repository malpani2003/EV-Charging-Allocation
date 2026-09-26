const pool = require("../db");
const { calculateDistance } = require("../utils/distance");

const searchStations = async (params) => {
  const { latitude, longitude, battery, connector } = params;

  const result = await pool.query(
    `SELECT s.id, s.name, s.latitude, s.longitude, s.power, s.available_slots,
            s.total_slots, s.wait_time, s.trust_score
     FROM stations s
     JOIN station_connectors sc ON s.id = sc.station_id
     JOIN connectors c ON c.id = sc.connector_id
     WHERE c.name = $1 AND s.available_slots > 0`,
    [connector],
  );

  const stationsWithDistance = result.rows.map((station) => {
    const distance = calculateDistance(
      Number(latitude),
      Number(longitude),
      Number(station.latitude),
      Number(station.longitude),
    );

    return {
      ...station,
      distance: Number(distance.toFixed(2)),
    };
  });

  const scoredStations = stationsWithDistance.map((station) => {
    const distanceScore = Math.max(0, 100 - (station.distance / 10) * 100);

    const waitScore = Math.max(0, 100 - (station.wait_time / 30) * 100);

    const powerScore = Math.min(100, (station.power / 120) * 100);

    const trustScore = (station.trust_score / 5) * 100;

    const score =
      distanceScore * 0.3 +
      waitScore * 0.25 +
      powerScore * 0.25 +
      trustScore * 0.2;

    return {
      ...station,
      score: Math.round(score),
    };
  });

  return scoredStations.sort((a, b) => b.score - a.score);
};

const getStations = async () => {
  const result = await pool.query(
    `SELECT id, name, latitude, longitude, power, available_slots,
            total_slots, wait_time, trust_score
     FROM stations
     ORDER BY id`,
  );

  return result.rows;
};

const getStationById = async (id) => {
  const result = await pool.query(
    `SELECT id, name, latitude, longitude, power, available_slots,
            total_slots, wait_time, trust_score
     FROM stations
     WHERE id = $1`,
    [id],
  );

  return result.rows[0];
};

module.exports = {
  searchStations,
  getStations,
  getStationById
};
