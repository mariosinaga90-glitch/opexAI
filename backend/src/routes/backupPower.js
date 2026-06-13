import { Router } from 'express';
import { db } from '../db/index.js';
import { backupPowerReports, users } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET all reports
router.get('/', async (req, res) => {
  try {
    const data = await db.select({
      id: backupPowerReports.id,
      userId: backupPowerReports.userId,
      ticketNo: backupPowerReports.ticketNo,
      siteId: backupPowerReports.siteId,
      siteName: backupPowerReports.siteName,
      backupDate: backupPowerReports.backupDate,
      nop: backupPowerReports.nop,
      cluster: backupPowerReports.cluster,
      plnOffTime: backupPowerReports.plnOffTime,
      rhBefore: backupPowerReports.rhBefore,
      backupStartTime: backupPowerReports.backupStartTime,
      plnOnTime: backupPowerReports.plnOnTime,
      rhAfter: backupPowerReports.rhAfter,
      backupEndTime: backupPowerReports.backupEndTime,
      outageCause: backupPowerReports.outageCause,
      photoPlnOff: backupPowerReports.photoPlnOff,
      photoRhBefore: backupPowerReports.photoRhBefore,
      photoPlnOn: backupPowerReports.photoPlnOn,
      photoRhAfter: backupPowerReports.photoRhAfter,
      createdAt: backupPowerReports.createdAt,
      user: users.name
    })
    .from(backupPowerReports)
    .leftJoin(users, eq(backupPowerReports.userId, users.id))
    .orderBy(desc(backupPowerReports.createdAt));
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching backup power reports:', error);
    res.status(500).json({ error: 'Failed to fetch backup power reports' });
  }
});

// POST new report
router.post('/', async (req, res) => {
  try {
    const { 
      userId, ticketNo, siteId, siteName, backupDate, nop, cluster, 
      plnOffTime, rhBefore, backupStartTime, plnOnTime, rhAfter, backupEndTime, outageCause,
      photoPlnOff, photoRhBefore, photoPlnOn, photoRhAfter
    } = req.body;

    const id = `BKP-${uuidv4().substring(0, 8).toUpperCase()}`;

    const newReport = await db.insert(backupPowerReports).values({
      id,
      userId,
      ticketNo,
      siteId,
      siteName,
      backupDate,
      nop,
      cluster,
      plnOffTime,
      rhBefore,
      backupStartTime,
      plnOnTime,
      rhAfter,
      backupEndTime,
      outageCause,
      photoPlnOff,
      photoRhBefore,
      photoPlnOn,
      photoRhAfter
    }).returning();

    res.status(201).json(newReport[0]);
  } catch (error) {
    console.error('Error creating backup power report:', error);
    res.status(500).json({ error: 'Failed to create backup power report' });
  }
});

// DELETE report (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(backupPowerReports).where(eq(backupPowerReports.id, id));
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting backup power report:', error);
    res.status(500).json({ error: 'Failed to delete backup power report' });
  }
});

export default router;
