import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const HOTEL_EMAIL = process.env.HOTEL_EMAIL;
const FROM_EMAIL = "onboarding@resend.dev";

/**
 * Format date to readable format (e.g., "April 5, 2026")
 */
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00Z");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Send contact form email to hotel
 */
export const sendContactEmail = async (
  firstName: string,
  lastName: string,
  email: string,
  subject: string,
  message: string,
): Promise<boolean> => {
  try {
    if (!HOTEL_EMAIL) {
      console.error("[EMAIL] HOTEL_EMAIL not configured");
      return false;
    }

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2 style="color: #6B3F2A;">New Message from MHOMES Resort Website</h2>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr style="border: none; border-top: 1px solid #E8E4DC; margin: 20px 0;">
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
          <hr style="border: none; border-top: 1px solid #E8E4DC; margin: 20px 0;">
          <p><small style="color: #6B6B6B;">Sent from MHOMES Resort contact form</small></p>
        </body>
      </html>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: HOTEL_EMAIL,
      subject: `New Contact Form Submission - MHOMES Resort`,
      html: htmlContent,
      replyTo: email,
    });

    console.log(
      `[EMAIL] Contact form email sent successfully to ${HOTEL_EMAIL}`,
    );
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send contact email:", error);
    return false;
  }
};

/**
 * Send booking confirmation email to guest
 */
export const sendBookingConfirmation = async (
  guestName: string,
  guestEmail: string,
  bookingReference: string,
  checkIn: string,
  checkOut: string,
  roomType: string,
  roomCount: number,
  totalAmount: number,
): Promise<boolean> => {
  try {
    // Skip email if no guest email
    if (!guestEmail) {
      console.log(
        "[EMAIL] Skipping booking confirmation - no guest email provided",
      );
      return false;
    }

    const checkInFormatted = formatDate(checkIn);
    const checkOutFormatted = formatDate(checkOut);
    const roomTypeFormatted =
      roomType === "premium_plus" ? "Premium Plus" : "Premium";

    const htmlContent = `
      <html>
        <body style="font-family: 'Inter', Arial, sans-serif; color: #1A1A1A; line-height: 1.6; background-color: #FAFAF8;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; padding: 40px; border-radius: 8px; border: 1px solid #E8E4DC;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #E8E4DC;">
              <h1 style="color: #C9A84C; margin: 0; font-size: 24px; font-weight: 600;">MHOMES Resort</h1>
              <p style="color: #6B6B6B; margin: 5px 0 0 0; font-size: 14px;">Luxury Redefined</p>
            </div>

            <!-- Main Content -->
            <h2 style="color: #6B3F2A; font-size: 20px; margin: 0 0 10px 0;">Hello ${guestName},</h2>
            
            <p style="color: #1A1A1A; margin: 15px 0;">
              Thank you for choosing MHOMES Resort! Your reservation has been received and we're thrilled to have you join us.
            </p>

            <p style="color: #1A1A1A; margin: 15px 0;">
              Our team will contact you shortly to confirm your booking and discuss payment details.
            </p>

            <!-- Booking Details Box -->
            <div style="background-color: #FAFAF8; border-left: 4px solid #C9A84C; padding: 20px; margin: 25px 0; border-radius: 4px;">
              <h3 style="color: #6B3F2A; margin: 0 0 15px 0; font-size: 16px;">Booking Details</h3>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <p style="color: #6B6B6B; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase;">Booking Reference</p>
                  <p style="color: #C9A84C; margin: 0; font-weight: 600; font-size: 16px;">${bookingReference}</p>
                </div>
                <div>
                  <p style="color: #6B6B6B; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase;">Room Type</p>
                  <p style="color: #1A1A1A; margin: 0; font-weight: 600;">${roomTypeFormatted}</p>
                </div>
                <div>
                  <p style="color: #6B6B6B; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase;">Number of Rooms</p>
                  <p style="color: #1A1A1A; margin: 0; font-weight: 600;">${roomCount}</p>
                </div>
                <div>
                  <p style="color: #6B6B6B; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase;">Total Amount</p>
                  <p style="color: #C9A84C; margin: 0; font-weight: 600;">₹${totalAmount.toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #E8E4DC;">
                <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                  <span style="color: #6B6B6B;">Check-in: </span>
                  <span style="color: #1A1A1A; font-weight: 600;">${checkInFormatted}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                  <span style="color: #6B6B6B;">Check-out: </span>
                  <span style="color: #1A1A1A; font-weight: 600;">${checkOutFormatted}</span>
                </div>
              </div>
            </div>

            <!-- Next Steps -->
            <p style="color: #1A1A1A; margin: 25px 0;">
            Please keep this email for your reference.
            </p>

            <!-- Footer -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E8E4DC; text-align: center;">
              <p style="color: #6B6B6B; margin: 0; font-size: 14px;">
                <strong>MHOMES Resort</strong> | <a href="https://MHOMES.co.in" style="color: #C9A84C; text-decoration: none;">MHOMES.co.in</a>
              </p>
              <p style="color: #6B6B6B; margin: 5px 0 0 0; font-size: 12px;">
                Luxury • Comfort • Experience
              </p>
            </div>

          </div>
        </body>
      </html>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: guestEmail,
      subject: `Reservation Received - MHOMES Resort `,
      html: htmlContent,
      replyTo: HOTEL_EMAIL,
    });

    console.log(
      `[EMAIL] Booking confirmation email sent to ${guestEmail} (Ref: ${bookingReference})`,
    );
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send booking confirmation:", error);
    return false;
  }
};
