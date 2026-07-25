// JWT auth middleware. Verifies the Bearer token on protected routes.
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Optional gate: allow only if the user has one of the given permission roles.
function requireRole(...allowed) {
  return (req, res, next) => {
    const roles = (req.user && req.user.roles) || [];
    const ok = roles.some((r) => allowed.includes(r));
    if (!ok) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  };
}

// Gate for self-service routes: allow the employee editing their own record,
// or any admin. Expects the employee id in req.params.id.
function requireSelfOrAdmin(req, res, next) {
  const roles = (req.user && req.user.roles) || [];
  const isSelf = req.user && req.user.employee_id === req.params.id;
  if (isSelf || roles.includes('admin')) {
    return next();
  }
  return res.status(403).json({ error: 'You can only edit your own profile' });
}

module.exports = { requireAuth, requireRole, requireSelfOrAdmin, JWT_SECRET };
