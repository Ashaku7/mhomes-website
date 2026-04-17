import { prisma } from '@/lib/prisma'

const createError = (status: number, message: string) => {
    const error = new Error(message) as any
    error.status = status
    return error
}

const bookingInclude = {
    guest: true,
    bookingRooms: { include: { room: true } },
    payments: true,
}

const formatBooking = (b: any) => ({
    id: b.id,
    bookingReference: b.bookingReference,
    bookingStatus: b.bookingStatus,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    totalGuests: b.totalGuests,
    totalAmount: parseFloat(b.totalAmount.toString()),
    createdAt: b.createdAt,
    extraExpense: b.extraExpense,
    guest: b.guest,
    rooms: b.bookingRooms?.map((br: any) => ({
        id: br.room.id,
        roomNumber: br.room.roomNumber,
        roomType: br.room.roomType,
        pricePerNight: parseFloat(br.room.pricePerNight.toString()),
    })),
    payments: b.payments?.map((p: any) => ({
        id: p.id,
        amount: parseFloat(p.amount.toString()),
        paymentMethod: p.paymentMethod,
        paymentStatus: p.paymentStatus,
    })),
})

const getAllBookings = async ({ status, source, date }: any = {}) => {
    const where: any = {}
    if (status) where.bookingStatus = status
    if (source) where.bookingSource = source
    if (date) {
        const day = new Date(date + 'T00:00:00Z')
        const nextDay = new Date(date + 'T00:00:00Z')
        nextDay.setDate(nextDay.getDate() + 1)
        where.checkIn = { gte: day, lt: nextDay }
    }

    const bookings = await prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { createdAt: 'desc' },
        take: 10,
    })

    return {
        total: bookings.length,
        bookings: bookings.map(formatBooking),
    }
}

const getBookingById = async (id: any) => {
    const booking = await prisma.booking.findUnique({
        where: { id: parseInt(id) },
        include: bookingInclude,
    })

    if (!booking) throw createError(404, 'Booking not found.')
    return formatBooking(booking)
}

const cancelBooking = async (id: any, reason: any) => {
    const booking = await prisma.booking.findUnique({
        where: { id: parseInt(id) },
        include: { payments: true },
    })

    if (!booking) throw createError(404, 'Booking not found.')

    const updated = await prisma.$transaction(async (tx: any) => {
        const updatedBooking = await tx.booking.update({
            where: { id: parseInt(id) },
            data: { bookingStatus: 'cancelled' },
            include: bookingInclude,
        })

        if (booking.payments?.length > 0) {
            await tx.payment.updateMany({
                where: { bookingId: parseInt(id) },
                data: { paymentStatus: 'cancelled' },
            })
        }

        return updatedBooking
    })

    return {
        ...formatBooking(updated),
        message: 'Booking cancelled successfully.',
    }
}

const getDashboardSummary = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [totalBookings, pendingBookings, confirmedBookings, todayCheckIns, totalRevenue] = await Promise.all([
        prisma.booking.count(),
        prisma.booking.count({ where: { bookingStatus: 'pending' } }),
        prisma.booking.count({ where: { bookingStatus: 'confirmed' } }),
        prisma.booking.count({
            where: { checkIn: { gte: today, lt: tomorrow }, bookingStatus: 'confirmed' },
        }),
        prisma.payment.aggregate({
            where: { paymentStatus: 'paid' },
            _sum: { amount: true },
        }),
    ])

    return {
        bookings: {
            total: totalBookings,
            pending: pendingBookings,
            confirmed: confirmedBookings,
        },
        today: {
            checkIns: todayCheckIns,
        },
        revenue: {
            total: parseFloat((totalRevenue._sum.amount ? totalRevenue._sum.amount.toString() : '0')).toFixed(2),
        },
    }
}

const getTodayActivity = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const checkIns = await prisma.booking.findMany({
        where: {
            checkIn: { gte: today, lt: tomorrow },
            bookingStatus: 'confirmed',
        },
        include: bookingInclude,
        orderBy: { checkIn: 'asc' },
    })

    return {
        date: today.toISOString().split('T')[0],
        checkIns: { total: checkIns.length, bookings: checkIns.map(formatBooking) },
    }
}

