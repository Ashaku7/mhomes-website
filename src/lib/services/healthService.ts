// services/healthService.ts
// Services contain the core business logic, decoupled from HTTP layer.

const getSystemStatus = () => {
    return {
        success: true,
        status: 'healthy',
        service: 'MHomes Booking API',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(process.uptime())}s`,
    };
};

export { getSystemStatus };
