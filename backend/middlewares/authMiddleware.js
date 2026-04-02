// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const { createError } = require('./errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Verify JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
};

// Middleware to check if user is authenticated and is admin
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authorization header missing or invalid format. Use: Bearer <token>',
            });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token',
            });
        }

        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required',
            });
        }

        req.user = decoded;
        next();
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Authentication error',
            error: err.message,
        });
    }
};

module.exports = { authMiddleware, verifyToken, JWT_SECRET };
