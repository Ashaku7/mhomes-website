// controllers/authController.js
const authService = require('../services/authService');

// POST /api/auth/register
const register = async (req, res, next) => {
    try {
        const { name, email, phone, password } = req.body;
        const result = await authService.register({ name, email, phone, password });
        res.status(201).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login({ email, password });
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
    try {
        // No user data available without authentication
        res.status(401).json({ success: false, message: 'Not authenticated' });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, getMe };