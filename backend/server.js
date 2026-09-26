const express = require("express");
const cors = require("cors");
const pool = require("./db");
const app = express();
const stationRoutes = require("./routes/station.routes");
const allocationRoutes = require("./routes/allocation.routes");

const PORT = 3000;

app.use(cors());
app.use(express.json());

// Route Middleware
app.use("/api/stations", stationRoutes);
app.use("/api/allocations", allocationRoutes);

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
