// middlewares/auth.js
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { createError } = require('./errorHandler');

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(createError(401, 'Access denied. No token provided.'));
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return next(createError(401, 'Access denied. Invalid token format.'));
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return next(createError(401, 'Session expired. Please log in again.'));
            }
            return next(createError(401, 'Invalid token. Please log in again.'));
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, name: true, email: true, role: true },
        });

        if (!user) {
            return next(createError(401, 'User no longer exists.'));
        }

        req.user = user;
        next();
    } catch (err) {
        next(err);
    }
};

const restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(createError(401, 'Not authenticated.'));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(
                createError(403, `Access denied. Required role: ${allowedRoles.join(' or ')}.`)
            );
        }
        next();
    };
};

module.exports = { protect, restrictTo };