export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Missing text in request body' });
    }

    // Fetch the OpenAI API key from the secret proxy you provided
    const keyResp = await fetch('https://api-secret.vercel.app/api/get-api-key', { method: 'POST' });
    if (!keyResp.ok) {
      const txt = await keyResp.text();
      return res.status(502).json({ error: 'Failed to obtain API key', detail: txt });
    }
    const keyData = await keyResp.json();
    const OPENAI_KEY = keyData.apiKey;
    if (!OPENAI_KEY) return res.status(502).json({ error: 'No API key returned' });

    // Build the ChatGPT prompt. We ask the model to return ONLY a JSON object.
    const system = `You are a helpful assistant that evaluates short written responses for the Duolingo English Test (DET) "Write about the photo" task.  
For the input text, produce a corrected version, a short numeric score 0-100 (higher is better) reflecting grammar/fluency/vocabulary for DET-style scoring, and a list of concrete issues. Each issue must include: original (the exact substring detected), replacement (suggested correction if any, otherwise empty string), and explanation (one short sentence why it is an issue).  
Return only a single JSON object with the following shape: { "corrected": "...", "score": 0-100, "issues": [ { "original": "...", "replacement": "...", "explanation": "..." }, ... ] }.  
Do not return any additional text or commentary. Treat the input as a practice response; tailor suggestions to common DET expectations (conciseness, grammatical accuracy, clear vocabulary).`;

    const user = `Text: """${text.replace(/"""/g, '"') }"""\n\nPlease reply only with the JSON object described.`;

    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: 800,
      temperature: 0.2,
    };

    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!openaiResp.ok) {
      const errTxt = await openaiResp.text();
      return res.status(openaiResp.status).json({ error: 'OpenAI error', detail: errTxt });
    }

    const openaiData = await openaiResp.json();
    const content = openaiData.choices?.[0]?.message?.content || '';

    // The model should return JSON only. Try to parse it.
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Try to be forgiving: extract the first JSON-looking substring
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch (e2) { parsed = null; }
      }
    }

    if (!parsed) {
      return res.status(502).json({ error: 'Failed to parse OpenAI response as JSON', raw: content });
    }

    // Return parsed object directly to the client
    return res.status(200).json(parsed);
  } catch (err) {
    console.error('checkGrammar error', err);
    return res.status(500).json({ error: 'Internal error', detail: String(err) });
  }
}
