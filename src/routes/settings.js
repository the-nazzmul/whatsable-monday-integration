const express = require("express");
const { eq } = require("drizzle-orm");
const { db, userSettings } = require("../db");
const { authenticateMonday } = require("../middleware/auth");
const WhatsAbleService = require("../services/whatsable");

const router = express.Router();

// GET user settings
router.get("/", authenticateMonday, async (req, res) => {
  try {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, req.user.userId));

    if (!settings) {
      return res.json({
        whatsableApiKey: "",
        defaultTemplate: "",
        phoneColumnId: "phone",
        settings: "{}",
      });
    }

    // Don't return the actual API key for security
    res.json({
      whatsableApiKey: settings.whatsableApiKey ? "••••••••" : "",
      defaultTemplate: settings.defaultTemplate || "",
      phoneColumnId: settings.phoneColumnId || "phone",
      settings: settings.settings || "{}",
      hasApiKey: !!settings.whatsableApiKey,
    });
  } catch (error) {
    console.error("Settings fetch error:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// POST/UPDATE user settings
router.post("/", authenticateMonday, async (req, res) => {
  try {
    const {
      whatsableApiKey,
      defaultTemplate,
      phoneColumnId,
      settings: customSettings,
    } = req.body;

    // Validate WhatsAble API key if provided
    if (whatsableApiKey && whatsableApiKey !== "••••••••") {
      const whatsableService = new WhatsAbleService(whatsableApiKey);
      try {
        // Test the API key by trying to get templates
        await whatsableService.getTemplates();
      } catch (error) {
        return res.status(400).json({
          error: "Invalid WhatsAble API key",
          details: error.message,
        });
      }
    }

    // Prepare update data
    const updateData = {
      defaultTemplate: defaultTemplate || null,
      phoneColumnId: phoneColumnId || "phone",
      settings: customSettings || "{}",
      updatedAt: new Date(),
    };

    // Only update API key if it's not the masked value
    if (whatsableApiKey && whatsableApiKey !== "••••••••") {
      updateData.whatsableApiKey = whatsableApiKey;
    }

    // Upsert settings
    await db
      .insert(userSettings)
      .values({
        userId: req.user.userId,
        mondayToken: req.mondayToken,
        ...updateData,
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: updateData,
      });

    res.json({ success: true, message: "Settings saved successfully" });
  } catch (error) {
    console.error("Settings save error:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// Test WhatsAble connection
router.post("/test-connection", authenticateMonday, async (req, res) => {
  try {
    const { whatsableApiKey, testPhone } = req.body;

    if (!whatsableApiKey || whatsableApiKey === "••••••••") {
      return res.status(400).json({ error: "API key required for testing" });
    }

    const whatsableService = new WhatsAbleService(whatsableApiKey);

    if (testPhone) {
      // Send test message
      await whatsableService.sendMessage(
        testPhone,
        "🧪 Test message from WhatsAble Monday.com integration"
      );
      res.json({ success: true, message: "Test message sent successfully" });
    } else {
      // Just test API connection
      await whatsableService.getTemplates();
      res.json({ success: true, message: "API connection successful" });
    }
  } catch (error) {
    console.error("Connection test error:", error);
    res.status(400).json({
      error: "Connection test failed",
      details: error.message,
    });
  }
});

module.exports = router;
