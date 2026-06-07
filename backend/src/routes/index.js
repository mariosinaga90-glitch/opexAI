import { Router } from 'express';
import authRoutes from './auth.js';
import dashboardRoutes from './admin/dashboard.js';
import requestRoutes from './admin/requests.js';
import reportRoutes from './admin/reports.js';
import userRoutes from './admin/users.js';
import uploadRoutes from './upload.js';
import empRequestRoutes from './employee/requests.js';
import empReportRoutes from './employee/reports.js';

const router = Router();

router.use('/auth', authRoutes);

router.use('/admin/dashboard', dashboardRoutes);
router.use('/admin/requests', requestRoutes);
router.use('/admin/reports', reportRoutes);
router.use('/admin/users', userRoutes);
router.use('/upload', uploadRoutes);

router.use('/employee/requests', empRequestRoutes);
router.use('/employee/reports', empReportRoutes);

export default router;
