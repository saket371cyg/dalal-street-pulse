import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { getMongoDb } from '@/lib/db/mongodb';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
}

const SESSION_COOKIE_NAME = 'dsp_session_token';
const fallbackUsers = new Map<string, { user: AuthUser; passwordHash: string }>();

// Seed default demo user
const DEFAULT_PASSWORD = 'Investor@123';
const salt = bcrypt.genSaltSync(10);
const demoPasswordHash = bcrypt.hashSync(DEFAULT_PASSWORD, salt);

const DEMO_USER: AuthUser = {
  id: 'user_dalal_demo',
  email: 'investor@dalalstreetpulse.com',
  name: 'Saket (Dalal Street Trader)',
  role: 'admin',
  createdAt: new Date().toISOString(),
};

fallbackUsers.set(DEMO_USER.email.toLowerCase(), {
  user: DEMO_USER,
  passwordHash: demoPasswordHash,
});

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerUser(email: string, password: string, name: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail || !password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  const db = await getMongoDb();
  if (db) {
    try {
      const existing = await db.collection('users').findOne({ email: normalizedEmail });
      if (existing) {
        return { success: false, error: 'An account with this email already exists.' };
      }

      const passwordHash = await hashPassword(password);
      const newUser: AuthUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email: normalizedEmail,
        name: name.trim() || normalizedEmail.split('@')[0],
        role: 'user',
        createdAt: new Date().toISOString(),
      };

      await db.collection('users').insertOne({ ...newUser, passwordHash });
      return { success: true, user: newUser };
    } catch (e) {
      console.warn('MongoDB register error, using fallback:', e);
    }
  }

  if (fallbackUsers.has(normalizedEmail)) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const passwordHash = await hashPassword(password);
  const newUser: AuthUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    email: normalizedEmail,
    name: name.trim() || normalizedEmail.split('@')[0],
    role: 'user',
    createdAt: new Date().toISOString(),
  };

  fallbackUsers.set(normalizedEmail, { user: newUser, passwordHash });
  return { success: true, user: newUser };
}

export async function loginUser(email: string, password: string): Promise<{ success: boolean; user?: AuthUser; token?: string; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const db = await getMongoDb();

  if (db) {
    try {
      const found = await db.collection('users').findOne({ email: normalizedEmail });
      if (found && (await verifyPassword(password, found.passwordHash))) {
        const user: AuthUser = {
          id: found.id,
          email: found.email,
          name: found.name,
          role: found.role || 'user',
          createdAt: found.createdAt,
        };
        const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString('base64');
        return { success: true, user, token };
      }
    } catch (e) {
      console.warn('MongoDB login error, using fallback:', e);
    }
  }

  const entry = fallbackUsers.get(normalizedEmail);
  if (entry && (await verifyPassword(password, entry.passwordHash))) {
    const token = Buffer.from(`${entry.user.id}:${entry.user.email}:${Date.now()}`).toString('base64');
    return { success: true, user: entry.user, token };
  }

  return { success: false, error: 'Invalid email or password.' };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      // Return default demo user session for seamless development exploration
      return DEMO_USER;
    }

    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [id, email] = decoded.split(':');

    if (!id || !email) return DEMO_USER;

    const db = await getMongoDb();
    if (db) {
      const user = await db.collection<AuthUser>('users').findOne({ id, email });
      if (user) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'user',
          createdAt: user.createdAt,
        };
      }
    }

    const entry = fallbackUsers.get(email.toLowerCase());
    if (entry && entry.user.id === id) {
      return entry.user;
    }

    return DEMO_USER;
  } catch {
    return DEMO_USER;
  }
}
