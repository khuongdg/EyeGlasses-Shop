import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Tag, Grid } from 'antd';
import { Modal, Form, Input, InputNumber, message, Space, Popconfirm } from 'antd';
import { getProductDetail, createVariant, updateVariant, deleteVariant, restoreVariant } from '../../services/productService';

const ProductDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [variants, setVariants] = useState([]);
    const [loading, setLoading] = useState(false);
    //Edit
    const [editOpen, setEditOpen] = useState(false);
    const [editingVariant, setEditingVariant] = useState(null);

    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    const { useBreakpoint } = Grid;
    const screens = useBreakpoint();

    useEffect(() => {
        if (slug) fetchDetail();
    }, [slug]);

    const formatPrice = (value) => {
        if (value == null) return '0đ';
        return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
    };

    const fetchDetail = async () => {
        try {
            const res = await getProductDetail(slug);

            console.log('DETAIL RESPONSE:', res.data); // DEBUG RẤT QUAN TRỌNG

            setProduct(res.data.data.product);
            setVariants(res.data.data.variants);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddVariant = async () => {
        try {
            const values = await form.validateFields();

            await createVariant(id, values);

            message.success('Thêm biến thể thành công');
            setOpen(false);
            form.resetFields();

            fetchDetail(); // reload variants
        } catch (err) {
            console.error(err);
            message.error('Thêm biến thể thất bại');
        }
    };

    const openEdit = (variant) => {
        setEditingVariant(variant);
        form.setFieldsValue(variant);
        setEditOpen(true);
    };

    const handleUpdateVariant = async () => {
        try {
            const values = await form.validateFields();

            await updateVariant(id, editingVariant._id, values);

            message.success('Cập nhật biến thể thành công');
            setEditOpen(false);
            setEditingVariant(null);
            fetchDetail();
        } catch (err) {
            message.error('Cập nhật thất bại');
        }
    };

    const handleDelete = async (variantId) => {
        await deleteVariant(id, variantId);
        message.success('Đã xoá biến thể');
        fetchDetail();
    };

    const handleRestore = async (variantId) => {
        await restoreVariant(id, variantId);
        message.success('Đã khôi phục biến thể');
        fetchDetail();
    };



    const columns = [
        { title: 'SKU', dataIndex: 'sku' },
        { title: 'Màu', dataIndex: 'colorCode' },
        { title: 'Đơn vị', dataIndex: 'unit' },
        {
            title: 'Giá',
            dataIndex: 'price',
            render: (price) => formatPrice(price)
        },
        { title: 'Số lượng', dataIndex: 'inventory' },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            render: (isActive) =>
                isActive ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>
        },
        {
            title: 'Hành động',
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        disabled={!record.isActive}
                        title={!record.isActive ? 'Biến thể đã bị vô hiệu hoá' : ''}
                        onClick={() => openEdit(record)}
                    >
                        Sửa
                    </Button>

                    {record.isActive ? (
                        <Popconfirm
                            title="Xoá biến thể?"
                            onConfirm={() => handleDelete(record._id)}
                        >
                            <Button danger size="small">Xoá</Button>
                        </Popconfirm>
                    ) : (
                        <Button
                            size="small"
                            type="dashed"
                            onClick={() => handleRestore(record._id)}
                        >
                            Khôi phục
                        </Button>
                    )}
                </Space>
            )
        }

    ];

    if (!product) {
        return (
            <Card loading>
                Đang tải dữ liệu...
            </Card>
        );
    }


    return (
        <div className="space-y-4 px-2 sm:px-4">
            <Button onClick={() => navigate(-1)} className="mb-4 w-full sm:w-auto">
                ← Quay lại
            </Button>

            <Card
                loading={loading}
                title={
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <span className="text-lg font-semibold">
                            {product.name}
                        </span>

                        <Button
                            type="primary"
                            onClick={() => setOpen(true)}
                            className="w-full sm:w-auto"
                        >
                            + Thêm biến thể
                        </Button>
                    </div>
                }
            >

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <p><b>Thương hiệu:</b> {product.brand}</p>
                    <p><b>Xuất xứ:</b> {product.originCountry}</p>
                    <p className="sm:col-span-2">
                        <b>Mô tả:</b> {product.description}
                    </p>
                    <p>
                        <b>Trạng thái:</b>{' '}
                        {product.isActive
                            ? <Tag color="green">Active</Tag>
                            : <Tag color="red">Inactive</Tag>}
                    </p>
                </div>


                <h3 className="mt-4 mb-2 font-semibold">Danh sách Variant</h3>

                {screens.sm ? (
                    <Table
                        rowKey="_id"
                        columns={columns}
                        dataSource={variants}
                        pagination={false}
                        scroll={{ x: 'max-content' }}
                    />
                ) : (
                    <div className="space-y-3">
                        {variants.map((variant) => (
                            <div
                                key={variant._id}
                                className="border rounded-lg p-4 shadow-sm bg-white"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="font-semibold text-base">
                                        SKU: {variant.sku}
                                    </div>

                                    <Tag color={variant.isActive ? 'green' : 'red'}>
                                        {variant.isActive ? 'Active' : 'Inactive'}
                                    </Tag>
                                </div>

                                <div className="mt-2 text-sm text-gray-600 space-y-1">
                                    <div>Màu: {variant.colorCode}</div>
                                    <div>Đơn vị: {variant.unit}</div>
                                    <div>Giá: {formatPrice(variant.price)}</div>
                                    <div>Tồn kho: {variant.inventory}</div>
                                </div>

                                <div className="mt-3 flex gap-2 flex-wrap">
                                    <Button
                                        size="small"
                                        disabled={!variant.isActive}
                                        onClick={() => openEdit(variant)}
                                    >
                                        Sửa
                                    </Button>

                                    {variant.isActive ? (
                                        <Button
                                            danger
                                            size="small"
                                            onClick={() => handleDelete(variant._id)}
                                        >
                                            Xoá
                                        </Button>
                                    ) : (
                                        <Button
                                            size="small"
                                            type="dashed"
                                            onClick={() => handleRestore(variant._id)}
                                        >
                                            Khôi phục
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </Card>

            <Modal
                title="Thêm biến thể"
                open={open}
                onCancel={() => setOpen(false)}
                onOk={handleAddVariant}
                okText="Thêm"
                width="90%"
                style={{ maxWidth: 600 }}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="SKU"
                        name="sku"
                        rules={[{ required: true, message: 'Nhập SKU' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item label="Màu" name="colorCode">
                        <Input />
                    </Form.Item>

                    <Form.Item label="Đơn vị" name="unit">
                        <Input placeholder="Cây / Cái / Hộp" />
                    </Form.Item>

                    <Form.Item
                        label="Giá"
                        name="price"
                        rules={[{ required: true, message: 'Nhập giá' }]}
                    >
                        <InputNumber style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item label="Số lượng" name="inventory">
                        <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Chỉnh sửa biến thể"
                open={editOpen}
                onCancel={() => setEditOpen(false)}
                onOk={handleUpdateVariant}
                okText="Lưu"
                width="90%"
                style={{ maxWidth: 600 }}
            >
                <Form form={form} layout="vertical">
                    <Form.Item label="SKU" name="sku">
                        <Input />
                    </Form.Item>

                    <Form.Item label="Màu" name="colorCode">
                        <Input />
                    </Form.Item>

                    <Form.Item label="Đơn vị" name="unit">
                        <Input />
                    </Form.Item>

                    <Form.Item label="Giá" name="price">
                        <InputNumber style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item label="Số lượng" name="inventory">
                        <Input disabled style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ProductDetail;
