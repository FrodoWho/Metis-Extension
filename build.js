#!/usr/bin/env node
/**
 * Build script — copies shared source + browser-specific manifest into dist/.
 *
 * Usage:
 *   node build.js            # builds both chrome and firefox
 *   node build.js --chrome   # chrome only
 *   node build.js --firefox  # firefox only
 */

const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

const TARGETS = {
  chrome:  { manifest: path.join(ROOT, 'manifests', 'chrome.json') },
  firefox: { manifest: path.join(ROOT, 'manifests', 'firefox.json') },
};

// Files/dirs to copy from root into every dist folder
const SHARED = ['background.js', 'content', 'icons'];

// ── helpers ──────────────────────────────────────────────────────────────────

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function clean(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function build(browser) {
  const { manifest } = TARGETS[browser];
  const out = path.join(DIST, browser);

  clean(out);

  // Shared source
  for (const item of SHARED) {
    copyRecursive(path.join(ROOT, item), path.join(out, item));
  }

  // Browser-specific manifest
  fs.copyFileSync(manifest, path.join(out, 'manifest.json'));

  console.log(`Built ${browser} → dist/${browser}/`);
}

// ── main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const buildChrome  = args.length === 0 || args.includes('--chrome');
const buildFirefox = args.length === 0 || args.includes('--firefox');

if (buildChrome)  build('chrome');
if (buildFirefox) build('firefox');
