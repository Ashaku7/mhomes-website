// routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../utils/emailService');

/**
 * POST /api/contact
 * Send contact form email
 * Body: { firstName, lastName, email, subject, message }
 */
router.post('/', async (req, res, next) => {
  try {
    const { firstName, lastName, email, subject, message } = req.body;

    // Validation: Check required fields
    if (!firstName || !lastName || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: firstName, lastName, email, subject, message',
      });
    }

    // Send email
    const emailSent = await sendContactEmail(firstName, lastName, email, subject, message);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send email. Please try again later.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully. We will contact you soon!',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
