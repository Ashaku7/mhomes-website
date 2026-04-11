// controllers/bookingController.js
const axios = require('axios');
const bookingService = require('../services/bookingService');
const { sendBookingConfirmation } = require('../utils/emailService');

// GET /api/rooms/search
const searchRooms = async (req, res, next) => {
    try {
        const { checkIn, checkOut, roomType, roomCount } = req.query;

        // Validation
        if (!checkIn || !checkOut || !roomType || !roomCount) {
            return res.status(400).json({ success: false, message: 'Missing required parameters: checkIn, checkOut, roomType, roomCount' });
        }

        const validRoomTypes = ['premium', 'premium_plus'];
        if (!validRoomTypes.includes(roomType)) {
            return res.status(400).json({ success: false, message: 'roomType must be "premium" or "premium_plus"' });
        }

        const count = parseInt(roomCount);
        if (isNaN(count) || count < 1 || count > 6) {
            return res.status(400).json({ success: false, message: 'roomCount must be a positive integer between 1 and 6' });
        }

        const result = await bookingService.searchAvailableRooms({ checkIn, checkOut, roomType, roomCount: count });
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// GET /api/rooms/available (legacy)
const getAvailableRooms = async (req, res, next) => {
    try {
        const { checkIn, checkOut, guests } = req.query;
        const result = await bookingService.getAvailableRooms({ checkIn, checkOut, guests });
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// POST /api/bookings/online
const createOnlineBooking = async (req, res, next) => {
    try {
        const { fullName, email, phone, members, roomIds, checkIn, checkOut, totalGuests, bookingSource, extraExpense, captchaToken } = req.body;

        // ── Verify reCAPTCHA token ──────────────────────────────────────────
        if (!captchaToken) {
            return res.status(400).json({ success: false, message: 'CAPTCHA token is required.' });
        }

        try {
            const captchaResponse = await axios.post(
                'https://www.google.com/recaptcha/api/siteverify',
                null,
                {
                    params: {
                        secret: process.env.RECAPTCHA_SECRET_KEY,
                        response: captchaToken
                    }
                }
            );

            if (!captchaResponse.data.success) {
                return res.status(400).json({ success: false, message: 'CAPTCHA verification failed' });
            }
        } catch (captchaErr) {
            console.error('[CAPTCHA] Verification error:', captchaErr.message);
            return res.status(400).json({ success: false, message: 'CAPTCHA verification failed' });
        }

        // Validate required fields
        if (!fullName || !email || !phone) {
            return res.status(400).json({ success: false, message: 'fullName, email, and phone are required.' });
        }

        if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one room must be selected.' });
        }

        const result = await bookingService.createOnlineBooking({
            fullName,
            email,
            phone,
            members: members || [],
            roomIds,
            checkIn,
            checkOut,
            totalGuests: parseInt(totalGuests),
            bookingSource: bookingSource || 'online',
            extraExpense: extraExpense || null,
        });

        // Send confirmation email (do not break booking if email fails)
        if (result && result.bookingReference && result.guest && result.guest.email) {
            const roomType = result.rooms && result.rooms[0] ? result.rooms[0].roomType : 'premium';
            const roomCount = result.rooms ? result.rooms.length : roomIds.length;
            const totalAmount = result.totalAmount || 0;

            // Email failure should not affect booking response
            sendBookingConfirmation(
                result.guest.fullName,
                result.guest.email,
                result.bookingReference,
                result.checkIn,
                result.checkOut,
                roomType,
                roomCount,
                totalAmount
            ).catch(err => {
                console.error('[BOOKING] Email failed but booking succeeded:', err);
            });
        }

        res.status(201).json({ success: true, data: result, message: 'Booking created successfully' });
    } catch (err) {
        next(err);
    }
};

// POST /api/bookings (legacy - deprecated)
const createBooking = async (req, res, next) => {
    try {
        const result = await bookingService.createBooking({});
        res.status(201).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// POST /api/bookings/:id/confirm-payment (legacy)
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

// GET /api/bookings/pending
const getPendingBookings = async (req, res, next) => {
    try {
        const result = await bookingService.getPendingBookings();
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// GET /api/bookings
const getBookings = async (req, res, next) => {
    try {
        const { status, source, date, checkOutDate } = req.query;

        const result = await bookingService.getBookings({ status, source, date, checkOutDate });
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/bookings/:id/status (new)
const updateBookingStatus = async (req, res, next) => {
    try {
        const bookingId = req.params.id;
        const { bookingStatus, extraExpense } = req.body;

        if (!bookingStatus) {
            return res.status(400).json({ success: false, message: 'bookingStatus is required.' });
        }

        const result = await bookingService.updateBookingStatus({ bookingId, bookingStatus, extraExpense });
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// GET /api/rooms/search (new - with optional roomType, no roomCount)
const searchRoomsSimple = async (req, res, next) => {
    try {
        const { checkIn, checkOut, roomType } = req.query;

        // Validation
        if (!checkIn || !checkOut) {
            return res.status(400).json({ success: false, message: 'checkIn and checkOut are required.' });
        }

        const result = await bookingService.searchRoomsSimple({ checkIn, checkOut, roomType: roomType || null });
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// POST /api/bookings/offline (new - offline booking with payment)
const createOfflineBooking = async (req, res, next) => {
    try {
        const { guest, members, booking, payment, bookingStatus } = req.body;

        // Validate required fields
        if (!guest || !booking || !payment || !bookingStatus) {
            return res.status(400).json({ 
                success: false, 
                message: 'guest, booking, payment, and bookingStatus are required.' 
            });
        }

        const result = await bookingService.createOfflineBooking({
            guest,
            members: members || [],
            booking,
            payment,
            bookingStatus,
        });

        res.status(201).json({ success: true, data: result, message: 'Offline booking created successfully' });
    } catch (err) {
        next(err);
    }
};

// GET /api/debug/database (debug endpoint)
const debugDatabase = async (req, res, next) => {
    try {
        const prisma = require('../config/prisma');
        
        const roomsCount = await prisma.room.count();
        const roomsData = await prisma.room.findMany({ take: 100 });
        const bookingsCount = await prisma.booking.count();
        
        res.status(200).json({
            success: true,
            data: {
                totalRooms: roomsCount,
                totalBookings: bookingsCount,
                rooms: roomsData,
            }
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { searchRooms, getAvailableRooms, createOnlineBooking, createBooking, confirmPayment, debugDatabase, getPendingBookings, getBookings, updateBookingStatus, searchRoomsSimple, createOfflineBooking };