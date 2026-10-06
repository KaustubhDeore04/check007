const fs = require('fs/promises');
const path = require('path');

const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');
const ENQUIRIES_FILE = path.join(__dirname, '..', 'data', 'enquiries.json');
const ADMIN_FILE = path.join(__dirname, '..', 'data', 'admin.json');

async function readJson(file) {
  const raw = await fs.readFile(file, 'utf-8');
  return JSON.parse(raw);
}

async function writeJson(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  getProducts: () => readJson(PRODUCTS_FILE),
  saveProducts: (data) => writeJson(PRODUCTS_FILE, data),
  getEnquiries: () => readJson(ENQUIRIES_FILE),
  saveEnquiries: (data) => writeJson(ENQUIRIES_FILE, data),

  // ---- Admin credentials (persisted so a password reset survives restarts) ----
  adminFileExists: () => fileExists(ADMIN_FILE),
  getAdminCredentials: () => readJson(ADMIN_FILE),
  saveAdminCredentials: (data) => writeJson(ADMIN_FILE, data),
};
