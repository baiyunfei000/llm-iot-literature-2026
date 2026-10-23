(() => {
  const papers = window.PDF_LIBRARY;
  if (!papers) return;

  const categoryDefs = {
    review: { label: "综述与工艺路线", color: "#40587e" },
    mechanism: { label: "干燥机理", color: "#296674" },
    monitoring: { label: "过程监测", color: "#2e7874" },
    hybrid: { label: "新型与组合干燥", color: "#a34d33" },
    process: { label: "腌制与前处理", color: "#66682e" },
    flavor: { label: "风味与发酵", color: "#70475c" },
    safety: { label: "安全与货架期", color: "#a63e3e" },
  };

  const state = {
    query: "",
    category: "all",
    sort: "curated",
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
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
  }

  function formatBytes(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function licenseLabel(value) {
    const normalized = String(value || "").toLowerCase();
    if (!normalized) return "出版方免费全文";
    return normalized.replaceAll("-", " ").toUpperCase();
  }

  function authorShort(paper) {
    if (!paper.authors.length) return "作者信息未提供";
    const names = paper.authors.slice(0, 3).map((author) => author.name);
    return paper.authors.length > 3 ? `${names.join(", ")} 等` : names.join(", ");
  }

  function filtered() {
    const query = state.query.trim().toLowerCase();
    let result = papers.filter((paper) => {
      if (state.category !== "all" && paper.category !== state.category) {
        return false;
      }
      if (!query) return true;
      return [
        paper.title,
        paper.authorLine,
        paper.journal,
        paper.doi,
        paper.note,
        categoryDefs[paper.category]?.label || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
    if (state.sort === "newest") {
      result = result.sort((a, b) => b.year - a.year || a.id - b.id);
    } else if (state.sort === "pages") {
      result = result.sort((a, b) => b.pages - a.pages || a.id - b.id);
    } else {
      result = result.sort((a, b) => a.id - b.id);
    }
    return result;
  }

  function renderFilters() {
    const counts = {};
    for (const paper of papers) {
      counts[paper.category] = (counts[paper.category] || 0) + 1;
    }
    const all = `
      <button class="category-filter ${state.category === "all" ? "is-active" : ""}" data-category="all" type="button">
        全部全文 <small>${papers.length}</small>
      </button>`;
    const rest = Object.entries(categoryDefs)
      .filter(([key]) => counts[key])
      .map(
        ([key, def]) => `
          <button class="category-filter ${state.category === key ? "is-active" : ""}" data-category="${key}" type="button">
            ${def.label} <small>${counts[key]}</small>
          </button>`,
      )
      .join("");
    filters.innerHTML = all + rest;
  }

  function card(paper) {
    const category = categoryDefs[paper.category] ?? {
      label: "研究论文",
      color: "#43627a",
    };
    return `
      <article class="paper-card" style="--category-color: ${category.color}">
        <a class="paper-thumb" href="${escapeHtml(paper.file)}" target="_blank" rel="noopener" aria-label="打开 PDF：${escapeHtml(paper.title)}">
          <img src="${escapeHtml(paper.thumbnail)}" alt="论文首页缩略图" loading="lazy" />
          <span class="paper-index">${String(paper.id).padStart(2, "0")}</span>
        </a>
        <div class="paper-body">
          <div class="paper-kicker">
            <span class="paper-category">${category.label}</span>
            <span>${paper.year} · ${paper.pages} 页 · ${formatBytes(paper.bytes)}</span>
          </div>
          <h3 class="paper-title">${escapeHtml(paper.title)}</h3>
          <p class="paper-note">${escapeHtml(paper.note)}</p>
          <div class="paper-meta">
            <span>${escapeHtml(authorShort(paper))}</span>
            <span><strong>${escapeHtml(paper.journal)}</strong></span>
            <span>${escapeHtml(licenseLabel(paper.license))} · DOI: ${escapeHtml(paper.doi)}</span>
          </div>
          <div class="paper-actions">
            <a class="button button-primary" href="${escapeHtml(paper.file)}" target="_blank" rel="noopener">
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6zM14 3v4h4M9 12h6M9 16h6"></path></svg>
              在线阅读 PDF
            </a>
            <button class="button button-outline" type="button" data-copy="${paper.id}">
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 8h11v12H8zM5 16H4V4h11v1"></path></svg>
              复制 DOI
            </button>
            <a class="button button-outline" href="${escapeHtml(paper.url)}" target="_blank" rel="noopener">在线来源</a>
          </div>
        </div>
      </article>`;
  }

  function render() {
    const results = filtered();
    summary.innerHTML = `显示 <strong>${results.length}</strong> 篇完整全文${
      state.query.trim() ? `，关键词“${escapeHtml(state.query.trim())}”` : ""
    }`;
    list.innerHTML = results.length
      ? results.map(card).join("")
      : `<div class="empty-state"><h3>没有匹配的全文</h3><p>请尝试其它标题、作者、期刊或 DOI 关键词。</p></div>`;
    renderFilters();
  }

  document.querySelector("#paperCount").textContent = papers.length;
  document.querySelector("#journalCount").textContent = new Set(
    papers.map((paper) => paper.journal),
  ).size;
  document.querySelector("#pageCount").textContent = papers.reduce(
    (sum, paper) => sum + paper.pages,
    0,
  );
  const years = papers.map((paper) => paper.year).filter(Boolean);
  document.querySelector("#yearRange").textContent =
    `${Math.min(...years)}–${Math.max(...years)}`;

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

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy]");
    if (!button) return;
    const paper = papers.find((item) => item.id === Number(button.dataset.copy));
    if (!paper) return;
    try {
      await navigator.clipboard.writeText(paper.doi);
      showToast("DOI 已复制");
    } catch {
      showToast(`DOI：${paper.doi}`);
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
