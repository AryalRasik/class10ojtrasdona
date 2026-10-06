require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
// SECURITY: a per-boot random secret silently invalidates sessions on restart
// and differs per instance. In production we refuse to start without explicit
// secrets instead of falling back to a throwaway value.
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}
if (isProduction && !process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET must be set in production');
}
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');
const BCRYPT_ROUNDS = 12;

// In-memory user store (demo mode - production would use database)
const users = new Map();
const refreshTokens = new Set();
const loginAttempts = new Map();
const activityLog = [];
const auditLog = [];

// Seed demo users
const seedUsers = async () => {
  const demos = [
    { id: 'demo-student-1', email: 'anita.s@saraswatischool.edu.np', name: 'Anita Sharma', role: 'student', grade: '10', className: 'A', studentId: 'STU-1001', password: 'demo123' },
    { id: 'demo-student-2', email: 'bikash.p@saraswatischool.edu.np', name: 'Bikash Poudel', role: 'student', grade: '9', className: 'B', studentId: 'STU-1002', password: 'demo123' },
    { id: 'demo-teacher-1', email: 'r.adhikari@saraswatischool.edu.np', name: 'Mr. Rajesh Adhikari', role: 'teacher', department: 'English', teacherId: 'TCH-1001', password: 'demo123' },
    { id: 'demo-teacher-2', email: 's.bhandari@saraswatischool.edu.np', name: 'Ms. Sarita Bhandari', role: 'teacher', department: 'Science', teacherId: 'TCH-1002', password: 'demo123' },
    { id: 'demo-librarian-1', email: 'laxmi@saraswatischool.edu.np', name: 'Laxmi Devi', role: 'librarian', librarianId: 'LIB-001', password: 'demo123' },
    { id: 'demo-admin-1', email: 'admin@saraswatischool.edu.np', name: 'System Admin', role: 'admin', adminId: 'ADM-001', password: 'admin123' }
  ];
  for (const u of demos) {
    if (!users.has(u.email)) {
      const hash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
      users.set(u.email, { ...u, passwordHash: hash, createdAt: new Date().toISOString(), lastLogin: null, loginCount: 0, failedAttempts: 0, lockedUntil: null });
    }
  }
};
// SECURITY: the demo accounts use published passwords. Never create them in
// production; opt in locally with ENABLE_DEMO_AUTH=true.
if (process.env.ENABLE_DEMO_AUTH === 'true' && !isProduction) {
  seedUsers();
} else {
  console.warn('Demo auth seeding disabled (set ENABLE_DEMO_AUTH=true to enable locally).');
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://cagbihfzktmebjkxwkwd.supabase.co"],
      frameSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// SECURITY: `origin: true` reflects ANY requesting origin while allowing
// credentials, so a hostile site could make authenticated requests. Default to
// same-origin only; set CORS_ORIGIN to a comma-separated allowlist to widen it.
const corsAllowlist = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (corsAllowlist.includes(origin)) return callback(null, true);
    if (corsAllowlist.length === 0) return callback(null, false);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

const borrowLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many borrow requests. Please wait.' }
});

// CSRF token generation
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf_token', csrfToken, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  }
  next();
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// JWT Middleware
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  refreshTokens.add(refreshToken);
  return { accessToken, refreshToken };
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.get(decoded.userId) || findUserById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.status(423).json({ error: 'Account is temporarily locked' });
    }
    req.user = { ...user, passwordHash: undefined };
    next();
  } catch (e) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = users.get(decoded.userId) || findUserById(decoded.userId);
      if (user) req.user = { ...user, passwordHash: undefined };
    } catch (e) { /* ignore */ }
  }
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

const findUserById = (id) => {
  for (const [, user] of users) {
    if (user.id === id) return user;
  }
  return null;
};

const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').trim();
};

const logActivity = (userId, action, details, ip) => {
  activityLog.push({ userId, action, details, ip, timestamp: new Date().toISOString() });
  if (activityLog.length > 10000) activityLog.shift();
};

const logAudit = (userId, action, details, ip, severity = 'info') => {
  auditLog.push({ userId, action, details, ip, severity, timestamp: new Date().toISOString() });
  if (auditLog.length > 10000) auditLog.shift();
};

// ==================== API ROUTES ====================

