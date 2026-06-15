import { Router } from 'express';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// PUT /api/employee/profile - Update profile details
router.put('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing X-User-Id header' });
    }

    const {
      name,
      email,
      cluster,
      microCluster,
      team,
      phoneNumber,
      nik,
      vehicleType,
      plateNumber
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and Email are required' });
    }

    // Verify user exists
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update in database
    await db.update(users)
      .set({
        name,
        email,
        cluster,
        microCluster,
        team,
        phoneNumber,
        nik,
        vehicleType,
        plateNumber
      })
      .where(eq(users.id, userId));

    // Get the updated user details to return (excluding password)
    const updatedUser = await db.select().from(users).where(eq(users.id, userId)).get();
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Failed to update employee profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/employee/profile/password - Change user password
router.put('/password', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing X-User-Id header' });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    // Verify user and check password
    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.password !== oldPassword) {
      return res.status(400).json({ error: 'Password lama tidak sesuai' });
    }

    // Update password
    await db.update(users)
      .set({ password: newPassword })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Failed to update employee password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
