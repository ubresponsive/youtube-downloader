# YouTube Downloader (download.mjs)

A simple Node.js wrapper around [yt-dlp](https://github.com/yt-dlp/yt-dlp) using [youtube-dl-exec](https://github.com/microlinkhq/youtube-dl-exec).  
This script lets you download YouTube videos with:

- Interactive resolution menu (1080p, 720p, 480p, or audio-only).
- MP4 output by default, with merging handled by `ffmpeg`.
- Built-in yt-dlp progress bar in the terminal.
- Subtitles (optional).
- Playlist support.
- Batch/concurrent downloading.
- Resume support.

---

## 📦 Requirements

- **Node.js** v18+ (works best with v20+).
- **ffmpeg** (for merging video/audio and audio-only mode).

On macOS:
```bash
brew install ffmpeg
```

On Linux (Debian/Ubuntu):
```bash
sudo apt install ffmpeg
```

---

## ⚙️ Installation

Clone or copy the script into your project folder, then install dependencies:

```bash
npm init -y
npm install youtube-dl-exec
```

Make it executable (optional):

```bash
chmod +x download.mjs
```

---

## ▶️ Usage

### Basic run
```bash
node download.mjs "https://youtu.be/VIDEO_ID"
```

You’ll be prompted to choose a quality:

```
Choose output quality (applies to all URLs this run):
  1) MP4 up to 1080p (best <=1080)
  2) MP4 up to 720p
  3) MP4 up to 480p
  4) Audio-only (M4A)

Enter 1/2/3/4 [default 1]:
```

### Skip the prompt
If you want to skip the interactive menu:

- **Force format manually**
```bash
node download.mjs --format "bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4]" URL
```

- **Audio only**
```bash
node download.mjs --audio URL
```

- **Disable prompt entirely**
```bash
node download.mjs --noPrompt URL
```

---

## 📂 Features

- **Multiple URLs**
```bash
node download.mjs URL1 URL2 URL3
```

- **Read from a file**
```bash
node download.mjs --fromFile urls.txt
```

- **Custom output folder**
```bash
node download.mjs --outDir ./my_downloads URL
```

- **Subtitles**
```bash
node download.mjs --subs --lang en URL
```

- **Cookies (for age-gated/private videos)**
```bash
node download.mjs --cookies ./cookies.txt URL
```

- **Proxy**
```bash
node download.mjs --proxy "socks5://127.0.0.1:1080" URL
```

---

## ⚡ Examples

- Download a playlist but stop at 720p:
```bash
node download.mjs --format "bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4]" "https://www.youtube.com/playlist?list=XXXX"
```

- Download audio-only as MP3:
```bash
node download.mjs --audio --audioFormat mp3 URL
```

- Batch file with subtitles:
```bash
node download.mjs --fromFile urls.txt --subs --lang en
```

---

## 🛠 Advanced

- **Concurrency**: Default is 2 downloads at once.
```bash
node download.mjs --concurrent 4 --fromFile urls.txt
```

- **Retries**: Default is 2.
```bash
node download.mjs --retries 5 URL
```

- **Rate limiting** (useful on unstable connections):
```bash
node download.mjs --rateLimit 2M URL
```

---

## 🚧 Notes

- The progress bar comes from yt-dlp itself (via `stdio: "inherit"`).
- If you see `WARNING: You have requested merging of multiple formats but ffmpeg is not installed`, install `ffmpeg` as described above.
- If downloads fail with `403 Forbidden` errors, try:
```bash
node download.mjs --extractorArgs "youtube:player_client=android" --geo AU URL
```

---

## 📜 License

MIT — free to use, modify, and share.