// Auth: Sign Up
app.post('/api/auth/signup', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('name').trim().isLength({ min: 2, max: 100 }).escape(),
  body('role').optional().isIn(['student', 'teacher'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { email, password, name, role, studentId, teacherId, grade, className, department } = req.body;

  if (users.has(email)) return res.status(409).json({ error: 'Email already registered' });

  const id = `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = {
    id, email, name, role: role || 'student',
    grade: grade || '', className: className || '',
    department: department || '',
    studentId: studentId || '', teacherId: teacherId || '',
    avatar: name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
    passwordHash, createdAt: new Date().toISOString(),
    lastLogin: null, loginCount: 0, failedAttempts: 0, lockedUntil: null,
    borrowCount: 0, readingStreak: 0
  };

  users.set(email, user);
  logActivity(id, 'signup', `New ${user.role} registered: ${email}`, req.ip);
  logAudit(id, 'signup', `Account created: ${email} (${user.role})`, req.ip);

  const tokens = generateTokens(id);
  res.cookie('access_token', tokens.accessToken, { httpOnly: true, sameSite: 'strict', maxAge: 3600000, secure: process.env.NODE_ENV === 'production' });
  res.cookie('refresh_token', tokens.refreshToken, { httpOnly: true, sameSite: 'strict', maxAge: 604800000, secure: process.env.NODE_ENV === 'production' });

  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, accessToken: tokens.accessToken });
});

// Auth: Sign In
app.post('/api/auth/signin', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid email or password format' });

  const { email, password } = req.body;
  const user = users.get(email);

  if (!user) {
    logAudit('unknown', 'login_failed', `Unknown email: ${email}`, req.ip, 'warning');
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Check account lockout
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const remaining = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
    return res.status(423).json({ error: `Account locked. Try again in ${remaining} minutes.` });
  }

  // Check login attempts
  const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: null };
  if (attempts.count >= 5 && Date.now() - attempts.lastAttempt < 900000) {
    user.lockedUntil = new Date(Date.now() + 30 * 60000).toISOString();
    users.set(email, user);
    logAudit(user.id, 'account_locked', `Account locked due to too many failed attempts`, req.ip, 'danger');
    return res.status(423).json({ error: 'Account locked due to too many failed attempts. Try again in 30 minutes.' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    attempts.count++;
    attempts.lastAttempt = Date.now();
    loginAttempts.set(email, attempts);
    user.failedAttempts = attempts.count;
    users.set(email, user);
    logAudit(user.id, 'login_failed', `Failed login attempt #${attempts.count}`, req.ip, 'warning');
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Successful login
  loginAttempts.delete(email);
  user.lastLogin = new Date().toISOString();
  user.loginCount = (user.loginCount || 0) + 1;
  user.failedAttempts = 0;
  user.lockedUntil = null;
  users.set(email, user);

  const tokens = generateTokens(user.id);
  res.cookie('access_token', tokens.accessToken, { httpOnly: true, sameSite: 'strict', maxAge: 3600000, secure: process.env.NODE_ENV === 'production' });
  res.cookie('refresh_token', tokens.refreshToken, { httpOnly: true, sameSite: 'strict', maxAge: 604800000, secure: process.env.NODE_ENV === 'production' });

  logActivity(user.id, 'login', `Successful login`, req.ip);
  logAudit(user.id, 'login', `Login successful`, req.ip);

  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, accessToken: tokens.accessToken });
});

// Auth: Refresh Token
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = findUserById(decoded.userId);
    if (!user) return res.status(403).json({ error: 'User not found' });

    refreshTokens.delete(refreshToken);
    const tokens = generateTokens(user.id);
    res.cookie('access_token', tokens.accessToken, { httpOnly: true, sameSite: 'strict', maxAge: 3600000, secure: process.env.NODE_ENV === 'production' });
    res.cookie('refresh_token', tokens.refreshToken, { httpOnly: true, sameSite: 'strict', maxAge: 604800000, secure: process.env.NODE_ENV === 'production' });
    res.json({ accessToken: tokens.accessToken });
  } catch (e) {
    refreshTokens.delete(refreshToken);
    return res.status(403).json({ error: 'Invalid refresh token' });
  }
});

// Auth: Sign Out
app.post('/api/auth/signout', authenticateToken, (req, res) => {
  logActivity(req.user.id, 'logout', 'User signed out', req.ip);
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.json({ success: true });
});

// Auth: Get Current User
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Auth: Verify Token (client calls this to validate session)
app.post('/api/auth/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.json({ valid: false, reason: 'no_token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = findUserById(decoded.userId);
    if (!user) return res.json({ valid: false, reason: 'user_not_found' });
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.json({ valid: false, reason: 'account_locked' });
    }
    const { passwordHash: _, ...safeUser } = user;
    res.json({ valid: true, user: safeUser });
  } catch (e) {
    res.json({ valid: false, reason: 'invalid_token' });
  }
});

