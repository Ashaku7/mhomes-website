// services/invoiceService.ts
// Invoice generation and management for bookings.

import { prisma } from '@/lib/prisma';

// ─── HELPER: Create error object ───────────────────────────
const createError = (status: number, message: string) => {
    const error = new Error(message) as any;
    error.status = status;
    return error;
};

// ─────────────────────────────────────────────────────────────
// HELPER: Generate unique invoice number (INV-DDMMYY-CCC)
// ─────────────────────────────────────────────────────────────
const generateInvoiceNumber = async () => {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear().toString().slice(-2);
    const dateStr = `${day}${month}${year}`;

    try {
        console.log(`[Invoice] 🔢 Generating invoice number for date: ${dateStr}`);
        const counter = await prisma.dailyCounter.upsert({
            where: { date: dateStr },
            update: { count: { increment: 1 } },
            create: { date: dateStr, count: 1 }
        });

        const invoiceNumber = `INV-${dateStr}-${counter.count.toString().padStart(3, '0')}`;
        console.log(`[Invoice] ✅ Generated invoice number: ${invoiceNumber} (count: ${counter.count})`);
        return invoiceNumber;
    } catch (err: any) {
        console.error('[Invoice] ❌ Error generating invoice number:', err.message);
        throw createError(500, 'Failed to generate invoice number.');
    }
};

// SERVICE 1: Create invoice
const createInvoice = async (bookingId: number, totalAmount: number) => {
    try {
        if (!bookingId || totalAmount === undefined) {
            throw createError(400, 'bookingId and totalAmount are required.');
        }

        if (typeof totalAmount !== 'number' || totalAmount < 0) {
            throw createError(400, 'totalAmount must be a non-negative number.');
        }

        console.log(`[Invoice Service] 📌 Creating invoice for booking ${bookingId}, amount: ${totalAmount}`);

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            select: { id: true, bookingReference: true }
        });

        if (!booking) {
            throw createError(404, `Booking with ID ${bookingId} not found.`);
        }

        console.log(`[Invoice Service] ✓ Booking found: ${booking.bookingReference}`);

        const existingInvoice = await prisma.invoice.findUnique({
            where: { bookingId }
        });

        if (existingInvoice) {
            throw createError(409, `Invoice already exists for booking ID ${bookingId}.`);
        }

        console.log(`[Invoice Service] 🔢 Generating invoice number...`);
        const invoiceNumber = await generateInvoiceNumber();

        console.log(`[Invoice Service] 💾 Saving invoice to database...`);
        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                bookingId,
                totalAmount: parseFloat(totalAmount.toFixed(2))
            },
            include: {
                booking: {
                    select: {
                        id: true,
                        bookingReference: true,
                        checkIn: true,
                        checkOut: true,
                        totalAmount: true,
                        extraExpense: true,
                        guest: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                phone: true
                            }
                        }
                    }
                }
            }
        });

        console.log(`[Invoice Service] ✅ Invoice created successfully: ${invoice.invoiceNumber}`);
        return invoice;
    } catch (err: any) {
        console.error(`[Invoice Service] ❌ Error creating invoice for booking ${bookingId}:`, err.message);
        throw err;
    }
};

// SERVICE 2: Fetch invoice by booking ID
const getInvoiceByBookingId = async (bookingId: number) => {
    try {
        if (!bookingId) {
            throw createError(400, 'bookingId is required.');
        }

        const invoice = await prisma.invoice.findUnique({
            where: { bookingId },
            include: {
                booking: {
                    include: {
                        guest: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                phone: true,
                                address: true
                            }
                        },
                        bookingRooms: {
                            include: {
                                room: {
                                    select: {
                                        id: true,
                                        roomNumber: true,
                                        roomType: true,
                                        pricePerNight: true
                                    }
                                }
                            }
                        },
                        payments: {
                            select: {
                                id: true,
                                amount: true,
                                paymentMethod: true,
                                paymentStatus: true,
                                transactionId: true,
                                paymentDate: true
                            }
                        }
                    }
                }
            }
        });

        if (!invoice) {
            throw createError(404, `No invoice found for booking ID ${bookingId}.`);
        }

        return invoice;
    } catch (err: any) {
        console.error('[Invoice Service] Error fetching invoice:', err.message);
        throw err;
    }
};

// SERVICE 3: Fetch invoice by invoice number
const getInvoiceByNumber = async (invoiceNumber: string) => {
    try {
        if (!invoiceNumber) {
            throw createError(400, 'invoiceNumber is required.');
        }

        const invoice = await prisma.invoice.findUnique({
            where: { invoiceNumber },
            include: {
                booking: {
                    include: {
                        guest: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                phone: true
                            }
                        }
                    }
                }
            }
        });

        if (!invoice) {
            throw createError(404, `Invoice ${invoiceNumber} not found.`);
        }

        return invoice;
    } catch (err: any) {
        console.error('[Invoice Service] Error fetching invoice by number:', err.message);
        throw err;
    }
};

export {
    generateInvoiceNumber,
    createInvoice,
    getInvoiceByBookingId,
    getInvoiceByNumber
};
