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
      <a class="navigation-download" href="/#download">Download</a>
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
          <a class="button button-primary" href="/#download">
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
      <a href="/#download">Download</a>
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

/* Vuttara Studio inline download section */

type VuttaraDownloadFeed = {
  version?: string;
  displayVersion?: string;
  download?: {
    url?: string;
    fileName?: string;
    size?: number;
  };
  integrity?: {
    algorithm?: string;
    sha256?: string;
  };
  releaseNotes?: {
    url?: string;
    summary?: string;
  };
};
const isPublishedInstaller = (feed: VuttaraDownloadFeed): boolean => {
  const version = feed.version?.trim() ?? '';
  const fileName = feed.download?.fileName?.trim() ?? '';
  const downloadUrl = feed.download?.url?.trim() ?? '';
  const checksum = feed.integrity?.sha256?.trim() ?? '';

  return (
    /^\d+\.\d+\.\d+$/.test(version) &&
    fileName === `Vuttara-Studio-${version}-Setup.exe` &&
    /^https:\/\//i.test(downloadUrl) &&
    /^[a-f0-9]{64}$/i.test(checksum) &&
    feed.integrity?.algorithm === 'SHA-256'
  );
};

const createInlineDownloadSection = async (): Promise<void> => {
  if (window.location.pathname !== '/') {
    return;
  }

  const existing = document.querySelector<HTMLElement>(
    '#download[data-vuttara-inline-download]',
  );

  if (existing) {
    return;
  }

  const pageMain =
    document.querySelector<HTMLElement>('main') ??
    document.querySelector<HTMLElement>('#app');

  if (!pageMain) {
    return;
  }

  const section = document.createElement('section');
  section.id = 'download';
  section.className = 'inline-download-section';
  section.dataset.vuttaraInlineDownload = 'true';
  section.setAttribute('aria-labelledby', 'inline-download-title');

  section.innerHTML = `
    <div class="inline-download-card">
      <div class="inline-download-copy">
        <p class="eyebrow">Windows download</p>
        <h2 id="inline-download-title">Get Vuttara Studio</h2>
        <p class="inline-download-description">
          Native 64-bit broadcasting and recording software for Windows 10
          and Windows 11.
        </p>

        <div class="inline-download-actions">
          <span
            class="button button-primary inline-download-button is-disabled"
            id="inline-download-button"
            aria-disabled="true"
          >
            Checking installer availabilityâ€¦
          </span>

          <a
            class="inline-release-notes-link"
            id="inline-release-notes-link"
            href="/release-notes/"
          >
            View release notes
          </a>
        </div>
      </div>

      <div class="inline-download-details" aria-label="Download details">
        <div>
          <span>Version</span>
          <strong id="inline-download-version">Checkingâ€¦</strong>
        </div>
        <div>
          <span>Platform</span>
          <strong>Windows 10 or 11 Â· x64</strong>
        </div>
        <div>
          <span>Channel</span>
          <strong>Stable</strong>
        </div>
        <div>
          <span>Integrity</span>
          <strong id="inline-download-integrity">Checkingâ€¦</strong>
        </div>
      </div>

      <p class="inline-download-safety">
        Updates are SHA-256 verified. Vuttara Studio will never install or
        restart while streaming, recording, or replay-buffer activity is active.
      </p>
    </div>
  `;

  const footer = pageMain.querySelector<HTMLElement>('footer');

  if (footer) {
    pageMain.insertBefore(section, footer);
  } else {
    pageMain.append(section);
  }

  const versionElement =
    section.querySelector<HTMLElement>('#inline-download-version');
  const integrityElement =
    section.querySelector<HTMLElement>('#inline-download-integrity');
  const buttonElement =
    section.querySelector<HTMLElement>('#inline-download-button');
  const notesElement =
    section.querySelector<HTMLAnchorElement>('#inline-release-notes-link');

  try {
    const response = await fetch('/updates/latest.json', {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Update feed returned HTTP ${response.status}.`);
    }

    const feed = (await response.json()) as VuttaraDownloadFeed;
    const displayVersion =
      feed.displayVersion?.trim() || feed.version?.trim() || 'Coming soon';

    if (versionElement) {
      versionElement.textContent = displayVersion;
    }

    if (notesElement && feed.releaseNotes?.url) {
      notesElement.href = feed.releaseNotes.url;
    }

    if (isPublishedInstaller(feed)) {
      if (integrityElement) {
        integrityElement.textContent = 'SHA-256 verified';
      }

      if (buttonElement) {
        const downloadLink = document.createElement('a');
        downloadLink.id = buttonElement.id;
        downloadLink.className =
          'button button-primary inline-download-button';
        downloadLink.href = feed.download?.url ?? '#';
        downloadLink.textContent = `Download Vuttara Studio ${displayVersion}`;
        downloadLink.setAttribute(
          'download',
          feed.download?.fileName ?? '',
        );

        buttonElement.replaceWith(downloadLink);
      }
    } else {
      if (integrityElement) {
        integrityElement.textContent = 'Pending installer build';
      }

      if (buttonElement) {
        buttonElement.textContent =
          `Installer coming with version ${displayVersion}`;
      }
    }
  } catch (error) {
    if (versionElement) {
      versionElement.textContent = 'Coming soon';
    }

    if (integrityElement) {
      integrityElement.textContent = 'Availability check failed';
    }

    if (buttonElement) {
      buttonElement.textContent = 'Installer coming soon';
    }

    console.warn('Vuttara Studio download status could not be loaded.', error);
  }
};

const scheduleInlineDownloadSection = (): void => {
  window.setTimeout(() => {
    void createInlineDownloadSection();
  }, 0);
};

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    scheduleInlineDownloadSection,
    { once: true },
  );
} else {
  scheduleInlineDownloadSection();
}

window.addEventListener('popstate', scheduleInlineDownloadSection);
window.addEventListener('hashchange', scheduleInlineDownloadSection);

/* End Vuttara Studio inline download section */
