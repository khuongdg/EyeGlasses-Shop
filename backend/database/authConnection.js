const mongoose = require('mongoose');
require('dotenv').config();

const authConnection = mongoose.createConnection(
  process.env.AUTH_DB_URI
);

authConnection.on('connected', () => {
  console.log('Connected to auth_db');
});

authConnection.on('error', (err) => {
  console.error('Auth DB error:', err.message);
});

module.exports = authConnection;