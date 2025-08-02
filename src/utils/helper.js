/**
 * Global phone number utilities - works for any country
 */

/**
 * Format phone number to international format
 * Simple approach: clean digits and add + prefix
 */
function formatPhoneNumber(phone) {
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");

  // Must have at least 7 digits to be valid
  if (digits.length < 7) return "";

  return `+${digits}`;
}

/**
 * Validate phone number format
 * Basic validation for international format
 */
function isValidPhoneNumber(phone) {
  if (!phone) return false;
  return /^\+\d{7,15}$/.test(phone);
}

/**
 * Extract phone from Monday.com item
 * Looks for common phone column patterns
 */
function extractPhoneFromItem(item) {
  if (!item?.column_values) return null;

  const phoneColumns = [
    "phone",
    "whatsapp",
    "mobile",
    "contact",
    "telephone",
    "cell",
  ];

  for (const col of item.column_values) {
    if (
      phoneColumns.some((pattern) => col.id.toLowerCase().includes(pattern))
    ) {
      const phoneValue = col.text || col.value;
      if (phoneValue) {
        const formatted = formatPhoneNumber(phoneValue);
        return isValidPhoneNumber(formatted) ? formatted : null;
      }
    }
  }

  return null;
}

/**
 * Clean phone for database storage (digits only)
 */
function cleanPhoneForStorage(phone) {
  return phone ? phone.replace(/\D/g, "") : "";
}

module.exports = {
  formatPhoneNumber,
  isValidPhoneNumber,
  extractPhoneFromItem,
  cleanPhoneForStorage,
};