// Auth: Forgot Password
app.post('/api/auth/forgot-password', authLimiter, [
  body('email').isEmail().normalizeEmail()
], (req, res) => {
  const { email } = req.body;
  const user = users.get(email);
  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetExpires = new Date(Date.now() + 3600000).toISOString();
    users.set(email, user);
    logAudit(user.id, 'password_reset_request', 'Password reset requested', req.ip);
  }
  // Always return success to prevent email enumeration
  res.json({ message: 'If an account exists with this email, a reset link has been sent.' });
});

// Auth: Reset Password
app.post('/api/auth/reset-password', authLimiter, [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
], async (req, res) => {
  const { token, password } = req.body;
  let foundUser = null;
  let foundEmail = null;
  for (const [email, user] of users) {
    if (user.resetToken === token && user.resetExpires && new Date(user.resetExpires) > new Date()) {
      foundUser = user;
      foundEmail = email;
      break;
    }
  }
  if (!foundUser) return res.status(400).json({ error: 'Invalid or expired reset token' });

  foundUser.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  foundUser.resetToken = null;
  foundUser.resetExpires = null;
  users.set(foundEmail, foundUser);
  logAudit(foundUser.id, 'password_reset_complete', 'Password has been reset', req.ip);
  res.json({ message: 'Password reset successful' });
});

// Auth: Change Password
app.post('/api/auth/change-password', authenticateToken, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
], async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = users.get(req.user.email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  users.set(req.user.email, user);
  logAudit(user.id, 'password_changed', 'Password changed', req.ip);
  res.json({ message: 'Password changed successfully' });
});

// ==================== USER MANAGEMENT ====================
app.get('/api/users', authenticateToken, requireRole('admin', 'librarian'), (req, res) => {
  const allUsers = [];
  for (const [, user] of users) {
    const { passwordHash, ...safe } = user;
    allUsers.push(safe);
  }
  res.json({ users: allUsers });
});

// SECURITY: this route had no role check, so ANY signed-in user could read
// ANY other account (email, role, ids) by iterating the id.
app.get('/api/users/:id', authenticateToken, (req, res) => {
  const isSelf = !!req.user && req.user.id === req.params.id;
  if (!isSelf && !['admin', 'librarian'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const user = findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, ...safe } = user;
  res.json({ user: safe });
});

app.put('/api/users/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { name, role, grade, className, department } = req.body;
  if (name) user.name = sanitizeInput(name);
  if (role) user.role = role;
  if (grade !== undefined) user.grade = grade;
  if (className !== undefined) user.className = className;
  if (department !== undefined) user.department = department;
  if (name) user.avatar = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  users.set(user.email, user);
  logAudit(req.user.id, 'user_updated', `Updated user: ${user.email}`, req.ip);
  const { passwordHash, ...safe } = user;
  res.json({ user: safe });
});

// ==================== ACTIVITY & AUDIT LOGS ====================
app.get('/api/logs/activity', authenticateToken, requireRole('admin', 'librarian'), (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
  res.json({ logs: activityLog.slice(-limit).reverse() });
});

app.get('/api/logs/audit', authenticateToken, requireRole('admin'), (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
  res.json({ logs: auditLog.slice(-limit).reverse() });
});

// ==================== SYSTEM HEALTH ====================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ==================== BOOK PDF UPLOADS ====================
// The PDF file itself lives in a Supabase Storage bucket; the `books` row only
// stores the public URL plus the display name, so listing books stays cheap.
//
// Authorization happens HERE, on the server: every request must carry the
// caller's Supabase access token, the token is verified against Supabase Auth,
// and the caller's role is read from their own `profiles` row. Only `admin`
// and `librarian` pass. Hiding the field in the form is a convenience, not a
// security control - a student or teacher calling these routes directly gets
// 403 no matter what the browser does.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PDF_BUCKET = 'book-pdfs';
const PDF_MAX_BYTES = 20 * 1024 * 1024;
const PDF_UPLOAD_ROLES = ['admin', 'librarian'];
const PDF_FORBIDDEN_UPLOAD = 'You do not have permission to upload book PDFs.';
const PDF_FORBIDDEN_REMOVE = 'You do not have permission to remove book PDFs.';

const bearerToken = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
};

