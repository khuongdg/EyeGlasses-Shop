import React from 'react';

const ItemLabelTemplate = React.forwardRef(({ items, companyInfo, customerName }, ref) => {
    return (
        <div ref={ref} className="label-print-area">
            {items.map((item, index) => (
                <div key={index} className="label-item">
                    {/* Phần trên: Chiếm 32mm chiều cao */}
                    <div className="label-header">
                        <p className="mini-text">Mã hàng: {item.sku}</p>
                        <p className="mini-text">{customerName}</p>
                    </div>

                    {/* Phần dưới: Chiếm 43mm chiều cao */}
                    <div className="label-body">
                        <div className="label-body-top">
                            <p className="store-title">Cửa hàng: {customerName || 'Undefined'}</p>
                            <div className="main-content">
                                <img src={item.itemQrCode} alt="QR" className="qr-code-img" />
                                <div className="price-info">
                                    <p className="sku-sub"><b>Mã hàng: {item.sku}</b></p>
                                    <p className="print-price">{Number(item.printPrice || item.price).toLocaleString()} VND</p>
                                </div>
                            </div>
                        </div>

                        <div className="label-body-bottom">
                            <p><b>Công ty phân phối:</b> {companyInfo?.name}</p>
                            <p><b>Địa chỉ:</b> {companyInfo?.address}</p>
                            <p><b>NSX/NPP:</b> Dongguan Zhengyang Import and Export...</p>
                            <p><b>Xuất xứ:</b> {item.originCountry || 'Không xác định'}</p>
                            <p><b>HÀNG CHÍNH HIỆU CÓ MÃ TEM TRÙNG MÃ SẢN PHẨM</b></p>
                            <p className="usage-info"><b>TP:</b> Kim loại, nhựa. <b>HDSD:</b> Dùng để đeo mắt. <b>BQ:</b> Đựng trong hộp kính. Tránh nhiệt độ cao, hoá chất.</p>
                        </div>
                    </div>
                </div>
            ))}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    body { margin: 0; padding: 0; }
                    .label-print-area { width: 56mm; }
                    .label-item { 
                        width: 56mm; 
                        height: 77mm; 
                        display: flex;
                        flex-direction: column;
                        page-break-after: always;
                        font-family: Arial, sans-serif;
                        box-sizing: border-box;
                    }

                    /* Cấu trúc chiều cao theo yêu cầu */
                    .label-header { 
                        height: 32mm; 
                        padding: 2mm;
                        border-bottom: 0.1mm solid #ccc;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    }

                    .label-body { 
                        height: 43mm; 
                        display: flex;
                        flex-direction: column;
                    }

                    .label-body-top, .label-body-bottom {
                        height: 21.5mm; /* Chia đều 43mm / 2 */
                        overflow: hidden;
                        padding: 1mm 2mm;
                        box-sizing: border-box;
                    }

                    /* Styling chi tiết */
                    .mini-text { font-size: 6pt; margin: 0; }
                    .store-title { font-size: 6pt; font-weight: bold; margin: 0 0 1mm 0; }
                    
                    .main-content { display: flex; align-items: center; justify-content: space-between; }
                    .qr-code-img { width: 15mm; height: 15mm; object-fit: contain; }
                    .price-info { text-align: right; flex-grow: 1; }
                    .sku-sub { font-size: 4pt; margin: 0; }
                    .print-price { font-size: 10pt; font-weight: bold; margin: 0; color: #000; }

                    .label-body-bottom {
                        font-size: 5.2pt;
                        line-height: 1.2;
                        border-top: 0.1mm dashed #666;
                    }
                    .label-body-bottom p { margin: 0; }
                    .highlight-text { text-decoration: underline; font-weight: bold; }
                    .usage-info { font-style: italic; font-size: 4.8pt; margin-top: 0.5mm; }
                }
            `}} />
        </div>
    );
});

export default ItemLabelTemplate;