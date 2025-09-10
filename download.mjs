#!/usr/bin/env node
// download.mjs
// Interactive yt-dlp wrapper using youtube-dl-exec.
// - Prompts for output quality (1080p/720p/480p/Audio-only) unless overridden.
// - Shows yt-dlp's native progress bar (stdio: "inherit").
// - Supports playlists (default on), subtitles, cookies, proxies, etc..

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import readline from "node:readline";
import ytdl from "youtube-dl-exec";

const DEFAULT_OUTPUT_TEMPLATE = "%(uploader)s/%(title).200Bs-%(id)s.%(ext)s";
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_SUB_LANG = "en";
const MAX_RETRIES = 2;

// Default format if user skips prompt and provides nothing else
const DEFAULT_FORMAT_FALLBACK = "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]";

function parseArgs(argv) {
  const args = {
    urls: [],
    // format handling
    format: null,          // if null, we'll prompt
    formatProvided: false, // true if --format passed
    audioOnly: false,
    audioFormat: "m4a",

    outDir: "./downloads",
    outTemplate: DEFAULT_OUTPUT_TEMPLATE,

    playlist: true,
    rateLimit: null,
    retries: MAX_RETRIES,
    subs: false,
    subsLang: DEFAULT_SUB_LANG,
    subsEmbed: true,
    fromFile: null,
    cookies: null,
    proxy: null,
    concurrent: DEFAULT_CONCURRENCY,
    noMtime: true,
    geoBypass: true,
    extractorArgs: null,
    geoBypassCountry: null,
    verbose: false,
    update: false,
    noPrompt: false,       // skip interactive prompt if true
  };

  const it = argv[Symbol.iterator]();
  it.next(); // node
  it.next(); // script

  for (let cur = it.next(); !cur.done; cur = it.next()) {
    const v = cur.value;
    switch (v) {
      case "--format": args.format = it.next().value; args.formatProvided = true; break;
      case "--audio": args.audioOnly = true; break;
      case "--audioFormat": args.audioFormat = it.next().value; break;
      case "--outDir": args.outDir = it.next().value; break;
      case "--outTemplate": args.outTemplate = it.next().value; break;
      case "--noPlaylist": args.playlist = false; break;
      case "--rateLimit": args.rateLimit = it.next().value; break;
      case "--retries": args.retries = Number(it.next().value); break;
      case "--subs": args.subs = true; break;
      case "--lang": args.subsLang = it.next().value; break;
      case "--noEmbedSubs": args.subsEmbed = false; break;
      case "--fromFile": args.fromFile = it.next().value; break;
      case "--cookies": args.cookies = it.next().value; break;
      case "--proxy": args.proxy = it.next().value; break;
      case "--concurrent": args.concurrent = Number(it.next().value); break;
      case "--noMtime": args.noMtime = true; break;
      case "--keepMtime": args.noMtime = false; break;
      case "--noGeoBypass": args.geoBypass = false; break;
      case "--geo": args.geoBypassCountry = it.next().value; break;
      case "--extractorArgs": args.extractorArgs = it.next().value; break;
      case "--verbose": args.verbose = true; break;
      case "--update": args.update = true; break;
      case "--noPrompt": args.noPrompt = true; break;
      default:
        if (v.startsWith("-")) {
          console.error(`Unknown option: ${v}`);
          process.exit(1);
        } else {
          args.urls.push(v);
        }
    }
  }

  if (args.fromFile) {
    const data = readFileSync(args.fromFile, "utf8");
    const lines = data.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    args.urls.push(...lines);
  }

  if (args.urls.length === 0) {
    console.error(
      "Usage: node download.mjs [options] <URL ...>\n" +
      "Options:\n" +
      "  --format <yt-dlp format>           (overrides interactive prompt)\n" +
      "  --audio                            (audio-only; requires ffmpeg)\n" +
      "  --audioFormat <m4a|mp3>            (default: m4a)\n" +
      "  --subs                             (download auto subtitles)\n" +
      "  --lang <code>                      (subtitles language; default: en)\n" +
      "  --noEmbedSubs                      (don’t embed subtitles)\n" +
      "  --noPlaylist                       (treat URL as single video)\n" +
      "  --outDir <path>                    (default: ./downloads)\n" +
      "  --outTemplate <template>\n" +
      "  --rateLimit <e.g. 2M>\n" +
      "  --retries <n>                      (default: 2)\n" +
      "  --fromFile <urls.txt>\n" +
      "  --cookies <cookies.txt>\n" +
      "  --proxy <scheme://host:port>\n" +
      "  --concurrent <n>                   (default: 2)\n" +
      "  --noMtime | --keepMtime            (default: --noMtime)\n" +
      "  --noGeoBypass | --geo <CC>\n" +
      "  --extractorArgs <string>\n" +
      "  --update                           (fetch latest yt-dlp once)\n" +
      "  --noPrompt                         (skip interactive resolution menu)\n" +
      "  --verbose\n"
    );
    process.exit(1);
  }

  return args;
}

