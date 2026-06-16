import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('meditrade_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));

export const roleLabel = {
  SUPER_ADMIN: 'Wholesaler Admin',
  RETAILER: 'Medical Shop',
  DISTRIBUTOR: 'Wholesaler',
  SALES_PERSON: 'Wholesaler Staff',
  COMPANY_ADMIN: 'Wholesaler Admin',
  BRANCH_MANAGER: 'Wholesaler'
};
