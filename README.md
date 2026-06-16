# MediTrade Hub

MediTrade Hub is an original full-stack B2B pharmaceutical ordering app for retailers, distributors, stockists, pharma companies, sales persons, branch managers, and super admins.

## Stack

- Frontend: React, Vite, Tailwind CSS, Recharts
- Backend: Node.js, Express.js, JWT, Multer, xlsx, csv-parser, PDFKit
- Database: MongoDB with Mongoose
- Demo mode: in-memory seeded data when `MONGO_URI` is not set

## Quick Start

```bash
npm install
npm run install:all
npm run dev
```

Frontend: http://localhost:5174  
Backend API: http://localhost:5001/api

## Demo Logins

Use password `Password@123` for every seeded user.

- Super Admin: `admin@meditradehub.test`
- Retailer: `retailer@meditradehub.test`
- Distributor: `distributor@meditradehub.test`
- Sales Person: `sales@meditradehub.test`
- Company Admin: `company@meditradehub.test`
- Branch Manager: `branch@meditradehub.test`

## Environment

Create `server/.env` for MongoDB deployments:

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/meditrade-hub
JWT_SECRET=replace-with-a-long-secret
CLIENT_ORIGIN=http://localhost:5174
```

## Notes

The branding, UI, palette, data, and names are original. The app implements a comparable B2B pharma workflow without copying proprietary assets or data.
