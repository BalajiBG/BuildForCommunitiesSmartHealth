/**
 * POST /api/translate
 * 
 * Translates text using Gemini (acts as a translation API).
 * Uses Gemini 2.5 Flash for instant translation — cheaper than Google Translate
 * and already available in our stack.
 * 
 * Request: { text: string, targetLang: 'hi' | 'en' }
 * Response: { translated: string }
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface TranslateRequest {
  text: string;
  targetLang: 'hi' | 'en';
}

export async function POST(request: Request) {
  try {
    const body: TranslateRequest = await request.json();
    const { text, targetLang } = body;

    if (!text || !targetLang) {
      return NextResponse.json({ translated: text });
    }

    // Don't translate if already in target language
    const hasHindi = /[\u0900-\u097F]/.test(text);
    if (targetLang === 'hi' && hasHindi) return NextResponse.json({ translated: text });
    if (targetLang === 'en' && !hasHindi) return NextResponse.json({ translated: text });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ translated: text });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const langName = targetLang === 'hi' ? 'Hindi (Devanagari script)' : 'English';
    const prompt = `Translate the following text to ${langName}. Return ONLY the translated text, nothing else:\n\n${text}`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);

    const translated = result.response.text().trim();
    return NextResponse.json({ translated: translated || text });
  } catch {
    // On any error, return original text
    const body = await request.clone().json().catch(() => ({ text: '' }));
    return NextResponse.json({ translated: body.text || '' });
  }
}
