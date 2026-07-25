import { Router } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq, and, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { id, password } = req.body;

    if (!id || !password) {
      return res.status(400).json({ success: false, message: 'ID and password are required' });
    }

    // Query user by ID or Email
    const user = await db.select().from(users).where(
      or(eq(users.id, id), eq(users.email, id))
    ).get();

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid ID or password' });
    }

    // Verify password using bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid ID or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, cluster: user.cluster, team: user.team },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set JWT in HTTP-Only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Exclude password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
