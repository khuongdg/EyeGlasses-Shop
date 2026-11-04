const authService = require('../services/authService');

const getCookieOptions = (maxAgeMs = 7 * 24 * 60 * 60 * 1000) => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: maxAgeMs
  };
};

const getClearCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  };
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await authService.login(username, password);

    // Lưu Access Token & Refresh Token vào HTTP-Only Cookie bảo mật
    res.cookie('token', result.token, getCookieOptions(7 * 24 * 60 * 60 * 1000));
    res.cookie('refreshToken', result.refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.json({
      success: true,
      data: {
        token: result.token,
        user: result.user
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const result = await authService.refreshAccessToken(refreshToken);

    // Xoay vòng Access Token & Refresh Token mới vào HTTP-Only Cookie
    res.cookie('token', result.token, getCookieOptions(7 * 24 * 60 * 60 * 1000));
    res.cookie('refreshToken', result.refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.json({
      success: true,
      data: {
        token: result.token,
        user: result.user
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

exports.logout = async (req, res) => {
  const clearOpts = getClearCookieOptions();
  res.clearCookie('token', clearOpts);
  res.clearCookie('refreshToken', clearOpts);
  res.json({
    success: true,
    message: 'Đăng xuất thành công'
  });
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    await authService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};