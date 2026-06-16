import { connectDatabase, dbState } from './store.js';
import { models } from './models.js';
import { seed } from './data/seedData.js';

await connectDatabase();

if (!dbState.connected) {
  console.log('MONGO_URI is not set. The app will use in-memory seed data at runtime.');
  process.exit(0);
}

await Promise.all(Object.values(models).map((model) => model.deleteMany({})));
await models.User.insertMany(seed.users.map(({ id, ...item }) => item));
await models.Distributor.insertMany(seed.distributors.map(({ id, userId, ...item }) => item));
await models.Company.insertMany(seed.companies.map(({ id, userId, ...item }) => item));
await models.Product.insertMany(seed.products.map(({ id, ...item }) => item));
await models.Scheme.insertMany(seed.schemes.map(({ id, ...item }) => item));
await models.Order.insertMany(seed.orders.map(({ id, ...item }) => item));
await models.Notification.insertMany(seed.notifications.map(({ id, ...item }) => item));
await models.Feedback.insertMany(seed.feedback.map(({ id, ...item }) => item));

console.log('MediTrade Hub MongoDB seed complete.');
process.exit(0);
