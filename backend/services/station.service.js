const pool = require("../db");

const searchStations = async (params) => {
  const { latitude, longitude, battery, vehicleId } = params;

  const vehicleResult = await pool.query(
    `SELECT id, battery_capacity, consumption_per_km, connector_type
     FROM vehicles
     WHERE id = $1`,
    [vehicleId],
  );

  if (vehicleResult.rows.length === 0) {
    throw new Error("Vehicle not found");
  }

  const vehicle = vehicleResult.rows[0];

  const safetyReserve = 10;
  const drivingFactor = 1.1;
  const targetBattery = 100;
  // Below this battery level, treating range as a strict driving-distance limit
  // leaves a near-empty vehicle with zero reachable stations. A minimum search
  // radius guarantees the nearest charger(s) still show up for limp-mode driving.
  const minSearchRadiusKm = 3;
  // Candidate pool is capped and ordered by raw distance (cheap, index-backed),
  // then re-ranked by the weighted score below; this must stay well above
  // maxResults so a nearby-but-lower-scoring station can't crowd out a
  // farther-but-better one before scoring ever sees it.
  const candidatePoolLimit = 100;
  const maxResults = 20;

  const usableBattery = Math.max(0, Number(battery) - safetyReserve);

  const remainingEnergy = Number(vehicle.battery_capacity) * (usableBattery / 100);

  const effectiveConsumption = Number(vehicle.consumption_per_km) * drivingFactor;

  const estimatedRange = remainingEnergy / effectiveConsumption;

  const searchRadiusKm = Math.max(estimatedRange, minSearchRadiusKm);

  const connectorType = vehicle.connector_type;

  const result = await pool.query(
    `WITH search_point AS (
       SELECT ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography AS point
     )

     SELECT
       s.id, s.name, s.latitude, s.longitude, s.power,
       s.available_slots, s.total_slots, s.wait_time, s.trust_score,
       ROUND((ST_Distance(s.location, sp.point) / 1000)::numeric, 2) AS distance

     FROM stations s
     JOIN station_connectors sc ON s.id = sc.station_id
     JOIN connectors c ON c.id = sc.connector_id
     CROSS JOIN search_point sp

     WHERE c.name = $3
       AND s.available_slots > 0
       AND ST_DWithin(s.location, sp.point, $4::double precision * 1000)

     ORDER BY s.location <-> sp.point
     LIMIT $5`,
    [Number(latitude), Number(longitude), connectorType, searchRadiusKm, candidatePoolLimit],
  );

  const reachableStations = result.rows.map((station) => ({
    ...station,
    distance: Number(station.distance),
  }));

  const scoredStations = reachableStations.map((station) => {
    const distanceScore = Math.max(0, 100 - (station.distance / searchRadiusKm) * 100);

    const waitScore = Math.max(0, 100 - (station.wait_time / 30) * 100);

    const powerScore = Math.min(100, (station.power / 120) * 100);

    const trustScore = (Number(station.trust_score) / 5) * 100;

    const energyNeeded = Math.max(0, (targetBattery - Number(battery)) / 100) * Number(vehicle.battery_capacity);

    const chargingTime = (energyNeeded / Number(station.power)) * 60;

    const chargingTimeScore = Math.max(0, 100 - (chargingTime / 60) * 100);

    const availabilityScore = (Number(station.available_slots) / Number(station.total_slots)) * 100;

    const score =
      distanceScore * 0.2 +
      waitScore * 0.2 +
      chargingTimeScore * 0.2 +
      powerScore * 0.2 +
      trustScore * 0.1 +
      availabilityScore * 0.1;

    return {
      ...station,
      energyNeeded: Number(energyNeeded.toFixed(2)),
      chargingTime: Math.ceil(chargingTime),
      score: Math.round(score),
    };
  });

  const sortedStations = scoredStations.sort((a, b) => b.score - a.score);

  let recommendedStation = sortedStations[0] || null;

  if (recommendedStation) {
    recommendedStation = {
      ...recommendedStation,
      recommendationReason: {
        distance: `${recommendedStation.distance} km away`,
        chargingTime: `${recommendedStation.chargingTime} minutes`,
        waitTime: `${recommendedStation.wait_time} minutes`,
        power: `${recommendedStation.power} kW`,
        trust: `${recommendedStation.trust_score}/5`,
        availability: `${recommendedStation.available_slots}/${recommendedStation.total_slots} slots available`,
      },
    };
  }

  return {
    vehicle: {
      id: vehicle.id,
      battery: Number(battery),
      remainingEnergy: Number(remainingEnergy.toFixed(2)),
      estimatedRange: Number(estimatedRange.toFixed(2)),
      lowRangeWarning: estimatedRange < minSearchRadiusKm,
    },
    recommendedStation,
    stations: sortedStations.slice(0, maxResults),
  };
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
  getStationById,
};
