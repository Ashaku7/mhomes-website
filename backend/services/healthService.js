// services/healthService.js
// Services contain the core business logic, decoupled from HTTP layer.
// When Prisma is added, DB connectivity check goes here.

const env = require('../config/env');

const getSystemStatus = () => {
    return {
        success: true,
        status: 'healthy',
        service: 'MHomes Booking API',
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(process.uptime())}s`,
        // db: 'connected',  ← add after Prisma setup
    };
};

module.exports = { getSystemStatus };