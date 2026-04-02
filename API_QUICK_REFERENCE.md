# MHomes API Quick Reference

## Public Endpoints (No Auth Required)

### 1. Search Available Rooms
```
GET /api/rooms/search?checkIn=2026-04-01&checkOut=2026-04-05&roomType=premium&quantity=2

Response:
{
  "success": true,
  "data": {
    "rooms": [
      { "id": 1, "roomNumber": "101", "roomType": "premium", "pricePerNight": 5000, "maxGuests": 2 },
      { "id": 2, "roomNumber": "102", "roomType": "premium", "pricePerNight": 5000, "maxGuests": 2 }
    ],
    "mixed": false,
    "note": null,
    "totalAmount": 40000
  }
}
```

### 2. Create Online Booking
```
POST /api/bookings/online
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "checkIn": "2026-04-01",
  "checkOut": "2026-04-05",
  "roomType": "premium",
  "quantity": 2,
  "totalGuests": 4
}

Response:
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "bookingReference": "MH-2026-0001",
    "guestName": "John Doe",
    "checkIn": "2026-04-01",
    "checkOut": "2026-04-05",
    "rooms": [
      { "roomNumber": "101", "roomType": "premium", "pricePerNight": 5000 },
      { "roomNumber": "102", "roomType": "premium", "pricePerNight": 5000 }
    ],
    "totalAmount": 40000,
    "paymentStatus": "yet_to_pay",
    "mixed": false,
    "note": null
  }
}
```

---

## Admin Endpoints (JWT Auth Required)

### Authentication
Add header to all admin requests:
```
Authorization: Bearer <jwt_token>
```

### 1. View All Bookings
```
GET /api/admin/bookings?status=confirmed&source=online&date=2026-03-29
Authorization: Bearer <token>

Query params (all optional):
- status: "pending" | "confirmed" | "cancelled" | "checked_in" | "checked_out"
- source: "online" | "walk_in"
- date: YYYY-MM-DD
```

### 2. View Booking Details
```
GET /api/admin/bookings/:id
Authorization: Bearer <token>
```

### 3. Create Walk-in Booking
```
POST /api/admin/bookings/walkin
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Raj Kumar",
  "email": "raj@example.com",
  "phone": "9876543210",
  "address": "123 Main Street",
  "proofType": "aadhaar",
  "proofNumber": "AAXX1234",
  "checkIn": "2026-03-29",
  "checkOut": "2026-03-31",
  "roomType": "premium",
  "quantity": 1,
  "totalGuests": 2,
  "paymentMethod": "cash",
  "transactionId": null,
  "paymentDate": "2026-03-29"
}

Response:
{
  "success": true,
  "data": {
    "bookingReference": "MH-2026-0002",
    "guestName": "Raj Kumar",
    "checkIn": "2026-03-29",
    "checkOut": "2026-03-31",
    "rooms": [{ "roomNumber": "101", "roomType": "premium", "pricePerNight": 5000 }],
    "totalAmount": 10000,
    "paymentStatus": "paid",
    "paymentMethod": "cash",
    "message": "Walk-in booking created and payment recorded."
  }
}
```

### 4. Update Payment After Collection
```
PATCH /api/admin/payments/:paymentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentMethod": "cash",
  "transactionId": null,
  "paymentDate": "2026-03-29T14:30:00Z",
  "status": "paid"
}

Response:
{
  "success": true,
  "data": {
    "id": 5,
    "bookingId": 3,
    "amount": 40000,
    "paymentMethod": "cash",
    "paymentStatus": "paid",
    "transactionId": null,
    "paymentDate": "2026-03-29T14:30:00Z",
    "message": "Payment updated successfully."
  }
}
```

### 5. Guest Check-in
```
PATCH /api/admin/bookings/:id/checkin
Authorization: Bearer <token>
Content-Type: application/json

{
  "address": "Updated address if needed",
  "proofType": "aadhaar",
  "proofNumber": "AAXX1234",
  "totalGuests": 4
}

Response: Full booking details with bookingStatus: "checked_in"
```

### 6. Cancel Booking
```
PATCH /api/admin/bookings/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Guest requested cancellation"
}
```

### 7. View Dashboard Summary
```
GET /api/admin/dashboard
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "bookings": {
      "total": 25,
      "pending": 3,
      "confirmed": 15,
      "cancelled": 2
    },
    "today": {
      "checkIns": 5,
      "checkOuts": 3
    },
    "revenue": {
      "total": "250000.00"
    },
    "rooms": {
      "total": 10,
      "active": 9,
      "maintenance": 1
    }
  }
}
```

### 8. View Today's Check-ins/Check-outs
```
GET /api/admin/bookings/today
Authorization: Bearer <token>
```

### 9. View All Rooms
```
GET /api/admin/rooms
Authorization: Bearer <token>
```

### 10. Update Room
```
PATCH /api/admin/rooms/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "pricePerNight": 6000,
  "status": "maintenance",
  "description": "Recently renovated",
  "maxGuests": 3
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description here"
}
```

### Common Status Codes
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (missing/invalid auth)
- 403: Forbidden (not admin)
- 404: Not Found
- 409: Conflict (e.g., double booking, invalid status)
- 500: Server Error

---

## Important Notes

### ✅ Double-Booking Prevention
- All active rooms are locked at transaction start
- Room allocation happens inside transaction
- Availability re-checked before confirming
- Race conditions impossible due to PostgreSQL FOR UPDATE

### ✅ Booking Reference Format
- Format: `MH-YYYY-XXXX`
- Example: `MH-2026-0001`, `MH-2026-0002`
- Auto-generated, guaranteed unique
- Sequential per year

### ✅ Payment Status Flow
- **Online Booking**: Status = "yet_to_pay" → Admin calls PATCH to mark "paid"
- **Walk-in Booking**: Status = "paid" immediately (no follow-up needed)

### ✅ Room Allocation Logic
When user requests 2 premium rooms but only 1 available:
- If premium_plus available → Allocates 1 premium + 1 premium_plus, sets `mixed: true`
- If premium_plus NOT available → Returns error

---

## Setup Required

1. **Database Migration**
```bash
cd backend
npx prisma migrate dev --name complete_audit_implementation
```

2. **Environment Variables** (.env)
```
JWT_SECRET=your-very-secure-secret-key
DATABASE_URL=postgresql://...
```

3. **Admin Login** (implement this endpoint)
- Should return JWT token with `role: "admin"`
- Token used in Authorization header for protected endpoints
