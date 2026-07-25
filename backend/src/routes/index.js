import { Router } from 'express';
import authRoutes from './auth.js';
import dashboardRoutes from './admin/dashboard.js';
import requestRoutes from './admin/requests.js';
import reportRoutes from './admin/reports.js';
import userRoutes from './admin/users.js';
import uploadRoutes from './upload.js';
import empRequestRoutes from './employee/requests.js';
import empReportRoutes from './employee/reports.js';
import empProfileRoutes from './employee/profile.js';
import backupPowerRoutes from './backupPower.js';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.use('/auth', authRoutes);

// Admin Routes (Protected by verifyAdmin)
router.use('/admin/dashboard', verifyAdmin, dashboardRoutes);
router.use('/admin/requests', verifyAdmin, requestRoutes);
router.use('/admin/reports', verifyAdmin, reportRoutes);
router.use('/admin/users', verifyAdmin, userRoutes);

// Common / Employee Routes (Protected by verifyToken)
router.use('/upload', verifyToken, uploadRoutes);
router.use('/employee/requests', verifyToken, empRequestRoutes);
router.use('/employee/reports', verifyToken, empReportRoutes);
router.use('/employee/profile', verifyToken, empProfileRoutes);
router.use('/backup-power', verifyToken, backupPowerRoutes);

export default router;
