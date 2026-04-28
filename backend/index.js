require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Geography-Aware Referral System API is running.' });
});

// Referral logic route
const { getReferrals } = require('./controllers/referralController');
app.post('/api/referrals', getReferrals);

// Start the server (only if not running in a serverless environment like Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
