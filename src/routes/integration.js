const express = require("express");
const { eq } = require("drizzle-orm");
const { db, userSettings, phoneMapping, messageLog } = require("../db");
const MondayService = require("../services/monday");
const WhatsAbleService = require("../services/whatsable");
const { verifyJWT } = require("../utils/crypto");

const router = express.Router();

async function getWhatsAbleKey(userId) {
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  return settings?.whatsableApiKey || process.env.WHATSABLE_API_KEY;
}

async function storePhoneMapping(phone, itemId, boardId, userId, mondayToken) {
  await db
    .insert(phoneMapping)
    .values({
      phone: phone.replace(/\D/g, ""),
      itemId,
      boardId,
      userId,
      mondayToken,
    })
    .onConflictDoUpdate({
      target: phoneMapping.phone,
      set: { itemId, boardId, userId, mondayToken },
    });
}

router.post("/send-on-create", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = verifyJWT(token, process.env.MONDAY_SIGNING_SECRET);

    const { payload } = req.body;
    const { inputFields } = payload;

    const mondayToken = decoded.mondayToken || decoded.backToMondayToken;
    const whatsableApiKey = await getWhatsAbleKey(decoded.userId);

    const mondayService = new MondayService(mondayToken);
    const whatsableService = new WhatsAbleService(whatsableApiKey);

    // Get item details
    const itemResult = await mondayService.getItemById(inputFields.itemId);
    const item = itemResult.data.items[0];

    const phoneNumber = mondayService.extractPhoneNumber(item);
    if (!phoneNumber) {
      return res.status(400).json({ error: "No phone number found" });
    }

    // Store mapping
    await storePhoneMapping(
      phoneNumber,
      item.id,
      item.board.id,
      decoded.userId,
      mondayToken
    );

    // Send message
    const message = inputFields.customMessage || `📋 New item: ${item.name}`;
    const result = await whatsableService.sendMessage(phoneNumber, message);

    // Log message
    await db.insert(messageLog).values({
      phone: phoneNumber,
      message,
      direction: "outgoing",
      itemId: item.id,
      boardId: item.board.id,
      messageId: result.messageId,
    });

    res.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error("Integration error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

module.exports = router;
