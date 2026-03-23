// middlewares/requestLogger.js
// Lightweight request logger for development.
// In production, replace with morgan + a structured logging library (e.g. winston, pino).

const env = require('../config/env');

const requestLogger = (req, res, next) => {
    if (env.isProd) return next(); // skip in production

    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const color =
            res.statusCode >= 500
                ? '\x1b[31m' // red
                : res.statusCode >= 400
                    ? '\x1b[33m' // yellow
                    : '\x1b[32m'; // green

        console.log(
            `${color}[${res.statusCode}]\x1b[0m ${req.method} ${req.originalUrl} — ${duration}ms`
        );
    });

    next();
};

module.exports = requestLogger;