function ensureDir(p) {
  const abs = resolve(p);
  if (!existsSync(abs)) mkdirSync(abs, { recursive: true });
  return abs;
}

function askQuestion(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
}

async function chooseFormatInteractive(args) {
  // If user passed --format or --audio, don't prompt.
  if (args.noPrompt || args.formatProvided || args.audioOnly) return;

  console.log("\nChoose output quality (applies to all URLs this run):");
  console.log("  1) MP4 up to 1080p (best <=1080)");
  console.log("  2) MP4 up to 720p");
  console.log("  3) MP4 up to 480p");
  console.log("  4) Audio-only (M4A)\n");

  const choice = (await askQuestion("Enter 1/2/3/4 [default 1]: ")).trim() || "1";

  switch (choice) {
    case "1":
      args.format = "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]";
      break;
    case "2":
      args.format = "bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4]";
      break;
    case "3":
      args.format = "bestvideo[ext=mp4][height<=480]+bestaudio[ext=m4a]/best[ext=mp4]";
      break;
    case "4":
      args.audioOnly = true;
      break;
    default:
      console.log("Unrecognised choice; using 1080p default.");
      args.format = "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]";
  }
}

async function downloadOne(url, args, attempt = 1) {
  // Build yt-dlp args (avoid invalid --no-no-* combinations)
  const ytdlpArgs = {
    // format / audio
    ...(args.audioOnly
      ? { extractAudio: true, audioFormat: args.audioFormat, audioQuality: "0" }
      : { format: args.format || DEFAULT_FORMAT_FALLBACK }
    ),

    output: join(args.outDir, args.outTemplate),

    ...(args.noMtime ? { "no-mtime": true } : {}),

    // robustness
    "fragment-retries": 10,
    retries: 5,
    "concurrent-fragments": 4,

    // playlist handling
    ...(args.playlist ? { "yes-playlist": true } : { "no-playlist": true }),

    // subtitles
    ...(args.subs ? {
      writeauto: true,
      subLangs: args.subsLang,
      subFormat: "srt/best",
      ...(args.subsEmbed ? { embedSubs: true } : {}),
    } : {}),

    // networking/auth
    ...(args.rateLimit ? { limitRate: args.rateLimit } : {}),
    ...(args.cookies ? { cookies: args.cookies } : {}),
    ...(args.proxy ? { proxy: args.proxy } : {}),

    addHeader: [
      "User-Agent: Mozilla/5.0",
      "Accept-Language: en-US,en;q=0.9",
    ],

    ...(args.geoBypass ? { geoBypass: true } : { noGeoBypass: true }),
    ...(args.geoBypassCountry ? { geoBypassCountry: args.geoBypassCountry } : {}),
    ...(args.extractorArgs ? { extractorArgs: args.extractorArgs } : {}),

    ...(args.update ? { update: true } : { "no-update": true }),

    // Show one-line updates (useful if you ever switch away from stdio:inherit)
    newline: true,
  };

  // Let yt-dlp draw its own progress bar.
  const cpOpts = { stdio: "inherit" };

  try {
    console.log(`\n[${new Date().toISOString()}] Downloading: ${url}`);
    await ytdl(url, ytdlpArgs, cpOpts);
    console.log(`[OK] ${url}`);
  } catch (err) {
    console.error(`[ERROR] ${url} (attempt ${attempt}/${args.retries + 1})`);
    if (args.verbose) console.error(err);
    if (attempt <= args.retries) {
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return downloadOne(url, args, attempt + 1);
    }
    throw err;
  }
}

async function run() {
  const args = parseArgs(process.argv);
  ensureDir(args.outDir);

  // Interactive resolution menu if needed
  await chooseFormatInteractive(args);

  const queue = [...args.urls];
  let active = 0;
  const failures = [];

  const pump = async () => {
    if (queue.length === 0 || active >= args.concurrent) return;
    const url = queue.shift();
    active += 1;
    downloadOne(url, args)
      .catch(() => failures.push(url))
      .finally(() => {
        active -= 1;
        pump();
      });

    while (active < args.concurrent && queue.length > 0) {
      const nextUrl = queue.shift();
      active += 1;
      downloadOne(nextUrl, args)
        .catch(() => failures.push(nextUrl))
        .finally(() => {
          active -= 1;
          pump();
        });
    }
  };

  await pump();

  // Wait for drain
  while (active > 0 || queue.length > 0) {
    await new Promise(r => setTimeout(r, 120));
  }

  if (failures.length) {
    console.error(`\nCompleted with ${failures.length} failure(s):`);
    failures.forEach(u => console.error(` - ${u}`));
    process.exit(2);
  } else {
    console.log("\nAll downloads completed successfully.");
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