const normalizePaymentMethod = (method: string | null) => {
    if (!method) return null
    const normalized = method.toLowerCase()
    if (normalized === 'upi') return 'UPI'
    if (normalized === 'card') return 'card'
    if (normalized === 'cash') return 'cash'
    if (normalized === 'gateway') return 'gateway'
    return null
}

const updatePayment = async (paymentId: any, { paymentMethod, transactionId, paymentDate, status }: any) => {
    // Allow confirming a payment by setting status to 'paid'
    if (!status || !['yet_to_pay', 'paid', 'refunded'].includes(status)) {
        throw createError(400, 'Invalid status. Must be "yet_to_pay", "paid", or "refunded".')
    }

    const normalized = normalizePaymentMethod(paymentMethod)
    if (!normalized) {
        throw createError(400, 'Invalid paymentMethod.')
    }

    const payment = await prisma.payment.findUnique({
        where: { id: parseInt(paymentId) },
        include: { booking: true },
    })

    if (!payment) throw createError(404, 'Payment not found.')

    const updated = await prisma.payment.update({
        where: { id: parseInt(paymentId) },
        data: {
            paymentMethod: normalized,
            transactionId: transactionId || null,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            paymentStatus: status,
        },
    })

    // Update booking status to 'confirmed' only if payment is being marked as 'paid'
    if (status === 'paid') {
        await prisma.booking.update({
            where: { id: payment.bookingId },
            data: { bookingStatus: 'confirmed' },
        })
    }

    return {
        id: updated.id,
        paymentStatus: updated.paymentStatus,
        message: 'Payment updated successfully.',
    }
}

const getAllRooms = async () => {
    const rooms = await prisma.room.findMany({ orderBy: { roomNumber: 'asc' } })
    return {
        total: rooms.length,
        rooms: rooms.map((r: any) => ({ ...r, pricePerNight: parseFloat(r.pricePerNight.toString()) })),
    }
}

const updateRoom = async (id: any, { pricePerNight, status, description, maxGuests }: any) => {
    const updated = await prisma.room.update({
        where: { id: parseInt(id) },
        data: {
            ...(pricePerNight !== undefined && { pricePerNight: parseFloat(pricePerNight) }),
            ...(status !== undefined && { status }),
            ...(description !== undefined && { description }),
            ...(maxGuests !== undefined && { maxGuests: parseInt(maxGuests) }),
        },
    })

    return { ...updated, pricePerNight: parseFloat(updated.pricePerNight.toString()) }
}

const getTodayRevenue = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const payments = await prisma.payment.findMany({
        where: {
            paymentStatus: 'paid',
            paymentDate: { gte: today, lt: tomorrow },
        },
    })

    const revenue = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)
    return parseFloat(revenue.toFixed(2))
}