// Supabase client bound to the caller's own access token: PostgREST verifies
// the signature/expiry and auth.uid() then points at that user, so the role we
// read back can never be forged by the client.
const supabaseForToken = (token) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${token}` } },
  auth: { persistSession: false, autoRefreshToken: false }
});

// Privileged client used only AFTER the role check, to write the bucket and
// the books row. Never sent to the browser.
let pdfServiceClient = null;
const pdfService = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  if (!pdfServiceClient) {
    pdfServiceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return pdfServiceClient;
};

const requirePdfRole = (forbiddenMessage) => async (req, res, next) => {
  try {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(503).json({ error: 'Book PDF uploads are not configured on this server' });
    }

    const userClient = supabaseForToken(token);
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData || !userData.user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('id, role')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);

    if (!profile || !PDF_UPLOAD_ROLES.includes(profile.role)) {
      logAudit(userData.user.id, 'book_pdf_denied', `Denied book PDF access for ${req.method} ${req.path}`, req.ip, 'warning');
      return res.status(403).json({ error: forbiddenMessage });
    }

    req.pdfUser = { id: profile.id, role: profile.role };
    next();
  } catch (e) {
    console.error('PDF role check failed:', e.message);
    res.status(500).json({ error: 'Could not verify your permissions' });
  }
};

const pdfFilenameFrom = (req) => {
  const raw = req.query.filename || req.headers['x-filename'] || '';
  let name;
  try { name = decodeURIComponent(String(raw)); } catch (e) { name = String(raw); }
  // Strip path separators and control characters, never trust the client name.
  name = name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').trim();
  if (!name) return `book-${req.params.id}.pdf`;
  if (!/\.pdf$/i.test(name)) name += '.pdf';
  return name.slice(-120);
};

// Writes pdf_url / pdf_filename. If schema.sql has not been re-run yet the
// pdf_filename column is missing - fall back to updating only pdf_url so the
// upload still works, and let the UI display a derived name.
const filenameFromUrl = (url) => {
  try {
    const last = decodeURIComponent(String(url || '').split('?')[0].split('#')[0].split('/').pop() || '');
    return last || 'book.pdf';
  } catch (e) {
    return 'book.pdf';
  }
};

const writeBookPdfColumns = async (bookId, fields) => {
  const supa = pdfService();
  if (!supa) return { status: 503, error: 'Book PDF storage is not configured on this server' };

  let { data, error } = await supa.from('books').update(fields).eq('id', bookId).select('id');
  if (error && /pdf_filename/.test(error.message || '')) {
    const { pdf_filename, ...rest } = fields;
    ({ data, error } = await supa.from('books').update(rest).eq('id', bookId).select('id'));
  }
  if (error) return { status: 500, error: `Database error: ${error.message}` };
  if (!data || data.length === 0) return { status: 404, error: 'Book not found' };
  return { data: data[0] };
};

const parseBookId = (req) => {
  const raw = (req.params && req.params.id) || req.query.bookId || '';
  const id = parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// ==================== DIGITAL READING ACCESS ====================
// The PDF files live in a Storage bucket; the ONLY way to download one is
// GET /api/books/:id/pdf, which runs canReadBook() below on the server. The
// bucket is private, so the old /object/public/... URL stops working: even if
// someone copies a URL out of the database, Supabase refuses it without a
// signed token we never hand out. This is what enforces the rule
// "request -> librarian approval -> reading".
const READER_ROLES_STAFF = ['admin', 'librarian'];
// Loan states that still hold an open claim on the book.
const READER_ACTIVE_STATUSES = ['pending', 'approved', 'borrowed', 'overdue', 'return_requested'];
// Loan states where the digital copy may actually be opened.
const READER_READABLE_STATUSES = ['approved', 'borrowed', 'return_requested'];

const localDay = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const ensurePrivateBucket = async (supa) => {
  const { error: createError } = await supa.storage.createBucket(PDF_BUCKET, { public: false });
  if (createError && !/already exists|duplicate/i.test(createError.message || '')) {
    throw new Error(createError.message);
  }
  // Buckets created earlier by the upload flow were public. Flip them private
  // so the raw Storage URL can never bypass canReadBook().
  const { error: updateError } = await supa.storage.updateBucket(PDF_BUCKET, { public: false });
  if (updateError) console.warn('PDF bucket privacy could not be enforced:', updateError.message);
};

// Resolves where a book's PDF bytes live. Storage objects (uploaded through
// the librarian UI) are the protected case; files bundled under assets/ are
// streamed through the same gate; http(s) URLs point outside the library and
// are never proxied - the reader shows a link instead once approval passes.
const bookPdfSource = (book) => {
  const url = String((book && book.pdf_url) || '').trim();
  if (!url) return null;

  const marker = `/${PDF_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx >= 0) {
    let p = url.slice(idx + marker.length).split('?')[0].split('#')[0];
    try { p = decodeURIComponent(p); } catch (e) { /* keep raw */ }
    if (p) return { mode: 'storage', path: p };
  }

  if (/^https?:\/\//i.test(url)) return { mode: 'external', url };

  const rel = url.replace(/^\.?[\\/]/, '');
  if (/^assets[\\/]/i.test(rel) && !rel.includes('..')) {
    return { mode: 'asset', file: path.join(__dirname, rel) };
  }

  if (book.pdf_filename) return { mode: 'storage', path: `${book.id}/${encodeURIComponent(book.pdf_filename)}` };
  return null;
};

