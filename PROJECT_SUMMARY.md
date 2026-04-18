# MHOMES Resort - Complete Project Summary

## PROJECT OVERVIEW

**MHOMES Resort** is a full-stack luxury resort booking and management system with an integrated admin dashboard. It handles online guest bookings, walk-in registrations, payment management, room occupancy tracking, and reservation administration.

**Live Dates:** Development started March 2026 | Security implementation completed April 13, 2026

---

## TECH STACK

### **Frontend**
- **Framework:** Next.js 15.5.2 (React 19)
- **Authentication:** Clerk (@clerk/nextjs ^6.31.4) with Google OAuth
- **Styling:** TailwindCSS v4 + custom components (Radix UI)
- **State Management:** React Context (AuthContext for JWT, built-in hooks for Clerk)
- **API Client:** Axios with interceptors
- **Form Handling:** React Hook Form + Zod validation
- **UI Components:** Custom Radix UI component library
- **Charts:** Recharts, Framer Motion animations

### **Backend**
- **Runtime:** Node.js + Express.js ^5.2.1
- **ORM:** Prisma 5.22.0
- **Database:** PostgreSQL
- **Authentication:** Clerk SDK (@clerk/clerk-sdk-node) + JWT
- **Email:** Resend API
- **Security:** Helmet, CORS, Rate Limiting (express-rate-limit)
- **Validation:** Custom middleware + Zod

### **Deployment-Ready**
- **Environment:** Development (localhost) | Production-ready
- **Database:** PostgreSQL (self-hosted or managed)
- **API:** RESTful with JSON responses

---

## DATABASE SCHEMA (PRISMA)

### **Tables:**
1. **Guest** - Guest information (phone, email, address, ID proof type)
2. **GuestMember** - Family members traveling with guest
3. **Room** - Physical room inventory (room number, type, price, status)
4. **Booking** - Guest booking records (check-in/out dates, status, source)
5. **BookingRoom** - Junction table (which rooms assigned to which bookings)
6. **Payment** - Payment records (method, status, transaction ID)
7. **DailyCounter** - Counter for booking reference generation
8. **Invoice** - Invoice records (auto-generated INV-YYMMDD-XXXX format)
9. **AdminUser** - Admin whitelist (email-based access control)

### **Key Constraints:**
- Guest → multiple Bookings (1:N)
- Booking → multiple Rooms (M:N via BookingRoom)
- Booking → multiple Payments (1:N)
- Booking → Guest (N:1)
- Room unique by roomNumber
- AdminUser unique by email (security whitelist)

### **Enums:**
```
Role: guest, admin, reception
RoomType: premium, premium_plus
RoomStatus: active, maintenance
BookingStatus: pending, confirmed, cancelled, checked_in, checked_out
BookingSource: online, offline
PaymentMethod: UPI, card, cash, gateway
PaymentStatus: yet_to_pay, paid, refunded, cancelled
IdProofType: aadhaar, passport, driving_license, voter_id
```

---

## ARCHITECTURE OVERVIEW

### **Frontend Flow:**
```
User → Clerk SignIn (/admin/login) 
  → Clerk OAuth/Google → Clerk Session Token
  → Redirect to /admin → Middleware checks Clerk auth
  → Admin Dashboard (if authorized)
  → All API calls via createAdminApi(clerkToken)
  → Authorization: Bearer <clerk_token> header
```

### **Backend Flow:**
```
Request arrives → Middleware chain:
  1. Helmet (security headers)
  2. CORS validation
  3. Rate limiting
  4. clerkAuth (if admin route)
     - Extract Bearer token from Authorization header
     - Verify token signature with CLERK_SECRET_KEY
     - Fetch user from Clerk API
     - Check AdminUser table (email whitelist)
     - Check isActive=true
     - Attach req.user
  5. Route handler executes
  6. Response sent
```

### **Session Management:**
- **Frontend Auth:** Clerk manages sessions (24-hour token expiry)
- **Backend Auth:** Clerk SDK verifies token signature + AdminUser table enforcement
- **No JWT cookies:** Pure token-based (Authorization header)

---

## API ENDPOINTS

