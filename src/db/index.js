const { neon } = require("@neondatabase/serverless");
const { drizzle } = require("drizzle-orm/neon-http");
const { userSettings, phoneMapping, messageLog } = require("./schema");

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function initDatabase() {
  try {
    // Test connection
    await sql`SELECT 1`;
    console.log("Database connection established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    throw error;
  }
}

module.exports = {
  db,
  userSettings,
  phoneMapping,
  messageLog,
  initDatabase,
};
