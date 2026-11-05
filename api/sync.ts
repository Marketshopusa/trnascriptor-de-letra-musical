import { GoogleGenAI, Type } from '@google/genai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audioBase64, audioMimeType, lyrics, mode, userApiKey } = req.body || {};

    const apiKey = (userApiKey && userApiKey.trim() !== '') ? userApiKey.trim() : process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.includes('MY_GEMINI')) {
      return res.status(400).json({
        success: false,
        error: 'NO_API_KEY',
        message: 'No se detectó una API Key de Gemini válida. Ingrésala en el botón de Ajustes (icono de llave 🔑) o configúrala en Vercel.',
      });
    }

    if (!audioBase64) {
      return res.status(400).json({
        success: false,
        error: 'NO_AUDIO',
        message: 'Por favor sube un archivo de audio para sincronizar.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'lacuna-clone-engine',
        },
      },
    });

    const isAlignOnly = (mode === 'ALIGN_ONLY' || (lyrics && lyrics.trim().length > 0));

    const systemPrompt = isAlignOnly
      ? `You are an expert audio-to-lyrics forced alignment intelligence (identical to Lacuna.fm's AI forced aligner).
Your goal is to accurately match the provided lyrics to the audible human voice in the song.
STRICT RULES:
1. Ignore instrumental intros, guitar solos, synthesizer leads, drums, and musical interludes.
2. The very first word must start at the exact millisecond when the vocalist physically begins singing that word.
3. Every single word must have:
   - "word": string with trailing space or trailing '\\n' if it ends a verse/line (e.g. "Yo ", "nacimiento...\\n")
   - "startS": exact start timestamp in seconds (float, e.g. 14.18)
   - "endS": exact end timestamp in seconds when the voice finishes singing that word (float, e.g. 14.52)
   - "palign": number confidence between 0.90 and 1.0
   - "success": true
4. Maintain exact line breaks from the provided lyrics by appending '\\n' to the final word of each line.
5. Do NOT hallucinate or guess; base timestamps on the real vocal waveform.
6. The final word must end exactly where the singer finishes vocalizing (do not extend to song duration).`
      : `You are an expert audio lyrics transcriber and timing engine.
Listen to the audio, transcribe the sung lyrics, and produce millisecond-accurate word-by-word timestamps.
For the last word of each line, append '\\n'.`;

    const parts: any[] = [
      {
        inlineData: {
          mimeType: audioMimeType || 'audio/mp3',
          data: audioBase64,
        },
      },
    ];

    if (isAlignOnly) {
      parts.push({
        text: `Audio Track provided above.
Task: ALIGN_ONLY
Exact Lyrics to synchronize:
${lyrics}

Analyze the audio waveform, locate the vocal entry after the instrumental intro, and return the word-by-word alignment JSON matching the schema.`,
      });
    } else {
      parts.push({
        text: `Audio Track provided above.
Task: TRANSCRIBE
Transcribe and word-align the song lyrics from the singing vocals.`,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            language: { type: Type.STRING },
            words: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  startS: { type: Type.NUMBER },
                  endS: { type: Type.NUMBER },
                  palign: { type: Type.NUMBER },
                  success: { type: Type.BOOLEAN },
                },
                required: ['word', 'startS', 'endS'],
              },
            },
          },
          required: ['words'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    if (!parsed.words || !Array.isArray(parsed.words) || parsed.words.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'EMPTY_RESULT',
        message: 'No se pudieron extraer fonemas vocales del audio.',
      });
    }

    return res.json({
      success: true,
      mode: isAlignOnly ? 'ALIGN_ONLY' : 'TRANSCRIBE',
      data: parsed,
    });
  } catch (err: any) {
    console.error('Error in /api/sync:', err);
    return res.status(500).json({
      success: false,
      error: err?.name || 'SYNC_ERROR',
      message: err?.message || 'Error al procesar la sincronización de audio con IA.',
    });
  }
}
