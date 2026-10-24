require("dotenv").config();

const express = require("express");
const cors = require("cors");

const db = require("./config/db");
const authRoutes = require("./routes/auth");
const healthRoutes = require("./routes/health");
const aiRoutes = require("./routes/ai");
const authenticateToken = require("./middleware/auth");

const app = express();

const PORT = process.env.PORT || 5000;


// Middleware
app.use(cors());
app.use(express.json());


// Test route
app.get("/", (req, res) => {
    res.json({
        message: "CHRONICARE Backend is running"
    });
});


// MySQL connection test
app.get("/api/health", async (req, res) => {

    try {

        const [rows] = await db.query(
            "SELECT DATABASE() AS database_name"
        );

        res.json({
            message: "Backend and MySQL are connected",
            database: rows[0].database_name
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Database connection failed",
            error: error.message
        });

    }

});

app.use("/api/auth", authRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/ai", aiRoutes);
app.get("/api/auth/me", authenticateToken, (req, res) => {
    res.json({
        message: "Protected route accessed successfully",
        user: req.user
    });
});
// Start server
app.get("/api/db-network-test", async (req, res) => {
  const net = require("net");

  const socket = net.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306)
  });

  socket.setTimeout(8000);

  socket.on("connect", () => {
    socket.destroy();
    res.json({ network: "connected" });
  });

  socket.on("timeout", () => {
    socket.destroy();
    res.status(504).json({ network: "timeout" });
  });

  socket.on("error", (err) => {
    res.status(500).json({
      network: "failed",
      code: err.code
    });
  });
});
app.listen(PORT, () => {

    console.log(
        `CHRONICARE backend running on http://localhost:${PORT}`
    );

});