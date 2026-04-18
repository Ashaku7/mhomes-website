# MHOMES Resort - Luxury Destination Website

A sophisticated, modern luxury resort booking website featuring a responsive design, smooth animations, and an intuitive multi-step reservation system. Built with cutting-edge web technologies to deliver an immersive user experience.

---

## 📋 Project Overview

**MHOMES Resort** is a full-featured booking platform that showcases a tropical paradise resort with:

- **Hero Section**: Captivating landing page with video background and search form
- **10 Luxury Sections**: Comprehensive website with resort amenities, room details, reviews, and more
- **Multi-Step Reservation System**: Intuitive 3-step booking flow (Search → Room Selection → Guest Details)
- **Reviews Management**: Full CRUD functionality for guest reviews with star ratings
- **Responsive Design**: Mobile-first approach with fluid breakpoints across all devices
- **Advanced Animations**: Smooth transitions and interactive elements throughout
- **Real-time Search**: Dynamic filtering and selection with instant price calculations

---

## 🛠️ Tech Stack

### Frontend Framework
- **Next.js 15.5.2** - React meta-framework with server/client components, built-in optimization
- **React 19.1.0** - UI library with hooks and latest features
- **TypeScript** - Type-safe development with improved IDE support

### Styling & Animation
- **Tailwind CSS 4** - Utility-first CSS framework for rapid UI development
- **Framer Motion 12.23.12** - Production-ready animation library for React
- **PostCSS** - CSS transformation tool

### UI Components
- **Radix UI** - Accessible, unstyled component primitives
- **shadcn/ui** - High-quality React components built on Radix UI and Tailwind
- **Lucide Icons** - Beautiful, consistent SVG icon library

### Build & Development
- **Turbopack** - Next.js bundler (faster than Webpack)
- **ESLint** - Code quality and consistency
- **TypeScript Compiler** - Static type checking

### Data & Storage
- **localStorage** - Client-side persistent storage for reservations and reviews
- **JSON** - Data serialization format

---

## 📁 Project Structure

```
MHOMES-resort/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with global styles
│   │   ├── page.tsx                # Main landing page (1868 lines)
│   │   ├── globals.css             # Global styles
│   │   ├── api/
│   │   │   └── [[...path]]/
│   │   │       └── route.tsx        # API routes
│   │   ├── reviews/
│   │   │   └── page.tsx            # Reviews page with CRUD (465 lines)
│   │   └── reservation/
│   │       └── page.tsx            # Reservation booking page (710 lines)
│   ├── components/
│   │   ├── ChatWidget.tsx          # AI chat widget component
│   │   └── ui/                     # shadcn/ui components
│   │       ├── accordion.tsx
│   │       ├── alert-dialog.tsx
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── carousel.tsx
│   │       ├── checkbox.tsx
│   │       ├── dialog.tsx
│   │       ├── drawer.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── navigation-menu.tsx
│   │       ├── pagination.tsx
│   │       ├── popover.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── sidebar.tsx
│   │       ├── skeleton.tsx
│   │       ├── slider.tsx
│   │       ├── switch.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── textarea.tsx
│   │       ├── toggle.tsx
│   │       └── tooltip.tsx
│   ├── hooks/
│   │   ├── use-mobile.ts
│   │   └── use-toast.tsx
│   └── lib/
│       └── utils.ts                # Utility functions
├── public/                         # Static assets
├── components.json                 # shadcn/ui config
├── eslint.config.mjs              # ESLint configuration
├── next.config.ts                 # Next.js configuration
├── postcss.config.mjs             # PostCSS configuration
├── tsconfig.json                  # TypeScript configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── package.json                   # Dependencies and scripts
└── README.md                      # This file
```

---

## 🎨 10 Luxury Sections

The website features 10 comprehensive sections:

1. **Navigation Bar** - Fixed header with logo, menu, and "Reserve now" CTA button
2. **Hero Section** - Video background with resort name, tagline, and search form
3. **Luxury Redefined** - Amenities showcase with 5 circular icon cards
4. **Story Section** - 4-part narrative (4 of M) with images and descriptions
5. **Accommodations** - Room cards display (Premium Room, Premium Plus Room) with details
6. **Services** - 4-column service showcase (Concierge, Spa, Restaurant, etc.)
7. **Highlights** - Key features with icons and descriptions
8. **Gallery** - Photo carousel showcasing resort locations
9. **Reviews** - Guest testimonials with star ratings (linked to /reviews)
10. **Footer** - Contact info, social links, and booking CTA

---

## 🚀 Key Features

### 1. **Responsive Hero Search Bar**
- Desktop: 5-column layout (Check-in, Check-out, Guests, empty space, Search button)
- Tablet: 4-column layout with adjusted spacing
- Mobile: 3-column layout with full-width button below
- Scales proportionally across all screen sizes

### 2. **Multi-Step Reservation System**

