const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { TENANTS, tenantStorage } = require('../database/tenantManager');

exports.login = async (username, password) => {
  let matchedUser = null;
  let matchedTenant = null;

  // Quét qua danh sách các Tenant DB để tìm tài khoản
  for (const tenant of TENANTS) {
    await tenantStorage.run({ dbName: tenant.dbName, tenantSlug: tenant.slug }, async () => {
      const user = await User.findOne({ username, isActive: true });
      if (user) {
        const isMatch = await user.comparePassword(password);
        if (isMatch) {
          matchedUser = user;
          matchedTenant = tenant;
        }
      }
    });

    if (matchedUser) break;
  }

  if (!matchedUser || !matchedTenant) {
    throw new Error('Sai tài khoản hoặc mật khẩu');
  }

  // Access Token chứa thông tin dbName và tenantSlug
  const token = jwt.sign(
    {
      userId: matchedUser._id,
      role: matchedUser.role,
      dbName: matchedTenant.dbName,
      tenantSlug: matchedTenant.slug,
      companyName: matchedTenant.name
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  // Refresh Token chứa thông tin dbName và tenantSlug
  const refreshToken = jwt.sign(
    {
      userId: matchedUser._id,
      role: matchedUser.role,
      dbName: matchedTenant.dbName,
      tenantSlug: matchedTenant.slug,
      companyName: matchedTenant.name,
      type: 'refresh'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    token,
    refreshToken,
    user: {
      _id: matchedUser._id,
      username: matchedUser.username,
      role: matchedUser.role,
      tenantSlug: matchedTenant.slug,
      dbName: matchedTenant.dbName,
      companyName: matchedTenant.name
    }
  };
};

exports.refreshAccessToken = async (token) => {
  if (!token) throw new Error('Refresh Token không tồn tại');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Token không hợp lệ');
    }

    const dbName = decoded.dbName || 'invoice_db';
    const tenantSlug = decoded.tenantSlug || 'thuanthien';
    const companyName = decoded.companyName || 'Mắt Kính Thuận Thiên';

    let user = null;
    await tenantStorage.run({ dbName, tenantSlug }, async () => {
      user = await User.findOne({ _id: decoded.userId, isActive: true });
    });

    if (!user) {
      throw new Error('Tài khoản đã bị khoá hoặc không tồn tại');
    }

    const newAccessToken = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        dbName,
        tenantSlug,
        companyName
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        dbName,
        tenantSlug,
        companyName,
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
        role: user.role,
        tenantSlug,
        dbName,
        companyName
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