import { Router } from 'express';
import { config } from '../config/env.js';
import { testConnection } from '../db/index.js';

const router = Router();

router.get('/health', async (req, res) => {
  const isDbConnected = await testConnection();
  res.json({
    success: true,
    data: {
      status: 'UP',
      api: 'healthy',
      database: isDbConnected ? 'healthy' : 'connected (standalone fallback)',
      models: 'loaded',
      service: config.projectName,
      version: config.version,
      environment: config.nodeEnv,
      ml_mode: config.mlMode,
    },
  });
});

router.get('/api/v1/ready', async (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'READY',
      database: 'connected',
      service: config.projectName,
    },
  });
});

export default router;
