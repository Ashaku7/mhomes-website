// utils/generateBookingReference.js
// Generate booking reference with format: MH-YYMMDD-NN
// Uses daily counter to ensure unique references per day

const prisma = require('../config/prisma');

const generateBookingReference = async () => {
    try {
        // Get today's date as YYMMDD string
        const today = new Date();
        const year = String(today.getFullYear()).slice(-2); // Last 2 digits of year
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;

        // Use raw Prisma query to increment counter
        // INSERT ... ON CONFLICT ... DO UPDATE ensures atomic increment
        const result = await prisma.$queryRaw`
            INSERT INTO daily_counters (date, count)
            VALUES (${dateStr}, 1)
            ON CONFLICT (date) DO UPDATE SET count = daily_counters.count + 1
            RETURNING count
        `;

        // Result is an array with one object containing the count
        const count = result[0].count;
        
        // Pad count to minimum 2 digits
        const paddedCount = String(count).padStart(2, '0');

        // Return formatted reference
        return `MH-${dateStr}-${paddedCount}`;
    } catch (error) {
        console.error('[ERROR] Failed to generate booking reference:', error);
        throw error;
    }
};

module.exports = { generateBookingReference };
