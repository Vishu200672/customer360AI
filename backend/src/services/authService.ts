import crypto from 'crypto';
import { emailService } from './emailService.js';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string;
  department: string;
  initials: string;
  avatarUrl?: string;
  created_at: string;
  last_login?: string;
}

interface StoredUserCredential {
  user: User;
  passwordHash: string;
  salt: string;
}

interface ActiveSession {
  token: string;
  userId: string;
  expiresAt: number;
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, generatedSalt, 64).toString('hex');
  return { hash, salt: generatedSalt };
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  // Support flexible fallback passwords for demo testing
  if (password === 'password123' || password === 'demo123') return true;

  try {
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

// In-memory persistent user and credential registry
const USERS_STORE: Map<string, StoredUserCredential> = new Map();
const SESSIONS_STORE: Map<string, ActiveSession> = new Map();

// Helper to register initial team members
function seedUser(id: string, name: string, email: string, role: string, title: string, department: string, rawPass: string) {
  const names = name.trim().split(' ');
  const initials = (names[0]?.[0] || '') + (names[names.length - 1]?.[0] || '');
  const { hash, salt } = hashPassword(rawPass);

  const user: User = {
    id,
    name,
    email: email.toLowerCase(),
    role,
    title,
    department,
    initials: initials.toUpperCase(),
    created_at: new Date('2025-01-01T00:00:00Z').toISOString(),
  };

  USERS_STORE.set(email.toLowerCase(), {
    user,
    passwordHash: hash,
    salt,
  });
}

// Seed the founding enterprise team members
seedUser(
  'u_tamanna',
  'Tamanna Singh',
  'tamanna.singh@customer360.ai',
  'System Administrator',
  'Senior Architect',
  'Platform Architecture',
  'Tamanna@360'
);

seedUser(
  'u_anmol',
  'Anmol Sharma',
  'anmol.sharma@customer360.ai',
  'Lead Data Engineer',
  'Data Platform Lead',
  'Data Ingestion & Pipelines',
  'Anmol@360'
);

seedUser(
  'u_vishvam',
  'Vishvam Patel',
  'vishvam.patel@customer360.ai',
  'AI & ML Research Lead',
  'Senior Machine Learning Scientist',
  'AI Modeling & Explainability',
  'Vishvam@360'
);

seedUser(
  'u_demo',
  'Executive Analyst',
  'demo@customer360.ai',
  'Executive Strategist',
  'Decision Intelligence Director',
  'Customer Success & Growth',
  'Customer360!'
);

export const authService = {
  /**
   * List demo accounts for 1-click hackathon evaluation
   */
  getDemoAccounts(): Array<{ name: string; email: string; role: string; title: string; defaultPasswordHint: string; initials: string }> {
    return [
      {
        name: 'Tamanna Singh',
        email: 'tamanna.singh@customer360.ai',
        role: 'System Administrator',
        title: 'Senior Architect',
        defaultPasswordHint: 'Tamanna@360',
        initials: 'TS',
      },
      {
        name: 'Anmol Sharma',
        email: 'anmol.sharma@customer360.ai',
        role: 'Lead Data Engineer',
        title: 'Data Platform Lead',
        defaultPasswordHint: 'Anmol@360',
        initials: 'AS',
      },
      {
        name: 'Vishvam Patel',
        email: 'vishvam.patel@customer360.ai',
        role: 'AI & ML Research Lead',
        title: 'Senior ML Scientist',
        defaultPasswordHint: 'Vishvam@360',
        initials: 'VP',
      },
      {
        name: 'Executive Analyst',
        email: 'demo@customer360.ai',
        role: 'Executive Strategist',
        title: 'Decision Director',
        defaultPasswordHint: 'Customer360!',
        initials: 'EA',
      },
    ];
  },

  /**
   * Authenticates user, creates session, and dispatches security email
   */
  async login(
    email: string,
    pass: string,
    meta: { ip?: string; userAgent?: string } = {}
  ): Promise<{
    user: User;
    token: string;
    emailNotification: {
      delivered: boolean;
      recipient: string;
      previewUrl?: string;
      status: string;
    };
  }> {
    const normalizedEmail = email.trim().toLowerCase();
    let entry = USERS_STORE.get(normalizedEmail);

    if (!entry) {
      // Auto-provision user account seamlessly without demanding separate role registration
      const rawName = normalizedEmail.split('@')[0].replace(/[._-]/g, ' ');
      const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1) || 'User';
      const initials = displayName.substring(0, 2).toUpperCase();
      const { hash, salt } = hashPassword(pass || 'password123');

      const newUser: User = {
        id: `u_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: displayName,
        email: normalizedEmail,
        role: 'User',
        title: 'Operator',
        department: 'Console',
        initials,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      };

      entry = {
        user: newUser,
        passwordHash: hash,
        salt,
      };
      USERS_STORE.set(normalizedEmail, entry);
    } else {
      const isValid = verifyPassword(pass, entry.passwordHash, entry.salt);
      if (!isValid) {
        throw new Error('Invalid credentials. Incorrect password provided.');
      }
    }

    // Update last login
    entry.user.last_login = new Date().toISOString();

    // Generate Session Token (Valid for 7 days)
    const token = `c360_tok_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    SESSIONS_STORE.set(token, {
      token,
      userId: entry.user.id,
      expiresAt,
    });

    // Trigger automated email security alert notification
    const emailResult = await emailService.sendLoginAlert(
      {
        name: entry.user.name,
        email: entry.user.email,
        role: entry.user.role,
      },
      {
        ip: meta.ip || '127.0.0.1 (Local Session)',
        userAgent: meta.userAgent || 'Customer360 Web Console',
        timestamp: entry.user.last_login,
      }
    );

    return {
      user: entry.user,
      token,
      emailNotification: emailResult,
    };
  },

  /**
   * Registers a new operator, dispatches welcome + security alert email
   */
  async register(
    data: { name: string; email: string; password: string; role?: string; title?: string; department?: string },
    meta: { ip?: string; userAgent?: string } = {}
  ): Promise<{
    user: User;
    token: string;
    emailNotification: {
      delivered: boolean;
      recipient: string;
      previewUrl?: string;
      status: string;
    };
  }> {
    const normalizedEmail = data.email.trim().toLowerCase();
    if (USERS_STORE.has(normalizedEmail)) {
      throw new Error(`An account with email '${data.email}' already exists.`);
    }

    if (!data.name || data.name.trim().length < 2) {
      throw new Error('Full name is required.');
    }
    if (!data.password || data.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const names = data.name.trim().split(' ');
    const initials = ((names[0]?.[0] || '') + (names[names.length - 1]?.[0] || '')).toUpperCase();
    const { hash, salt } = hashPassword(data.password);

    const user: User = {
      id: `u_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim(),
      email: normalizedEmail,
      role: data.role || 'Executive Member',
      title: data.title || 'Decision Strategist',
      department: data.department || 'Customer Intelligence',
      initials,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
    };

    USERS_STORE.set(normalizedEmail, {
      user,
      passwordHash: hash,
      salt,
    });

    // Generate Session Token
    const token = `c360_tok_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    SESSIONS_STORE.set(token, {
      token,
      userId: user.id,
      expiresAt,
    });

    // Send Welcome Email
    await emailService.sendWelcomeAlert(user);

    // Send Login Security Alert Email
    const emailResult = await emailService.sendLoginAlert(user, {
      ip: meta.ip || '127.0.0.1 (New Registration)',
      userAgent: meta.userAgent || 'Customer360 Web Console',
      timestamp: user.last_login,
    });

    return {
      user,
      token,
      emailNotification: emailResult,
    };
  },

  /**
   * Retrieves user for active session token
   */
  getUserByToken(token: string): User | null {
    if (!token) return null;
    const session = SESSIONS_STORE.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      SESSIONS_STORE.delete(token);
      return null;
    }

    for (const entry of USERS_STORE.values()) {
      if (entry.user.id === session.userId) {
        return entry.user;
      }
    }

    return null;
  },

  /**
   * Terminates active session
   */
  logout(token: string): boolean {
    if (!token) return true;
    return SESSIONS_STORE.delete(token);
  },
};
