import React from 'react';

const PrintTemplate = React.forwardRef(({ data }, ref) => {
    if (!data) return null;

    // Hàm bổ trợ tính tiền chiết khấu cho từng dòng
    const getDiscountAmount = (item) => {
        const totalBefore = (item.quantity || 0) * (item.price || 0);
        return (totalBefore * (item.discountPercent || 0)) / 100;
    };

    // Hàm đọc số thành chữ
    const docSoToChu = (number) => {
        if (!number || number === 0) return "Không đồng";

        const dv = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
        const hang = ["", "nghìn", "triệu", "tỷ"];

        const docHangTram = (num, dayDu) => {
            let tram = Math.floor(num / 100);
            let chuc = Math.floor((num % 100) / 10);
            let donvi = num % 10;
            let result = "";

            if (dayDu || tram > 0) {
                result += dv[tram] + " trăm";
                if (chuc === 0 && donvi > 0) result += " lẻ";
            }

            if (chuc > 1) {
                result += " " + dv[chuc] + " mươi";
                if (donvi === 1) result += " mốt";
            } else if (chuc === 1) {
                result += " mười";
                if (donvi === 1) result += " một";
            }

            if (donvi === 5 && chuc > 0) {
                result += " lăm";
            } else if (donvi > 1 || (donvi === 1 && chuc === 0)) {
                result += " " + dv[donvi];
            }

            return result.trim();
        };

        let soStr = number.toString();
        let groups = [];
        while (soStr.length > 0) {
            groups.unshift(parseInt(soStr.slice(-3)));
            soStr = soStr.slice(0, -3);
        }

        let result = "";
        for (let i = 0; i < groups.length; i++) {
            if (groups[i] > 0) {
                result +=
                    docHangTram(groups[i], i > 0) +
                    " " +
                    hang[groups.length - 1 - i] +
                    " ";
            }
        }

        result = result.trim();
        result = result.charAt(0).toUpperCase() + result.slice(1);

        return result + " đồng.";
    };


    return (
        <div ref={ref} style={{ padding: '20px', fontSize: '14px', color: '#000', fontFamily: 'Arial' }}>
            {/* Header: Thông tin công ty */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontWeight: 'bold', margin: 0 }}>{data.companyInfo?.name || 'Tên Công Ty'}</h2>
                    <p style={{ margin: 0 }}>Địa chỉ: {data.companyInfo?.address}</p>
                    <p style={{ margin: 0 }}>Điện thoại: {data.companyInfo?.phone}</p>
                    <p style={{ margin: 0 }}>MST: {data.companyInfo?.taxCode}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p>Mã phiếu: <b>{data.invoiceCode}</b></p>
                    <p>Ngày: {new Date(data.createdAt).toLocaleString('vi-VN')}</p>
                </div>
            </div>

            <h1 style={{ display: 'flex', justifyContent: 'center', fontWeight: 'bold', fontSize: '24px', margin: 0, color: '#000' }}>PHIẾU XUẤT KHO</h1>

            {/* Thông tin khách hàng & nhân viên */}
            <div style={{ display: 'flex', marginTop: '20px' }}>
                <div style={{ flex: 2 }}>
                    <p>Khách hàng: {data.customerName}</p>
                    <p>Số điện thoại: {data.customerPhone}</p>
                </div>
                <div style={{ flex: 1, paddingLeft: '50px' }}>
                    <p>Nhân viên: {data.staffName}</p>
                    <p>HT Thanh toán: {data.paymentMethod}</p>
                </div>
            </div>
            <div style={{ marginBottom: '20px', marginTop: 0 }}>
                <div>
                    <p>Địa chỉ: {data.customerAddress}</p>
                    <p>MST: {data.customerTaxCode}</p>
                </div>
            </div>

            {/* Bảng sản phẩm */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead>
                    <tr style={{ textAlign: 'center', backgroundColor: '#f2f2f2' }}>
                        <th style={styles.th}>STT</th>
                        <th style={styles.th}>Mã hàng</th>
                        <th style={styles.th}>Thương hiệu</th>
                        <th style={styles.th}>Đvt</th>
                        <th style={styles.th}>SL</th>
                        <th style={styles.th}>Đơn giá</th>
                        <th style={styles.th}>Số tiền</th>
                        <th style={styles.th}>C.K</th>
                        <th style={styles.th}>Tiền C.K</th>
                        <th style={styles.th}>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    {data.items?.map((item, index) => {
                        const soTien = item.quantity * item.price;
                        const tienCK = getDiscountAmount(item);
                        const thanhTien = soTien - tienCK;

                        return (
                            <tr key={index} style={{ textAlign: 'center' }}>
                                <td style={styles.td}>{index + 1}</td>
                                <td style={styles.td}>{item.sku}</td>
                                <td style={{ ...styles.td, textAlign: 'left' }}>{item.brand}</td>
                                <td style={styles.td}>{item.unit}</td>
                                <td style={styles.td}>{item.quantity}</td>
                                <td style={styles.td}>{item.price?.toLocaleString()}</td>
                                <td style={styles.td}>{soTien.toLocaleString()}</td>
                                <td style={styles.td}>{item.discountPercent}%</td>
                                <td style={styles.td}>{tienCK.toLocaleString()}</td>
                                <td style={styles.td}>{thanhTien.toLocaleString()}</td>
                            </tr>
                        );
                    })}
                    {/* Dòng tổng cộng */}
                    <tr style={{ fontWeight: 'bold', textAlign: 'center' }}>
                        <td colSpan={4} style={styles.td}>TỔNG CỘNG :</td>
                        <td style={styles.td}>{data.totalQuantity}</td>
                        <td style={styles.td}></td>
                        <td style={styles.td}>{data.subTotal?.toLocaleString()}</td>
                        <td style={styles.td}></td>
                        <td style={styles.td}>{data.totalDiscount?.toLocaleString()}</td>
                        <td style={styles.td}>{data.totalAmount?.toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>

            {/* Số tiền bằng chữ */}
            <div style={{ marginTop: '15px', fontStyle: 'italic' }}>
                <p>Số tiền bằng chữ : <strong>{docSoToChu(data.totalAmount)}</strong></p>
            </div>

            {/* Footer: Tổng tiền & Chữ ký */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '50%' }}>
                    <p>Ghi chú: {data.note}</p>
                </div>
                <div style={{ width: '40%', textAlign: 'right' }}>
                    <p>Tổng tiền hàng: {data.subTotal?.toLocaleString()}</p>
                    <p>Chiết khấu: -{data.totalDiscount?.toLocaleString()}</p>
                    <h3 style={{ fontWeight: 'bold', color: '#000' }}>TỔNG CỘNG: {data.totalAmount?.toLocaleString()}</h3>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '50px', textAlign: 'center' }}>
                <div>
                    <p><b>Người lập phiếu</b></p>
                    <p style={{ marginTop: '60px' }}>{data.staffName}</p>
                </div>

                <div>
                    <p><b>Người giao hàng</b></p>
                    <p style={{ marginTop: '5px' }}>(Ký, họ tên)</p>
                </div>

                <div>
                    <p><b>Người nhận hàng</b></p>
                    <p style={{ marginTop: '5px' }}>(Ký, họ tên)</p>
                </div>


            </div>
        </div>
    );
});

// Styles nội bộ cho bảng
const styles = {
    th: {
        border: '1px solid black',
        padding: '8px',
        fontSize: '12px'
    },
    td: {
        border: '1px solid black',
        padding: '5px',
        fontSize: '12px'
    }
};

export default PrintTemplate;