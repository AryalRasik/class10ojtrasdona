require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
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
seedUsers();

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

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
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

app.get('/api/users/:id', authenticateToken, (req, res) => {
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
    timestamp: new Date().toISOString(),
    users: users.size,
    refreshTokens: refreshTokens.size,
    activityLogs: activityLog.length,
    auditLogs: auditLog.length
  });
});

// ==================== STATIC FILES ====================
app.get('/vendor/supabase.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js'));
});
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
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
  console.error('Server error:', err);
  logAudit('system', 'server_error', err.message, req.ip, 'danger');
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Saraswati Sec School Library running at http://localhost:${PORT}`);
  console.log(`Security: Helmet, CORS, Rate Limiting, JWT, CSRF enabled`);
  console.log(`Demo accounts seeded: 2 students, 2 teachers, 1 librarian, 1 admin`);
});
