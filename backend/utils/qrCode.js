const QRCode = require('qrcode');

exports.generateQRCode = async (data) => {
  // Tránh stringify nếu data đã là chuỗi để không bị thêm dấu nháy kép bên ngoài làm tăng mật độ chi tiết QR
  const qrText = typeof data === 'string' ? data : JSON.stringify(data);

  return QRCode.toDataURL(qrText, {
    errorCorrectionLevel: 'L', // Dùng mức L (Low) để các ô vuông QR thưa và to nhất, dễ in rõ
    margin: 1,                 // Giảm lề trắng để vùng QR rộng nhất
    width: 600,                // Tăng độ phân giải gốc lên 600x600 pixel để khi máy in nhiệt quét in sắc nét nhất
    color: {
      dark: '#000000',         // Đen tuyệt đối
      light: '#FFFFFF'         // Trắng tuyệt đối
    }
  });
};
