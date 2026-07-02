module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });
  }

  try {
    const [creditsResp, keyResp] = await Promise.all([
      fetch('https://openrouter.ai/api/v1/credits', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }),
      fetch('https://openrouter.ai/api/v1/key', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      })
    ]);

    const credits = await creditsResp.json();
    const key = await keyResp.json();

    return res.status(200).json({
      credits_endpoint_status: creditsResp.status,
      credits_data: credits,
      key_endpoint_status: keyResp.status,
      key_data: key
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
