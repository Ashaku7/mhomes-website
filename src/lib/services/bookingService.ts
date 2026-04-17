import { prisma } from '@/lib/prisma';
import { generateBookingReference } from '@/lib/utils/generateBookingReference';

interface SearchRoomsParams {
  checkIn: string;
  checkOut: string;
  roomType: string;
  roomCount: number | string;
}

interface GetAvailableRoomsParams {
  checkIn: string;
  checkOut: string;
  guests?: number | string;
}

interface CreateOnlineBookingParams {
  fullName: string;
  email: string;
  phone: string;
  members?: Array<{ memberName: string; age?: number; relation?: string }>;
  roomIds: (number | string)[];
  checkIn: string;
  checkOut: string;
  totalGuests: number;
  bookingSource?: string;
  extraExpense?: string | null;
}

interface ConfirmPaymentParams {
  bookingId: number | string;
  amount: number | string;
  paymentMethod: string;
  transactionId?: string;
}

interface UpdateBookingStatusParams {
  bookingId: number | string;
  bookingStatus: string;
  extraExpense?: string | number | null;
}

interface CreateOfflineBookingParams {
  guest: {
    fullName: string;
    phone: string;
    email?: string;
    address?: string;
    idProofType?: string;
  };
  members?: Array<{ memberName: string; age?: number; relation?: string }>;
  booking: {
    checkIn: string;
    checkOut: string;
    roomIds: (number | string)[];
    totalGuests: number;
    totalAmount?: number;
    extraExpense?: string | null;
  };
  payment: {
    paymentMethod: string;
    amount?: number;
    transactionId?: string;
    paymentDate?: string;
  };
  bookingStatus: string;
}

interface GetBookingsParams {
  status?: string;
  source?: string;
  date?: string;
  checkOutDate?: string;
}

class BookingServiceError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'BookingServiceError';
  }
}

function createError(statusCode: number, message: string): BookingServiceError {
  return new BookingServiceError(statusCode, message);
}

function normalizePaymentMethod(method: string): string | null {
  if (!method) return null;
  const normalized = method.toLowerCase();
  if (normalized === 'upi') return 'UPI';
  if (normalized === 'card') return 'card';
  if (normalized === 'cash') return 'cash';
  if (normalized === 'gateway') return 'gateway';
  return null;
}

function validateDates(checkIn: string, checkOut: string) {
  const ciDate = new Date(checkIn + 'T00:00:00Z');
  const coDate = new Date(checkOut + 'T00:00:00Z');
  
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (isNaN(ciDate.getTime()) || isNaN(coDate.getTime())) {
    throw createError(400, 'Invalid date format. Use YYYY-MM-DD.');
  }
  if (ciDate < today) {
    throw createError(400, 'Check-in date must be today or in the future.');
  }
  if (coDate <= ciDate) {
    throw createError(400, 'Check-out date must be after check-in date.');
  }

  return { ci: checkIn, co: checkOut, ciDate, coDate };
}

