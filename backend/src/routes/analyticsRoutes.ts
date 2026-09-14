import { Router } from 'express';
import { AnalyticsService } from '../services/analyticsService.js';

const router = Router();
const service = new AnalyticsService();

// GET /api/v1/analytics/actions
router.get('/analytics/actions', async (req, res) => {
  try {
    const data = await service.getGlobalAnalytics();
    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/customers/:id/feedback
router.get('/customers/:id/feedback', async (req, res) => {
  try {
    const data = await service.getCustomerFeedback(req.params.id);
    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/analytics/copilot
router.post('/analytics/copilot', async (req, res) => {
  try {
    const { query, customer_id } = req.body || {};
    const data = await service.answerCopilotQuery(query, customer_id);
    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;

