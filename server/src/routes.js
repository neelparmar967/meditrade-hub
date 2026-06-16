import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { body, validationResult } from 'express-validator';
import { comparePassword, findUserByEmail, hashPassword, permit, requireAuth, signToken } from './auth.js';
import { orderStatuses, roles } from './config.js';
import { dbState, memoryStore } from './store.js';
import { models } from './models.js';
import { enrichProduct, groupCartByDistributor, isOfferActive, makePurchaseOrderPdf } from './utils.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const asPlain = (doc) => JSON.parse(JSON.stringify(doc));
const getData = async () => {
  if (!dbState.connected) return memoryStore.data;
  const [users, retailers, distributors, companies, salesPersons, products, schemes, orders, notifications, feedback, carts] = await Promise.all([
    models.User.find().lean(),
    models.Retailer.find().lean(),
    models.Distributor.find().lean(),
    models.Company.find().lean(),
    models.SalesPerson.find().lean(),
    models.Product.find().lean(),
    models.Scheme.find().lean(),
    models.Order.find().lean(),
    models.Notification.find().lean(),
    models.Feedback.find().lean(),
    models.Cart.find().lean()
  ]);
  return { users, retailers, distributors, companies, salesPersons, products, schemes, orders, notifications, feedback, carts };
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ message: 'Validation failed', errors: errors.array() });
  return next();
};

const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const pageParams = (req, fallbackLimit = 60) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit || fallbackLimit), 100));
  const page = Math.max(1, Number(req.query.page || 1));
  return { limit, page, skip: (page - 1) * limit };
};

const editDistance = (left, right) => {
  const matrix = Array.from({ length: left.length + 1 }, (_, index) => [index]);
  for (let index = 1; index <= right.length; index += 1) matrix[0][index] = index;
  for (let row = 1; row <= left.length; row += 1) {
    for (let col = 1; col <= right.length; col += 1) {
      matrix[row][col] = left[row - 1] === right[col - 1]
        ? matrix[row - 1][col - 1]
        : Math.min(matrix[row - 1][col - 1], matrix[row][col - 1], matrix[row - 1][col]) + 1;
    }
  }
  return matrix[left.length][right.length];
};

const matchesQuery = (query, text) => {
  const q = normalize(query);
  if (!q) return true;
  const haystack = normalize(text);
  if (haystack.includes(q)) return true;
  const queryTokens = q.split(' ').filter(Boolean);
  const textTokens = haystack.split(' ').filter(Boolean);
  return queryTokens.every((queryToken) =>
    textTokens.some((token) => Math.abs(token.length - queryToken.length) <= 2 && editDistance(queryToken, token) <= 2)
  );
};

const getProfileIdsForUser = (data, userId) => {
  const retailer = data.retailers.find((item) => String(item.userId) === String(userId));
  const distributor = data.distributors.find((item) => String(item.userId) === String(userId));
  return {
    buyerIds: [userId, retailer?.id, retailer?._id, distributor?.id, distributor?._id].filter(Boolean).map(String),
    sellerDistributorIds: [distributor?.id, distributor?._id].filter(Boolean).map(String),
    distributor
  };
};

const findCurrentCart = (data, userId) => {
  const { buyerIds } = getProfileIdsForUser(data, userId);
  return data.carts.find((item) => buyerIds.includes(String(item.retailerId)));
};

const canUpdateOrderStatus = (data, user, order) => {
  if (user.role === 'SUPER_ADMIN') return true;
  const { sellerDistributorIds } = getProfileIdsForUser(data, user.id);
  return sellerDistributorIds.includes(String(order.distributorId));
};

const enrichOrder = (order, data, user) => {
  const distributor = data.distributors.find((item) => String(item.id || item._id) === String(order.distributorId));
  const buyer = data.retailers.find((item) => String(item.id || item._id) === String(order.retailerId))
    || data.distributors.find((item) => String(item.id || item._id) === String(order.retailerId))
    || data.retailers.find((item) => String(item.userId) === String(order.retailerId))
    || data.distributors.find((item) => String(item.userId) === String(order.retailerId));
  const buyerUser = data.users.find((item) => String(item.id || item._id) === String(order.retailerId));
  const { buyerIds, sellerDistributorIds } = getProfileIdsForUser(data, user.id);
  const isIncoming = sellerDistributorIds.includes(String(order.distributorId));
  const isOutgoing = buyerIds.includes(String(order.retailerId));
  return {
    ...order,
    items: (order.items || []).map((item) => {
      const product = data.products.find((entry) => String(entry.id || entry._id) === String(item.productId));
      return {
        ...item,
        productName: product?.name || item.productId,
        composition: product?.composition || '',
        packSize: product?.packSize || '',
        currentStock: Number(product?.stock || 0)
      };
    }),
    buyerName: buyer?.shopName || buyer?.name || buyerUser?.name || 'Buyer',
    sellerName: distributor?.name || 'Wholesaler',
    canUpdateStatus: canUpdateOrderStatus(data, user, order),
    orderDirection: isIncoming ? 'incoming' : isOutgoing ? 'outgoing' : 'all'
  };
};

