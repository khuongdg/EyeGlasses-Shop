const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

exports.login = async (username, password) => {
  const user = await User.findOne({ username, isActive: true });

  if (!user) throw new Error('Sai tài khoản hoặc mật khẩu');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new Error('Sai tài khoản hoặc mật khẩu');

  const token = jwt.sign(
    {
      userId: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  return {
    token,
    user: {
      _id: user._id,
      username: user.username,
      role: user.role
    }
  };
};

exports.changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword; 
  await user.save(); 

  return true;
};