const createWalkinBooking = async ({
    name, email, phone, address, proofType, checkIn, checkOut,
    roomType, quantity, totalGuests, paymentMethod, transactionId, paymentDate }: any) => {
    
    if (!name || !email || !phone) throw createError(400, 'name, email, phone required')
    if (!address) throw createError(400, 'address is required')
    if (!paymentMethod) throw createError(400, 'paymentMethod is required')

    const normalized = normalizePaymentMethod(paymentMethod)
    if (!normalized) throw createError(400, 'Invalid paymentMethod')

    const validRoomTypes = ['premium', 'premium_plus']
    if (!validRoomTypes.includes(roomType)) throw createError(400, 'Invalid roomType')

    const qty = parseInt(quantity)
    if (isNaN(qty) || qty < 1) throw createError(400, 'Invalid quantity')

    const { generateBookingReference } = await import('@/lib/utils/generateBookingReference')
    const bookingReference = await generateBookingReference()

    const ci = new Date(checkIn)
    const co = new Date(checkOut)
    const nights = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24))

    return await prisma.$transaction(async (tx: any) => {
        const lockedRooms = await tx.$queryRawUnsafe(
            `SELECT id, room_number, room_type, price_per_night FROM rooms WHERE status = 'active' FOR UPDATE`
        )

        const availableRooms = lockedRooms.filter((r: any) => r.room_type === roomType)
        if (availableRooms.length < qty) {
            throw createError(409, `Not enough ${roomType} rooms available.`)
        }

        const selectedRooms = availableRooms.slice(0, qty)
        const totalAmount = selectedRooms.reduce((sum: number, r: any) => sum + parseFloat(String(r.price_per_night)) * nights, 0)

        const guest = await tx.guest.create({
            data: { fullName: name.trim(), email: email.trim(), phone: phone.trim(), address: address.trim() },
        })

        const newBooking = await tx.booking.create({
            data: {
                guestId: guest.id,
                bookingReference,
                checkIn: ci,
                checkOut: co,
                totalGuests,
                bookingStatus: 'confirmed',
                bookingSource: 'offline',
                totalAmount: parseFloat(totalAmount.toFixed(2)),
            },
        })

        await tx.bookingRoom.createMany({
            data: selectedRooms.map((r: any) => ({ bookingId: newBooking.id, roomId: r.id })),
        })

        await tx.payment.create({
            data: {
                bookingId: newBooking.id,
                amount: parseFloat(totalAmount.toFixed(2)),
                paymentMethod: normalized,
                paymentStatus: 'paid',
                transactionId: transactionId || null,
                paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            },
        })

        return {
            bookingReference,
            bookingStatus: 'confirmed',
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            message: 'Offline booking created.',
        }
    })
}

const searchPayments = async ({ bookingReference, guestName, phone }: any = {}) => {
    if (!bookingReference && !guestName && !phone) {
        throw createError(400, 'At least one search parameter required')
    }

    const where: any = { AND: [] }

    if (bookingReference) {
        where.AND.push({
            booking: {
                bookingReference: { contains: bookingReference, mode: 'insensitive' },
            },
        })
    }

    if (guestName) {
        where.AND.push({
            booking: {
                guest: {
                    fullName: { contains: guestName, mode: 'insensitive' },
                },
            },
        })
    }

    if (phone) {
        where.AND.push({
            booking: {
                guest: {
                    phone: { contains: phone, mode: 'insensitive' },
                },
            },
        })
    }

    const payments = await prisma.payment.findMany({
        where: where.AND.length > 0 ? where : undefined,
        select: {
            id: true,
            amount: true,
            paymentMethod: true,
            paymentStatus: true,
            transactionId: true,
            paymentDate: true,
            createdAt: true,
            booking: {
                select: {
                    id: true,
                    bookingReference: true,
                    checkIn: true,
                    checkOut: true,
                    bookingStatus: true,
                    totalAmount: true,
                    guest: {
                        select: {
                            id: true,
                            fullName: true,
                            phone: true,
                        },
                    },
                },
            },
        },
        orderBy: { paymentDate: 'desc' },
    })

    return {
        total: payments.length,
        payments: payments.map((p: any) => ({
            id: p.id,
            amount: parseFloat(p.amount.toString()),
            paymentMethod: p.paymentMethod,
            paymentStatus: p.paymentStatus,
            transactionId: p.transactionId,
            paymentDate: p.paymentDate,
            booking: {
                id: p.booking.id,
                bookingReference: p.booking.bookingReference,
                checkIn: p.booking.checkIn,
                checkOut: p.booking.checkOut,
                totalAmount: parseFloat(p.booking.totalAmount.toString()),
                bookingStatus: p.booking.bookingStatus,
                guest: p.booking.guest,
            },
        })),
    }
}

const cancelPayment = async (paymentId: any) => {
    const payment = await prisma.payment.findUnique({
        where: { id: parseInt(paymentId) },
        include: { booking: true },
    })

    if (!payment) throw createError(404, 'Payment not found.')
    
    if (payment.paymentStatus !== 'paid') {
        throw createError(400, 'Only paid payments can be refunded.')
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx: any) => {
        // Update payment status to refunded
        const updatedPayment = await tx.payment.update({
            where: { id: parseInt(paymentId) },
            data: { paymentStatus: 'refunded' },
        })

        // Cancel the booking
        await tx.booking.update({
            where: { id: payment.bookingId },
            data: { bookingStatus: 'cancelled' },
        })

        // Free up the rooms by deleting booking room assignments
        await tx.bookingRoom.deleteMany({
            where: { bookingId: payment.bookingId },
        })

        return updatedPayment
    })

    return {
        id: result.id,
        paymentStatus: 'refunded',
        message: 'Payment refunded and booking cancelled. Rooms have been freed.',
    }
}

