import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { useAuth } from './state/AuthContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Products from './pages/Products.jsx';
import ProductDetails from './pages/ProductDetails.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import Offers from './pages/Offers.jsx';
import Storefront from './pages/Storefront.jsx';
import Notifications from './pages/Notifications.jsx';
import Reports from './pages/Reports.jsx';
import Profile from './pages/Profile.jsx';
import Support from './pages/Support.jsx';
import Inventory from './pages/Inventory.jsx';

function Protected() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Protected />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/tracking" element={<Orders tracking />} />
        <Route path="/reorder" element={<Orders reorder />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/distributors" element={<Storefront type="distributors" />} />
        <Route path="/distributors/:id" element={<Storefront type="distributors" detail />} />
        <Route path="/companies" element={<Storefront type="companies" />} />
        <Route path="/companies/:id" element={<Storefront type="companies" detail />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/support" element={<Support />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
