// src/middleware/auth.js
const { verifyJWT, extractBearerToken } = require("../utils/crypto");

function authenticateMonday(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);
    const decoded = verifyJWT(token, process.env.MONDAY_SIGNING_SECRET);

    // Add user info to request object
    req.user = decoded;
    req.mondayToken = decoded.mondayToken || decoded.backToMondayToken;

    next(); // Continue to route handler
  } catch (error) {
    return res.status(401).json({
      error: "Authentication failed",
      details: error.message,
    });
  }
}

module.exports = { authenticateMonday };