### **PUBLIC ROUTES (No auth required)**
```
GET    /api/rooms/search?checkIn=...&checkOut=...&roomType=...&quantity=...
GET    /api/rooms/available
GET    /api/bookings/pending
POST   /api/bookings/online            [name, email, phone, roomType, quantity]
POST   /api/contact                     [email form submission]
GET    /api/reviews                     [fetches from Google Places API]
GET    /health                          [health check]
```

### **ADMIN ROUTES (Clerk token + AdminUser whitelist required)**
```
GET    /api/admin/dashboard             [overview, revenue, bookings summary]
GET    /api/admin/bookings?status=...   [filter by status/source/date]
GET    /api/admin/bookings/:id          [specific booking details]
GET    /api/admin/bookings/today        [check-ins and check-outs]
PATCH  /api/admin/bookings/:id          [update booking status]
PATCH  /api/admin/bookings/:id/cancel   [cancel with reason]
PATCH  /api/admin/bookings/:id/checkin  [check-in guest, assign rooms]
PATCH  /api/admin/bookings/:id/confirm-payment
POST   /api/admin/bookings/walkin       [offline booking creation]

GET    /api/admin/rooms                 [all rooms with status]
PATCH  /api/admin/rooms/:id             [update room details]

GET    /api/admin/payments/search       [search payments]
GET    /api/admin/payments/today-revenue[today's revenue]
PATCH  /api/admin/payments/:id          [update payment details]
PATCH  /api/admin/payments/:id/cancel   [cancel payment]

POST   /api/admin/invoices              [create invoice for booking]
GET    /api/admin/invoices/:bookingId   [fetch invoice by booking ID]
GET    /api/admin/invoices/number/:invoiceNumber [fetch invoice by number]

GET    /api/auth/verify-admin           [verify current admin + check whitelist]
```

---

## SECURITY IMPLEMENTATION (COMPLETED April 13, 2026)

### **4-Layer Protection System:**

**Layer 1: Clerk Frontend Auth**
- Google OAuth sign-in at `/admin/login`
- Clerk handles user verification, 2FA options, bot protection
- Session tokens auto-refreshed

**Layer 2: Token Signature Verification**
- Backend uses `CLERK_SECRET_KEY` to verify JWT signature
- Invalid/expired tokens rejected immediately (401)
- Prevents token forgery

**Layer 3: User Verification**
- Clerk SDK fetches full user object to get email
- Confirms user exists in Clerk system
- Failed lookups return 401

**Layer 4: AdminUser Whitelist**
- Email checked against AdminUser table
- Only whitelisted emails get access (403 if not found)
- Can revoke access instantly by setting `isActive=false`

### **Attack Vectors Blocked:**
- ✅ Forged tokens (crypto validation)
- ✅ Fake emails in headers (verified from Clerk API)
- ✅ Unauthorized access (AdminUser table check)
- ✅ Token replay (24-hour expiry + signature check)
- ✅ SQL injection (Prisma ORM with parameterized queries)
- ✅ CSRF attacks (Clerk manages CSRF tokens)
- ✅ Man-in-the-middle (HTTPS required in production)

---

## KEY FEATURES IMPLEMENTED

### **Guest Booking System**
- Online booking form (date range, room type, guest count)
- Automatic room allocation with availability checking
- Generates unique booking references (MH-YYYY-XXXX format)
- Payment status tracking (yet_to_pay → paid → refunded)

### **Admin Dashboard**
- Real-time booking statistics (pending, confirmed, cancelled)
- Today's check-ins and check-outs
- Revenue tracking
- Room occupancy status visualization
- Pending bookings notification panel

### **Payment Management**
- Multiple payment methods (UPI, card, cash, gateway)
- Payment status updates by admin
- Transaction ID tracking
- Today's revenue reporting

### **Room Management**
- Room status tracking (active, maintenance)
- Room type filtering
- Dynamic price updates
- Occupancy visualization

### **Guest Check-in/Check-out**
- Check-in: Assign rooms, collect additional info
- Check-out: Calculate extra expenses, bill generation
- Print bill with header/footer images
- Booking reference tracking

