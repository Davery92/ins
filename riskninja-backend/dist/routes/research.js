"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const researchController_1 = require("../controllers/researchController");
// import { authenticateToken } from '../middleware/auth';
const router = (0, express_1.Router)();
// Research routes are public; skip authentication middleware
/**
 * @route   POST /api/research/generate
 * @desc    Generate a research report from a URL
 * @access  Public
 */
router.post('/generate', researchController_1.generateResearchReport);
exports.default = router;
//# sourceMappingURL=research.js.map