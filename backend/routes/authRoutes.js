// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// All routes are public (no JWT auth needed for now)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authController.getMe);

// Simple admin verification - auto-approve if email is provided
router.get('/verify-admin', async (req, res) => {
  try {
    const email = req.headers['x-user-email'];

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Auto-approve any authenticated user
    return res.status(200).json({
      name: email.split('@')[0],
      email: email
    });
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({ error: 'Failed to verify admin' });
  }
});

module.exports = router;