#### Step 1: Search (Dates & Guests)
- Date picker for check-in and check-out
- Guest count selector (1-6 guests)
- Real-time night count calculation
- Summary sidebar with booking details

#### Step 2: Room Selection (Hotel.com-style)
- Dynamic room display based on guest count
- Two room types:
  - **Premium Room**: ₹450/night, max 2 guests
  - **Deluxe Twin Room**: ₹650/night, max 3 guests
- Automatic calculation of required rooms
- Room images, amenities, and pricing
- 15% early booking discount applied
- Room selection updates pricing instantly

#### Step 3: Guest Information
- First name and last name
- Email address and phone number
- Special requests (optional)
- Form validation before submission
- Auto-populates from home page search

### 3. **Reviews Management Page** (/reviews)
- Submit new reviews with name, email, and star rating (1-5 stars)
- Filter reviews by star rating
- Display all submitted reviews with timestamps
- localStorage persistence for reviews
- Success notifications
- Responsive grid layout

### 4. **Advanced Animations**
- Page load animations (fade, slide, scale)
- Hover effects on buttons and cards
- Scroll-triggered animations
- Floating particle effects in hero section
- Smooth transitions between steps
- Loading animations with gradient bars

### 5. **Chat Widget**
- AI chat interface in bottom-right corner
- React.memo optimization for performance
- Expandable/collapsible design
- Message history
- Memoized to prevent unnecessary re-renders

### 6. **Professional Loading Animation**
- Gradient background with animated patterns
- Floating orbs with smooth animations
- Animated loading bars
- Particle effects (hydration-safe)
- Smooth fade-in/out transitions

---

## 🎯 Room Configuration

### Premium Room
```typescript
{
  name: 'Premium Room',
  maxOccupancy: 2,
  price: 450,
  description: 'Spacious room with private balcony',
  amenities: [
    'Oceanfront Views',
    'Breakfast Included',
    'High-Speed WiFi',
    'Private Balcony',
    'Mini Bar',
    'Work Desk'
  ]
}
```

### Deluxe Twin Room
```typescript
{
  name: 'Deluxe Twin Room',
  maxOccupancy: 3,
  price: 650,
  description: 'Luxury suite with panoramic views',
  amenities: [
    'Traditional Palace Welcome',
    'Breakfast Included for Guests',
    'Free Wi-Fi',
    'Palace Hi-Tea with Rajasthani Folk performance',
    'Luxury Bedding',
    'Premium Toiletries'
  ]
}
```

---

## 🔄 Data Flow

### Reservation Flow

```
Home Page Search
    ↓
User enters: checkIn, checkOut, guests
    ↓
Clicks "Search" button
    ↓
handleHeroSearch() creates URL params
    ↓
Navigates to: /reservation?checkIn=...&checkOut=...&guests=...&step=2
    ↓
Reservation page loads with Step 1 pre-filled
    ↓
Automatically displays Step 2 (Room Selection)
    ↓
User selects room type
    ↓
Step 3 shows (Guest Information)
    ↓
User fills name, email, phone, special requests
    ↓
Submit → Stored in localStorage
    ↓
Success message displayed
    ↓
Form resets after 3 seconds
```

### Reviews Flow

```
User navigates to /reviews page
    ↓
Sees existing reviews from localStorage
    ↓
Can filter by star rating
    ↓
Submits new review: name, email, rating, comment
    ↓
Review validated and stored in localStorage
    ↓
Success notification shown
    ↓
Review appears in list immediately
    ↓
Data persists across browser sessions
```

---

## 💾 localStorage Structure

### Reservations
```json
{
  "MHOMESReservations": [
    {
      "id": "1731910234567",
      "checkIn": "2025-11-20",
      "checkOut": "2025-11-22",
      "guests": 2,
      "selectedRooms": [
        { "type": "premium", "count": 1 }
      ],
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+91 9876543210",
      "specialRequests": "High floor preferred",
      "createdAt": "2025-11-18T10:30:45.123Z"
    }
  ]
}
```

### Reviews
```json
{
  "MHOMESReviews": [
    {
      "id": "1731910234568",
      "name": "Sarah Johnson",
      "email": "sarah@example.com",
      "rating": 5,
      "comment": "Amazing experience!",
      "createdAt": "2025-11-18T10:30:45.123Z"
    }
  ]
}
```

---

## 🎨 Color Palette & Theme

### Primary Colors
- **Primary**: #3B82F6 (Blue)
- **Accent**: #FB923C (Orange)
- **Background**: #F8FAFC (Off-white)
- **Muted**: #E2E8F0 (Light gray)

### Custom Classes
- `luxury-heading` - Premium typography styling
- `luxury-text` - Body text with refined appearance
- `hero-text-shadow` - Hero section text effects
- `MHOMES-brown` - Brand color for logo

---

## 🔌 API Routes

- **API Endpoint**: `/api/[[...path]]` - Catch-all route for future API integration

---

