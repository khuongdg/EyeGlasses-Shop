const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

router.post('/login', authController.login);
router.patch('/change-password', authenticate, authController.changePassword);

module.exports = router;
