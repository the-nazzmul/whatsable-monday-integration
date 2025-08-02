const axios = require("axios");

class MondayServices {
  constructor(token) {
    this.token = token;
    this.apiUrl = "https://api.monday.com/v2";
  }
  async makeRequest(query, variables = {}) {
    try {
      const response = await axios.post(
        this.apiUrl,
        { query, variables },
        {
          headers: {
            Authorization: this.token,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Monday API Error", error.response?.data || error.message);
      throw error;
    }
  }
  async getMe() {
    const query = `query { me { id name email } }`;
    return this.makeRequest(query);
  }

  async getBoardItems(boardId) {
    const query = `
        query ($boardId: [ID!]!) {
            boards (ids: $boardId) {
            id
            name
            items {
                id
                name
                column_values {
                    id
                    text
                    value
                }
            }
        }
    }
    `;
    return this.makeRequest(query, { boardId: [boardId] });
  }

  async getItemById(itemId) {
    const query = `
      query ($itemId: [ID!]!) {
        items (ids: $itemId) {
          id
          name
          column_values {
            id
            text
            value
            type
          }
          board {
            id
            name
          }
        }
      }
    `;
    return this.makeRequest(query, { itemId: [itemId] });
  }

  async createUpdate(itemId, body) {
    const query = `
        mutation ($itemId: ID!, $body: String!) {
            create_update (item_id: $itemId, body: $body) {
            id
            body
            }    
        }
    `;
    return this.makeRequest(query, { itemId, body });
  }

  async createWebhook(boardId, url, event, config = null) {
    const query = `
      mutation ($boardId: ID!, $url: String!, $event: WebhookEventType!, $config: JSON) {
        create_webhook (board_id: $boardId, url: $url, event: $event, config: $config) {
          id
          board_id
        }
      }
    `;
    return this.makeRequest(query, { boardId, url, event, config });
  }

  extractPhoneNumber(item) {
    // Look for phone number in various column types
    const phoneColumns = ["phone", "whatsapp", "mobile", "contact"];

    for (const col of item.column_values) {
      if (
        phoneColumns.some((phoneCol) => col.id.toLowerCase().includes(phoneCol))
      ) {
        return col.text || col.value;
      }
    }

    return null;
  }
}

module.exports = MondayServices;
