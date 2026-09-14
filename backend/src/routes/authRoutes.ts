import { Router, Request, Response } from 'express';
import { authService } from '../services/authService.js';
import { emailService } from '../services/emailService.js';

const router = Router();

function getClientMeta(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Customer360 Web Console';
  return { ip, userAgent };
}

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

// 1. Get Demo Accounts for Quick 1-Click Hackathon Evaluation
router.get('/demo-accounts', (req: Request, res: Response) => {
  const accounts = authService.getDemoAccounts();
  res.json({
    success: true,
    data: accounts,
  });
});

// 2. Login Endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Both email and password are required for authentication.',
        },
      });
    }

    const meta = getClientMeta(req);
    const result = await authService.login(email, password, meta);

    res.json({
      success: true,
      data: result,
      message: `Authentication successful. Security notification email dispatched to ${result.user.email}.`,
    });
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: err.message || 'Authentication failed.',
      },
    });
  }
});

// 3. Register Endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, title, department } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Full name, email, and password are required.',
        },
      });
    }

    const meta = getClientMeta(req);
    const result = await authService.register({ name, email, password, role, title, department }, meta);

    res.status(201).json({
      success: true,
      data: result,
      message: `Account created successfully. Welcome and security email dispatched to ${result.user.email}.`,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: err.message || 'Registration failed.',
      },
    });
  }
});

// 4. Get Current Authenticated User (Session Verification)
router.get('/me', (req: Request, res: Response) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No authorization token provided.',
      },
    });
  }

  const user = authService.getUserByToken(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'SESSION_EXPIRED',
        message: 'Session is invalid or has expired. Please sign in again.',
      },
    });
  }

  res.json({
    success: true,
    data: user,
  });
});

// 5. Logout Endpoint
router.post('/logout', (req: Request, res: Response) => {
  const token = extractToken(req);
  if (token) {
    authService.logout(token);
  }

  res.json({
    success: true,
    data: {
      message: 'Logged out successfully. Console locked.',
    },
  });
});

// 6. Security & Email Audit Logs
router.get('/email-logs', (req: Request, res: Response) => {
  const logs = emailService.getEmailLogs();
  res.json({
    success: true,
    data: logs,
  });
});

// 7. Ad-hoc Test Security Email Dispatcher
router.post('/test-email', async (req: Request, res: Response) => {
  try {
    const { to, subject } = req.body;
    if (!to || !to.includes('@')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Valid recipient email is required.',
        },
      });
    }

    const log = await emailService.sendTestEmail(to, subject);

    res.json({
      success: true,
      data: log,
      message: `Test security email dispatched to ${to}.`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'EMAIL_DISPATCH_FAILED',
        message: err.message || 'Failed to dispatch test email.',
      },
    });
  }
});

export default router;
