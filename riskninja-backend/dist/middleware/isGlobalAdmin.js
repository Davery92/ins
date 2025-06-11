"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGlobalAdmin = void 0;
/**
 * Middleware to check if the authenticated user is a global/system admin
 * This checks if the user's email matches the GLOBAL_ADMIN_EMAIL env var
 * OR if they have the system_admin role
 */
const isGlobalAdmin = (req, res, next) => {
    // This middleware should run after authenticateToken and isAdmin
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    const globalAdminEmail = process.env.GLOBAL_ADMIN_EMAIL;
    const isGlobalByEmail = globalAdminEmail && req.user.email === globalAdminEmail;
    const isSystemAdmin = req.user.role === 'system_admin';
    if (!isGlobalByEmail && !isSystemAdmin) {
        res.status(403).json({ error: 'Global admin access required' });
        return;
    }
    next();
};
exports.isGlobalAdmin = isGlobalAdmin;
//# sourceMappingURL=isGlobalAdmin.js.map