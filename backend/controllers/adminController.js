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

module.exports = {
    getDashboard,
    getAllBookings,
    getBookingById,
    cancelBooking,
    getAllRooms,
    updateRoom,
    getTodayActivity,
};