"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkLicense = void 0;
/**
 * Middleware to check if user has an active license
 */
const checkLicense = (req, res, next) => {
    if (req.user?.status !== 'active') {
        res.status(403).json({
            error: 'Access denied. Your account is pending activation by an administrator.',
        });
        return;
    }
    next();
};
exports.checkLicense = checkLicense;
//# sourceMappingURL=checkLicense.js.map