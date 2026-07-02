module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const nvidiaKey = process.env.NVIDIA_API_KEY;

  return res.status(200).json({
    nvidia_key_present: !!nvidiaKey,
    nvidia_key_length: nvidiaKey ? nvidiaKey.length : 0,
    nvidia_key_prefix: nvidiaKey ? nvidiaKey.substring(0, 6) + '...' : null
  });
}
