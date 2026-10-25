(() => {
  const papers = window.PAPERS ?? [];
  const categories = {
    process: {
      label: "热加工与工艺",
      color: "var(--process)"
    },
    quality: {
      label: "肉品品质",
      color: "var(--quality)"
    },
    safety: {
      label: "食品安全",
      color: "var(--safety)"
    }
  };

  const state = {
    query: "",
    category: "all",
    sort: "curated"
  };

  const searchInput = document.querySelector("#searchInput");
  const sortSelect = document.querySelector("#sortSelect");
  const filters = document.querySelector("#categoryFilters");
  const list = document.querySelector("#paperList");
  const summary = document.querySelector("#resultSummary");
  const toast = document.querySelector("#toast");
  let toastTimer;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
  }

  function authorShort(authorLine) {
    const authors = String(authorLine)
      .split(",")
      .map((author) => author.trim())
      .filter(Boolean);
    if (!authors.length) return "作者信息未提供";
    return authors.length > 4 ? `${authors.slice(0, 4).join(", ")} 等` : authors.join(", ");
  }

  function citation(paper) {
    const issue = paper.issue ? `(${paper.issue})` : "";
    return `${paper.journal} · ${paper.year}; ${paper.volume}${issue}: ${paper.pages}`;
  }

  function filteredPapers() {
    const query = state.query.trim().toLowerCase();
    let result = papers.filter((paper) => {
      if (state.category !== "all" && paper.category !== state.category) {
        return false;
      }
      if (!query) return true;
      return [
        paper.title,
        paper.authors,
        paper.journal,
        paper.doi,
        paper.pmid,
        paper.pmcid,
        paper.summary,
        paper.license,
        paper.sourceLabel,
        ...(paper.keywords ?? [])
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

    if (state.sort === "newest") {
      result = [...result].sort((a, b) => b.year - a.year || a.id - b.id);
    } else if (state.sort === "journal") {
      result = [...result].sort(
        (a, b) => a.journal.localeCompare(b.journal, "en") || a.year - b.year
      );
    } else if (state.sort === "title") {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title, "en"));
    } else {
      result = [...result].sort((a, b) => a.id - b.id);
    }

    return result;
  }

  function renderFilters() {
    const counts = papers.reduce((accumulator, paper) => {
      accumulator[paper.category] = (accumulator[paper.category] ?? 0) + 1;
      return accumulator;
    }, {});

    const all = `
      <button
        class="category-filter ${state.category === "all" ? "is-active" : ""}"
        type="button"
        data-category="all"
        aria-pressed="${state.category === "all"}"
      >
        全部 <small>${papers.length}</small>
      </button>`;

    const categoryButtons = Object.entries(categories)
      .filter(([key]) => counts[key])
      .map(
        ([key, category]) => `
          <button
            class="category-filter ${state.category === key ? "is-active" : ""}"
            type="button"
            data-category="${key}"
            aria-pressed="${state.category === key}"
          >
            ${escapeHtml(category.label)} <small>${counts[key]}</small>
          </button>`
      )
      .join("");

    filters.innerHTML = all + categoryButtons;
  }

  function paperCard(paper) {
    const category = categories[paper.category];
    return `
      <article class="paper-card" style="--category-color: ${category.color}">
        <a
          class="paper-cover"
          href="${escapeHtml(paper.pdfUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="在线阅读：${escapeHtml(paper.title)}"
        >
          <span class="cover-top">
            <span>${String(paper.id).padStart(2, "0")}</span>
            <span>${paper.year}</span>
          </span>
          <span class="cover-pdf">PDF</span>
          <span class="cover-bottom">
            <span>${escapeHtml(paper.sourceType.toUpperCase())}</span>
            <span>${escapeHtml(paper.license)}</span>
          </span>
        </a>

        <div class="paper-body">
          <div class="paper-kicker">
            <span class="paper-category">${escapeHtml(category.label)}</span>
            <span class="source-tag">${escapeHtml(paper.sourceLabel)}</span>
          </div>
          <h3 class="paper-title">${escapeHtml(paper.title)}</h3>
          <p class="paper-summary">${escapeHtml(paper.summary)}</p>
          <div class="paper-meta">
            <span>${escapeHtml(authorShort(paper.authors))}</span>
            <span><strong>${escapeHtml(citation(paper))}</strong></span>
            <span>PMID ${escapeHtml(paper.pmid)} · DOI ${escapeHtml(paper.doi)}</span>
          </div>
          <div class="paper-actions">
            <a
              class="button button-primary"
              href="${escapeHtml(paper.pdfUrl)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              在线阅读
            </a>
            <a
              class="button button-outline"
              href="${escapeHtml(paper.articleUrl)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              原文页面
            </a>
            <a
              class="button button-outline"
              href="https://pubmed.ncbi.nlm.nih.gov/${escapeHtml(paper.pmid)}/"
              target="_blank"
              rel="noopener noreferrer"
            >
              PubMed
            </a>
            <button class="button button-outline" type="button" data-action="copy" data-paper-id="${paper.id}">
              复制 DOI
            </button>
          </div>
        </div>
      </article>`;
  }

  function render() {
    const results = filteredPapers();
    summary.innerHTML = `显示 <strong>${results.length}</strong> 篇文献${
      state.query.trim() ? `，关键词“${escapeHtml(state.query.trim())}”` : ""
    }`;
    list.innerHTML = results.length
      ? results.map(paperCard).join("")
      : `<div class="empty-state"><h3>没有匹配的文献</h3><p>可尝试标题、作者、PMID、DOI 或主题关键词。</p></div>`;
    renderFilters();
  }

  async function copyDoi(paper) {
    try {
      await navigator.clipboard.writeText(paper.doi);
      showToast("DOI 已复制");
    } catch {
      const temporary = document.createElement("textarea");
      temporary.value = paper.doi;
      temporary.setAttribute("readonly", "");
      temporary.style.position = "fixed";
      temporary.style.opacity = "0";
      document.body.appendChild(temporary);
      temporary.select();
      document.execCommand("copy");
      temporary.remove();
      showToast("DOI 已复制");
    }
  }

  document.querySelector("#paperCount").textContent = papers.length;
  document.querySelector("#journalCount").textContent = new Set(
    papers.map((paper) => paper.journal)
  ).size;
  document.querySelector("#viewableCount").textContent = papers.filter(
    (paper) => paper.pdfUrl
  ).length;

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    render();
  });

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    render();
  });

  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    render();
  });

  list.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const paper = papers.find((item) => item.id === Number(actionButton.dataset.paperId));
    if (!paper) return;

    if (actionButton.dataset.action === "copy") {
      copyDoi(paper);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== searchInput) {
      event.preventDefault();
      searchInput.focus();
    }
  });

  render();
})();
