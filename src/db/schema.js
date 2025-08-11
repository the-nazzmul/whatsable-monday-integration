const {
  pgTable,
  text,
  uuid,
  timestamp,
  pgEnum,
} = require("drizzle-orm/pg-core");

const directionEnum = pgEnum("direction", ["outgoing", "incoming"]);

const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey(),
  mondayToken: text("monday_token").notNull(),
  whatsableApiKey: text("whatsable_api_key"),
  defaultTemplate: text("default_template"),
  phoneColumnId: text("phone_column_id").default("phone"),
  settings: text("settings").default("{}"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const phoneMapping = pgTable("phone_mapping", {
  id: uuid("id").defaultRandom().primaryKey(),
  phone: text("phone").notNull(),
  itemId: text("item_id").notNull(),
  boardId: text("board_id").notNull(),
  userId: text("user_id").notNull(),
  mondayToken: text("monday_token").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

const messageLog = pgTable("message_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  phone: text("phone").notNull(),
  message: text("message").notNull(),
  direction: directionEnum("direction").notNull(),
  itemId: text("item_id"),
  boardId: text("board_id"),
  messageId: text("message_id"),
  status: text("status").default("sent"),
  createdAt: timestamp("created_at").defaultNow(),
});

module.exports = {
  userSettings,
  phoneMapping,
  messageLog,
};