## 📱 Responsive Breakpoints

The project uses Tailwind CSS breakpoints:

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md, lg)
- **Desktop**: 1024px+ (xl, 2xl)

### Responsive Elements:
- Hero search bar scales from 3-5 columns
- Amenities grid: 2 → 3 → 4 → 5 columns
- Carousel and image galleries adapt to screen size
- Navigation menu converts to hamburger on mobile
- All text sizes scale proportionally

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd MHOMES-resort

# Install dependencies
npm install
# or
yarn install

# Install shadcn/ui components (already included)
npx shadcn-ui@latest add [component-name]
```

### Development

```bash
# Start development server
npm run dev
# or
yarn dev

# Open browser
# Navigate to http://localhost:3000
```

### Build

```bash
# Create production build
npm run build

# Start production server
npm start
```

---

## 📊 Performance Optimizations

1. **Image Optimization**
   - Next.js Image component with lazy loading
   - Responsive image sizing with `sizes` prop
   - Automatic format conversion (WebP, AVIF)

2. **Code Splitting**
   - Dynamic imports for components
   - Route-based code splitting with Next.js

3. **Memoization**
   - ChatWidget wrapped with React.memo to prevent re-renders
   - Optimized motion animations with Framer Motion

4. **Hydration Safety**
   - Particle effects generated in useEffect to avoid mismatch
   - Math.random() calls only on client side

5. **CSS Optimization**
   - Tailwind CSS purging unused styles
   - PostCSS minification in production

---

## 🔧 Key Development Decisions

### 1. **Why Next.js?**
- Server-side rendering for SEO
- Built-in image optimization
- File-based routing simplicity
- API routes for future backend integration
- Vercel deployment ready

### 2. **Why Tailwind CSS?**
- Rapid UI development with utility classes
- Consistent spacing and sizing
- Dark mode ready
- Responsive design built-in
- Large community and ecosystem

### 3. **Why Framer Motion?**
- Production-ready animations
- Declarative animation syntax
- Performance optimized
- Gesture recognition capabilities
- Scroll-triggered animations

### 4. **Why localStorage?**
- No backend required for MVP
- Instant data persistence
- Works offline
- Easy to implement
- Can be replaced with backend API later

### 5. **Why Multi-Step Form?**
- Better UX for complex data collection
- Progressive disclosure of information
- Mobile-friendly approach
- Clear visual progress
- Reduced cognitive load

---

## 🎯 Future Enhancements

1. **Backend Integration**
   - Replace localStorage with database (PostgreSQL/MongoDB)
   - Add payment gateway (Stripe/Razorpay)
   - Email confirmation system

2. **Authentication**
   - User registration and login
   - Password reset functionality
   - Social login (Google, Facebook)

3. **Admin Dashboard**
   - Reservation management
   - Review moderation
   - Revenue analytics
   - Room availability management

4. **Advanced Features**
   - Real-time availability checking
   - Cancellation and modification
   - Loyalty rewards program
   - Multi-language support
   - SMS notifications

5. **Analytics & SEO**
   - Google Analytics integration
   - Meta tag optimization
   - Sitemap generation
   - Schema markup for structured data

---

## 📝 File Size Summary

| File | Lines | Purpose |
|------|-------|---------|
| src/app/page.tsx | 1868 | Main landing page with 10 sections |
| src/app/reviews/page.tsx | 465 | Reviews management page |
| src/app/reservation/page.tsx | 710 | Multi-step booking flow |

**Total: ~3,043 lines of production code**

---

## 🐛 Known Issues & Fixes

1. **Hydration Mismatch** ✅ FIXED
   - Issue: Particle effects causing hydration mismatch
   - Solution: Generate particles in useEffect hook (client-side only)

2. **Chat Widget Re-rendering** ✅ FIXED
   - Issue: ChatWidget re-rendering on parent updates
   - Solution: Wrapped with React.memo to prevent unnecessary renders

3. **Video Autoplay** ✅ FIXED
   - Issue: Browser autoplay policies blocking video
   - Solution: Muted video, retry mechanism, fallback handling

---

## 📄 License

This project is created for the MHOMES Resort brand and is proprietary.

---

## 👨‍💻 Development Team

**Project Owner**: Akash

**Created**: November 2025

**Tech Stack Version**: 
- Next.js 15.5.2
- React 19.1.0
- Tailwind CSS 4
- Framer Motion 12.23.12

---

## 📞 Support & Contact

For questions about this project, contact the development team.

---

## 🎉 Credits

This project was built with care to showcase luxury resort booking excellence through:
- Modern web technologies
- User-centered design
- Performance optimization
- Responsive development practices

**Special Thanks To:**
- Vercel (Next.js)
- Tailwind Labs (Tailwind CSS)
- Framer (Framer Motion)
- Radix UI and shadcn/ui communities

---

**Last Updated**: November 18, 2025

**Status**: Production Ready ✅
