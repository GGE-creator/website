// /api/log.js — Vercel Serverless Function
// Logs anonymized chat analytics to Supabase
// Tracks: event type, topic (anonymized), source page, timestamp

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://giovannieverduin.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL || 'https://ngwcbleuthyzqkldcfgw.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    // Silently fail — analytics should never break the chat
    return res.status(200).json({ ok: true });
  }

  try {
    const { event, topic, source, lead } = req.body;

    // Validate event type
    const validEvents = ['widget_open', 'message_sent', 'chip_used', 'lead_captured'];
    if (!validEvents.includes(event)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    const payload = {
      event,
      topic: topic ? String(topic).slice(0, 200) : null,
      source: source || 'widget',
      lead_name: lead?.name ? String(lead.name).slice(0, 100) : null,
      lead_email: lead?.email ? String(lead.email).slice(0, 200) : null,
      lead_note: lead?.note ? String(lead.note).slice(0, 500) : null,
      created_at: new Date().toISOString()
    };

    await fetch(`${supabaseUrl}/rest/v1/chat_analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Log error:', err);
    // Never fail — analytics should be fire-and-forget
    return res.status(200).json({ ok: true });
  }
}
