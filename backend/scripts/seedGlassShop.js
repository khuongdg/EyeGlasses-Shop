require('dotenv').config();
const { tenantStorage, getTenantConnection } = require('../database/tenantManager');
const User = require('../models/User');
const Company = require('../models/Company');

(async () => {
  try {
    console.log('Connecting to glass_shop_db...');
    const conn = getTenantConnection('glass_shop_db');

    // Chờ kết nối MongoDB sẵn sàng
    if (conn.readyState !== 1) {
      await new Promise((resolve, reject) => {
        conn.once('open', resolve);
        conn.once('error', reject);
      });
    }

    console.log('Seeding data for glass_shop_db...');

    await tenantStorage.run({ dbName: 'glass_shop_db', tenantSlug: 'glassshop' }, async () => {
      // 1. Tạo tài khoản Admin cho công ty mới
      let existsAdmin = await User.findOne({ username: 'admin_glass' });
      if (!existsAdmin) {
        existsAdmin = await User.create({
          username: 'admin_glass',
          password: '123456',
          role: 'ADMIN'
        });
        console.log('✓ Created Admin user: admin_glass / 123456');
      } else {
        console.log('✓ Admin user admin_glass already exists');
      }

      // 2. Tạo tài khoản Staff cho công ty mới
      let existsStaff = await User.findOne({ username: 'staff_glass' });
      if (!existsStaff) {
        existsStaff = await User.create({
          username: 'staff_glass',
          password: '123456',
          role: 'STAFF'
        });
        console.log('✓ Created Staff user: staff_glass / 123456');
      } else {
        console.log('✓ Staff user staff_glass already exists');
      }

      // 3. Tạo thông tin công ty mẫu cho glass_shop_db
      let company = await Company.findOne({ isActive: true });
      if (!company) {
        await Company.create({
          name: 'Mắt Kính Việt Long',
          phone: '0909888999',
          address: '456 Nguyễn Trãi, Quận 5, TP.HCM',
          email: 'contact@vietlongglass.com',
          taxCode: '0312345678'
        });
        console.log('✓ Created Company profile for Mắt Kính Việt Long in glass_shop_db');
      } else {
        console.log(`✓ Company profile in glass_shop_db: ${company.name}`);
      }
    });

    console.log('Seeding for glass_shop_db completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
})();
