const pool = require("../db");

const ALLOCATION_EXPIRY_MINUTES = 3;

const allocateStation = async (params) => {
  const { stationId, userId, vehicleId } = params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const stationResult = await client.query("SELECT id, available_slots FROM stations WHERE id = $1 FOR UPDATE", [stationId]);

    if (stationResult.rows.length === 0) {
      throw new Error("STATION_NOT_FOUND");
    }

    const station = stationResult.rows[0];

    if (station.available_slots <= 0) {
      throw new Error("NO_SLOTS_AVAILABLE");
    }

    const vehicleResult = await client.query("SELECT id, connector_type FROM vehicles WHERE id = $1", [vehicleId]);

    if (vehicleResult.rows.length === 0) {
      throw new Error("VEHICLE_NOT_FOUND");
    }

    const vehicle = vehicleResult.rows[0];

    const connectorResult = await client.query(
      "SELECT c.name FROM station_connectors sc JOIN connectors c ON c.id = sc.connector_id WHERE sc.station_id = $1 AND c.name = $2",
      [stationId, vehicle.connector_type],
    );

    if (connectorResult.rows.length === 0) {
      const error = new Error("STATION_DOES_NOT_SUPPORT_CONNECTOR");
      error.connectorType = vehicle.connector_type;
      throw error;
    }

    const allocationId = `ALLOC-${station.id}-${Date.now()}`;

    const allocationResult = await client.query(
      `INSERT INTO allocations (allocation_id, station_id, user_id, vehicle_id, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '${ALLOCATION_EXPIRY_MINUTES} minutes')
       RETURNING id, allocation_id, station_id, user_id, vehicle_id, status, expires_at`,
      [allocationId, station.id, userId, vehicleId, "ALLOCATED"],
    );

    const updatedStation = await client.query(
      "UPDATE stations SET available_slots = available_slots - 1, updated_at = NOW() WHERE id = $1 RETURNING id, name, available_slots, total_slots",
      [station.id],
    );

    await client.query("COMMIT");

    return {
      allocation: allocationResult.rows[0],
      station: updatedStation.rows[0],
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // ignore: original error is rethrown below
    }
    throw error;
  } finally {
    client.release();
  }
};

const startCharging = async (params) => {
  const { allocationId, initialBattery } = params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const allocationResult = await client.query(
      `SELECT id, allocation_id, station_id, status, vehicle_id, expires_at
       FROM allocations
       WHERE allocation_id = $1
       FOR UPDATE`,
      [allocationId],
    );

    if (allocationResult.rows.length === 0) {
      throw new Error("ALLOCATION_NOT_FOUND");
    }

    const allocation = allocationResult.rows[0];

    if (allocation.status !== "ALLOCATED") {
      throw new Error("INVALID_ALLOCATION_STATUS");
    }

    if (allocation.expires_at && new Date(allocation.expires_at) <= new Date()) {
      await client.query(`UPDATE allocations SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1`, [allocation.id]);

      await client.query(`UPDATE stations SET available_slots = available_slots + 1, updated_at = NOW() WHERE id = $1`, [allocation.station_id]);

      await client.query("COMMIT");

      const expiredError = new Error("ALLOCATION_EXPIRED");
      expiredError.alreadyCommitted = true;
      throw expiredError;
    }

    const updatedAllocation = await client.query(
      `UPDATE allocations
       SET status = 'CHARGING',
           started_at = NOW(),
           initial_battery = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING
         id,
         allocation_id,
         station_id,
         user_id,
         vehicle_id,
         status,
         started_at,
         initial_battery`,
      [initialBattery, allocation.id],
    );

    await client.query("COMMIT");

    return updatedAllocation.rows[0];
  } catch (error) {
    if (!error.alreadyCommitted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        // ignore: original error is rethrown below
      }
    }

    throw error;
  } finally {
    client.release();
  }
};

