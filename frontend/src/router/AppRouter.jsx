import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';

// Layouts
import AdminLayout from '../components/layout/admin/AdminLayout';
import StaffLayout from '../components/layout/staff/StaffLayout';

// Fallback spinner cho từng trang khi đang tải lazy
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', width: '100%' }}>
    <Spin size="large" tip="Đang tải dữ liệu trang..." />
  </div>
);

// Lazy-loaded pages
const Login = lazy(() => import('../pages/Login'));
const Dashboard = lazy(() => import('../pages/admin/Dashboard'));
const Products = lazy(() => import('../pages/admin/Products'));
const ProductDetail = lazy(() => import('../pages/admin/ProductDetails'));
const Customers = lazy(() => import('../pages/admin/Customer'));
const Staffs = lazy(() => import('../pages/admin/Staff'));
const Company = lazy(() => import('../pages/admin/Company'));
const Invoices = lazy(() => import('../pages/admin/Invoices'));
const Debts = lazy(() => import('../pages/admin/Debts'));
const ImportGoods = lazy(() => import('../pages/admin/ImportGoods'));
const SampleLabels = lazy(() => import('../pages/admin/SampleLabels'));
const ProductDisposals = lazy(() => import('../pages/admin/ProductDisposals'));

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Login */}
          <Route path="/login" element={<Login />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:slug" element={<ProductDetail />} />
            <Route path="customers" element={<Customers />} />
            <Route path="staffs" element={<Staffs />} />
            <Route path="company-info" element={<Company />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="sample-labels" element={<SampleLabels />} />
            <Route path="debts" element={<Debts />} />
            <Route path="import-goods" element={<ImportGoods />} />
            <Route path="product-disposals" element={<ProductDisposals />} />
          </Route>

          {/* Staff */}
          <Route path="/staff" element={<StaffLayout />}>
            <Route path="invoices" element={<Invoices />} />
            <Route path="customers" element={<Customers />} />
            <Route path="products" element={<Products />} />
            <Route path="import-goods" element={<ImportGoods />} />
            <Route path="product-disposals" element={<ProductDisposals />} />
          </Route>

          {/* Redirect mặc định */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
