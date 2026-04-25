import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
  }

  try {
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Peach Payment Marketing Tools', email: 'noreply@thingymajigs.app' },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!brevoRes.ok) {
      const err = await brevoRes.text();
      console.error('Brevo API error:', err);
      return res.status(500).json({ error: `Brevo error: ${err}` });
    }

    const data = await brevoRes.json();
    return res.status(200).json({ success: true, messageId: data.messageId });
  } catch (error) {
    console.error('Email send error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send email' });
  }
}
