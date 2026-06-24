# 🛒 Cart to Gate

Cart to Gate is a full-stack e-commerce web application developed using HTML, CSS, JavaScript, Node.js, Express.js, and MongoDB.

The application allows users to browse products, manage their cart, place orders, and provides admin functionalities for product and order management.

The project was built as part of a practical learning experience in Full-Stack AI-Assisted Development.

---

## 🚀 Features

### User Features

- User Registration
- User Login & Authentication
- Browse Products
- Search Products
- View Product Details
- Add Products to Cart
- Update Cart Quantity
- Remove Products from Cart
- Checkout & Place Orders
- View Order History

### Admin Features

- Admin Login
- Add Products
- Update Products
- Delete Products
- Manage Orders
- Update Order Status
- View All Orders

### Inventory Features

- Automatic stock reduction after successful orders
- Out-of-stock protection

---

## 🛠️ Tech Stack

### Frontend

- HTML5
- CSS3
- JavaScript

### Backend

- Node.js
- Express.js

### Database

- MongoDB Atlas
- Mongoose

### Deployment

- Railway

### Authentication

- JSON Web Tokens (JWT)
- bcryptjs

---

## 📂 Project Structure

```
Cart-To-Gate/

├── frontend/
│   ├── index.html
│   ├── about.html
│   ├── products.html
│   ├── cart.html
│   ├── checkout.html
│   ├── login.html
│   ├── register.html
│   ├── admin-login.html
│   ├── admin-dashboard.html
│   ├── manage-product.html
│   ├── js/
│   ├── css/
│   └── img/

├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── package.json
│   └── server.js

├── Dockerfile
└── README.md
```

---

## ⚙️ Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-username/cart-to-gate.git

cd cart-to-gate
```

### 2. Install Backend Dependencies

```bash
cd backend

npm install
```

### 3. Configure Environment Variables

Create a `.env` file inside the backend folder.

Example:

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_secret_key
```

### 4. Run Backend

```bash
npm start
```

### 5. Open Frontend

Open `index.html` or use Live Server.

---

## 🌐 Deployment

The application is deployed using Railway.

Deployment setup includes:

- Dockerfile configuration
- Environment variable management
- MongoDB Atlas integration
- Healthcheck endpoint

---

## 🤖 Development Approach

This project was developed using a Full-Stack AI-Assisted Development workflow.

AI was utilized as a development companion for:

- Debugging
- Deployment troubleshooting
- Code optimization
- Problem solving
- Development acceleration

---

## 📚 Key Learnings

This project helped strengthen skills in:

- Frontend Development
- Backend Development
- REST APIs
- Authentication
- Database Integration
- Deployment
- Debugging Production Issues
- Full-Stack Application Architecture

---

## 👨‍💻 Author

Syed Muhammad Mehdi

Student Developer | Full-Stack AI-Assisted Development
