const axios = require("axios");
const { formatPhoneNumber, isValidPhoneNumber } = require("../utils/helpers");

class WhatsAbleService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = process.env.WHATSABLE_API_URL || "https://api.whatsable.app";
  }

  async sendMessage(phone, message, template = null, variables = {}) {
    const formattedPhone = formatPhoneNumber(phone);

    if (!isValidPhoneNumber(formattedPhone)) {
      throw new Error(`Invalid phone number: ${phone}`);
    }

    try {
      const payload = {
        phone: formattedPhone,
        message,
      };

      if (template) {
        payload.template = template;
        payload.variables = variables;
      }

      const response = await axios.post(`${this.apiUrl}/send`, payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      return response.data;
    } catch (error) {
      console.error(
        "WhatsAble API Error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async sendTemplateMessage(phone, templateName, variables) {
    const formattedPhone = formatPhoneNumber(phone);

    if (!isValidPhoneNumber(formattedPhone)) {
      throw new Error(`Invalid phone number: ${phone}`);
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/send-template`,
        {
          phone: formattedPhone,
          template: templateName,
          variables,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        `WhatsAble Template API Error: `,
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async getTemplates() {
    try {
      const response = await axios.get(`${this.apiUrl}/templates`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error(
        "WhatsAble Templates API Error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
}

module.exports = WhatsAbleService;
