"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = void 0;
/**
 * Middleware to check if the authenticated user has admin or system_admin role
 */
const isAdmin = (req, res, next) => {
    // This middleware should run after authenticateToken
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (req.user.role !== 'admin' && req.user.role !== 'system_admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
};
exports.isAdmin = isAdmin;
//# sourceMappingURL=isAdmin.js.map