const LOW_STOCK_LIMIT = 75;
const stockStatusFor = (stock) => Number(stock) <= 0 ? 'Out of stock' : Number(stock) < LOW_STOCK_LIMIT ? 'Low stock' : 'In stock';

const productMatchMeta = (query, product) => {
  if (!normalize(query)) return { formulaMatch: false, nameMatch: false, matchType: 'Catalog item' };
  const formulaMatch = matchesQuery(query, product.composition);
  const nameMatch = matchesQuery(query, product.name);
  return {
    formulaMatch,
    nameMatch,
    matchType: formulaMatch ? 'Formula match' : nameMatch ? 'Name match' : 'Related match'
  };
};

const distributorRating = (data, distributorId) => {
  const ratings = data.feedback
    .filter((item) => String(item.distributorId) === String(distributorId))
    .map((item) => Number(item.rating || 0))
    .filter((rating) => rating > 0);
  if (ratings.length === 0) return 0;
  return Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10;
};

const enrichDistributor = (distributor, data) => {
  if (!distributor) return distributor;
  return {
    ...distributor,
    rating: distributorRating(data, distributor.id || distributor._id),
    ratingCount: data.feedback.filter((item) => String(item.distributorId) === String(distributor.id || distributor._id)).length
  };
};

const createNotification = async (payload) => {
  const notification = {
    title: payload.title,
    message: payload.message,
    type: payload.type || 'system',
    orderId: payload.orderId,
    distributorId: payload.distributorId,
    status: payload.status,
    read: false,
    createdAt: new Date().toISOString(),
    userId: String(payload.userId)
  };
  return dbState.connected ? asPlain(await models.Notification.create(notification)) : memoryStore.create('notifications', notification);
};

const createNotificationsBulk = async (rows) => {
  const notifications = rows.map((payload) => ({
    title: payload.title,
    message: payload.message,
    type: payload.type || 'system',
    orderId: payload.orderId,
    distributorId: payload.distributorId,
    status: payload.status,
    read: false,
    createdAt: new Date().toISOString(),
    userId: String(payload.userId)
  }));
  if (notifications.length === 0) return [];
  return dbState.connected
    ? (await models.Notification.insertMany(notifications)).map(asPlain)
    : memoryStore.createMany('notifications', notifications);
};

const userIdForBuyerRef = (data, buyerRef) => {
  const ref = String(buyerRef);
  const retailer = data.retailers.find((item) => String(item.id || item._id) === ref || String(item.userId) === ref);
  if (retailer?.userId) return String(retailer.userId);
  const distributor = data.distributors.find((item) => String(item.id || item._id) === ref || String(item.userId) === ref);
  if (distributor?.userId) return String(distributor.userId);
  const user = data.users.find((item) => String(item.id || item._id) === ref);
  return user ? String(user.id || user._id) : null;
};

const adjustStock = async (productId, delta, data) => {
  const product = data.products.find((item) => String(item.id || item._id) === String(productId));
  if (!product) return null;
  const nextStock = Math.max(0, Number(product.stock || 0) + Number(delta || 0));
  const stockPayload = { stock: nextStock, stockStatus: stockStatusFor(nextStock) };
  if (dbState.connected) return asPlain(await models.Product.findByIdAndUpdate(productId, stockPayload, { new: true }));
  const updated = memoryStore.update('products', productId, stockPayload);
  product.stock = nextStock;
  product.stockStatus = stockPayload.stockStatus;
  return updated;
};

router.get('/health', async (_req, res) => {
  res.json({ ok: true, database: dbState.mode, app: 'MediTrade Hub', lowStockLimit: LOW_STOCK_LIMIT });
});

router.post('/auth/login', [body('email').isEmail(), body('password').isLength({ min: 6 })], validate, async (req, res) => {
  const user = await findUserByEmail(req.body.email);
  const passwordMatches = user ? await comparePassword(req.body.password, user.passwordHash) : false;
  if (!user || !passwordMatches) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  const safeUser = { ...user };
  delete safeUser.passwordHash;
  res.json({ token: signToken(user), user: safeUser });
});

router.post('/auth/register', [
  body('name').isLength({ min: 2 }),
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['RETAILER', 'DISTRIBUTOR'])
], validate, async (req, res) => {
  const existing = await findUserByEmail(req.body.email);
  if (existing) return res.status(409).json({ message: 'Email already registered' });
  const payload = {
    name: req.body.name,
    email: req.body.email.toLowerCase(),
    passwordHash: await hashPassword(req.body.password),
    role: req.body.role,
    phone: req.body.phone || '',
    status: 'active'
  };
  let user;
  if (dbState.connected) user = asPlain(await models.User.create(payload));
  else user = memoryStore.create('users', payload);
  if (req.body.role === 'RETAILER') {
    const retailer = { userId: user.id || user._id, shopName: req.body.shopName || req.body.name, gstNumber: req.body.gstNumber, drugLicenseNumber: req.body.drugLicenseNumber, address: req.body.address, preferredDistributorIds: [] };
    dbState.connected ? await models.Retailer.create(retailer) : memoryStore.create('retailers', retailer);
  }
  if (req.body.role === 'DISTRIBUTOR') {
    const serviceAreas = String(req.body.serviceAreas || req.body.city || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const distributor = {
      userId: user.id || user._id,
      name: req.body.businessName || req.body.name,
      region: req.body.region || req.body.city || '',
      gstNumber: req.body.gstNumber,
      address: req.body.address,
      serviceAreas,
      rating: 0
    };
    dbState.connected ? await models.Distributor.create(distributor) : memoryStore.create('distributors', distributor);
  }
  const safeUser = { ...user };
  delete safeUser.passwordHash;
  res.status(201).json({ token: signToken(user), user: safeUser });
});

