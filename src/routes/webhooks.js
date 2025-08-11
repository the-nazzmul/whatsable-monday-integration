const express = require("express");
const { eq } = require("drizzle-orm");
const { db, phoneMapping, messageLog } = require("../db");
const MondayService = require("../services/monday");
const { formatPhoneNumber } = require("../utils/helpers");

const router = express.Router();

router.post("/whatsable", async (req, res) => {
  try {
    const { type, phone, message, timestamp, messageId } = req.body;
    const formattedPhone = formatPhoneNumber(phone);

    // Log message
    await db.insert(messageLog).values({
      phone: formattedPhone,
      message,
      direction: type === "message_received" ? "incoming" : "outgoing",
      messageId,
      status: "received",
    });

    if (type !== "message_received") {
      return res.json({ success: true });
    }

    // Find mapping
    const [mapping] = await db
      .select()
      .from(phoneMapping)
      .where(eq(phoneMapping.phone, formattedPhone.replace(/\D/g, "")));

    if (!mapping) {
      return res.json({ success: true });
    }

    // Create Monday update
    const mondayService = new MondayService(mapping.mondayToken);
    await mondayService.createUpdate(
      mapping.itemId,
      `📱 WhatsApp Reply: ${message}`
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Processing failed" });
  }
});

module.exports = router;
