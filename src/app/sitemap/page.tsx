import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Sitemap | MHOMES Resort",
  description: "Browse all important pages and sections on MHOMES Resort website.",
};

const pageLinks = [
  { label: "Home", href: "/" },
  { label: "Reservation", href: "/reservation" },
  { label: "Reviews", href: "/reviews" },
  { label: "Terms & Conditions", href: "/terms-conditions" },
  { label: "Sitemap", href: "/sitemap" },
];

const homeSectionLinks = [
  { label: "Home Hero", href: "/#home" },
  { label: "Our Story", href: "/#story" },
  { label: "Accommodations", href: "/#accommodations" },
  { label: "Gallery", href: "/#gallery" },
  { label: "Reviews Section", href: "/#reviews" },
  { label: "Booking Section", href: "/#booking" },
  { label: "Contact Section", href: "/#contact" },
];

export default function SitemapPage() {
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
                  loading="eager"
                  style={{ width: "auto", height: "auto" }}
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
              <span className="luxury-label text-[12px] text-[#6B3F2A]">Sitemap</span>
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
        <header className="mb-8 border-b border-[#E7DFD2] pb-6">
          <h1 className="luxury-heading mt-2 text-4xl font-semibold text-[#2F211B] md:text-5xl">
            Sitemap
          </h1>
          <p className="mt-3 luxury-text text-sm text-[#5F4B40] md:text-base">
            Quick access to all important pages and sections of our website.
          </p>
        </header>

        <section className="border border-[#E7DFD2] bg-white p-5 md:p-6">
          <h2 className="luxury-heading text-2xl font-medium text-[#2F211B] md:text-[30px]">
            Main Pages
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 luxury-text text-sm leading-relaxed text-[#4C3C33] md:text-base">
            {pageLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-[#6B3F2A] underline-offset-2 hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-5 border border-[#E7DFD2] bg-white p-5 md:p-6">
          <h2 className="luxury-heading text-2xl font-medium text-[#2F211B] md:text-[30px]">
            Home Page Sections
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 luxury-text text-sm leading-relaxed text-[#4C3C33] md:text-base">
            {homeSectionLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-[#6B3F2A] underline-offset-2 hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
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
