// server.js — MHomes Booking API entry point

// ─── 1. Load environment variables (must be first) ──────────────────────────
require('dotenv').config();

// ─── 2. Imports ─────────────────────────────────────────────────────────────
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const requestLogger = require('./middlewares/requestLogger');
const { errorHandler } = require('./middlewares/errorHandler');

// ─── Route modules ───────────────────────────────────────────────────────────
const healthRoutes = require('./routes/healthRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const contactRoutes = require('./routes/contactRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Future routes — uncomment as you build them:
// const propertyRoutes  = require('./routes/propertyRoutes');
// const userRoutes      = require('./routes/userRoutes');

// ─── 3. Create Express app ───────────────────────────────────────────────────
const app = express();

// ─── 4. Global Middleware (in exact order: Helmet → CORS → Rate Limiting) ────

// 1. HELMET (security headers)
app.use(helmet());

// 2. CORS (only allow frontend)
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-email'],
    credentials: true
}));

// 3. RATE LIMITING

// Global limit (all routes)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(globalLimiter);

// Contact form limit
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { error: 'Too many messages sent. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Booking limit
const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { error: 'Too many booking attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Admin limit (higher limit for internal operations)
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(express.json({ limit: '10kb' }));       // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(requestLogger);                          // Dev request logging

// ─── 5. Routes (with specific rate limiters) ────────────────────────────────
app.use('/health', healthRoutes);
app.use('/api', bookingRoutes);
app.use('/api/contact', contactLimiter, contactRoutes);
app.use('/api/bookings/online', bookingLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);

// app.use('/api/v1/properties', propertyRoutes);
// app.use('/api/v1/users',      userRoutes);

// ─── 6. 404 Handler (unknown routes) ─────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

// ─── 7. Global Error Handler (must be last) ───────────────────────────────────
app.use(errorHandler);

// ─── 8. Start Server ─────────────────────────────────────────────────────────
const server = app.listen(env.PORT, () => {
    console.log(`\n  MHomes API running`);
    console.log(`   Environment : ${env.NODE_ENV}`);
    console.log(`   Port        : ${env.PORT}`);
    console.log(`   Health      : http://localhost:${env.PORT}/health\n`);
});

// ─── 9. Graceful Shutdown ─────────────────────────────────────────────────────
const shutdown = (signal) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(() => {
        console.log('HTTP server closed.');
        // prisma.$disconnect() ← add when Prisma is set up
        process.exit(0);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled promise rejections (safety net)
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    server.close(() => process.exit(1));
});

module.exports = app; // exported for testing