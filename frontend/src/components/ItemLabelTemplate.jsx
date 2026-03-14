import React from 'react';

const ItemLabelTemplate = React.forwardRef(({ items, companyInfo, customerName }, ref) => {
    return (
        <div ref={ref} className="label-print-area">
            {items.map((item, index) => (
                /* Wrapper để giữ khổ giấy nằm ngang 77x56 */
                <div key={index} className="label-page-wrapper">
                    <div className="label-item">
                        {/* Phần trên: 35mm */}
                        <div className="label-header">
                            <p className="mini-text-head">Mã hàng: {item.sku}</p>
                            <p className="mini-text-head">{customerName}</p>
                        </div>

                        {/* Phần dưới: 42mm */}
                        <div className="label-body">
                            <div className="label-body-top">
                                <div className="main-content">
                                    <img src={item.itemQrCode} alt="QR" className="qr-code-img" />
                                    <div className="price-info">
                                        <p className="store-title">Cửa hàng: {customerName || 'Undefined'}</p>
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
                                <p className="highlight-text">HÀNG CHÍNH HIỆU CÓ MÃ TEM TRÙNG MÃ SẢN PHẨM</p>
                                <p className="usage-info"><b>TP:</b> Kim loại, nhựa. <b>HDSD:</b> Dùng để đeo mắt. <b>Bảo quản:</b> Đựng trong hộp kính. Tránh nhiệt độ cao, hoá chất (Acetone, alcol,...).</p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        margin: 0;
                    }
                    body { margin: 0; padding: 0; }

                    .label-page-wrapper {
                        width: 77mm;
                        height: 56mm;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        page-break-after: always;
                        overflow: hidden;
                        position: relative;
                    }

                    .label-item { 
                        /* Kích thước nội dung gốc trước khi xoay */
                        width: 56mm; 
                        height: 77mm; 
                        display: flex;
                        flex-direction: column;
                        font-family: Arial, sans-serif;
                        box-sizing: border-box;
                        
                        /* Xoay 90 độ qua phải để khớp hướng giấy của máy in */
                        transform: rotate(-90deg);
                        transform-origin: center;
                        
                        /* Đảm bảo nội dung không bị lệch khỏi tâm trang */
                       
                    }

                    .label-header { 
                        height: 31mm; 
                        padding: 2mm 2mm;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    }

                    .label-body { 
                        margin-top: 4mm;
                        height: 47mm; 
                        padding: 1mm 2mm;
                        display: flex;
                        flex-direction: column;
                    }

                    .label-body-top {
                        height:22mm;
                        padding: 1.5mm 1.5mm;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        /* Đẩy cụm main-content xuống sát dưới cùng */
                        justify-content: flex-end;
                    }

                    .label-body-bottom {
                        height: 22mm;
                        padding: 1mm 1mm;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        justify-content: flex-start;
                    }

                    .mini-text-head { font-size: 3pt; margin: 0;}
                    .mini-text { font-size: 6pt; margin: 0; font-weight: bold; }
                    .store-title { font-size: 5pt; font-weight: bold; margin-bottom: 1mm; }
                    
                    .main-content { display: flex; align-items: center; justify-content: space-between; }
                    .qr-code-img { width: 80px; height: 80px; object-fit: contain; image-rendering: pixelated; image-rendering: crisp-edges;}
                    .price-info { text-align: right; flex-grow: 1; margin-top: 11mm;}
                    .sku-sub { font-size: 5pt; margin: 0; }
                    .print-price { font-size: 10pt; font-weight: bold; margin: 0; color: #000; }

                    .label-body-bottom p { 
                        margin: 0; 
                        font-size: 5.2pt; 
                        line-height: 1.1;
                    }
                    .highlight-text { font-weight: bold; font-size: 5pt !important; }
                    .usage-info { font-style: italic; font-size: 4.8pt; margin-top: 0.5mm; }
                }
            `}} />
        </div>
    );
});

export default ItemLabelTemplate;