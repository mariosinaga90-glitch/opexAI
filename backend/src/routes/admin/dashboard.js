import { Router } from 'express';
import { db } from '../../db/index.js';
import { fundRequests, users } from '../../db/schema.js';
import { eq, count, sql, desc } from 'drizzle-orm';

const router = Router();

router.get('/stats', async (req, res) => {
  try {
    const totalRequestsRes = await db.select({ count: count() }).from(fundRequests);
    const pendingReviewRes = await db.select({ count: count() }).from(fundRequests).where(eq(fundRequests.status, 'Pending'));
    const completedRes = await db.select({ count: count() }).from(fundRequests).where(eq(fundRequests.status, 'Completed'));
    const totalUsersRes = await db.select({ count: count() }).from(users).where(eq(users.role, 'employee'));

    res.json({
      totalRequests: totalRequestsRes[0].count,
      pendingReview: pendingReviewRes[0].count,
      completedThisMonth: completedRes[0].count, // In a real app, filter by current month
      totalEmployees: totalUsersRes[0].count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/pending', async (req, res) => {
  try {
    const pending = await db
      .select({
        id: fundRequests.id,
        user: users.name,
        team: users.team,
        toCluster: fundRequests.category, // Simplify mapping
        categoryLabel: fundRequests.categoryLabel,
        amount: fundRequests.amount,
        status: fundRequests.status,
      })
      .from(fundRequests)
      .leftJoin(users, eq(fundRequests.userId, users.id))
      .where(eq(fundRequests.status, 'Pending'))
      .orderBy(desc(fundRequests.createdAt))
      .limit(5);

    res.json(pending);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

export default router;
