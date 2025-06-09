import fetch from 'node-fetch';
import { get_encoding } from '@dqbd/tiktoken';
import { config, logConfig } from '../utils/config';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// Log configuration in development
logConfig();

const { apiKey, modelId, baseUrl } = config.gemini;
const endpointUrl = `${baseUrl}/${modelId}:generateContent?key=${apiKey}`;

export const aiService = {
  /**
   * Generates a report using the Gemini API.
   *
   * @param prompt The text prompt to send.
   * @returns The generated report content.
   */
  generateReport: async (prompt: string): Promise<string> => {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Precisely trim prompt tokens using tiktoken
    const MAX_INPUT_TOKENS = 1048575;
    // Initialize encoder for the underlying cl100k_base encoding
    const encoder = get_encoding('cl100k_base');
    // Encode text into token IDs
    let tokenIds = encoder.encode(prompt);
    if (tokenIds.length > MAX_INPUT_TOKENS) {
      console.warn(`Prompt token count (${tokenIds.length}) exceeds maximum allowed (${MAX_INPUT_TOKENS}), truncating.`);
      tokenIds = tokenIds.slice(0, MAX_INPUT_TOKENS);
    }
    // Decode token IDs back to UTF-8 bytes and convert to string
    const decodedBytes = encoder.decode(tokenIds);
    const promptToSend = new TextDecoder().decode(decodedBytes);
    encoder.free();

    const requestBody = {
      contents: [{ parts: [{ text: promptToSend }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
        topK: 40,
        topP: 0.95,
      },
    };
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data: GeminiResponse = await response.json();
    if (
      data.candidates &&
      data.candidates.length > 0 &&
      data.candidates[0].content.parts.length > 0
    ) {
      return data.candidates[0].content.parts[0].text;
    }
    throw new Error('No response content from Gemini API');
  },
}; 