const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/**
 * Verify JWT token from Monday.com
 */
function verifyJWT(token, secret) {
  try {
    const decoded = jwt.verify(token, secret);

    // Additional checks
    if (!decoded.userId) {
      throw new Error("Invalid token payload: missing userId");
    }

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token signature");
    } else {
      throw new Error("Token verification failed: " + error.message);
    }
  }
}

/**
 * Verify webhook signature (additional security)
 */
function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const computedSignature = hmac.digest("hex");

  return computedSignature === signature;
}

/**
 * Extract token from Authorization header
 */
function extractBearerToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Invalid Authorization header format");
  }

  return authHeader.substring(7); // Remove "Bearer " prefix
}

module.exports = {
  verifyJWT,
  verifyWebhookSignature,
  extractBearerToken,
};