function calculateNights(checkIn: string | Date, checkOut: string | Date): number {
  const ciDate = typeof checkIn === 'string' 
    ? new Date(checkIn + 'T00:00:00Z')
    : checkIn;
  const coDate = typeof checkOut === 'string'
    ? new Date(checkOut + 'T00:00:00Z')
    : checkOut;
  const diff = coDate.getTime() - ciDate.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const searchAvailableRooms = async (params: SearchRoomsParams) => {
  try {
    const { checkIn, checkOut, roomType, roomCount } = params;

    if (!checkIn || !checkOut || !roomType || roomCount === undefined) {
      throw createError(400, 'checkIn, checkOut, roomType, and roomCount are required.');
    }

    const validRoomTypes = ['premium', 'premium_plus'];
    if (!validRoomTypes.includes(roomType)) {
      throw createError(400, 'roomType must be "premium" or "premium_plus".');
    }

    const count = parseInt(String(roomCount));
    if (isNaN(count) || count < 1 || count > 6) {
      throw createError(400, 'roomCount must be a positive integer between 1 and 6.');
    }

    const { ci, co, ciDate, coDate } = validateDates(checkIn, checkOut);
    const nights = calculateNights(ci, co);

  const bookedRoomIds = await prisma.bookingRoom.findMany({
    where: {
      booking: {
        bookingStatus: { in: ['pending', 'confirmed', 'checked_in', 'checked_out'] },
        checkIn: { lt: coDate },
        checkOut: { gt: ciDate },
      },
    },
    select: { roomId: true },
  });

  const bookedIds = bookedRoomIds.map((br) => br.roomId);

  const totalRooms = await prisma.room.count();
  const activeRooms = await prisma.room.count({
    where: { status: 'active' },
  });

  const allAvailableRooms = await prisma.room.findMany({
    where: {
      status: 'active',
      id: { notIn: bookedIds.length > 0 ? bookedIds : [] },
    },
  });
  
  const availablePremiumPlus = allAvailableRooms
    .filter(r => r.roomType === 'premium_plus')
    .sort((a, b) => parseInt(a.roomNumber) - parseInt(b.roomNumber));

  const availablePremium = allAvailableRooms
    .filter(r => r.roomType === 'premium')
    .sort((a, b) => parseInt(a.roomNumber) - parseInt(b.roomNumber));

  let assignedRooms = [];

  if (roomType === 'premium_plus') {
    assignedRooms = availablePremiumPlus.slice(0, count);
  } else if (roomType === 'premium') {
    assignedRooms = availablePremium.slice(0, count);
  }

  const totalPerNight = assignedRooms.reduce((sum, room) => sum + parseFloat(String(room.pricePerNight)), 0);
  const totalAmount = totalPerNight * nights;

  if (assignedRooms.length < count) {
    const availableCount = assignedRooms.length;
    return {
      available: false,
      success: false,
      rooms: [],
      assignedRooms: [],
      totalAmount: 0,
      message: `Only ${availableCount} ${roomType} room(s) available. You requested ${count}.`,
      _debug: {
        totalRoomsInDb: totalRooms,
        activeRoomsInDb: activeRooms,
        bookedRoomIds: bookedIds,
        availablePremiumPlus: availablePremiumPlus.length,
        availablePremium: availablePremium.length,
        requestedCount: count,
        requestedType: roomType,
      }
    };
  }

  return {
    available: true,
    success: true,
    rooms: assignedRooms.map(r => ({
      id: r.id,
      roomNumber: r.roomNumber,
      roomType: r.roomType,
      pricePerNight: parseFloat(String(r.pricePerNight)),
      maxGuests: r.maxGuests,
    })),
    assignedRooms: assignedRooms.map(r => ({
      id: r.id,
      roomNumber: r.roomNumber,
      roomType: r.roomType,
      pricePerNight: parseFloat(String(r.pricePerNight)),
    })),
    checkIn: checkIn,
    checkOut: checkOut,
    nights: nights,
    totalPerNight: totalPerNight,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    _debug: {
      totalRoomsInDb: totalRooms,
      activeRoomsInDb: activeRooms,
      bookedRoomIds: bookedIds,
      availablePremiumPlus: availablePremiumPlus.length,
      availablePremium: availablePremium.length,
      requestedCount: count,
      requestedType: roomType,
    }
  };
  } catch (error: any) {
    if (error instanceof BookingServiceError) {
      throw error;
    }
    console.error('[searchAvailableRooms Error]', error);
    throw createError(500, error.message || 'Failed to search available rooms');
  }
};

export const getAvailableRooms = async (params: GetAvailableRoomsParams) => {
  const { checkIn, checkOut, guests } = params;

  if (!checkIn || !checkOut) {
    throw createError(400, 'checkIn and checkOut are required.');
  }

  const { ci, co, ciDate, coDate } = validateDates(checkIn, checkOut);
  const guestCount = parseInt(String(guests)) || 1;
  const nights = calculateNights(ci, co);

  const bookedRoomIds = await prisma.bookingRoom.findMany({
    where: {
      booking: {
        bookingStatus: { in: ['pending', 'confirmed', 'checked_in', 'checked_out'] },
        checkIn: { lt: coDate },
        checkOut: { gt: ciDate },
      },
    },
    select: { roomId: true },
  });

  const bookedIds = bookedRoomIds.map((br) => br.roomId);

  const availableRooms = await prisma.room.findMany({
    where: {
      status: 'active',
      id: { notIn: bookedIds.length > 0 ? bookedIds : [-1] },
    },
    orderBy: { pricePerNight: 'asc' },
  });

  const grouped = availableRooms.reduce((acc: any, room) => {
    const type = room.roomType;
    if (!acc[type]) acc[type] = { rooms: [], count: 0, pricePerNight: room.pricePerNight };
    acc[type].rooms.push({
      id: room.id,
      roomNumber: room.roomNumber,
      maxGuests: room.maxGuests,
      pricePerNight: parseFloat(String(room.pricePerNight)),
      totalPrice: parseFloat(String(room.pricePerNight)) * nights,
      description: room.description,
    });
    acc[type].count++;
    return acc;
  }, {});

  return {
    checkIn: ci,
    checkOut: co,
    nights,
    guestsRequested: guestCount,
    totalAvailable: availableRooms.length,
    roomsByType: grouped,
  };
};

export const createOnlineBooking = async (params: CreateOnlineBookingParams) => {
  const { fullName, email, phone, members = [], roomIds, checkIn, checkOut, totalGuests, bookingSource = 'online', extraExpense = null } = params;

  if (!fullName || !email || !phone) {
    throw createError(400, 'fullName, email, and phone are required.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw createError(400, 'Please provide a valid email address.');
  }

  if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
    throw createError(400, 'At least one room must be selected.');
  }

  if (!checkIn || !checkOut) {
    throw createError(400, 'checkIn and checkOut are required.');
  }

  if (!totalGuests || totalGuests < 1) {
    throw createError(400, 'totalGuests must be at least 1.');
  }

  const { ci, co, ciDate, coDate } = validateDates(checkIn, checkOut);
  const nights = calculateNights(ci, co);

  const sanitizedRoomIds = roomIds.map((id) => {
    const parsed = parseInt(String(id));
    if (isNaN(parsed)) throw createError(400, `Invalid room ID: ${id}`);
    return parsed;
  });

  const bookingReference = await generateBookingReference();

  const booking = await prisma.$transaction(async (tx: any) => {
    const lockedRooms = await tx.$queryRawUnsafe(
      `SELECT id, room_number, room_type, max_guests, price_per_night, status
       FROM rooms
       WHERE id = ANY($1::int[])
       FOR UPDATE`,
      sanitizedRoomIds
    );

    if (lockedRooms.length !== sanitizedRoomIds.length) {
      throw createError(404, 'One or more selected rooms do not exist.');
    }

    const unavailableRooms = lockedRooms.filter((r: any) => r.status !== 'active');
    if (unavailableRooms.length > 0) {
      const nums = unavailableRooms.map((r: any) => r.room_number).join(', ');
      throw createError(409, `Room(s) ${nums} are currently under maintenance.`);
    }

    const conflictingBookings = await tx.bookingRoom.findMany({
      where: {
        roomId: { in: sanitizedRoomIds },
        booking: {
          bookingStatus: { in: ['pending', 'confirmed', 'checked_in', 'checked_out'] },
          checkIn: { lt: coDate },
          checkOut: { gt: ciDate },
        },
      },
      include: {
        room: { select: { roomNumber: true } },
      },
    });

    if (conflictingBookings.length > 0) {
      throw createError(409, 'Selected room is not available for the selected dates.');
    }

    const totalAmount = lockedRooms.reduce((sum: number, room: any) => {
      return sum + parseFloat(room.price_per_night) * nights;
    }, 0);

    // Add 5% GST to total amount
    const totalWithGst = totalAmount * 1.05;

    const guest = await tx.guest.create({
      data: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
      },
    });

    if (members.length > 0) {
      await tx.guestMember.createMany({
        data: members.map((m) => ({
          guestId: guest.id,
          memberName: m.memberName,
          age: m.age ? parseInt(String(m.age)) : null,
          relation: m.relation || null,
        })),
      });
    }

    const newBooking = await tx.booking.create({
      data: {
        guestId: guest.id,
        bookingReference,
        checkIn: ciDate,
        checkOut: coDate,
        totalGuests: parseInt(String(totalGuests)),
        bookingStatus: 'pending',
        bookingSource,
        totalAmount: parseFloat(totalWithGst.toFixed(2)),
        extraExpense: extraExpense || null,
      },
    });

    await tx.bookingRoom.createMany({
      data: sanitizedRoomIds.map((roomId) => ({
        bookingId: newBooking.id,
        roomId,
      })),
    });

    const payment = await tx.payment.create({
      data: {
        bookingId: newBooking.id,
        amount: parseFloat(totalWithGst.toFixed(2)),
        paymentStatus: 'yet_to_pay',
        paymentMethod: 'gateway',
      },
    });

    return {
      bookingId: newBooking.id,
      bookingReference,
      guest: {
        id: guest.id,
        fullName: guest.fullName,
        phone: guest.phone,
        email: guest.email,
      },
      checkIn: ci,
      checkOut: co,
      nights,
      rooms: lockedRooms.map((r: any) => ({
        id: r.id,
        roomNumber: r.room_number,
        roomType: r.room_type,
        pricePerNight: parseFloat(r.price_per_night),
      })),
      totalAmount: parseFloat(totalWithGst.toFixed(2)),
      paymentStatus: 'yet_to_pay',
      bookingStatus: 'pending',
    };
  });

  return booking;
};

