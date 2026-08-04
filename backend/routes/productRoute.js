const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const variantController = require('../controllers/variantController');
const { authenticate } = require('../middlewares/authMiddleware');
const { allowRoles } = require('../middlewares/roleMiddleware');

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Các API liên quan đến Sản phẩm và Biến thể kính mắt
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Lấy danh sách sản phẩm phân trang
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang cần hiển thị
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số sản phẩm tối đa trên mỗi trang
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get('/', productController.getAllProducts);
router.get('/search', productController.searchProducts);
router.get('/:productId/variants/search', variantController.searchVariants); // SKU search
router.get('/variants/search/price', variantController.searchVariantsByPrice);

/**
 * @swagger
 * /api/products/create:
 *   post:
 *     summary: Tạo sản phẩm mới
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - brand
 *               - originCountry
 *             properties:
 *               name:
 *                 type: string
 *                 example: 9512
 *               brand:
 *                 type: string
 *                 example: Christian DG
 *               originCountry:
 *                 type: string
 *                 example: PRC
 *               description:
 *                 type: string
 *                 example: Nhập khẩu chính hãng
 *     responses:
 *       201:
 *         description: Tạo sản phẩm thành công
 *       401:
 *         description: Không có quyền truy cập (chỉ dành cho ADMIN)
 */
router.post('/create', authenticate, allowRoles('ADMIN'), productController.createProduct);
router.post('/ai-import', productController.aiBulkImport);

// Get all variants
router.get('/variants', variantController.getAllVariants);
// Tìm variant theo SKU chính xác (dùng cho quét QR - không lọc isActive để luôn tìm thấy)
router.get('/variants/by-sku', variantController.getVariantBySku);

/**
 * @swagger
 * /api/products/{slug}/variants:
 *   get:
 *     summary: Lấy danh sách biến thể của sản phẩm theo slug hoặc ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug sản phẩm hoặc ID sản phẩm
 *     responses:
 *       200:
 *         description: Lấy thông tin chi tiết và biến thể thành công
 */
router.get('/:slug/variants', variantController.getVariantsByProduct);

/**
 * @swagger
 * /api/products/{slug}/variants/create:
 *   post:
 *     summary: Thêm biến thể mới cho sản phẩm
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug sản phẩm hoặc ID sản phẩm
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - colorCode
 *               - price
 *             properties:
 *               colorCode:
 *                 type: string
 *                 example: C7
 *               unit:
 *                 type: string
 *                 example: Cây
 *               price:
 *                 type: number
 *                 example: 520000
 *               inventory:
 *                 type: number
 *                 example: 0
 *     responses:
 *       201:
 *         description: Tạo biến thể thành công
 */
router.post('/:slug/variants/create', variantController.createVariant);

// Update product
router.patch('/:productId', productController.updateProduct);
// Update variant
router.patch('/:slug/variants/:variantId', variantController.updateVariant);

/**
 * @swagger
 * /api/products/{productId}:
 *   delete:
 *     summary: Vô hiệu hoá (Soft delete / "Huỷ") hoặc Xoá vĩnh viễn (Hard delete) sản phẩm
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sản phẩm
 *     responses:
 *       200:
 *         description: Thực hiện thao tác thành công
 */
router.delete('/:productId', productController.deleteProduct);
// Soft delete variant
router.delete('/:slug/variants/:variantId', variantController.deleteVariant);

// Restore product
router.patch('/:productId/restore', productController.restoreProduct);
// Restore variant
router.patch('/:slug/variants/:variantId/restore', variantController.restoreVariant);

module.exports = router;
