/* site.js — shared rendering, nav, search index, illustrations, copy buttons, and the Ask agent
   for the Tech Stack knowledge base. Classic script, no modules. Reads the bare `STACK`
   identifier (not window.STACK). Sibling of ../../assets/site.js (the architecture site's
   own copy) — kept separate on purpose since the two sites render different data shapes. */

var Site = (function () {
  "use strict";

  var THEME_KEY = "pitchai-theme"; // shared with the architecture site so the toggle stays in sync
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
      ? '<a class="home-link" href="index.html">&larr; Stack Command Center</a>' : "";
    return (
      '<nav class="topnav"><div class="topnav-inner">' +
        '<a class="brand" href="index.html"><span class="dot"></span>' + STACK.meta.shortName + ' Stack</a>' +
        backLink +
        '<a class="cross-link" href="../index.html">Architecture &rarr;</a>' +
        '<div class="nav-search">' +
          '<input id="nav-search-input" type="search" placeholder="Search the whole stack…" autocomplete="off" aria-label="Search the tech stack">' +
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
    return '<div class="container breadcrumbs"><a href="index.html">Stack Command Center</a> &rsaquo; <span>' + (sec ? sec.name : "") + "</span></div>";
  }

  function findSection(id) {
    for (var i = 0; i < STACK.sections.length; i++) if (STACK.sections[i].id === id) return STACK.sections[i];
    return null;
  }

  function buildFootNav(sectionId) {
    if (sectionId === "index") return "";
    var idx = -1;
    for (var i = 0; i < STACK.sections.length; i++) if (STACK.sections[i].id === sectionId) idx = i;
    var prev = idx > 0 ? STACK.sections[idx - 1] : null;
    var next = idx >= 0 && idx < STACK.sections.length - 1 ? STACK.sections[idx + 1] : null;
    var html = '<div class="container"><div class="section-foot">';
    html += prev
      ? '<a class="foot-link prev" href="' + prev.file + '"><div class="fl-dir">&larr; Previous</div><div class="fl-name">' + prev.name + "</div></a>"
      : '<a class="foot-link prev" href="index.html"><div class="fl-dir">&larr; Back</div><div class="fl-name">Stack Command Center</div></a>';
    html += next
      ? '<a class="foot-link next" href="' + next.file + '"><div class="fl-dir">Next &rarr;</div><div class="fl-name">' + next.name + "</div></a>"
      : '<a class="foot-link next" href="index.html"><div class="fl-dir">Done &rarr;</div><div class="fl-name">Stack Command Center</div></a>';
    html += "</div>";
    html += '<div class="back-to-top"><button id="back-to-top-btn">&uarr; Back to top</button></div></div>';
    return html;
  }

  function buildAskPanel(sectionId) {
    var sec = findSection(sectionId);
    var scopeLabel = sec ? sec.name : "this section";
    return (
      '<div class="ask-panel">' +
        '<button class="ask-fab" id="ask-fab" aria-label="Ask the stack">?</button>' +
        '<div class="ask-window" id="ask-window">' +
          '<div class="ask-head"><strong>Ask the stack</strong><button class="icon-btn" id="ask-close" aria-label="Close">✕</button></div>' +
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
                '<option value="all">Whole stack</option>' +
              "</select>" +
            "</div>" +
            '<p class="ask-hint">Your key is stored only in this browser’s localStorage. It is never sent anywhere but api.anthropic.com.</p>' +
          "</div>" +
          '<div class="ask-body" id="ask-body"><p class="ask-hint">Ask anything about this tech stack. Search mode works fully offline, no API key needed.</p></div>' +
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

  /* ---------------- figures: inline SVG only, with expand (no CDN, no mermaid/chart libs) ---------------- */
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

  function registerFigure(id, kind, payload) {
    registeredFigures[id] = { kind: kind, payload: payload };
  }

  function renderFigure(id) {
    var fig = registeredFigures[id];
    if (!fig) return;
    if (fig.kind === "svg") document.getElementById(id).innerHTML = fig.payload.svg;
  }

  function reRenderThemedFigures() {
    Object.keys(registeredFigures).forEach(function (id) { renderFigure(id); });
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
    inner.innerHTML = fig.payload.svg;
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

  /* ---------------- flat item list (every recommendation, across all groups) ---------------- */
  function allItems() {
    var out = [];
    STACK.groups.forEach(function (g) {
      g.items.forEach(function (it) { out.push({ item: it, group: g }); });
    });
    return out;
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
    idx.push({ section: sec.name, file: sec.file, title: "Headline", text: STACK.meta.headline });

    sec = findSection("recommendations");
    allItems().forEach(function (pair) {
      var it = pair.item;
      idx.push({ section: sec.name, file: sec.file, title: it.component + " — " + it.tech, text: it.why + " " + (it.caveat || ""), anchor: it.id });
    });

    sec = findSection("fit-analysis");
    allItems().forEach(function (pair) {
      var it = pair.item;
      idx.push({ section: sec.name, file: sec.file, title: it.component + " fit rating", text: it.fit + " — " + (it.caveat || it.why), anchor: "fit-" + it.id });
    });

    sec = findSection("prompts");
    allItems().forEach(function (pair) {
      var it = pair.item;
      idx.push({ section: sec.name, file: sec.file, title: "Prompt: " + it.component, text: it.prompt, anchor: "prompt-" + it.id });
    });

    sec = findSection("learning-path");
    STACK.learningOrder.forEach(function (l) {
      idx.push({ section: sec.name, file: sec.file, title: "Step " + l.order + " — " + l.tech, text: l.reason, anchor: "learn-" + l.order });
    });

    sec = findSection("alternatives");
    STACK.alternatives.forEach(function (a, i) {
      idx.push({ section: sec.name, file: sec.file, title: a.component + " — not " + a.alternative, text: a.whyNot, anchor: "alt-" + i });
    });

    sec = findSection("lockin");
    STACK.lockIn.forEach(function (l, i) {
      idx.push({ section: sec.name, file: sec.file, title: l.tech + " — " + l.level + " lock-in", text: l.reason, anchor: "lock-" + i });
    });

    sec = findSection("appendix");
    STACK.notCovered.forEach(function (n, i) {
      idx.push({ section: sec.name, file: sec.file, title: "Not covered", text: n, anchor: "not-covered" });
    });
    STACK.leastConfident.forEach(function (l, i) {
      idx.push({ section: sec.name, file: sec.file, title: "Least confident: " + l.component, text: l.reason, anchor: "least-confident" });
    });

    STACK.sections.forEach(function (s) {
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
        results.innerHTML = '<div class="search-empty">No matches. Try a different word, or check the Appendix — a gap may itself be the answer.</div>';
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
      case "summary": return { meta: STACK.meta, fitKey: STACK.fitKey };
      case "recommendations": return { groups: STACK.groups };
      case "fit-analysis": return { fitKey: STACK.fitKey, groups: STACK.groups, leastConfident: STACK.leastConfident };
      case "prompts": return { groups: STACK.groups.map(function (g) { return { name: g.name, items: g.items.map(function (i) { return { component: i.component, tech: i.tech, prompt: i.prompt }; }) }; }) };
      case "learning-path": return { learningOrder: STACK.learningOrder };
      case "alternatives": return { alternatives: STACK.alternatives };
      case "lockin": return { lockIn: STACK.lockIn };
      case "appendix": return { notCovered: STACK.notCovered, leastConfident: STACK.leastConfident, topology: STACK.topology };
      default: return STACK;
    }
  }

  function buildSystemPrompt(scope, sectionId) {
    var data = scope === "all" ? STACK : sectionRelevantData(sectionId);
    return "You are answering questions about a recommended technology stack for an AI-powered soccer facility " +
      "booking and utilization platform called Pitch AI. Answer ONLY using the JSON data below — do not use outside " +
      "knowledge. If the answer is not present in the data, say plainly that this document does not cover it. " +
      "Never talk the user out of a 🔴 (\"consider carefully\") fit rating — if asked whether a red-rated choice is " +
      "actually fine, restate the caveat that earned it the red rating instead of softening it. Be concise.\n\n" +
      "STACK DATA:\n" + JSON.stringify(data);
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
          body.innerHTML = '<p class="ask-hint">No matches for that in the stack. Check the <a href="08-appendix.html">Appendix</a> — a gap may itself be the answer.</p>';
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

  /* ---------------- copy-to-clipboard (works on file:// where clipboard API is often blocked) ---------------- */
  function copyText(text, btn) {
    function done(ok) {
      if (!btn) return;
      var original = btn.getAttribute("data-label") || btn.textContent;
      btn.setAttribute("data-label", original);
      btn.textContent = ok ? "Copied ✓" : "Copy failed";
      btn.classList.toggle("copied", ok);
      setTimeout(function () { btn.textContent = original; btn.classList.remove("copied"); }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    done(ok);
  }
  function wireCopyButtons() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-copy]");
      if (!btn) return;
      var targetId = btn.getAttribute("data-copy");
      var src = document.getElementById(targetId);
      if (src) copyText(src.textContent, btn);
    });
  }

  /* ---------------- illustration SVGs (data-driven, theme-aware via CSS vars) ---------------- */
  function svgWrap(w, h, inner) {
    return '<svg viewBox="0 0 ' + w + " " + h + '" xmlns="http://www.w3.org/2000/svg" role="img" style="width:100%;height:auto;font-family:Segoe UI, system-ui, sans-serif;">' + inner + "</svg>";
  }
  function css(varName) { return "var(--" + varName + ")"; }
  function wrapLabel(name, max) { max = max || 20; return name.length > max ? name.slice(0, max - 1) + "…" : name; }

  function fitCounts() {
    var counts = { green: 0, amber: 0, red: 0 };
    allItems().forEach(function (pair) { counts[pair.item.fit]++; });
    return counts;
  }

  /* fit proportional bar, reds called out */
  function illoFitBar(detailed) {
    var counts = fitCounts();
    var total = counts.green + counts.amber + counts.red;
    var w = detailed ? 720 : 280, h = detailed ? 150 : 90;
    var barY = detailed ? 46 : 30, barH = detailed ? 46 : 26;
    var order = [["green", counts.green], ["amber", counts.amber], ["red", counts.red]];
    var s = "";
    var x = 0;
    order.forEach(function (pair) {
      var level = pair[0], count = pair[1];
      if (!count) return;
      var segW = (count / total) * w;
      s += '<rect x="' + x + '" y="' + barY + '" width="' + Math.max(segW, 1) + '" height="' + barH + '" fill="' + css(level) + '"/>';
      if (detailed) s += '<text x="' + (x + segW / 2) + '" y="' + (barY + barH / 2 + 5) + '" text-anchor="middle" font-size="14" fill="' + css(level === "amber" ? "text" : "card") + '" font-weight="700">' + count + "</text>";
      x += segW;
    });
    s = '<rect x="0" y="' + barY + '" width="' + w + '" height="' + barH + '" rx="' + (detailed ? 8 : 5) + '" fill="none" stroke="' + css("border") + '" stroke-width="1"/>' + s;
    if (detailed) {
      s += '<text x="0" y="24" font-size="13" fill="' + css("text") + '" font-weight="700">' + total + " recommendations rated</text>";
      if (counts.red) {
        var redX = ((counts.green + counts.amber) / total) * w;
        var redCenter = redX + ((counts.red / total) * w) / 2;
        var labelY = barY + barH + 34;
        s += '<line x1="' + redCenter + '" y1="' + (barY + barH) + '" x2="' + redCenter + '" y2="' + (labelY - 10) + '" stroke="' + css("red") + '" stroke-width="1.5"/>';
        s += '<text x="' + redCenter + '" y="' + labelY + '" text-anchor="middle" font-size="12" fill="' + css("red") + '" font-weight="700">' + counts.red + " to watch closely ↓</text>";
      }
    }
    return svgWrap(w, detailed ? h : 70, s);
  }

  /* fit bands per group */
  function illoFitBands(detailed) {
    var w = detailed ? 740 : 280;
    var rowH = detailed ? 40 : 15, pad = detailed ? 8 : 3;
    var h = STACK.groups.length * (rowH + pad) + pad;
    var s = "";
    var y = pad;
    STACK.groups.forEach(function (g) {
      var n = g.items.length;
      var chipW = detailed ? (w - 190) / n - 8 : (w - 20) / Math.max(n, 1) - 4;
      var x = detailed ? 180 : 10;
      if (detailed) s += '<text x="0" y="' + (y + rowH / 2 + 4) + '" font-size="11.5" fill="' + css("muted") + '" font-weight="600">' + wrapLabel(g.name, 22) + "</text>";
      g.items.forEach(function (it) {
        s += '<rect x="' + x + '" y="' + y + '" width="' + Math.max(chipW, 6) + '" height="' + rowH + '" rx="' + (detailed ? 8 : 3) + '" fill="' + css(it.fit + "-bg") + '" stroke="' + css(it.fit) + '" stroke-width="1"/>';
        if (detailed) s += '<text x="' + (x + chipW / 2) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="middle" font-size="10" fill="' + css(it.fit) + '" font-weight="600">' + wrapLabel(it.component, 18) + "</text>";
        x += chipW + 8;
      });
      y += rowH + pad;
    });
    return svgWrap(w, h, s);
  }

  /* fit grid — one cell per recommendation, colour = fit */
  function illoFitGrid(detailed) {
    var items = allItems();
    var w = detailed ? 720 : 280;
    var cols = detailed ? 2 : 5;
    var perCol = Math.ceil(items.length / cols);
    var cellH = detailed ? 30 : 18, cellW = w / cols - (detailed ? 8 : 6);
    var h = perCol * (cellH + 4) + 6;
    var s = "";
    items.forEach(function (pair, i) {
      var it = pair.item;
      var col = Math.floor(i / perCol), row = i % perCol;
      var x = col * (cellW + 8) + 3, y = row * (cellH + 4) + 3;
      s += '<rect x="' + x + '" y="' + y + '" width="' + cellW + '" height="' + cellH + '" rx="' + (detailed ? 6 : 3) + '" fill="' + css(it.fit + "-bg") + '" stroke="' + css(it.fit) + '" stroke-width="1"/>';
      if (detailed) s += '<text x="' + (x + 8) + '" y="' + (y + cellH / 2 + 4) + '" font-size="10.5" fill="' + css(it.fit) + '" font-weight="600">' + wrapLabel(it.component, 26) + "</text>";
    });
    return svgWrap(w, h, s);
  }

  /* prompt stack — one card per copy-ready prompt */
  function illoPromptStack(detailed) {
    var items = allItems();
    var w = detailed ? 720 : 280;
    var cardH = detailed ? 26 : 10, gap = detailed ? 6 : 3;
    var h = items.length * (cardH + gap) + gap;
    var s = "";
    items.forEach(function (pair, i) {
      var it = pair.item;
      var y = i * (cardH + gap) + gap;
      var indent = detailed ? (i % 3) * 6 : 0;
      s += '<rect x="' + indent + '" y="' + y + '" width="' + (w - indent - 4) + '" height="' + cardH + '" rx="' + (detailed ? 5 : 2) + '" fill="' + css("card") + '" stroke="' + css("border") + '" stroke-width="1"/>';
      s += '<circle cx="' + (indent + 12) + '" cy="' + (y + cardH / 2) + '" r="3.5" fill="' + css(it.fit) + '"/>';
      if (detailed) s += '<text x="' + (indent + 22) + '" y="' + (y + cardH / 2 + 4) + '" font-size="10.5" fill="' + css("text") + '">' + wrapLabel(it.component + " → " + it.tech, 58) + "</text>";
    });
    return svgWrap(w, h, s);
  }

  /* learning ladder */
  function illoLadder(detailed) {
    var steps = STACK.learningOrder;
    var w = detailed ? 720 : 280;
    var rungH = detailed ? 40 : 15, gap = detailed ? 8 : 3;
    var h = steps.length * (rungH + gap) + gap;
    var s = "";
    var maxW = w - (detailed ? 40 : 20);
    steps.slice().reverse().forEach(function (step, i) {
      var y = i * (rungH + gap) + gap;
      var rungW = maxW * ((steps.length - i) / steps.length) + (detailed ? 40 : 20);
      var isFirst = step.order === 1;
      s += '<rect x="0" y="' + y + '" width="' + rungW + '" height="' + rungH + '" rx="' + (detailed ? 7 : 3) + '" fill="' + (isFirst ? css("accent-bg") : css("card")) + '" stroke="' + (isFirst ? css("accent") : css("border")) + '" stroke-width="1.5"/>';
      if (detailed) {
        s += '<text x="12" y="' + (y + rungH / 2 + 4) + '" font-size="12" fill="' + (isFirst ? css("accent") : css("text")) + '" font-weight="700">' + step.order + ". " + step.tech + "</text>";
      }
    });
    return svgWrap(w, h, s);
  }

  /* compare chosen vs alternative */
  function illoCompare(detailed) {
    var rows = STACK.alternatives;
    var w = detailed ? 740 : 280;
    var rowH = detailed ? 34 : 14, gap = detailed ? 6 : 2;
    var h = rows.length * (rowH + gap) + gap;
    var s = "";
    var midX = w * 0.52;
    rows.forEach(function (r, i) {
      var y = i * (rowH + gap) + gap;
      var chosenW = midX - 6;
      var altW = w - midX - 6;
      s += '<rect x="0" y="' + y + '" width="' + chosenW + '" height="' + rowH + '" rx="' + (detailed ? 6 : 2) + '" fill="' + css("green-bg") + '" stroke="' + css("green") + '" stroke-width="1"/>';
      s += '<rect x="' + (midX + 6) + '" y="' + y + '" width="' + altW + '" height="' + rowH + '" rx="' + (detailed ? 6 : 2) + '" fill="' + css("slate-bg") + '" stroke="' + css("slate") + '" stroke-width="1"/>';
      if (detailed) {
        s += '<text x="8" y="' + (y + rowH / 2 + 4) + '" font-size="10.5" fill="' + css("green") + '" font-weight="700">' + wrapLabel(r.chosen, 30) + "</text>";
        s += '<text x="' + (midX + 14) + '" y="' + (y + rowH / 2 + 4) + '" font-size="10.5" fill="' + css("slate") + '">' + wrapLabel(r.alternative, 26) + "</text>";
      }
    });
    return svgWrap(w, h, s);
  }

  /* lock-in horizontal gauges */
  function illoLockScale(detailed) {
    var rows = STACK.lockIn;
    var w = detailed ? 740 : 280;
    var rowH = detailed ? 34 : 15, gap = detailed ? 8 : 4;
    var h = rows.length * (rowH + gap) + gap;
    var trackX = detailed ? 150 : 8, trackW = w - trackX - (detailed ? 16 : 12);
    var posFor = { low: 0.18, medium: 0.5, high: 0.85 };
    var colorFor = { low: "green", medium: "amber", high: "red" };
    var s = "";
    rows.forEach(function (r, i) {
      var y = i * (rowH + gap) + gap + rowH / 2;
      if (detailed) s += '<text x="0" y="' + (y + 4) + '" font-size="10.5" fill="' + css("muted") + '" font-weight="600">' + wrapLabel(r.tech, 20) + "</text>";
      s += '<line x1="' + trackX + '" y1="' + y + '" x2="' + (trackX + trackW) + '" y2="' + y + '" stroke="' + css("border") + '" stroke-width="3" stroke-linecap="round"/>';
      var cx = trackX + trackW * posFor[r.level];
      var r2 = detailed ? 8 : 4;
      s += '<circle cx="' + cx + '" cy="' + y + '" r="' + r2 + '" fill="' + css(colorFor[r.level]) + '"/>';
      if (detailed) s += '<text x="' + (trackX + trackW + 8) + '" y="' + (y + 4) + '" font-size="10" fill="' + css(colorFor[r.level]) + '" font-weight="700">' + r.level.toUpperCase() + "</text>";
    });
    return svgWrap(w, h, s);
  }

  /* topology — what runs on your machine vs somebody else's */
  function illoTopology(detailed) {
    var w = detailed ? 740 : 280, h = detailed ? 300 : 130;
    var yoursItems = STACK.topology.yours;
    var managedItems = STACK.topology.managed;
    function labelFor(id) {
      var found = null;
      allItems().forEach(function (pair) { if (pair.item.id === id) found = pair.item; });
      return found ? found.component : id;
    }
    var s = "";
    var zoneY = detailed ? 40 : 14, zoneH = detailed ? 200 : 70;
    var yourW = w * 0.58, manX = yourW + (detailed ? 20 : 10), manW = w - yourW - (detailed ? 20 : 10);
    s += '<rect x="0" y="' + zoneY + '" width="' + yourW + '" height="' + zoneH + '" rx="' + (detailed ? 10 : 5) + '" fill="' + css("accent-bg") + '" stroke="' + css("accent") + '" stroke-width="1.5" stroke-dasharray="5,4"/>';
    s += '<rect x="' + manX + '" y="' + zoneY + '" width="' + manW + '" height="' + zoneH + '" rx="' + (detailed ? 10 : 5) + '" fill="' + css("slate-bg") + '" stroke="' + css("slate") + '" stroke-width="1.5" stroke-dasharray="5,4"/>';
    if (detailed) {
      s += '<text x="10" y="' + (zoneY - 12) + '" font-size="12.5" fill="' + css("accent") + '" font-weight="700">You operate this (Render)</text>';
      s += '<text x="' + (manX + 10) + '" y="' + (zoneY - 12) + '" font-size="12.5" fill="' + css("slate") + '" font-weight="700">Somebody else runs this</text>';
      var chipH = 26, chipGap = 8, perRow = 2, chipW = (yourW - 30) / perRow;
      yoursItems.forEach(function (id, i) {
        var col = i % perRow, row = Math.floor(i / perRow);
        var x = 10 + col * (chipW + chipGap), y = zoneY + 14 + row * (chipH + chipGap);
        s += '<rect x="' + x + '" y="' + y + '" width="' + chipW + '" height="' + chipH + '" rx="6" fill="' + css("card") + '" stroke="' + css("accent") + '" stroke-width="1"/>';
        s += '<text x="' + (x + chipW / 2) + '" y="' + (y + chipH / 2 + 4) + '" text-anchor="middle" font-size="9.5" fill="' + css("text") + '">' + wrapLabel(labelFor(id), 20) + "</text>";
      });
      var mChipW = manW - 20;
      managedItems.forEach(function (id, i) {
        var y = zoneY + 14 + i * (chipH + chipGap);
        var x = manX + 10;
        s += '<rect x="' + x + '" y="' + y + '" width="' + mChipW + '" height="' + chipH + '" rx="6" fill="' + css("card") + '" stroke="' + css("slate") + '" stroke-width="1"/>';
        s += '<text x="' + (x + mChipW / 2) + '" y="' + (y + chipH / 2 + 4) + '" text-anchor="middle" font-size="9.5" fill="' + css("text") + '">' + wrapLabel(labelFor(id), 22) + "</text>";
      });
    } else {
      s += '<text x="' + (yourW / 2) + '" y="' + (zoneY + zoneH / 2 + 4) + '" text-anchor="middle" font-size="10" fill="' + css("accent") + '" font-weight="700">' + yoursItems.length + " yours</text>";
      s += '<text x="' + (manX + manW / 2) + '" y="' + (zoneY + zoneH / 2 + 4) + '" text-anchor="middle" font-size="10" fill="' + css("slate") + '" font-weight="700">' + managedItems.length + " managed</text>";
    }
    return svgWrap(w, h, s);
  }

  var illustrations = {
    summary: illoFitBar,
    recommendations: illoFitBands,
    "fit-analysis": illoFitGrid,
    prompts: illoPromptStack,
    "learning-path": illoLadder,
    alternatives: illoCompare,
    lockin: illoLockScale,
    appendix: illoTopology
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
    var counts = fitCounts();
    switch (sectionId) {
      case "summary": return (counts.green + counts.amber + counts.red) + " recommendations";
      case "recommendations": return STACK.groups.length + " groups";
      case "fit-analysis": return counts.red + " to watch";
      case "prompts": return allItems().length + " prompts";
      case "learning-path": return STACK.learningOrder.length + " steps";
      case "alternatives": return STACK.alternatives.length + " compared";
      case "lockin": return STACK.lockIn.filter(function (l) { return l.level === "high"; }).length + " hard to undo";
      case "appendix": return STACK.notCovered.length + " gaps noted";
      default: return "";
    }
  }

  function renderCommandCenter() {
    var grid = document.getElementById("tiles-grid");
    if (!grid) return;
    grid.innerHTML = STACK.sections.map(function (s) {
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
    wireCopyButtons();
  }

  return {
    mount: mount,
    figureShell: figureShell,
    registerFigure: registerFigure,
    renderFigure: renderFigure,
    renderInterp: renderInterp,
    fullIllustration: fullIllustration,
    tileSvg: tileSvg,
    escapeHtml: escapeHtml,
    allItems: allItems,
    fitCounts: fitCounts
  };
})();
