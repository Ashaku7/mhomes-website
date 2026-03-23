// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middlewares/auth');

// All admin routes require authentication
// Admin can access everything, reception can access select routes
router.use(protect);

// ── Dashboard ─────────────────────────────────────────────────
router.get('/dashboard',
    restrictTo('admin'),
    adminController.getDashboard
);

// ── Bookings ──────────────────────────────────────────────────
router.get('/bookings',
    restrictTo('admin', 'reception'),
    adminController.getAllBookings
);

router.get('/bookings/today',
    restrictTo('admin', 'reception'),
    adminController.getTodayActivity
);

router.get('/bookings/:id',
    restrictTo('admin', 'reception'),
    adminController.getBookingById
);

router.patch('/bookings/:id/cancel',
    restrictTo('admin', 'reception'),
    adminController.cancelBooking
);

// ── Rooms ─────────────────────────────────────────────────────
router.get('/rooms',
    restrictTo('admin', 'reception'),
    adminController.getAllRooms
);

router.patch('/rooms/:id',
    restrictTo('admin'),
    adminController.updateRoom
);

module.exports = router;