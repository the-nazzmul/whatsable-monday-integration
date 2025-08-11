const jwt = require("jsonwebtoken");

export function verifyJWT(token, secret) {
  try {
    // This decodes and verifies the JWT signature
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error("Invalid JWT token");
  }
}
