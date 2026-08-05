import React from 'react';
import { Row, Col, Input, DatePicker, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { RangePicker } = DatePicker;

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
                <Col xs={24} md={14} lg={16}>
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
                <Col xs={24} md={10} lg={8}>
                    <Text strong className="block mb-1">Khoảng thời gian</Text>
                    <RangePicker
                        className="w-full"
                        format="DD/MM/YYYY"
                        style={{ borderRadius: '20px' }}
                        onChange={(dates) => {
                            const newParams = {
                                ...queryParams,
                                page: 1,
                                dateFrom: dates
                                    ? dates[0].format('YYYY-MM-DD')
                                    : null,
                                dateTo: dates
                                    ? dates[1].format('YYYY-MM-DD')
                                    : null
                            };
                            setQueryParams(newParams);
                            fetchInvoices(newParams);
                        }}
                    />
                </Col>
            </Row>
        </div>
    );
};

export default InvoiceFilterBar;
