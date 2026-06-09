import { Router } from 'express';
import { db } from '../../db/index.js';
import { fundRequests, requestItems, requestSites, attachments } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = Router();

// GET all requests for an employee (Mocking employee ID for now)
router.get('/', async (req, res) => {
  try {
    // Extract userId from headers
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized: Missing X-User-Id header' });

    const requests = await db.select()
      .from(fundRequests)
      .where(eq(fundRequests.userId, userId))
      .orderBy(desc(fundRequests.createdAt));
      
    const clusterLabels = {
      bekasi: 'TO Kab. Bekasi',
      karawang: 'TO Karawang',
      purwakarta: 'TO Purwakarta',
    };

    const enriched = await Promise.all(requests.map(async (r) => {
      const firstItem = await db.select({ toCluster: requestItems.toCluster })
        .from(requestItems)
        .where(eq(requestItems.requestId, r.id))
        .get();
      const raw = firstItem?.toCluster || '';
      return { ...r, toCluster: clusterLabels[raw] || raw || '-' };
    }));

    res.json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// GET a single request and its items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const request = await db.select().from(fundRequests).where(eq(fundRequests.id, id)).get();
    
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    const items = await db.select().from(requestItems).where(eq(requestItems.requestId, id));
    const sites = await db.select().from(requestSites).where(eq(requestSites.requestId, id));
    const atts = await db.select().from(attachments).where(eq(attachments.requestId, id));
    
    res.json({ ...request, items, sites: sites.map(s => s.siteName), attachments: atts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// POST create a new request
router.post('/', async (req, res) => {
  try {
    const { title, description, amount, category, categoryLabel, vehicleType, plateNumber, kmBefore, kmAfter, detail, items, sites, requestDate, uploadUrl } = req.body;
    
    // Validate
    if (!title || !amount) return res.status(400).json({ error: 'Title and amount are required' });

    // Extract User ID
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized: Missing X-User-Id header' });
    
    // Generate simple ID (e.g., REQ-12345)
    const newId = `REQ-${Math.floor(Math.random() * 90000) + 10000}`;

    // Merge chosen date with real-time hours/minutes
    let finalCreatedAt = new Date();
    if (requestDate) {
      const parsedDate = new Date(requestDate);
      if (!isNaN(parsedDate)) {
        finalCreatedAt.setFullYear(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
      }
    }

    // Insert Request
    await db.insert(fundRequests).values({
      id: newId,
      userId,
      title,
      description,
      amount: parseFloat(amount),
      status: 'Pending',
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
        requestId: newId,
        description: item.description || item.desc,
        team: item.team,
        toCluster: item.toCluster,
        category: item.category,
        detail: item.detail,
        unitPrice: parseFloat(item.unitPrice || 0),
        quantity: parseInt(item.quantity || item.qty || 1),
        total: parseFloat(item.unitPrice || 0) * parseInt(item.quantity || item.qty || 1),
      }));
      await db.insert(requestItems).values(itemsToInsert);
    }

    // Insert Sites
    if (sites && Array.isArray(sites) && sites.length > 0) {
      const sitesToInsert = sites.map(site => ({
        id: randomUUID(),
        requestId: newId,
        siteName: site.siteName,
      }));
      await db.insert(requestSites).values(sitesToInsert);
    }

    // Insert attachments
    if (uploadUrl) {
      await db.insert(attachments).values({
        id: randomUUID(),
        requestId: newId,
        filename: uploadUrl.split('/').pop(),
        filePath: uploadUrl,
        fileType: uploadUrl.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'
      });
    }

    res.status(201).json({ success: true, id: newId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

export default router;
