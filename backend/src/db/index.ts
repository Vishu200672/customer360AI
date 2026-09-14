import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  // Prevent unhandled error crashing the process when PostgreSQL is not running
  console.warn('[DB Pool Notice] PostgreSQL not connected, running in in-memory fallback mode.');
});

export async function testConnection(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT 1');
    return res.rows.length > 0;
  } catch (error) {
    return false;
  }
}
