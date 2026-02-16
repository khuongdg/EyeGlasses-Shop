const QRCode = require('qrcode');

exports.generateQRCode = async (data) => {
  return QRCode.toDataURL(JSON.stringify(data));
};
