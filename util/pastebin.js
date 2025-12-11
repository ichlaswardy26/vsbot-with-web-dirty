const axios = require("axios");
require("dotenv").config();

let userKey = null;

async function loginToPastebin() {
  if (userKey) return userKey;

  const response = await axios.post("https://pastebin.com/api/api_login.php", null, {
    params: {
      api_dev_key: 'UUOCpEDrgSt36Kf4134Wcya9-excA2JX',
      api_user_name: 'seraphyxCS',
      api_user_password: 'paloang098098',
    },
  });

  if (response.data.startsWith("Bad API request")) {
    throw new Error("Pastebin login failed: " + response.data);
  }

  userKey = response.data;
  return userKey;
}

async function createPaste(title, content) {
  const key = await loginToPastebin();

  const response = await axios.post("https://pastebin.com/api/api_post.php", null, {
    params: {
      api_dev_key: 'UUOCpEDrgSt36Kf4134Wcya9-excA2JX',
      api_user_key: key,
      api_option: "paste",
      api_paste_code: "",
      api_paste_name: title,
      api_paste_format: "html5",
      api_paste_private: 1,
      api_paste_expire_date: "N",
      api_paste_code: "",
      api_paste_data: content,
    },
  });

  if (response.data.startsWith("Bad API request")) {
    throw new Error("Failed to create paste: " + response.data);
  }

  return response.data; // paste URL
}

module.exports = { createPaste };