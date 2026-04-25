import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Mail, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions | MHOMES Resort",
  description:
    "Read MHOMES Resort terms and conditions for bookings, cancellations, payments, guest conduct, privacy, and resort stay policies.",
};

const policySections = [
  {
    id: "booking",
    title: "Booking and Reservation Terms",
    points: [
      "All bookings are subject to room availability and final confirmation by MHOMES Resort.",
      "A reservation is considered confirmed only after successful payment or approved guarantee, based on the selected rate plan.",
      "Room category, inclusions, and occupancy limits are shown at checkout and in your confirmation details.",
      "Special requests (such as early check-in, late check-out, bed type, view preference, or nearby rooms) are non-binding and depend on availability at arrival.",
    ],
  },
  {
    id: "cancellation",
    title: "Cancellation, Modification, and No-Show",
    points: [
      "Cancellation and amendment charges depend on the specific rate and offer selected during booking.",
      "If you do not check in on the scheduled arrival date without prior cancellation, no-show charges may apply as per your booking terms.",
      "Refunds, where applicable, are processed to the original mode of payment and may take standard banking time.",
      "For third-party reservations, cancellation and refund timelines are governed by the platform used to book.",
    ],
  },
  {
    id: "checkin",
    title: "Check-In, Check-Out, and Stay Requirements",
    points: [
      "Guests must present a valid government-issued photo ID at check-in.",
      "Check-in and check-out times are communicated at booking and may vary by package or season.",
      "Additional guests, including children above the permitted threshold, may attract extra charges according to occupancy policy.",
      "Management may deny check-in or request departure in case of policy violations, unsafe conduct, or unlawful activity.",
    ],
  },
  {
    id: "payment",
    title: "Payments, Deposits, and Billing",
    points: [
      "Accepted payment methods include those displayed during checkout or at the front desk.",
      "An incidental deposit may be requested at check-in for extras such as dining, services, or damages.",
      "Any outstanding amount must be settled before check-out.",
      "In case of billing disputes, guests should notify the resort promptly to allow verification and resolution.",
    ],
  },
  {
    id: "conduct",
    title: "Guest Conduct and Property Use",
    points: [
      "Guests are expected to maintain respectful behavior toward other guests, staff, and resort property.",
      "Any damage, loss, or excessive cleaning requirement caused by guests may be charged to the registered booking.",
      "Use of facilities such as pool, activity zones, and outdoor areas must follow posted safety instructions.",
      "Activities that disturb other guests, threaten safety, or violate applicable law are strictly prohibited.",
    ],
  },
];

export default function TermsAndConditionsPage() {
  const effectiveDate = "April 25, 2026";

  return (
    <div className="min-h-screen bg-[#FBF8F2] text-foreground">
      <header className="sticky top-0 z-40 bg-[#FBF8F2]/95 backdrop-blur-sm border-b border-[#E7DFD2]">
        <div className="container mx-auto px-4 py-1">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="flex items-center justify-center -my-6 relative top-2">
                <Image
                  src="/MHOMES-logo.png"
                  alt="MHOMES Resort Logo"
                  width={160}
                  height={160}
                  priority
                  style={{ width: "auto" }}
                  className="object-contain"
                />
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-6">
              <Link href="/" className="luxury-label text-[12px] text-[#1A1A1A] hover:text-[#6B3F2A] transition-colors">
                Home
              </Link>
              <Link href="/reviews" className="luxury-label text-[12px] text-[#1A1A1A] hover:text-[#6B3F2A] transition-colors">
                Reviews
              </Link>
              <span className="luxury-label text-[12px] text-[#6B3F2A]">Terms</span>
            </nav>

            <Link
              href="/reservation"
              className="inline-flex items-center rounded-lg bg-[#6B3F2A] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#4F2D1E] luxury-label"
            >
              Reserve now
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10 md:px-6 md:pt-14">
        <section className="mb-8 border-b border-[#E7DFD2] pb-6">
          <h1 className="luxury-heading mt-2 text-4xl font-semibold text-[#2F211B] md:text-5xl">
            Terms and Conditions
          </h1>
          <p className="mt-3 luxury-text text-sm text-[#5F4B40] md:text-base">
            These terms govern your use of the MHOMES website and services, including reservation
            requests, confirmed bookings, resort stays, and related facilities. By booking with us
            or using this website, you agree to these terms.
          </p>
        </section>

        <div className="space-y-5">
          {policySections.map((section) => (
            <section key={section.id} id={section.id} className="border border-[#E7DFD2] bg-white p-5 md:p-6">
              <h2 className="luxury-heading text-2xl font-medium text-[#2F211B] md:text-[30px]">
                {section.title}
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 luxury-text text-sm leading-relaxed text-[#4C3C33] md:text-base">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-5 border border-[#E7DFD2] bg-white p-5 md:p-6">
          <h2 className="luxury-heading text-2xl font-medium text-[#2F211B] md:text-[30px]">Privacy and Data Use</h2>
          <p className="mt-3 luxury-text text-sm leading-relaxed text-[#4C3C33] md:text-base">
            We collect only the information required to process reservations, provide guest
            services, communicate booking updates, and comply with legal obligations. Personal
            information is handled with reasonable technical and organizational safeguards. We do
            not sell personal data. Details may be shared only with authorized service providers or
            authorities when required for operations, payment processing, security, or legal
            compliance.
          </p>
        </section>

        <section className="mt-5 border border-[#E7DFD2] bg-white p-5 md:p-6">
          <h2 className="luxury-heading text-2xl font-medium text-[#2F211B] md:text-[30px]">Limitation of Liability</h2>
          <p className="mt-3 luxury-text text-sm leading-relaxed text-[#4C3C33] md:text-base">
            While we strive to provide a safe and seamless experience, MHOMES Resort is not liable
            for losses arising from events outside reasonable control, including natural disasters,
            network outages, transport disruptions, or government restrictions. Guests are
            responsible for personal belongings and are encouraged to use available secure storage
            where provided.
          </p>
        </section>

        <section className="mt-5 border border-[#E7DFD2] bg-white p-5 md:p-6">
          <h2 className="luxury-heading text-2xl font-medium text-[#2F211B] md:text-[30px]">Policy Updates</h2>
          <p className="mt-3 luxury-text text-sm leading-relaxed text-[#4C3C33] md:text-base">
            MHOMES Resort may revise these terms from time to time. Updated terms become effective
            when posted on this page. Continued use of our website or services after updates
            signifies acceptance of the revised terms.
          </p>
        </section>

        <section className="mt-5 border border-[#E7DFD2] bg-white p-5 md:p-6">
          <h2 className="luxury-heading text-2xl font-medium text-[#2F211B] md:text-[30px]">Contact for Clarifications</h2>
          <p className="mt-3 luxury-text text-sm leading-relaxed text-[#4C3C33] md:text-base">
            For any questions regarding these terms or your booking conditions, contact us before
            finalizing your reservation.
          </p>
          <div className="mt-4 flex flex-col gap-2 luxury-text text-sm text-[#4C3C33] md:text-base">
            <div className="inline-flex items-center gap-2">
              <Mail size={16} className="text-[#6B3F2A]" />
              <span>contact-us@mhomes.co.in</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <Phone size={16} className="text-[#6B3F2A]" />
              <span>+91 9677 943053</span>
            </div>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-[#6B3F2A] px-4 py-2 text-sm font-medium text-[#6B3F2A] transition hover:bg-[#6B3F2A] hover:text-white"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
