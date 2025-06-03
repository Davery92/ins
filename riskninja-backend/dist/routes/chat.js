"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All chat routes require authentication
router.use(auth_1.authenticateToken);
router.get('/history', chatController_1.getChatHistory);
router.post('/message', chatController_1.saveChatMessage);
router.delete('/history', chatController_1.clearChatHistory);
router.get('/stats', chatController_1.getChatStats);
exports.default = router;
//# sourceMappingURL=chat.js.map