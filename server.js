const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { initDatabase } = require("./src/db");
const authRoutes = require("./src/routes/auth");
const webhookRoutes = require("./src/routes/webhooks");
const integrationRoutes = require("./src/routes/integration");
const settingsRoutes = require("./src/routes/settings");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initDatabase().catch(console.error);

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static("public"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Routes
app.use("/auth", authRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/integration", integrationRoutes);
app.use("/api/settings", settingsRoutes);

// Serve settings page
app.get("/settings", (req, res) => {
  res.sendFile(path.join(__dirname, "src/views/settings.html"));
});

// Default route
app.get("/", (req, res) => {
  res.json({
    message: "WhatsAble Monday.com Integration API",
    version: "1.0.0",
    endpoints: [
      "GET /health - Health check",
      "GET /settings - Settings page",
      "POST /auth/callback - OAuth callback",
      "POST /webhooks/whatsable - WhatsAble webhook",
      "POST /integration/send-on-create - Send on item create",
      "POST /integration/send-on-update - Send on item update",
      "POST /integration/send-template - Send template message",
      "GET /api/settings - Get user settings",
      "POST /api/settings - Update user settings",
    ],
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.listen(PORT, () => {
  console.log(`WhatsAble Monday.com app is running on port ${PORT}`);
  console.log(`Settings page available at: http://localhost:${PORT}/settings`);
});
