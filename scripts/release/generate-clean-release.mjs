import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const siteRoot = path.resolve(path.dirname(scriptFile), "../..");
const releasesRoot = path.join(siteRoot, "releases");
const publicRoot = path.join(siteRoot, "public");
const updateRoot = path.join(publicRoot, "updates", "clean-rewrite");
const releaseOutputRoot = path.join(updateRoot, "releases");
const checksumRoot = path.join(updateRoot, "checksums");
const notesRoot = path.join(publicRoot, "release-notes");
const checkOnly = process.argv.includes("--check");

const requiredMetadata = [
  "version", "publishedAt", "summary", "installerFileName", "installerUrl",
  "installerSize", "installerSha256", "sourceFileName", "sourceUrl", "sourceSha256"
];

const html = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

function parseFrontMatter(text, filePath) {
  const normalized = text.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n");
  if (!normalized.startsWith("---\n")) {
    throw new Error(`${filePath} must start with YAML-style front matter.`);
  }
  const end = normalized.indexOf("\n---\n", 4);
  if (end < 0) throw new Error(`${filePath} has unterminated front matter.`);
  const metadata = {};
  for (const line of normalized.slice(4, end).split("\n")) {
    if (!line.trim()) continue;
    const separator = line.indexOf(":");
    if (separator < 1) throw new Error(`${filePath} contains invalid metadata: ${line}`);
    metadata[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  for (const name of requiredMetadata) {
    if (!metadata[name]) throw new Error(`${filePath} is missing metadata: ${name}`);
  }
  return { metadata, body: normalized.slice(end + 5).trim() };
}

function parseMarkdown(body) {
  const lines = body.split("\n");
  let title = "";
  const intro = [];
  const sections = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("# ") && !title) {
      title = line.slice(2).trim();
      continue;
    }
    if (line.startsWith("## ")) {
      current = { title: line.slice(3).trim(), items: [], paragraphs: [] };
      sections.push(current);
      continue;
    }
    if (line.startsWith("- ")) {
      if (!current) {
        current = { title: "Changes", items: [], paragraphs: [] };
        sections.push(current);
      }
      current.items.push(line.slice(2).trim());
      continue;
    }
    if (!line.trim()) continue;
    if (current) current.paragraphs.push(line.trim());
    else intro.push(line.trim());
  }
  return { title, intro: intro.join(" "), sections };
}

function versionParts(value) {
  if (!/^\d+\.\d+\.\d+$/.test(value)) throw new Error(`Invalid semantic version: ${value}`);
  return value.split(".").map(Number);
}

function compareVersions(a, b) {
  const left = versionParts(a);
  const right = versionParts(b);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return right[i] - left[i];
  }
  return 0;
}

function validateRelease(release, sourcePath) {
  const m = release.metadata;
  versionParts(m.version);
  if (path.basename(path.dirname(sourcePath)) !== m.version) {
    throw new Error(`${sourcePath} directory must match version ${m.version}.`);
  }
  if (m.installerFileName !== `Vuttara-Studio-${m.version}-Setup.exe`) {
    throw new Error(`${sourcePath} installer filename is invalid.`);
  }
  if (m.sourceFileName !== `Vuttara-Studio-${m.version}-Source.zip`) {
    throw new Error(`${sourcePath} source filename is invalid.`);
  }
  const approvedPrefix = `https://github.com/NutterButterInAA/vuttara-studio/releases/download/v${m.version}/`;
  if (m.installerUrl !== approvedPrefix + m.installerFileName) throw new Error(`${sourcePath} installer URL is invalid.`);
  if (m.sourceUrl !== approvedPrefix + m.sourceFileName) throw new Error(`${sourcePath} source URL is invalid.`);
  if (!/^\d+$/.test(m.installerSize) || Number(m.installerSize) <= 0) throw new Error(`${sourcePath} installer size is invalid.`);
  if (!/^[a-f0-9]{64}$/i.test(m.installerSha256)) throw new Error(`${sourcePath} installer SHA-256 is invalid.`);
  if (!/^[a-f0-9]{64}$/i.test(m.sourceSha256)) throw new Error(`${sourcePath} source SHA-256 is invalid.`);
  if (!release.markdown.title.includes(m.version)) throw new Error(`${sourcePath} title does not include ${m.version}.`);
  const changes = release.markdown.sections.flatMap((section) => section.items);
  if (changes.length === 0) throw new Error(`${sourcePath} must contain at least one bullet item.`);
  return changes;
}

