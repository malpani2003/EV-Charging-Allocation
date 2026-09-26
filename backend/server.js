const express = require("express");
const cors = require("cors");
const pool = require("./db");
const app = express();
const stationRoutes = require("./routes/station.routes");

const PORT = 3000;

app.use(cors());
app.use(express.json());

// Route Middleware
app.use("/api/stations", stationRoutes);

pool.on("connect", () => {
  console.log("Connected to PostgreSQL");
});

pool.query("SELECT NOW()", (error, result) => {
  if (error) {
    console.error("Database connection failed:", error);
  } else {
    console.log("Database connected:", result.rows);
  }
});

// Health Check Route
app.get("/", (req, res) => {
  res.json({
    message: "EV Charging Allocation API is running",
  });
});

app.get("/api/stations", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, latitude, longitude, power, available_slots, total_slots, wait_time, trust_score FROM stations ORDER BY id",
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get stations error:", error);

    res.status(500).json({
      error: "Failed to fetch charging stations",
    });
  }
});

app.get("/api/stations/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT id, name, latitude, longitude, power, available_slots, total_slots, wait_time, trust_score FROM stations WHERE id = $1",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Charging station not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get station error:", error);

    res.status(500).json({
      error: "Failed to fetch charging station",
    });
  }
});


app.post("/api/stations/:id/allocate", async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    const stationResult = await client.query(
      "SELECT id, name, available_slots, total_slots FROM stations WHERE id = $1 FOR UPDATE",
      [id],
    );

    if (stationResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "Charging station not found",
      });
    }

    const station = stationResult.rows[0];

    if (station.available_slots <= 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        error: "No charging slots available",
      });
    }

    const allocationId = `ALLOC-${station.id}-${Date.now()}`;

    const allocationResult = await client.query(
      "INSERT INTO allocations (allocation_id, station_id, status) VALUES ($1, $2, $3) RETURNING id, allocation_id, station_id, status",
      [allocationId, station.id, "ALLOCATED"],
    );

    const updatedStation = await client.query(
      "UPDATE stations SET available_slots = available_slots - 1, updated_at = NOW() WHERE id = $1 RETURNING id, name, available_slots, total_slots",
      [station.id],
    );

    await client.query("COMMIT");

    res.json({
      message: "Charging slot allocated successfully",
      allocation: allocationResult.rows[0],
      station: updatedStation.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Allocation error:", error);

    res.status(500).json({
      error: "Failed to allocate charging slot",
    });
  } finally {
    client.release();
  }
});

app.post("/api/vehicles", async (req, res) => {
  try {
    const { userId, registrationNumber, brand, model, batteryCapacity } =
      req.body;

    if (
      !userId ||
      !registrationNumber ||
      !brand ||
      !model ||
      !batteryCapacity
    ) {
      return res.status(400).json({
        error:
          "userId, registrationNumber, brand, model and batteryCapacity are required",
      });
    }

    const userResult = await pool.query("SELECT id FROM users WHERE id = $1", [
      userId,
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const result = await pool.query(
      "INSERT INTO vehicles (user_id, registration_number, brand, model, battery_capacity) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [userId, registrationNumber, brand, model, batteryCapacity],
    );

    res.status(201).json({
      message: "Vehicle added successfully",
      vehicle: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Vehicle registration number already exists",
      });
    }

    res.status(500).json({
      error: "Failed to add vehicle",
    });
  }
});

app.get("/api/users/:userId/vehicles", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      "SELECT id, registration_number, brand, model, battery_capacity, created_at FROM vehicles WHERE user_id = $1 ORDER BY id",
      [userId],
    );

    res.json({
      vehicles: result.rows,
    });
  } catch (error) {
    console.error("Get vehicles error:", error);

    res.status(500).json({
      error: "Failed to fetch vehicles",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
