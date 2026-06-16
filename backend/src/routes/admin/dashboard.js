import { Router } from 'express';
import { db } from '../../db/index.js';
import { fundRequests, users } from '../../db/schema.js';
import { eq, count, sql, desc } from 'drizzle-orm';
import { fundReports } from '../../db/schema.js';

const router = Router();

router.get('/stats', async (req, res) => {
  try {
    const totalRequestsRes = await db.select({ count: count() }).from(fundRequests);
    const pendingReviewRes = await db.select({ count: count() }).from(fundRequests).where(eq(fundRequests.status, 'Pending'));
    const completedRes = await db.select({ count: count() }).from(fundRequests).where(eq(fundRequests.status, 'Completed'));
    const totalUsersRes = await db.select({ count: count() }).from(users).where(eq(users.role, 'employee'));

    // Group by categoryLabel
    const categoryStats = await db.select({
      name: fundRequests.categoryLabel,
      value: count()
    }).from(fundRequests).groupBy(fundRequests.categoryLabel);

    const totalRequestedSum = await db.select({ total: sql`SUM(amount)` }).from(fundRequests);
    const totalReportedSum = await db.select({ total: sql`SUM(totalUsed)` }).from(fundReports);
    
    const reqAmount = totalRequestedSum[0]?.total || 0;
    const repAmount = totalReportedSum[0]?.total || 0;

    // Trend Data (last 7 days)
    const allReqsForTrend = await db.select({ createdAt: fundRequests.createdAt }).from(fundRequests);
    const dateMap = {};
    allReqsForTrend.forEach(req => {
      if (req.createdAt) {
        const d = new Date(req.createdAt);
        if (!isNaN(d.getTime())) {
          const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
        }
      }
    });
    
    const requestsByDate = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      requestsByDate.push({
        date: `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`,
        value: dateMap[dateStr] || 0
      });
    }

    res.json({
      totalRequests: totalRequestsRes[0].count,
      pendingReview: pendingReviewRes[0].count,
      completedThisMonth: completedRes[0].count, // In a real app, filter by current month
      totalEmployees: totalUsersRes[0].count,
      requestsByCategory: categoryStats.map(c => ({ name: c.name || 'Lainnya', value: c.value })),
      fundsOverview: [
        { name: 'Nominal Realisasi', value: repAmount },
        { name: 'Belum Terealisasi', value: Math.max(0, reqAmount - repAmount) }
      ],
      requestsByDate
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
