import React from 'react';
import { Row, Col, Input, Select, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

const InvoiceFilterBar = ({
    keyword,
    setKeyword,
    debounceSearch,
    queryParams,
    setQueryParams,
    fetchInvoices
}) => {
    return (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-100">
            <Row gutter={[16, 16]} align="bottom">
                {/* SEARCH */}
                <Col xs={24} sm={12} md={8} lg={8}>
                    <Text strong className="block mb-1">Tìm kiếm</Text>
                    <Input
                        placeholder="Mã phiếu, tên hoặc SĐT khách hàng..."
                        prefix={<SearchOutlined />}
                        allowClear
                        value={keyword}
                        style={{ borderRadius: '20px' }}
                        onChange={(e) => {
                            const val = e.target.value;
                            setKeyword(val);
                            debounceSearch(val);
                        }}
                    />
                </Col>

                {/* DATE RANGE */}
                <Col xs={24} sm={12} md={8} lg={8}>
                    <Text strong className="block mb-1">Khoảng thời gian</Text>
                    <Select
                        className="w-full"
                        style={{ borderRadius: '20px' }}
                        value={queryParams.timeRange || 1}
                        onChange={(val) => {
                            let dateFrom = null;
                            let dateTo = null;
                            if (val && val !== 'ALL') {
                                dateFrom = dayjs().subtract(Number(val), 'month').format('YYYY-MM-DD');
                                dateTo = dayjs().format('YYYY-MM-DD');
                            }
                            const newParams = {
                                ...queryParams,
                                page: 1,
                                timeRange: val,
                                dateFrom,
                                dateTo
                            };
                            setQueryParams(newParams);
                            fetchInvoices(newParams);
                        }}
                        options={[
                            { value: 1, label: '1 tháng' },
                            { value: 3, label: '3 tháng' },
                            { value: 'ALL', label: 'Tất cả' }
                        ]}
                    />
                </Col>

                {/* TRẠNG THÁI */}
                <Col xs={12} sm={6} md={4} lg={4}>
                    <Text strong className="block mb-1">Trạng thái</Text>
                    <Select
                        className="w-full"
                        style={{ borderRadius: '20px' }}
                        value={queryParams.isActive === true ? 'ACTIVE' : queryParams.isActive === false ? 'INACTIVE' : 'ALL'}
                        onChange={(val) => {
                            const newStatus = val === 'ACTIVE' ? true : (val === 'INACTIVE' ? false : null);
                            const newParams = {
                                ...queryParams,
                                page: 1,
                                isActive: newStatus
                            };
                            setQueryParams(newParams);
                            fetchInvoices(newParams);
                        }}
                        options={[
                            { value: 'ALL', label: 'Tất cả' },
                            { value: 'ACTIVE', label: 'Hoạt động' },
                            { value: 'INACTIVE', label: 'Không hoạt động' }
                        ]}
                    />
                </Col>

                {/* THANH TOÁN */}
                <Col xs={12} sm={6} md={4} lg={4}>
                    <Text strong className="block mb-1">Thanh toán</Text>
                    <Select
                        className="w-full"
                        style={{ borderRadius: '20px' }}
                        value={queryParams.paymentMethod || 'ALL'}
                        onChange={(val) => {
                            const newParams = {
                                ...queryParams,
                                page: 1,
                                paymentMethod: val === 'ALL' ? null : val
                            };
                            setQueryParams(newParams);
                            fetchInvoices(newParams);
                        }}
                        options={[
                            { value: 'ALL', label: 'Tất cả' },
                            { value: 'DEBT', label: 'Công nợ' },
                            { value: 'CASH', label: 'Tiền mặt' },
                            { value: 'TRANSFER', label: 'Chuyển khoản' }
                        ]}
                    />
                </Col>
                
            </Row>
        </div>
    );
};

export default InvoiceFilterBar;
