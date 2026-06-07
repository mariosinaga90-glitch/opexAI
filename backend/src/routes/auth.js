import { Router } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq, and, or } from 'drizzle-orm';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { id, password } = req.body;

    if (!id || !password) {
      return res.status(400).json({ success: false, message: 'ID and password are required' });
    }

    // Query user by ID or Email and Password (plaintext as requested)
    const user = await db.select().from(users).where(
      and(
        or(eq(users.id, id), eq(users.email, id)),
        eq(users.password, password)
      )
    ).get();

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid ID or password' });
    }

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