router.get('/me', requireAuth, async (req, res) => {
  const data = await getData();
  const user = data.users.find((item) => String(item.id || item._id) === String(req.user.id));
  const profile = data.retailers.find((item) => String(item.userId) === String(req.user.id))
    || data.distributors.find((item) => String(item.userId) === String(req.user.id))
    || data.salesPersons.find((item) => String(item.userId) === String(req.user.id))
    || data.companies.find((item) => String(item.userId) === String(req.user.id));
  const isDistributor = data.distributors.some((item) => String(item.userId) === String(req.user.id));
  const ratingSummary = isDistributor && profile
    ? {
        average: distributorRating(data, profile.id || profile._id),
        count: data.feedback.filter((item) => String(item.distributorId) === String(profile.id || profile._id)).length,
        recent: data.feedback
          .filter((item) => String(item.distributorId) === String(profile.id || profile._id))
          .slice(-5)
          .reverse()
      }
    : { average: 0, count: 0, recent: [] };
  const safeUser = user ? { ...user } : user;
  if (safeUser) delete safeUser.passwordHash;
  res.json({ user: safeUser, profile, ratingSummary });
});

router.patch('/me/profile', requireAuth, async (req, res) => {
  const data = await getData();
  const userPayload = {
    name: req.body.name,
    phone: req.body.phone
  };
  Object.keys(userPayload).forEach((key) => userPayload[key] === undefined && delete userPayload[key]);
  let user = data.users.find((item) => String(item.id || item._id) === String(req.user.id));
  if (userPayload.name || userPayload.phone) {
    user = dbState.connected
      ? asPlain(await models.User.findByIdAndUpdate(req.user.id, userPayload, { new: true }))
      : memoryStore.update('users', req.user.id, userPayload);
  }

  const distributor = data.distributors.find((item) => String(item.userId) === String(req.user.id));
  const retailer = data.retailers.find((item) => String(item.userId) === String(req.user.id));
  const profilePayload = {
    name: req.body.businessName || req.body.name,
    shopName: req.body.businessName || req.body.name,
    gstNumber: req.body.gstNumber,
    drugLicenseNumber: req.body.drugLicenseNumber,
    address: req.body.address,
    region: req.body.region
  };
  Object.keys(profilePayload).forEach((key) => profilePayload[key] === undefined && delete profilePayload[key]);
  let profile = distributor || retailer;
  if (profile) {
    if (dbState.connected) {
      const model = distributor ? models.Distributor : models.Retailer;
      profile = asPlain(await model.findByIdAndUpdate(profile._id, profilePayload, { new: true }));
    } else {
      profile = memoryStore.update(distributor ? 'distributors' : 'retailers', profile.id, profilePayload);
    }
  }
  if (user) delete user.passwordHash;
  res.json({ user, profile });
});

router.get('/products', requireAuth, async (req, res) => {
  const { limit, page, skip } = pageParams(req, 60);
  const data = await getData();
  const q = String(req.query.q || '');
  const filters = ['companyId', 'distributorId', 'category'];
  let products = data.products.filter((product) => {
    const enriched = enrichProduct(product, data);
    const haystack = [product.name, product.composition, product.category, enriched.companyName, enriched.distributorName].join(' ');
    return matchesQuery(q, haystack);
  });
  filters.forEach((key) => {
    if (req.query[key]) products = products.filter((product) => String(product[key]) === String(req.query[key]));
  });
  const total = products.length;
  const pageProducts = products.slice(skip, skip + limit);
  res.json({
    items: pageProducts.map((product) => ({ ...enrichProduct(product, data), ...productMatchMeta(q, product) })),
    total,
    page,
    limit,
    hasMore: skip + pageProducts.length < total
  });
});

router.get('/inventory', requireAuth, permit('DISTRIBUTOR', 'SUPER_ADMIN', 'BRANCH_MANAGER'), async (req, res) => {
  const data = await getData();
  const { sellerDistributorIds } = getProfileIdsForUser(data, req.user.id);
  const products = req.user.role === 'SUPER_ADMIN'
    ? data.products
    : data.products.filter((product) => sellerDistributorIds.includes(String(product.distributorId)));
  res.json(products.map((product) => enrichProduct(product, data)));
});

