import { Router } from 'express';
import { ActionService } from '../services/actionService.js';

const router = Router();
const service = new ActionService();

// GET /api/v1/customers/:id/actions/latest
router.get('/customers/:id/actions/latest', async (req, res) => {
  try {
    const action = await service.getLatestAction(req.params.id);
    res.json({
      success: true,
      data: action,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /api/v1/actions/:id
router.patch('/actions/:id', async (req, res) => {
  try {
    const status = req.body.status || 'EXECUTED';
    const action = await service.updateActionStatus(req.params.id, status);
    res.json({
      success: true,
      data: action,
      message: 'Action updated successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/actions/:id/execute
router.post('/actions/:id/execute', async (req, res) => {
  try {
    const action = await service.executeAction(req.params.id);
    res.json({
      success: true,
      data: action,
      message: 'Recommended action executed successfully via Omnichannel Gateway.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/actions/dispatch (WhatsApp, Email, SMS Omnichannel Dispatch)
router.post('/actions/dispatch', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.channel) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: "Field 'channel' (WhatsApp, Email, or SMS) is required." },
      });
    }

    const receipt = await service.dispatchMessage(payload);
    res.json({
      success: true,
      data: receipt,
      message: `Message dispatched successfully via ${receipt.gateway}.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/actions/dispatches (Get recent dispatch logs)
router.get('/actions/dispatches', (req, res) => {
  try {
    const logs = service.getDispatchLogs();
    res.json({
      success: true,
      data: logs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/actions/:id/outcome
router.post('/actions/:id/outcome', async (req, res) => {
  try {
    const outcome = await service.recordOutcome(req.params.id, req.body);
    res.json({
      success: true,
      data: outcome,
      message: 'Action outcome recorded successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/feedback
router.post('/feedback', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.customer_id || !payload.action_id) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: "Fields 'customer_id' and 'action_id' are required." },
      });
    }

    const outcome = await service.recordFeedback(payload);
    res.json({
      success: true,
      data: outcome,
      message: 'Customer feedback response recorded successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
