const mongoose = require('mongoose');
require('dotenv').config();

const productConnection = mongoose.createConnection(
  process.env.PRODUCT_DB_URI
);

productConnection.on('connected', () => {
  console.log('Connected to product_db');
});

productConnection.on('error', (err) => {
  console.error('Product DB error:', err.message);
});

module.exports = productConnection;
