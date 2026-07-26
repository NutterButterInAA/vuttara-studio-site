import "./styles.css";

interface UpdateFeed {
  schemaVersion: number;
  product: string;
  channel: string;
  version: string;
  displayVersion: string;
  publishedAt: string;
  mandatory: boolean;

  download: {
    url: string;
    fileName: string;
    size: number | null;
  };

  integrity: {
    algorithm: string;
    sha256: string | null;
    signatureRequired: boolean;
    signatureStatus: string;
  };

  releaseNotes: {
    url: string;
    summary: string;
  };
}

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Vuttara Studio website root element was not found.");
}

app.innerHTML = `
  <header class="site-header">
    <a class="brand" href="/" aria-label="Vuttara Studio homepage">
      <img
        src="/assets/vuttara-studio-icon.png"
        alt=""
        width="42"
        height="42"
      />

      <span>Vuttara Studio</span>
    </a>

    <nav class="site-navigation" aria-label="Primary navigation">
      <a href="#features">Features</a>
      <a href="#updates">Updates</a>
      <a href="/release-notes/">Release notes</a>
      <a class="navigation-download" href="/download/">Download</a>
    </nav>
  </header>

  <main>
    <section class="hero">
      <div class="hero-content">
        <img
          class="hero-brand-logo"
          src="/assets/vuttara-studio-logo.png"
          alt="Vuttara Studio"
        />

        <p class="eyebrow">Native broadcasting software for Windows</p>

        <h1>
          Broadcast with
          <span>Vuttara Studio.</span>
        </h1>

        <p class="hero-description">
          A native production application built with C++20, Qt 6,
          Direct3D 11, and FFmpeg.
        </p>

        <div class="hero-actions">
          <a class="button button-primary" href="/download/">
            Download Vuttara Studio
          </a>
        </div>

        <p id="latest-version" class="latest-version">
          Checking the latest release…
        </p>
      </div>

      <aside class="release-status">
        <div class="hero-product-art-wrap">
          <img
            class="hero-product-art"
            src="/assets/vuttara-studio-hero.png"
            alt="Vuttara Studio broadcasting and recording software"
          />
        </div>
        <div class="release-status-heading">
          <span>Release status</span>
          <span class="status-indicator" aria-label="Active"></span>
        </div>

        <dl>
          <div>
            <dt>Latest version</dt>
            <dd id="status-version">Checking…</dd>
          </div>

          <div>
            <dt>Channel</dt>
            <dd id="status-channel">Stable</dd>
          </div>

          <div>
            <dt>Platform</dt>
            <dd>Windows x64</dd>
          </div>

          <div>
            <dt>Installer integrity</dt>
            <dd id="status-integrity">Pending build</dd>
          </div>
        </dl>
      </aside>
    </section>

    <section class="section" id="features">
      <div class="section-heading">
        <p class="eyebrow">Application foundation</p>
        <h2>Designed for dependable production.</h2>
      </div>

      <div class="feature-grid">
        <article class="feature-card">
          <span>01</span>

          <h3>Native performance</h3>

          <p>
            A C++20 and Qt foundation built for responsive production
            controls, efficient memory use, and dependable Windows
            integration.
          </p>
        </article>

        <article class="feature-card">
          <span>02</span>

          <h3>Direct3D rendering</h3>

          <p>
            Direct3D 11 provides the rendering foundation for previews,
            scenes, sources, and future hardware-accelerated composition.
          </p>
        </article>

        <article class="feature-card">
          <span>03</span>

          <h3>FFmpeg media engine</h3>

          <p>
            FFmpeg will power encoding, decoding, recording, remuxing,
            replay-buffer operations, and streaming output.
          </p>
        </article>
      </div>
    </section>

    <section class="section update-section" id="updates">
      <div>
        <p class="eyebrow">Update protection</p>

        <h2>Updates never interrupt production.</h2>

        <p class="section-description">
          Vuttara Studio may check for and download an update in the
          background, but installation and restart remain blocked while
          streaming, recording, or replay-buffer activity is active.
        </p>
      </div>

      <div class="protection-list">
        <div>
          <span class="protection-enabled">✓</span>
          HTTPS-only update metadata
        </div>

        <div>
          <span class="protection-enabled">✓</span>
          Semantic version validation
        </div>

        <div>
          <span class="protection-enabled">✓</span>
          SHA-256 installer verification
        </div>

        <div>
          <span class="protection-pending">○</span>
          Installer signature verification planned
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-heading">
        <p class="eyebrow">Current milestone</p>
        <h2>Vuttara Studio 0.2.0</h2>
      </div>

      <article class="release-card">
        <div>
          <p class="release-label">Foundation release</p>

          <h3>
            Native application, installer, website, and updater groundwork.
          </h3>
        </div>

        <div>
          <ul>
            <li>Native Qt application shell</li>
            <li>Direct3D 11 preview-engine foundation</li>
            <li>Inno Setup installer foundation</li>
            <li>GitHub Releases update-hosting structure</li>
            <li>Secure update metadata and checksum structure</li>
          </ul>

          <a href="/release-notes/">Read release notes</a>
        </div>
      </article>
    </section>
  </main>

  <footer class="site-footer">
    <div>
      <strong>Vuttara Studio</strong>
      <span>Native broadcasting software for Windows.</span>
    </div>

    <nav aria-label="Footer navigation">
      <a href="/download/">Download</a>
      <a href="/release-notes/">Release notes</a>
      <a href="/updates/latest.json">Update feed</a>
      <a href="/updates/checksums/">Checksums</a>
    </nav>
  </footer>
`;

const latestVersion =
  document.querySelector<HTMLElement>("#latest-version");

const statusVersion =
  document.querySelector<HTMLElement>("#status-version");

const statusChannel =
  document.querySelector<HTMLElement>("#status-channel");

const statusIntegrity =
  document.querySelector<HTMLElement>("#status-integrity");

async function loadLatestRelease(): Promise<void> {
  try {
    const response = await fetch("/updates/latest.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Update feed returned HTTP ${response.status}.`);
    }

    const update = (await response.json()) as UpdateFeed;

    if (
      update.schemaVersion !== 1 ||
      update.product !== "Vuttara Studio" ||
      !/^\d+\.\d+\.\d+$/.test(update.version)
    ) {
      throw new Error("Update metadata failed validation.");
    }

    if (latestVersion) {
      latestVersion.textContent =
        `Latest version: ${update.displayVersion} · ${update.channel}`;
    }

    if (statusVersion) {
      statusVersion.textContent = update.displayVersion;
    }

    if (statusChannel) {
      statusChannel.textContent =
        update.channel.charAt(0).toUpperCase() +
        update.channel.slice(1);
    }

    if (statusIntegrity) {
      statusIntegrity.textContent =
        update.integrity.sha256 === null
          ? "Pending installer build"
          : "SHA-256 published";
    }
  } catch (error) {
    console.error(error);

    if (latestVersion) {
      latestVersion.textContent =
        "Vuttara Studio 0.2.0 · Update feed unavailable";
    }

    if (statusVersion) {
      statusVersion.textContent = "0.2.0";
    }
  }
}

void loadLatestRelease();