import mongoose from 'mongoose';
import { roles, orderStatuses } from './config.js';

const base = { timestamps: true, versionKey: false };

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, index: true },
  passwordHash: String,
  role: { type: String, enum: roles },
  phone: String,
  status: { type: String, default: 'active' }
}, base);

const retailerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  shopName: String,
  gstNumber: String,
  drugLicenseNumber: String,
  address: String,
  preferredDistributorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Distributor' }]
}, base);

const distributorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  region: String,
  gstNumber: String,
  address: String,
  serviceAreas: [String],
  rating: Number
}, base);

const companySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  description: String,
  supportEmail: String,
  banners: [String]
}, base);

const salesPersonSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Distributor' },
  assignedRetailerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Retailer' }],
  territory: String,
  target: Number
}, base);

const productSchema = new mongoose.Schema({
  name: { type: String, index: true },
  composition: String,
  category: String,
  packSize: String,
  mrp: Number,
  ptr: Number,
  stock: Number,
  stockStatus: String,
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Distributor' },
  image: String
}, base);
productSchema.index({ name: 'text', composition: 'text', category: 'text' });
productSchema.index({ distributorId: 1, category: 1 });
productSchema.index({ companyId: 1 });

const schemeSchema = new mongoose.Schema({
  title: String,
  description: String,
  banner: String,
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Distributor' },
  validUntil: String,
  category: String,
  minOrderAmount: Number,
  discountAmount: Number,
  usedBy: [String]
}, base);

const cartSchema = new mongoose.Schema({
  retailerId: String,
  items: [{ productId: String, quantity: Number }],
  appliedSchemeIds: [String]
}, base);
cartSchema.index({ retailerId: 1 });

const orderItemSchema = new mongoose.Schema({
  productId: String,
  quantity: Number,
  acceptedQuantity: Number,
  price: Number,
  status: String
}, { _id: false });

const orderSchema = new mongoose.Schema({
  retailerId: String,
  distributorId: String,
  status: { type: String, enum: orderStatuses, default: 'Placed' },
  subtotal: Number,
  discount: Number,
  total: Number,
  appliedSchemeId: String,
  bouncedReason: String,
  items: [orderItemSchema]
}, base);
orderSchema.index({ retailerId: 1, createdAt: -1 });
orderSchema.index({ distributorId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

const notificationSchema = new mongoose.Schema({
  userId: String,
  title: String,
  message: String,
  type: String,
  orderId: String,
  distributorId: String,
  status: String,
  read: { type: Boolean, default: false }
}, base);
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const feedbackSchema = new mongoose.Schema({
  retailerId: String,
  distributorId: String,
  orderId: String,
  rating: Number,
  message: String
}, base);
feedbackSchema.index({ orderId: 1, retailerId: 1 }, { unique: true, sparse: true });

const permissionSchema = new mongoose.Schema({
  role: String,
  permissions: [String]
}, base);

export const models = {
  User: mongoose.model('User', userSchema),
  Retailer: mongoose.model('Retailer', retailerSchema),
  Distributor: mongoose.model('Distributor', distributorSchema),
  Company: mongoose.model('Company', companySchema),
  SalesPerson: mongoose.model('SalesPerson', salesPersonSchema),
  Product: mongoose.model('Product', productSchema),
  Scheme: mongoose.model('Scheme', schemeSchema),
  Cart: mongoose.model('Cart', cartSchema),
  Order: mongoose.model('Order', orderSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  Feedback: mongoose.model('Feedback', feedbackSchema),
  Permission: mongoose.model('Permission', permissionSchema)
};
