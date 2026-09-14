import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  projectName: process.env.PROJECT_NAME || 'Customer360 AI',
  version: process.env.VERSION || '1.0.0',
  apiV1Str: process.env.API_V1_STR || '/api/v1',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/customer360_db',
  mlMode: process.env.ML_MODE || 'remote',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'https://vishu2006-customer.hf.space',
  mlRequestTimeoutMs: parseInt(process.env.ML_REQUEST_TIMEOUT_MS || '15000', 10),
  jwtSecret: process.env.JWT_SECRET || 'c360-super-secret-auth-key-2026',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || process.env.GMAIL_USER || '',
    pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '',
    from: process.env.EMAIL_FROM || '"Customer360 AI Security" <security@customer360.ai>',
  },
};