export const createBooking = async (params: any) => {
  throw createError(400, 'This endpoint is deprecated. Use POST /api/bookings/online or POST /api/admin/bookings/walkin');
};

export const confirmPayment = async (params: ConfirmPaymentParams) => {
  const { bookingId, amount, paymentMethod, transactionId } = params;

  if (!bookingId || !amount || !paymentMethod) {
    throw createError(400, 'bookingId, amount, and paymentMethod are required.');
  }

  const normalized = normalizePaymentMethod(paymentMethod);
  if (!normalized) {
    throw createError(400, 'paymentMethod must be one of: UPI, card, cash, gateway');
  }

  const result = await prisma.$transaction(async (tx: any) => {
    const booking = await tx.booking.findUnique({
      where: { id: parseInt(String(bookingId)) },
    });

    if (!booking) {
      throw createError(404, 'Booking not found.');
    }
    if (booking.bookingStatus === 'confirmed') {
      throw createError(409, 'Booking is already confirmed.');
    }
    if (booking.bookingStatus === 'cancelled') {
      throw createError(409, 'Cannot confirm a cancelled booking.');
    }

    const payment = await tx.payment.create({
      data: {
        bookingId: parseInt(String(bookingId)),
        amount: parseFloat(String(amount)),
        paymentMethod: normalized,
        paymentStatus: 'paid',
        transactionId: transactionId || null,
        paymentDate: new Date(),
      },
    });

    const updatedBooking = await tx.booking.update({
      where: { id: parseInt(String(bookingId)) },
      data: { bookingStatus: 'confirmed' },
    });

    return {
      bookingId: updatedBooking.id,
      bookingStatus: updatedBooking.bookingStatus,
      paymentId: payment.id,
      paymentStatus: payment.paymentStatus,
      amountPaid: parseFloat(String(payment.amount)),
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      paidAt: payment.paymentDate,
      message: 'Payment confirmed. Booking is now confirmed.',
    };
  });

  return result;
};

