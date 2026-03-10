const LEGACY_GRADIENT_PATTERN = /(667eea|764ba2|linear-gradient)/i;

const decodeEscapedHtml = (value: string) =>
  value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\'/g, "'");

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const stripDecorativePrefix = (value: string) => value.replace(/^[^A-Za-z0-9]+/, "").trim();

const splitMetaLine = (line: string) => {
  const index = line.indexOf(":");
  if (index === -1) {
    return { label: "Detail", value: line.trim() };
  }

  return {
    label: line.slice(0, index).trim(),
    value: line.slice(index + 1).trim(),
  };
};

const inferReportLabel = (title: string) => {
  const normalized = title.toLowerCase();

  if (normalized.includes("study") && normalized.includes("chat")) {
    return "Study report";
  }

  if (normalized.includes("conversation") || normalized.includes("chat")) {
    return "Conversation report";
  }

  if (normalized.includes("protocol")) {
    return "Protocol report";
  }

  return "Report";
};

const sanitizeNodeTree = (root: ParentNode) => {
  root.querySelectorAll("script, style, link, meta").forEach((node) => node.remove());

  root.querySelectorAll("*").forEach((element) => {
    element.removeAttribute("style");
    element.removeAttribute("id");

    Array.from(element.attributes).forEach((attribute) => {
      if (attribute.name.startsWith("on")) {
        element.removeAttribute(attribute.name);
      }
    });
  });
};

const buildMetaMarkup = (metaLines: string[]) =>
  metaLines
    .map(splitMetaLine)
    .filter((item) => item.value)
    .map(
      (item) => `
        <div class="generated-report__meta-item">
          <dt class="generated-report__meta-label">${escapeHtml(item.label)}</dt>
          <dd class="generated-report__meta-value">${escapeHtml(item.value)}</dd>
        </div>
      `,
    )
    .join("");

const normalizeLegacyShell = (html: string) => {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html;
  }

  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(html, "text/html");
  const legacyHeader = Array.from(documentFragment.body.querySelectorAll("div, section, article")).find((element) =>
    LEGACY_GRADIENT_PATTERN.test(element.getAttribute("style") || ""),
  );

  if (!legacyHeader) {
    sanitizeNodeTree(documentFragment.body);
    return documentFragment.body.innerHTML;
  }

  const titleElement = legacyHeader.querySelector("h1, h2, h3, strong");
  const title = stripDecorativePrefix(titleElement?.textContent?.trim() || "Clinical report");
  const headerLines = Array.from(legacyHeader.querySelectorAll("p, li, div"))
    .map((node) => node.textContent?.trim() || "")
    .map(stripDecorativePrefix)
    .filter(Boolean)
    .filter((line) => line !== title);

  const generatedLine = headerLines.find((line) => /^generated\s*:/i.test(line));
  const metaLines = headerLines.filter((line) => !/^generated\s*:/i.test(line));
  legacyHeader.remove();
  sanitizeNodeTree(documentFragment.body);

  const generatedAt = generatedLine ? splitMetaLine(generatedLine).value : "";
  const bodyHtml = documentFragment.body.innerHTML.trim();

  return `
    <section class="generated-report generated-report--styled generated-report--legacy">
      <header class="generated-report__header">
        <div class="generated-report__eyebrow">${escapeHtml(inferReportLabel(title))}</div>
        <h1 class="generated-report__title">${escapeHtml(title)}</h1>
        <dl class="generated-report__meta">
          ${buildMetaMarkup(metaLines)}
        </dl>
        ${generatedAt ? `<p class="generated-report__timestamp">Generated ${escapeHtml(generatedAt)}</p>` : ""}
      </header>
      <div class="generated-report__body report-content protocol-report-content">
        ${bodyHtml}
      </div>
    </section>
  `;
};

export const normalizeReportHtml = (value?: string | null) => {
  const decoded = decodeEscapedHtml(value || "").trim();

  if (!decoded) {
    return "";
  }

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return decoded;
  }

  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(decoded, "text/html");

  if (documentFragment.body.querySelector(".generated-report")) {
    sanitizeNodeTree(documentFragment.body);
    return documentFragment.body.innerHTML;
  }

  const hasLegacyGradient = Array.from(documentFragment.body.querySelectorAll("[style]")).some((element) =>
    LEGACY_GRADIENT_PATTERN.test(element.getAttribute("style") || ""),
  );

  if (hasLegacyGradient) {
    return normalizeLegacyShell(decoded);
  }

  sanitizeNodeTree(documentFragment.body);
  return documentFragment.body.innerHTML;
};
