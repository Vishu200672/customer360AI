import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import healthRoutes from './routes/healthRoutes.js';
import apiV1Router from './routes/index.js';

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Routes
app.use('/', healthRoutes);

// API v1 Routes
app.use(config.apiV1Str, apiV1Router);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route '${req.method} ${req.path}' not found.`,
    },
  });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[Error] ${req.method} ${req.path}:`, err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected server error occurred.',
    },
  });
});

// Start Server
app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`  ${config.projectName} (v${config.version}) Backend Running`);
  console.log(`  Mode: Node.js Express TypeScript`);
  console.log(`  Port: http://localhost:${config.port}`);
  console.log(`  Health Probe: http://localhost:${config.port}/health`);
  console.log(`  API Base URL: http://localhost:${config.port}${config.apiV1Str}`);
  console.log(`  ML Service: ${config.mlServiceUrl} (${config.mlMode})`);
  console.log(`=======================================================`);
});

export default app;