const updateBookingStatus = async (id: number, newStatus: string, extraExpense?: string) => {
    const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled']
    if (!validStatuses.includes(newStatus)) {
        throw createError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`)
    }

    const updateData: any = { bookingStatus: newStatus }
    if (newStatus === 'checked_out' && extraExpense) {
        updateData.extraExpense = extraExpense
    }

    const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
            guest: true,
            bookingRooms: { include: { room: true } },
            payments: true,
        },
    })

    if (!booking) throw createError(404, 'Booking not found.')

    const updated = await prisma.booking.update({
        where: { id },
        data: updateData,
        include: {
            guest: true,
            bookingRooms: { include: { room: true } },
            payments: true,
        },
    })

    // Auto-create invoice on checkout
    if (newStatus === 'checked_out') {
        try {
            console.log(`[Admin Service] 🔍 Attempting to create invoice for booking ${id}...`)
            
            // Check if invoice already exists
            const existingInvoice = await prisma.invoice.findUnique({
                where: { bookingId: id }
            })
            
            if (!existingInvoice) {
                console.log(`[Admin Service] 📌 No existing invoice found, creating new one...`)
                
                // Calculate final total: room charges + extra expenses
                let finalTotal = parseFloat(updated.totalAmount.toString())
                console.log(`[Admin Service] 💰 Room charges: ₹${finalTotal}`)
                
                // Parse extra expenses if any
                if (updated.extraExpense && updated.extraExpense !== 'No expense') {
                    const expenses = updated.extraExpense.split(',').map((exp: string) => exp.trim())
                    let extraTotal = 0
                    
                    expenses.forEach((exp: string) => {
                        // Format: "travel-250" or "parking-100" etc
                        const parts = exp.split('-')
                        if (parts.length === 2) {
                            const amount = parseFloat(parts[1])
                            if (!isNaN(amount)) {
                                extraTotal += amount
                                console.log(`[Admin Service]   + ${parts[0]}: ₹${amount}`)
                            }
                        }
                    })
                    
                    finalTotal += extraTotal
                    console.log(`[Admin Service] 💰 Extra expense total: ₹${extraTotal}`)
                }
                
                console.log(`[Admin Service] 💰 Final invoice total: ₹${finalTotal}`)
                
                // Create invoice with final total
                const invoice = await prisma.invoice.create({
                    data: {
                        invoiceNumber: await generateInvoiceNumber(),
                        bookingId: id,
                        totalAmount: finalTotal,
                    },
                    include: {
                        booking: {
                            select: {
                                id: true,
                                bookingReference: true,
                                checkIn: true,
                                checkOut: true,
                                guest: { select: { id: true, fullName: true, email: true, phone: true } }
                            }
                        }
                    }
                })
                
                console.log(`[Admin Service] ✅ Invoice auto-created for booking ${id}: ${invoice.invoiceNumber}`)
            } else {
                console.log(`[Admin Service] ⚠️ Invoice already exists for booking ${id}: ${existingInvoice.invoiceNumber}`)
            }
        } catch (err: any) {
            console.error(`[Admin Service] ❌ Failed to auto-create invoice for booking ${id}:`)
            console.error(`    Error: ${err.message}`)
            // Don't throw — checkout should succeed even if invoice creation fails
        }
    }

    return {
        ...formatBooking(updated),
        message: `Booking status updated to ${newStatus}.`,
    }
}

const generateInvoiceNumber = async () => {
    const today = new Date()
    const day = String(today.getDate()).padStart(2, '0')
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const year = String(today.getFullYear()).slice(-2)
    const dateStr = `${day}${month}${year}`

    try {
        console.log(`[Invoice] 🔢 Generating invoice number for date: ${dateStr}`)
        const counter = await prisma.dailyCounter.upsert({
            where: { date: dateStr },
            update: { count: { increment: 1 } },
            create: { date: dateStr, count: 1 }
        })

        const invoiceNumber = `INV-${dateStr}-${String(counter.count).padStart(3, '0')}`
        console.log(`[Invoice] ✅ Generated invoice number: ${invoiceNumber} (count: ${counter.count})`)
        return invoiceNumber
    } catch (err: any) {
        console.error('[Invoice] ❌ Error generating invoice number:', err.message)
        throw err
    }
}

const checkInGuest = async (bookingId: number, data: any) => {
    const { address, proofType, totalGuests, roomIds } = data

    if (!bookingId) {
        throw createError(400, 'bookingId is required.')
    }

    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            guest: true,
            bookingRooms: { select: { roomId: true } },
            payments: true,
        },
    })

    if (!booking) {
        throw createError(404, 'Booking not found.')
    }

    console.log(`[checkInGuest] 📋 Booking ${bookingId}: ${booking.bookingReference}`)
    console.log(`[checkInGuest] 📥 Received roomIds:`, roomIds)

    if (booking.bookingStatus !== 'confirmed') {
        throw createError(409, 'Booking must be in "confirmed" status to check-in.')
    }

    if (proofType) {
        const validProofTypes = ['aadhaar', 'passport', 'driving_license', 'voter_id']
        if (!validProofTypes.includes(proofType)) {
            throw createError(400, `proofType must be one of: ${validProofTypes.join(', ')}`)
        }
    }

    const currentRoomIds = booking.bookingRooms?.map((br: any) => br.roomId) || []
    console.log(`[checkInGuest] 🏠 Current room IDs in DB:`, currentRoomIds)
    
    const requiredRoomCount = currentRoomIds.length

    const selectedRoomIds = Array.isArray(roomIds)
        ? [...new Set(roomIds.map((id: any) => parseInt(id)).filter((id: number) => Number.isInteger(id) && id > 0))]
        : currentRoomIds

    console.log(`[checkInGuest] 🎯 Selected room IDs:`, selectedRoomIds)

    if (selectedRoomIds.length !== requiredRoomCount) {
        throw createError(400, `Exactly ${requiredRoomCount} room(s) must be selected for check-in.`)
    }

    // Check if room selection changed
    const isRoomSelectionChanged =
        selectedRoomIds.length !== currentRoomIds.length ||
        selectedRoomIds.some((id) => !currentRoomIds.includes(id))
    
    console.log(`[checkInGuest] 🔄 Room selection changed?`, isRoomSelectionChanged)

    // Update Guest
    await prisma.guest.update({
        where: { id: booking.guestId },
        data: {
            address: address || booking.guest.address,
            idProofType: proofType || booking.guest.idProofType,
        },
    })

    // If rooms changed, update bookingRooms and recalculate price
    let newTotalAmount = parseFloat(booking.totalAmount.toString())
    let roomsUpdateData: any = {}

    if (isRoomSelectionChanged) {
        console.log(`[checkInGuest] 🗑️  Deleting old room assignments...`)
        await prisma.bookingRoom.deleteMany({
            where: { bookingId },
        })

        console.log(`[checkInGuest] ✏️  Creating new room assignments:`, selectedRoomIds)
        await prisma.bookingRoom.createMany({
            data: selectedRoomIds.map((roomId: number) => ({
                bookingId,
                roomId,
            })),
        })

        // Fetch the new rooms to get their prices
        console.log(`[checkInGuest] 💰 Recalculating price based on new rooms...`)
        const newRooms = await prisma.room.findMany({
            where: { id: { in: selectedRoomIds } },
            select: { pricePerNight: true },
        })

        // Calculate number of nights
        const checkInDate = new Date(booking.checkIn)
        const checkOutDate = new Date(booking.checkOut)
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

        // Calculate new total amount (sum of all room prices * number of nights)
        const totalRoomPrice = newRooms.reduce((sum, room) => sum + parseFloat(room.pricePerNight.toString()), 0)
        newTotalAmount = parseFloat((totalRoomPrice * nights).toFixed(2))

        console.log(`[checkInGuest] 📊 New total: ${newRooms.length} room(s) × ${nights} night(s) × ₹${totalRoomPrice}/night = ₹${newTotalAmount}`)
        roomsUpdateData.totalAmount = newTotalAmount

        // Update payment amounts for pending payments
        if (booking.payments && booking.payments.length > 0) {
            console.log(`[checkInGuest] 💳 Updating payment amount(s) from ₹${booking.totalAmount} to ₹${newTotalAmount}...`)
            await prisma.payment.updateMany({
                where: {
                    bookingId,
                    paymentStatus: 'yet_to_pay',
                },
                data: {
                    amount: newTotalAmount,
                },
            })
        }
    }

    // Update Booking status to checked_in and update price if rooms changed
    const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
            bookingStatus: 'checked_in',
            totalGuests: totalGuests ? parseInt(totalGuests) : booking.totalGuests,
            ...roomsUpdateData,
        },
        include: {
            guest: true,
            bookingRooms: { include: { room: true } },
            payments: true,
        },
    })

    console.log(`[checkInGuest] ✅ Check-in complete. Final amount: ₹${updatedBooking.totalAmount}, Final rooms:`, updatedBooking.bookingRooms?.map(br => br.room.roomNumber))

    return {
        ...formatBooking(updatedBooking),
        message: isRoomSelectionChanged
            ? 'Guest checked in and room assignment updated successfully.'
            : 'Guest checked in successfully.',
    }
}

const getCheckInRoomOptions = async (bookingId: number) => {
    if (!bookingId) {
        throw createError(400, 'bookingId is required.')
    }

    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            guest: true,
            bookingRooms: { include: { room: true } },
            payments: true,
        },
    })

    if (!booking) {
        throw createError(404, 'Booking not found.')
    }

    if (booking.bookingStatus !== 'confirmed') {
        throw createError(409, 'Room reassignment is only available for "confirmed" bookings during check-in.')
    }

    const currentRooms = booking.bookingRooms.map((br: any) => br.room)
    const currentRoomIdSet = new Set(currentRooms.map((r: any) => r.id))

    // Find conflicting bookings (exclude checked_out since guest already left)
    const conflictingRoomRows = await prisma.bookingRoom.findMany({
        where: {
            bookingId: { not: bookingId },
            booking: {
                bookingStatus: { in: ['pending', 'confirmed', 'checked_in'] },
                checkIn: { lt: booking.checkOut },
                checkOut: { gt: booking.checkIn },
            },
        },
        select: { roomId: true },
    })

    const blockedRoomIdSet = new Set(conflictingRoomRows.map((row: any) => row.roomId))

    const freeRooms = await prisma.room.findMany({
        where: {
            status: 'active',
            id: { notIn: Array.from(blockedRoomIdSet) },
        },
        orderBy: { roomNumber: 'asc' },
    })

    const mergedRoomMap = new Map()
    currentRooms.forEach((room: any) => mergedRoomMap.set(room.id, room))
    freeRooms.forEach((room: any) => mergedRoomMap.set(room.id, room))

    const availableRooms = Array.from(mergedRoomMap.values())
        .sort((a: any, b: any) => parseInt(a.roomNumber) - parseInt(b.roomNumber))
        .map((room: any) => ({
            id: room.id,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            pricePerNight: parseFloat(room.pricePerNight.toString()),
            maxGuests: room.maxGuests,
            status: room.status,
            isCurrent: currentRoomIdSet.has(room.id),
        }))

    return {
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        guest: booking.guest,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        requiredRooms: booking.bookingRooms.length,
        currentRoomIds: Array.from(currentRoomIdSet),
        availableRooms,
    }
}

export {
    getAllBookings,
    getBookingById,
    cancelBooking,
    getDashboardSummary,
    getTodayActivity,
    getAllRooms,
    updateRoom,
    updatePayment,
    getTodayRevenue,
    createWalkinBooking,
    searchPayments,
    cancelPayment,
    updateBookingStatus,
    checkInGuest,
    getCheckInRoomOptions,
}
