require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const authConnection = require('../database/authConnection');

(async () => {
  try {
    await authConnection;

    const existsAdmin = await User.findOne({ username: 'admin' });
    if (!existsAdmin) {
      await User.create({
        username: 'admin',
        password: '123456',
        role: 'ADMIN'
      });
      console.log('Admin created');
    }

    const existsStaff = await User.findOne({ username: 'staff' });
    if (!existsStaff) {
      await User.create({
        username: 'staff',
        password: '123456',
        role: 'STAFF'
      });
      console.log('Staff created');
    }

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
