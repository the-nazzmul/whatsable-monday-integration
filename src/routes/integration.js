const express = require("express");
const MondayService = require("../services/monday");
const WhatsAbleService = require("../services/whatsable");
const { verifyJWT } = require("../utils/crypto");

const router = express.Router();

// Integration recipe: Send WhatsApp when item created
router.post("/send-on-create", async (req, res) => {
  try {
    // Verify the request is from Monday.com
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyJWT(token, process.env.MONDAY_SIGNING_SECRET);

    const { payload } = req.body;
    const { inputFields } = payload;

    // Get Monday.com access token from storage
    const mondayToken = decoded.mondayToken;
    const mondayService = new MondayService(mondayToken);
    const whatsableService = new WhatsAbleService(
      process.env.WHATSABLE_API_KEY
    );

    // Get item details
    const itemResult = await mondayService.getItemById(inputFields.itemId);
    const item = itemResult.data.items[0];

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Extract phone number
    const phoneNumber = mondayService.extractPhoneNumber(item);

    if (!phoneNumber) {
      return res.status(400).json({ error: "No phone number found in item" });
    }

    // Send WhatsApp message
    const message =
      inputFields.customMessage ||
      `New item created: ${item.name} in board ${item.board.name}`;

    const templateName = inputFields.templateName;
    const templateVariables = {
      item_name: item.name,
      board_name: item.board.name,
      custom_message: inputFields.customMessage || "",
    };

    let result;
    if (templateName) {
      result = await whatsableService.sendTemplateMessage(
        phoneNumber,
        templateName,
        templateVariables
      );
    } else {
      result = await whatsableService.sendMessage(phoneNumber, message);
    }

    res.json({
      success: true,
      messageId: result.messageId,
      phone: phoneNumber,
      message: templateName ? `Template: ${templateName}` : message,
    });
  } catch (error) {
    console.error("Integration error:", error);
    res.status(500).json({ error: "Failed to send WhatsApp message" });
  }
});

// Integration recipe: Send WhatsApp when column changes
router.post("/send-on-column-change", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyJWT(token, process.env.MONDAY_SIGNING_SECRET);

    const { payload } = req.body;
    const { inputFields } = payload;

    const mondayToken = decoded.mondayToken;
    const mondayService = new MondayService(mondayToken);
    const whatsableService = new WhatsAbleService(
      process.env.WHATSABLE_API_KEY
    );

    // Get item details
    const itemResult = await mondayService.getItemById(inputFields.itemId);
    const item = itemResult.data.items[0];

    const phoneNumber = mondayService.extractPhoneNumber(item);

    if (!phoneNumber) {
      return res.status(400).json({ error: "No phone number found" });
    }

    // Find the changed column
    const changedColumn = item.column_values.find(
      (col) => col.id === inputFields.columnId
    );

    const message = `${item.name} - ${
      changedColumn?.id || "Column"
    } updated to: ${changedColumn?.text || "New value"}`;

    const result = await whatsableService.sendMessage(phoneNumber, message);

    res.json({
      success: true,
      messageId: result.messageId,
      phone: phoneNumber,
      message,
    });
  } catch (error) {
    console.error("Column change integration error:", error);
    res.status(500).json({ error: "Failed to send WhatsApp message" });
  }
});

module.exports = router;
