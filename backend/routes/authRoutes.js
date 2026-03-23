// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

// Public routes — no token needed
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected route — token required
router.get('/me', protect, authController.getMe);

module.exports = router;