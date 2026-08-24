export default async function handler(req: any, res: any) {
  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' });
  }

  try {
    const fetchRes = await fetch(`https://youtube-transcript.ai/transcript/${videoId}.txt`);
    if (!fetchRes.ok) {
        throw new Error(`Failed to fetch transcript (Status: ${fetchRes.status})`);
    }
    const text = await fetchRes.text();
    
    // The API returns markdown. We can just pass this as the raw text.
    return res.status(200).json({ transcript: text });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

