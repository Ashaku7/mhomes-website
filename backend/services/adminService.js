// services/adminService.js
const prisma = require('../config/prisma');
const { createError } = require('../middlewares/errorHandler');

// ─── helper: full booking include ────────────────────────────
const bookingInclude = {
    guest: {
        select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            address: true,
            idProofType: true,
            members: true,
        },
    },
    user: {
        select: { id: true, name: true, email: true, role: true },
    },
    bookingRooms: {
        include: {
            room: true,
        },
    },
    payments: true,
};

// ─── SERVICE 1: Get all bookings ──────────────────────────────
const getAllBookings = async ({ status, source, date } = {}) => {
    const where = {};

    if (status) where.bookingStatus = status;
    if (source) where.bookingSource = source;
    if (date) {
        const day = new Date(date);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        where.createdAt = { gte: day, lt: nextDay };
    }

    const bookings = await prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { createdAt: 'desc' },
    });

    return {
        total: bookings.length,
        bookings: bookings.map(formatBooking),
    };
};

// ─── SERVICE 2: Get single booking ───────────────────────────
const getBookingById = async (id) => {
    const booking = await prisma.booking.findUnique({
        where: { id: parseInt(id) },
        include: bookingInclude,
    });

    if (!booking) throw createError(404, 'Booking not found.');

    return formatBooking(booking);
};

// ─── SERVICE 3: Cancel booking ────────────────────────────────
const cancelBooking = async (id, reason) => {
    const booking = await prisma.booking.findUnique({
        where: { id: parseInt(id) },
    });

    if (!booking) throw createError(404, 'Booking not found.');

    if (booking.bookingStatus === 'cancelled') {
        throw createError(409, 'Booking is already cancelled.');
    }

    const updated = await prisma.booking.update({
        where: { id: parseInt(id) },
        data: {
            bookingStatus: 'cancelled',
            notes: reason
                ? `${booking.notes ? booking.notes + ' | ' : ''}Cancelled: ${reason}`
                : booking.notes,
        },
        include: bookingInclude,
    });

    return {
        ...formatBooking(updated),
        message: 'Booking cancelled successfully.',
    };
};

// ─── SERVICE 4: Get all rooms ─────────────────────────────────
const getAllRooms = async () => {
    const rooms = await prisma.room.findMany({
        orderBy: { roomNumber: 'asc' },
    });

    return {
        total: rooms.length,
        rooms: rooms.map((r) => ({
            ...r,
            pricePerNight: parseFloat(r.pricePerNight),
        })),
    };
};

// ─── SERVICE 5: Update room ───────────────────────────────────
const updateRoom = async (id, { pricePerNight, status, description, maxGuests }) => {
    const room = await prisma.room.findUnique({
        where: { id: parseInt(id) },
    });

    if (!room) throw createError(404, 'Room not found.');

    const validStatuses = ['active', 'maintenance'];
    if (status && !validStatuses.includes(status)) {
        throw createError(400, `Status must be one of: ${validStatuses.join(', ')}`);
    }

    const updated = await prisma.room.update({
        where: { id: parseInt(id) },
        data: {
            ...(pricePerNight !== undefined && { pricePerNight: parseFloat(pricePerNight) }),
            ...(status !== undefined && { status }),
            ...(description !== undefined && { description }),
            ...(maxGuests !== undefined && { maxGuests: parseInt(maxGuests) }),
        },
    });

    return {
        ...updated,
        pricePerNight: parseFloat(updated.pricePerNight),
        message: 'Room updated successfully.',
    };
};

// ─── SERVICE 6: Dashboard summary ────────────────────────────
const getDashboardSummary = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
        totalBookings,
        pendingBookings,
        confirmedBookings,
        cancelledBookings,
        todayCheckIns,
        todayCheckOuts,
        totalRevenue,
        roomStats,
    ] = await Promise.all([
        prisma.booking.count(),
        prisma.booking.count({ where: { bookingStatus: 'pending' } }),
        prisma.booking.count({ where: { bookingStatus: 'confirmed' } }),
        prisma.booking.count({ where: { bookingStatus: 'cancelled' } }),
        prisma.booking.count({
            where: { checkIn: { gte: today, lt: tomorrow }, bookingStatus: { in: ['pending', 'confirmed'] } },
        }),
        prisma.booking.count({
            where: { checkOut: { gte: today, lt: tomorrow }, bookingStatus: { in: ['pending', 'confirmed'] } },
        }),
        prisma.payment.aggregate({
            where: { paymentStatus: 'completed' },
            _sum: { amount: true },
        }),
        prisma.room.groupBy({
            by: ['status'],
            _count: { id: true },
        }),
    ]);

    const roomSummary = roomStats.reduce((acc, r) => {
        acc[r.status] = r._count.id;
        return acc;
    }, {});

    return {
        bookings: {
            total: totalBookings,
            pending: pendingBookings,
            confirmed: confirmedBookings,
            cancelled: cancelledBookings,
        },
        today: {
            checkIns: todayCheckIns,
            checkOuts: todayCheckOuts,
        },
        revenue: {
            total: parseFloat(totalRevenue._sum.amount || 0).toFixed(2),
        },
        rooms: {
            total: (roomSummary.active || 0) + (roomSummary.maintenance || 0),
            active: roomSummary.active || 0,
            maintenance: roomSummary.maintenance || 0,
        },
    };
};

// ─── SERVICE 7: Today's check-ins and check-outs ─────────────
const getTodayActivity = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [checkIns, checkOuts] = await Promise.all([
        prisma.booking.findMany({
            where: {
                checkIn: { gte: today, lt: tomorrow },
                bookingStatus: { in: ['pending', 'confirmed'] },
            },
            include: bookingInclude,
            orderBy: { checkIn: 'asc' },
        }),
        prisma.booking.findMany({
            where: {
                checkOut: { gte: today, lt: tomorrow },
                bookingStatus: 'confirmed',
            },
            include: bookingInclude,
            orderBy: { checkOut: 'asc' },
        }),
    ]);

    return {
        date: today.toISOString().split('T')[0],
        checkIns: { total: checkIns.length, bookings: checkIns.map(formatBooking) },
        checkOuts: { total: checkOuts.length, bookings: checkOuts.map(formatBooking) },
    };
};

// ─── HELPER: format booking output ───────────────────────────
const formatBooking = (b) => ({
    id: b.id,
    bookingStatus: b.bookingStatus,
    bookingSource: b.bookingSource,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    totalGuests: b.totalGuests,
    totalAmount: parseFloat(b.totalAmount),
    notes: b.notes,
    createdAt: b.createdAt,
    guest: b.guest,
    bookedBy: b.user || null,
    rooms: b.bookingRooms?.map((br) => ({
        id: br.room.id,
        roomNumber: br.room.roomNumber,
        roomType: br.room.roomType,
        pricePerNight: parseFloat(br.room.pricePerNight),
    })),
    payments: b.payments?.map((p) => ({
        id: p.id,
        amount: parseFloat(p.amount),
        paymentMethod: p.paymentMethod,
        paymentStatus: p.paymentStatus,
        transactionId: p.transactionId,
        paymentDate: p.paymentDate,
    })),
});

module.exports = {
    getAllBookings,
    getBookingById,
    cancelBooking,
    getAllRooms,
    updateRoom,
    getDashboardSummary,
    getTodayActivity,
};