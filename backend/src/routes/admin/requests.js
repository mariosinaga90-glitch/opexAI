import { Router } from 'express';
import { db } from '../../db/index.js';
import { fundRequests, requestItems, requestSites, attachments, users } from '../../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all requests
router.get('/', async (req, res) => {
  try {
    const requests = await db
      .select({
        id: fundRequests.id,
        user: users.name,
        email: users.email,
        team: users.team,
        title: fundRequests.title,
        amount: fundRequests.amount,
        status: fundRequests.status,
        date: fundRequests.createdAt,
        category: fundRequests.category,
        categoryLabel: fundRequests.categoryLabel,
      })
      .from(fundRequests)
      .leftJoin(users, eq(fundRequests.userId, users.id))
      .orderBy(desc(fundRequests.createdAt));

    // Map toCluster from the first request item for each request
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

// Get single request
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const requestData = await db
      .select()
      .from(fundRequests)
      .leftJoin(users, eq(fundRequests.userId, users.id))
      .where(eq(fundRequests.id, id))
      .get();

    if (!requestData) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const items = await db.select().from(requestItems).where(eq(requestItems.requestId, id));
    const sites = await db.select().from(requestSites).where(eq(requestSites.requestId, id));
    const atts = await db.select().from(attachments).where(eq(attachments.requestId, id));

    const clusterLabels = {
      bekasi: 'TO Kab. Bekasi',
      karawang: 'TO Karawang',
      purwakarta: 'TO Purwakarta',
    };
    const firstItemCluster = items[0]?.toCluster || '';

    const formattedRequest = {
      ...requestData.fund_requests,
      user: requestData.users.name,
      email: requestData.users.email,
      team: requestData.users.team,
      toCluster: clusterLabels[firstItemCluster] || firstItemCluster || '-',
      items,
      sites: sites.map(s => s.siteName),
      attachments: atts,
    };

    res.json(formattedRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// Approve request
router.patch('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    await db.update(fundRequests)
      .set({ status: 'Approved', adminNote })
      .where(eq(fundRequests.id, id));

    res.json({ success: true, message: 'Request approved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// Reject request
router.patch('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    await db.update(fundRequests)
      .set({ status: 'Rejected', adminNote })
      .where(eq(fundRequests.id, id));

    res.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// Delete request
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete relations first
    await db.delete(requestItems).where(eq(requestItems.requestId, id));
    await db.delete(requestSites).where(eq(requestSites.requestId, id));
    await db.delete(fundRequests).where(eq(fundRequests.id, id));

    res.json({ success: true, message: 'Request deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

export default router;
