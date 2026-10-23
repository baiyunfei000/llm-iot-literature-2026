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

  const journalProfiles = {
    "Meat Science": {
      tier: "第一梯队",
      scope: "肉品科学核心期刊",
      note: "肉品科学领域代表性国际期刊。本批文献中用于支撑干燥参数、盐预处理和品质监测核心论证的优先级最高。",
      color: "#8f3d2f",
    },
    Foods: {
      tier: "主流 SCIE",
      scope: "综合食品科学",
      note: "开放获取综合食品期刊，覆盖面广、发文量较大。适合提供近期工艺、风味和安全案例，但单篇权威性通常不及 Meat Science。",
      color: "#2f6570",
    },
    Microorganisms: {
      tier: "主流专业",
      scope: "食品与环境微生物",
      note: "微生物学方向正规期刊，不是专门肉类期刊，但在 Biltong 致病菌消减和加工安全上具有直接参考价值。",
      color: "#496b4f",
    },
    Molecules: {
      tier: "主流综合",
      scope: "化学与天然产物",
      note: "综合化学与天然产物期刊。用于肉干营养组成研究可以，但不是牛肉干燥加工的核心期刊。",
      color: "#6a557a",
    },
    Energies: {
      tier: "专业补充",
      scope: "能源工程",
      note: "能源工程方向期刊，适合支撑热泵干燥和能耗优化；在肉品科学领域属于方法补充。",
      color: "#a66a2e",
    },
    "Korean Journal for Food Science of Animal Resources": {
      tier: "专业期刊",
      scope: "食品动物资源",
      note: "韩国食品动物资源领域学会期刊。与 Pastirma 腌制、脂质和加工过程高度匹配，但国际综合影响力有限。",
      color: "#4d5f75",
    },
    "Asian-Australasian Journal of Animal Sciences": {
      tier: "专业期刊",
      scope: "动物科学",
      note: "亚洲动物科学领域较有历史的期刊，现相关刊名已更新。适合引用 Pastirma 风味与硝酸盐研究。",
      color: "#62734b",
    },
    "South African Journal of Animal Science": {
      tier: "区域专业",
      scope: "动物科学",
      note: "整体国际影响力有限，但本库中的 Biltong 加工综述具有很高的专题价值，适合建立工艺背景。",
      color: "#7b6843",
    },
    "Italian Journal of Food Safety": {
      tier: "专业 OA",
      scope: "食品安全",
      note: "食品安全方向开放获取期刊。红外干燥 Biltong 研究适合作为补充案例，不宜单独承担核心证据。",
      color: "#87614e",
    },
  };

  const state = {
    query: "",
    category: "all",
    sort: "curated",
  };

  const searchInput = document.querySelector("#searchInput");
  const sortSelect = document.querySelector("#sortSelect");
  const filters = document.querySelector("#categoryFilters");
  const journalStandings = document.querySelector("#journalStandings");
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

  function journalProfile(journal) {
    return (
      journalProfiles[journal] ?? {
        tier: "同行评审",
        scope: "专业期刊",
        note: "已纳入开放全文库的同行评审期刊。",
        color: "#52605c",
      }
    );
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
    const profile = journalProfile(paper.journal);
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
            <span title="${escapeHtml(profile.note)}">
              <strong>${escapeHtml(paper.journal)}</strong>
              <span class="journal-badge" style="--badge-color: ${profile.color}">${escapeHtml(profile.tier)}</span>
            </span>
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

  function renderJournalStandings() {
    const counts = {};
    for (const paper of papers) {
      counts[paper.journal] = (counts[paper.journal] || 0) + 1;
    }
    const order = Object.keys(journalProfiles);
    journalStandings.innerHTML = order
      .filter((journal) => counts[journal])
      .map((journal) => {
        const profile = journalProfiles[journal];
        return `
          <div class="journal-standing-row">
            <div class="journal-tier" style="--tier-color: ${profile.color}">${escapeHtml(profile.tier)}</div>
            <div class="journal-identity">
              <strong>${escapeHtml(journal)}</strong>
              <span>${escapeHtml(profile.scope)}</span>
            </div>
            <div class="journal-standing-note">${escapeHtml(profile.note)}</div>
            <div class="journal-count">${counts[journal]} 篇</div>
          </div>`;
      })
      .join("");
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
  renderJournalStandings();

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