router.post('/inventory', requireAuth, permit('DISTRIBUTOR', 'SUPER_ADMIN', 'BRANCH_MANAGER'), async (req, res) => {
  const data = await getData();
  const { sellerDistributorIds } = getProfileIdsForUser(data, req.user.id);
  const distributorId = req.user.role === 'SUPER_ADMIN' ? req.body.distributorId : sellerDistributorIds[0];
  if (!distributorId) return res.status(403).json({ message: 'Create a wholesaler profile before adding inventory' });
  const payload = {
    name: req.body.name,
    composition: req.body.composition,
    category: req.body.category || 'General',
    packSize: req.body.packSize,
    mrp: Number(req.body.mrp || 0),
    ptr: Number(req.body.ptr || 0),
    stock: Number(req.body.stock || 0),
    stockStatus: stockStatusFor(req.body.stock),
    companyId: req.body.companyId || data.companies[0]?.id || data.companies[0]?._id,
    distributorId,
    image: '/placeholder-medicine.svg'
  };
  const product = dbState.connected ? asPlain(await models.Product.create(payload)) : memoryStore.create('products', payload);
  res.status(201).json(enrichProduct(product, data));
});

router.patch('/inventory/:id', requireAuth, permit('DISTRIBUTOR', 'SUPER_ADMIN', 'BRANCH_MANAGER'), async (req, res) => {
  const data = await getData();
  const product = data.products.find((item) => String(item.id || item._id) === String(req.params.id));
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const { sellerDistributorIds } = getProfileIdsForUser(data, req.user.id);
  if (req.user.role !== 'SUPER_ADMIN' && !sellerDistributorIds.includes(String(product.distributorId))) {
    return res.status(403).json({ message: 'You can only edit your own inventory' });
  }
  const payload = { ...req.body };
  if (payload.stock !== undefined) payload.stockStatus = stockStatusFor(payload.stock);
  const updated = dbState.connected ? asPlain(await models.Product.findByIdAndUpdate(req.params.id, payload, { new: true })) : memoryStore.update('products', req.params.id, payload);
  res.json(enrichProduct(updated, data));
});

router.delete('/inventory/:id', requireAuth, permit('DISTRIBUTOR', 'SUPER_ADMIN', 'BRANCH_MANAGER'), async (req, res) => {
  const data = await getData();
  const product = data.products.find((item) => String(item.id || item._id) === String(req.params.id));
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const { sellerDistributorIds } = getProfileIdsForUser(data, req.user.id);
  if (req.user.role !== 'SUPER_ADMIN' && !sellerDistributorIds.includes(String(product.distributorId))) {
    return res.status(403).json({ message: 'You can only delete your own inventory' });
  }
  if (dbState.connected) await models.Product.findByIdAndDelete(req.params.id);
  else memoryStore.remove('products', req.params.id);
  res.status(204).end();
});

router.post('/products', requireAuth, permit('DISTRIBUTOR', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), async (req, res) => {
  const payload = { ...req.body, stockStatus: Number(req.body.stock) <= 0 ? 'Out of stock' : Number(req.body.stock) < 75 ? 'Low stock' : 'In stock' };
  const product = dbState.connected ? asPlain(await models.Product.create(payload)) : memoryStore.create('products', payload);
  res.status(201).json(product);
});

