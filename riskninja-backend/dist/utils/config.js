"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logConfig = exports.validateConfig = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    gemini: {
        apiKey: process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || '',
        modelId: process.env.GEMINI_MODEL_ID || process.env.REACT_APP_GEMINI_MODEL_ID || 'gemini-2.5-flash-preview',
        baseUrl: process.env.GEMINI_BASE_URL || process.env.REACT_APP_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models',
    },
};
const validateConfig = () => {
    const errors = [];
    if (!exports.config.gemini.apiKey) {
        errors.push('GEMINI_API_KEY is not set');
    }
    if (!exports.config.gemini.modelId) {
        errors.push('GEMINI_MODEL_ID is not set');
    }
    return { isValid: errors.length === 0, errors };
};
exports.validateConfig = validateConfig;
const logConfig = () => {
    if (process.env.NODE_ENV === 'development') {
        console.group('🔧 RiskNinja Configuration');
        console.log('Gemini Model:', exports.config.gemini.modelId);
        console.log('API Key Set:', !!exports.config.gemini.apiKey);
        console.groupEnd();
    }
};
exports.logConfig = logConfig;
//# sourceMappingURL=config.js.map