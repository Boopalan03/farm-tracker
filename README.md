# 🌾 FarmTracker - Livestock & Crop Farm Management System

A comprehensive, full-stack farm management and financial tracking web application built with the **MERN** stack (MongoDB, Express, React, Node.js) and **Tailwind CSS**. Designed for farmers to track livestock, trees, crops, daily operations, expenses, revenue, and feed savings in one unified dashboard.

---

## 🚀 Key Features

### 📊 1. Financial Performance & Analytics Dashboard
- **Revenue, Expenses & Net Profit Tracking**: Real-time financial calculations and breakdown by category.
- **Dynamic Period Filtering**:
  - **Month-wise**: Step through months with quick navigation arrows.
  - **Year-wise**: Instant annual summaries for multi-year comparison.
  - **Custom Date Range**: Specific start/end date filtering.
  - **All-Time**: Cumulative lifetime farm overview.
- **Live Weather Widget**: Real-time temperature (°C) and conditions based on farm coordinates.
- **Automated PDF Reports**: Instant client-side download or automated monthly email dispatch.

### 🌱 2. Inventory (Livestock, Crops & Trees)
- **Livestock Tracking**: Track Cattle, Cows, Goats, Hens, etc., with lifecycle status (Milk Producing, Pregnant, Calves, Chicks, etc.).
- **Crops & Trees Monitoring**: Multi-stage tracking from Saplings, Vegetative, Flowering, to Harvest Ready & Yield Producing.
- **Custom Status Categories**: Flexible custom tags for any farm asset.

### 🚜 3. Own Crop Usage & Fodder Feeding
- **Internal Farm Feeding**: Log farm-grown crops (Napier Grass, Corn, Maize, Straw, Silage) fed to cows and livestock.
- **Cost Savings Calculation**: Track estimated money saved by feeding farm-grown fodder versus purchasing commercial feed.
- **Automated Inventory Deduction**: Optional auto-decrement of harvested crop counts when fed.

### 💰 4. Sales & Expense Tracking
- **Revenue Operations**: Categorize sales (Milk, Livestock, Eggs, Crops).
- **Expense Control**: Categorize expenditures (Feed, Veterinary, Pesticides, Operations).
- **Feed Savings Guidance**: Tips on utilizing own-crop fodder to minimize commercial feed costs.

### 🛠️ 5. Farm Maintenance & Labour
- Dedicated tracking for machinery repair, equipment servicing, infrastructure, worker wages, and farm labour.

### 🔒 6. Authentication & Security
- Secure JWT-based authentication with bcrypt password hashing.
- Profile management, location geo-detection, and password reset flows.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, jsPDF, AutoTable
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs
- **Emailing**: Nodemailer with automated monthly schedulers (node-cron)

---

## 📦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/) (running locally or MongoDB Atlas URI)

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/farm-tracker.git
   cd farm-tracker
   ```

2. **Setup Backend (`/server`)**:
   ```bash
   cd server
   npm install
   ```
   Create a `.env` file in the `server` directory (reference `.env.example`):
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/livestock-tracker
   JWT_SECRET=your_jwt_secret_key_here
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_app_password
   ```
   Start the backend server:
   ```bash
   node server.js
   # or with nodemon:
   npm run dev
   ```

3. **Setup Frontend (`/client`)**:
   ```bash
   cd ../client
   npm install
   npm run dev
   ```

4. **Access the application**:
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📄 License
This project is licensed under the MIT License.
