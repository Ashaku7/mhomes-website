// routes/healthRoutes.js
const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// GET /health
router.get('/', healthController.getHealth);

module.exports = router;
