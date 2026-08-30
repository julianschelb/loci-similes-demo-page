# Loci Similes — Dataset Demo Page

Live page: https://julianschelb.github.io/loci-similes-demo-page/

Read-only web demo of the corpus and the intertextual references of the
[Loci Similes](https://huggingface.co/collections/julian-schelb/datasets-for-latin-intertextuality-search)
benchmark: a paper header, an interactive reference graph, and a browser for
the documents and their references. Built with React, Vite and Tailwind CSS;
data is pulled from the Hugging Face Hub by a GitHub Actions workflow and the
app is published with GitHub Pages.

## Pipeline

1. `scripts/download_data.py` downloads the public datasets of the collection
   (`corpus`, `queries`, `labels`) into `data/`.
2. `scripts/prepare_data.py` converts them into JSON under `public/data/`
   for the app.
3. `npm run build` bundles the app into `dist/`.
4. `.github/workflows/build-and-deploy.yml` runs all steps on every push to
   `main`, weekly, or manually, and deploys `dist/` to GitHub Pages
   (Settings → Pages → Source: GitHub Actions).

## Local development

```bash
pip install -r requirements.txt
python scripts/download_data.py
python scripts/prepare_data.py
npm install
npm run dev        # http://localhost:5173/loci-similes-demo-page/
```

## Layout

- `src/paper.js` — paper metadata shown in the header (title, authors, abstract, links, BibTeX).
- `src/components/PaperHeader.jsx` — ACL-Anthology-style header with abstract and action buttons.
- `src/components/Placeholder.jsx` — placeholder panels for the graph and the document browser.
