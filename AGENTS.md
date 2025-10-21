# Repository Guidelines

## Project Structure & Module Organization

- Root entrypoint: `server.js` (Express app)
- Source directories:
  - `routes/` – API route definitions (`auth.js`, `products.js`, `bundles.js`, `ml.js`)
  - `controllers/` – Request handlers and business logic per domain
  - `models/` – Mongoose schemas (`User.js`, `Product.js`, `Bundle.js`, `Review.js`)
  - `services/` – ML service (`comfortRatingService.js`) using TensorFlow.js
  - `middleware/` – Auth and error middleware
  - `config/` – Database connection (`db.js`)
  - `utils/` – Helper utilities (compatibility checks, seeding helpers)
  - `scripts/` – CLI scripts for ML init/training/score updates
  - `ml_models/` – Model artifacts directory (`comfort_model/`)
  - `static/` – Public static asset(s)

## Build, Test, and Development Commands

```bash
# Start server (production mode)
npm start

# Start server with live reload (development)
npm run dev

# Initialize ML system (DB connect, create dirs, optional seed, train, update scores)
npm run ml

# Train ML model against current DB data
npm run train

# Recalculate and persist comfort scores for all products
npm run scores
```

## Coding Style & Naming Conventions

- Indentation: 2 spaces (consistent across JS files)
- File naming: camelCase for JS files (e.g., `authController.js`, `comfortRatingService.js`). Routes named by resource (e.g., `products.js`).
- Function/variable naming: camelCase; classes/PascalCase for Mongoose models
- Linting/formatting: No explicit config found (no eslint/prettier). Follow existing style and Node ESM (`type: module`).

## Testing Guidelines

- Framework: Not specified; no test directories or tools detected
- Test files: Not present
- Running tests: No script available
- Coverage: Not specified

## Commit & Pull Request Guidelines

- Commit format: No conventional commit tooling found. Use clear, scoped messages (e.g., "feat(products): add grouped products endpoint").
- PR process: Not documented; recommend including description, steps to validate, and risks.
- Branch naming: Not specified; suggest `feature/`, `fix/`, `chore/` prefixes.

---

# Repository Tour

## 🎯 What This Repository Does

ComPORT Backend is a Node.js/Express server that powers a PC shopping experience with ML-driven "comfort" ratings, user auth, product aggregation, and bundle management.

Key responsibilities:
- Serve REST APIs for auth, products, bundles, and ML operations
- Connect to MongoDB via Mongoose and manage domain models
- Train and serve a TensorFlow.js model to compute comfort ratings

---

## 🏗️ Architecture Overview

### System Context
```
[Client (Web/App)] → [Express API (server.js)] → [MongoDB]
                                   ↓
                          [TensorFlow.js ML Service]
```

### Key Components
- Express App (`server.js`) – Bootstraps middleware, routes, error handling; connects DB and initializes ML service.
- Mongoose Models (`models/*.js`) – Domain entities: Product, Bundle, User, Review with indexes and helpers.
- Comfort Rating Service (`services/comfortRatingService.js`) – TensorFlow.js sequential model; feature extraction, scoring, training, persistence of weights under `ml_models/comfort_model`.
- Controllers (`controllers/*.js`) – Encapsulate API logic per domain (auth, products, bundles, ml).
- Routes (`routes/*.js`) – Route-to-controller mapping and protection via `middleware/authMiddleware.js`.
- Middleware – JWT auth (`authMiddleware.js`) and unified error handling (`errorHandler.js`).
- Config – Mongo connection (`config/db.js`) using `MONGO_URI` and dbName `main`.

### Data Flow
1. Client sends HTTP request to an API route under `/api/*` or `/static`.
2. Route dispatches to controller; auth middleware guards protected endpoints.
3. Controller queries/updates MongoDB via Mongoose models.
4. For ML endpoints or comfort calculations, controllers call `comfortRatingService` which loads/trains the TFJS model and computes scores.
5. Response serialized as JSON; errors handled by `errorHandler`.

---

## 📁 Project Structure [Partial Directory Tree]

