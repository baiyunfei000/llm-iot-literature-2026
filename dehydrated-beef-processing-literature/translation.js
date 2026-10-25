(() => {
  const article = document.querySelector("#translationArticle");
  const nav = document.querySelector("#translationNav");
  let translations = [];

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function requestedId() {
    const value = Number(new URLSearchParams(window.location.search).get("id"));
    return translations.some((paper) => paper.id === value) ? value : 1;
  }

  function renderNavigation(activeId) {
    nav.innerHTML = translations
      .map(
        (paper) => `
          <a class="${paper.id === activeId ? "is-active" : ""}" href="translations.html?id=${paper.id}">
            <span class="translation-nav-index">${String(paper.id).padStart(2, "0")}</span>
            <span>${escapeHtml(paper.title_zh)}</span>
          </a>`
      )
      .join("");
  }

  function metadata(paper) {
    return `
      <dl class="translation-meta">
        <div><dt>期刊</dt><dd>${escapeHtml(paper.journal)}</dd></div>
        <div><dt>卷期</dt><dd>${escapeHtml(paper.citation)}</dd></div>
        <div><dt>PMID</dt><dd>${escapeHtml(paper.pmid)}</dd></div>
        <div><dt>许可</dt><dd>${escapeHtml(paper.license)}</dd></div>
        <div><dt>作者</dt><dd>${escapeHtml(paper.authors)}</dd></div>
        <div><dt>DOI</dt><dd>${escapeHtml(paper.doi)}</dd></div>
        <div><dt>免费来源</dt><dd>${escapeHtml(paper.source)}</dd></div>
        <div><dt>译文范围</dt><dd>公开摘要与核心内容</dd></div>
      </dl>`;
  }

  function pager(paper) {
    const previous =
      translations.find((item) => item.id === paper.id - 1) ??
      translations[translations.length - 1];
    const next =
      translations.find((item) => item.id === paper.id + 1) ??
      translations[0];
    return `
      <nav class="translation-pager" aria-label="相邻文献">
        <a href="translations.html?id=${previous.id}">
          <span>上一篇 · ${String(previous.id).padStart(2, "0")}</span>
          ${escapeHtml(previous.title_zh)}
        </a>
        <a href="translations.html?id=${next.id}">
          <span>下一篇 · ${String(next.id).padStart(2, "0")}</span>
          ${escapeHtml(next.title_zh)}
        </a>
      </nav>`;
  }

  function renderArticle(paper) {
    article.innerHTML = `
      <header class="translation-article-head">
        <p class="translation-article-number">文献 ${String(paper.id).padStart(2, "0")} · ${escapeHtml(paper.pmid)}</p>
        <h2>${escapeHtml(paper.title_zh)}</h2>
        <p class="translation-en-title">${escapeHtml(paper.title_en)}</p>
        ${metadata(paper)}
      </header>

      <section class="translation-section">
        <h3>摘要译文</h3>
        <p>${escapeHtml(paper.abstract_zh)}</p>
      </section>

      <section class="translation-section">
        <h3>核心结果</h3>
        <ul class="translation-results">
          ${paper.key_results.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>

      <section class="translation-section">
        <h3>对脱水肉品加工的启示</h3>
        <p>${escapeHtml(paper.application)}</p>
      </section>

      <section class="translation-section">
        <h3>原文入口</h3>
        <div class="translation-link-list">
          <a class="button button-outline" href="${escapeHtml(paper.article_url)}" target="_blank" rel="noopener noreferrer">
            文章页面
          </a>
          <a class="button button-outline" href="${escapeHtml(paper.pdf_url)}" target="_blank" rel="noopener noreferrer">
            原文 PDF
          </a>
          <a
            class="button button-outline"
            href="https://pubmed.ncbi.nlm.nih.gov/${escapeHtml(paper.pmid)}/"
            target="_blank"
            rel="noopener noreferrer"
          >
            PubMed
          </a>
          <a
            class="button button-outline"
            href="https://doi.org/${escapeHtml(paper.doi)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            DOI
          </a>
        </div>
      </section>

      ${pager(paper)}`;
  }

  function render() {
    const activeId = requestedId();
    const paper = translations.find((item) => item.id === activeId);
    renderNavigation(activeId);
    renderArticle(paper);
    document.title = `${paper.title_zh} · 中文译文`;
    document.documentElement.lang = "zh-CN";
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  fetch("translations.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      translations = data;
      render();
    })
    .catch(() => {
      article.innerHTML =
        '<div class="translation-error">中文译文暂时无法载入，请返回文献库后重试。</div>';
    });

  window.addEventListener("popstate", render);
})();
