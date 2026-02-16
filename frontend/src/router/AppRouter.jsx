import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from '../pages/Login';

// admin pages
import AdminLayout from '../components/layout/admin/AdminLayout';
import Dashboard from '../pages/admin/Dashboard';
import Products from '../pages/admin/Products';
import ProductDetail from '../pages/admin/ProductDetails';
import Customers from '../pages/admin/Customer';
import Staffs from '../pages/admin/Staff';
import Company from '../pages/admin/Company';
import Invoices from '../pages/admin/Invoices';
import Debts from '../pages/admin/Debts';
import ImportGoods from '../pages/admin/ImportGoods';

// staff pages
import StaffLayout from '../components/layout/staff/StaffLayout';

export default function AppRouter() {
  return (
    <BrowserRouter>
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
          <Route path="debts" element={<Debts />} />
          <Route path="import-goods" element={<ImportGoods />} />
        </Route>

        {/* Staff */}
        <Route path="/staff" element={<StaffLayout />} >
          <Route path="invoices" element={<Invoices />} />
          <Route path="customers" element={<Customers />} />
          <Route path="products" element={<Products />} />
          <Route path="import-goods" element={<ImportGoods />} />
        </Route>

        {/* Redirect mặc định */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