// canReadBook(userId, role, bookId) - the single source of truth for "may
// this user open the full PDF of this book?" It is deliberately server-side:
// every input (status, dates, role) comes from the database, never from the
// browser.
const canReadBook = async (userId, role, bookId) => {
  const supa = pdfService();
  if (!supa) return { canRead: false, status: 'unconfigured', message: 'Book reading is not configured on this server.' };

  const { data: book, error: bookError } = await supa
    .from('books')
    .select('id, title, pdf_url, pdf_filename')
    .eq('id', bookId)
    .maybeSingle();
  if (bookError) throw new Error(bookError.message);
  if (!book) return { canRead: false, status: 'not_found', message: 'Book not found.' };

  const base = { bookId: book.id, title: book.title, hasPdf: !!book.pdf_url };

  // Staff who administer the collection may always open what they host.
  if (READER_ROLES_STAFF.includes(role)) {
    return book.pdf_url
      ? { ...base, canRead: true, status: 'staff', message: '', fileName: filenameFromUrl(book.pdf_url) }
      : { ...base, canRead: false, status: 'no_pdf', message: 'This book does not have a digital PDF copy yet.' };
  }

  if (!book.pdf_url) {
    return { ...base, canRead: false, status: 'no_pdf', message: 'This book does not have a digital PDF copy yet.' };
  }

  const { data: rows, error: reqError } = await supa
    .from('borrow_requests')
    .select('id, status, borrow_date, expected_return_date, rejection_reason, request_time')
    .eq('student_id', userId)
    .eq('book_id', bookId)
    .order('request_time', { ascending: false });
  if (reqError) throw new Error(reqError.message);

  const all = rows || [];
  const request = all.find(r => READER_ACTIVE_STATUSES.includes(r.status)) || all[0] || null;
  const ctx = { ...base, requestId: request ? request.id : null, startDate: request ? request.borrow_date : null, dueDate: request ? request.expected_return_date : null };

  if (!request) {
    return {
      ...ctx, canRead: false, status: 'no_request',
      message: 'You do not have permission to read this book yet. Request to borrow it - a librarian must approve your request before the digital copy unlocks.'
    };
  }

  switch (request.status) {
    case 'pending':
      return { ...ctx, canRead: false, status: 'pending', message: 'Your borrow request is waiting for librarian approval. The PDF unlocks as soon as it is approved.' };
    case 'rejected':
      return { ...ctx, canRead: false, status: 'rejected', message: `Your borrow request was rejected${request.rejection_reason && request.rejection_reason !== 'Not specified' ? ': ' + request.rejection_reason : '.'}` };
    case 'returned':
      return { ...ctx, canRead: false, status: 'returned', message: 'This book has been returned. Request to borrow it again to keep reading.' };
    case 'expired':
      return { ...ctx, canRead: false, status: 'expired', message: `Your borrow period expired on ${request.expected_return_date || 'the due date'}. Ask the librarian to renew it, or request the book again.` };
    case 'overdue':
      return { ...ctx, canRead: false, status: 'expired', message: `Your borrow period expired on ${request.expected_return_date || 'the due date'}. Return the book to the library to clear the fine.` };
    case 'approved':
    case 'borrowed':
    case 'return_requested': {
      const today = localDay();
      const start = request.borrow_date || null;
      const due = request.expected_return_date || null;
      if (start && today < start) {
        return { ...ctx, canRead: false, status: 'not_started', message: `Your borrow period starts on ${start}. The PDF unlocks then.` };
      }
      if (due && today > due) {
        // Lazily persist EXPIRED for an approved-but-never-picked-up loan so
        // the status is visible everywhere, not just in this response.
        if (request.status === 'approved') {
          await supa.from('borrow_requests').update({ status: 'expired' }).eq('id', request.id).eq('status', 'approved');
          await supa.from('notifications').insert({
            user_id: userId, type: 'borrow_expired', title: 'Borrow Period Expired',
            message: `Your approved borrow of "${book.title}" expired on ${due}. Request the book again to continue reading.`,
            icon: 'alert-triangle', read: false, time: 'Just now'
          }).catch(() => {});
        }
        return { ...ctx, canRead: false, status: 'expired', message: `Your borrow period expired on ${due}. Ask the librarian to renew it, or request the book again.` };
      }
      return { ...ctx, canRead: true, status: 'approved', message: `Digital reading is open until ${due || 'the due date'}.`, fileName: filenameFromUrl(book.pdf_url) };
    }
    default:
      return { ...ctx, canRead: false, status: request.status, message: 'This borrow is not active, so the digital copy stays locked.' };
  }
};

