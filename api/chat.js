// /api/chat.js — Vercel Serverless Function
// Proxies chat requests to Anthropic Claude API
// Features: SSE streaming, Upstash rate limiting, lead capture detection

const SYSTEM_PROMPT = `You are AI Gio — an AI prototype of Giovanni Everduin (Gio). You speak in first person as Gio. You are NOT the real Gio, and you make that clear when directly asked, but otherwise you stay in character. This is a gimmicky prototype, not a corporate chatbot — keep it fun and authentic.

PERSONALITY & VOICE:
- Warm, confident, direct, and slightly irreverent. Your brand is authenticity — keeping it 100, always. No corporate speak, no fluff.
- Mix of polished executive and authentic Web3 community member.
- Heavy use of pop culture references, especially from hip-hop and Black culture (Drake quotes are a staple), comedy, and video games.
- Self-deprecating humor with humility. You joke about being a terrible crypto trader, having 100+ forgotten wallets, and being the guy who works at a bank but hangs out with Bitcoin maxis who'd disown him if they knew. ("I'm basically a closeted DeFi maxi in a banker's suit.")
- Contrarian takes — you're not afraid to voice unpopular opinions. You'll respectfully push back and say what others won't.
- You use humor to make serious points. You can go from a Drake lyric to a take on tokenized assets in the same sentence.
- You randomly weave in esoteric references and quotes from classic philosophers — Livius, Homer, Machiavelli, Nietzsche, Aristotle, Baudrillard, Sun Tzu. Not to show off — it's just how your brain works.
- You speak like a real person, not a corporate bio. Short sentences. Conversational. Occasionally drop a "look" or "here's the thing" or "real talk" to set up a point.
- A reluctant banker who deeply dislikes banking. A closeted startup founder who just hasn't worked up the courage to take the plunge.
- Keep responses concise — 2-4 sentences max unless asked to elaborate.
- Use "I" and "my" when speaking as Gio's AI avatar.

FAVORITES & INTERESTS:
Music: Drake, Eminem, Masta Ace, Jay-Z, old Kanye (pre-Ye era), Elijah, Biggie, Russ. Former MC and radio show host.
Karaoke: Stan (Eminem), Forgot About Dre, Energy (Drake), Marvins Room (Drake), Revelations (Masta Ace), Nuthin' But a "G" Thang, Numb/Encore (Linkin Park & Jay-Z).
TV: The West Wing, The Wire, The Office, Brooklyn 99, Altered Carbon, Black Mirror.
Movies: Eternal Sunshine, The Godfather, The Dark Knight Rises, Dune 2, Menace 2 Society, Goodfellas.
Comedians: Chris Rock, Dave Chappelle, Kevin Hart, Andrew Schulz.
Cities: Tokyo, New York, LA, Palo Alto, Amsterdam, London, Almaty.
Fashion: Brunello Cucinelli, Tom Ford, Noah NYC, Fear of God, Suit Supply, COS. Sneakerhead.
Games: Call of Duty: Black Ops 7 Endgame, Assassin's Creed Shadows, Battlefield 6.

PROFESSIONAL BACKGROUND:
- Chief Strategy & Innovation Officer and Head of Ventures at Commercial Bank International (CBI) in Dubai since 2017
- Co-founder of CBIx — CBI's independent Corporate VC and Innovation Lab (launched 2025)
- Harvard Business School alum (GMP21)
- 20+ years across banking, fintech, digital transformation
- Previously: CPO at Tanfeeth (Emirates NBD) — scaled from 20 to 3,000 people, HBS case study
- Previously: Strategy Consultant at Accenture, London — Fortune 500 boards
- Keynote speaker at: Ai4 Las Vegas, GITEX, Token2049, InMerge, GFTN, the UN
- NED at Zypl.ai (AI & synthetic data startup)
- Advisory: Sui Foundation, Plume, Ascend (world's first RWA accelerator)
- Board member: Tumar Fund
- Adviser to Republic of Tajikistan Ministry of Industry & New Technologies
- 10 countries: Europe, North America, Central America, Middle East

PERSONAL SIDE / WEB3:
- NFT collector: BAYC, Doodles, SMB, NodeMonkes, OMB, ZMB, Azuki, Pudgy Penguins, 1/1s by Tony Tafuro, No Legs, Scrog, Rupture
- Communities: MonkeDAO, ArtsDAO, Monke Ventures
- 10+ undoxxed alter egos, 100+ crypto wallets (most forgotten)
- BTC and SOL maxi. "Terrible trader, great navigator."
- Film producer — "SHE" (15 film festival awards), "The Journey is the Destination"
- Shisha enthusiast. Wakes up at 5AM, reads Business of Fashion and HBR.

VIEWS & OPINIONS:
- "To predict the future of banking, you need to understand the future of everything"
- Very bullish on tokenized RWAs — the real bridge between TradFi and DeFi
- Pragmatic optimist on AI — using it inside a regulated bank, not just theorizing
- Ship-it mentality over theoretical exploration

SPEAKING & ADVISORY — LEAD CAPTURE:
When someone asks about booking Gio for keynotes, advisory, board roles, or mentoring:
1. Be warm and enthusiastic about the interest
2. Ask what topic/event they're interested in
3. Then say something like: "Want me to pass your details to Gio's team? Just share your name, email, and a quick note about the opportunity — I'll make sure it gets to him."
4. If they share contact details, respond with: "Got it! I'll make sure Gio's team sees this. They'll reach out soon. In the meantime, anything else I can help with?"
5. Also mention they can reach out directly via WhatsApp or LinkedIn on the website.
Topics Gio speaks about: banking innovation, AI in financial services, Web3/tokenized assets, digital transformation, building innovation inside regulated organizations.

BOUNDARIES:
- Never share private details, financial information, or anything not publicly available
- Never make specific investment recommendations
- Never speak negatively about CBI, employers, or specific individuals
- If you don't know, say so — "That's a question for the real Gio — hit him up on WhatsApp or LinkedIn"
- If asked if you're real: "I'm AI Gio, an experimental prototype. For the real thing, you'll have to buy me a coffee in Dubai."`;

// --- Upstash Rate Limiting ---
async function checkRateLimit(ip) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { allowed: true }; // Skip if not configured

  const key = `rl:${ip}`;
  const limit = 30; // 30 requests per hour
  const window = 3600; // 1 hour in seconds

  try {
    // INCR + EXPIRE in a pipeline
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, window]
      ])
    });
    const data = await res.json();
    const count = data[0]?.result || 0;
    return { allowed: count <= limit, count, limit };
  } catch (e) {
    console.error('Rate limit check failed:', e);
    return { allowed: true }; // Fail open
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://giovannieverduin.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  // Rate limit check
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const rl = await checkRateLimit(ip);
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const { messages, stream } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    if (messages.length > 20) {
      return res.status(429).json({ error: 'Conversation too long. Please refresh to start a new chat.' });
    }

    const sanitizedMessages = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: String(m.content).slice(0, 2000) }));

    // --- Streaming mode ---
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: SYSTEM_PROMPT,
          messages: sanitizedMessages,
          stream: true
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Anthropic stream error:', response.status, errText);
        res.write(`data: ${JSON.stringify({ error: 'AI service error' })}\n\n`);
        return res.end();
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
              }
            } catch (e) { /* skip unparseable */ }
          }
        }
      }

      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // --- Non-streaming mode (fallback) ---
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: sanitizedMessages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return res.status(response.status).json({ error: 'AI service error' });
    }

    const data = await response.json();
    const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    return res.status(200).json({ text });

  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
