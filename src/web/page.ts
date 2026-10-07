import { copy } from "../copy/strings.ts";

export function renderPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(copy.ui.title)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #1c1917;
      --muted: #57534e;
      --line: #e7e5e4;
      --paper: #fafaf9;
      --card: #ffffff;
      --accent: #0f766e;
      --accent-ink: #ffffff;
      --warn: #9a3412;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font: 16px/1.45 "Segoe UI", system-ui, sans-serif;
      color: var(--ink);
      background: var(--paper);
    }
    main {
      max-width: 860px;
      margin: 0 auto;
      padding: 28px 20px 64px;
    }
    h1 { font-size: 1.4rem; font-weight: 650; margin: 0 0 6px; }
    .sub, .meta, .empty, footer { color: var(--muted); }
    header { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; align-items: flex-start; }
    button {
      font: inherit;
      border: 1px solid var(--line);
      background: var(--card);
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
    }
    button.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
    button.warn { color: var(--warn); }
    button:disabled { opacity: 0.6; cursor: wait; }
    .status { margin: 18px 0; padding: 12px 14px; background: var(--card); border: 1px solid var(--line); border-radius: 10px; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 10px; }
    select { font: inherit; padding: 8px; border-radius: 8px; border: 1px solid var(--line); min-width: 220px; }
    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 16px;
      margin: 12px 0;
    }
    .route { font-weight: 650; margin-bottom: 4px; }
    pre {
      white-space: pre-wrap;
      background: #f5f5f4;
      padding: 12px;
      border-radius: 8px;
      font: 14px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    img.qr { width: 220px; height: 220px; background: #fff; border: 1px solid var(--line); border-radius: 8px; }
    footer { margin-top: 32px; font-size: 0.9rem; }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>${escapeHtml(copy.ui.title)}</h1>
        <p class="sub">${escapeHtml(copy.ui.subtitle)}</p>
      </div>
      <button id="search" class="primary">${escapeHtml(copy.ui.searchNow)}</button>
    </header>
    <section class="status" id="status"></section>
    <section>
      <h2>${escapeHtml(copy.ui.pending)}</h2>
      <div id="pending"></div>
    </section>
    <section>
      <h2>${escapeHtml(copy.ui.recent)}</h2>
      <div id="recent"></div>
    </section>
    <footer>${escapeHtml(copy.ui.footer)}</footer>
  </main>
  <script>
    const ui = ${JSON.stringify(copy.ui)};
    const errors = ${JSON.stringify(copy.errors)};

    async function load() {
      const state = await (await fetch("/api/state")).json();
      renderStatus(state);
      renderPending(state.pending);
      renderRecent(state.recent);
    }

    function renderStatus(state) {
      const el = document.getElementById("status");
      const wa = state.whatsapp;
      let html = "<div>" + escapeHtml(fill(ui.postedToday, { count: state.postedToday, max: state.maxPosts })) + "</div>";
      if (!wa.enabled) html += "<p>" + escapeHtml(ui.waOff) + "</p>";
      else if (!wa.connected && wa.qrReady) {
        html += "<p>" + escapeHtml(ui.waWait) + "</p>";
        html += '<img class="qr" src="/qr.png?t=' + Date.now() + '" alt="QR WhatsApp" />';
      } else if (wa.connected) {
        html += "<p>" + escapeHtml(fill(ui.waOk, { name: wa.userName || "ok" })) + "</p>";
      }
      html += '<div class="row"><label>' + escapeHtml(ui.group) + '</label>';
      html += '<select id="group">';
      const groups = state.groups.length ? state.groups : [{ jid: "", name: ui.groupHelp }];
      for (const g of groups) {
        const selected = g.jid === state.groupJid ? " selected" : "";
        html += "<option value=\\"" + escapeAttr(g.jid) + "\\"" + selected + ">" + escapeHtml(g.name) + "</option>";
      }
      html += "</select><button id=\\"save-group\\">" + escapeHtml(ui.saveGroup) + "</button></div>";
      el.innerHTML = html;
      document.getElementById("save-group").onclick = saveGroup;
    }

    function renderPending(items) {
      const el = document.getElementById("pending");
      if (!items.length) {
        el.innerHTML = '<p class="empty">' + escapeHtml(ui.empty) + "</p>";
        return;
      }
      el.innerHTML = items.map((item) => {
        const o = item.offer;
        return '<article class="card" data-id="' + escapeAttr(o.id) + '">' +
          '<div class="route">' + escapeHtml(o.origin.code + " → " + o.destination.city) +
          " · " + escapeHtml(o.departDate) + " a " + escapeHtml(o.returnDate) +
          " · R$ " + o.priceBRL + "</div>" +
          "<div class=\\"meta\\">" + escapeHtml(ui.preview) + "</div>" +
          "<pre>" + escapeHtml(item.message) + "</pre>" +
          '<div class="row">' +
          '<button class="primary" data-act="approve">' + escapeHtml(ui.approve) + "</button>" +
          '<button class="warn" data-act="skip">' + escapeHtml(ui.skip) + "</button>" +
          "</div></article>";
      }).join("");
      el.querySelectorAll("button").forEach((btn) => {
        btn.onclick = () => act(btn.closest("[data-id]").dataset.id, btn.dataset.act);
      });
    }

    function renderRecent(items) {
      const el = document.getElementById("recent");
      if (!items.length) {
        el.innerHTML = '<p class="empty">' + escapeHtml(ui.noRecent) + "</p>";
        return;
      }
      el.innerHTML = items.map((o) =>
        '<div class="card">' + escapeHtml(o.origin.code + " → " + o.destination.city) +
        " · R$ " + o.priceBRL + "</div>"
      ).join("");
    }

    async function act(id, kind) {
      const path = kind === "approve" ? "/api/offers/" + id + "/approve" : "/api/offers/" + id + "/reject";
      const res = await fetch(path, { method: "POST" });
      const body = await res.json();
      if (!res.ok) alert(body.message || errors.sendFailed);
      await load();
    }

    async function saveGroup() {
      const jid = document.getElementById("group").value;
      const name = document.getElementById("group").selectedOptions[0]?.text || "";
      await fetch("/api/group", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jid, name }),
      });
      await load();
    }

    document.getElementById("search").onclick = async () => {
      const btn = document.getElementById("search");
      btn.disabled = true;
      btn.textContent = ui.searching;
      try {
        const res = await fetch("/api/search-now", { method: "POST" });
        const body = await res.json();
        if (!res.ok) alert(body.message || errors.searchFailed);
      } finally {
        btn.disabled = false;
        btn.textContent = ui.searchNow;
        await load();
      }
    };

    function fill(template, vars) {
      return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
    }
    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }
    function escapeAttr(value) { return escapeHtml(value); }

    load();
    setInterval(load, 4000);
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