function releaseFeed(release) {
  const m = release.metadata;
  const changes = validateRelease(release, release.sourcePath);
  return {
    schemaVersion: 1,
    product: "Vuttara Studio",
    productId: "com.nuttabuttainaa.vuttarastudio",
    productLine: "clean-rewrite",
    channel: "stable",
    version: m.version,
    publishedAt: m.publishedAt,
    download: {
      url: m.installerUrl,
      fileName: m.installerFileName,
      size: Number(m.installerSize)
    },
    integrity: { algorithm: "SHA-256", sha256: m.installerSha256.toLowerCase() },
    source: {
      url: m.sourceUrl,
      fileName: m.sourceFileName,
      sha256: m.sourceSha256.toLowerCase()
    },
    releaseNotes: {
      url: `https://vuttarastudio.nuttabuttainaa.com/release-notes/#v${m.version.replaceAll(".", "-")}`,
      summary: m.summary,
      changes
    },
    installationPolicy: {
      requireUserApproval: true,
      blockInstallWhileStreaming: true,
      blockInstallWhileRecording: true,
      blockAutomaticRestartWhileBusy: true
    }
  };
}

function renderMarkdownSection(section) {
  const paragraphs = section.paragraphs.map((p) => `<p>${html(p)}</p>`).join("\n");
  const items = section.items.length
    ? `<ul>${section.items.map((item) => `<li>${html(item)}</li>`).join("")}</ul>`
    : "";
  return `<section class="notes-section"><h3>${html(section.title)}</h3>${paragraphs}${items}</section>`;
}

