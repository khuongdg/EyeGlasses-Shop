import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Table,
    Button,
    Input,
    InputNumber,
    Space,
    Modal,
    Form,
    message,
    Tag,
    Popconfirm,
    Grid
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import debounce from 'lodash/debounce';

import {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    restoreProduct,
    searchProducts
} from '../../services/productService';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    const [openModal, setOpenModal] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const [searchKeyword, setSearchKeyword] = useState('');

    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();

    const navigate = useNavigate();

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });

    const { useBreakpoint } = Grid;
    const screens = useBreakpoint();

    /* ================= FETCH ================= */
    const fetchProducts = async (keyword, page, pageSize) => {
        console.log('FETCH', { keyword, page, pageSize });
        setLoading(true);
        try {
            const res = keyword
                ? await searchProducts({ keyword, page, limit: pageSize })
                : await getProducts({ page, limit: pageSize });

            setProducts(res.data.data || []);
            setPagination({
                current: page,
                pageSize,
                total: res.data.total || 0
            });
        } catch (err) {
            console.error('Fetch products error:', err);
            message.error(
                err.response?.data?.message || 'Không tải được sản phẩm'
            );
        } finally {
            setLoading(false);
        }
    };



    useEffect(() => {
        fetchProducts('', 1, pagination.pageSize);
    }, []);


    /* ================= DEBOUNCE SEARCH ================= */
    const debounceSearch = useRef(
        debounce((value) => {
            const keyword = value.trim();
            setSearchKeyword(keyword);
            fetchProducts(keyword, 1, pagination.pageSize);
        }, 400)
    ).current;



    /* ================= HIGHLIGHT ================= */
    const highlightText = (text = '', keyword = '') => {
        if (!keyword) return text;

        const regex = new RegExp(`(${keyword})`, 'gi');
        return text.split(regex).map((part, i) =>
            part.toLowerCase() === keyword.toLowerCase() ? (
                <span key={i} className="bg-yellow-300 px-1 font-semibold">
                    {part}
                </span>
            ) : (
                part
            )
        );
    };

    /* ================= CRUD ================= */
    const handleCreate = async () => {
        try {
            const values = await createForm.validateFields();
            await createProduct(values);

            message.success('Tạo sản phẩm thành công');
            setOpenModal(false);
            createForm.resetFields();
            fetchProducts();
        } catch (err) {
            message.error(err.response?.data?.message || 'Tạo sản phẩm thất bại');
        }
    };

    const openEdit = (product) => {
        setEditingProduct(product);
        editForm.setFieldsValue({
            name: product.name,
            brand: product.brand,
            originCountry: product.originCountry,
            description: product.description
        });
        setEditOpen(true);
    };

    const handleUpdateProduct = async () => {
        try {
            const values = await editForm.validateFields();
            await updateProduct(editingProduct._id, values);

            message.success('Cập nhật sản phẩm thành công');
            setEditOpen(false);
            setEditingProduct(null);
            editForm.resetFields();
            fetchProducts(searchKeyword);
        } catch (err) {
            message.error(err.response?.data?.message || 'Cập nhật thất bại');
        }
    };

    const handleDelete = async (id) => {
        await deleteProduct(id);
        message.success('Đã xoá sản phẩm');
        fetchProducts(searchKeyword);
    };

    const handleRestore = async (id) => {
        await restoreProduct(id);
        message.success('Đã khôi phục sản phẩm');
        fetchProducts(searchKeyword);
    };

    /* ================= TABLE ================= */
    const columns = [
        {
            title: 'Tên sản phẩm',
            dataIndex: 'name',
            render: (text) => highlightText(text, searchKeyword)
        },
        {
            title: 'Thương hiệu',
            dataIndex: 'brand'
        },
        {
            title: 'Xuất xứ',
            dataIndex: 'originCountry'
        },
        {
            title: 'Variant khớp',
            render: (_, record) =>
                record.matchedVariants?.length ? (
                    <Space wrap>
                        {record.matchedVariants.map((v) => (
                            <Tag color="blue" key={v.sku}>
                                {highlightText(v.sku, searchKeyword)}
                            </Tag>
                        ))}
                    </Space>
                ) : (
                    '-'
                )
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            render: (val) =>
                val ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>
        },
        {
            title: 'Hành động',
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        disabled={!record.isActive}
                        onClick={(e) => {
                            e.stopPropagation();
                            openEdit(record);
                        }}
                    >
                        Sửa
                    </Button>

                    {record.isActive ? (
                        <Popconfirm
                            title="Xoá sản phẩm?"
                            onConfirm={(e) => {
                                e.stopPropagation();
                                handleDelete(record._id);
                            }}
                        >
                            <Button
                                danger
                                size="small"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Xoá
                            </Button>
                        </Popconfirm>
                    ) : (
                        <Button
                            size="small"
                            type="dashed"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRestore(record._id);
                            }}
                        >
                            Khôi phục
                        </Button>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div className="space-y-4">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <Input
                    placeholder="Tìm theo tên sản phẩm hoặc SKU"
                    allowClear
                    className="w-full sm:w-80"
                    onChange={(e) => debounceSearch(e.target.value)}
                />

                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setOpenModal(true)}
                >
                    Thêm sản phẩm
                </Button>
            </div>

            {/* TABLE */}
            {screens.sm ? (
                <Table
                    rowKey="_id"
                    columns={columns}
                    dataSource={products}
                    loading={loading}
                    scroll={{ x: 'max-content' }}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: true,
                        onChange: (page, pageSize) => {
                            fetchProducts(searchKeyword.trim(), page, pageSize);
                        }
                    }}
                    onRow={(record) => ({
                        onClick: () => {
                            // Sử dụng record.slug thay vì record._id để tạo URL thân thiện
                            if (record.slug) {
                                navigate(`/admin/products/${record.slug}`);
                            } else {
                                // Backup trường hợp sản phẩm cũ chưa có slug
                                navigate(`/admin/products/${record._id}`);
                            }
                        }
                    })}
                />
            ) : (
                <div className="space-y-3">
                    {products.map((product) => (
                        <div
                            key={product._id}
                            onClick={() => navigate(`/admin/products/${product._id}`)}
                            className="border rounded-lg p-4 shadow-sm bg-white cursor-pointer"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-base">
                                        {highlightText(product.name, searchKeyword)}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {product.brand}
                                    </div>
                                </div>

                                <Tag color={product.isActive ? 'green' : 'red'}>
                                    {product.isActive ? 'Active' : 'Inactive'}
                                </Tag>
                            </div>

                            <div className="mt-2 text-sm text-gray-600 space-y-1">
                                {product.originCountry && (
                                    <div>Xuất xứ: {product.originCountry}</div>
                                )}

                                {product.matchedVariants?.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {product.matchedVariants.map((v) => (
                                            <Tag key={v.sku} color="blue">
                                                {highlightText(v.sku, searchKeyword)}
                                            </Tag>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 flex gap-2 flex-wrap">
                                <Button
                                    size="small"
                                    disabled={!product.isActive}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openEdit(product);
                                    }}
                                >
                                    Sửa
                                </Button>

                                {product.isActive ? (
                                    <Button
                                        danger
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(product._id);
                                        }}
                                    >
                                        Xoá
                                    </Button>
                                ) : (
                                    <Button
                                        size="small"
                                        type="dashed"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRestore(product._id);
                                        }}
                                    >
                                        Khôi phục
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Pagination mobile */}
                    <div className="flex justify-center gap-3 pt-2">
                        <Button
                            disabled={pagination.current === 1}
                            onClick={() =>
                                fetchProducts(
                                    searchKeyword,
                                    pagination.current - 1,
                                    pagination.pageSize
                                )
                            }
                        >
                            Trước
                        </Button>

                        <span className="self-center text-sm">
                            Trang {pagination.current}
                        </span>

                        <Button
                            disabled={
                                pagination.current * pagination.pageSize >= pagination.total
                            }
                            onClick={() =>
                                fetchProducts(
                                    searchKeyword,
                                    pagination.current + 1,
                                    pagination.pageSize
                                )
                            }
                        >
                            Sau
                        </Button>
                    </div>
                </div>
            )}

            {/* CREATE MODAL */}
            {/* Modal Create */}
            <Modal
                title="Tạo sản phẩm"
                open={openModal}
                onOk={handleCreate}
                onCancel={() => setOpenModal(false)}
                okText="Tạo"
                cancelText="Huỷ"
                width="90%"
                style={{ maxWidth: 900 }}
            >
                <Form layout="vertical" form={createForm}>
                    {/* PRODUCT INFO */}
                    <Form.Item
                        label="Tên sản phẩm"
                        name="name"
                        rules={[{ required: true, message: 'Nhập tên sản phẩm' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Thương hiệu"
                        name="brand" rules={[{ required: true, message: 'Nhập thương hiệu' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Xuất xứ"
                        name="originCountry">
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Mô tả"
                        name="description">
                        <Input.TextArea rows={2} />
                    </Form.Item>

                    {/* VARIANTS */}
                    <Form.List
                        name="variants"
                        rules={[
                            {
                                validator: async (_, variants) => {
                                    if (!variants || variants.length < 1) {
                                        return Promise.reject(
                                            new Error('Phải có ít nhất 1 variant')
                                        );
                                    }
                                }
                            }
                        ]}
                    >
                        {(fields, { add, remove }) => (
                            <>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-semibold">Danh sách Variant</h3>
                                </div>
                                {fields.map(({ key, name }) => (
                                    <div
                                        key={key}
                                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border p-3 rounded mb-3" >
                                        <Form.Item
                                            label="SKU"
                                            name={[name, 'sku']}
                                            rules={[{ required: true }]}
                                        >
                                            <Input />
                                        </Form.Item>

                                        <Form.Item
                                            label="Màu"
                                            name={[name, 'colorCode']}>
                                            <Input />
                                        </Form.Item>

                                        <Form.Item
                                            label="Đơn vị"
                                            name={[name, 'unit']}
                                            rules={[{ required: true }]}
                                        >
                                            <Input placeholder="Cây / Cái / Hộp" />
                                        </Form.Item>

                                        <Form.Item
                                            label="Giá"
                                            name={[name, 'price']}
                                            rules={[{ required: true }]}
                                        >
                                            <InputNumber
                                                className="w-full"
                                                min={0}
                                                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                parser={v => v.replace(/\$\s?|(,*)/g, '')}
                                                addonAfter="₫"
                                            />
                                        </Form.Item>

                                        <Form.Item
                                            label="Tồn kho"
                                            name={[name, 'inventory']}
                                            initialValue={0}
                                        >
                                            <Input
                                                type="number"
                                                disabled
                                                className="bg-gray-100 cursor-not-allowed"
                                            />
                                        </Form.Item>

                                        <div className="flex items-end sm:col-span-2 lg:col-span-1 mb-6">
                                            <Button danger onClick={() => remove(name)}> Xoá </Button>
                                        </div>
                                    </div>
                                ))}

                                <div className="flex justify-end items-center mb-2">
                                    <Button type="dashed" onClick={() => add()}>
                                        + Thêm Variant
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form.List>
                </Form>
            </Modal>

            {/* EDIT MODAL */}
            <Modal
                title="Chỉnh sửa sản phẩm"
                open={editOpen}
                onCancel={() => {
                    setEditOpen(false);
                    editForm.resetFields();
                }}
                onOk={handleUpdateProduct}
            >
                <Form layout="vertical" form={editForm}>
                    <Form.Item label="Tên sản phẩm" name="name" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item label="Thương hiệu" name="brand" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item label="Xuất xứ" name="originCountry">
                        <Input />
                    </Form.Item>

                    <Form.Item label="Mô tả" name="description">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Products;
