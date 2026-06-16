import bcrypt from 'bcryptjs';

const passwordHash = bcrypt.hashSync('Password@123', 10);

export const seed = {
  users: [
    { id: 'u_admin', name: 'Naina Rao', email: 'admin@meditradehub.test', passwordHash, role: 'SUPER_ADMIN', phone: '9000000001', status: 'active' },
    { id: 'u_retailer', name: 'Aarav Medical Store', email: 'retailer@meditradehub.test', passwordHash, role: 'RETAILER', phone: '9000000002', status: 'active' },
    { id: 'u_distributor', name: 'Northline Stockists', email: 'distributor@meditradehub.test', passwordHash, role: 'DISTRIBUTOR', phone: '9000000003', status: 'active' },
    { id: 'u_sales', name: 'Meera Field Sales', email: 'sales@meditradehub.test', passwordHash, role: 'SALES_PERSON', phone: '9000000004', status: 'active' },
    { id: 'u_company', name: 'Vanta Life Sciences', email: 'company@meditradehub.test', passwordHash, role: 'COMPANY_ADMIN', phone: '9000000005', status: 'active' },
    { id: 'u_branch', name: 'East Branch Manager', email: 'branch@meditradehub.test', passwordHash, role: 'BRANCH_MANAGER', phone: '9000000006', status: 'active' }
  ],
  retailers: [
    { id: 'r_1', userId: 'u_retailer', shopName: 'Aarav Medical Store', gstNumber: '27AARCM1234L1Z2', drugLicenseNumber: 'DL-MH-77421', address: '12 Care Street, Pune', preferredDistributorIds: ['d_1', 'd_2'] }
  ],
  distributors: [
    { id: 'd_1', userId: 'u_distributor', name: 'Northline Stockists', region: 'West Zone', gstNumber: '27NORST4421P1ZA', address: 'Warehouse 4, Pune', serviceAreas: ['Pune', 'Mumbai'], rating: 4.7 },
    { id: 'd_2', userId: 'u_branch', name: 'Zenith Pharma Supply', region: 'South Zone', gstNumber: '29ZENIT7781B1Z9', address: 'Market Yard, Bengaluru', serviceAreas: ['Bengaluru', 'Mysuru'], rating: 4.5 }
  ],
  companies: [
    { id: 'c_1', userId: 'u_company', name: 'Vanta Life Sciences', description: 'Quality generics and chronic-care portfolio.', supportEmail: 'care@vantalife.test' },
    { id: 'c_2', name: 'NovaCure Remedies', description: 'Acute-care tablets, syrups, and wellness range.', supportEmail: 'partners@novacure.test' }
  ],
  salesPersons: [
    { id: 'sp_1', userId: 'u_sales', distributorId: 'd_1', assignedRetailerIds: ['r_1'], territory: 'Pune Central', target: 400000 }
  ],
  products: [
    { id: 'p_1', name: 'Glycora-M 500 Tablet', composition: 'Metformin 500mg', category: 'Diabetes', packSize: '10x10 tablets', mrp: 118, ptr: 86, stock: 340, stockStatus: 'In stock', companyId: 'c_1', distributorId: 'd_1', image: '/placeholder-medicine.svg' },
    { id: 'p_2', name: 'Cardiovex 5 Tablet', composition: 'Amlodipine 5mg', category: 'Cardiac', packSize: '20x15 tablets', mrp: 92, ptr: 63, stock: 180, stockStatus: 'In stock', companyId: 'c_1', distributorId: 'd_1', image: '/placeholder-medicine.svg' },
    { id: 'p_3', name: 'Respira-LC Syrup', composition: 'Levocetirizine + Montelukast', category: 'Respiratory', packSize: '100ml bottle', mrp: 132, ptr: 96, stock: 58, stockStatus: 'Low stock', companyId: 'c_2', distributorId: 'd_2', image: '/placeholder-medicine.svg' },
    { id: 'p_4', name: 'Neurocal D3 Sachet', composition: 'Vitamin D3 60000 IU', category: 'Supplements', packSize: '1x4 sachets', mrp: 144, ptr: 101, stock: 0, stockStatus: 'Out of stock', companyId: 'c_2', distributorId: 'd_1', image: '/placeholder-medicine.svg' },
    { id: 'p_5', name: 'AcetaPlus 650 Tablet', composition: 'Paracetamol 650mg', category: 'Pain relief', packSize: '15x10 tablets', mrp: 34, ptr: 22, stock: 720, stockStatus: 'In stock', companyId: 'c_2', distributorId: 'd_2', image: '/placeholder-medicine.svg' },
    { id: 'p_6', name: 'ParaRelief 500 Tablet', composition: 'Paracetamol 500mg', category: 'Pain relief', packSize: '20x10 tablets', mrp: 28, ptr: 19, stock: 460, stockStatus: 'In stock', companyId: 'c_1', distributorId: 'd_1', image: '/placeholder-medicine.svg' },
    { id: 'p_7', name: 'ParaRelief 650 Tablet', composition: 'Paracetamol 650mg', category: 'Pain relief', packSize: '15x10 tablets', mrp: 36, ptr: 24, stock: 42, stockStatus: 'Low stock', companyId: 'c_1', distributorId: 'd_1', image: '/placeholder-medicine.svg' }
  ],
  schemes: [
    { id: 's_1', title: 'Northline Starter Offer', description: 'Rs. 500 off on Northline orders of Rs. 1,000 or more.', banner: 'Rs. 500 off', companyId: 'c_1', distributorId: 'd_1', validUntil: '2026-09-30', category: 'All', minOrderAmount: 1000, discountAmount: 500, usedBy: [] },
    { id: 's_2', title: 'Zenith Basket Offer', description: 'Rs. 500 off on Zenith orders of Rs. 1,000 or more.', banner: 'Rs. 500 off', companyId: 'c_2', distributorId: 'd_2', validUntil: '2026-08-15', category: 'All', minOrderAmount: 1000, discountAmount: 500, usedBy: [] }
  ],
  orders: [],
  notifications: [
    { id: 'n_1', userId: 'u_retailer', title: 'Order dispatched', message: 'Your Northline Stockists order is now dispatched.', type: 'order', read: false },
    { id: 'n_2', userId: 'u_retailer', title: 'New trade offer', message: 'Fast Moving Essentials offer is live this month.', type: 'offer', read: false }
  ],
  feedback: [
    { id: 'f_1', retailerId: 'r_1', distributorId: 'd_1', rating: 5, message: 'Timely dispatch and clear item availability updates.' }
  ],
  carts: []
};
