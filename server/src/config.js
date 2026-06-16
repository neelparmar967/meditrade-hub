import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5001,
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-this-secret',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
};

export const roles = [
  'SUPER_ADMIN',
  'RETAILER',
  'DISTRIBUTOR',
  'SALES_PERSON',
  'COMPANY_ADMIN',
  'BRANCH_MANAGER'
];

export const orderStatuses = [
  'Placed',
  'Processing',
  'Packed',
  'Dispatched',
  'Delivered',
  'Cancelled'
];
