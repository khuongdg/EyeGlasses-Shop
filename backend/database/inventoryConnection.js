const mongoose = require('mongoose');
require('dotenv').config();

const inventoryConnection = mongoose.createConnection(
  process.env.INVENTORY_DB_URI
);

inventoryConnection.on('connected', () => {
  console.log('Connected to inventory_db');
});

inventoryConnection.on('error', (err) => {
  console.error('Inventory DB error:', err.message);
});

module.exports = inventoryConnection;