const express = require("express");
const jwt = require("jsonwebtoken");
const MondayServices = require("../services/monday");
const { verifyJWT } = require("../utils/crypto");
const axios = require("axios");

const router = express.Router();

router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.status(400).json({ error: "Authorization code required" });
    }

    const tokenResponse = await axios.post(
      "https://auth.monday.com/oauth2/token",
      {
        client_id: process.env.MONDAY_CLIENT_ID,
        client_secret: process.env.MONDAY_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }
    );
    const { access_token } = tokenResponse.data;

    // get user info

    const mondayService = new MondayServices(access_token);
    const userInfo = await mondayService.getMe();

    // store the token

    const sessionToken = jwt.sign(
      {
        mondayToken: access_token,
        userId: userInfo.data.me.id,
        email: userInfo.data.me.email,
      },
      process.env.MONDAY_CLIENT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      sessionToken,
      user: userInfo.data.me,
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

router.use("/protected", (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);
    const decoded = verifyJWT(token, process.env.MONDAY_SIGNING_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
