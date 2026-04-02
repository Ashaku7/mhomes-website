// controllers/adminController.js
const adminService = require('../services/adminService');

// GET /api/admin/dashboard
const getDashboard = async (req, res, next) => {
    try {
        const result = await adminService.getDashboardSummary();
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/bookings
const getAllBookings = async (req, res, next) => {
    try {
        const { status, source, date } = req.query;
        const result = await adminService.getAllBookings({ status, source, date });
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/bookings/:id
const getBookingById = async (req, res, next) => {
    try {
        const result = await adminService.getBookingById(req.params.id);
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/bookings/:id/cancel
const cancelBooking = async (req, res, next) => {
    try {
        const { reason } = req.body;
        const result = await adminService.cancelBooking(req.params.id, reason);
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/rooms
const getAllRooms = async (req, res, next) => {
    try {
        const result = await adminService.getAllRooms();
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/rooms/:id
const updateRoom = async (req, res, next) => {
    try {
        const { pricePerNight, status, description, maxGuests } = req.body;
        const result = await adminService.updateRoom(req.params.id, {
            pricePerNight, status, description, maxGuests,
        });
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/today
const getTodayActivity = async (req, res, next) => {
    try {
        const result = await adminService.getTodayActivity();
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/payments/:id
const updatePayment = async (req, res, next) => {
    try {
        const { paymentMethod, transactionId, paymentDate, status } = req.body;
        const result = await adminService.updatePayment(req.params.id, {
            paymentMethod,
            transactionId,
            paymentDate,
            status,
        });
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/bookings/:id/checkin
const checkInGuest = async (req, res, next) => {
    try {
        const { address, proofType, totalGuests } = req.body;
        const result = await adminService.checkInGuest(req.params.id, {
            address,
            proofType,
            totalGuests,
        });
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// POST /api/admin/bookings/walkin (offline booking)
const createWalkinBooking = async (req, res, next) => {
    try {
        const {
            name,
            email,
            phone,
            address,
            proofType,
            checkIn,
            checkOut,
            roomType,
            quantity,
            totalGuests,
            paymentMethod,
            transactionId,
            paymentDate,
        } = req.body;

        const result = await adminService.createWalkinBooking({
            name,
            email,
            phone,
            address,
            proofType,
            checkIn,
            checkOut,
            roomType,
            quantity,
            totalGuests,
            paymentMethod,
            transactionId,
            paymentDate,
        });
        res.status(201).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/payments/search
const searchPayments = async (req, res, next) => {
    try {
        const { bookingReference, guestName, phone } = req.query;
        const result = await adminService.searchPayments({
            bookingReference,
            guestName,
            phone,
        });
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/payments/:id/cancel
const cancelPayment = async (req, res, next) => {
    try {
        const result = await adminService.cancelPayment(req.params.id);
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/bookings/:id/confirm-payment
const confirmPaymentByAdmin = async (req, res, next) => {
    try {
        const bookingId = req.params.id;
        const result = await adminService.confirmPayment(bookingId);
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDashboard,
    getAllBookings,
    getBookingById,
    cancelBooking,
    getAllRooms,
    updateRoom,
    getTodayActivity,
    updatePayment,
    checkInGuest,
    createWalkinBooking,
    searchPayments,
    cancelPayment,
    confirmPaymentByAdmin,
};