# 🚚 Food Truck Platform

A mobile-first platform that helps customers discover food trucks in real time, view their menus, and place pickup orders — while giving truck owners visibility and admins control over marketplace quality.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Problem & Solution](#problem--solution)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [User Roles](#user-roles)
- [Project Structure](#project-structure)
- [Backend Modules](#backend-modules)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [Team](#team)

---

## 🎯 Overview

**Food Truck Platform** is an MVP that connects three types of users:

- **Customers** who discover food trucks and place pickup orders
- **Truck Owners** who manage their trucks, menus, and incoming orders
- **Admins** who review and approve new truck registrations

The platform delivers a complete full-stack experience: a React Native mobile app powered by an Express/TypeScript backend and a MySQL database.

---

## 💡 Problem & Solution

### Problem
Food trucks struggle with **visibility**. They move frequently, and customers often can't find them — even when they're nearby.

### Solution
A mobile app with:
- 🗺️ Live map showing nearby food trucks
- 🍔 Menu browsing for each truck
- 🛒 In-app ordering and payment
- 🔔 Real-time order status updates
- ✅ Admin-controlled truck onboarding

---

## 🛠️ Tech Stack

### Frontend (Mobile App)
- **React Native** + **Expo** — cross-platform iOS/Android
- **TypeScript** — type safety
- **React Navigation** — screen navigation
- **Zustand** — global state management
- **React Query** — server state and caching
- **Axios** — HTTP client
- **NativeWind / Tailwind** — styling

### Backend (API Server)
- **Node.js** + **Express** — server framework
- **TypeScript** — type safety
- **Knex.js** — SQL query builder & migrations
- **MySQL** — relational database
- **JWT** — authentication
- **bcryptjs** — password hashing
- **Zod** — runtime validation
- **Multer** + **Cloudinary** — file uploads
- **Resend** — transactional emails
- **Pino** — structured logging

### Security
- **Helmet** — HTTP security headers
- **CORS** — origin control
- **express-rate-limit** — rate limiting (200 req / 15 min)
- **JWT + RBAC** — authentication & role-based authorization

### External Services
- **Google Maps APIs** — map rendering and location services

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────┐
│   Mobile App (React Native + Expo)     │
│   Screens → State → API Client         │
└─────────────────┬──────────────────────┘
                  │  HTTPS + JWT
                  ▼
┌────────────────────────────────────────┐
│   Backend API (Express + TypeScript)   │
│                                        │
│   Middleware → Routes → Controllers    │
│        ↓                               │
│   Validators → Services → Repos        │
└─────────────────┬──────────────────────┘
                  │  Knex Queries
                  ▼
┌────────────────────────────────────────┐
│           MySQL Database               │
└────────────────────────────────────────┘
```

### Request Flow
1. Mobile app sends request to `/api/v1/*`
2. Global middleware runs (Helmet, CORS, Rate Limit, Logging)
3. Authentication middleware validates JWT
4. Authorization middleware checks user role (RBAC)
5. Validator checks request body with Zod
6. Controller passes to Service
7. Service applies business logic
8. Repository executes Knex queries
9. Standardized JSON response returned

---

## 👥 User Roles

| Role | Capabilities |
|------|-------------|
| **Customer** | Browse trucks, view menus, place orders, pay, track status, leave reviews |
| **Truck Owner** | Register truck, manage menu, update location/status, handle incoming orders |
| **Admin** | Review pending trucks, approve/reject applications, monitor platform stats |

---

## 📁 Project Structure

```
foodtruck-platform/
├── backend/                    # API server
│   ├── src/
│   │   ├── app.ts              # Express setup
│   │   ├── server.ts           # Server entry point
│   │   ├── routes.ts           # API routes composition
│   │   ├── config/             # Environment configuration
│   │   ├── core/               # Shared infrastructure
│   │   │   ├── db/             # Database connection
│   │   │   ├── errors/         # Error handling
│   │   │   ├── http/           # HTTP middleware & helpers
│   │   │   ├── email/          # Email service
│   │   │   └── logger/         # Logging
│   │   ├── database/           # Migrations & seeds
│   │   └── modules/            # Feature modules
│   │       ├── auth/           # Authentication
│   │       ├── trucks/         # Truck management
│   │       ├── menus/          # Menu items
│   │       ├── orders/         # Order lifecycle
│   │       ├── uploads/        # File uploads
│   │       └── health/         # Health check
│   ├── knexfile.ts
│   └── package.json
│
├── frontend/                   # Mobile application
│   ├── src/
│   │   ├── api/                # HTTP client & query setup
│   │   ├── features/           # Feature modules
│   │   │   ├── auth/
│   │   │   ├── trucks/
│   │   │   ├── menus/
│   │   │   ├── orders/
│   │   │   ├── admin/
│   │   │   └── checkout/
│   │   ├── screens/            # Route-level screens
│   │   ├── navigation/         # Navigation setup
│   │   ├── store/              # Zustand state
│   │   ├── ui/                 # Reusable components
│   │   ├── theme/              # Design tokens
│   │   └── utils/              # Helpers
│   ├── App.tsx
│   └── package.json
│
└── docs/                       # Project documentation
    ├── Stage 1/                # Idea selection
    ├── stage2/                 # Project charter
    └── stage3/                 # Technical documentation
```

---

## 🧩 Backend Modules

Each module follows a consistent **5-file structure**:

| File | Responsibility |
|------|----------------|
| `*.routes.ts` | Define HTTP endpoints |
| `*.controller.ts` | Handle requests/responses |
| `*.validator.ts` | Zod schemas for input validation |
| `*.service.ts` | Business logic |
| `*.repository.ts` | Database operations |

### Module Overview

| Module | Purpose |
|--------|---------|
| `auth` | Registration, login, JWT, profile, password, email verification |
| `trucks` | Discovery, registration, owner updates, admin review |
| `menus` | Categories and menu item CRUD |
| `orders` | Order creation, payment, status transitions, reviews |
| `uploads` | File upload to Cloudinary |
| `health` | Service health check |

---

## 🗄️ Database Schema

The database contains **14 core tables**:

| Table | Purpose |
|-------|---------|
| `roles` | Platform roles (customer / truck_owner / admin) |
| `users` | User accounts and identity |
| `food_trucks` | Truck profiles |
| `truck_locations` | Current and historical locations |
| `municipal_licenses` | License documents for admin review |
| `categories` | Menu/truck category catalog |
| `menu_items` | Sellable items |
| `orders` | Order headers |
| `order_items` | Order line items |
| `payments` | Payment records |
| `notifications` | User notifications |
| `favorites` | Saved trucks (schema only) |
| `reviews` | Customer ratings and comments |
| `truck_status_history` | Audit trail of status changes |

### Order Status State Machine

```
PENDING ──→ PREPARING ──→ READY ──→ PICKED_UP
   │            │
   └──────→ CANCELLED ←──┘
```

Status transitions are enforced in the service layer — illegal transitions are rejected.

---

## 🌐 API Endpoints

Base path: `/api/v1`

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Create new account |
| POST | `/auth/login` | Public | Sign in |
| GET | `/auth/me` | Auth | Current user profile |
| PATCH | `/auth/me` | Auth | Update profile |
| PATCH | `/auth/me/password` | Auth | Change password |
| POST | `/auth/admin/register` | Admin | Create admin account |

### Trucks
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/trucks/discovery` | Public | List trucks for discovery |
| GET | `/trucks/:id/details` | Public | Truck details |
| POST | `/trucks` | Owner | Register new truck |
| GET | `/trucks/mine` | Owner/Admin | Owned trucks |
| PATCH | `/trucks/:id/profile` | Owner/Admin | Update truck info |
| PATCH | `/trucks/:id/location` | Owner/Admin | Update location |
| PATCH | `/trucks/:id/status` | Owner/Admin | Update operational status |
| GET | `/trucks/admin/pending` | Admin | Pending reviews |
| PATCH | `/trucks/:id/admin/review` | Admin | Approve/reject truck |

### Menus
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/menus/categories` | Owner/Admin | List categories |
| GET | `/menus?truckId=` | Owner/Admin | List menu items |
| POST | `/menus` | Owner/Admin | Create menu item |
| PATCH | `/menus/:id` | Owner/Admin | Update menu item |
| DELETE | `/menus/:id` | Owner/Admin | Remove menu item |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders` | Customer | Place order |
| GET | `/orders/mine` | Customer | Customer's orders |
| POST | `/orders/:id/payment` | Customer | Record payment |
| POST | `/orders/:id/review` | Customer | Submit review |
| GET | `/orders/incoming` | Owner/Admin | Incoming orders |
| PATCH | `/orders/:id/status` | Owner/Admin | Update order status |

### Uploads
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/uploads/single` | Owner/Admin | Upload single file |

---

## 🚀 Getting Started

### Prerequisites
- Node.js `>= 18 < 23`
- MySQL `>= 8.0`
- npm or yarn
- Expo CLI (for mobile development)

### Backend Setup

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000/api/v1`

### Frontend Setup

```bash
cd frontend
npm install

# Start Expo dev server
npx expo start
```

Scan the QR code with the Expo Go app on your phone, or run on a simulator.

### Environment Variables

**Backend** (`.env`):
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=foodtruck
JWT_SECRET=your_secret_key
CORS_ORIGIN=http://localhost:8081
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
RESEND_API_KEY=your_resend_key
```

---

## 🧪 Available Scripts

### Backend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run production build |
| `npm run lint` | Lint code |
| `npm run db:migrate` | Run database migrations |
| `npm run db:rollback` | Rollback last migration |
| `npm run db:seed` | Seed database |

### Frontend
| Command | Description |
|---------|-------------|
| `npx expo start` | Start Expo dev server |
| `npm run lint` | Lint code |

---

## 🔒 Security Features

- ✅ Password hashing with **bcryptjs**
- ✅ JWT-based authentication
- ✅ Role-based access control (RBAC)
- ✅ Input validation with **Zod**
- ✅ HTTP security headers via **Helmet**
- ✅ Configurable CORS origin whitelist
- ✅ Rate limiting (200 requests per 15 minutes)
- ✅ Centralized error handling with safe error messages

---

## 📊 MVP Scope

### ✅ Included
- Role-based authentication
- Truck discovery and details
- Owner onboarding and admin review workflow
- Menu management
- Order creation and status tracking
- MVP payment recording
- Email verification

### ❌ Not in Current Scope
- External payment gateway integration
- Delivery logistics (pickup only)
- Multi-language support
- AI-based recommendations
- Advanced analytics dashboard

---

## 👨‍💻 Team

| Name | Role |
|------|------|
| **Fahad Alshammari** | Team Leader · Backend Developer · Database Design |
| **Fahad Alghamdi** | Frontend Developer |
| **Nabil Alduwisi** | Testing & Business Analysis |
| **Abdullah Alasiri** | Backend Developer |

---

## 📄 Documentation

Detailed project documentation is available in the `/docs` folder:
- **Stage 1** — Idea exploration and selection
- **Stage 2** — Project charter and scope
- **Stage 3** — Technical architecture and system design

---

## 📝 License

This project was developed as a portfolio project for educational purposes.

---

<div align="center">

**Built with ❤️ by Team Truck**

</div>