router.patch('/products/:id', requireAuth, permit('DISTRIBUTOR', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), async (req, res) => {
  const product = dbState.connected ? asPlain(await models.Product.findByIdAndUpdate(req.params.id, req.body, { new: true })) : memoryStore.update('products', req.params.id, req.body);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

router.delete('/products/:id', requireAuth, permit('DISTRIBUTOR', 'SUPER_ADMIN', 'BRANCH_MANAGER'), async (req, res) => {
  if (dbState.connected) await models.Product.findByIdAndDelete(req.params.id);
  else memoryStore.remove('products', req.params.id);
  res.status(204).end();
});

router.get('/products/:id', requireAuth, async (req, res) => {
  const data = await getData();
  const product = data.products.find((item) => String(item.id || item._id) === String(req.params.id));
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(enrichProduct(product, data));
});

router.post('/products/upload', requireAuth, permit('DISTRIBUTOR', 'SUPER_ADMIN', 'BRANCH_MANAGER'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Upload a CSV or XLSX file' });
  const workbook = XLSX.read(req.file.buffer);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  const created = [];
  for (const row of rows) {
    const payload = {
      name: row.name || row.Name,
      composition: row.composition || row.Composition,
      category: row.category || row.Category,
      packSize: row.packSize || row['Pack Size'],
      mrp: Number(row.mrp || row.MRP || 0),
      ptr: Number(row.ptr || row.PTR || 0),
      stock: Number(row.stock || row.Stock || 0),
      stockStatus: Number(row.stock || row.Stock || 0) > 0 ? 'In stock' : 'Out of stock',
      companyId: row.companyId,
      distributorId: row.distributorId
    };
    if (payload.name) created.push(dbState.connected ? asPlain(await models.Product.create(payload)) : memoryStore.create('products', payload));
  }
  res.status(201).json({ count: created.length, products: created });
});

router.get('/companies', requireAuth, async (_req, res) => res.json((await getData()).companies));
router.get('/companies/:id', requireAuth, async (req, res) => {
  const data = await getData();
  const company = data.companies.find((item) => String(item.id || item._id) === String(req.params.id));
  res.json({ company, products: data.products.filter((item) => String(item.companyId) === String(req.params.id)).map((item) => enrichProduct(item, data)), schemes: data.schemes.filter((item) => String(item.companyId) === String(req.params.id) && isOfferActive(item)) });
});

router.get('/distributors', requireAuth, async (_req, res) => {
  const data = await getData();
  res.json(data.distributors.map((distributor) => enrichDistributor(distributor, data)));
});
router.get('/distributors/:id', requireAuth, async (req, res) => {
  const data = await getData();
  const distributor = data.distributors.find((item) => String(item.id || item._id) === String(req.params.id));
  res.json({ distributor: enrichDistributor(distributor, data), products: data.products.filter((item) => String(item.distributorId) === String(req.params.id)).map((item) => enrichProduct(item, data)), schemes: data.schemes.filter((item) => String(item.distributorId) === String(req.params.id) && isOfferActive(item)) });
});

router.get('/schemes', requireAuth, async (req, res) => {
  const data = await getData();
  const { sellerDistributorIds } = getProfileIdsForUser(data, req.user.id);
  res.json(data.schemes.filter((scheme) => isOfferActive(scheme)).map((scheme) => ({
    ...scheme,
    canDelete: req.user.role === 'SUPER_ADMIN' || sellerDistributorIds.includes(String(scheme.distributorId))
  })));
});
router.post('/schemes', requireAuth, permit('DISTRIBUTOR', 'BRANCH_MANAGER', 'SUPER_ADMIN'), async (req, res) => {
  const data = await getData();
  const { sellerDistributorIds } = getProfileIdsForUser(data, req.user.id);
  const distributorId = req.user.role === 'SUPER_ADMIN' ? req.body.distributorId : sellerDistributorIds[0];
  if (!distributorId) return res.status(403).json({ message: 'Create a wholesaler profile before adding offers' });
  const payload = {
    title: req.body.title,
    description: req.body.description || `Rs. ${req.body.discountAmount} off on orders above Rs. ${req.body.minOrderAmount}.`,
    banner: req.body.banner || `Rs. ${req.body.discountAmount} off`,
    distributorId,
    companyId: req.body.companyId || data.companies[0]?.id || data.companies[0]?._id,
    validUntil: req.body.validUntil,
    category: req.body.category || 'All',
    minOrderAmount: Number(req.body.minOrderAmount || 0),
    discountAmount: Number(req.body.discountAmount || 0),
    usedBy: []
  };
  const scheme = dbState.connected ? asPlain(await models.Scheme.create(payload)) : memoryStore.create('schemes', payload);
  const creatorDistributor = data.distributors.find((item) => String(item.id || item._id) === String(distributorId));
  const recipientIds = [...new Set(data.distributors.map((item) => String(item.userId)).filter(Boolean))];
  await createNotificationsBulk(recipientIds.map((userId) => ({
    userId,
    type: 'offer',
    title: 'New wholesaler offer',
    message: `${creatorDistributor?.name || 'A wholesaler'} created "${scheme.title}" (${scheme.banner}).`
  })));
  res.status(201).json(scheme);
});

router.delete('/schemes/:id', requireAuth, permit('DISTRIBUTOR', 'BRANCH_MANAGER', 'SUPER_ADMIN'), async (req, res) => {
  const data = await getData();
  const scheme = data.schemes.find((item) => String(item.id || item._id) === String(req.params.id));
  if (!scheme) return res.status(404).json({ message: 'Offer not found' });
  const { sellerDistributorIds } = getProfileIdsForUser(data, req.user.id);
  if (req.user.role !== 'SUPER_ADMIN' && !sellerDistributorIds.includes(String(scheme.distributorId))) {
    return res.status(403).json({ message: 'You can only delete your own offers' });
  }
  if (dbState.connected) await models.Scheme.findByIdAndDelete(req.params.id);
  else memoryStore.remove('schemes', req.params.id);
  res.status(204).end();
});

router.get('/cart', requireAuth, async (req, res) => {
  const data = await getData();
  const cart = findCurrentCart(data, req.user.id) || { retailerId: req.user.id, items: [] };
  const groups = groupCartByDistributor(cart.items, data.products, data, cart.appliedSchemeIds || []);
  res.json({
    ...cart,
    groups,
    total: groups.reduce((sum, group) => sum + group.subtotal, 0),
    discount: groups.reduce((sum, group) => sum + group.discount, 0),
    payable: groups.reduce((sum, group) => sum + group.payable, 0)
  });
});

router.post('/cart/items', requireAuth, permit('RETAILER', 'DISTRIBUTOR', 'SALES_PERSON', 'SUPER_ADMIN', 'BRANCH_MANAGER'), async (req, res) => {
  const data = await getData();
  let cart = findCurrentCart(data, req.user.id);
  const product = data.products.find((item) => String(item.id || item._id) === String(req.body.productId));
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const quantity = Math.max(1, Math.min(Number(req.body.quantity || 1), Number(product.stock || 1)));
  if (!cart) cart = dbState.connected ? asPlain(await models.Cart.create({ retailerId: req.user.id, items: [] })) : memoryStore.create('carts', { retailerId: req.user.id, items: [] });
  const existing = cart.items.find((item) => String(item.productId) === String(req.body.productId));
  if (existing) existing.quantity = Math.min(Number(existing.quantity || 0) + quantity, Number(product.stock || quantity));
  else cart.items.push({ productId: req.body.productId, quantity });
  if (dbState.connected) await models.Cart.findByIdAndUpdate(cart._id, { items: cart.items });
  else memoryStore.update('carts', cart.id, { items: cart.items });
  res.status(201).json(cart);
});

router.post('/cart/apply-offer', requireAuth, async (req, res) => {
  const data = await getData();
  const cart = findCurrentCart(data, req.user.id);
  if (!cart) return res.status(404).json({ message: 'Cart not found' });
  const scheme = data.schemes.find((item) => String(item.id || item._id) === String(req.body.schemeId));
  if (!scheme) return res.status(404).json({ message: 'Offer not found' });
  if (!isOfferActive(scheme)) return res.status(410).json({ message: 'This offer has expired' });
  const usedBy = scheme.usedBy || [];
  if (usedBy.map(String).includes(String(req.user.id))) return res.status(409).json({ message: 'You have already used this offer' });
  const groups = groupCartByDistributor(cart.items, data.products, data, cart.appliedSchemeIds || []);
  const group = groups.find((item) => String(item.distributorId) === String(scheme.distributorId));
  if (!group || group.subtotal < Number(scheme.minOrderAmount || 0)) return res.status(400).json({ message: 'Cart does not meet this offer minimum' });
  const appliedSchemeIds = [...new Set([...(cart.appliedSchemeIds || []).map(String), String(scheme.id || scheme._id)])];
  dbState.connected ? await models.Cart.findByIdAndUpdate(cart._id, { appliedSchemeIds }) : memoryStore.update('carts', cart.id, { appliedSchemeIds });
  res.json({ message: 'Offer applied', appliedSchemeIds });
});

router.patch('/cart/items/:productId', requireAuth, async (req, res) => {
  const data = await getData();
  const cart = findCurrentCart(data, req.user.id);
  if (!cart) return res.status(404).json({ message: 'Cart not found' });
  const product = data.products.find((item) => String(item.id || item._id) === String(req.params.productId));
  const quantity = Math.max(0, Math.min(Number(req.body.quantity || 0), Number(product?.stock || 0)));
  cart.items = cart.items.map((item) => String(item.productId) === String(req.params.productId) ? { ...item, quantity } : item).filter((item) => item.quantity > 0);
  dbState.connected ? await models.Cart.findByIdAndUpdate(cart._id, { items: cart.items }) : memoryStore.update('carts', cart.id, { items: cart.items });
  res.json(cart);
});

router.post('/orders/checkout', requireAuth, permit('RETAILER', 'DISTRIBUTOR', 'SALES_PERSON', 'SUPER_ADMIN', 'BRANCH_MANAGER'), async (req, res) => {
  const data = await getData();
  const cart = findCurrentCart(data, req.user.id);
  if (!cart || cart.items.length === 0) return res.status(400).json({ message: 'Cart is empty' });
  const unavailableItems = cart.items
    .map((item) => {
      const product = data.products.find((entry) => String(entry.id || entry._id) === String(item.productId));
      return { item, product };
    })
    .filter(({ item, product }) => !product || Number(product.stock || 0) < Number(item.quantity || 0));
  if (unavailableItems.length > 0) {
    return res.status(409).json({
      message: 'Some cart items are no longer available in the requested quantity',
      items: unavailableItems.map(({ item, product }) => ({
        productId: item.productId,
        name: product?.name || item.productId,
        requested: Number(item.quantity || 0),
        available: Number(product?.stock || 0)
      }))
    });
  }
  const groups = groupCartByDistributor(cart.items, data.products, data, cart.appliedSchemeIds || []);
  const orders = [];
  for (const group of groups) {
    const payload = {
      retailerId: cart.retailerId,
      distributorId: group.distributorId,
      status: 'Placed',
      subtotal: group.subtotal,
      discount: group.discount,
      total: group.payable,
      appliedSchemeId: group.appliedOffer?.id || group.appliedOffer?._id,
      items: group.items.map((item) => ({ productId: item.productId, quantity: item.quantity, acceptedQuantity: item.quantity, price: item.product.ptr, status: 'Placed' }))
    };
    orders.push(dbState.connected ? asPlain(await models.Order.create(payload)) : memoryStore.create('orders', { ...payload, createdAt: new Date().toISOString() }));
    for (const item of group.items) {
      await adjustStock(item.productId, -Number(item.quantity || 0), data);
    }
    if (group.appliedOffer) {
      const usedBy = [...new Set([...(group.appliedOffer.usedBy || []).map(String), String(req.user.id)])];
      dbState.connected ? await models.Scheme.findByIdAndUpdate(group.appliedOffer._id, { usedBy }) : memoryStore.update('schemes', group.appliedOffer.id, { usedBy });
    }
  }
  dbState.connected ? await models.Cart.findByIdAndUpdate(cart._id, { items: [], appliedSchemeIds: [] }) : memoryStore.update('carts', cart.id, { items: [], appliedSchemeIds: [] });
  res.status(201).json({ message: 'Purchase order placed', orders });
});

router.get('/orders', requireAuth, async (req, res) => {
  const data = await getData();
  const { limit, page, skip } = pageParams(req, 80);
  const { buyerIds, sellerDistributorIds } = getProfileIdsForUser(data, req.user.id);
  let orders = req.user.role === 'SUPER_ADMIN'
    ? data.orders
    : data.orders.filter((order) => buyerIds.includes(String(order.retailerId)) || sellerDistributorIds.includes(String(order.distributorId)));
  orders = orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  res.json({
    items: orders.slice(skip, skip + limit).map((order) => enrichOrder(order, data, req.user)),
    total: orders.length,
    page,
    limit,
    hasMore: skip + limit < orders.length
  });
});

router.patch('/orders/:id/status', requireAuth, permit('DISTRIBUTOR', 'SUPER_ADMIN', 'BRANCH_MANAGER'), async (req, res) => {
  const data = await getData();
  if (!orderStatuses.includes(req.body.status)) return res.status(422).json({ message: 'Invalid order status' });
  const currentOrder = data.orders.find((item) => String(item.id || item._id) === String(req.params.id));
  if (!currentOrder) return res.status(404).json({ message: 'Order not found' });
  if (!canUpdateOrderStatus(data, req.user, currentOrder)) {
    return res.status(403).json({ message: 'Only the wholesaler receiving this order can update its status' });
  }
  if (req.body.status === 'Cancelled' && currentOrder.status !== 'Cancelled') {
    for (const item of currentOrder.items || []) await adjustStock(item.productId, Number(item.quantity || 0), data);
  }
  if (currentOrder.status === 'Cancelled' && req.body.status !== 'Cancelled') {
    for (const item of currentOrder.items || []) await adjustStock(item.productId, -Number(item.quantity || 0), data);
  }
  const order = dbState.connected ? asPlain(await models.Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })) : memoryStore.update('orders', req.params.id, { status: req.body.status });
  const buyerUserId = userIdForBuyerRef(data, order.retailerId);
  const seller = data.distributors.find((item) => String(item.id || item._id) === String(order.distributorId));
  if (buyerUserId) {
    await createNotification({
      userId: buyerUserId,
      type: 'order',
      title: 'Order status updated',
      message: `${seller?.name || 'The seller wholesaler'} changed order #${String(order.id || order._id).slice(-8)} to ${order.status}.`,
      orderId: order.id || order._id,
      distributorId: order.distributorId,
      status: order.status
    });
  }
  res.json(enrichOrder(order, data, req.user));
});