const completeCharging = async (params) => {
  const { allocationId, finalBattery } = params;

  const finalBatteryNumber = Number(finalBattery);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const allocationResult = await client.query(
      `SELECT
         a.id,
         a.allocation_id,
         a.status,
         a.station_id,
         a.vehicle_id,
         a.initial_battery,
         v.battery_capacity
       FROM allocations a
       JOIN vehicles v
         ON v.id = a.vehicle_id
       WHERE a.allocation_id = $1
       FOR UPDATE`,
      [allocationId],
    );

    if (allocationResult.rows.length === 0) {
      throw new Error("ALLOCATION_NOT_FOUND");
    }

    const allocation = allocationResult.rows[0];

    if (allocation.status !== "CHARGING") {
      throw new Error("INVALID_ALLOCATION_STATUS");
    }

    if (finalBatteryNumber < Number(allocation.initial_battery)) {
      throw new Error("INVALID_FINAL_BATTERY");
    }

    const energyConsumed = ((finalBatteryNumber - Number(allocation.initial_battery)) * Number(allocation.battery_capacity)) / 100;

    const updatedAllocation = await client.query(
      `UPDATE allocations
       SET status = 'COMPLETED',
           completed_at = NOW(),
           final_battery = $1,
           energy_consumed = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING
         id,
         allocation_id,
         station_id,
         user_id,
         vehicle_id,
         status,
         started_at,
         completed_at,
         initial_battery,
         final_battery,
         energy_consumed`,
      [finalBatteryNumber, energyConsumed, allocation.id],
    );

    await client.query(
      `UPDATE stations
       SET available_slots = available_slots + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [allocation.station_id],
    );

    await client.query("COMMIT");

    return updatedAllocation.rows[0];
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // ignore: original error is rethrown below
    }

    throw error;
  } finally {
    client.release();
  }
};

const cancelAllocation = async (params) => {
  const { allocationId } = params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const allocationResult = await client.query(
      `SELECT
         id,
         allocation_id,
         station_id,
         status
       FROM allocations
       WHERE allocation_id = $1
       FOR UPDATE`,
      [allocationId],
    );

    if (allocationResult.rows.length === 0) {
      throw new Error("ALLOCATION_NOT_FOUND");
    }

    const allocation = allocationResult.rows[0];

    if (allocation.status !== "ALLOCATED") {
      throw new Error("INVALID_ALLOCATION_STATUS");
    }

    const updatedAllocation = await client.query(
      `UPDATE allocations
       SET status = 'CANCELLED',
           updated_at = NOW()
       WHERE id = $1
       RETURNING
         id,
         allocation_id,
         station_id,
         user_id,
         vehicle_id,
         status,
         created_at,
         updated_at`,
      [allocation.id],
    );

    await client.query(
      `UPDATE stations
       SET available_slots = available_slots + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [allocation.station_id],
    );

    await client.query("COMMIT");

    return updatedAllocation.rows[0];
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // ignore: original error is rethrown below
    }

    throw error;
  } finally {
    client.release();
  }
};

const getActiveAllocation = async (params) => {
  const { userId, stationId } = params;

  const result = await pool.query(
    `SELECT
       id,
       allocation_id,
       station_id,
       user_id,
       vehicle_id,
       status,
       expires_at,
       started_at,
       initial_battery
     FROM allocations
     WHERE user_id = $1
       AND station_id = $2
       AND status IN ('ALLOCATED', 'CHARGING')
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, stationId],
  );

  return result.rows[0] || null;
};

const expireAllocations = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const expiredResult = await client.query(
      `SELECT id, allocation_id, station_id
       FROM allocations
       WHERE status = 'ALLOCATED'
         AND expires_at IS NOT NULL
         AND expires_at <= NOW()
       FOR UPDATE`,
    );

    const expiredIds = expiredResult.rows.map((row) => row.id);
    const stationIds = expiredResult.rows.map((row) => row.station_id);

    if (expiredIds.length > 0) {
      await client.query(`UPDATE allocations SET status = 'EXPIRED', updated_at = NOW() WHERE id = ANY($1::bigint[])`, [expiredIds]);

      await client.query(
        `UPDATE stations
         SET available_slots = available_slots + freed.freed_count,
             updated_at = NOW()
         FROM (
           SELECT station_id, COUNT(*) AS freed_count
           FROM unnest($1::bigint[]) AS station_id
           GROUP BY station_id
         ) freed
         WHERE stations.id = freed.station_id`,
        [stationIds],
      );
    }

    await client.query("COMMIT");

    return expiredResult.rows.map((row) => row.allocation_id);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // ignore: original error is rethrown below
    }

    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  allocateStation,
  startCharging,
  completeCharging,
  cancelAllocation,
  getActiveAllocation,
  expireAllocations,
};
