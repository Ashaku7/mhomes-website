// services/authService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { createError } = require('../middlewares/errorHandler');

// ─── HELPER: generate JWT token ──────────────────────────────
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
};

// ─── HELPER: safe user object (never expose passwordHash) ────
const sanitizeUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
});

// ─── SERVICE 1: Register ─────────────────────────────────────
const register = async ({ name, email, phone, password }) => {
    // Input validation
    if (!name || !email || !password) {
        throw createError(400, 'Name, email, and password are required.');
    }
    if (password.length < 8) {
        throw createError(400, 'Password must be at least 8 characters.');
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
    });
    if (existing) {
        throw createError(409, 'An account with this email already exists.');
    }

    // Hash password (salt rounds = 12 for production)
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user — role defaults to 'guest' (defined in schema)
    const user = await prisma.user.create({
        data: {
            name: name.trim(),
            email: normalizedEmail,
            phone: phone?.trim() || null,
            passwordHash,
        },
    });

    const token = generateToken(user);

    return {
        user: sanitizeUser(user),
        token,
        message: 'Account created successfully.',
    };
};

// ─── SERVICE 2: Login ─────────────────────────────────────────
const login = async ({ email, password }) => {
    if (!email || !password) {
        throw createError(400, 'Email and password are required.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user — deliberately vague error message to prevent
    // user enumeration attacks ("no account with this email" leaks info)
    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
    });

    if (!user) {
        throw createError(401, 'Invalid email or password.');
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        throw createError(401, 'Invalid email or password.');
    }

    const token = generateToken(user);

    return {
        user: sanitizeUser(user),
        token,
        message: 'Login successful.',
    };
};

// ─── SERVICE 3: Get current user ─────────────────────────────
const getMe = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw createError(404, 'User not found.');
    }

    return sanitizeUser(user);
};

module.exports = { register, login, getMe };