// Verifies the caller's Supabase token and loads their real profile row.
const requireReader = async (req, res, next) => {
  try {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(503).json({ error: 'Book reading is not configured on this server' });
    }

    const userClient = supabaseForToken(token);
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData || !userData.user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('id, role')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profile) return res.status(403).json({ error: 'Your account profile was not found.' });

    req.reader = { id: profile.id, role: profile.role };
    next();
  } catch (e) {
    console.error('Reader check failed:', e.message);
    res.status(500).json({ error: 'Could not verify your permissions' });
  }
};

// POST /api/books/:id/pdf  - upload a PDF (also used to replace one)
// PUT  /api/books/:id/pdf  - replace the PDF
const uploadBookPdf = async (req, res) => {
  try {
    const bookId = parseBookId(req);
    if (!bookId) return res.status(400).json({ error: 'A valid book id is required' });

    const filename = pdfFilenameFrom(req);
    const declared = String(req.headers['content-type'] || '').toLowerCase();
    if (declared && !declared.includes('pdf') && !declared.includes('octet-stream')) {
      return res.status(400).json({ error: `Only PDF files are allowed. Send the file as Content-Type: application/pdf (received "${declared}").` });
    }

    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'No file received. Send the PDF as the request body.' });
    }
    if (buffer.length > PDF_MAX_BYTES) {
      return res.status(413).json({ error: 'PDF must be smaller than 20MB' });
    }
    // Real PDFs start with %PDF-; extension and MIME type are attacker-controlled.
    const header = buffer.slice(0, 1024).toString('latin1');
    if (!/^\s*%PDF-/.test(header)) {
      return res.status(400).json({ error: 'Only PDF files are allowed.' });
    }

    const supa = pdfService();
    if (!supa) return res.status(503).json({ error: 'Book PDF storage is not configured on this server' });

    try {
      await ensurePrivateBucket(supa);
    } catch (bucketError) {
      return res.status(500).json({ error: `Could not prepare PDF storage: ${bucketError.message}` });
    }

    // One folder per book keeps every copy of the same book's PDF together, so
    // replacing is a matter of clearing the folder before the new upload. The
    // original file name lives in the object path as well as in
    // books.pdf_filename, so the UI can show "Current PDF: name.pdf" even on a
    // database that has not been re-run with the latest schema.sql.
    const folder = String(bookId);
    const objectName = encodeURIComponent(filename);
    const objectPath = `${folder}/${objectName}`;

    const { data: existing, error: listError } = await supa.storage.from(PDF_BUCKET).list(folder);
    if (listError) {
      return res.status(500).json({ error: `PDF storage error: ${listError.message}` });
    }
    const stale = (existing || []).filter(o => o.name !== objectName).map(o => `${folder}/${o.name}`);
    if (stale.length) await supa.storage.from(PDF_BUCKET).remove(stale).catch(() => {});

    const { error: uploadError } = await supa.storage.from(PDF_BUCKET).upload(objectPath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
      cacheControl: '3600'
    });
    if (uploadError) return res.status(500).json({ error: `PDF storage error: ${uploadError.message}` });

    const { data: publicData, error: urlError } = supa.storage.from(PDF_BUCKET).getPublicUrl(objectPath);
    const pdfUrl = (publicData && publicData.publicUrl) || '';
    if (urlError || !pdfUrl) {
      return res.status(500).json({ error: `Could not build the PDF URL: ${urlError ? urlError.message : 'empty URL'}` });
    }

    const saved = await writeBookPdfColumns(bookId, { pdf_url: pdfUrl, pdf_filename: filename });
    if (saved.error) {
      // Do not leave an orphaned object behind when the row write failed.
      await supa.storage.from(PDF_BUCKET).remove([objectPath]).catch(() => {});
      return res.status(saved.status || 500).json({ error: saved.error });
    }

    logAudit(req.pdfUser.id, 'book_pdf_uploaded', `Uploaded "${filename}" for book #${bookId}`, req.ip);
    res.json({ success: true, pdfUrl, pdfFilename: filename });
  } catch (e) {
    console.error('PDF upload failed:', e);
    res.status(500).json({ error: 'PDF upload failed' });
  }
};

