module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const resp = await fetch('https://openrouter.ai/api/v1/models');
    const data = await resp.json();

    const models = data.data || [];

    // Filter to free models that support image input
    const freeVision = models
      .filter(m => {
        const isFree = m.id.endsWith(':free') || (m.pricing && parseFloat(m.pricing.prompt) === 0);
        const modalities = (m.architecture && m.architecture.input_modalities) || [];
        const supportsImage = modalities.includes('image');
        return isFree && supportsImage;
      })
      .map(m => ({
        id: m.id,
        name: m.name,
        context_length: m.context_length,
        input_modalities: m.architecture && m.architecture.input_modalities
      }));

    return res.status(200).json({
      total_models: models.length,
      free_vision_models: freeVision
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
