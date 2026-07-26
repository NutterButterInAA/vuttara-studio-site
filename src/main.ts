import "./styles.css";

type UpdateFeed = {
  schemaVersion?: number;
  product?: string;
  channel?: string;
  version?: string;
  displayVersion?: string;
  download?: {
    url?: string;
    fileName?: string;
    size?: number | null;
  };
  integrity?: {
    algorithm?: string;
    sha256?: string | null;
  };
  releaseNotes?: {
    url?: string;
    summary?: string;
  };
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Vuttara Studio website root element was not found.");
}

app.innerHTML = `
  <header class="site-header">
    <a class="brand" href="/" aria-label="Vuttara Studio homepage">
      <img src="/assets/vuttara-studio-icon.png" alt="" width="38" height="38" />
      <span>Vuttara Studio</span>
    </a>

    <nav class="site-navigation" aria-label="Primary navigation">
      <a href="#features">Features</a>
      <a href="#safety">Update safety</a>
      <a href="/release-notes/">Release notes</a>
      <a class="navigation-download" href="/download/">Download</a>
    </nav>
  </header>

  <main>
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Built for Windows · Native production software</p>
        <h1>Broadcast, record, and create with less clutter.</h1>
        <p class="hero-description">
          Vuttara Studio is a focused Windows broadcasting application built on
          C++20, Qt 6, Direct3D 11, and a secure update foundation.
        </p>

        <div class="hero-actions">
          <a class="button button-primary" href="/download/">Download for Windows</a>
          <a class="button button-secondary" href="#features">Explore features</a>
        </div>

        <p id="hero-release" class="release-line">Checking latest release…</p>
      </div>

      <div class="hero-visual" aria-hidden="true">
        <img src="/assets/vuttara-studio-hero.png" alt="" />
      </div>
    </section>

    <section class="section" id="features">
      <div class="section-heading">
        <p class="eyebrow">Production essentials</p>
        <h2>Core tools without the noise.</h2>
        <p>Designed around responsive controls, dependable output, and clear production status.</p>
      </div>

      <div class="feature-grid">
        <article class="feature-card"><span>N</span><h3>Native performance</h3><p>C++20 and Qt provide a responsive Windows-native foundation.</p></article>
        <article class="feature-card"><span>D</span><h3>Direct3D preview</h3><p>Direct3D 11 powers the preview and composition foundation.</p></article>
        <article class="feature-card"><span>S</span><h3>Scenes and sources</h3><p>Build production layouts around clear scene and source controls.</p></article>
        <article class="feature-card"><span>R</span><h3>Recording workflow</h3><p>A focused foundation for recording and future replay-buffer tools.</p></article>
        <article class="feature-card"><span>U</span><h3>Built-in updates</h3><p>Check releases, verify downloads, and install only with your approval.</p></article>
        <article class="feature-card"><span>W</span><h3>Windows integration</h3><p>A dedicated x64 installer with the required Qt runtime files included.</p></article>
      </div>
    </section>

    <section class="section trust-section" id="safety">
      <div>
        <p class="eyebrow">Production-safe updates</p>
        <h2>Updates wait until you are ready.</h2>
        <p>
          Vuttara Studio validates release metadata and installer integrity, and
          blocks installation while streaming, recording, or replay-buffer activity is active.
        </p>
      </div>

      <div class="trust-list">
        <div><span>✓</span> HTTPS-only release metadata</div>
        <div><span>✓</span> Semantic version validation</div>
        <div><span>✓</span> SHA-256 installer verification</div>
        <div><span>✓</span> User-controlled install and restart</div>
      </div>
    </section>

    <section class="section download-callout">
      <div>
        <p class="eyebrow">Windows download</p>
        <h2>Get Vuttara Studio.</h2>
        <p id="download-summary">Loading current release information…</p>
      </div>

      <div class="download-callout-actions">
        <a class="button button-primary" href="/download/">Open download page</a>
        <a href="/release-notes/">Read release notes</a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div><strong>Vuttara Studio</strong><span>Native broadcasting software for Windows.</span></div>
    <nav aria-label="Footer navigation">
      <a href="/download/">Download</a>
      <a href="/release-notes/">Release notes</a>
      <a href="/updates/latest.json">Update feed</a>
      <a href="https://github.com/NutterButterInAA/vuttara-studio">GitHub</a>
    </nav>
  </footer>
`;

const validFeed = (feed: UpdateFeed): boolean => {
  const version = feed.version?.trim() ?? "";
  const fileName = feed.download?.fileName?.trim() ?? "";
  const url = feed.download?.url?.trim() ?? "";
  const checksum = feed.integrity?.sha256?.trim() ?? "";

  return (
    feed.schemaVersion === 1 &&
    feed.product === "Vuttara Studio" &&
    /^\d+\.\d+\.\d+$/.test(version) &&
    fileName === `Vuttara-Studio-${version}-Setup.exe` &&
    /^https:\/\//i.test(url) &&
    feed.integrity?.algorithm === "SHA-256" &&
    /^[a-f0-9]{64}$/i.test(checksum)
  );
};

const formatBytes = (bytes: number | null | undefined): string => {
  if (!bytes || bytes < 1) return "";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

async function loadReleaseSummary(): Promise<void> {
  const heroRelease = document.querySelector<HTMLElement>("#hero-release");
  const downloadSummary = document.querySelector<HTMLElement>("#download-summary");

  try {
    const response = await fetch("/updates/latest.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const feed = (await response.json()) as UpdateFeed;
    if (!validFeed(feed)) throw new Error("Invalid update metadata");

    const version = feed.displayVersion?.trim() || feed.version || "";
    const size = formatBytes(feed.download?.size);
    const detail = [`Version ${version}`, "Windows 10/11", "x64", size].filter(Boolean).join(" · ");

    if (heroRelease) heroRelease.textContent = detail;
    if (downloadSummary) downloadSummary.textContent = `${detail}. SHA-256 integrity metadata is published.`;
  } catch (error) {
    console.error("Vuttara Studio release information could not be loaded.", error);
    if (heroRelease) heroRelease.textContent = "Windows 10/11 · x64";
    if (downloadSummary) downloadSummary.textContent = "Visit the download page for current installer availability.";
  }
}

void loadReleaseSummary();