function renderNotes(releases) {
  const cards = releases.map((release) => {
    const m = release.metadata;
    const date = new Date(m.publishedAt);
    const dateText = Number.isNaN(date.getTime()) ? m.publishedAt : date.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
    return `<article class="release-card" id="v${m.version.replaceAll(".", "-")}">
      <div class="release-head"><div><p class="kicker">${html(dateText)}</p><h2>Vuttara Studio ${html(m.version)}</h2></div><span>Stable</span></div>
      <p class="summary">${html(m.summary)}</p>
      ${release.markdown.intro ? `<p>${html(release.markdown.intro)}</p>` : ""}
      ${release.markdown.sections.map(renderMarkdownSection).join("\n")}
      <div class="release-actions"><a class="primary" href="${html(m.installerUrl)}">Download ${html(m.version)}</a><a href="${html(m.sourceUrl)}">Source code</a></div>
    </article>`;
  }).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Release notes for the current Vuttara Studio release line."><title>Release notes | Vuttara Studio</title><style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#070910;color:#f7f7ff}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 75% -10%,rgba(103,72,255,.18),transparent 35%),#070910}a{color:inherit}.shell{width:min(980px,calc(100% - 40px));margin:auto;padding:64px 0 96px}.back{display:inline-flex;margin-bottom:36px;color:#b8c0dd;text-decoration:none}.hero h1{margin:0;font-size:clamp(3.4rem,9vw,6rem);line-height:.94;letter-spacing:-.065em}.hero>p{max-width:720px;margin:24px 0 50px;color:#b8c0dd;line-height:1.7}.stack{display:grid;gap:24px}.release-card{padding:clamp(27px,5vw,46px);border:1px solid #292d3d;border-radius:22px;background:rgba(17,20,31,.92)}.release-head{display:flex;justify-content:space-between;gap:20px;padding-bottom:22px;border-bottom:1px solid #2b3040}.release-head h2{margin:0;font-size:clamp(1.7rem,4vw,2.25rem)}.release-head span{height:max-content;padding:7px 11px;border:1px solid #39405a;border-radius:999px;color:#c7cdef;font-size:.78rem}.kicker{margin:0 0 8px;color:#9ba5c6;font-size:.8rem;text-transform:uppercase;letter-spacing:.08em}.summary{margin:25px 0 16px;color:#d5d9ea;font-size:1.05rem;line-height:1.65}.release-card p{color:#b9c3dc;line-height:1.65}.notes-section{margin-top:28px}.notes-section h3{margin:0 0 13px}.notes-section ul{display:grid;gap:9px;margin:0;padding-left:22px;color:#b9c3e4;line-height:1.55}.release-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}.release-actions a{padding:12px 17px;border:1px solid #39405a;border-radius:10px;text-decoration:none}.release-actions .primary{border-color:transparent;background:#f4f3ff;color:#10111a;font-weight:800}.note{margin-top:30px;color:#78809c;font-size:.82rem}@media(max-width:620px){.shell{width:min(100% - 26px,980px);padding-top:38px}.release-head{flex-direction:column}}
</style></head><body><main class="shell"><a class="back" href="/">&larr; Vuttara Studio</a><header class="hero"><h1>Release notes.</h1><p>This page lists the current public Vuttara Studio release for Windows.</p></header><div class="stack">${cards}</div><p class="note">Generated automatically from versioned release README files.</p></main></body></html>\n`;
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
  }
  return value;
}

function assertValid(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function writeJsonOrCheck(filePath, value, validate) {
  validate?.(value, filePath);
  if (checkOnly) {
    if (!fs.existsSync(filePath)) throw new Error(`Generated file is missing: ${filePath}`);
    const existing = readJson(filePath);
    validate?.(existing, filePath);
    const actual = JSON.stringify(canonicalJson(existing));
    const expected = JSON.stringify(canonicalJson(value));
    if (actual !== expected) throw new Error(`Generated JSON is semantically stale: ${filePath}`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, stableJson(value), "utf8");
}

function writeOrCheck(filePath, content) {
  if (checkOnly) {
    if (!fs.existsSync(filePath)) throw new Error(`Generated file is missing: ${filePath}`);
    const existing = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    if (existing !== content) throw new Error(`Generated file is stale: ${filePath}`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function validateFeed(feed, filePath) {
  assertValid(feed.schemaVersion === 1, `${filePath} schemaVersion must be 1.`);
  assertValid(feed.product === "Vuttara Studio", `${filePath} product is invalid.`);
  assertValid(feed.productId === "com.nuttabuttainaa.vuttarastudio", `${filePath} productId is invalid.`);
  assertValid(feed.productLine === "clean-rewrite", `${filePath} productLine is invalid.`);
  assertValid(feed.channel === "stable", `${filePath} channel must be stable.`);
  assertValid(/^0\.0\.\d+$/.test(feed.version), `${filePath} must use the 0.0.x release line.`);
  assertValid(feed.publishedAt && !Number.isNaN(new Date(feed.publishedAt).getTime()), `${filePath} publishedAt is invalid.`);
  assertValid(feed.download?.url === `https://github.com/NutterButterInAA/vuttara-studio/releases/download/v${feed.version}/${feed.download?.fileName}`, `${filePath} installer URL is invalid.`);
  assertValid(feed.download?.fileName === `Vuttara-Studio-${feed.version}-Setup.exe`, `${filePath} installer filename is invalid.`);
  assertValid(Number.isInteger(feed.download?.size) && feed.download.size > 0, `${filePath} installer size is invalid.`);
  assertValid(feed.integrity?.algorithm === "SHA-256", `${filePath} integrity algorithm is invalid.`);
  assertValid(/^[a-f0-9]{64}$/.test(feed.integrity?.sha256 ?? ""), `${filePath} installer SHA-256 is invalid.`);
  assertValid(feed.source?.url === `https://github.com/NutterButterInAA/vuttara-studio/releases/download/v${feed.version}/${feed.source?.fileName}`, `${filePath} source URL is invalid.`);
  assertValid(feed.source?.fileName === `Vuttara-Studio-${feed.version}-Source.zip`, `${filePath} source filename is invalid.`);
  assertValid(/^[a-f0-9]{64}$/.test(feed.source?.sha256 ?? ""), `${filePath} source SHA-256 is invalid.`);
  assertValid(feed.releaseNotes?.url === `https://vuttarastudio.nuttabuttainaa.com/release-notes/#v${feed.version.replaceAll(".", "-")}`, `${filePath} release-notes URL is invalid.`);
  assertValid(feed.releaseNotes?.summary && !String(feed.releaseNotes.summary).includes("Clean Rewrite"), `${filePath} release-notes summary is invalid.`);
  assertValid(Array.isArray(feed.releaseNotes?.changes) && feed.releaseNotes.changes.length > 0, `${filePath} release-notes changes are missing.`);
}

