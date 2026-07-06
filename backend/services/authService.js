const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

exports.login = async (username, password) => {
  const user = await User.findOne({ username, isActive: true });

  if (!user) throw new Error('Sai tài khoản hoặc mật khẩu');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new Error('Sai tài khoản hoặc mật khẩu');

  // Access Token thời hạn ngắn (15 phút)
  const token = jwt.sign(
    {
      userId: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  // Refresh Token thời hạn dài (7 ngày), lưu ở HTTP-Only Cookie
  const refreshToken = jwt.sign(
    {
      userId: user._id,
      role: user.role,
      type: 'refresh'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    token,
    refreshToken,
    user: {
      _id: user._id,
      username: user.username,
      role: user.role
    }
  };
};

exports.refreshAccessToken = async (token) => {
  if (!token) throw new Error('Refresh Token không tồn tại');

  try {
    // Xác thực Refresh Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Token không hợp lệ');
    }

    // Kiểm tra tài khoản người dùng còn hoạt động không
    const user = await User.findOne({ _id: decoded.userId, isActive: true });
    if (!user) {
      throw new Error('Tài khoản đã bị khoá hoặc không tồn tại');
    }

    // Tạo mới Access Token (15 phút)
    const newAccessToken = jwt.sign(
      {
        userId: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Tạo mới Refresh Token để xoay vòng (Token Rotation - 7 ngày)
    const newRefreshToken = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        type: 'refresh'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role
      }
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh Token đã hết hạn');
    }
    throw new Error(error.message || 'Xác thực Refresh Token thất bại');
  }
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