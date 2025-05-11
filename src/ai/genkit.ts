import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { config } from 'dotenv';

// Ensure environment variables are loaded
config();

export const ai = genkit({
  plugins: [
    googleAI({
      // The API key will be read from the GEMINI_API_KEY or GOOGLE_API_KEY environment variable.
      // You can explicitly pass apiKey here if needed, but environment variables are preferred for security.
      // apiKey: process.env.GEMINI_API_KEY 
    }),
  ],
  model: 'googleai/gemini-2.0-flash', // Default model for text generation
});