function validateCleanIndex(index, filePath) {
  assertValid(index.schemaVersion === 1, `${filePath} schemaVersion must be 1.`);
  assertValid(index.product === "Vuttara Studio", `${filePath} product is invalid.`);
  assertValid(index.productLine === "clean-rewrite", `${filePath} productLine is invalid.`);
  assertValid(index.channel === "stable", `${filePath} channel must be stable.`);
  assertValid(index.generatedAt && !Number.isNaN(new Date(index.generatedAt).getTime()), `${filePath} generatedAt is invalid.`);
  assertValid(/^0\.0\.\d+$/.test(index.latestVersion), `${filePath} latestVersion must use the 0.0.x release line.`);
  assertValid(index.latestFeed === "/updates/clean-rewrite/latest.json", `${filePath} latest feed path is invalid.`);
  assertValid(Array.isArray(index.releases) && index.releases.length === 1, `${filePath} must contain exactly one public release.`);
  const release = index.releases[0];
  assertValid(release.version === index.latestVersion, `${filePath} latest release version does not match.`);
  assertValid(release.feed === `/updates/clean-rewrite/releases/${release.version}.json`, `${filePath} versioned feed path is invalid.`);
  assertValid(release.releaseNotes === `https://vuttarastudio.nuttabuttainaa.com/release-notes/#v${release.version.replaceAll(".", "-")}`, `${filePath} release-notes path is invalid.`);
  assertValid(release.installer?.fileName === `Vuttara-Studio-${release.version}-Setup.exe`, `${filePath} installer metadata is invalid.`);
  assertValid(release.integrity?.algorithm === "SHA-256" && /^[a-f0-9]{64}$/.test(release.integrity?.sha256 ?? ""), `${filePath} installer integrity is invalid.`);
  assertValid(release.source?.fileName === `Vuttara-Studio-${release.version}-Source.zip`, `${filePath} source metadata is invalid.`);
  assertValid(/^[a-f0-9]{64}$/.test(release.source?.sha256 ?? ""), `${filePath} source SHA-256 is invalid.`);
  assertValid(!JSON.stringify(index).includes("Clean Rewrite"), `${filePath} exposes Clean Rewrite wording.`);
}

if (!fs.existsSync(releasesRoot)) throw new Error(`Release source directory is missing: ${releasesRoot}`);
const readmes = fs.readdirSync(releasesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(releasesRoot, entry.name, "README.md"))
  .filter((filePath) => fs.existsSync(filePath));
if (readmes.length === 0) throw new Error("No releases/<version>/README.md files were found.");
const releases = readmes.map((sourcePath) => {
  const parsed = parseFrontMatter(fs.readFileSync(sourcePath, "utf8"), sourcePath);
  return { ...parsed, markdown: parseMarkdown(parsed.body), sourcePath };
}).sort((a, b) => compareVersions(a.metadata.version, b.metadata.version));
const feeds = releases.map((release) => ({ release, feed: releaseFeed(release) }));
const latest = feeds[0].feed;
for (const { feed } of feeds) {
  writeJsonOrCheck(path.join(releaseOutputRoot, `${feed.version}.json`), feed, validateFeed);
  const checksum = `${feed.integrity.sha256.toUpperCase()}  ${feed.download.fileName}\n${feed.source.sha256.toUpperCase()}  ${feed.source.fileName}\n`;
  writeOrCheck(path.join(checksumRoot, `${feed.version}.sha256`), checksum);
}
const index = {
  schemaVersion: 1,
  product: "Vuttara Studio",
  productLine: "clean-rewrite",
  channel: "stable",
  generatedAt: latest.publishedAt,
  latestVersion: latest.version,
  latestFeed: "/updates/clean-rewrite/latest.json",
  releases: feeds.map(({ feed }) => ({
    version: feed.version,
    publishedAt: feed.publishedAt,
    summary: feed.releaseNotes.summary,
    changes: feed.releaseNotes.changes,
    feed: `/updates/clean-rewrite/releases/${feed.version}.json`,
    installer: feed.download,
    integrity: feed.integrity,
    source: feed.source,
    releaseNotes: feed.releaseNotes.url
  }))
};
writeJsonOrCheck(path.join(updateRoot, "latest.json"), latest, validateFeed);
writeJsonOrCheck(path.join(releaseOutputRoot, "index.json"), index, validateCleanIndex);
writeOrCheck(path.join(notesRoot, "index.html"), renderNotes(releases));
console.log(`${checkOnly ? "PASS: Verified" : "PASS: Generated"} ${feeds.length} Vuttara Studio release README file(s). Latest: ${latest.version}`);
