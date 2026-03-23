// config/env.js
// Centralizes and validates all environment variables.
// Import this file anywhere you need config — never read process.env directly.

const requiredVars = [
    // Add required keys here as the project grows, e.g. 'DATABASE_URL', 'JWT_SECRET'
];

const missingVars = requiredVars.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
    throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}\n` +
        `Check your .env file against .env.example`
    );
}

const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT, 10) || 5000,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
        : ['http://localhost:3000'],

    isDev: process.env.NODE_ENV !== 'production',
    isProd: process.env.NODE_ENV === 'production',
};

module.exports = env;