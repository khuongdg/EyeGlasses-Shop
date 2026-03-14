const QRCode = require('qrcode');

exports.generateQRCode = async (data) => {
  return QRCode.toDataURL(JSON.stringify(data), {
    errorCorrectionLevel: 'M', // Mức độ sửa lỗi trung bình (M hoặc Q)
    margin: 1,                 // Giảm lề trắng để QR to hơn
    width: 200,                // Tăng độ phân giải ảnh gốc
    color: {
      dark: '#000000',         // Đen tuyệt đối
      light: '#FFFFFF'         // Trắng tuyệt đối
    }
  });
};
