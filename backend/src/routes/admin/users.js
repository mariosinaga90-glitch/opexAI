import { Router } from 'express';
import { db } from '../../db/index.js';
import { users, fundRequests, requestItems, requestSites, fundReports, reportItems, attachments, backupPowerReports } from '../../db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all users
router.get('/', async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, cluster, microCluster, team, vehicleType, plateNumber, phoneNumber, nik } = req.body;
    
    // Simplistic creation without real hashing for now
    await db.insert(users).values({
      id: `USR-${Date.now()}`, // simple ID generation
      name,
      email,
      password, // In real app, hash this!
      role,
      cluster,
      microCluster,
      team,
      vehicleType,
      plateNumber,
      phoneNumber,
      nik,
    });

    res.json({ success: true, message: 'User created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, cluster, microCluster, team, vehicleType, plateNumber, phoneNumber, nik } = req.body;
    
    await db.update(users)
      .set({ name, email, role, cluster, microCluster, team, vehicleType, plateNumber, phoneNumber, nik })
      .where(eq(users.id, id));

    res.json({ success: true, message: 'User updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get all request IDs for this user
    const userReqs = await db.select({ id: fundRequests.id }).from(fundRequests).where(eq(fundRequests.userId, id));
    const reqIds = userReqs.map(r => r.id);

    // Get all report IDs for this user OR reports that reference the user's requests
    const userReps = await db.select({ id: fundReports.id }).from(fundReports).where(eq(fundReports.userId, id));
    let repIds = userReps.map(r => r.id);
    if (reqIds.length > 0) {
      const relatedReps = await db.select({ id: fundReports.id }).from(fundReports).where(inArray(fundReports.requestId, reqIds));
      repIds = [...new Set([...repIds, ...relatedReps.map(r => r.id)])];
    }

    // Cascade delete reports
    if (repIds.length > 0) {
      await db.delete(reportItems).where(inArray(reportItems.reportId, repIds));
      await db.delete(attachments).where(inArray(attachments.reportId, repIds));
      await db.delete(fundReports).where(inArray(fundReports.id, repIds));
    }

    // Cascade delete requests
    if (reqIds.length > 0) {
      await db.delete(requestItems).where(inArray(requestItems.requestId, reqIds));
      await db.delete(requestSites).where(inArray(requestSites.requestId, reqIds));
      await db.delete(attachments).where(inArray(attachments.requestId, reqIds));
      await db.delete(fundRequests).where(inArray(fundRequests.id, reqIds));
    }

    // Cascade delete backup power reports
    await db.delete(backupPowerReports).where(eq(backupPowerReports.userId, id));

    // Delete user
    await db.delete(users).where(eq(users.id, id));

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

// Toggle lock status
router.put('/:id/toggle-lock', async (req, res) => {
  try {
    const { id } = req.params;
    const { isLocked } = req.body;
    
    await db.update(users)
      .set({ isLocked: isLocked ? 1 : 0 }) // SQLite boolean is 0 or 1
      .where(eq(users.id, id));

    res.json({ success: true, message: `User lock status updated to ${isLocked}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user lock status' });
  }
});

export default router;
