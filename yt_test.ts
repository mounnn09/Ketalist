import { YoutubeTranscript } from 'youtube-transcript';

YoutubeTranscript.fetchTranscript('dQw4w9WgXcQ')
  .then(res => console.log("Success! Found " + res.length + " lines."))
  .catch(err => console.error("Error:", err));