router.post('/orders/:id/reorder', requireAuth, async (req, res) => {
  const data = await getData();
  const order = data.orders.find((item) => String(item.id || item._id) === String(req.params.id));
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const { buyerIds } = getProfileIdsForUser(data, req.user.id);
  const wasBuyer = buyerIds.includes(String(order.retailerId)) || req.user.role === 'SUPER_ADMIN';
  if (!wasBuyer) return res.status(403).json({ message: 'Only the buyer can reorder this purchase order' });
  let cart = findCurrentCart(data, req.user.id);
  if (!cart) {
    cart = dbState.connected
      ? asPlain(await models.Cart.create({ retailerId: req.user.id, items: [], appliedSchemeIds: [] }))
      : memoryStore.create('carts', { retailerId: req.user.id, items: [], appliedSchemeIds: [] });
  }
  const added = [];
  const skipped = [];
  for (const item of order.items || []) {
    const product = data.products.find((entry) => String(entry.id || entry._id) === String(item.productId));
    const available = Number(product?.stock || 0);
    const existing = cart.items.find((entry) => String(entry.productId) === String(item.productId));
    const alreadyInCart = Number(existing?.quantity || 0);
    const canAdd = Math.max(0, available - alreadyInCart);
    const quantity = Math.min(Number(item.quantity || 0), canAdd);
    if (!product || quantity <= 0) {
      skipped.push({ productId: item.productId, name: product?.name || item.productId, requested: Number(item.quantity || 0), available });
      continue;
    }
    if (existing) existing.quantity = alreadyInCart + quantity;
    else cart.items.push({ productId: item.productId, quantity });
    added.push({ productId: item.productId, name: product.name, quantity, availableAfterCart: available - alreadyInCart - quantity });
  }
  if (added.length === 0) {
    return res.status(409).json({ message: 'No items from this order are currently available to reorder', skipped });
  }
  dbState.connected ? await models.Cart.findByIdAndUpdate(cart._id, { items: cart.items }) : memoryStore.update('carts', cart.id, { items: cart.items });
  res.json({ message: 'Available items copied to cart', cart, added, skipped });
});

