// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// All admin routes are now public (no JWT auth required)

// ── Dashboard ─────────────────────────────────────────────────
router.get('/dashboard', adminController.getDashboard);

// ── Bookings ──────────────────────────────────────────────────
router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/today', adminController.getTodayActivity);
router.get('/bookings/:id', adminController.getBookingById);

router.patch('/bookings/:id/cancel', adminController.cancelBooking);
router.patch('/bookings/:id/checkin', adminController.checkInGuest);
router.patch('/bookings/:id/confirm-payment', adminController.confirmPaymentByAdmin);

// Create offline booking
router.post('/bookings/walkin', adminController.createWalkinBooking);

// ── Payments ──────────────────────────────────────────────────
router.get('/payments/search', adminController.searchPayments);
router.patch('/payments/:id', adminController.updatePayment);
router.patch('/payments/:id/cancel', adminController.cancelPayment);

// ── Rooms ─────────────────────────────────────────────────────
router.get('/rooms', adminController.getAllRooms);
router.patch('/rooms/:id', adminController.updateRoom);

module.exports = router;