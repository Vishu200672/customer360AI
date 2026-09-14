import { Router, Request, Response } from 'express';
import { chatbotService, ChatRequest, ChatResponse } from '../services/chatbotService.js';

const router = Router();

/**
 * Extracts authentication token from standard Bearer Authorization header
 * or custom x-session-token header, matching existing backend auth conventions.
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const customHeader = req.headers['x-session-token'];
  if (typeof customHeader === 'string') {
    return customHeader.trim();
  }
  return null;
}

/**
 * GET /api/v1/chat/status
 * Returns operational status and current configuration mode of the chatbot service.
 */
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      bot_name: chatbotService.getBotName(),
      whatsapp_mode: chatbotService.getWhatsAppMode(),
      status: 'ONLINE',
      deterministic_routing: true,
    },
  });
});

/**
 * POST /api/v1/chat
 * Primary conversation endpoint for the Customer Intelligence Chatbot.
 * Validates request structure, authenticates token server-side, and delegates to chatbotService.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, customer_id, context, action_confirm } = req.body || {};

    // 1. Validate request structure
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'A valid message is required.',
      });
    }

    // 2. Extract and verify authentication token server-side
    // Never trust frontend-supplied roles or permissions
    const token = extractToken(req);
    let authenticatedUser;
    try {
      authenticatedUser = chatbotService.authenticateUser(token);
    } catch (authErr: any) {
      return res.status(401).json({
        success: false,
        error: authErr.message || 'Authentication required. Missing or invalid session token.',
      });
    }

    // 3. Assemble typed request and delegate to chatbot intelligence service
    const chatRequest: ChatRequest = {
      message: message.trim(),
      customer_id: customer_id ? String(customer_id).trim() : undefined,
      context,
      action_confirm,
    };

    const response: ChatResponse = await chatbotService.processChat(chatRequest, authenticatedUser);

    return res.status(200).json(response);
  } catch (err: any) {
    // Log unexpected errors server-side without leaking internals to the client
    console.error('[ChatRoutes] Unexpected error processing chat query:', err);
    return res.status(500).json({
      success: false,
      error: 'The chatbot is temporarily unavailable. Please try again.',
    });
  }
});

export default router;
