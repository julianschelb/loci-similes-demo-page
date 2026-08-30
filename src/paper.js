// Static metadata about the paper shown in the header.
export const paper = {
  title: "Loci Similes: A Benchmark for Extracting Intertextualities in Latin Literature",
  venue: "Findings of the Association for Computational Linguistics: EMNLP 2026",
  authors: [
    { name: "Julian Schelb", affiliation: 1, url: "https://julian-schelb.com" },
    { name: "Michael Wittweiler", affiliation: 3 },
    { name: "Marie Revellio", affiliation: 2 },
    { name: "Barbara Feichtinger", affiliation: 2 },
    { name: "Andreas Spitz", affiliation: 1 },
  ],
  affiliations: {
    1: "Department of Computer and Information Science, University of Konstanz",
    2: "Department of Latin Philology, University of Konstanz",
    3: "Institute of Archaeology, Classical Philology and Ancient Studies, University of Zurich",
  },
  abstract:
    "Tracing connections between historical texts is an important part of intertextual research, enabling scholars to reconstruct the virtual library of a writer and identify the sources influencing their creative process. These intertextual references manifest in diverse forms, ranging from direct verbatim quotations to subtle allusions and paraphrases disguised by morphological variation. Language models offer a promising path forward due to their ability to capture semantic similarity beyond lexical overlap. However, the development of new methods for this task is held back by the scarcity of standardized benchmarks and easy-to-use datasets. We address this gap by introducing Loci Similes, a benchmark for Latin intertextuality detection comprising a curated dataset of ~176k text segments and 1,490 expert-verified intertextual references, including 945 from an existing dataset. Using this data, we establish baselines for retrieval and classification of intertextualities with both lexical methods and pretrained encoder language models.",
  links: {
    pdf: "https://arxiv.org/abs/2601.07533",
    data: "https://huggingface.co/collections/julian-schelb/datasets-for-latin-intertextuality-search",
    models: "https://huggingface.co/collections/julian-schelb/models-for-latin-intertextuality-search",
    code: "https://github.com/julianschelb/locisimiles",
    pypi: "https://pypi.org/project/locisimiles/",
  },
  bibtex: `@inproceedings{schelb2026locisimiles,
  title     = {Loci Similes: A Benchmark for Extracting Intertextualities in Latin Literature},
  author    = {Schelb, Julian and Wittweiler, Michael and Revellio, Marie and Feichtinger, Barbara and Spitz, Andreas},
  booktitle = {Findings of the Association for Computational Linguistics: EMNLP 2026},
  year      = {2026},
  url       = {https://arxiv.org/abs/2601.07533}
}`,
};
