(() => {
  const data = window.LITERATURE_DATA;
  if (!data) return;

  const categories = {
    mechanism: { label: "干燥机理与模型", color: "#296674" },
    hybrid: { label: "新型与组合干燥", color: "#a34d33" },
    process: { label: "原料与前处理", color: "#66682e" },
    flavor: { label: "发酵、风味与品质", color: "#70475c" },
    safety: { label: "安全与货架期", color: "#a63e3e" },
    review: { label: "综述与方法学", color: "#40587e" },
  };

  const categoryOrder = Object.keys(categories);
  const state = {
    query: "",
    category: "all",
    period: "all",
    tag: "",
    sort: "curated",
    savedOnly: false,
    visible: 18,
    saved: new Set(JSON.parse(localStorage.getItem("beef-jerky-saved") || "[]")),
  };

  const elements = {
    search: document.querySelector("#searchInput"),
    categoryFilters: document.querySelector("#categoryFilters"),
    tagFilters: document.querySelector("#tagFilters"),
    sort: document.querySelector("#sortSelect"),
    list: document.querySelector("#paperList"),
    resultSummary: document.querySelector("#resultSummary"),
    activeFilters: document.querySelector("#activeFilters"),
    reset: document.querySelector("#resetFilters"),
    filterToggle: document.querySelector("#filterToggle"),
    savedOnly: document.querySelector("#savedOnly"),
    savedCount: document.querySelector("#savedCount"),
    loadMore: document.querySelector("#loadMore"),
    exportFiltered: document.querySelector("#exportFiltered"),
    downloadBib: document.querySelector("#downloadBib"),
    dialog: document.querySelector("#paperDialog"),
    dialogContent: document.querySelector("#dialogContent"),
    closeDialog: document.querySelector("#closeDialog"),
    toast: document.querySelector("#toast"),
  };

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
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 1900);
  }

  function persistSaved() {
    localStorage.setItem("beef-jerky-saved", JSON.stringify([...state.saved]));
    elements.savedCount.textContent = state.saved.size;
  }

  function authorShort(paper) {
    if (!paper.authors.length) return "作者信息未提供";
    const shown = paper.authors.slice(0, 3).map((author) => author.name);
    return paper.authors.length > 3 ? `${shown.join(", ")} 等` : shown.join(", ");
  }

  function apaAuthor(author) {
    if (!author.family) return author.name;
    const initials = author.given
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((part) => `${part[0].toUpperCase()}.`)
      .join(" ");
    return initials ? `${author.family}, ${initials}` : author.family;
  }

  function apaAuthors(paper) {
    const authors = paper.authors.map(apaAuthor);
    if (!authors.length) return "Author information unavailable";
    if (authors.length === 1) return authors[0];
    if (authors.length <= 20) {
      return `${authors.slice(0, -1).join(", ")}, & ${authors.at(-1)}`;
    }
    return `${authors.slice(0, 19).join(", ")}, ... ${authors.at(-1)}`;
  }

  function citationParts(paper) {
    const year = paper.year ? `(${paper.year}).` : "";
    const volume = paper.volume ? `, ${paper.volume}` : "";
    const issue = paper.issue ? `(${paper.issue})` : "";
    const pages = paper.pages ? `, ${paper.pages}` : "";
    return `${apaAuthors(paper)} ${year} ${paper.title}. ${paper.journal}${volume}${issue}${pages}. ${paper.url}`;
  }

  function bibtexKey(paper) {
    const family =
      paper.authors[0]?.family?.replaceAll(/[^a-zA-Z0-9]/g, "") || "paper";
    const word =
      paper.title
        .toLowerCase()
        .match(/[a-z]{4,}/)?.[0]
        ?.replaceAll(/[^a-z]/g, "") || "study";
    return `${family}${paper.year || ""}${word}${paper.rank}`;
  }

  function toBibtex(paper) {
    const pages = paper.pages ? `, pages = {${paper.pages}}` : "";
    return [
      `@article{${bibtexKey(paper)},`,
      `  author = {${paper.authorLine.replaceAll(";", " and")}},`,
      `  title = {${paper.title}},`,
      `  journal = {${paper.journal}},`,
      `  year = {${paper.year ?? ""}},`,
      `  volume = {${paper.volume}},`,
      `  number = {${paper.issue}},`,
      `  doi = {${paper.doi}}${pages}`,
      "}",
    ].join("\n");
  }

  function toRis(paper) {
    return [
      "TY  - JOUR",
      ...paper.authors.map((author) => `AU  - ${author.name}`),
      `TI  - ${paper.title}`,
      `JO  - ${paper.journal}`,
      `PY  - ${paper.year ?? ""}`,
      paper.volume ? `VL  - ${paper.volume}` : "",
      paper.issue ? `IS  - ${paper.issue}` : "",
      paper.pages ? `SP  - ${paper.pages.split("-")[0]}` : "",
      paper.pages?.includes("-") ? `EP  - ${paper.pages.split("-").at(-1)}` : "",
      `DO  - ${paper.doi}`,
      `UR  - ${paper.url}`,
      "ER  -",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function copyText(text, success = "已复制到剪贴板") {
    try {
      await navigator.clipboard.writeText(text);
      showToast(success);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      showToast(success);
    }
  }

  function downloadText(filename, content, type = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function renderCategoryFilters() {
    const totalButton = `
      <button class="category-filter ${state.category === "all" ? "is-active" : ""}" data-category="all" type="button">
        <span class="category-dot" style="--category-color: #1d2827"></span>
        <span>全部文献</span>
        <small>${data.total}</small>
      </button>`;
    const buttons = categoryOrder
      .map((key) => {
        const category = categories[key];
        return `
          <button class="category-filter ${state.category === key ? "is-active" : ""}" data-category="${key}" type="button">
            <span class="category-dot" style="--category-color: ${category.color}"></span>
            <span>${category.label}</span>
            <small>${data.categoryCounts[key] || 0}</small>
          </button>`;
      })
      .join("");
    elements.categoryFilters.innerHTML = totalButton + buttons;
  }

  function renderTagFilters() {
    const topTags = Object.entries(data.tagCounts).slice(0, 12);
    elements.tagFilters.innerHTML = topTags
      .map(
        ([tag, count]) => `
          <button class="tag-filter ${state.tag === tag ? "is-active" : ""}" data-tag="${escapeHtml(tag)}" type="button" aria-label="筛选标签 ${escapeHtml(tag)}，${count} 篇">
            ${escapeHtml(tag)}<span class="tag-count"> ${count}</span>
          </button>`,
      )
      .join("");
  }

  function cardTemplate(paper) {
    const category = categories[paper.category];
    const saved = state.saved.has(paper.doi);
    const identifier = `title-${paper.id}`;
    return `
      <article class="paper-card" style="--category-color: ${category.color}" aria-labelledby="${identifier}">
        <div class="paper-topline">
          <span class="paper-number">${String(paper.rank).padStart(2, "0")}</span>
          <span class="paper-category">${category.label}</span>
          <span class="paper-year">${paper.year ?? "—"} · ${escapeHtml(paper.type)}</span>
          <button class="paper-save" type="button" data-save="${escapeHtml(paper.doi)}" aria-pressed="${saved}" aria-label="${saved ? "取消收藏" : "收藏"}：${escapeHtml(paper.title)}">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.92 1.06-6.2L3 9.53l6.22-.9L12 3Z"></path>
            </svg>
          </button>
        </div>
        <h3 class="paper-title" id="${identifier}">
          <a href="${escapeHtml(paper.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(paper.title)}</a>
        </h3>
        <p class="paper-note">${escapeHtml(paper.note)}</p>
        <div class="paper-tags">
          ${paper.tags.map((tag) => `<button class="paper-tag" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join("")}
        </div>
        <div class="paper-meta">
          <span>${escapeHtml(authorShort(paper))}</span>
          <span class="paper-journal">${escapeHtml(paper.journal)}${paper.volume ? ` · Vol. ${escapeHtml(paper.volume)}` : ""}${paper.pages ? ` · ${escapeHtml(paper.pages)}` : ""}</span>
          <span>DOI: ${escapeHtml(paper.doi)}</span>
        </div>
        <div class="paper-actions">
          <button class="card-action" type="button" data-detail="${paper.id}">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5"></path></svg>
            查看详情
          </button>
          <button class="card-action" type="button" data-copy="${paper.id}">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 8h11v12H8zM5 16H4V4h11v1"></path></svg>
            复制引文
          </button>
          <a class="card-action" href="${escapeHtml(paper.url)}" target="_blank" rel="noopener noreferrer">
            DOI
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-8 8M18 13v6H5V6h6"></path></svg>
          </a>
        </div>
      </article>`;
  }

  function filteredPapers() {
    const query = state.query.trim().toLowerCase();
    let list = data.papers.filter((paper) => {
      if (state.category !== "all" && paper.category !== state.category) return false;
      if (state.tag && !paper.tags.includes(state.tag)) return false;
      if (state.savedOnly && !state.saved.has(paper.doi)) return false;
      if (state.period === "recent" && paper.year < 2022) return false;
      if (
        state.period === "established" &&
        (paper.year < 2015 || paper.year > 2021)
      ) {
        return false;
      }
      if (state.period === "foundational" && paper.year > 2014) return false;
      if (!query) return true;
      const haystack = [
        paper.title,
        paper.authorLine,
        paper.journal,
        paper.doi,
        paper.note,
        paper.type,
        paper.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    const sorters = {
      curated: (a, b) => a.rank - b.rank,
      newest: (a, b) => b.year - a.year || a.rank - b.rank,
      oldest: (a, b) => a.year - b.year || a.rank - b.rank,
      cited: (a, b) => b.citationCount - a.citationCount || a.rank - b.rank,
      title: (a, b) => a.title.localeCompare(b.title, "en"),
    };
    return list.sort(sorters[state.sort]);
  }

  function renderActiveFilters() {
    const chips = [];
    if (state.category !== "all") {
      chips.push(
        `<button class="active-filter" type="button" data-clear="category">主题：${categories[state.category].label} ×</button>`,
      );
    }
    if (state.period !== "all") {
      const labels = {
        recent: "2022–2026",
        established: "2015–2021",
        foundational: "1998–2014",
      };
      chips.push(
        `<button class="active-filter" type="button" data-clear="period">年份：${labels[state.period]} ×</button>`,
      );
    }
    if (state.tag) {
      chips.push(
        `<button class="active-filter" type="button" data-clear="tag">标签：${escapeHtml(state.tag)} ×</button>`,
      );
    }
    if (state.query.trim()) {
      chips.push(
        `<button class="active-filter" type="button" data-clear="query">搜索：${escapeHtml(state.query.trim())} ×</button>`,
      );
    }
    elements.activeFilters.innerHTML = chips.join("");
  }

  function renderResults() {
    const results = filteredPapers();
    elements.resultSummary.innerHTML = `找到 <strong>${results.length}</strong> 篇文献${
      state.query.trim() ? `，关键词“${escapeHtml(state.query.trim())}”` : ""
    }`;
    const visible = results.slice(0, state.visible);
    elements.list.innerHTML = visible.length
      ? visible.map(cardTemplate).join("")
      : `<div class="empty-state"><strong>没有匹配的文献</strong><p>请减少筛选条件，或尝试其它技术关键词。</p></div>`;
    elements.loadMore.classList.toggle(
      "is-hidden",
      visible.length >= results.length,
    );
    elements.loadMore.textContent = `再显示 ${Math.min(18, results.length - visible.length)} 篇`;
    renderActiveFilters();
  }

  function openDialog(paperId) {
    const paper = data.papers.find((item) => item.id === paperId);
    if (!paper) return;
    const category = categories[paper.category];
    elements.dialogContent.innerHTML = `
      <div class="dialog-kicker">
        <span class="category-dot" style="--category-color: ${category.color}"></span>
        ${category.label} · ${escapeHtml(paper.type)} · ${paper.year ?? "—"}
      </div>
      <h2 class="dialog-title">${escapeHtml(paper.title)}</h2>
      <dl class="dialog-meta">
        <div><dt>作者</dt><dd>${escapeHtml(paper.authorLine || "未提供")}</dd></div>
        <div><dt>期刊</dt><dd>${escapeHtml(paper.journal)}</dd></div>
        <div><dt>卷期页码</dt><dd>${escapeHtml([paper.volume, paper.issue, paper.pages].filter(Boolean).join(" · ") || "未提供")}</dd></div>
        <div><dt>DOI</dt><dd>${escapeHtml(paper.doi)}</dd></div>
        <div><dt>被引快照</dt><dd>${paper.citationCount}（${escapeHtml(paper.citationSource)}）</dd></div>
        <div><dt>记录状态</dt><dd>${paper.isRetracted ? "OpenAlex 标记为撤稿" : "未发现撤稿标记"}</dd></div>
      </dl>
      <p class="dialog-note"><strong>中文导读：</strong>${escapeHtml(paper.note)}</p>
      <section class="dialog-section">
        <h3>摘要节选</h3>
        <p>${paper.abstractExcerpt ? escapeHtml(paper.abstractExcerpt) : "开放元数据未提供摘要。请通过 DOI 查看出版社页面或机构数据库。"}</p>
      </section>
      <section class="dialog-section">
        <h3>APA 风格引文</h3>
        <div class="dialog-citation">${escapeHtml(citationParts(paper))}</div>
      </section>
      <div class="dialog-actions">
        <a class="button button-primary" href="${escapeHtml(paper.url)}" target="_blank" rel="noopener noreferrer">打开 DOI</a>
        <button class="button button-outline" type="button" data-dialog-copy="${paper.id}">复制 APA</button>
        <button class="button button-outline" type="button" data-dialog-bib="${paper.id}">复制 BibTeX</button>
        <button class="button button-outline" type="button" data-dialog-ris="${paper.id}">复制 RIS</button>
      </div>`;
    if (typeof elements.dialog.showModal === "function") {
      elements.dialog.showModal();
    } else {
      elements.dialog.setAttribute("open", "");
    }
  }

  function resetState() {
    state.query = "";
    state.category = "all";
    state.period = "all";
    state.tag = "";
    state.sort = "curated";
    state.savedOnly = false;
    state.visible = 18;
    elements.search.value = "";
    elements.sort.value = "curated";
    elements.savedOnly.setAttribute("aria-pressed", "false");
    document.querySelector('input[name="period"][value="all"]').checked = true;
    renderCategoryFilters();
    renderTagFilters();
    renderResults();
  }

  function exportCsv(results) {
    const header = [
      "number",
      "title",
      "authors",
      "journal",
      "year",
      "volume",
      "issue",
      "pages",
      "doi",
      "url",
      "category",
      "note",
      "citation_count",
    ];
    const rows = results.map((paper) => [
      paper.rank,
      paper.title,
      paper.authorLine,
      paper.journal,
      paper.year,
      paper.volume,
      paper.issue,
      paper.pages,
      paper.doi,
      paper.url,
      categories[paper.category].label,
      paper.note,
      paper.citationCount,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    downloadText(
      `beef-jerky-literature-filtered-${new Date().toISOString().slice(0, 10)}.csv`,
      `\uFEFF${csv}\n`,
      "text/csv;charset=utf-8",
    );
  }

  function exportBibtex(results) {
    downloadText(
      `beef-jerky-literature-filtered-${new Date().toISOString().slice(0, 10)}.bib`,
      `${results.map(toBibtex).join("\n\n")}\n`,
      "application/x-bibtex;charset=utf-8",
    );
  }

  document.querySelector("#metricPapers").textContent = data.total;
  document.querySelector("#metricJournals").textContent = data.journalCount;
  document.querySelector("#metricYears").textContent = `${data.yearMin}–${data.yearMax}`;
  document.querySelector("#metricCategories").textContent =
    Object.keys(categories).length;
  persistSaved();
  renderCategoryFilters();
  renderTagFilters();
  renderResults();

  elements.categoryFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    state.visible = 18;
    renderCategoryFilters();
    renderResults();
  });

  elements.tagFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tag]");
    if (!button) return;
    state.tag = state.tag === button.dataset.tag ? "" : button.dataset.tag;
    state.visible = 18;
    renderTagFilters();
    renderResults();
  });

  elements.list.addEventListener("click", async (event) => {
    const save = event.target.closest("[data-save]");
    if (save) {
      const doi = save.dataset.save;
      if (state.saved.has(doi)) state.saved.delete(doi);
      else state.saved.add(doi);
      persistSaved();
      renderResults();
      return;
    }

    const tag = event.target.closest("[data-tag]");
    if (tag) {
      state.tag = tag.dataset.tag;
      state.visible = 18;
      renderTagFilters();
      renderResults();
      return;
    }

    const detail = event.target.closest("[data-detail]");
    if (detail) {
      openDialog(detail.dataset.detail);
      return;
    }

    const copy = event.target.closest("[data-copy]");
    if (copy) {
      const paper = data.papers.find((item) => item.id === copy.dataset.copy);
      if (paper) await copyText(citationParts(paper));
    }
  });

  elements.search.addEventListener("input", () => {
    state.query = elements.search.value;
    state.visible = 18;
    renderResults();
  });

  document.querySelectorAll('input[name="period"]').forEach((input) => {
    input.addEventListener("change", () => {
      state.period = input.value;
      state.visible = 18;
      renderResults();
    });
  });

  elements.sort.addEventListener("change", () => {
    state.sort = elements.sort.value;
    renderResults();
  });

  elements.savedOnly.addEventListener("click", () => {
    state.savedOnly = !state.savedOnly;
    state.visible = 18;
    elements.savedOnly.setAttribute("aria-pressed", String(state.savedOnly));
    renderResults();
  });

  elements.loadMore.addEventListener("click", () => {
    state.visible += 18;
    renderResults();
  });

  elements.reset.addEventListener("click", resetState);

  elements.filterToggle.addEventListener("click", () => {
    const open = !elements.filterToggle.closest(".filters").classList.contains("is-open");
    elements.filterToggle.closest(".filters").classList.toggle("is-open", open);
    elements.filterToggle.setAttribute("aria-expanded", String(open));
    elements.filterToggle.firstChild.textContent = open ? "收起筛选" : "展开筛选";
  });

  elements.activeFilters.addEventListener("click", (event) => {
    const clear = event.target.closest("[data-clear]");
    if (!clear) return;
    if (clear.dataset.clear === "category") state.category = "all";
    if (clear.dataset.clear === "period") {
      state.period = "all";
      document.querySelector('input[name="period"][value="all"]').checked = true;
    }
    if (clear.dataset.clear === "tag") state.tag = "";
    if (clear.dataset.clear === "query") {
      state.query = "";
      elements.search.value = "";
    }
    renderCategoryFilters();
    renderTagFilters();
    renderResults();
  });

  elements.exportFiltered.addEventListener("click", () => {
    exportCsv(filteredPapers());
    showToast("已导出当前筛选结果");
  });

  elements.downloadBib.addEventListener("click", () => {
    exportBibtex(filteredPapers());
    showToast("已生成 BibTeX 文件");
  });

  elements.dialogContent.addEventListener("click", async (event) => {
    const paperId =
      event.target.closest("[data-dialog-copy]")?.dataset.dialogCopy ||
      event.target.closest("[data-dialog-bib]")?.dataset.dialogBib ||
      event.target.closest("[data-dialog-ris]")?.dataset.dialogRis;
    if (!paperId) return;
    const paper = data.papers.find((item) => item.id === paperId);
    if (!paper) return;
    if (event.target.closest("[data-dialog-copy]")) {
      await copyText(citationParts(paper), "已复制 APA 风格引文");
    } else if (event.target.closest("[data-dialog-bib]")) {
      await copyText(toBibtex(paper), "已复制 BibTeX");
    } else {
      await copyText(toRis(paper), "已复制 RIS");
    }
  });

  elements.closeDialog.addEventListener("click", () => elements.dialog.close());
  elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) elements.dialog.close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== elements.search) {
      event.preventDefault();
      elements.search.focus();
    }
    if (event.key === "Escape" && elements.dialog.open) {
      elements.dialog.close();
    }
  });
})();
