const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes will be imported here
const authRoutes = require('./routes/auth');
const livestockRoutes = require('./routes/livestock');
const expenseRoutes = require('./routes/expense');
const saleRoutes = require('./routes/sale');
const dashboardRoutes = require('./routes/dashboard');
const maintenanceRoutes = require('./routes/maintenance');
const cropUsageRoutes = require('./routes/cropUsage');

app.use('/api/auth', authRoutes);
app.use('/api/livestock', livestockRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/crop-usage', cropUsageRoutes);

// Test Route & Health Check
app.get('/', (req, res) => {
  res.send('Livestock Tracker API is running...');
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    serverPort: PORT,
    mongoConnection: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    database: mongoose.connection.name || 'livestock-tracker',
    host: mongoose.connection.host || 'localhost'
  });
});

// MongoDB Connection
const { startMonthlyReportScheduler } = require('./utils/scheduler');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/livestock-tracker';

// Connection event listeners
mongoose.connection.on('connected', () => {
  console.log(`[MONGODB] Connection Event: Database connected at ${mongoose.connection.host || 'localhost'}:${mongoose.connection.port || 27017}/${mongoose.connection.name}`);
});

mongoose.connection.on('error', (err) => {
  console.error(`[MONGODB] Connection Error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MONGODB] Connection Warning: Database disconnected');
});

console.log(`[MONGODB] Connecting to: ${MONGODB_URI} ...`);

mongoose.connect(MONGODB_URI)
  .then((conn) => {
    console.log('----------------------------------------------------');
    console.log(` MongoDB Connected Successfully!`);
    console.log(` Database Name : ${conn.connection.name}`);
    console.log(` Host          : ${conn.connection.host}:${conn.connection.port || 27017}`);
    console.log(` Connection URI: ${MONGODB_URI}`);
    console.log(` Ready State   : ${conn.connection.readyState === 1 ? 'Connected (1)' : conn.connection.readyState}`);
    console.log('----------------------------------------------------');
    
    startMonthlyReportScheduler();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('====================================================');
    console.error(' Failed to connect to MongoDB!');
    console.error(` Error Details: ${err.message}`);
    console.error(` Target URI   : ${MONGODB_URI}`);
    console.error(' Please ensure MongoDB service is running on your machine.');
    console.error('====================================================');
  });
