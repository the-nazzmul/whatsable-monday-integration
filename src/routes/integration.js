const express = require("express");
const { eq, and } = require("drizzle-orm");
const { db, userSettings, phoneMapping, messageLog } = require("../db");
const MondayService = require("../services/monday");
const WhatsAbleService = require("../services/whatsable");
const { verifyJWT } = require("../utils/crypto");
const {
  extractPhoneFromItem,
  generateDefaultMessage,
} = require("../utils/helpers");

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
      target: [phoneMapping.phone, phoneMapping.userId],
      set: { itemId, boardId, mondayToken, createdAt: new Date() },
    });
}

// Send message when item is created
router.post("/send-on-create", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = verifyJWT(token, process.env.MONDAY_SIGNING_SECRET);

    const { payload } = req.body;
    const { inputFields } = payload;

    const mondayToken = decoded.mondayToken || decoded.backToMondayToken;
    const whatsableApiKey = await getWhatsAbleKey(decoded.userId);

    if (!whatsableApiKey) {
      return res
        .status(400)
        .json({ error: "WhatsAble API key not configured" });
    }

    const mondayService = new MondayService(mondayToken);
    const whatsableService = new WhatsAbleService(whatsableApiKey);

    // Get item details
    const itemResult = await mondayService.getItemById(inputFields.itemId);
    const item = itemResult.data.items[0];

    const phoneNumber = extractPhoneFromItem(item);
    if (!phoneNumber) {
      return res.status(400).json({ error: "No phone number found in item" });
    }

    // Store mapping
    await storePhoneMapping(
      phoneNumber,
      item.id,
      item.board.id,
      decoded.userId,
      mondayToken
    );

    // Generate message
    const message =
      inputFields.customMessage ||
      generateDefaultMessage("item_created", item.name, item.board.name);

    // Send message
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

// Send message when item is updated
router.post("/send-on-update", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = verifyJWT(token, process.env.MONDAY_SIGNING_SECRET);

    const { payload } = req.body;
    const { inputFields } = payload;

    const mondayToken = decoded.mondayToken || decoded.backToMondayToken;
    const whatsableApiKey = await getWhatsAbleKey(decoded.userId);

    if (!whatsableApiKey) {
      return res
        .status(400)
        .json({ error: "WhatsAble API key not configured" });
    }

    const mondayService = new MondayService(mondayToken);
    const whatsableService = new WhatsAbleService(whatsableApiKey);

    // Get item details
    const itemResult = await mondayService.getItemById(inputFields.itemId);
    const item = itemResult.data.items[0];

    const phoneNumber = extractPhoneFromItem(item);
    if (!phoneNumber) {
      return res.status(400).json({ error: "No phone number found in item" });
    }

    // Update mapping
    await storePhoneMapping(
      phoneNumber,
      item.id,
      item.board.id,
      decoded.userId,
      mondayToken
    );

    // Generate message based on update type
    let message;
    if (inputFields.customMessage) {
      message = inputFields.customMessage;
    } else if (inputFields.columnId) {
      message = generateDefaultMessage(
        "column_changed",
        item.name,
        item.board.name
      );
    } else {
      message = generateDefaultMessage(
        "item_updated",
        item.name,
        item.board.name
      );
    }

    // Send message
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
    console.error("Update integration error:", error);
    res.status(500).json({ error: "Failed to send update message" });
  }
});

// Send template message
router.post("/send-template", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = verifyJWT(token, process.env.MONDAY_SIGNING_SECRET);

    const { payload } = req.body;
    const { inputFields } = payload;

    const mondayToken = decoded.mondayToken || decoded.backToMondayToken;
    const whatsableApiKey = await getWhatsAbleKey(decoded.userId);

    if (!whatsableApiKey) {
      return res
        .status(400)
        .json({ error: "WhatsAble API key not configured" });
    }

    const mondayService = new MondayService(mondayToken);
    const whatsableService = new WhatsAbleService(whatsableApiKey);

    // Get item details
    const itemResult = await mondayService.getItemById(inputFields.itemId);
    const item = itemResult.data.items[0];

    const phoneNumber = extractPhoneFromItem(item);
    if (!phoneNumber) {
      return res.status(400).json({ error: "No phone number found in item" });
    }

    // Store mapping
    await storePhoneMapping(
      phoneNumber,
      item.id,
      item.board.id,
      decoded.userId,
      mondayToken
    );

    // Prepare template variables
    const variables = {
      body1: item.name,
      body2: item.board.name,
      ...JSON.parse(inputFields.templateVariables || "{}"),
    };

    // Send template message
    const result = await whatsableService.sendTemplateMessage(
      phoneNumber,
      inputFields.templateName,
      variables
    );

    // Log message
    await db.insert(messageLog).values({
      phone: phoneNumber,
      message: `Template: ${inputFields.templateName}`,
      direction: "outgoing",
      itemId: item.id,
      boardId: item.board.id,
      messageId: result.messageId,
    });

    res.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error("Template integration error:", error);
    res.status(500).json({ error: "Failed to send template message" });
  }
});

module.exports = router;