export const updateBookingStatus = async (params: UpdateBookingStatusParams) => {
  const { bookingId, bookingStatus, extraExpense } = params;

  if (!bookingId) {
    throw createError(400, 'bookingId is required.');
  }

  if (!bookingStatus) {
    throw createError(400, 'bookingStatus is required.');
  }

  const validStatuses = ['pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out'];
  if (!validStatuses.includes(bookingStatus)) {
    throw createError(400, `bookingStatus must be one of: ${validStatuses.join(', ')}`);
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parseInt(String(bookingId)) },
  });

  if (!booking) {
    throw createError(404, 'Booking not found.');
  }

  const allowedTransitions: Record<string, string[]> = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['checked_in', 'cancelled'],
    'checked_in': ['checked_out', 'cancelled'],
    'checked_out': ['cancelled'],
    'cancelled': [],
  };

  if (!allowedTransitions[booking.bookingStatus] || !allowedTransitions[booking.bookingStatus].includes(bookingStatus)) {
    throw createError(400, `Invalid status transition from ${booking.bookingStatus} to ${bookingStatus}. Allowed transitions: pending -> confirmed/cancelled, confirmed -> checked_in/cancelled, checked_in -> checked_out/cancelled, checked_out -> cancelled.`);
  }

  const updated = await prisma.$transaction(async (tx: any) => {
    const updateData: any = { bookingStatus };
    if (extraExpense !== undefined) {
      updateData.extraExpense = extraExpense;
    }

    const updatedBooking = await tx.booking.update({
      where: { id: parseInt(String(bookingId)) },
      data: updateData,
    });

    if (bookingStatus === 'cancelled') {
      await tx.payment.updateMany({
        where: { bookingId: parseInt(String(bookingId)) },
        data: { paymentStatus: 'cancelled' },
      });
    }

    return updatedBooking;
  });

  let finalTotal = parseFloat(String(updated.totalAmount));
  if (extraExpense && extraExpense !== 'No expense') {
    const amountMatches = String(extraExpense).match(/₹([\d.]+)/g);
    if (amountMatches) {
      amountMatches.forEach(match => {
        const amt = parseFloat(match.replace('₹', ''));
        finalTotal += amt;
      });
    }
  }

  return {
    bookingId: updated.id,
    bookingStatus: updated.bookingStatus,
    finalTotal: finalTotal.toFixed(2),
    message: `Booking status updated to ${updated.bookingStatus}${bookingStatus === 'cancelled' ? ' and payment cancelled.' : ''}${extraExpense !== undefined ? ' Extra expense recorded.' : '.'}`,
  };
};

