// --- Gemini Flash (high-volume: classification, categorization) ---

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

// --- Claude Sonnet (high-quality: summaries, response drafts, strategic recs) ---

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export async function askClaude(prompt: string, options?: { maxTokens?: number; temperature?: number }): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: options?.maxTokens ?? 2000,
      temperature: options?.temperature ?? 0.7,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

export async function askClaudeJSON<T = any>(prompt: string, options?: { maxTokens?: number; temperature?: number }): Promise<T> {
  const content = await askClaude(prompt + '\n\nRespond with raw JSON only. No markdown or code blocks.', options);
  // Strip markdown code fences if present
  const cleaned = content.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}
