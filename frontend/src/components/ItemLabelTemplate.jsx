// components/ItemLabelTemplate.jsx
import React from 'react';

const ItemLabelTemplate = React.forwardRef(({ items, companyInfo, customerName }, ref) => {
    return (
        <div ref={ref} className="label-print-area">
            {items.map((item, index) => (
                <div key={index} className="label-item">
                    {/* Phần trên của tem (Cửa hàng & Mã hàng) */}
                    <div className="label-header">
                        <p>Mã hàng: {item.sku}</p>
                    </div>

                    {/* Phần giữa (QR Code & Giá) */}
                    <div><p style={{ marginTop: '4px', fontSize: '8pt', fontWeight: 'bold' }}>Cửa hàng: {customerName || 'Cửa hàng: Undefined'}</p></div>
                    <div className="label-body">
                        <img src={item.itemQrCode} alt="QR" className="qr-code-img" />
                        <div className="price-info">
                            <p className="sku-name" style={{ fontSize: '8px', display: 'flex', justifyContent: 'right' }}>Mã hàng: {item.sku}</p>
                            <p className="print-price">{Number(item.printPrice || item.price).toLocaleString()} VND</p>
                        </div>
                    </div>

                    {/* Phần dưới (Thông tin nhà phân phối) */}
                    <div className="label-footer">
                        <b><p>Công ty phân phối: {companyInfo?.name}</p></b>
                        <p>Địa chỉ: {companyInfo?.address}</p>
                        <p>Xuất xứ: {item.originCountry || 'Không xác định'}</p>
                        <p>Hàng chính hiệu có mã tem trùng mã SP</p>
                        <p>NSX/NPP: Dongguan Zhengyang Import and Export...</p>
                        <p>TP: Kim loại, nhựa. HDSD: Dùng để đeo mắt. Bảo quản: Đựng trong hộp kính, Tránh nhiệt độ cao, hoá chất (Acetol, Alcol,...)</p>
                    </div>
                </div>
            ))}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    // @page {
                    //     size: 80mm 40mm; /* Khớp với kích thước giấy của Godex G500 */
                    //     margin: 0;
                    // }
                    .label-print-area { display: block; width: 100%; }
                    .label-item { 
                        width: 80mm; height: 40mm; /* Kích thước tem phổ biến */
                        padding: 2mm; page-break-after: always;
                        border: 0.1mm solid #eee; font-family: Arial;
                    }
                    .label-header p { margin: 0; font-size: 8pt; font-weight: bold; }
                    .label-body { display: flex; align-items: center; margin-top: 0; }
                    .qr-code-img { width: 20mm; height: 20mm; }
                    .print-price { font-size: 14pt; font-weight: bold; margin-left: 5mm; }
                    .label-footer { font-size: 5pt; margin-top: 1mm; line-height: 1.2; }
                }
            `}} />
        </div>
    );
});

export default ItemLabelTemplate;