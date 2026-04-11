// routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/bookingController');

// All routes are public - no auth required

// DEBUG — view all rooms and bookings (temporary)
router.get('/debug/database', controller.debugDatabase);

// PUBLIC — search rooms (returns available, assignedRooms, totalAmount etc) — used by online booking
router.get('/rooms/search', controller.searchRooms);

// PUBLIC — search available rooms (simple list) — used by admin offline booking
router.get('/rooms/search-simple', controller.searchRoomsSimple);

// PUBLIC — get pending bookings
router.get('/bookings/pending', controller.getPendingBookings);

// PUBLIC — get all bookings with filters
router.get('/bookings', controller.getBookings);

// PUBLIC — check availability (legacy)
router.get('/rooms/available', controller.getAvailableRooms);

// PUBLIC — create online booking
router.post('/bookings/online', controller.createOnlineBooking);

// PUBLIC — create offline booking (new)
router.post('/bookings/offline', controller.createOfflineBooking);

// PUBLIC — create booking
router.post('/bookings', controller.createBooking);

// PUBLIC — update booking status (new)
router.patch('/bookings/:id/status', controller.updateBookingStatus);

// PUBLIC — confirm payment
router.post('/bookings/:id/confirm-payment', controller.confirmPayment);

// PUBLIC — legacy endpoints (deprecated)
router.post('/', controller.createBooking);
router.post('/:id/confirm-payment', controller.confirmPayment);

module.exports = router;

