import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { paper } from "./src/paper.js";

// Served from https://julianschelb.github.io/loci-similes-demo-page/
const SITE = "https://julianschelb.github.io/loci-similes-demo-page/";
const DESCRIPTION =
  "Interactive demo of Loci Similes, a benchmark for Latin intertextuality detection: explore 1,490 expert-verified " +
  "intertextual references between Latin authors such as Jerome, Lactantius, Valerius Flaccus, Virgil, Ovid and Cicero, " +
  "with word-level edit operations, translations and the datasets.";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Search engines and link previews read the HTML before any script runs, so the head gets the page's metadata
 * (description, canonical URL, Open Graph, Twitter card, Google Scholar citation tags, schema.org JSON-LD for the
 * article and the dataset), and #root gets a static copy of the paper header, which React replaces on load.
 */
function seo() {
  const authors = paper.authors.map((a) => a.name);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ScholarlyArticle",
      headline: paper.title,
      name: paper.title,
      author: paper.authors.map((a) => ({ "@type": "Person", name: a.name, affiliation: paper.affiliations[a.affiliation] })),
      datePublished: "2026",
      isPartOf: { "@type": "PublicationIssue", name: paper.venue },
      abstract: paper.abstract,
      url: paper.links.pdf,
      sameAs: [paper.links.pdf, SITE],
      inLanguage: "en",
      about: ["Intertextuality", "Latin literature", "Natural language processing", "Text reuse detection"],
    },
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "Loci Similes: Latin intertextuality benchmark",
      description:
        "A benchmark for Latin intertextuality detection: a corpus of about 176,000 Latin text segments and 1,490 " +
        "expert-verified intertextual references (verbatim references and allusions) between later and earlier works.",
      url: SITE,
      sameAs: paper.links.data,
      license: "https://www.apache.org/licenses/LICENSE-2.0",
      isAccessibleForFree: true,
      creator: paper.authors.map((a) => ({ "@type": "Person", name: a.name })),
      citation: `${authors.join(", ")}. ${paper.title}. ${paper.venue}.`,
      keywords: ["Latin", "intertextuality", "loci similes", "text reuse", "allusion", "quotation", "benchmark", "classical philology"],
      inLanguage: ["la", "en"],
      distribution: ["corpus", "queries", "labels"].map((part) => ({
        "@type": "DataDownload",
        encodingFormat: "application/x-parquet",
        contentUrl: `https://huggingface.co/datasets/julian-schelb/latin-classical-intertextuality-${part}`,
      })),
    },
  ];
  const head = [
    `<meta name="description" content="${esc(DESCRIPTION)}" />`,
    `<link rel="canonical" href="${SITE}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<meta name="author" content="${esc(authors.join(", "))}" />`,
    `<meta name="keywords" content="Latin intertextuality, loci similes, text reuse detection, Latin literature, allusion, quotation, benchmark, digital humanities, Jerome, Virgil" />`,
    `<link rel="icon" type="image/svg+xml" href="${"/loci-similes-demo-page/"}favicon.svg" />`,
    // link previews
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Loci Similes" />`,
    `<meta property="og:title" content="${esc(paper.title)}" />`,
    `<meta property="og:description" content="${esc(DESCRIPTION)}" />`,
    `<meta property="og:url" content="${SITE}" />`,
    `<meta property="og:image" content="${SITE}og-image.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="The Loci Similes reference graph: citing Latin authors linked to the authors they draw on" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(paper.title)}" />`,
    `<meta name="twitter:description" content="${esc(DESCRIPTION)}" />`,
    `<meta name="twitter:image" content="${SITE}og-image.png" />`,
    // Google Scholar (Highwire Press tags)
    `<meta name="citation_title" content="${esc(paper.title)}" />`,
    ...authors.map((a) => `<meta name="citation_author" content="${esc(a)}" />`),
    `<meta name="citation_publication_date" content="2026" />`,
    `<meta name="citation_conference_title" content="${esc(paper.venue)}" />`,
    `<meta name="citation_arxiv_id" content="2601.07533" />`,
    `<meta name="citation_abstract_html_url" content="${paper.links.pdf}" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ].join("\n    ");

  const body = `
      <header class="mx-auto max-w-[1040px] px-6 pt-10">
        <p class="mb-1 text-[.7rem] font-semibold uppercase tracking-[.08em] text-muted">Dataset demo</p>
        <h1 class="mb-3 font-serif text-[2rem] font-semibold leading-[1.18] text-ink">${esc(paper.title)}</h1>
        <p class="mb-1 font-semibold text-ink-2">${authors.map(esc).join(", ")}</p>
        <p class="text-[.9rem] italic text-muted">${esc(paper.venue)}</p>
        <h2 class="mt-6 mb-2 font-serif text-[1.2rem] font-semibold">Abstract</h2>
        <p class="max-w-[75ch] text-ink-2">${esc(paper.abstract)}</p>
        <p class="mt-4 text-ink-2">
          <a href="${paper.links.pdf}">Paper</a> ·
          <a href="${paper.links.data}">Datasets</a> ·
          <a href="${paper.links.models}">Models</a> ·
          <a href="${paper.links.code}">Code</a> ·
          <a href="${paper.links.pypi}">Python package</a>
        </p>
        <noscript><p class="mt-6 text-muted">The interactive reference graph and the reference browser need JavaScript.</p></noscript>
      </header>
    `;

  return {
    name: "seo",
    transformIndexHtml(html) {
      return html
        .replace(/\s*<meta name="description"[^>]*>/, "")
        .replace("</head>", `    ${head}\n  </head>`)
        .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
    },
  };
}

export default defineConfig({
  base: "/loci-similes-demo-page/",
  plugins: [react(), tailwindcss(), seo()],
});
