import { YoutubeTranscript } from 'youtube-transcript';

export default async function handler(req: any, res: any) {
  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' });
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const text = transcript.map(t => t.text).join(" ");
    return res.status(200).json({ transcript: text });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
