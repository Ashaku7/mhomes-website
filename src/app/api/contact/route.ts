import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/contact
 * Send contact form email to hotel
 * Body: { firstName, lastName, email, subject, message }
 */
export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, subject, message } =
      await request.json();

    // Validation: Check required fields
    if (!firstName || !lastName || !email || !subject || !message) {
      return NextResponse.json(
        {
          success: false,
          message:
            "All fields are required: firstName, lastName, email, subject, message",
        },
        { status: 400 },
      );
    }

    // Import email service dynamically to avoid issues with Resend
    const { sendContactEmail } = await import("@/lib/emailService");

    // Send email (should not block if fails)
    const emailSent = await sendContactEmail(
      firstName,
      lastName,
      email,
      subject,
      message,
    );

    if (!emailSent) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to send email. Please try again later.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Your message has been sent successfully. We will contact you soon!",
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[CONTACT] Error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
