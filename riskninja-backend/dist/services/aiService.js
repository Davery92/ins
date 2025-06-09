"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const config_1 = require("../utils/config");
// Log configuration in development
(0, config_1.logConfig)();
const { apiKey, modelId, baseUrl } = config_1.config.gemini;
const endpointUrl = `${baseUrl}/${modelId}:generateContent?key=${apiKey}`;
exports.aiService = {
    /**
     * Generates a report using the Gemini API.
     *
     * @param prompt The text prompt to send.
     * @returns The generated report content.
     */
    generateReport: async (prompt) => {
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }
        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: prompt,
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2000,
                topK: 40,
                topP: 0.95,
            },
        };
        const response = await (0, node_fetch_1.default)(endpointUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const data = await response.json();
        if (data.candidates &&
            data.candidates.length > 0 &&
            data.candidates[0].content.parts.length > 0) {
            return data.candidates[0].content.parts[0].text;
        }
        throw new Error('No response content from Gemini API');
    },
};
//# sourceMappingURL=aiService.js.map