// DELETE /api/books/:id/pdf - remove the PDF from a book
const deleteBookPdf = async (req, res) => {
  try {
    const bookId = parseBookId(req);
    if (!bookId) return res.status(400).json({ error: 'A valid book id is required' });

    const supa = pdfService();
    if (!supa) return res.status(503).json({ error: 'Book PDF storage is not configured on this server' });

    const { data: book, error: bookError } = await supa
      .from('books').select('id, pdf_url').eq('id', bookId).maybeSingle();
    if (bookError) return res.status(500).json({ error: `Database error: ${bookError.message}` });
    if (!book) return res.status(404).json({ error: 'Book not found' });

    // Clear the whole per-book folder (replaces may have left several names).
    const { data: objects, error: listError } = await supa.storage.from(PDF_BUCKET).list(String(bookId));
    if (listError) {
      return res.status(500).json({ error: `PDF storage error: ${listError.message}` });
    }
    const objectNames = (objects || []).map(o => `${bookId}/${o.name}`);
    if (objectNames.length) {
      const { error: removeError } = await supa.storage.from(PDF_BUCKET).remove(objectNames);
      if (removeError) {
        return res.status(500).json({ error: `PDF storage error: ${removeError.message}` });
      }
    }

    const saved = await writeBookPdfColumns(bookId, { pdf_url: '', pdf_filename: '' });
    if (saved.error) return res.status(saved.status || 500).json({ error: saved.error });

    const previousName = filenameFromUrl(book.pdf_url);
    logAudit(req.pdfUser.id, 'book_pdf_removed',
      `Removed "${previousName}" PDF from book #${bookId}`, req.ip);
    res.json({ success: true, removed: true });
  } catch (e) {
    console.error('PDF delete failed:', e);
    res.status(500).json({ error: 'PDF delete failed' });
  }
};

const pdfRawBody = express.raw({ type: ['application/pdf', 'application/octet-stream'], limit: '20mb' });

// RESTful routes the form uses...
app.post('/api/books/:id/pdf', requirePdfRole(PDF_FORBIDDEN_UPLOAD), pdfRawBody, uploadBookPdf);
app.put('/api/books/:id/pdf', requirePdfRole(PDF_FORBIDDEN_UPLOAD), pdfRawBody, uploadBookPdf);
app.delete('/api/books/:id/pdf', requirePdfRole(PDF_FORBIDDEN_REMOVE), deleteBookPdf);
// ...and the flat route names from the spec (book id via ?bookId=).
app.post('/upload-pdf', requirePdfRole(PDF_FORBIDDEN_UPLOAD), pdfRawBody, uploadBookPdf);
app.put('/replace-pdf', requirePdfRole(PDF_FORBIDDEN_UPLOAD), pdfRawBody, uploadBookPdf);
app.delete('/delete-pdf', requirePdfRole(PDF_FORBIDDEN_REMOVE), deleteBookPdf);

// ==================== PROTECTED DIGITAL READER ====================
// GET /api/books/:id/access - "may I read this book?" (JSON, no file bytes)
// GET /api/books/:id/pdf    - the PDF itself; 403 unless canReadBook() passes.
app.get('/api/books/:id/access', requireReader, async (req, res) => {
  try {
    const bookId = parseBookId(req);
    if (!bookId) return res.status(400).json({ error: 'A valid book id is required' });
    const state = await canReadBook(req.reader.id, req.reader.role, bookId);
    res.json(state);
  } catch (e) {
    console.error('Reading access check failed:', e.message);
    res.status(500).json({ error: 'Could not check reading access' });
  }
});

