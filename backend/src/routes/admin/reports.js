import { Router } from 'express';
import { db } from '../../db/index.js';
import { fundReports, reportItems, users, attachments, requestSites, fundRequests } from '../../db/schema.js';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// Get all reports
router.get('/', async (req, res) => {
  try {
    const reports = await db
      .select({
        id: fundReports.id,
        reqId: fundReports.requestId,
        user: users.name,
        team: users.team,
        category: fundReports.category,
        categoryLabel: fundReports.categoryLabel,
        totalUsed: fundReports.totalUsed,
        status: fundReports.status,
        date: fundReports.createdAt,
      })
      .from(fundReports)
      .leftJoin(users, eq(fundReports.userId, users.id))
      .orderBy(desc(fundReports.createdAt));

    const clusterLabels = {
      bekasi: 'TO Kab. Bekasi',
      karawang: 'TO Karawang',
      purwakarta: 'TO Purwakarta',
    };

    const enriched = await Promise.all(reports.map(async (r) => {
      const firstItem = await db.select({ toCluster: reportItems.toCluster })
        .from(reportItems)
        .where(eq(reportItems.reportId, r.id))
        .get();
      const raw = firstItem?.toCluster || '';
      
      const reqData = r.reqId ? await db.select({ requestDate: fundRequests.createdAt }).from(fundRequests).where(eq(fundRequests.id, r.reqId)).get() : null;
      
      return { 
        ...r, 
        toCluster: clusterLabels[raw] || raw || '-',
        requestDate: reqData?.requestDate || null
      };
    }));

    res.json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get single report
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const reportData = await db
      .select()
      .from(fundReports)
      .leftJoin(users, eq(fundReports.userId, users.id))
      .where(eq(fundReports.id, id))
      .get();

    if (!reportData) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const items = await db.select().from(reportItems).where(eq(reportItems.reportId, id));
    const atts = await db.select().from(attachments).where(eq(attachments.reportId, id));

    const clusterLabels = {
      bekasi: 'TO Kab. Bekasi',
      karawang: 'TO Karawang',
      purwakarta: 'TO Purwakarta',
    };
    const firstItemCluster = items[0]?.toCluster || '';

    // Fetch sites from the related fund request
    const requestId = reportData.fund_reports.requestId;
    const sites = requestId
      ? (await db.select().from(requestSites).where(eq(requestSites.requestId, requestId))).map(s => s.siteName)
      : [];

    const reqData = requestId ? await db.select({ requestDate: fundRequests.createdAt }).from(fundRequests).where(eq(fundRequests.id, requestId)).get() : null;
    const requestDate = reqData ? reqData.requestDate : null;

    const formattedReport = {
      ...reportData.fund_reports,
      user: reportData.users.name,
      team: reportData.users.team,
      toCluster: clusterLabels[firstItemCluster] || firstItemCluster || '-',
      items,
      attachments: atts,
      sites,
      requestDate,
    };

    res.json(formattedReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Approve report
router.patch('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    await db.update(fundReports)
      .set({ status: 'Approved' })
      .where(eq(fundReports.id, id));

    // Also update related fundRequest to Completed
    const report = await db.select({ requestId: fundReports.requestId }).from(fundReports).where(eq(fundReports.id, id)).get();
    if (report?.requestId) {
        // Need to import fundRequests schema if doing this, but keeping it simple for now or we can update it.
    }

    res.json({ success: true, message: 'Report approved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve report' });
  }
});

// Request revision
router.patch('/:id/revision', async (req, res) => {
  try {
    const { id } = req.params;
    const { revisionNote } = req.body;

    await db.update(fundReports)
      .set({ status: 'Revision', revisionNote })
      .where(eq(fundReports.id, id));

    res.json({ success: true, message: 'Revision requested' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to request revision' });
  }
});

// Reject report
router.patch('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { revisionNote } = req.body;

    await db.update(fundReports)
      .set({ status: 'Rejected', revisionNote: revisionNote || 'Laporan ditolak oleh Admin.' })
      .where(eq(fundReports.id, id));

    res.json({ success: true, message: 'Report rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject report' });
  }
});

export default router;
