// middlewares/errorHandler.js
// Global error handler — must be registered LAST in Express middleware chain.

const env = require('../config/env');

/**
 * Centralized error handler.
 * Catches any error passed via next(err) from routes/controllers.
 */
const errorHandler = (err, req, res, next) => {
    // Default to 500 if no status was set
    const statusCode = err.statusCode || err.status || 500;
    const isOperational = err.isOperational || false;

    // Log full error in development; keep it clean in production
    if (env.isDev) {
        console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
    } else if (!isOperational) {
        // Log unexpected errors in production (send to monitoring later)
        console.error(`[FATAL] Unhandled error:`, err.message);
    }

    res.status(statusCode).json({
        success: false,
        message: isOperational ? err.message : 'An unexpected error occurred.',
        ...(env.isDev && { stack: err.stack }),
    });
};

/**
 * Creates a structured operational error (safe to expose to clients).
 * Usage: next(createError(404, 'Property not found'))
 */
const createError = (statusCode, message) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    err.isOperational = true;
    return err;
};

module.exports = { errorHandler, createError };