import React, { useState, useMemo, useEffect } from 'react';
import {
    Modal,
    Form,
    Input,
    Select,
    InputNumber,
    Row,
    Col,
    Divider,
    Typography,
    Checkbox,
    Button,
    Space,
    Tooltip,
    message
} from 'antd';
import {
    InboxOutlined,
    CameraOutlined,
    DeleteOutlined,
    CheckOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

const CreateInvoiceModal = ({
    openModal,
    handleCreate,
    submitLoading,
    handleCancelCreate,
    form,
    customers,
    staffs,
    bulkDiscount,
    setBulkDiscount,
    selectedItemIndexes,
    setSelectedItemIndexes,
    variants,
    handleProductChange,
    calculateRowTotal,
    calculateTotals,
    updateActiveDraft,
    setIsFormModified,
    setIsSkuModalOpen,
    setIsQrModalOpen,
    watchItems,
    watchTotalQty,
    watchSubTotal,
    watchTotalDiscount,
    watchTotalAmount
}) => {
    // State chọn mức đơn giá áp dụng chiết khấu hàng loạt
    const [bulkTargetPrice, setBulkTargetPrice] = useState(null);

    // Tính danh sách các mức đơn giá duy nhất trong danh sách sản phẩm
    const uniquePrices = useMemo(() => {
        const map = new Map();
        (watchItems || []).forEach((item, index) => {
            if (!item || item.price == null) return;
            const p = Number(item.price) || 0;
            if (!map.has(p)) {
                map.set(p, []);
            }
            map.get(p).push(index);
        });
        return Array.from(map.entries()).map(([price, indexes]) => ({
            price,
            count: indexes.length,
            indexes
        }));
    }, [watchItems]);

    // Danh sách options cho Select chọn mức đơn giá áp dụng
    const priceOptions = useMemo(() => {
        const opts = [];

        // Tùy chọn áp dụng tất cả nếu có nhiều sản phẩm
        if ((watchItems || []).length > 1) {
            opts.push({
                value: 'ALL',
                label: `Tất cả sản phẩm (${(watchItems || []).length} SP)`
            });
        }

        // Từng mức đơn giá cụ thể
        uniquePrices.forEach(up => {
            opts.push({
                value: up.price,
                label: `Đơn giá ${up.price.toLocaleString('vi-VN')} ₫ (${up.count} SP)`
            });
        });

        return opts;
    }, [uniquePrices, watchItems]);

    // Tự động đồng bộ bulkTargetPrice
    useEffect(() => {
        if (uniquePrices.length > 0) {
            const hasCurrent = bulkTargetPrice === 'ALL' || uniquePrices.some(up => up.price === bulkTargetPrice);
            if (!hasCurrent) {
                setBulkTargetPrice(uniquePrices[0].price);
            }
        } else {
            setBulkTargetPrice(null);
        }
    }, [uniquePrices, bulkTargetPrice]);

    // Số lượng sản phẩm khớp với lựa chọn áp dụng hiện tại
    const matchedCount = useMemo(() => {
        if (bulkTargetPrice === 'ALL') return (watchItems || []).length;
        if (bulkTargetPrice == null) return 0;
        return (watchItems || []).filter(item => item && Number(item.price) === Number(bulkTargetPrice)).length;
    }, [watchItems, bulkTargetPrice]);

    // Hàm áp dụng chiết khấu hàng loạt
    const handleApplyBulkDiscount = () => {
        if (bulkDiscount === null || bulkDiscount === undefined || bulkDiscount === '' || bulkDiscount < 0 || bulkDiscount > 100) {
            message.warning('Vui lòng nhập phần trăm chiết khấu hợp lệ (0 - 100%)');
            return;
        }

        const currentItems = form.getFieldValue('items') || [];
        if (currentItems.length === 0) {
            message.warning('Chưa có sản phẩm nào trong danh sách');
            return;
        }

        let updatedCount = 0;
        const updatedItems = currentItems.map((item) => {
            if (!item) return item;
            const itemPrice = Number(item.price) || 0;

            let shouldUpdate = false;
            if (bulkTargetPrice === 'ALL') {
                shouldUpdate = true;
            } else if (bulkTargetPrice !== null && bulkTargetPrice !== undefined) {
                shouldUpdate = itemPrice === Number(bulkTargetPrice);
            }

            if (shouldUpdate) {
                updatedCount++;
                return {
                    ...item,
                    discountPercent: Number(bulkDiscount)
                };
            }
            return item;
        });

        if (updatedCount === 0) {
            message.warning('Không có sản phẩm nào khớp với mức đơn giá đã chọn');
            return;
        }

        form.setFieldsValue({ items: updatedItems });
        calculateTotals();
        updateActiveDraft();

        const desc = bulkTargetPrice === 'ALL'
            ? `tất cả ${updatedCount} sản phẩm`
            : `${updatedCount} sản phẩm có đơn giá ${Number(bulkTargetPrice).toLocaleString('vi-VN')} ₫`;

        message.success(`Đã áp dụng chiết khấu ${bulkDiscount}% cho ${desc}`);
    };

    return (
        <Modal
            title="Tạo phiếu xuất kho"
            open={openModal}
            onOk={handleCreate}
            confirmLoading={submitLoading}
            onCancel={handleCancelCreate}
            okText="Tạo phiếu"
            cancelText="Huỷ"
            width="100%"
            style={{ maxWidth: 1100, top: 20 }}
        >
            <Form
                layout="vertical"
                form={form}
                initialValues={{ items: [] }}
                onValuesChange={() => {
                    calculateTotals();
                    setIsFormModified(true);
                }}
            >
                {/* INFO KHÁCH HÀNG */}
                <Row gutter={16}>
                    <Col xs={24} sm={24} md={12} lg={8}>
                        <Form.Item name="customerName" hidden>
                            <Input />
                        </Form.Item>
                        <Form.Item
                            label="Khách hàng"
                            name="customerId"
                            rules={[{ required: true, message: 'Vui lòng chọn khách hàng' }]}
                        >
                            <Select
                                showSearch
                                allowClear
                                className="w-full"
                                placeholder="Tìm theo tên hoặc SĐT"
                                optionFilterProp="children"
                                onChange={(val) => {
                                    const cus = customers.find((c) => c._id === val);
                                    if (cus) {
                                        form.setFieldsValue({
                                            customerName: cus.name,
                                            customerPhone: cus.phone,
                                            customerAddress: cus.address,
                                            customerTaxCode: cus.taxCode
                                        });
                                    } else {
                                        form.setFieldsValue({
                                            customerName: '',
                                            customerPhone: '',
                                            customerAddress: '',
                                            customerTaxCode: ''
                                        });
                                    }
                                    updateActiveDraft();
                                }}
                            >
                                {customers.map((c) => (
                                    <Select.Option key={c._id} value={c._id}>
                                        {c.name} - {c.phone}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>

                    <Col xs={24} sm={24} md={12} lg={8}>
                        <Form.Item label="Số điện thoại" name="customerPhone">
                            <Input disabled placeholder="SĐT khách hàng" variant="borderless" style={{ color: '#1677ff', fontWeight: 'bold' }} />
                        </Form.Item>
                    </Col>

                    <Col xs={24} sm={24} md={12} lg={8}>
                        <Form.Item label="Mã số thuế" name="customerTaxCode">
                            <Input disabled placeholder="MST" variant="borderless" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={24}>
                        <Form.Item label="Địa chỉ" name="customerAddress">
                            <Input disabled placeholder="Địa chỉ chi tiết của khách hàng" variant="filled" />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider style={{ margin: '12px 0' }} />

                {/* PHẦN NHÂN VIÊN & THANH TOÁN */}
                <Row gutter={16}>
                    <Col xs={24} sm={24} md={12} lg={8}>
                        <Form.Item name="staffName" hidden>
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="Nhân viên xuất kho"
                            name="staffId"
                            rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
                        >
                            <Select
                                showSearch
                                allowClear
                                className="w-full"
                                placeholder="Tìm tên hoặc mã nhân viên"
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                onChange={(val) => {
                                    const staff = staffs.find((s) => s._id === val);
                                    if (staff) {
                                        form.setFieldsValue({
                                            staffCode: staff.staffCode,
                                            staffName: staff.name
                                        });
                                    } else {
                                        form.setFieldsValue({ staffCode: '', staffName: '' });
                                    }
                                    updateActiveDraft();
                                }}
                                options={staffs.map((s) => ({
                                    value: s._id,
                                    label: `${s.staffCode ? s.staffCode + ' - ' : ''}${s.name}`,
                                }))}
                            />
                        </Form.Item>

                    </Col>

                    <Col xs={24} sm={24} md={12} lg={8}>
                        <Form.Item label="Mã nhân viên" name="staffCode">
                            <Input
                                disabled
                                placeholder="Mã NV"
                                variant="borderless"
                                style={{ color: '#8c8c8c', fontWeight: '500' }}
                            />
                        </Form.Item>
                    </Col>

                    <Col xs={24} sm={24} md={12} lg={8}>
                        <Form.Item label="Hình thức thanh toán" name="paymentMethod" initialValue="DEBT">
                            <Select className="w-full">
                                <Select.Option value="DEBT">Công nợ</Select.Option>
                                <Select.Option value="CASH">Tiền mặt</Select.Option>
                                <Select.Option value="TRANSFER">Chuyển khoản</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Divider style={{ marginTop: '4px', marginBottom: '12px' }}><Text strong className="text-blue-500">Danh sách sản phẩm</Text></Divider>

                <div style={{ maxHeight: '42vh', overflowY: 'auto', paddingRight: '12px', paddingLeft: '4px' }} className="mb-4">
                    <Form.List name="items">
                        {(fields, { remove }) => {
                            const hasFields = fields.length > 0;
                            return (
                                <>
                                     {!hasFields ? (
                                         <Row gutter={[16, 16]}>
                                             <Col xs={24} sm={12}>
                                                 <div 
                                                     onClick={() => setIsSkuModalOpen(true)}
                                                     className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl bg-gray-50 hover:bg-blue-50/20 transition-all cursor-pointer group min-h-[140px] text-center"
                                                 >
                                                     <InboxOutlined className="text-3xl text-gray-400 group-hover:text-blue-500 transition-colors mb-2" />
                                                     <span className="text-sm font-semibold text-gray-600 group-hover:text-blue-600 transition-colors">Chọn SKU thủ công</span>
                                                     <span className="text-xs text-gray-400 mt-1">Tìm kiếm và chọn một hoặc nhiều sản phẩm</span>
                                                 </div>
                                             </Col>
                                             <Col xs={24} sm={12}>
                                                 <div 
                                                     onClick={() => setIsQrModalOpen(true)}
                                                     className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl bg-gray-50 hover:bg-blue-50/20 transition-all cursor-pointer group min-h-[140px] text-center"
                                                 >
                                                     <CameraOutlined className="text-3xl text-gray-400 group-hover:text-blue-500 transition-colors mb-2" />
                                                     <span className="text-sm font-semibold text-gray-600 group-hover:text-blue-600 transition-colors">Quét mã bằng Camera</span>
                                                     <span className="text-xs text-gray-400 mt-1">Sử dụng Camera điện thoại để quét mã QR/Barcode</span>
                                                 </div>
                                             </Col>
                                         </Row>
                                     ) : (
                                        <>
                                            {/* Bulk Discount Bar */}
                                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/80 rounded-lg border border-blue-100 mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">Áp dụng chiết khấu theo đơn giá:</span>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">Đơn giá:</span>
                                                    <Select
                                                        size="middle"
                                                        value={bulkTargetPrice}
                                                        onChange={(val) => setBulkTargetPrice(val)}
                                                        options={priceOptions}
                                                        placeholder="Chọn mức đơn giá"
                                                        className="min-w-[210px]"
                                                        showSearch
                                                        optionFilterProp="label"
                                                    />

                                                    <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">Chiết khấu:</span>
                                                    <InputNumber
                                                        min={0}
                                                        max={100}
                                                        placeholder="%"
                                                        value={bulkDiscount}
                                                        onChange={(val) => setBulkDiscount(val)}
                                                        onPressEnter={handleApplyBulkDiscount}
                                                        className="w-20 text-center"
                                                        addonAfter="%"
                                                    />
                                                    <Button
                                                        type="primary"
                                                        icon={<CheckOutlined />}
                                                        onClick={handleApplyBulkDiscount}
                                                        disabled={bulkTargetPrice == null || bulkDiscount == null}
                                                        className="font-medium whitespace-nowrap bg-blue-600 hover:bg-blue-500"
                                                    >
                                                        {matchedCount > 0 ? `Áp dụng (${matchedCount} SP)` : `Áp dụng`}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Table Header (desktop only) */}
                                            <div className="hidden md:flex gap-3 px-4 py-2.5 bg-gray-100 font-semibold text-gray-600 border rounded-t-lg items-center text-sm">
                                                <div className="flex-[2]">Sản phẩm (SKU)</div>
                                                <div className="w-[120px] text-center">Đơn giá</div>
                                                <div className="w-[100px] text-center">Số lượng</div>
                                                <div className="w-[100px] text-center">Chiết khấu (%)</div>
                                                <div className="w-[120px] text-right">Thành tiền</div>
                                                <div className="w-[40px]"></div>
                                            </div>

                                            <div className="border border-t-0 rounded-b-lg divide-y bg-white">
                                                {fields.map(({ key, name, ...restField }) => {
                                                    const rowPrice = Number(watchItems?.[name]?.price) || 0;
                                                    const isPriceMatched = bulkTargetPrice !== 'ALL' && bulkTargetPrice !== null && Number(bulkTargetPrice) === rowPrice;

                                                    return (
                                                        <div
                                                            key={key}
                                                            className={`flex flex-col md:flex-row gap-3 items-stretch md:items-center px-4 py-3 hover:bg-gray-50/50 transition-colors ${
                                                                isPriceMatched ? 'bg-blue-50/25' : ''
                                                            }`}
                                                        >
                                                        {/* Cột 1: Sản phẩm (SKU) */}
                                                        <div className="flex-[2] min-w-0">
                                                            <span className="block md:hidden text-xs font-semibold text-gray-500 mb-1">Sản phẩm (SKU)</span>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'variantId']}
                                                                rules={[{ required: true, message: 'Chọn SKU' }]}
                                                                style={{ margin: 0 }}
                                                            >
                                                                <Select
                                                                    showSearch
                                                                    placeholder="Chọn SKU"
                                                                    onChange={(val) => handleProductChange(val, name)}
                                                                    filterOption={(input, option) =>
                                                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                                                    }
                                                                    options={variants.map(v => ({
                                                                        value: v._id,
                                                                        label: `${v.sku} - Tồn: ${v.inventory || 0}`
                                                                    }))}
                                                                    className="w-full"
                                                                />
                                                            </Form.Item>
                                                            <Form.Item name={[name, 'sku']} hidden><Input /></Form.Item>
                                                            <Form.Item name={[name, 'brand']} hidden><Input /></Form.Item>
                                                            <Form.Item name={[name, 'unit']} hidden><Input /></Form.Item>
                                                            <Form.Item name={[name, 'originCountry']} hidden><Input /></Form.Item>
                                                        </div>

                                                        {/* Cột 2: Đơn giá */}
                                                        <div className="w-full md:w-[120px]">
                                                            <span className="block md:hidden text-xs font-semibold text-gray-500 mb-1">Đơn giá</span>
                                                            <Tooltip title="Nhấp để chọn áp dụng chiết khấu cho tất cả sản phẩm cùng mức giá này">
                                                                <div
                                                                    onClick={() => {
                                                                        setBulkTargetPrice(rowPrice);
                                                                    }}
                                                                    className={`cursor-pointer transition-all rounded px-1 py-0.5 border ${
                                                                        isPriceMatched
                                                                            ? 'border-blue-400 bg-blue-50/70 text-blue-700 font-semibold shadow-xs'
                                                                            : 'border-transparent hover:border-gray-300'
                                                                    }`}
                                                                >
                                                                    <Form.Item
                                                                        name={[name, 'price']}
                                                                        style={{ margin: 0 }}
                                                                        getValueProps={(value) => ({
                                                                            value: value != null ? value.toLocaleString('en-US') : '',
                                                                        })}
                                                                    >
                                                                        <Input
                                                                            disabled
                                                                            className={`text-right md:text-center font-medium cursor-pointer ${
                                                                                isPriceMatched ? 'bg-transparent text-blue-700 font-bold' : 'text-gray-700 bg-gray-50'
                                                                            }`}
                                                                        />
                                                                    </Form.Item>
                                                                </div>
                                                            </Tooltip>
                                                        </div>

                                                        {/* Cột 3: Số lượng */}
                                                        <div className="w-full md:w-[100px]">
                                                            <span className="block md:hidden text-xs font-semibold text-gray-500 mb-1">Số lượng</span>
                                                            <Form.Item
                                                                name={[name, 'quantity']}
                                                                style={{ margin: 0 }}
                                                            >
                                                                <InputNumber min={1} className="w-full text-center" onChange={() => calculateTotals()} />
                                                            </Form.Item>
                                                        </div>

                                                        {/* Cột 4: Chiết khấu (%) */}
                                                        <div className="w-full md:w-[100px]">
                                                            <span className="block md:hidden text-xs font-semibold text-gray-500 mb-1">Chiết khấu (%)</span>
                                                            <Form.Item
                                                                name={[name, 'discountPercent']}
                                                                style={{ margin: 0 }}
                                                            >
                                                                <InputNumber min={0} max={100} className="w-full text-center" onChange={() => calculateTotals()} />
                                                            </Form.Item>
                                                        </div>

                                                        {/* Cột 5: Thanh toán */}
                                                        <div className="w-full md:w-[120px] flex flex-col justify-center">
                                                            <span className="block md:hidden text-xs font-semibold text-gray-500 mb-1">Thanh toán</span>
                                                            <div className="text-right font-semibold text-red-500 text-sm">
                                                                {calculateRowTotal(name).toLocaleString()}₫
                                                            </div>
                                                        </div>

                                                        {/* Cột 6: Hành động */}
                                                        <div className="w-full md:w-[40px] flex justify-end items-center">
                                                            <Button
                                                                danger
                                                                type="text"
                                                                icon={<DeleteOutlined />}
                                                                onClick={() => {
                                                                    remove(name);
                                                                    calculateTotals();
                                                                    updateActiveDraft();
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                                })}
                                            </div>

                                        </>
                                    )}
                                </>
                            );
                        }}
                    </Form.List>
                </div>

                {watchItems && watchItems.length > 0 && (
                    <div className="mt-3 flex flex-col sm:flex-row gap-2 mb-4">
                        <Button 
                            type="dashed"
                            icon={<InboxOutlined />}
                            onClick={() => setIsSkuModalOpen(true)}
                            className="flex-1"
                        >
                            Chọn SKU từ danh sách
                        </Button>
                        <Button 
                            type="dashed"
                            icon={<CameraOutlined />}
                            onClick={() => setIsQrModalOpen(true)}
                            className="flex-1"
                        >
                            Quét mã bằng Camera
                        </Button>
                    </div>
                )}

                {/* SUMMARY SECTION */}
                <div style={{ marginTop: 24, padding: '16px', background: '#fafafa', borderRadius: '8px' }}>
                    <Row gutter={32}>
                        {/* Bên trái: Ghi chú */}
                        <Col xs={24} md={12}>
                            <Form.Item label={<Text strong>Ghi chú phiếu xuất</Text>} name="note">
                                <Input.TextArea
                                    rows={4}
                                    placeholder="Nhập nội dung tặng khách, trừ tiền hộp, hoặc các điều khoản khác..."
                                />
                            </Form.Item>
                        </Col>

                        {/* Bên phải: Tổng hợp chi phí */}
                        <Col xs={24} md={12}>
                            <Space direction="vertical" size="middle" className="w-full">
                                <Row justify="space-between">
                                    <Col><Text type="secondary">Tổng số lượng:</Text></Col>
                                    <Col>
                                        <Text strong style={{ fontSize: 16 }}>
                                            {Number(watchTotalQty || 0).toLocaleString()}
                                        </Text>
                                        <Text type="secondary" style={{ marginLeft: 4 }}>sản phẩm</Text>
                                    </Col>
                                </Row>

                                <Row justify="space-between">
                                    <Col><Text type="secondary">Tạm tính (Tổng cộng):</Text></Col>
                                    <Col>
                                        <Text strong>
                                            {Number(watchSubTotal || 0).toLocaleString()}₫
                                        </Text>
                                    </Col>
                                </Row>

                                <Row justify="space-between">
                                    <Col><Text type="secondary">Tổng chiết khấu:</Text></Col>
                                    <Col>
                                        <Text type="danger">
                                            - {Number(watchTotalDiscount || 0).toLocaleString()}₫
                                        </Text>
                                    </Col>
                                </Row>

                                <Divider style={{ margin: '8px 0' }} />

                                <Row justify="space-between" align="middle">
                                    <Col>
                                        <Title level={4} style={{ margin: 0 }}>TỔNG THANH TOÁN:</Title>
                                    </Col>
                                    <Col>
                                        <Title level={3} style={{ margin: 0, color: '#ff4d4f' }}>
                                            {Number(watchTotalAmount || 0).toLocaleString()}₫
                                        </Title>
                                    </Col>
                                </Row>
                            </Space>
                        </Col>
                    </Row>
                </div>
                 <Form.Item name="totalQuantity" hidden><Input /></Form.Item>
                 <Form.Item name="subTotal" hidden><Input /></Form.Item>
                 <Form.Item name="totalDiscount" hidden><Input /></Form.Item>
                 <Form.Item name="totalAmount" hidden><Input /></Form.Item>
             </Form>
        </Modal>
    );
};

export default CreateInvoiceModal;
