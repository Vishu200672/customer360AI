import { Router } from 'express';
import { EventService } from '../services/eventService.js';

const router = Router();
const service = new EventService();

// POST /api/v1/events (PDF Page 20-21, 26)
router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.customer_id || !payload.event_type) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: "Fields 'customer_id' and 'event_type' are required." },
      });
    }

    const updatedDecision = await service.processEvent(payload);
    res.json({
      success: true,
      data: updatedDecision,
      message: 'Real-Time Decision Loop executed successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'EVENT_PROCESSING_ERROR', message: err.message } });
  }
});

export default router;
