# Expense Tracker – NoSQL Final Project

Web application for tracking income and expenses with categories, budgets, and analytics.  
Backend: Node.js + Express. Database: MongoDB. Frontend: HTML/CSS/JS.

---

## Project Overview

The system allows users to:
- Register and login (JWT)
- Manage categories
- Add, edit, delete transactions
- Set monthly budgets
- View financial reports

---

## Tech Stack

- Node.js, Express  
- MongoDB, Mongoose  
- JWT, bcrypt  
- HTML/CSS/JavaScript (no React)

---

## Setup

### Install
```bash
npm install
```

### Environment (.env)

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/expense_tracker
JWT_SECRET=secret_key
```

### Run

```bash
npm run dev
```

Open:
[http://localhost:3000/login.html](http://localhost:3000/login.html)

---

## Database Collections

### users

* email, passwordHash

### categories

* userId (ref), name
* Unique index: userId + name

### transactions

* userId, categoryId (ref)
* type, amount, date, note
* Indexes: userId+date, userId+categoryId+date

### budgets (embedded)

* userId, month
* limits: [{ categoryId, limit }]

---

## API (Main Endpoints)

### Auth

* POST /api/auth/register
* POST /api/auth/login

### Categories

* POST /api/categories
* GET /api/categories
* PATCH /api/categories/:id
* DELETE /api/categories/:id

### Transactions

* POST /api/transactions
* GET /api/transactions
* PATCH /api/transactions/:id
* DELETE /api/transactions/:id
* PATCH /api/transactions/:id/inc ($inc)
* DELETE /api/transactions/purge/before/:date

### Budgets

* GET /api/budgets/:month
* POST /api/budgets/:month/limits ($push)
* PATCH /api/budgets/:month/limits (positional)
* DELETE /api/budgets/:month/limits/:categoryId ($pull)

### Reports (Aggregation)

* GET /api/reports/by-category
* GET /api/reports/budget-vs-spent

---

## Frontend Pages

* login.html
* dashboard.html
* categories.html
* transactions.html
* budgets.html

---

## Indexing & Optimization

* { userId, date }
* { userId, categoryId, date }
* { userId, name } (unique)
* { userId, month } (unique)

---

## Team Contribution

Student 1:

* Backend, MongoDB, Aggregation, API

Student 2:

* Frontend, UI, Integration, Testing

---

## Defense Scenario

1. Login
2. Create categories
3. Add transactions
4. Set budgets
5. Show reports
6. Demonstrate advanced updates and delete