app.get('/api/books/:id/pdf', requireReader, async (req, res) => {
  try {
    const bookId = parseBookId(req);
    if (!bookId) return res.status(400).json({ error: 'A valid book id is required' });

    const state = await canReadBook(req.reader.id, req.reader.role, bookId);
    if (!state.canRead) {
      logAudit(req.reader.id, 'book_read_denied',
        `Denied PDF read for book #${bookId} (${state.status})`, req.ip, 'warning');
      return res.status(403).json({ error: state.message, status: state.status });
    }

    const supa = pdfService();
    if (!supa) return res.status(503).json({ error: 'Book reading is not configured on this server' });

    const { data: book, error: bookError } = await supa
      .from('books')
      .select('id, pdf_url, pdf_filename')
      .eq('id', bookId)
      .maybeSingle();
    if (bookError) throw new Error(bookError.message);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const source = bookPdfSource(book);
    if (!source) return res.status(404).json({ error: 'This book does not have a digital PDF copy yet.', status: 'no_pdf' });

    let buffer;
    const fileName = filenameFromUrl(book.pdf_url) || `book-${bookId}.pdf`;

    if (source.mode === 'storage') {
      const { data: blob, error: downloadError } = await supa.storage.from(PDF_BUCKET).download(source.path);
      if (downloadError || !blob) {
        console.error('PDF download failed:', downloadError ? downloadError.message : 'empty object');
        return res.status(404).json({ error: 'The PDF file for this book could not be found.', status: 'file_missing' });
      }
      buffer = Buffer.from(await blob.arrayBuffer());
    } else if (source.mode === 'asset') {
      try {
        buffer = await fs.promises.readFile(source.file);
      } catch (e) {
        return res.status(404).json({ error: 'The PDF file for this book could not be found.', status: 'file_missing' });
      }
    } else {
      // Approved, but the copy lives on an external publisher's server. Tell
      // the reader where it is instead of proxying an arbitrary URL.
      return res.status(403).json({
        error: 'This copy is hosted outside the library and opens in a new tab.',
        status: 'external',
        externalUrl: source.url
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName.replace(/["\\]/g, '')}"`);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Content-Length', buffer.length);
    // Helps if the response ever lands in a shared proxy cache by accident.
    res.setHeader('Vary', 'Authorization');

    logAudit(req.reader.id, 'book_read', `Read PDF of book #${bookId}`, req.ip);
    res.end(buffer);
  } catch (e) {
    console.error('PDF read failed:', e.message);
    res.status(500).json({ error: 'Could not open the PDF' });
  }
});

// pdf.js for the in-site reader, served from node_modules (same pattern as
// /vendor/supabase.js) so no third-party CDN is ever loaded at runtime.
const PDFJS_FILES = ['pdf.min.js', 'pdf.worker.min.js'];
app.get('/vendor/pdfjs/:file', (req, res) => {
  const file = req.params.file;
  if (!PDFJS_FILES.includes(file)) return res.status(404).send('Not found');
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build', file));
});

// ==================== STATIC FILES ====================
app.get('/vendor/supabase.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js'));
});
// SECURITY: express.static over the project root would happily serve .env,
// private keys, backups and the server sources. Deny them explicitly.
const BLOCKED_STATIC = [
  /^\./,                                  // .env, .git, .vercel, .npmrc
  /(^|[\\/])server\.js$/i,
  /(^|[\\/])package(-lock)?\.json$/i,
  /(^|[\\/])vercel\.json$/i,
  /(^|[\\/])supabase[\\/]/i,
  /\.(env|pem|key|p12|pfx|crt|cer)$/i,
  /(^|[\\/]).*_BACKUP_[0-9]{4}-[0-9]{2}-[0-9]{2}$/i
];
app.use((req, res, next) => {
  const rel = decodeURIComponent((req.path || '').replace(/^\/+/, ''));
  if (rel && BLOCKED_STATIC.some(re => re.test(rel))) {
    return res.status(404).send('Not found');
  }
  next();
});
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  dotfiles: 'ignore',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    // Cache static assets
    if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// SPA catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  // express.raw / express.json body limit exceeded (e.g. a PDF over 20MB).
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({ error: 'File is too large. The PDF must be smaller than 20MB.' });
  }
  console.error('Server error:', err);
  logAudit('system', 'server_error', err.message, req.ip, 'danger');
  res.status(500).json({ error: 'Internal server error' });
});

// Only listen when running directly (not on Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Saraswati Sec School Library running at http://localhost:${PORT}`);
    console.log(`Security: Helmet, CORS, Rate Limiting, JWT, CSRF enabled`);
    console.log(`Demo accounts seeded: 2 students, 2 teachers, 1 librarian, 1 admin`);
    // Enforce private PDF storage on every boot so raw Storage URLs stay dead
    // even if the bucket was created publicly by an older build.
    const supa = pdfService();
    if (supa) ensurePrivateBucket(supa).catch(e => console.warn('PDF bucket privacy:', e.message));
  });
}

module.exports = app;
