const jwt = require('jsonwebtoken');
const { tenantStorage } = require('../database/tenantManager');

exports.authenticate = (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token)
    return res.status(401).json({ message: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'glassshop_secret_key_2026');
    req.user = decoded;

    const dbName = decoded.dbName || 'invoice_db';
    const tenantSlug = decoded.tenantSlug || 'thuanthien';

    tenantStorage.run({ dbName, tenantSlug }, () => {
      next();
    });
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
