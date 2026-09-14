import { Router } from 'express';
import customerRoutes from './customerRoutes.js';
import eventRoutes from './eventRoutes.js';
import actionRoutes from './actionRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import predictionRoutes from './predictionRoutes.js';
import ingestionRoutes from './ingestionRoutes.js';
import authRoutes from './authRoutes.js';
import chatRoutes from './chatRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/events', eventRoutes);
router.use('/ingestion', ingestionRoutes);
router.use('/chat', chatRoutes);
router.use('/', actionRoutes);
router.use('/', analyticsRoutes);
router.use('/', predictionRoutes);

export default router;
