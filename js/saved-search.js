// Wiederverwendbares "Suche speichern"-Widget (lokal, ohne Login).
// Nutzung:  AbanSaved({ key:"abanSaved_inserate", mount:"#savedbar", labelFn:function(){return "…"} });
// Voraussetzung: die Seite hält ihren Filter-Zustand in location.search (URL) aktuell.
(function () {
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function injectCss() {
    if (document.getElementById("aban-saved-css")) return;
    var st = document.createElement("style"); st.id = "aban-saved-css";
    st.textContent = ".aban-saved{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}"
      + ".as-save{background:#fff;border:1.5px solid #b45309;color:#b45309;border-radius:20px;padding:8px 15px;font-weight:800;font-size:.85rem;cursor:pointer;font-family:inherit}"
      + ".as-save:hover{background:#fef3c7}"
      + ".as-lbl{font-size:.8rem;color:#6b7280}"
      + ".as-chip{display:inline-flex;align-items:center;background:#fff;border:1px solid #e6e1d6;border-radius:18px;overflow:hidden}"
      + ".as-go{padding:6px 11px;font-weight:700;font-size:.82rem;color:#374151;text-decoration:none}.as-go:hover{color:#b45309}"
      + ".as-del{background:none;border:0;border-left:1px solid #e6e1d6;padding:6px 9px;color:#6b7280;cursor:pointer;font-weight:800;font-family:inherit}.as-del:hover{color:#b45309}";
    document.head.appendChild(st);
  }
  window.AbanSaved = function (cfg) {
    var mount = typeof cfg.mount === "string" ? document.querySelector(cfg.mount) : cfg.mount;
    if (!mount) return;
    injectCss();
    var bar = document.createElement("div"); bar.className = "aban-saved";
    var saveBtn = document.createElement("button"); saveBtn.type = "button"; saveBtn.className = "as-save"; saveBtn.textContent = "★ Suche speichern";
    var list = document.createElement("span"); list.className = "as-list"; list.style.display = "inline-flex"; list.style.flexWrap = "wrap"; list.style.gap = "8px"; list.style.alignItems = "center";
    bar.appendChild(saveBtn); bar.appendChild(list); mount.appendChild(bar);
    function get() { try { return JSON.parse(localStorage.getItem(cfg.key) || "[]"); } catch (e) { return []; } }
    function set(a) { try { localStorage.setItem(cfg.key, JSON.stringify(a.slice(0, 12))); } catch (e) { } }
    function render() {
      var a = get();
      list.innerHTML = a.length ? ('<span class="as-lbl">★ Gespeichert:</span>' + a.map(function (s, i) {
        return '<span class="as-chip"><a class="as-go" href="' + esc(s.url) + '">🔎 ' + esc(s.label) + '</a><button class="as-del" data-i="' + i + '" type="button" aria-label="Entfernen">×</button></span>';
      }).join("")) : "";
    }
    saveBtn.addEventListener("click", function () {
      var url = location.pathname + location.search;
      var label = (cfg.labelFn && cfg.labelFn()) || document.title.replace(/\s*[—|].*$/, "") || "Suche";
      var a = get().filter(function (x) { return x.url !== url; });
      a.unshift({ label: label.slice(0, 60), url: url });
      set(a); render();
      saveBtn.textContent = "✓ Gespeichert"; setTimeout(function () { saveBtn.textContent = "★ Suche speichern"; }, 1400);
    });
    list.addEventListener("click", function (e) {
      var d = e.target.closest(".as-del"); if (d) { e.preventDefault(); var a = get(); a.splice(+d.dataset.i, 1); set(a); render(); }
    });
    render();
  };
})();
