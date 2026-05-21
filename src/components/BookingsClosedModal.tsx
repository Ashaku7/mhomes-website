"use client";

import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Mail, Phone } from "lucide-react";

interface BookingsClosedModalProps {
  open: boolean;
  onClose: () => void;
}

const BRAND_GOLD = "#C9A84C";
const BUTTON_BROWN = "#6B3F2A";

export function BookingsClosedModal({ open, onClose }: BookingsClosedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md border-0 p-0 rounded-lg overflow-hidden">
        <DialogTitle className="sr-only">Bookings Opening Soon</DialogTitle>
        <div
          className="p-8 space-y-6"
          style={{ backgroundColor: "#FAFAF8" }}
        >
          {/* Icon */}
          <div className="flex justify-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: BRAND_GOLD }}
            >
              <Calendar className="w-8 h-8" style={{ color: BUTTON_BROWN }} />
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2
              className="text-3xl font-light mb-2"
              style={{
                fontFamily: "Cormorant Garamond, serif",
                color: BUTTON_BROWN,
              }}
            >
              Bookings Opening Soon
            </h2>
          </div>

          {/* Message */}
          <p className="text-center text-gray-600 text-sm leading-relaxed">
            We're currently not accepting online bookings. 
            Please contact us directly to make a reservation.
          </p>

          {/* Contact Options */}
          <div className="space-y-4 bg-white rounded-lg p-4 border" style={{ borderColor: BRAND_GOLD }}>
            {/* Email */}
            <a
              href="mailto:contact-us@mhomes.co.in"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Mail className="w-5 h-5" style={{ color: BRAND_GOLD }} />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">contact-us@mhomes.co.in</p>
              </div>
            </a>

            {/* Phone */}
            <a
              href="tel:+919677943053"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Phone className="w-5 h-5" style={{ color: BRAND_GOLD }} />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium text-gray-900">+91-9677 943053</p>
              </div>
            </a>
          </div>

          {/* Close Button */}
          <Button
            onClick={onClose}
            className="w-full text-white font-semibold py-3 rounded-lg hover:opacity-90"
            style={{ backgroundColor: BUTTON_BROWN }}
          >
            Got It
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
