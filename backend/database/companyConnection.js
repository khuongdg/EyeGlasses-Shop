const mongoose = require('mongoose');
require('dotenv').config();

const companyConnection = mongoose.createConnection(
  process.env.COMPANY_DB_URI
);

companyConnection.on('connected', () => {
  console.log('Connected to company_db');
});

companyConnection.on('error', (err) => {
  console.error('Company DB error:', err.message);
});

module.exports = companyConnection;