router.get('/orders/:id/pdf', requireAuth, async (req, res) => {
  const data = await getData();
  const order = data.orders.find((item) => String(item.id || item._id) === String(req.params.id));
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const { buyerIds, sellerDistributorIds } = getProfileIdsForUser(data, req.user.id);
  const canSeeOrder = buyerIds.includes(String(order.retailerId)) || sellerDistributorIds.includes(String(order.distributorId)) || req.user.role === 'SUPER_ADMIN';
  if (!canSeeOrder) return res.status(403).json({ message: 'You cannot download this purchase order' });
  makePurchaseOrderPdf(order, data.products, res);
});

router.get('/notifications', requireAuth, async (req, res) => {
  const data = await getData();
  const { limit, page, skip } = pageParams(req, 80);
  const { buyerIds } = getProfileIdsForUser(data, req.user.id);
  const notifications = data.notifications
    .filter((item) => String(item.userId) === String(req.user.id) || req.user.role === 'SUPER_ADMIN')
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const enriched = notifications.map((notification) => {
    const order = notification.orderId
      ? data.orders.find((item) => String(item.id || item._id) === String(notification.orderId))
      : null;
    const feedback = order
      ? data.feedback.find((item) => String(item.orderId) === String(order.id || order._id) && buyerIds.includes(String(item.retailerId)))
      : null;
    const canRate = Boolean(order && order.status === 'Delivered' && buyerIds.includes(String(order.retailerId)) && !feedback);
    return {
      ...notification,
      canRate,
      rating: feedback?.rating || null,
      ratedMessage: feedback?.message || ''
    };
  });
  res.json({
    items: enriched.slice(skip, skip + limit),
    total: enriched.length,
    page,
    limit,
    hasMore: skip + limit < enriched.length
  });
});

