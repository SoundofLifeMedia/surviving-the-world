/**
 * Health Check API Endpoint
 * Vercel Serverless Function
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const health = {
    status: 'healthy',
    service: 'surviving-the-world',
    version: '0.2.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: process.env.NEON_DATABASE_URL ? 'configured' : 'not_configured'
  };

  res.status(200).json(health);
}
