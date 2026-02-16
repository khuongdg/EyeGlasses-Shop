const mongoose = require('mongoose');
require('dotenv').config();

const invoiceConnection = mongoose.createConnection(
  process.env.INVOICE_DB_URI
);

invoiceConnection.on('connected', () => {
  console.log('Connected to invoice_db');
});

invoiceConnection.on('error', (err) => {
  console.error('Invoice DB error:', err.message);
});

module.exports = invoiceConnection;