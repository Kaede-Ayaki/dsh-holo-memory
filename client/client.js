(() => {
  try {
    /* dsh-holo-memory client half — Settings → 全息记忆 console.
       Data: /holo-memory/stats, /list, /injections, /config; writes: /delete, /config, /test-embedding.
       Pure in-DSH React + CSS variables; no external HTML, images or network assets. */
    window.__ModuleLoader__.load({
      id: "dsh-holo-memory",
      factory: (require) => {
        var module = { exports: {} };
        var exports = module.exports;
        Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

        var react = require("react");
        var h = react.createElement;
        var inject = ["slots"];

        var STYLE_ID = "dsh-holo-memory-style";
        var CSS = [
          ".hm-pane{--hm-cyan:#22d3ee;--hm-blue:#5b7cfa;--hm-violet:#a78bfa;--hm-green:#4ade80;--hm-amber:#f5b84c;--hm-red:#f87171;--hm-surface:var(--dsw-alias-bg-layer-2,#0f182b);--hm-surface2:var(--dsw-alias-bg-layer-3,#142039);--hm-border:var(--dsw-alias-border-l3,#263450);--hm-text:var(--dsw-alias-label-primary,#e8eeff);--hm-sub:var(--dsw-alias-label-secondary,#a8b4cf);--hm-faint:var(--dsw-alias-label-tertiary,#8996b3);--hm-brand:var(--dsw-alias-brand-primary,#5b7cfa);width:100%;height:100%;overflow:auto;padding:24px clamp(20px,4vw,44px) 42px;color:var(--hm-text);box-sizing:border-box;font-size:12px}",
          "html[data-platform='darwin'] .hm-pane{padding-top:calc(24px + var(--dsh-frame-top-clearance,0px))}",
          ".hm-shell{width:100%;max-width:1040px;margin:0 auto;display:flex;flex-direction:column;gap:14px}",
          ".hm-pane *{box-sizing:border-box}",
          ".hm-pane button{font-family:inherit}",
          "@keyframes hm-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}",
          ".hm-shell>*{animation:hm-in .36s cubic-bezier(.22,.8,.3,1) both}",
          ".hm-shell>*:nth-child(2){animation-delay:.04s}.hm-shell>*:nth-child(3){animation-delay:.08s}.hm-shell>*:nth-child(4){animation-delay:.12s}",
          "@media (prefers-reduced-motion:reduce){.hm-shell>*{animation:none}}",
          /* hero */
          ".hm-hero{position:relative;overflow:hidden;display:flex;align-items:flex-end;justify-content:space-between;gap:22px;padding:20px 22px 18px;border:.5px solid var(--hm-border);border-radius:16px;background:linear-gradient(135deg,rgba(91,124,250,.16),rgba(167,139,250,.07) 48%,transparent 78%),var(--hm-surface)}",
          ".hm-hero:before{content:'';position:absolute;right:-90px;top:-150px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(91,124,250,.34),transparent 68%);pointer-events:none}",
          ".hm-hero:after{content:'';position:absolute;right:120px;bottom:-160px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(34,211,238,.13),transparent 70%);pointer-events:none}",
          ".hm-hero-copy{position:relative;z-index:1;min-width:0}",
          ".hm-kicker{display:flex;align-items:center;gap:7px;font-size:9.5px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--hm-cyan)}",
          ".hm-kicker:before{content:'';width:16px;height:1px;background:var(--hm-cyan);opacity:.8}",
          ".hm-hero h2{margin:7px 0 3px;font-size:23px;line-height:31px;font-weight:650;letter-spacing:-.01em}",
          ".hm-hero p{margin:0;font-size:11.5px;line-height:18px;color:var(--hm-sub)}",
          ".hm-hero-side{position:relative;z-index:1;display:flex;flex-direction:column;align-items:flex-end;gap:9px;flex:0 0 auto}",
          ".hm-total-box{text-align:right;line-height:1}",
          ".hm-total-number{font-size:32px;line-height:32px;font-weight:650;letter-spacing:-.02em;font-variant-numeric:tabular-nums;background:linear-gradient(120deg,var(--hm-text),var(--hm-blue));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}",
          ".hm-total-label{margin-top:5px;font-size:9.5px;letter-spacing:.12em;color:var(--hm-faint);text-transform:uppercase}",
          ".hm-icon-btn{width:30px;height:30px;display:grid;place-items:center;padding:0;border:.5px solid var(--hm-border);border-radius:9px;background:rgba(255,255,255,.025);color:var(--hm-sub);cursor:pointer;transition:background .15s,border-color .15s,color .15s}",
          ".hm-icon-btn:hover{color:var(--hm-text);border-color:var(--hm-brand);background:rgba(91,124,250,.1)}",
          ".hm-icon-btn:disabled{opacity:.4;cursor:default}",
          ".hm-spin{animation:hm-rotate .9s linear infinite}",
          "@keyframes hm-rotate{to{transform:rotate(360deg)}}",
          /* metrics */
          ".hm-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}",
          ".hm-metric{display:flex;align-items:flex-start;gap:9px;padding:11px 12px;border:.5px solid var(--hm-border);border-radius:12px;background:var(--hm-surface);transition:border-color .15s,transform .15s}",
          ".hm-metric:hover{border-color:rgba(91,124,250,.55);transform:translateY(-1px)}",
          ".hm-metric-icon{width:27px;height:27px;flex:0 0 auto;display:grid;place-items:center;border-radius:8px;background:var(--hm-tone-bg,rgba(91,124,250,.12));color:var(--hm-tone,var(--hm-blue))}",
          ".hm-metric-value{font-size:21px;line-height:25px;font-weight:650;font-variant-numeric:tabular-nums;letter-spacing:-.01em}",
          ".hm-metric-label{font-size:9.5px;line-height:14px;color:var(--hm-faint);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
          /* layout */
          ".hm-columns{display:grid;grid-template-columns:minmax(0,1.58fr) minmax(280px,1fr);gap:13px;align-items:start}",
          ".hm-col-main,.hm-col-side{display:flex;flex-direction:column;gap:13px;min-width:0}",
          ".hm-panel{border:.5px solid var(--hm-border);border-radius:14px;background:var(--hm-surface);overflow:hidden}",
          ".hm-panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 15px 10px}",
          ".hm-panel-title{display:flex;align-items:center;gap:8px;font-size:12.5px;line-height:18px;font-weight:600;min-width:0}",
          ".hm-panel-title svg{color:var(--hm-brand);flex:0 0 auto}",
          ".hm-panel-meta{font-size:10px;line-height:15px;color:var(--hm-faint);white-space:nowrap}",
          ".hm-panel-body{padding:0 15px 14px}",
          ".hm-sep{height:.5px;background:var(--hm-border);opacity:.7}",
          /* status panel */
          ".hm-status-list{display:flex;flex-direction:column;gap:9px}",
          ".hm-status-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;font-size:10.5px;line-height:16px}",
          ".hm-status-label{display:flex;align-items:center;gap:6px;color:var(--hm-faint);flex:0 0 auto}",
          ".hm-status-label svg{opacity:.8}",
          ".hm-status-value{text-align:right;color:var(--hm-sub);min-width:0;word-break:break-all}",
          ".hm-status-value b{color:var(--hm-text);font-weight:600}",
          ".hm-dot{width:6px;height:6px;border-radius:50%;flex:0 0 auto;background:var(--hm-green);box-shadow:0 0 0 3px rgba(74,222,128,.12)}",
          ".hm-dot.hm-off{background:var(--hm-faint);box-shadow:none}",
          ".hm-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9.5px;line-height:14px;color:var(--hm-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-block;max-width:100%;vertical-align:bottom}",
          ".hm-mini-btn{padding:1px 6px;border:.5px solid var(--hm-border);border-radius:5px;background:transparent;color:var(--hm-faint);font-size:9px;line-height:14px;cursor:pointer}",
          ".hm-mini-btn:hover{color:var(--hm-text);border-color:var(--hm-brand)}",
          ".hm-meter{height:4px;border-radius:99px;background:rgba(255,255,255,.06);overflow:hidden;margin-top:7px}",
          ".hm-meter>span{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--hm-blue),var(--hm-cyan))}",
          /* config */
          ".hm-config-current{display:flex;align-items:center;gap:6px;font-size:9.5px;color:var(--hm-faint)}",
          ".hm-config-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:9px}",
          ".hm-field{display:flex;flex-direction:column;gap:5px;font-size:10px;line-height:14px;color:var(--hm-faint);min-width:0}",
          ".hm-field-full{grid-column:1/-1}",
          ".hm-input{width:100%;height:31px;padding:0 9px;border:.5px solid var(--hm-border);border-radius:7px;background:var(--dsw-alias-bg-layer-1,#0b1222);color:var(--hm-text);font-size:11px;line-height:31px;outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit}",
          ".hm-input:hover{border-color:rgba(91,124,250,.5)}",
          ".hm-input:focus{border-color:var(--hm-brand);box-shadow:0 0 0 2px rgba(91,124,250,.16)}",
          ".hm-input::placeholder{color:var(--hm-faint);opacity:.65}",
          ".hm-config-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:11px}",
          ".hm-inline{display:flex;align-items:center;gap:5px;font-size:9.5px;line-height:14px;color:var(--hm-faint)}",
          ".hm-input-sm{width:64px;height:29px;padding:0 7px;line-height:29px;flex:0 0 auto}",
          ".hm-hero-refresh{display:inline-flex;align-items:center;gap:5px;height:27px;line-height:25px;background:rgba(255,255,255,.03)}",
          ".hm-btn{height:29px;padding:0 12px;border:.5px solid var(--hm-border);border-radius:7px;background:transparent;color:var(--hm-sub);font-size:10.5px;line-height:27px;cursor:pointer;transition:all .15s;white-space:nowrap}",
          ".hm-btn:hover:not(:disabled){color:var(--hm-text);border-color:rgba(91,124,250,.7);background:rgba(91,124,250,.08)}",
          ".hm-btn:disabled{opacity:.45;cursor:default}",
          ".hm-btn-primary{border-color:transparent;background:linear-gradient(135deg,var(--hm-brand),#7c8ffc);color:#fff;box-shadow:0 2px 10px rgba(91,124,250,.22)}",
          ".hm-btn-primary:hover:not(:disabled){background:linear-gradient(135deg,#6d86fb,#8b9bff);color:#fff}",
          ".hm-status{font-size:10px;line-height:16px;min-height:16px}",
          ".hm-status-ok{color:var(--hm-green)}.hm-status-warn{color:var(--hm-amber)}.hm-status-err{color:var(--hm-red)}.hm-status-work{color:var(--hm-faint)}",
          ".hm-config-note{margin:9px 0 0;font-size:9.5px;line-height:15px;color:var(--hm-faint)}",
          /* memory list */
          ".hm-toolbar{display:flex;align-items:center;gap:8px;justify-content:space-between;flex-wrap:wrap;margin-bottom:10px}",
          ".hm-search{position:relative;flex:1 1 200px;min-width:150px}",
          ".hm-search svg{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--hm-faint);pointer-events:none}",
          ".hm-search input{width:100%;height:31px;padding:0 9px 0 30px;border:.5px solid var(--hm-border);border-radius:7px;background:var(--dsw-alias-bg-layer-1,#0b1222);color:var(--hm-text);font-size:11px;outline:none;font-family:inherit}",
          ".hm-search input:focus{border-color:var(--hm-brand);box-shadow:0 0 0 2px rgba(91,124,250,.14)}",
          ".hm-search input::placeholder{color:var(--hm-faint);opacity:.65}",
          ".hm-tabs{display:flex;gap:4px;flex-wrap:wrap}",
          ".hm-tab{height:25px;padding:0 9px;border:.5px solid transparent;border-radius:99px;background:transparent;color:var(--hm-faint);font-size:10px;line-height:23px;cursor:pointer;transition:all .15s}",
          ".hm-tab:hover{color:var(--hm-text);background:rgba(255,255,255,.04)}",
          ".hm-tab-on{background:rgba(91,124,250,.16);border-color:rgba(91,124,250,.38);color:var(--hm-text)}",
          ".hm-list{display:flex;flex-direction:column;gap:7px}",
          ".hm-item{position:relative;padding:10px 12px 9px 14px;border:.5px solid var(--hm-border);border-radius:10px;background:var(--dsw-alias-bg-layer-1,rgba(11,18,34,.55));transition:border-color .15s,background .15s,transform .15s}",
          ".hm-item:before{content:'';position:absolute;left:0;top:10px;bottom:10px;width:2.5px;border-radius:9px;background:var(--hm-layer,var(--hm-blue))}",
          ".hm-item:hover{border-color:rgba(91,124,250,.48);background:var(--hm-surface2);transform:translateY(-1px)}",
          ".hm-item-head{display:flex;align-items:center;gap:7px;min-width:0}",
          ".hm-badge{flex:0 0 auto;display:inline-flex;align-items:center;gap:4px;padding:1px 6px;border-radius:5px;background:var(--hm-layer-bg,rgba(91,124,250,.14));color:var(--hm-layer,var(--hm-blue));font-size:9px;line-height:15px;font-weight:650;letter-spacing:.03em}",
          ".hm-badge:before{content:'';width:4px;height:4px;border-radius:50%;background:currentColor}",
          ".hm-item-title{flex:1 1 auto;min-width:0;font-size:11.5px;line-height:17px;font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
          ".hm-item-time{flex:0 0 auto;font-size:9px;line-height:15px;color:var(--hm-faint);font-variant-numeric:tabular-nums}",
          ".hm-del{flex:0 0 auto;width:22px;height:22px;display:grid;place-items:center;padding:0;border:0;border-radius:5px;background:transparent;color:var(--hm-faint);cursor:pointer;opacity:0;transition:opacity .15s,background .15s,color .15s}",
          ".hm-item:hover .hm-del{opacity:1}",
          ".hm-del:hover{background:rgba(248,113,113,.14);color:var(--hm-red)}",
          ".hm-item-sub{display:flex;flex-wrap:wrap;align-items:center;gap:3px 7px;margin-top:4px;font-size:9px;line-height:14px;color:var(--hm-faint)}",
          ".hm-item-sub b{color:var(--hm-sub);font-weight:500}",
          ".hm-scope{padding:0 5px;border-radius:4px;background:rgba(255,255,255,.045);color:var(--hm-faint);font-size:8.5px;line-height:14px}",
          ".hm-item-text{margin-top:5px;font-size:11px;line-height:18px;color:var(--hm-sub);white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}",
          ".hm-item-text.hm-open{display:block;-webkit-line-clamp:unset;max-height:280px;overflow:auto}",
          ".hm-more{margin-top:3px;padding:0;border:0;background:transparent;color:var(--hm-brand);font-size:9.5px;line-height:16px;cursor:pointer}",
          ".hm-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}",
          ".hm-tag{padding:1px 6px;border-radius:4px;background:rgba(255,255,255,.04);color:var(--hm-faint);font-size:8.5px;line-height:14px}",
          ".hm-empty{display:flex;flex-direction:column;align-items:center;gap:7px;padding:28px 16px;border:.5px dashed var(--hm-border);border-radius:10px;color:var(--hm-faint);font-size:10.5px;line-height:17px;text-align:center}",
          ".hm-empty svg{opacity:.45}",
          /* audit */
          ".hm-timeline{display:flex;flex-direction:column;position:relative}",
          ".hm-timeline:before{content:'';position:absolute;left:4px;top:8px;bottom:8px;width:.5px;background:var(--hm-border)}",
          ".hm-audit{position:relative;display:flex;gap:10px;padding:5px 0 7px 15px}",
          ".hm-audit:before{content:'';position:absolute;left:1px;top:10px;width:7px;height:7px;border-radius:50%;background:var(--hm-cyan);box-shadow:0 0 0 3px rgba(34,211,238,.1)}",
          ".hm-audit-body{min-width:0;flex:1}",
          ".hm-audit-top{display:flex;align-items:center;gap:6px;font-size:9px;line-height:14px;color:var(--hm-faint)}",
          ".hm-audit-session{font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--hm-sub)}",
          ".hm-audit-query{margin-top:1px;font-size:10px;line-height:15px;color:var(--hm-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
          ".hm-audit-meta{margin-top:2px;font-size:8.5px;line-height:13px;color:var(--hm-faint);font-variant-numeric:tabular-nums}",
          ".hm-link{display:inline-block;margin-top:8px;padding:0;border:0;background:transparent;color:var(--hm-brand);font-size:9.5px;line-height:15px;cursor:pointer}",
          /* responsive */
          "@media (max-width:880px){.hm-columns{grid-template-columns:minmax(0,1fr)}.hm-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.hm-hero{align-items:flex-start}.hm-total-box{text-align:left}}",
          "@media (max-width:520px){.hm-config-grid{grid-template-columns:minmax(0,1fr)}.hm-hero{padding:16px}.hm-hero h2{font-size:20px}.hm-hero-side{align-items:flex-start;gap:8px}}",
        ].join("");

        function ensureStyleSheet() {
          if (typeof document === "undefined") return;
          if (document.getElementById(STYLE_ID)) return;
          var el = document.createElement("style");
          el.id = STYLE_ID;
          el.textContent = CSS;
          document.head.appendChild(el);
        }

        var ICONS = {
          layers: ["M12 3 2 8l10 5 10-5-10-5Z", "m2 12 10 5 10-5", "m2 16 10 5 10-5"],
          chat: ["M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"],
          database: ["M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3Z", "M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6", "M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"],
          sparkles: ["m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z", "M19 15v4", "M17 17h4"],
          cpu: ["M7 7h10v10H7z", "M9 3v4", "M15 3v4", "M9 17v4", "M15 17v4", "M3 9h4", "M17 9h4", "M3 15h4", "M17 15h4"],
          key: ["M15 6a4 4 0 1 1-3.5 5.9L7 16.4V19H4v-3l4.6-4.6A4 4 0 0 1 15 6Z", "M16.5 8.5h.01"],
          globe: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M3.6 9h16.8", "M3.6 15h16.8", "M12 3c2.4 2.4 3.6 5.4 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.4-3.6-9S9.6 5.4 12 3Z"],
          refresh: ["M20 6v5h-5", "M4 18v-5h5", "M6.1 9a7 7 0 0 1 11.6-2.7L20 11", "M4 13l2.3 4.7A7 7 0 0 0 17.9 15"],
          trash: ["M4 7h16", "M9 7V5h6v2", "M6 7l1 13h10l1-13", "M10 11v5", "M14 11v5"],
          check: ["m5 12 4 4L19 6"],
          alert: ["M12 3 2.8 20h18.4L12 3Z", "M12 9v5", "M12 17h.01"],
          search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "m21 21-4.3-4.3"],
          clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7v5l3 2"],
          shield: ["M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z", "m9 12 2 2 4-4"],
          activity: ["M3 12h4l2.5-6 4 12 2.5-6H21"],
          box: ["M21 8 12 3 3 8v8l9 5 9-5V8Z", "m3 8 9 5 9-5", "M12 13v8"],
        };

        function icon(name, size) {
          var paths = ICONS[name] || ICONS.layers;
          return h(
            "svg",
            {
              width: size || 14,
              height: size || 14,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: 1.7,
              strokeLinecap: "round",
              strokeLinejoin: "round",
              "aria-hidden": "true",
            },
            paths.map(function (d, index) { return h("path", { key: index, d: d }); }),
          );
        }

        function fetchJson(path, options) {
          return fetch(path, Object.assign({ credentials: "same-origin", headers: { accept: "application/json" } }, options || {}))
            .then(function (response) {
              return response.json().catch(function () { return { ok: false, error: "HTTP " + response.status }; }).then(function (data) {
                if (!response.ok || !data || data.ok !== true) {
                  throw new Error((data && data.error) || ("HTTP " + response.status));
                }
                return data;
              });
            });
        }

        function shortId(id) { return String(id || "").slice(-8); }

        function formatTime(ts) {
          if (!ts) return "";
          var d = new Date(ts);
          var p = function (v) { return String(v).padStart(2, "0"); };
          return p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
        }

        var LAYERS = {
          l1: { label: "L1", name: "对话", color: "#22d3ee", bg: "rgba(34,211,238,.13)" },
          l2: { label: "L2", name: "事实", color: "#5b7cfa", bg: "rgba(91,124,250,.14)" },
          l3: { label: "L3", name: "全息", color: "#a78bfa", bg: "rgba(167,139,250,.14)" },
        };

        function RecordItem(props) {
          var record = props.record;
          var expandedState = react.useState(false);
          var expanded = expandedState[0];
          var setExpanded = expandedState[1];
          var meta = LAYERS[record.layer] || LAYERS.l2;
          var text = record.text || "";
          var tags = record.tags || record.themes || [];
          var style = { "--hm-layer": meta.color, "--hm-layer-bg": meta.bg };
          return h(
            "div",
            { className: "hm-item", style: style },
            h(
              "div",
              { className: "hm-item-head" },
              h("span", { className: "hm-badge" }, meta.label),
              h("span", { className: "hm-item-title" }, record.title || text.slice(0, 70)),
              h("span", { className: "hm-item-time" }, formatTime(record.updatedAt)),
              h(
                "button",
                { className: "hm-del", title: "删除这条记忆", onClick: function () { props.onDelete(record); } },
                icon("trash", 12),
              ),
            ),
            h(
              "div",
              { className: "hm-item-sub" },
              h("span", { className: "hm-scope" }, record.scope === "user" ? "跨项目" : "项目"),
              h("span", null, record.projectLabel || "global"),
              h("span", null, "·"),
              h("span", null, "重要度 ", h("b", null, record.importance)),
              h("span", null, "·"),
              h("span", null, record.embedded ? "已向量化" : "仅词法"),
              h("span", null, "·"),
              h("code", { style: { fontSize: "8.5px" } }, "#" + shortId(record.id)),
            ),
            h("div", { className: "hm-item-text" + (expanded ? " hm-open" : "") }, text),
            text.length > 160
              ? h("button", { className: "hm-more", onClick: function () { setExpanded(!expanded); } }, expanded ? "收起" : "展开全文")
              : null,
            tags.length > 0
              ? h(
                  "div",
                  { className: "hm-tags" },
                  tags.slice(0, 8).map(function (tag, index) { return h("span", { className: "hm-tag", key: index }, tag); }),
                )
              : null,
          );
        }

        function HoloMemoryPane() {
          var recordsState = react.useState([]);
          var records = recordsState[0];
          var setRecords = recordsState[1];
          var statsState = react.useState(null);
          var stats = statsState[0];
          var setStats = statsState[1];
          var loadingState = react.useState(true);
          var loading = loadingState[0];
          var setLoading = loadingState[1];
          var errorState = react.useState("");
          var error = errorState[0];
          var setError = errorState[1];
          var queryState = react.useState("");
          var query = queryState[0];
          var setQuery = queryState[1];
          var layerState = react.useState("all");
          var layer = layerState[0];
          var setLayer = layerState[1];
          var noteState = react.useState("");
          var note = noteState[0];
          var setNote = noteState[1];
          var injectionsState = react.useState([]);
          var injections = injectionsState[0];
          var setInjections = injectionsState[1];
          var auditAllState = react.useState(false);
          var auditAll = auditAllState[0];
          var setAuditAll = auditAllState[1];
          var configState = react.useState(null);
          var config = configState[0];
          var setConfig = configState[1];
          var baseUrlState = react.useState("");
          var baseUrl = baseUrlState[0];
          var setBaseUrl = baseUrlState[1];
          var modelState = react.useState("");
          var model = modelState[0];
          var setModel = modelState[1];
          var keyState = react.useState("");
          var key = keyState[0];
          var setKey = keyState[1];
          var dimsState = react.useState("");
          var dims = dimsState[0];
          var setDims = dimsState[1];
          var cfgLoaded = react.useRef(false);
          var checkState = react.useState({ state: "idle", text: "" });
          var check = checkState[0];
          var setCheck = checkState[1];
          var saveState = react.useState({ state: "idle", text: "" });
          var save = saveState[0];
          var setSave = saveState[1];

          var load = react.useCallback(function () {
            setLoading(true);
            setError("");
            return Promise.all([
              fetchJson("/holo-memory/stats"),
              fetchJson("/holo-memory/list?limit=500"),
              fetchJson("/holo-memory/injections?limit=50").catch(function () { return { injections: [] }; }),
              fetchJson("/holo-memory/config").catch(function () { return { config: null }; }),
            ])
              .then(function (values) {
                setStats(values[0]);
                setRecords(values[1].records || []);
                setInjections(values[2].injections || []);
                var cfg = values[3].config || null;
                setConfig(cfg);
                if (cfg && !cfgLoaded.current) {
                  cfgLoaded.current = true;
                  setBaseUrl(cfg.baseUrl || "");
                  setModel(cfg.model || "");
                  setDims(cfg.dimensions ? String(cfg.dimensions) : "");
                }
              })
              .catch(function (err) { setError(String(err && err.message ? err.message : err)); })
              .finally(function () { setLoading(false); });
          }, []);

          react.useEffect(function () { load(); }, [load]);

          var counts = stats && stats.stats ? stats.stats : { l1: 0, l2: 0, l3: 0, embedded: 0, bytes: 0 };
          var total = stats && typeof stats.total === "number" ? stats.total : records.length;
          var embedded = counts.embedded || 0;
          var embeddedPct = total > 0 ? Math.round((embedded / total) * 100) : 0;

          var filtered = react.useMemo(function () {
            var q = query.trim().toLowerCase();
            return records.filter(function (record) {
              if (layer !== "all" && record.layer !== layer) return false;
              if (q.length === 0) return true;
              return [
                record.text, record.title, record.summary, record.hologram,
                (record.tags || []).join(" "), (record.themes || []).join(" "),
                record.id, record.projectLabel,
              ].join(" ").toLowerCase().indexOf(q) >= 0;
            });
          }, [records, query, layer]);

          var deleteRecord = function (record) {
            if (!window.confirm("删除这条 " + record.layer.toUpperCase() + " 记忆？\n" + (record.title || ""))) return;
            setNote("");
            fetchJson("/holo-memory/delete", {
              method: "POST",
              headers: { "content-type": "application/json", "x-holo-memory": "1" },
              body: JSON.stringify({ id: record.id }),
            })
              .then(function () { setNote("已删除 #" + shortId(record.id)); return load(); })
              .catch(function (err) { setError(String(err && err.message ? err.message : err)); });
          };

          var testEmbedding = function () {
            setCheck({ state: "work", text: "检测中…" });
            fetchJson("/holo-memory/test-embedding", {
              method: "POST",
              headers: { "content-type": "application/json", "x-holo-memory": "1" },
              body: JSON.stringify({ baseUrl: baseUrl, model: model, apiKey: key, dimensions: dims ? Number(dims) : 0 }),
            })
              .then(function (data) {
                var probe = data.probe || {};
                if (probe.kind === "embedding") {
                  setCheck({ state: "ok", text: "✓ " + probe.message + " · " + probe.latencyMs + "ms" });
                } else if (probe.kind === "chat") {
                  setCheck({ state: "warn", text: "⚠ " + probe.message + " · " + probe.latencyMs + "ms" });
                } else {
                  setCheck({ state: "err", text: "✕ " + (probe.message || "检测失败") });
                }
              })
              .catch(function (err) { setCheck({ state: "err", text: "✕ " + String(err && err.message ? err.message : err) }); });
          };

          var saveEmbedding = function () {
            setSave({ state: "work", text: "保存中…" });
            fetchJson("/holo-memory/config", {
              method: "POST",
              headers: { "content-type": "application/json", "x-holo-memory": "1" },
              body: JSON.stringify({ baseUrl: baseUrl, model: model, apiKey: key, dimensions: dims ? Number(dims) : 0 }),
            })
              .then(function (data) {
                setConfig(data.config || null);
                setKey("");
                setSave({ state: "ok", text: "✓ 已保存，立即生效" });
                return load();
              })
              .catch(function (err) { setSave({ state: "err", text: "✕ " + String(err && err.message ? err.message : err) }); });
          };

          var copyPath = function () {
            if (!stats || !stats.storageDir || !navigator.clipboard) return;
            navigator.clipboard.writeText(stats.storageDir).then(function () {
              setNote("路径已复制");
              setTimeout(function () { setNote(""); }, 1800);
            }).catch(function () {});
          };

          var metric = function (label, value, sub, tone, iconName) {
            return h(
              "div",
              { className: "hm-metric", style: { "--hm-tone": tone, "--hm-tone-bg": tone + "22" } },
              h("div", { className: "hm-metric-icon" }, icon(iconName, 14)),
              h("div", null, h("div", { className: "hm-metric-value" }, String(value)), h("div", { className: "hm-metric-label" }, label + " · " + sub)),
            );
          };

          var statusRow = function (label, iconName, value, extra) {
            return h(
              "div",
              { className: "hm-status-row" },
              h("span", { className: "hm-status-label" }, icon(iconName, 12), label),
              h("span", { className: "hm-status-value" }, value, extra || null),
            );
          };

          var availableTabs = [["all", "全部", total], ["l1", "L1 对话", counts.l1 || 0], ["l2", "L2 事实", counts.l2 || 0], ["l3", "L3 全息", counts.l3 || 0]];

          var configPanel = h(
            "section",
            { className: "hm-panel" },
            h(
              "div",
              { className: "hm-panel-head" },
              h("div", { className: "hm-panel-title" }, icon("key", 14), "向量模型"),
              h(
                "div",
                { className: "hm-config-current" },
                h("span", { className: "hm-dot" + (config && config.enabled ? "" : " hm-off") }),
                config ? (config.enabled ? "已启用" : "未启用") : loading ? "读取中" : "未读取",
              ),
            ),
            h(
              "div",
              { className: "hm-panel-body" },
              h(
                "div",
                { className: "hm-config-grid" },
                h(
                  "label",
                  { className: "hm-field hm-field-full" },
                  "供应商 / 接口地址",
                  h("input", {
                    className: "hm-input",
                    value: baseUrl,
                    placeholder: "https://api.siliconflow.cn/v1",
                    list: "hm-provider-list",
                    onChange: function (event) { setBaseUrl(event.target.value); },
                  }),
                ),
                h(
                  "label",
                  { className: "hm-field" },
                  "模型",
                  h("input", { className: "hm-input", value: model, placeholder: "Qwen/Qwen3-Embedding-8B", onChange: function (event) { setModel(event.target.value); } }),
                ),
                h(
                  "label",
                  { className: "hm-field" },
                  "API Key",
                  h("input", {
                    className: "hm-input",
                    type: "password",
                    autoComplete: "off",
                    value: key,
                    placeholder: config && config.hasKey ? "已保存；留空保持不变" : "输入 API Key（Ollama 可空）",
                    onChange: function (event) { setKey(event.target.value); },
                  }),
                ),
              ),
              h(
                "datalist",
                { id: "hm-provider-list" },
                [
                  { value: "https://api.siliconflow.cn/v1", label: "硅基流动 SiliconFlow" },
                  { value: "https://api.openai.com/v1", label: "OpenAI" },
                  { value: "http://127.0.0.1:11434/v1", label: "本地 Ollama" },
                  { value: "https://ark.cn-beijing.volces.com/api/v3", label: "火山方舟 Ark" },
                  { value: "https://api.deepseek.com", label: "DeepSeek" },
                ].map(function (item) { return h("option", { value: item.value, label: item.label, key: item.value }); }),
              ),
              h(
                "div",
                { className: "hm-config-actions" },
                h("button", { className: "hm-btn", onClick: testEmbedding, disabled: check.state === "work" }, check.state === "work" ? "检测中…" : "检测可用性"),
                h("button", { className: "hm-btn hm-btn-primary", onClick: saveEmbedding, disabled: save.state === "work" }, save.state === "work" ? "保存中…" : "保存配置"),
                h(
                  "label",
                  { className: "hm-inline" },
                  "维度",
                  h("input", { className: "hm-input hm-input-sm", type: "number", min: "0", value: dims, placeholder: "0", onChange: function (event) { setDims(event.target.value); } }),
                ),
                h("span", { className: "hm-status hm-status-" + (check.state || "idle") }, check.text),
                h("span", { className: "hm-status hm-status-" + (save.state || "idle") }, save.text),
              ),
              h(
                "p",
                { className: "hm-config-note" },
                "检测只请求一次 /embeddings，不保存；保存后立即生效，已有记录会在后台按新模型重新回填向量。",
              ),
            ),
          );

          var statusPanel = h(
            "section",
            { className: "hm-panel" },
            h("div", { className: "hm-panel-head" }, h("div", { className: "hm-panel-title" }, icon("activity", 14), "运行状态"), h("span", { className: "hm-panel-meta" }, embeddedPct + "% 已向量化")),
            h(
              "div",
              { className: "hm-panel-body" },
              h(
                "div",
                { className: "hm-status-list" },
                statusRow("向量模型", "cpu", stats && stats.embedding && stats.embedding.enabled ? h("b", null, stats.embedding.model) : "未启用"),
                statusRow("API Key", "key", config && config.hasKey ? "已保存" : "未设置"),
                statusRow("存储", "box", h("span", { className: "hm-code", title: stats ? stats.storageDir : "" }, stats ? stats.storageDir : ""), h("button", { className: "hm-mini-btn", onClick: copyPath }, "复制")),
                statusRow("自动召回", "layers", h("b", null, "开"), " · " + (stats && stats.inject ? stats.inject.maxChars : 0) + " 字符"),
                statusRow("蒸馏", "sparkles", stats && stats.extract && stats.extract.enabled ? h("b", null, "开") : "关闭"),
              ),
              h("div", { className: "hm-meter" }, h("span", { style: { width: embeddedPct + "%" } })),
              note ? h("div", { className: "hm-status", style: { marginTop: "8px", color: "var(--hm-green)" } }, note) : null,
            ),
          );

          var auditList = injections.slice(0, auditAll ? 50 : 6);
          var auditPanel = h(
            "section",
            { className: "hm-panel" },
            h(
              "div",
              { className: "hm-panel-head" },
              h("div", { className: "hm-panel-title" }, icon("clock", 14), "最近自动召回"),
              h("span", { className: "hm-panel-meta" }, injections.length + " 次"),
            ),
            h(
              "div",
              { className: "hm-panel-body" },
              injections.length === 0
                ? h("div", { className: "hm-empty" }, icon("clock", 18), "新会话触发召回后，这里会出现时间、session 和命中记录。")
                : h(
                    "div",
                    { className: "hm-timeline" },
                    auditList.map(function (event) {
                      return h(
                        "div",
                        { className: "hm-audit", key: String(event.ts) + ":" + event.sessionId },
                        h(
                          "div",
                          { className: "hm-audit-body" },
                          h(
                            "div",
                            { className: "hm-audit-top" },
                            h("span", null, formatTime(event.ts)),
                            h("span", null, "·"),
                            h("span", { className: "hm-audit-session" }, "#" + shortId(event.sessionId)),
                          ),
                          h("div", { className: "hm-audit-query", title: event.query }, event.query || "(短问题兜底)"),
                          h(
                            "div",
                            { className: "hm-audit-meta" },
                            "L1×" + event.layers.l1 + "  L2×" + event.layers.l2 + "  L3×" + event.layers.l3 + "  ·  " + event.chars + " 字符",
                          ),
                        ),
                      );
                    }),
                    injections.length > 6
                      ? h("button", { className: "hm-link", onClick: function () { setAuditAll(!auditAll); } }, auditAll ? "收起" : "查看全部 " + injections.length + " 次")
                      : null,
                  ),
            ),
          );

          var memoryPanel = h(
            "section",
            { className: "hm-panel" },
            h(
              "div",
              { className: "hm-panel-head" },
              h("div", { className: "hm-panel-title" }, icon("database", 14), "记忆记录"),
              h("span", { className: "hm-panel-meta" }, "显示 " + filtered.length + " / " + total),
            ),
            h(
              "div",
              { className: "hm-panel-body" },
              h(
                "div",
                { className: "hm-toolbar" },
                h(
                  "div",
                  { className: "hm-search" },
                  icon("search", 13),
                  h("input", { value: query, placeholder: "搜索摘要 / 事实 / 标签 / id…", onChange: function (event) { setQuery(event.target.value); } }),
                ),
                h(
                  "div",
                  { className: "hm-tabs" },
                  availableTabs.map(function (tab) {
                    return h(
                      "button",
                      { key: tab[0], className: "hm-tab" + (layer === tab[0] ? " hm-tab-on" : ""), onClick: function () { setLayer(tab[0]); } },
                      tab[1] + " " + tab[2],
                    );
                  }),
                ),
              ),
              error ? h("div", { className: "hm-status hm-status-err", style: { marginBottom: "8px" } }, "读取失败：" + error) : null,
              h(
                "div",
                { className: "hm-list" },
                filtered.length === 0
                  ? h("div", { className: "hm-empty" }, icon("box", 20), loading ? "正在读取记忆…" : "没有匹配的记忆。新会话产生摘要后会自动出现在这里。")
                  : filtered.map(function (record) { return h(RecordItem, { key: record.id, record: record, onDelete: deleteRecord }); }),
              ),
            ),
          );

          return h(
            "div",
            { className: "hm-pane" },
            h(
              "div",
              { className: "hm-shell" },
              h(
                "header",
                { className: "hm-hero", "data-window-drag": "true" },
                h(
                  "div",
                  { className: "hm-hero-copy" },
                  h("div", { className: "hm-kicker" }, "Holographic Memory"),
                  h("h2", null, "全息记忆控制台"),
                  h("p", null, "L1 对话 · L2 事实 · L3 全息 · 自动召回与跨会话审计"),
                ),
                h(
                  "div",
                  { className: "hm-hero-side" },
                  h(
                    "div",
                    { className: "hm-total-box" },
                    h("div", { className: "hm-total-number" }, String(total)),
                    h("div", { className: "hm-total-label" }, "memories"),
                  ),
                  h(
                    "button",
                    { className: "hm-btn hm-hero-refresh", title: "刷新", onClick: load, disabled: loading },
                    h("span", { className: loading ? "hm-spin" : "", style: { display: "inline-flex" } }, icon("refresh", 12)),
                    loading ? "读取中" : "刷新",
                  ),
                ),
              ),
              h(
                "div",
                { className: "hm-metrics" },
                metric("L1 对话", counts.l1 || 0, "每轮摘要", "#22d3ee", "chat"),
                metric("L2 事实", counts.l2 || 0, "原子事实", "#5b7cfa", "database"),
                metric("L3 全息", counts.l3 || 0, "整体胶囊", "#a78bfa", "sparkles"),
                metric("已向量化", embedded, "Qwen3 · 4096D", "#4ade80", "cpu"),
                metric("占用", (counts.bytes / 1024).toFixed(1) + " KB", "l1/l2/l3.json", "#f5b84c", "box"),
              ),
              h(
                "div",
                { className: "hm-columns" },
                h("div", { className: "hm-col-main" }, configPanel, memoryPanel),
                h("div", { className: "hm-col-side" }, statusPanel, auditPanel),
              ),
            ),
          );
        }

        function HoloMemoryIcon(props) {
          return icon("layers", (props && props.size) || 18);
        }

        function apply(ctx) {
          ensureStyleSheet();
          ctx.slots.inject("main", function () {
            return ctx.slots.register({ name: "main", key: "holo-memory" }, HoloMemoryPane);
          });
          ctx.slots.inject("sidebar.panellist", function () {
            return ctx.slots.register(
              { name: "sidebar.panellist", id: "holo-memory", order: 10, label: "全息记忆" },
              HoloMemoryIcon,
            );
          });
        }

        exports.name = "dsh-holo-memory";
        exports.inject = inject;
        exports.apply = apply;
        return module.exports;
      },
    });
  } catch (err) {
    console.warn("[dsh-holo-memory] client runtime error:", err);
  }
})();

