const authService = require('../services/authService');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await authService.login(username, password);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
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