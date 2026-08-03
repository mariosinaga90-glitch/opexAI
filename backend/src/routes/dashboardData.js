import { Router } from 'express';
import { db } from '../db/index.js';
import { dashboardData } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET all dashboard data
router.get('/', async (req, res) => {
  try {
    const allData = await db.select().from(dashboardData);
    
    // We return it as an object indexed by datasetId
    const formattedData = {};
    for (const item of allData) {
      formattedData[item.datasetId] = {
        data: item.data ? JSON.parse(item.data) : [],
        columns: item.columns ? JSON.parse(item.columns) : [],
        fileName: item.fileName || ''
      };
    }
    
    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// POST to update/insert a dataset
router.post('/', async (req, res) => {
  try {
    const { datasetId, fileName, data, columns } = req.body;
    
    if (!datasetId || !data || !columns) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const dataString = JSON.stringify(data);
    const columnsString = JSON.stringify(columns);

    // Check if exists
    const existing = await db.select().from(dashboardData).where(eq(dashboardData.datasetId, datasetId)).limit(1);

    if (existing.length > 0) {
      // Update
      await db.update(dashboardData)
        .set({ fileName, data: dataString, columns: columnsString })
        .where(eq(dashboardData.datasetId, datasetId));
    } else {
      // Insert
      await db.insert(dashboardData).values({
        id: uuidv4(),
        datasetId,
        fileName,
        data: dataString,
        columns: columnsString
      });
    }

    res.json({ success: true, message: 'Dataset updated successfully' });
  } catch (error) {
    console.error('Error saving dashboard data:', error);
    res.status(500).json({ error: 'Failed to save dashboard data' });
  }
});

// DELETE a dataset
router.delete('/:datasetId', async (req, res) => {
  try {
    const { datasetId } = req.params;
    await db.delete(dashboardData).where(eq(dashboardData.datasetId, datasetId));
    res.json({ success: true, message: 'Dataset deleted successfully' });
  } catch (error) {
    console.error('Error deleting dashboard data:', error);
    res.status(500).json({ error: 'Failed to delete dashboard data' });
  }
});

export default router;
