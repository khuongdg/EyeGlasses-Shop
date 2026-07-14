import React, { useState, useEffect } from 'react';
import { Modal, Input, Checkbox, Tag, Button, Typography } from 'antd';
import { SearchOutlined, BarcodeOutlined } from '@ant-design/icons';

const { Text } = Typography;

const SkuSelectModal = ({ open, onClose, variants = [], onConfirm, initialSelectedIds = [] }) => {
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchKeyword, setSearchKeyword] = useState('');

    useEffect(() => {
        if (open) {
            setSelectedIds(initialSelectedIds || []);
            setSearchKeyword('');
        }
    }, [open, initialSelectedIds]);

    const handleToggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleConfirm = () => {
        onConfirm(selectedIds);
    };

    // Lọc các variant dựa trên từ khóa tìm kiếm
    const filteredVariants = variants.filter(v => {
        if (!searchKeyword) return true;
        const query = searchKeyword.toLowerCase().trim();
        const sku = (v.sku || '').toLowerCase();
        const name = (v.productId?.name || '').toLowerCase();
        const brand = (v.productId?.brand || '').toLowerCase();
        return sku.includes(query) || name.includes(query) || brand.includes(query);
    });

    return (
        <Modal
            title={<span className="text-lg font-bold text-gray-800">Thêm sản phẩm (SKU)</span>}
            open={open}
            onCancel={onClose}
            width={700}
            centered
            destroyOnClose
            footer={[
                <Button 
                    key="cancel" 
                    onClick={onClose}
                    className="rounded-full px-6 border-gray-300 hover:text-gray-600 hover:border-gray-400"
                >
                    Hủy
                </Button>,
                <Button
                    key="confirm"
                    type="primary"
                    onClick={handleConfirm}
                    disabled={selectedIds.length === 0}
                    className="rounded-full px-6 bg-gray-800 hover:bg-gray-700 text-white disabled:bg-gray-200 disabled:text-gray-400 border-none"
                >
                    Xác nhận chọn ({selectedIds.length})
                </Button>
            ]}
        >
            <div className="space-y-4 my-4">
                {/* Search Bar */}
                <div className="relative">
                    <Input
                        placeholder="Tìm kiếm theo mã SKU, tên sản phẩm hoặc hãng..."
                        prefix={<SearchOutlined className="text-gray-400 mr-1" />}
                        value={searchKeyword}
                        onChange={e => setSearchKeyword(e.target.value)}
                        className="w-full rounded-full py-2.5 px-4 border-gray-200 shadow-sm focus:border-gray-400 focus:ring-0 text-sm"
                        allowClear
                    />
                </div>

                {/* Variants List */}
                <div 
                    style={{ maxHeight: '420px', overflowY: 'auto' }} 
                    className="border border-gray-100 rounded-xl divide-y divide-gray-100 bg-white"
                >
                    {filteredVariants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <BarcodeOutlined className="text-4xl mb-2 text-gray-300" />
                            <Text type="secondary">Không tìm thấy sản phẩm phù hợp</Text>
                        </div>
                    ) : (
                        filteredVariants.map((v, index) => {
                            const isSelected = selectedIds.includes(v._id);
                            return (
                                <div
                                    key={v._id}
                                    onClick={() => handleToggleSelect(v._id)}
                                    className={`flex items-center justify-between p-3.5 hover:bg-gray-50/80 cursor-pointer transition-colors ${
                                        isSelected ? 'bg-blue-50/20' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={() => handleToggleSelect(v._id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <span className="text-gray-400 font-mono text-xs w-6 text-right">
                                            {index + 1}.
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-gray-800 text-sm truncate">
                                                {v.sku}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate mt-0.5">
                                                {v.productId?.name || 'Sản phẩm chưa cập nhật tên'} 
                                                {v.productId?.brand ? ` • Hãng: ${v.productId.brand}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 ml-4 shrink-0">
                                        <Tag color={v.inventory > 0 ? 'blue' : 'warning'} className="border-0 px-2.5 py-0.5 rounded-full font-medium">
                                            Tồn: {v.inventory || 0} {v.unit || 'Cây'}
                                        </Tag>
                                        <span className="font-semibold text-gray-700 text-sm">
                                            {v.price?.toLocaleString()}₫
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {filteredVariants.length > 0 && (
                    <div className="text-center text-xs text-gray-400 pt-1">
                        Cuộn xuống để xem thêm sản phẩm
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default SkuSelectModal;
