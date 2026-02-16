const mongoose = require('mongoose');
require('dotenv').config();

const customerConnection = mongoose.createConnection(
  process.env.CUSTOMER_DB_URI
);

customerConnection.on('connected', () => {
  console.log('Connected to customer_db');
});

customerConnection.on('error', (err) => {
  console.error('Customer DB error:', err.message);
});

module.exports = customerConnection;
