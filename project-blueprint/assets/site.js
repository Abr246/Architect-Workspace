/* site.js — shared rendering, nav, search index, illustrations, and the Ask agent.
   Classic script, no modules. Reads the bare `BLUEPRINT` identifier (not window.BLUEPRINT). */

var Site = (function () {
  "use strict";

  var THEME_KEY = "pitchai-theme";
  var registeredFigures = {}; // id -> {kind, payload}
  var searchIndex = null;
  var currentSectionId = null;

  /* ---------------- theme ---------------- */
  function applyTheme(theme) {
    if (theme) document.documentElement.setAttribute("data-theme", theme);
    else document.documentElement.removeAttribute("data-theme");
  }
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (saved) applyTheme(saved);
  }
  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme");
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var effectiveDark = current ? current === "dark" : prefersDark;
    var next = effectiveDark ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    reRenderThemedFigures();
  }

  /* ---------------- markup builders ---------------- */
  function buildTopNav(sectionId) {
    var backLink = sectionId !== "index"
      ? '<a class="home-link" href="index.html">&larr; Command Center</a>' : "";
    return (
      '<nav class="topnav"><div class="topnav-inner">' +
        '<a class="brand" href="index.html"><span class="dot"></span>' + BLUEPRINT.meta.shortName + ' Blueprint</a>' +
        backLink +
        '<div class="nav-search">' +
          '<input id="nav-search-input" type="search" placeholder="Search the whole blueprint…" autocomplete="off" aria-label="Search the blueprint">' +
          '<div class="search-results" id="nav-search-results"></div>' +
        '</div>' +
        '<div class="nav-actions">' +
          '<button class="icon-btn" id="theme-toggle" title="Toggle theme" aria-label="Toggle theme">◐ Theme</button>' +
          '<button class="icon-btn" id="print-btn" title="Print this page" aria-label="Print">Print</button>' +
        '</div>' +
      '</div></nav>'
    );
  }

  function buildBreadcrumbs(sectionId) {
    if (sectionId === "index") return "";
    var sec = findSection(sectionId);
    return '<div class="container breadcrumbs"><a href="index.html">Command Center</a> &rsaquo; <span>' + (sec ? sec.name : "") + "</span></div>";
  }

  function findSection(id) {
    for (var i = 0; i < BLUEPRINT.sections.length; i++) if (BLUEPRINT.sections[i].id === id) return BLUEPRINT.sections[i];
    return null;
  }

  function buildFootNav(sectionId) {
    if (sectionId === "index") return "";
    var idx = -1;
    for (var i = 0; i < BLUEPRINT.sections.length; i++) if (BLUEPRINT.sections[i].id === sectionId) idx = i;
    var prev = idx > 0 ? BLUEPRINT.sections[idx - 1] : null;
    var next = idx >= 0 && idx < BLUEPRINT.sections.length - 1 ? BLUEPRINT.sections[idx + 1] : null;
    var html = '<div class="container"><div class="section-foot">';
    html += prev
      ? '<a class="foot-link prev" href="' + prev.file + '"><div class="fl-dir">&larr; Previous</div><div class="fl-name">' + prev.name + "</div></a>"
      : '<a class="foot-link prev" href="index.html"><div class="fl-dir">&larr; Back</div><div class="fl-name">Command Center</div></a>';
    html += next
      ? '<a class="foot-link next" href="' + next.file + '"><div class="fl-dir">Next &rarr;</div><div class="fl-name">' + next.name + "</div></a>"
      : '<a class="foot-link next" href="index.html"><div class="fl-dir">Done &rarr;</div><div class="fl-name">Command Center</div></a>';
    html += "</div>";
    html += '<div class="back-to-top"><button id="back-to-top-btn">&uarr; Back to top</button></div></div>';
    return html;
  }

  function buildAskPanel(sectionId) {
    var sec = findSection(sectionId);
    var scopeLabel = sec ? sec.name : "this section";
    return (
      '<div class="ask-panel">' +
        '<button class="ask-fab" id="ask-fab" aria-label="Ask the blueprint">?</button>' +
        '<div class="ask-window" id="ask-window">' +
          '<div class="ask-head"><strong>Ask the blueprint</strong><button class="icon-btn" id="ask-close" aria-label="Close">✕</button></div>' +
          '<div class="ask-modes">' +
            '<button class="ask-mode-btn active" data-mode="search" id="mode-search-btn">Search — no key</button>' +
            '<button class="ask-mode-btn" data-mode="claude" id="mode-claude-btn">Claude — needs key</button>' +
          '</div>' +
          '<div id="ask-claude-config" style="display:none; padding: 10px 14px 0;">' +
            '<div class="ask-key-row"><input type="password" id="ask-api-key" placeholder="Paste your Anthropic API key" autocomplete="off"></div>' +
            '<div class="ask-scope">' +
              '<select id="ask-model" aria-label="Model">' +
                '<option value="claude-opus-5">claude-opus-5</option>' +
                '<option value="claude-sonnet-5">claude-sonnet-5</option>' +
                '<option value="claude-haiku-4-5">claude-haiku-4-5</option>' +
              '</select>' +
              '<select id="ask-scope-select" aria-label="Scope">' +
                '<option value="section">This section (' + scopeLabel + ")</option>" +
                '<option value="all">Whole blueprint</option>' +
              "</select>" +
            "</div>" +
            '<p class="ask-hint">Your key is stored only in this browser’s localStorage. It is never sent anywhere but api.anthropic.com.</p>' +
          "</div>" +
          '<div class="ask-body" id="ask-body"><p class="ask-hint">Ask anything about this blueprint. Search mode works fully offline, no API key needed.</p></div>' +
          '<div class="ask-foot">' +
            '<textarea id="ask-input" placeholder="Ask a question…" aria-label="Your question"></textarea>' +
            '<button class="ask-send" id="ask-send">Ask</button>' +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function buildLightbox() {
    return (
      '<div class="lightbox-overlay" id="lightbox-overlay">' +
        '<div class="lightbox-box">' +
          '<div class="lightbox-toolbar">' +
            '<button class="expand-btn" id="lb-zoom-out">− Zoom out</button>' +
            '<button class="expand-btn" id="lb-zoom-reset">Reset</button>' +
            '<button class="expand-btn" id="lb-zoom-in">+ Zoom in</button>' +
            '<button class="expand-btn" id="lb-close">Esc ✕ Close</button>' +
          "</div>" +
          '<div class="lightbox-stage" id="lightbox-stage"><div id="lightbox-inner"></div></div>' +
        "</div>" +
      "</div>"
    );
  }

  /* ---------------- figures: mermaid / svg / chart, with expand ---------------- */
  function figureShell(id, title, expandable) {
    return (
      '<div class="figure">' +
        '<div class="figure-head"><h3>' + title + "</h3>" +
        (expandable ? '<button class="expand-btn" data-expand="' + id + '">⛶ Expand</button>' : "") +
        "</div>" +
        '<div class="figure-body svg-wrap" id="' + id + '"></div>' +
        '<div class="figure-interp" id="' + id + '-interp"></div>' +
      "</div>"
    );
  }

  function renderInterp(id, text) {
    var el = document.getElementById(id + "-interp");
    if (el) el.textContent = text;
  }

  function mermaidTheme() {
    var current = document.documentElement.getAttribute("data-theme");
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = current ? current === "dark" : prefersDark;
    return dark ? "dark" : "default";
  }

  function renderMermaidInto(containerId, source) {
    var container = document.getElementById(containerId);
    if (!container || typeof mermaid === "undefined") {
      if (container) container.innerHTML = '<pre style="white-space:pre-wrap;font-size:.8rem;">' + source.replace(/</g, "&lt;") + "</pre>";
      return;
    }
    mermaid.initialize({ startOnLoad: false, theme: mermaidTheme(), securityLevel: "loose", fontFamily: "Segoe UI, system-ui, sans-serif" });
    var renderId = "m" + Math.random().toString(36).slice(2, 9);
    mermaid.render(renderId, source).then(function (result) {
      container.innerHTML = result.svg;
    }).catch(function (err) {
      container.innerHTML = '<p class="ask-err">Diagram failed to render: ' + String(err && err.message || err) + "</p>";
    });
  }

  function registerFigure(id, kind, payload) {
    registeredFigures[id] = { kind: kind, payload: payload };
  }

  function renderFigure(id) {
    var fig = registeredFigures[id];
    if (!fig) return;
    if (fig.kind === "mermaid") renderMermaidInto(id, fig.payload.source);
    else if (fig.kind === "svg") document.getElementById(id).innerHTML = fig.payload.svg;
    else if (fig.kind === "chart") renderChartInto(id, fig.payload);
  }

  function renderChartInto(containerId, payload) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<canvas></canvas>';
    var canvas = container.querySelector("canvas");
    if (typeof Chart === "undefined") { container.innerHTML = "<p>Chart.js unavailable offline.</p>"; return; }
    var styles = getComputedStyle(document.documentElement);
    var textColor = styles.getPropertyValue("--text").trim() || "#0f172a";
    var gridColor = styles.getPropertyValue("--border").trim() || "#e2e8f0";
    var cfg = JSON.parse(JSON.stringify(payload.config));
    cfg.options = cfg.options || {};
    cfg.options.color = textColor;
    cfg.options.plugins = cfg.options.plugins || {};
    if (cfg.options.plugins.legend) cfg.options.plugins.legend.labels = { color: textColor };
    if (cfg.options.scales) {
      Object.keys(cfg.options.scales).forEach(function (k) {
        cfg.options.scales[k].ticks = { color: textColor };
        cfg.options.scales[k].grid = { color: gridColor };
      });
    }
    if (fig_lastChart) { try { fig_lastChart[containerId] && fig_lastChart[containerId].destroy(); } catch (e) {} }
    fig_lastChart[containerId] = new Chart(canvas, cfg);
  }
  var fig_lastChart = {};

  function reRenderThemedFigures() {
    Object.keys(registeredFigures).forEach(function (id) {
      var fig = registeredFigures[id];
      if (fig.kind === "mermaid" || fig.kind === "chart") renderFigure(id);
    });
  }

  /* ---------------- lightbox / zoom ---------------- */
  var zoomLevel = 1;
  function openLightbox(figId) {
    var overlay = document.getElementById("lightbox-overlay");
    var inner = document.getElementById("lightbox-inner");
    var fig = registeredFigures[figId];
    if (!overlay || !inner || !fig) return;
    zoomLevel = 1;
    inner.style.transform = "scale(1)";
    if (fig.kind === "mermaid") {
      inner.innerHTML = "";
      mermaid.initialize({ startOnLoad: false, theme: mermaidTheme(), securityLevel: "loose" });
      var renderId = "lb" + Math.random().toString(36).slice(2, 9);
      mermaid.render(renderId, fig.payload.source).then(function (r) { inner.innerHTML = r.svg; });
    } else if (fig.kind === "svg") {
      inner.innerHTML = fig.payload.svg;
    } else if (fig.kind === "chart") {
      inner.innerHTML = '<div style="width:80vw;max-width:900px;height:70vh;"><canvas id="lb-canvas"></canvas></div>';
      var cfg = JSON.parse(JSON.stringify(fig.payload.config));
      new Chart(document.getElementById("lb-canvas"), cfg);
    }
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    var overlay = document.getElementById("lightbox-overlay");
    if (overlay) overlay.classList.remove("open");
    document.body.style.overflow = "";
  }
  function applyZoom() {
    var inner = document.getElementById("lightbox-inner");
    if (inner) inner.style.transform = "scale(" + zoomLevel + ")";
  }

  /* ---------------- search index ---------------- */
  var STOPWORDS = {"the":1,"a":1,"an":1,"and":1,"or":1,"of":1,"to":1,"in":1,"on":1,"for":1,"is":1,"it":1,"this":1,"that":1,"with":1,"as":1,"by":1,"be":1,"are":1,"was":1,"at":1,"from":1,"its":1};

  function tokenize(str) {
    return (String(str).toLowerCase().match(/[a-z0-9]+/g)) || [];
  }
  function stem(w) {
    if (w.length > 5) {
      if (w.slice(-3) === "ing") return w.slice(0, -3);
      if (w.slice(-2) === "ed") return w.slice(0, -2);
    }
    if (w.length > 3) {
      if (w.slice(-3) === "ies") return w.slice(0, -3) + "y";
      if (w.slice(-2) === "es") return w.slice(0, -2);
      if (w.slice(-1) === "s") return w.slice(0, -1);
    }
    return w;
  }

  function buildSearchIndex() {
    if (searchIndex) return searchIndex;
    var idx = [];
    var sec;

    sec = findSection("summary");
    idx.push({ section: sec.name, file: sec.file, title: "The Idea", text: BLUEPRINT.meta.idea });
    idx.push({ section: sec.name, file: sec.file, title: "Day-One Requirement", text: BLUEPRINT.meta.dayOne });

    sec = findSection("components");
    BLUEPRINT.components.forEach(function (c) {
      idx.push({ section: sec.name, file: sec.file, title: c.name, text: c.description + " " + c.why + " " + c.layer, anchor: c.id });
    });

    sec = findSection("dataflow");
    BLUEPRINT.dataFlow.forEach(function (d) {
      idx.push({ section: sec.name, file: sec.file, title: "Step " + d.step + " — " + d.actor, text: d.action, anchor: "step-" + d.step });
    });

    sec = findSection("buildorder");
    BLUEPRINT.buildPhases.forEach(function (p) {
      idx.push({ section: sec.name, file: sec.file, title: "Phase " + p.phase + " — " + p.name, text: p.builds + " " + p.proves, anchor: "phase-" + p.phase });
    });

    sec = findSection("assumptions");
    BLUEPRINT.assumptions.forEach(function (a, i) {
      idx.push({ section: sec.name, file: sec.file, title: "Assumption " + (i + 1), text: a.assumption + " " + a.impact, anchor: "assumption-" + i });
    });
    idx.push({ section: sec.name, file: sec.file, title: "Open Question", text: BLUEPRINT.openQuestion.question + " " + BLUEPRINT.openQuestion.branchA.detail + " " + BLUEPRINT.openQuestion.branchB.detail, anchor: "open-question" });

    sec = findSection("coverage");
    BLUEPRINT.coverage.forEach(function (c) {
      idx.push({ section: sec.name, file: sec.file, title: c.area, text: c.covered + " coverage — " + c.note, anchor: "coverage" });
    });
    BLUEPRINT.notCovered.forEach(function (n, i) {
      idx.push({ section: sec.name, file: sec.file, title: "Not Covered", text: n, anchor: "not-covered" });
    });

    BLUEPRINT.sections.forEach(function (s) {
      idx.push({ section: s.name, file: s.file, title: s.name, text: s.desc });
    });

    idx.forEach(function (entry) {
      entry.tokens = tokenize(entry.title + " " + entry.text);
      entry.stems = entry.tokens.map(stem);
      entry.titleStems = tokenize(entry.title).map(stem);
    });

    searchIndex = idx;
    return idx;
  }

  function runSearch(query, limit) {
    limit = limit || 8;
    var idx = buildSearchIndex();
    var qTokens = tokenize(query).filter(function (t) { return !STOPWORDS[t]; });
    if (!qTokens.length) return [];
    var qStems = qTokens.map(stem);
    var phrase = query.toLowerCase().trim();
    var scored = idx.map(function (entry) {
      var score = 0;
      qStems.forEach(function (qs) {
        entry.stems.forEach(function (es) { if (es === qs) score += 1; });
        if (entry.titleStems.indexOf(qs) !== -1) score += 3;
      });
      if (phrase.length > 2 && entry.text.toLowerCase().indexOf(phrase) !== -1) score += 5;
      if (phrase.length > 2 && entry.title.toLowerCase().indexOf(phrase) !== -1) score += 4;
      return { entry: entry, score: score };
    }).filter(function (s) { return s.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, limit);
    return scored;
  }

  function highlight(text, query) {
    var terms = tokenize(query).filter(function (t) { return !STOPWORDS[t] && t.length > 1; });
    if (!terms.length) return escapeHtml(text);
    var escaped = escapeHtml(text);
    terms.sort(function (a, b) { return b.length - a.length; });
    terms.forEach(function (t) {
      var re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[a-z]*)", "ig");
      escaped = escaped.replace(re, "<mark>$1</mark>");
    });
    return escaped;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function snippet(text, query, len) {
    len = len || 130;
    if (text.length <= len) return text;
    return text.slice(0, len).replace(/\s+\S*$/, "") + "…";
  }

  /* ---------------- nav search wiring ---------------- */
  function wireNavSearch() {
    var input = document.getElementById("nav-search-input");
    var results = document.getElementById("nav-search-results");
    if (!input || !results) return;
    input.addEventListener("input", function () {
      var q = input.value.trim();
      if (!q) { results.classList.remove("open"); results.innerHTML = ""; filterCurrentPage(""); return; }
      var matches = runSearch(q, 10);
      filterCurrentPage(q);
      if (!matches.length) {
        results.innerHTML = '<div class="search-empty">No matches. Try a different word, or check the Coverage page — a miss may itself be the answer.</div>';
      } else {
        results.innerHTML = matches.map(function (m) {
          return '<a class="search-result" href="' + m.entry.file + (m.entry.anchor ? "#" + m.entry.anchor : "") + '">' +
            '<div class="sr-section">' + m.entry.section + "</div>" +
            "<div>" + highlight(m.entry.title, q) + "</div>" +
            '<div style="color:var(--muted)">' + highlight(snippet(m.entry.text, q), q) + "</div>" +
          "</a>";
        }).join("");
      }
      results.classList.add("open");
    });
    document.addEventListener("click", function (e) {
      if (!results.contains(e.target) && e.target !== input) results.classList.remove("open");
    });
  }

  function filterCurrentPage(q) {
    var items = document.querySelectorAll("[data-searchable]");
    var qLower = q.toLowerCase();
    items.forEach(function (el) {
      if (!qLower) { el.style.display = ""; return; }
      var hay = (el.getAttribute("data-searchable") || el.textContent).toLowerCase();
      el.style.display = hay.indexOf(qLower) !== -1 ? "" : "none";
    });
  }

  /* ---------------- ask panel wiring ---------------- */
  function sectionRelevantData(sectionId) {
    switch (sectionId) {
      case "summary": return { meta: BLUEPRINT.meta, components: BLUEPRINT.components.map(function(c){return {name:c.name, layer:c.layer};}) };
      case "components": return { components: BLUEPRINT.components };
      case "architecture": return { components: BLUEPRINT.components, diagrams: BLUEPRINT.diagrams };
      case "dataflow": return { dataFlow: BLUEPRINT.dataFlow, diagrams: { sequence: BLUEPRINT.diagrams.sequence } };
      case "buildorder": return { buildPhases: BLUEPRINT.buildPhases };
      case "assumptions": return { assumptions: BLUEPRINT.assumptions, openQuestion: BLUEPRINT.openQuestion };
      case "coverage": return { coverage: BLUEPRINT.coverage, notCovered: BLUEPRINT.notCovered };
      default: return BLUEPRINT;
    }
  }

  function buildSystemPrompt(scope, sectionId) {
    var data = scope === "all" ? BLUEPRINT : sectionRelevantData(sectionId);
    return "You are answering questions about a software architecture blueprint for an AI-powered soccer facility " +
      "booking and utilization platform. Answer ONLY using the JSON data below — do not use outside knowledge. " +
      "If the answer is not present in the data, say plainly that the blueprint does not cover it. Be concise.\n\n" +
      "BLUEPRINT DATA:\n" + JSON.stringify(data);
  }

  function wireAskPanel() {
    var fab = document.getElementById("ask-fab");
    var win = document.getElementById("ask-window");
    var closeBtn = document.getElementById("ask-close");
    var modeSearchBtn = document.getElementById("mode-search-btn");
    var modeClaudeBtn = document.getElementById("mode-claude-btn");
    var claudeConfig = document.getElementById("ask-claude-config");
    var sendBtn = document.getElementById("ask-send");
    var input = document.getElementById("ask-input");
    var body = document.getElementById("ask-body");
    var apiKeyInput = document.getElementById("ask-api-key");
    if (!fab) return;

    var mode = "search";
    try {
      var savedKey = localStorage.getItem("pitchai-anthropic-key");
      if (savedKey) apiKeyInput.value = savedKey;
    } catch (e) {}

    fab.addEventListener("click", function () { win.classList.toggle("open"); if (win.classList.contains("open")) input.focus(); });
    closeBtn.addEventListener("click", function () { win.classList.remove("open"); });

    modeSearchBtn.addEventListener("click", function () {
      mode = "search"; modeSearchBtn.classList.add("active"); modeClaudeBtn.classList.remove("active");
      claudeConfig.style.display = "none";
    });
    modeClaudeBtn.addEventListener("click", function () {
      mode = "claude"; modeClaudeBtn.classList.add("active"); modeSearchBtn.classList.remove("active");
      claudeConfig.style.display = "block";
    });

    function ask() {
      var q = input.value.trim();
      if (!q) return;
      if (mode === "search") {
        var matches = runSearch(q, 6);
        if (!matches.length) {
          body.innerHTML = '<p class="ask-hint">No matches for that in the blueprint. Check the <a href="07-coverage.html">Coverage</a> page — a miss may itself be the answer.</p>';
        } else {
          body.innerHTML = matches.map(function (m) {
            return '<div class="ask-card"><div class="ask-src">' + m.entry.section + '</div>' +
              '<strong>' + highlight(m.entry.title, q) + '</strong>' +
              '<div>' + highlight(snippet(m.entry.text, q, 220), q) + '</div>' +
              '<a href="' + m.entry.file + (m.entry.anchor ? "#" + m.entry.anchor : "") + '">Open section →</a></div>';
          }).join("");
        }
      } else {
        var key = apiKeyInput.value.trim();
        try { localStorage.setItem("pitchai-anthropic-key", key); } catch (e) {}
        if (!key) {
          body.innerHTML = '<p class="ask-err">Paste your Anthropic API key above, or switch to Search mode — it needs no key and works offline.</p>';
          return;
        }
        body.innerHTML = '<p class="ask-hint">Asking Claude…</p>';
        var model = document.getElementById("ask-model").value;
        var scope = document.getElementById("ask-scope-select").value;
        var reqBody = {
          model: model,
          max_tokens: 16000,
          system: buildSystemPrompt(scope, currentSectionId),
          messages: [{ role: "user", content: q }]
        };
        if (model !== "claude-haiku-4-5") reqBody.output_config = { effort: "low" };
        fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify(reqBody)
        }).then(function (res) {
          if (!res.ok) {
            if (res.status === 401) throw new Error("Bad API key (401). Check the key, or switch to Search mode — no key needed.");
            if (res.status === 429) throw new Error("Rate limited (429). Wait a moment, or switch to Search mode.");
            throw new Error("Request blocked (" + res.status + "). You can switch to Search mode to keep working.");
          }
          return res.json();
        }).then(function (data) {
          if (data.stop_reason === "refusal") throw new Error("Claude declined to answer that. Try rephrasing, or switch to Search mode.");
          var text = (data.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("\n\n");
          body.innerHTML = '<div class="ask-card"><div class="ask-src">Claude — ' + model + '</div><div>' + escapeHtml(text || "No answer returned.").replace(/\n/g, "<br>") + "</div></div>";
        }).catch(function (err) {
          body.innerHTML = '<p class="ask-err">' + escapeHtml(err && err.message ? err.message : "Lost connection to the API. Switch to Search mode to keep working offline.") + "</p>";
        });
      }
    }
    sendBtn.addEventListener("click", ask);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } });
  }

  /* ---------------- lightbox wiring ---------------- */
  function wireLightbox() {
    document.addEventListener("click", function (e) {
      var trigger = e.target.closest && e.target.closest("[data-expand]");
      if (trigger) openLightbox(trigger.getAttribute("data-expand"));
    });
    var closeBtn = document.getElementById("lb-close");
    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
    var overlay = document.getElementById("lightbox-overlay");
    if (overlay) overlay.addEventListener("click", function (e) { if (e.target === overlay) closeLightbox(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLightbox(); });
    var zi = document.getElementById("lb-zoom-in"), zo = document.getElementById("lb-zoom-out"), zr = document.getElementById("lb-zoom-reset");
    if (zi) zi.addEventListener("click", function () { zoomLevel = Math.min(zoomLevel + 0.25, 4); applyZoom(); });
    if (zo) zo.addEventListener("click", function () { zoomLevel = Math.max(zoomLevel - 0.25, 0.25); applyZoom(); });
    if (zr) zr.addEventListener("click", function () { zoomLevel = 1; applyZoom(); });
  }

  /* ---------------- misc wiring ---------------- */
  function wireScrollProgress() {
    var bar = document.getElementById("scroll-progress");
    if (!bar) return;
    window.addEventListener("scroll", function () {
      var h = document.documentElement;
      var scrolled = h.scrollTop;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? (scrolled / max) * 100 : 0) + "%";
    });
  }
  function wireBackToTop() {
    var btn = document.getElementById("back-to-top-btn");
    if (btn) btn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  }
  function wireThemeToggle() {
    var btn = document.getElementById("theme-toggle");
    if (btn) btn.addEventListener("click", toggleTheme);
  }
  function wirePrint() {
    var btn = document.getElementById("print-btn");
    if (btn) btn.addEventListener("click", function () { window.print(); });
  }

  /* ---------------- illustration SVGs (data-driven, theme-aware via CSS vars) ---------------- */
  function svgWrap(w, h, inner) {
    return '<svg viewBox="0 0 ' + w + " " + h + '" xmlns="http://www.w3.org/2000/svg" role="img" style="width:100%;height:auto;font-family:Segoe UI, system-ui, sans-serif;">' + inner + "</svg>";
  }
  function css(varName) { return "var(--" + varName + ")"; }

  function illoPipeline(detailed) {
    var w = detailed ? 720 : 280, h = detailed ? 220 : 120;
    var boxY = h / 2 - (detailed ? 34 : 16), boxH = detailed ? 68 : 32;
    var labels = ["Customer + Operator", "Booking Platform", "Confirmed Booking"];
    var counts = [BLUEPRINT.components.filter(function(c){return c.type==="entry";}).length, BLUEPRINT.components.length - 2, 1];
    var boxW = detailed ? 180 : 70, gap = detailed ? 60 : 24;
    var startX = (w - (boxW * 3 + gap * 2)) / 2;
    var s = "";
    for (var i = 0; i < 3; i++) {
      var x = startX + i * (boxW + gap);
      var fill = i === 1 ? css("accent") : css("card");
      var stroke = i === 1 ? css("accent") : css("border");
      var textColor = i === 1 ? css("accent-ink") : css("text");
      s += '<rect x="' + x + '" y="' + boxY + '" width="' + boxW + '" height="' + boxH + '" rx="10" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5"/>';
      if (detailed) {
        s += '<text x="' + (x + boxW / 2) + '" y="' + (boxY + boxH / 2 + 5) + '" text-anchor="middle" font-size="14" fill="' + textColor + '" font-weight="600">' + labels[i] + "</text>";
        s += '<text x="' + (x + boxW / 2) + '" y="' + (boxY + boxH + 20) + '" text-anchor="middle" font-size="11" fill="' + css("muted") + '">' + counts[i] + (i===0?" entry points": i===1? " services":" outcome") + "</text>";
      }
      if (i < 2) {
        var ax = x + boxW, ax2 = x + boxW + gap;
        s += '<line x1="' + ax + '" y1="' + (boxY + boxH / 2) + '" x2="' + (ax2 - 8) + '" y2="' + (boxY + boxH / 2) + '" stroke="' + css("muted") + '" stroke-width="2" marker-end="url(#arrow)"/>';
      }
    }
    s = '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="' + css("muted") + '"/></marker></defs>' + s;
    return svgWrap(w, h, s);
  }

  function illoLayers(detailed) {
    var layerOrder = ["Entry Points", "Frontend", "Services", "AI Layer", "Data", "Third Party"];
    var byLayer = {};
    BLUEPRINT.components.forEach(function (c) { (byLayer[c.layer] = byLayer[c.layer] || []).push(c); });
    var w = detailed ? 760 : 280;
    var rowH = detailed ? 48 : 16;
    var pad = detailed ? 6 : 3;
    var h = layerOrder.length * (rowH + pad) + pad;
    var s = "";
    var y = pad;
    var colorFor = { "Entry Points": "slate", "Frontend": "blue", "Services": "accent", "AI Layer": "amber", "Data": "green", "Third Party": "red" };
    layerOrder.forEach(function (layer) {
      var comps = byLayer[layer] || [];
      if (!comps.length) { y += rowH + pad; return; }
      var chipW = detailed ? (w - 160) / comps.length - 8 : (w - 20) / Math.max(comps.length, 1) - 4;
      var x = detailed ? 150 : 10;
      if (detailed) s += '<text x="0" y="' + (y + rowH / 2 + 4) + '" font-size="12" fill="' + css("muted") + '" font-weight="600">' + layer + "</text>";
      comps.forEach(function (c) {
        var colorVar = colorFor[layer] || "accent";
        s += '<rect x="' + x + '" y="' + y + '" width="' + Math.max(chipW, 6) + '" height="' + rowH + '" rx="' + (detailed ? 8 : 3) + '" fill="' + css(colorVar + "-bg") + '" stroke="' + css(colorVar) + '" stroke-width="1"/>';
        if (detailed) s += '<text x="' + (x + chipW / 2) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="middle" font-size="10.5" fill="' + css(colorVar) + '" font-weight="600">' + c.name + "</text>";
        x += chipW + 8;
      });
      y += rowH + pad;
    });
    return svgWrap(w, h, s);
  }

  function illoMiniGraph(detailed) {
    var comps = BLUEPRINT.components;
    var w = detailed ? 760 : 280, h = detailed ? 380 : 120;
    var cols = 3, rows = Math.ceil(comps.length / cols);
    var cellW = w / cols, cellH = h / rows;
    var positions = {};
    var s = "";
    comps.forEach(function (c, i) {
      var col = i % cols, row = Math.floor(i / cols);
      var cx = cellW * col + cellW / 2, cy = cellH * row + cellH / 2;
      positions[c.id] = { x: cx, y: cy };
    });
    var edgeCount = (BLUEPRINT.diagrams.architecture.match(/-->/g) || []).length;
    var seen = 0;
    comps.forEach(function (c, i) {
      if (i === 0) return;
      var from = positions[comps[Math.max(0, i - 3)].id];
      var to = positions[c.id];
      if (seen < edgeCount) {
        s += '<line x1="' + from.x + '" y1="' + from.y + '" x2="' + to.x + '" y2="' + to.y + '" stroke="' + css("border") + '" stroke-width="1.5"/>';
        seen++;
      }
    });
    comps.forEach(function (c) {
      var p = positions[c.id];
      var r = detailed ? 26 : 10;
      var colorVar = c.type === "datastore" ? "green" : c.type === "ai" || c.type === "worker" ? "amber" : c.type === "thirdparty" ? "red" : c.type === "entry" ? "slate" : "accent";
      if (c.type === "datastore") {
        s += '<rect x="' + (p.x - r) + '" y="' + (p.y - r * 0.7) + '" width="' + r * 2 + '" height="' + r * 1.4 + '" rx="6" fill="' + css(colorVar + "-bg") + '" stroke="' + css(colorVar) + '" stroke-width="1.5"/>';
      } else if (c.type === "thirdparty") {
        s += '<polygon points="' + hexPoints(p.x, p.y, r) + '" fill="' + css(colorVar + "-bg") + '" stroke="' + css(colorVar) + '" stroke-width="1.5"/>';
      } else if (c.type === "entry") {
        s += '<ellipse cx="' + p.x + '" cy="' + p.y + '" rx="' + r + '" ry="' + (r*0.7) + '" fill="' + css(colorVar + "-bg") + '" stroke="' + css(colorVar) + '" stroke-width="1.5"/>';
      } else {
        s += '<rect x="' + (p.x - r) + '" y="' + (p.y - r * 0.7) + '" width="' + r * 2 + '" height="' + r * 1.4 + '" rx="4" fill="' + css(colorVar + "-bg") + '" stroke="' + css(colorVar) + '" stroke-width="1.5"/>';
      }
      if (detailed) s += '<text x="' + p.x + '" y="' + (p.y + 4) + '" text-anchor="middle" font-size="9.5" fill="' + css(colorVar) + '" font-weight="600">' + wrapLabel(c.name) + "</text>";
    });
    return svgWrap(w, h, s);
  }
  function hexPoints(cx, cy, r) {
    var pts = [];
    for (var i = 0; i < 6; i++) { var a = Math.PI / 3 * i; pts.push((cx + r * Math.cos(a)) + "," + (cy + r * 0.8 * Math.sin(a))); }
    return pts.join(" ");
  }
  function wrapLabel(name) { return name.length > 16 ? name.slice(0, 15) + "…" : name; }

  function illoRibbon(detailed) {
    var steps = BLUEPRINT.dataFlow;
    var w = detailed ? 780 : 280;
    var perRow = detailed ? 4 : 6;
    var cell = detailed ? 170 : 42;
    var rows = Math.ceil(steps.length / perRow);
    var h = rows * (detailed ? 78 : 42) + 10;
    var s = "";
    steps.forEach(function (d, i) {
      var col = i % perRow, row = Math.floor(i / perRow);
      var x = col * cell + cell / 2, y = row * (detailed ? 78 : 42) + (detailed ? 40 : 20) + 5;
      var colorVar = d.dayOneCritical ? "green" : d.aiTouch ? "amber" : "accent";
      var r = detailed ? 22 : 11;
      s += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + css(colorVar + "-bg") + '" stroke="' + css(colorVar) + '" stroke-width="2"/>';
      s += '<text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle" font-size="' + (detailed ? 15 : 10) + '" fill="' + css(colorVar) + '" font-weight="700">' + d.step + "</text>";
      if (detailed) s += '<text x="' + x + '" y="' + (y + r + 16) + '" text-anchor="middle" font-size="10" fill="' + css("muted") + '">' + wrapLabel(d.actor) + "</text>";
      if (col < perRow - 1 && i < steps.length - 1) {
        s += '<line x1="' + (x + r) + '" y1="' + y + '" x2="' + (x + cell - r) + '" y2="' + y + '" stroke="' + css("border") + '" stroke-width="1.5"/>';
      }
    });
    return svgWrap(w, h, s);
  }

  function illoPhaseTimeline(detailed) {
    var phases = BLUEPRINT.buildPhases;
    var totalWeeks = phases.reduce(function (a, p) { return a + p.weeks; }, 0);
    var w = detailed ? 760 : 280, h = detailed ? phases.length * 46 + 20 : 120;
    var rowH = detailed ? 36 : 16, gap = detailed ? 10 : 4;
    var s = "";
    var xScale = (w - (detailed ? 20 : 10)) / totalWeeks;
    var y = 10;
    phases.forEach(function (p) {
      var barW = Math.max(p.weeks * xScale, 4);
      var colorVar = p.makeOrBreak ? "accent" : "blue";
      s += '<rect x="5" y="' + y + '" width="' + barW + '" height="' + rowH + '" rx="' + (detailed ? 6 : 3) + '" fill="' + css(colorVar + (p.makeOrBreak ? "" : "-bg")) + '" ' + (p.makeOrBreak ? 'opacity="0.9"' : 'stroke="' + css(colorVar) + '" stroke-width="1"') + '/>';
      if (detailed) s += '<text x="10" y="' + (y + rowH / 2 + 4) + '" font-size="11.5" fill="' + (p.makeOrBreak ? css("accent-ink") : css(colorVar)) + '" font-weight="600">P' + p.phase + " · " + p.name + (p.makeOrBreak ? " — make or break" : "") + "</text>";
      y += rowH + gap;
    });
    return svgWrap(w, h, s);
  }

  function illoFork(detailed) {
    var w = detailed ? 720 : 280, h = detailed ? 260 : 120;
    var cx = detailed ? 120 : 40, cy = h / 2;
    var branchAY = h * 0.28, branchBY = h * 0.72;
    var endX = detailed ? 640 : 250;
    var s = "";
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (detailed ? 10 : 5) + '" fill="' + css("accent") + '"/>';
    s += '<path d="M' + cx + ',' + cy + ' Q' + (cx + 80) + ',' + cy + ' ' + (cx + 140) + ',' + branchAY + ' L' + endX + ',' + branchAY + '" fill="none" stroke="' + css("green") + '" stroke-width="2.5"/>';
    s += '<path d="M' + cx + ',' + cy + ' Q' + (cx + 80) + ',' + cy + ' ' + (cx + 140) + ',' + branchBY + ' L' + endX + ',' + branchBY + '" fill="none" stroke="' + css("amber") + '" stroke-width="2.5"/>';
    if (detailed) {
      s += '<rect x="' + (endX - 4) + '" y="' + (branchAY - 26) + '" width="150" height="46" rx="8" fill="' + css("green-bg") + '" stroke="' + css("green") + '" stroke-width="1"/>';
      s += '<text x="' + (endX + 71) + '" y="' + (branchAY - 6) + '" text-anchor="middle" font-size="11" fill="' + css("green") + '" font-weight="700">' + BLUEPRINT.openQuestion.branchA.label + "</text>";
      s += '<rect x="' + (endX - 4) + '" y="' + (branchBY - 26) + '" width="150" height="46" rx="8" fill="' + css("amber-bg") + '" stroke="' + css("amber") + '" stroke-width="1"/>';
      s += '<text x="' + (endX + 71) + '" y="' + (branchBY - 6) + '" text-anchor="middle" font-size="11" fill="' + css("amber") + '" font-weight="700">' + BLUEPRINT.openQuestion.branchB.label + "</text>";
    } else {
      s += '<circle cx="' + endX + '" cy="' + branchAY + '" r="6" fill="' + css("green") + '"/>';
      s += '<circle cx="' + endX + '" cy="' + branchBY + '" r="6" fill="' + css("amber") + '"/>';
    }
    return svgWrap(w, h, s);
  }

  function illoCoverageGrid(detailed) {
    var rows = BLUEPRINT.coverage;
    var w = detailed ? 720 : 280;
    var cols = detailed ? 1 : 4;
    var perCol = Math.ceil(rows.length / cols);
    var cellH = detailed ? 30 : 18, cellW = w / cols - (detailed ? 0 : 6);
    var h = perCol * (cellH + 4) + 6;
    var colorMap = { full: "green", partial: "amber", none: "red" };
    var s = "";
    rows.forEach(function (r, i) {
      var col = Math.floor(i / perCol), rowIdx = i % perCol;
      var x = col * (cellW + 6) + 3, y = rowIdx * (cellH + 4) + 3;
      var colorVar = colorMap[r.covered] || "slate";
      s += '<rect x="' + x + '" y="' + y + '" width="' + cellW + '" height="' + cellH + '" rx="' + (detailed ? 6 : 3) + '" fill="' + css(colorVar + "-bg") + '" stroke="' + css(colorVar) + '" stroke-width="1"/>';
      if (detailed) s += '<text x="' + (x + 10) + '" y="' + (y + cellH / 2 + 4) + '" font-size="11.5" fill="' + css(colorVar) + '" font-weight="600">' + r.area + "</text>";
      if (detailed) s += '<text x="' + (x + cellW - 10) + '" y="' + (y + cellH / 2 + 4) + '" text-anchor="end" font-size="10" fill="' + css(colorVar) + '" font-weight="700">' + r.covered.toUpperCase() + "</text>";
    });
    return svgWrap(w, h, s);
  }

  var illustrations = {
    summary: illoPipeline,
    components: illoLayers,
    architecture: illoMiniGraph,
    dataflow: illoRibbon,
    buildorder: illoPhaseTimeline,
    assumptions: illoFork,
    coverage: illoCoverageGrid
  };

  function tileSvg(sectionId) {
    var fn = illustrations[sectionId];
    return fn ? fn(false) : "";
  }
  function fullIllustration(sectionId) {
    var fn = illustrations[sectionId];
    return fn ? fn(true) : "";
  }

  /* ---------------- command center tiles ---------------- */
  function tileCount(sectionId) {
    switch (sectionId) {
      case "summary": return BLUEPRINT.components.length + " components";
      case "components": return BLUEPRINT.components.length + " components";
      case "architecture": return (BLUEPRINT.diagrams.architecture.match(/-->/g) || []).length + " connections";
      case "dataflow": return BLUEPRINT.dataFlow.length + " steps";
      case "buildorder": return BLUEPRINT.buildPhases.length + " phases";
      case "assumptions": return BLUEPRINT.assumptions.length + " assumptions, 1 open question";
      case "coverage": return BLUEPRINT.coverage.filter(function (c) { return c.covered === "none"; }).length + " deferred";
      default: return "";
    }
  }

  function renderCommandCenter() {
    var grid = document.getElementById("tiles-grid");
    if (!grid) return;
    grid.innerHTML = BLUEPRINT.sections.map(function (s) {
      return '<a class="tile" href="' + s.file + '">' +
        '<div class="tile-svg">' + tileSvg(s.id) + "</div>" +
        "<h3>" + s.name + "</h3>" +
        "<p>" + s.desc + "</p>" +
        '<span class="tile-count">' + tileCount(s.id) + "</span>" +
      "</a>";
    }).join("");
  }

  /* ---------------- public mount ---------------- */
  function mount(sectionId) {
    currentSectionId = sectionId;
    initTheme();
    document.body.insertAdjacentHTML("afterbegin", '<div id="scroll-progress"></div>' + buildTopNav(sectionId));
    var navEl = document.querySelector(".topnav");
    if (navEl) navEl.insertAdjacentHTML("afterend", buildBreadcrumbs(sectionId));

    if (sectionId === "index") renderCommandCenter();

    var footRoot = document.getElementById("foot-root");
    if (footRoot) footRoot.innerHTML = buildFootNav(sectionId);

    document.body.insertAdjacentHTML("beforeend", buildAskPanel(sectionId) + buildLightbox());

    wireThemeToggle();
    wirePrint();
    wireScrollProgress();
    wireBackToTop();
    wireNavSearch();
    wireAskPanel();
    wireLightbox();
  }

  return {
    mount: mount,
    figureShell: figureShell,
    registerFigure: registerFigure,
    renderFigure: renderFigure,
    renderInterp: renderInterp,
    fullIllustration: fullIllustration,
    tileSvg: tileSvg,
    escapeHtml: escapeHtml
  };
})();
