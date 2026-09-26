const pool = require("../db");

const allocateStation = async (params) => {
  const { stationId, userId, vehicleId } = params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const stationResult = await client.query(
      "SELECT id, available_slots FROM stations WHERE id = $1 FOR UPDATE",
      [stationId],
    );

    if (stationResult.rows.length === 0) {
      throw new Error("STATION_NOT_FOUND");
    }

    const station = stationResult.rows[0];

    if (station.available_slots <= 0) {
      throw new Error("NO_SLOTS_AVAILABLE");
    }

    const allocationId = `ALLOC-${station.id}-${Date.now()}`;

    const allocationResult = await client.query(
      `INSERT INTO allocations (allocation_id, station_id, user_id, vehicle_id, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, allocation_id, station_id, user_id, vehicle_id, status`,
      [allocationId, station.id, userId, vehicleId, "ALLOCATED"],
    );

    const updatedStation = await client.query(
      `UPDATE stations SET available_slots = available_slots - 1, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, available_slots, total_slots`,
      [station.id],
    );

    await client.query("COMMIT");

    return {
      allocation: allocationResult.rows[0],
      station: updatedStation.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  allocateStation,
};
