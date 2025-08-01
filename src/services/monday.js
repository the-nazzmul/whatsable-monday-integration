const axios = require("axios");

class MondayServices {
  constructor(token) {
    this.token = token;
    this.apiUrl = "https://api.monday.com/v2";
  }
}

async function makeRequest(query, variables = {}) {
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
