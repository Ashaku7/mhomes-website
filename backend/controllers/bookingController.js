// controllers/bookingController.js
const bookingService = require('../services/bookingService');

// GET /api/rooms/available
const getAvailableRooms = async (req, res, next) => {
    try {
        const { checkIn, checkOut, guests } = req.query;
        const result = await bookingService.getAvailableRooms({ checkIn, checkOut, guests });
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// POST /api/bookings
const createBooking = async (req, res, next) => {
    try {
        const {
            fullName, phone, email, address, idProofType,
            members, roomIds, checkIn, checkOut,
            totalGuests, bookingSource, notes,
        } = req.body;

        const userId = req.user?.id || null; // set by auth middleware (online bookings)

        const result = await bookingService.createBooking({
            fullName, phone, email, address, idProofType,
            members, roomIds, checkIn, checkOut,
            totalGuests, bookingSource, notes, userId,
        });

        res.status(201).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// POST /api/bookings/:id/confirm-payment
const confirmPayment = async (req, res, next) => {
    try {
        const bookingId = req.params.id;
        const { amount, paymentMethod, transactionId } = req.body;

        const result = await bookingService.confirmPayment({
            bookingId, amount, paymentMethod, transactionId,
        });

        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

module.exports = { getAvailableRooms, createBooking, confirmPayment };