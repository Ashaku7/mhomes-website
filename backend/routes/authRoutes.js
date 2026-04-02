// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// All routes are public (no JWT auth needed for now)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authController.getMe);

module.exports = router;