// server.js — MHomes Booking API entry point

// ─── 1. Load environment variables (must be first) ──────────────────────────
require('dotenv').config();

// ─── 2. Imports ─────────────────────────────────────────────────────────────
const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const requestLogger = require('./middlewares/requestLogger');
const { errorHandler } = require('./middlewares/errorHandler');

// ─── Route modules ───────────────────────────────────────────────────────────
const healthRoutes = require('./routes/healthRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Future routes — uncomment as you build them:
// const propertyRoutes  = require('./routes/propertyRoutes');
// const userRoutes      = require('./routes/userRoutes');

// ─── 3. Create Express app ───────────────────────────────────────────────────
const app = express();

// ─── 4. Global Middleware ────────────────────────────────────────────────────
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (e.g. mobile apps, curl)
            if (!origin || env.ALLOWED_ORIGINS.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS: Origin '${origin}' not allowed`));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    })
);

app.use(express.json({ limit: '10kb' }));       // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(requestLogger);                          // Dev request logging

// ─── 5. Routes ───────────────────────────────────────────────────────────────
app.use('/health', healthRoutes);
app.use('/api', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

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