export const getPendingBookings = async () => {
  const bookings = await prisma.booking.findMany({
    where: { bookingStatus: 'pending' },
    include: {
      guest: {
        select: {
          fullName: true,
          phone: true,
          email: true,
        },
      },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    total: bookings.length,
    bookings: bookings.map(b => ({
      id: b.id,
      bookingReference: b.bookingReference,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      totalAmount: parseFloat(String(b.totalAmount)),
      createdAt: b.createdAt,
      bookingStatus: b.bookingStatus,
      guest: b.guest,
      payments: b.payments.map(p => ({
        id: p.id,
        amount: parseFloat(String(p.amount)),
        paymentMethod: p.paymentMethod,
        paymentStatus: p.paymentStatus,
        transactionId: p.transactionId,
        paymentDate: p.paymentDate,
      })),
    })),
  };
};

export const searchRoomsSimple = async (params: Partial<GetAvailableRoomsParams> & { roomType?: string }) => {
  const { checkIn, checkOut, roomType } = params;

  if (!checkIn || !checkOut) {
    throw createError(400, 'checkIn and checkOut are required.');
  }

  const validRoomTypes = ['premium', 'premium_plus'];
  if (roomType && !validRoomTypes.includes(roomType)) {
    throw createError(400, 'roomType must be "premium" or "premium_plus".');
  }

  const { ci, co, ciDate, coDate } = validateDates(checkIn, checkOut);

  const bookedRoomIds = await prisma.bookingRoom.findMany({
    where: {
      booking: {
        bookingStatus: { in: ['pending', 'confirmed', 'checked_in', 'checked_out'] },
        checkIn: { lt: coDate },
        checkOut: { gt: ciDate },
      },
    },
    select: { roomId: true },
  });

  const bookedIds = new Set(bookedRoomIds.map((br) => br.roomId));

  const where: any = { status: 'active' };
  if (roomType) {
    where.roomType = roomType;
  }

  const rooms = await prisma.room.findMany({
    where,
    orderBy: { roomNumber: 'asc' },
  });

  const availableRooms = rooms.filter((room) => !bookedIds.has(room.id));

  return {
    total: availableRooms.length,
    rooms: availableRooms.map((r) => ({
      id: r.id,
      roomNumber: r.roomNumber,
      roomType: r.roomType,
      maxGuests: r.maxGuests,
      pricePerNight: parseFloat(String(r.pricePerNight)),
      description: r.description,
    })),
  };
};

export const createOfflineBooking = async (params: CreateOfflineBookingParams) => {
  const { guest, members, booking, payment, bookingStatus } = params;

  if (!guest || !guest.fullName || !guest.phone || !guest.email) {
    throw createError(400, 'Guest fullName, phone, and email are required.');
  }

  if (!booking || !booking.checkIn || !booking.checkOut || booking.totalGuests === undefined) {
    throw createError(400, 'Booking checkIn, checkOut, and totalGuests are required.');
  }

  if (!Array.isArray(booking.roomIds) || booking.roomIds.length === 0) {
    throw createError(400, 'At least one roomId must be provided.');
  }

  if (!payment || !payment.paymentMethod) {
    throw createError(400, 'Payment method is required.');
  }

  const validBookingStatuses = ['confirmed', 'checked_in'];
  if (!validBookingStatuses.includes(bookingStatus)) {
    throw createError(400, 'bookingStatus must be "confirmed" or "checked_in".');
  }

  const normalized = normalizePaymentMethod(payment.paymentMethod);
  if (!normalized) {
    throw createError(400, 'Invalid paymentMethod.');
  }

  const { ci, co, ciDate, coDate } = validateDates(booking.checkIn, booking.checkOut);
  const bookingReference = await generateBookingReference();

  return await prisma.$transaction(async (tx: any) => {
    const lockedRooms = await tx.$queryRawUnsafe(
      `SELECT id, room_number, room_type, max_guests, price_per_night, status
       FROM rooms
       WHERE id = ANY($1::int[])
       FOR UPDATE`,
      booking.roomIds.map((id) => parseInt(String(id)))
    );

    if (lockedRooms.length !== booking.roomIds.length) {
      throw createError(404, 'One or more selected rooms do not exist.');
    }

    const unavailableRooms = lockedRooms.filter((r: any) => r.status !== 'active');
    if (unavailableRooms.length > 0) {
      const nums = unavailableRooms.map((r: any) => r.room_number).join(', ');
      throw createError(409, `Room(s) ${nums} are currently under maintenance.`);
    }

    const conflictingBookings = await tx.bookingRoom.findMany({
      where: {
        roomId: { in: booking.roomIds.map((id) => parseInt(String(id))) },
        booking: {
          bookingStatus: { in: ['pending', 'confirmed', 'checked_in', 'checked_out'] },
          checkIn: { lt: coDate },
          checkOut: { gt: ciDate },
        },
      },
      include: {
        room: { select: { roomNumber: true } },
      },
    });

    if (conflictingBookings.length > 0) {
      const conflictDetails = conflictingBookings
        .map((c: any) => `Room ${c.room.roomNumber}`)
        .join(', ');
      throw createError(409, `${conflictDetails} ${conflictingBookings.length > 1 ? 'are' : 'is'} already booked for the selected dates.`);
    }

    const guestRecord = await tx.guest.create({
      data: {
        fullName: guest.fullName,
        phone: guest.phone,
        email: guest.email || null,
        address: guest.address || null,
        idProofType: guest.idProofType || null,
      },
    });

    if (members && Array.isArray(members) && members.length > 0) {
      await tx.guestMember.createMany({
        data: members.map((m) => ({
          guestId: guestRecord.id,
          memberName: m.memberName,
          age: m.age || null,
          relation: m.relation || null,
        })),
      });
    }

    const nights = calculateNights(booking.checkIn, booking.checkOut);
    
    // Calculate total amount from locked rooms (same as online booking)
    const totalAmount = lockedRooms.reduce((sum: number, room: any) => {
      return sum + parseFloat(room.price_per_night) * nights;
    }, 0);
    
    // Add 5% GST to total amount
    const totalWithGst = totalAmount * 1.05;
    
    const newBooking = await tx.booking.create({
      data: {
        guestId: guestRecord.id,
        bookingReference,
        checkIn: ciDate,
        checkOut: coDate,
        totalGuests: parseInt(String(booking.totalGuests)),
        bookingStatus,
        bookingSource: 'offline',
        totalAmount: parseFloat(totalWithGst.toFixed(2)),
        extraExpense: booking.extraExpense || null,
      },
    });

    await tx.bookingRoom.createMany({
      data: booking.roomIds.map((roomId) => ({
        bookingId: newBooking.id,
        roomId: parseInt(String(roomId)),
      })),
    });

    const paymentRecord = await tx.payment.create({
      data: {
        bookingId: newBooking.id,
        amount: payment.amount ? parseFloat(String(payment.amount)) : parseFloat(totalWithGst.toFixed(2)),
        paymentMethod: normalized,
        paymentStatus: 'paid',
        transactionId: payment.transactionId || null,
        paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
      },
    });

    const fullBooking = await tx.booking.findUnique({
      where: { id: newBooking.id },
      include: {
        guest: true,
        bookingRooms: {
          include: {
            room: true,
          },
        },
        payments: true,
      },
    });

    return {
      id: fullBooking.id,
      bookingReference: fullBooking.bookingReference,
      checkIn: fullBooking.checkIn,
      checkOut: fullBooking.checkOut,
      totalGuests: fullBooking.totalGuests,
      bookingStatus: fullBooking.bookingStatus,
      bookingSource: fullBooking.bookingSource,
      totalAmount: parseFloat(String(fullBooking.totalAmount)),
      extraExpense: fullBooking.extraExpense,
      createdAt: fullBooking.createdAt,
      guest: {
        id: fullBooking.guest.id,
        fullName: fullBooking.guest.fullName,
        phone: fullBooking.guest.phone,
        email: fullBooking.guest.email,
        address: fullBooking.guest.address,
        idProofType: fullBooking.guest.idProofType,
        members: fullBooking.guest.members,
      },
      rooms: fullBooking.bookingRooms.map((br: any) => ({
        id: br.room.id,
        roomNumber: br.room.roomNumber,
        roomType: br.room.roomType,
        maxGuests: br.room.maxGuests,
        pricePerNight: parseFloat(String(br.room.pricePerNight)),
      })),
      payment: {
        id: paymentRecord.id,
        amount: parseFloat(String(paymentRecord.amount)),
        paymentMethod: paymentRecord.paymentMethod,
        paymentStatus: paymentRecord.paymentStatus,
        transactionId: paymentRecord.transactionId,
        paymentDate: paymentRecord.paymentDate,
      },
    };
  });
};

export const getBookings = async (params: GetBookingsParams) => {
  const { status, source, date, checkOutDate } = params;
  const where: any = {};

  if (status) {
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out'];
    if (!validStatuses.includes(status)) {
      throw createError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    where.bookingStatus = status;
  }

  if (source) {
    const validSources = ['online', 'offline'];
    if (!validSources.includes(source)) {
      throw createError(400, `Invalid source. Must be one of: ${validSources.join(', ')}`);
    }
    where.bookingSource = source;
  }

  if (date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw createError(400, 'Date must be in YYYY-MM-DD format.');
    }
    const startDate = new Date(date + 'T00:00:00Z');
    const endDate = new Date(date + 'T00:00:00Z');
    endDate.setDate(endDate.getDate() + 1);
    where.checkIn = {
      gte: startDate,
      lt: endDate,
    };
  }

  if (checkOutDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(checkOutDate)) {
      throw createError(400, 'checkOutDate must be in YYYY-MM-DD format.');
    }
    const startDate = new Date(checkOutDate + 'T00:00:00Z');
    const endDate = new Date(checkOutDate + 'T00:00:00Z');
    endDate.setDate(endDate.getDate() + 1);
    where.checkOut = {
      gte: startDate,
      lt: endDate,
    };
  }

  const bookings = await prisma.booking.findMany({
    where,
    select: {
      id: true,
      bookingReference: true,
      checkIn: true,
      checkOut: true,
      totalGuests: true,
      bookingStatus: true,
      bookingSource: true,
      totalAmount: true,
      extraExpense: true,
      createdAt: true,
      guest: {
        select: {
          fullName: true,
          phone: true,
          email: true,
        },
      },
      bookingRooms: {
        select: {
          room: {
            select: {
              roomNumber: true,
              roomType: true,
              pricePerNight: true,
            },
          },
        },
      },
      payments: {
        select: {
          paymentStatus: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return bookings.map(b => ({
    id: b.id,
    bookingReference: b.bookingReference,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    totalGuests: b.totalGuests,
    bookingStatus: b.bookingStatus,
    bookingSource: b.bookingSource,
    totalAmount: parseFloat(String(b.totalAmount)),
    createdAt: b.createdAt,
    guest: b.guest,
    rooms: b.bookingRooms.map(br => br.room),
    payments: b.payments,
  }));
};