### **Invoice System**
- Auto-generated invoice numbers (INV-YYMMDD-XXXX format)
- One invoice per booking
- Captures total amount (rooms + extra expenses)
- Invoice creation triggered on checkout (`bookingStatus = checked_out`)
- Manual invoice creation via API if needed
- Fetch invoices by booking ID or invoice number

### **Walk-in Booking**
- Admin can create offline bookings
- Same payment and room allocation logic
- Marked as `bookingSource: offline`

---

## ENVIRONMENT VARIABLES

### **Frontend (.env.local)**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/admin/login
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/admin
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=...
NEXT_PUBLIC_EMAILJS_SERVICE_ID=...
NEXT_PUBLIC_ADMIN_EMAIL=akash.ark.g@gmail.com
```

### **Backend (.env)**
```
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://user:pass@localhost:5432/MHOMES_db
JWT_SECRET=MHOMES_super_secret_key
CLERK_SECRET_KEY=sk_test_...
ADMIN_ALLOWED_EMAILS=akash.ark.g@gmail.com
RESEND_API_KEY=...
RECAPTCHA_SECRET_KEY=...
```

---

## PROJECT STATUS

### **Completed ✅**
- [x] Database schema (Prisma + PostgreSQL)
- [x] Room search and availability logic
- [x] Online booking flow
- [x] Walk-in booking (offline)
- [x] Payment tracking and updates
- [x] Check-in/check-out process
- [x] Admin dashboard UI
- [x] Booking reference generation (MH-YYYY-XXXX)
- [x] Invoice feature (auto-generated INV-YYMMDD-XXXX on checkout)
- [x] Frontend authentication (Clerk)
- [x] Backend Clerk integration (@clerk/clerk-sdk-node)
- [x] AdminUser table whitelist
- [x] clerkAuth middleware (4-layer protection)
- [x] All admin routes protected
- [x] Frontend token passing (Authorization header)
- [x] Security testing (verified 403 for unauthorized users)
- [x] Production-ready status

### **Ready for Production**
- Database: PostgreSQL configured
- Authentication: Clerk (free tier, 10k users included)
- API: All endpoints secured
- Frontend: All pages protected where needed
- Compliance: GDPR-ready (Clerk handles data)

### **Future Enhancements (Optional)**
- [ ] Invoice PDF download/email delivery
- [ ] Invoice templates customization
- [ ] Tax calculation and GST integration
- [ ] Refund processing with invoice cancellation
- [ ] 2FA implementation
- [ ] Role-based permissions (admin, receptionist, manager)
- [ ] Activity audit logs
- [ ] IP allowlisting for admin
- [ ] Device fingerprinting
- [ ] Webhook integrations
- [ ] Multi-property support
- [ ] Mobile app (React Native)
- [ ] Booking analytics and reports
- [ ] Automated email notifications

---

## HOW TO USE THIS SUMMARY

You can share this with any AI and ask it to:
- **Improve features:** "Add a guest loyalty program to the booking system"
- **Optimize code:** "Refactor the room allocation algorithm for better performance"
- **Add functionality:** "Implement automated check-in reminders via email"
- **Fix bugs:** "The payment dashboard is slow, optimize the query"
- **Expand scope:** "Add multiple properties support"
- **Deploy:** "Set up CI/CD pipeline for production deployment"
- **Scale:** "How do we handle 10,000 concurrent bookings?"
- **Security:** "Add rate limiting to prevent brute force attacks"
- **Analytics:** "Create a booking trends dashboard"

---

## QUICK START FOR DEVELOPERS

```bash
# Frontend
cd MHOMES-resort
npm install
npm run dev                    # http://localhost:3000

# Backend
cd backend
npm install
npx prisma migrate dev
npm start                      # http://localhost:5000

# Sign in at http://localhost:3000/admin
# Email: akash.ark.g@gmail.com (whitelisted in AdminUser table)
```

---

## CONTACT & DEPLOYMENT

- **GitHub:** [Add your repo if public]
- **Live URL:** [Will be updated after deployment]
- **Admin Email:** akash.ark.g@gmail.com
- **Support:** [Your contact info]

---

**Last Updated:** April 13, 2026  
**Security Status:** ✅ Production-Ready  
**Free Tier Status:** ✅ Clerk (10k users) + PostgreSQL (self-hosted)
