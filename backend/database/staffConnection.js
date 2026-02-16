const mongoose = require('mongoose');
require('dotenv').config();

const staffConnection = mongoose.createConnection(
  process.env.STAFF_DB_URI
);

staffConnection.on('connected', () => {
  console.log('Connected to staff_db');
});

staffConnection.on('error', (err) => {
  console.error('Staff DB error:', err.message);
});

module.exports = staffConnection;