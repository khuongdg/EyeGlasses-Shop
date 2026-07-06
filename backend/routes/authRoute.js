const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Các API liên quan đến Xác thực và Quản lý tài khoản
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập vào hệ thống
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, thiết lập Http-Only cookie refreshToken và trả về accessToken
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: refreshToken=abcde...; Path=/; HttpOnly; Secure; SameSite=None
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: 60d5ec49f1b29a3e20e8b1c4
 *                         username:
 *                           type: string
 *                           example: admin
 *                         role:
 *                           type: string
 *                           example: ADMIN
 *       401:
 *         description: Sai tài khoản hoặc mật khẩu
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Làm mới Access Token (Silent Refresh)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Cấp Access Token mới và thiết lập cookie Refresh Token mới để xoay vòng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 *       401:
 *         description: Refresh Token hết hạn hoặc không hợp lệ
 */
router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Đăng xuất khỏi hệ thống
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Xoá bỏ cookie Refresh Token và đăng xuất thành công
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /api/auth/change-password:
 *   patch:
 *     summary: Thay đổi mật khẩu tài khoản
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *       400:
 *         description: Mật khẩu cũ không chính xác hoặc thiếu trường bắt buộc
 *       401:
 *         description: Không có quyền truy cập (thiếu Bearer Token)
 */
router.patch('/change-password', authenticate, authController.changePassword);

module.exports = router;