```
ComPORT_Server/
├── server.js                # Express app entrypoint
├── package.json             # Scripts, deps (type: module)
├── .env                     # Env vars (MONGO_URI, JWT_SECRET, etc.)
├── config/
│   └── db.js                # MongoDB connection
├── routes/                  # HTTP routes
│   ├── auth.js
│   ├── products.js
│   ├── bundles.js
│   └── ml.js
├── controllers/             # Route handlers
│   ├── authController.js
│   ├── productController.js
│   ├── bundleController.js
│   └── mlController.js
├── models/                  # Mongoose schemas
│   ├── User.js
│   ├── Product.js
│   ├── Bundle.js
│   └── Review.js
├── services/
│   └── comfortRatingService.js  # TFJS model and scoring
├── middleware/
│   ├── authMiddleware.js
│   └── errorHandler.js
├── utils/
│   ├── compatibilityUtils.js    # PC parts compatibility checks
│   └── seedReviewData.js        # (helper used by scripts)
├── scripts/
│   ├── initializeMLSystem.js
│   ├── trainModel.js
│   └── updateComfortScores.js
├── ml_models/
│   └── comfort_model/           # Saved TFJS model files
└── static/
    └── placeholder.jpg
```

### Key Files to Know

| File | Purpose | When You'd Touch It |
|------|---------|---------------------|
| `server.js` | App entry, route registration, DB connect, ML init | Add middleware/routes or change boot behavior |
| `config/db.js` | MongoDB connection using `MONGO_URI` | Change DB name/connection options |
| `routes/*.js` | Route definitions and protection | Add new endpoints or reorganize paths |
| `controllers/*.js` | Business logic per domain | Modify request handling and responses |
| `models/*.js` | Mongoose schemas and indexes | Update data model or indexes |
| `services/comfortRatingService.js` | TFJS model, feature extraction, training | Adjust ML architecture or scoring |
| `utils/compatibilityUtils.js` | System compatibility checks | Extend/adjust PC part rules |
| `scripts/*.js` | Operational tasks (init/train/update) | Run ML workflows or bootstrap data |
| `.env` | Environment variables | Configure secrets and service URLs |

---

## 🔧 Technology Stack

### Core Technologies
- Language: JavaScript (ES Modules)
- Framework: Express.js (4.18.x)
- Database: MongoDB via Mongoose (8.x)
- ML: TensorFlow.js Node (`@tensorflow/tfjs-node` 4.15.x)

### Key Libraries
- `jsonwebtoken` – JWT auth for protected routes
- `bcryptjs` – Password hashing for `User`
- `morgan`, `cors`, `dotenv` – Logging, CORS, env management

### Development Tools
- `nodemon` – Dev server reloading

---

## 🌐 External Dependencies

- MongoDB – Required. Configured with `MONGO_URI` (DB name `main`).

### Environment Variables

```bash
# Required
MONGO_URI=           # e.g., mongodb+srv://user:pass@cluster/
JWT_SECRET=          # JWT signing secret
PORT=5000            # Optional, defaults to 5000
NODE_ENV=development # Optional
```

---

## 🔄 Common Workflows

### Start Local Development
1. Ensure MongoDB is accessible via `MONGO_URI` in `.env`.
2. Run `npm run dev`.
3. Visit `GET /` for health and `/api/ml/status` for ML status.

### Initialize/Train ML and Update Scores
1. `npm run ml` to connect DB, prepare directories, optionally seed, initialize model, train, and update scores.
2. Later updates: `npm run train` and `npm run scores`.

### Bundle Creation with ML Comfort
- Path: `POST /api/bundles` with JWT auth.
- Code path: `routes/bundles.js` → `controllers/bundleController.createBundle` → `utils/compatibilityUtils.checkCompatibility` + `services/comfortRatingService.calculateBundleComfortRating` → `models/Bundle`.

---

## 📈 Performance & Scale

- TensorFlow.js model uses small dense layers; persisted under `ml_models/comfort_model` to avoid retraining every boot.
- Controllers use Mongoose queries with indexes on `Product` for search and filtering.

---

## 🚨 Things to Be Careful About

### Security Considerations
- JWT: `Authorization: Bearer <token>` required for protected routes. Ensure `JWT_SECRET` is strong and rotated as needed.
- Data validation: Controllers rely on Mongoose validation; consider adding request validation for stricter input checks.
- CORS: Currently allows `*`. Tighten in production.

### Data Handling
- Scripts may create/update many records; verify environment before running on production datasets.


*Updated at: 2025-10-21*