router.patch('/notifications/read', requireAuth, async (req, res) => {
  const data = await getData();
  const notifications = data.notifications.filter((item) => String(item.userId) === String(req.user.id) || req.user.role === 'SUPER_ADMIN');
  if (dbState.connected) {
    await models.Notification.updateMany({ _id: { $in: notifications.map((item) => item._id).filter(Boolean) } }, { read: true, readAt: new Date().toISOString() });
  } else {
    notifications.forEach((item) => {
      item.read = true;
      item.readAt = new Date().toISOString();
    });
    memoryStore.persist();
  }
  res.json({ updated: notifications.length });
});

router.post('/feedback', requireAuth, [
  body('orderId').notEmpty(),
  body('rating').isInt({ min: 1, max: 5 })
], validate, async (req, res) => {
  const data = await getData();
  const order = data.orders.find((item) => String(item.id || item._id) === String(req.body.orderId));
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.status !== 'Delivered') return res.status(409).json({ message: 'You can rate only after the order is delivered' });
  const { buyerIds } = getProfileIdsForUser(data, req.user.id);
  if (!buyerIds.includes(String(order.retailerId))) return res.status(403).json({ message: 'Only the buyer can rate this order' });
  const rating = Number(req.body.rating);
  const message = rating >= 4 ? 'Thank you for rating this seller.' : 'We will try to make it better next time.';
  const payload = {
    retailerId: order.retailerId,
    distributorId: order.distributorId,
    orderId: order.id || order._id,
    rating,
    message
  };
  const existing = data.feedback.find((item) => String(item.orderId) === String(payload.orderId) && String(item.retailerId) === String(payload.retailerId));
  if (existing) return res.status(409).json({ message: 'This order has already been rated' });
  const feedback = dbState.connected
    ? asPlain(await models.Feedback.create(payload))
    : memoryStore.create('feedback', payload);
  res.status(201).json({ ...feedback, message });
});

router.get('/reports/summary', requireAuth, async (req, res) => {
  const data = await getData();
  const { buyerIds, sellerDistributorIds } = getProfileIdsForUser(data, req.user.id);
  const scopedOrders = req.user.role === 'SUPER_ADMIN'
    ? data.orders
    : sellerDistributorIds.length > 0
      ? data.orders.filter((order) => sellerDistributorIds.includes(String(order.distributorId)))
      : data.orders.filter((order) => buyerIds.includes(String(order.retailerId)));
  const deliveredOrders = scopedOrders.filter((order) => order.status === 'Delivered');
  const totalSales = deliveredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const pendingOrders = scopedOrders.filter((order) => ['Placed', 'Processing', 'Packed', 'Dispatched'].includes(order.status)).length;
  const cancelledOrders = scopedOrders.filter((order) => order.status === 'Cancelled').length;
  const visibleProducts = req.user.role === 'SUPER_ADMIN'
    ? data.products
    : sellerDistributorIds.length > 0
      ? data.products.filter((product) => sellerDistributorIds.includes(String(product.distributorId)))
      : data.products;
  const productSales = {};
  for (const order of deliveredOrders) {
    for (const item of order.items || []) {
      productSales[item.productId] = (productSales[item.productId] || 0) + Number(item.price || 0) * Number(item.quantity || 0);
    }
  }
  const topProducts = Object.entries(productSales)
    .map(([productId, sales]) => ({ name: data.products.find((product) => String(product.id || product._id) === String(productId))?.name || productId, sales }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthly = monthNames.map((month) => ({ month, sales: 0 }));
  for (const order of deliveredOrders) {
    const date = new Date(order.createdAt || Date.now());
    if (!Number.isNaN(date.getTime())) monthly[date.getMonth()].sales += Number(order.total || 0);
  }
  res.json({
    totalSales,
    pendingOrders,
    bouncedOrders: cancelledOrders,
    cancelledOrders,
    users: data.users.length,
    products: visibleProducts.length,
    distributors: data.distributors.length,
    topProducts,
    monthly
  });
});

router.get('/admin/users', requireAuth, permit('SUPER_ADMIN'), async (_req, res) => {
  const data = await getData();
  res.json(data.users.map(({ passwordHash, ...user }) => user));
});

export default router;
