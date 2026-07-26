import "./styles.css";

type UpdateFeed = {
  schemaVersion?: number;
  product?: string;
  channel?: string;
  version?: string;
  displayVersion?: string;
  download?: { url?: string; fileName?: string; size?: number | null };
  integrity?: { algorithm?: string; sha256?: string | null };
  releaseNotes?: { url?: string; summary?: string };
};

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Vuttara Studio website root element was not found.");

app.innerHTML = `
<header class="site-header">
  <a class="brand" href="/" aria-label="Vuttara Studio homepage"><img src="/assets/vuttara-studio-icon.png" alt="" width="34" height="34"><span>Vuttara Studio</span></a>
  <nav class="site-navigation" aria-label="Primary navigation"><a href="#features">Features</a><a href="#safety">Update safety</a><a href="/release-notes/">Release notes</a><a class="navigation-download" href="/download/">Download</a></nav>
</header>
<main>
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">Create. Stream. Inspire.</p>
      <h1>Broadcasting tools without the clutter.</h1>
      <p class="hero-description">A focused Windows-native studio for building scenes, managing sources, recording, and going live with confidence.</p>
      <div class="hero-actions"><a id="hero-download" class="button button-primary" href="/download/">Download for Windows</a><a class="button button-secondary" href="#features">Explore features</a></div>
      <p id="hero-release" class="release-line">Checking the current Windows release…</p>
    </div>
    <div class="studio-preview" aria-label="Vuttara Studio interface preview">
      <div class="preview-top"><span></span><span>Vuttara Studio</span><b>LIVE</b></div>
      <div class="preview-body"><div class="preview-canvas"><img src="/assets/vuttara-studio-icon.png" alt=""><strong>VUTTARA</strong><small>STUDIO</small></div><div class="preview-side"><i></i><i></i><i></i><i></i></div></div>
      <div class="preview-bottom"><span>Scenes</span><span>Sources</span><span>Audio Mixer</span><button type="button" tabindex="-1">Start Streaming</button></div>
    </div>
  </section>
  <section class="section" id="features"><div class="section-heading"><p class="eyebrow">Built for production</p><h2>Everything important, kept close.</h2><p>Fast controls, clear status, and a native foundation designed for Windows.</p></div><div class="feature-grid">
    <article><b>01</b><h3>Scenes and sources</h3><p>Build and organize layouts without digging through crowded menus.</p></article>
    <article><b>02</b><h3>Native performance</h3><p>C++20, Qt 6, and Direct3D 11 provide a responsive foundation.</p></article>
    <article><b>03</b><h3>Recording workflow</h3><p>Keep recording controls and production status visible and predictable.</p></article>
    <article><b>04</b><h3>Secure updates</h3><p>HTTPS metadata, semantic versions, and SHA-256 installer verification.</p></article>
  </div></section>
  <section class="section safety" id="safety"><div><p class="eyebrow">Update safety</p><h2>Your production stays in control.</h2><p>Vuttara Studio never installs or restarts without approval and blocks installation during active streaming, recording, or replay-buffer output.</p></div><ul><li>HTTPS-only downloads</li><li>SHA-256 integrity checks</li><li>User-approved installation</li><li>Active-output protection</li></ul></section>
  <section class="section download-strip"><div><p class="eyebrow">Ready for Windows</p><h2>Download Vuttara Studio.</h2><p id="download-summary">Loading current release information…</p></div><a class="button button-primary" href="/download/">Open download page</a></section>
</main>
<footer class="site-footer"><div><strong>Vuttara Studio</strong><span>Native broadcasting software for Windows.</span></div><nav><a href="/download/">Download</a><a href="/release-notes/">Release notes</a><a href="/updates/latest.json">Update feed</a><a href="https://github.com/NutterButterInAA/vuttara-studio">GitHub</a></nav></footer>`;

const validFeed = (feed: UpdateFeed): boolean => {
  const version = feed.version?.trim() ?? "";
  const fileName = feed.download?.fileName?.trim() ?? "";
  const url = feed.download?.url?.trim() ?? "";
  const checksum = feed.integrity?.sha256?.trim() ?? "";
  return feed.schemaVersion === 1 && feed.product === "Vuttara Studio" && /^\d+\.\d+\.\d+$/.test(version) && fileName === `Vuttara-Studio-${version}-Setup.exe` && /^https:\/\//i.test(url) && feed.integrity?.algorithm === "SHA-256" && /^[a-f0-9]{64}$/i.test(checksum);
};
const formatBytes = (bytes?: number | null): string => bytes && bytes > 0 ? `${(bytes / 1048576).toFixed(1)} MB` : "";
const parseFeed = async (response: Response): Promise<UpdateFeed> => {
  const raw = (await response.text()).replace(/^\uFEFF/, "").trim();
  return JSON.parse(raw) as UpdateFeed;
};
async function loadRelease(): Promise<void> {
  const line = document.querySelector<HTMLElement>("#hero-release");
  const summary = document.querySelector<HTMLElement>("#download-summary");
  const heroDownload = document.querySelector<HTMLAnchorElement>("#hero-download");
  try {
    const response = await fetch(`/updates/latest.json?ts=${Date.now()}`, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const feed = await parseFeed(response);
    if (!validFeed(feed)) throw new Error("Installer metadata failed validation");
    const version = feed.displayVersion?.trim() || feed.version || "";
    const detail = [`Version ${version}`, "Windows 10/11", "x64", formatBytes(feed.download?.size)].filter(Boolean).join(" · ");
    if (line) line.textContent = detail;
    if (summary) summary.textContent = `${detail}. SHA-256 verified metadata is published.`;
    if (heroDownload && feed.download?.url) { heroDownload.href = feed.download.url; heroDownload.download = feed.download.fileName ?? ""; heroDownload.textContent = `Download ${version}`; }
  } catch (error) {
    console.error("Release information could not be loaded.", error);
    if (line) line.textContent = "Windows 10/11 · x64 · Stable";
    if (summary) summary.textContent = "Open the download page to check current installer availability.";
  }
}
void loadRelease();
