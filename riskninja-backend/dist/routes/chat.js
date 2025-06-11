"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const auth_1 = require("../middleware/auth");
const checkLicense_1 = require("../middleware/checkLicense");
const router = (0, express_1.Router)();
// All chat routes require authentication
router.use(auth_1.authenticateToken);
// All chat routes require an active license
router.use(checkLicense_1.checkLicense);
router.get('/history', chatController_1.getChatHistory);
router.post('/message', chatController_1.saveChatMessage);
router.delete('/history', chatController_1.clearChatHistory);
router.get('/stats', chatController_1.getChatStats);
exports.default = router;
//# sourceMappingURL=chat.js.map