import { Router } from 'express';
import { db } from '../../db/index.js';
import { fundReports, reportItems, attachments, requestSites, fundRequests } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = Router();

// GET all reports for an employee
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized: Missing X-User-Id header' });

    const reports = await db.select()
      .from(fundReports)
      .where(eq(fundReports.userId, userId))
      .orderBy(desc(fundReports.createdAt));
    const clusterLabels = {
      bekasi: 'TO Kab. Bekasi',
      karawang: 'TO Karawang',
      purwakarta: 'TO Purwakarta',
    };

    const enriched = await Promise.all(reports.map(async (r) => {
      const reqData = r.requestId ? await db.select({ requestDate: fundRequests.createdAt }).from(fundRequests).where(eq(fundRequests.id, r.requestId)).get() : null;
      
      const firstItem = await db.select({ toCluster: reportItems.toCluster })
        .from(reportItems)
        .where(eq(reportItems.reportId, r.id))
        .get();
      const raw = firstItem?.toCluster || '';

      return { 
        ...r, 
        requestDate: reqData?.requestDate || null,
        toCluster: clusterLabels[raw] || raw || '-'
      };
    }));
      
    res.json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET a single report and its items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const report = await db.select().from(fundReports).where(eq(fundReports.id, id)).get();
    
    if (!report) return res.status(404).json({ error: 'Report not found' });
    
    const items = await db.select().from(reportItems).where(eq(reportItems.reportId, id));
    const atts = await db.select().from(attachments).where(eq(attachments.reportId, id));
    
    // Fetch sites from the related fund request
    const sites = report.requestId 
      ? (await db.select().from(requestSites).where(eq(requestSites.requestId, report.requestId))).map(s => s.siteName)
      : [];
      
    // Fetch request date
    const reqData = report.requestId ? await db.select({ requestDate: fundRequests.createdAt }).from(fundRequests).where(eq(fundRequests.id, report.requestId)).get() : null;
    const requestDate = reqData ? reqData.requestDate : null;
    
    res.json({ ...report, items, attachments: atts, sites, requestDate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// POST create a new report
router.post('/', async (req, res) => {
  try {
    const { requestId, totalUsed, summary, category, categoryLabel, vehicleType, plateNumber, kmBefore, kmAfter, detail, items, uploadUrl, reportDate } = req.body;
    
    // Validate
    if (!requestId || !totalUsed) return res.status(400).json({ error: 'RequestId and totalUsed are required' });

    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized: Missing X-User-Id header' });
    
    // Generate simple ID (e.g., REP-12345)
    const newId = `REP-${Math.floor(Math.random() * 90000) + 10000}`;

    // Merge chosen date with real-time hours/minutes
    let finalCreatedAt = new Date();
    if (reportDate) {
      const parsedDate = new Date(reportDate);
      if (!isNaN(parsedDate)) {
        finalCreatedAt.setFullYear(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
      }
    }

    // Insert Report
    await db.insert(fundReports).values({
      id: newId,
      requestId,
      userId,
      totalUsed: parseFloat(totalUsed),
      status: 'Pending Review',
      summary,
      category,
      categoryLabel,
      vehicleType,
      plateNumber,
      kmBefore: kmBefore ? parseFloat(kmBefore) : null,
      kmAfter: kmAfter ? parseFloat(kmAfter) : null,
      detail,
      createdAt: finalCreatedAt,
    });

    // Insert Items
    if (items && Array.isArray(items) && items.length > 0) {
      const itemsToInsert = items.map(item => ({
        id: randomUUID(),
        reportId: newId,
        description: item.description || item.desc,
        team: item.team,
        toCluster: item.toCluster,
        nop: item.nop,
        category: item.category,
        detail: item.detail,
        transferDate: item.transferDate,
        unitPrice: parseFloat(item.unitPrice || 0),
        quantity: parseInt(item.quantity || item.qty || 1),
        total: parseFloat(item.unitPrice || 0) * parseInt(item.quantity || item.qty || 1),
      }));
      await db.insert(reportItems).values(itemsToInsert);
    }

    // Insert Attachment if URL is provided
    if (uploadUrl) {
      await db.insert(attachments).values({
        id: randomUUID(),
        reportId: newId,
        filename: uploadUrl.split('/').pop(),
        filePath: uploadUrl, // We save URL as filePath for easy rendering
      });
    }

    res.json({ success: true, id: newId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

export default router;
