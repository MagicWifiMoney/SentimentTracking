const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

export async function askGemini(prompt: string, options?: { maxTokens?: number; temperature?: number; jsonMode?: boolean }): Promise<string> {
  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gemini-2.0-flash',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens ?? 2000,
      temperature: options?.temperature ?? 0.7,
      ...(options?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export async function askGeminiJSON<T = any>(prompt: string, options?: { maxTokens?: number; temperature?: number }): Promise<T> {
  const content = await askGemini(prompt, { ...options, jsonMode: true });
  return JSON.parse(content);
}
