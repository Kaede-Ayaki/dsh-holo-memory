(() => {
  try {
    /* dsh-holo-memory client half — Settings → 全息记忆 console.
       Data comes from the host routes /holo-memory/stats and /holo-memory/list;
       delete posts to /holo-memory/delete. No external HTML or network assets. */
    window.__ModuleLoader__.load({
      id: "dsh-holo-memory",
      factory: (require) => {
        var module = { exports: {} };
        var exports = module.exports;
        Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

        var react = require("react");
        var inject = ["slots"];

        var STYLE_ID = "dsh-holo-memory-style";
        var CSS = [
          ".hm-pane{display:flex;flex-direction:column;gap:14px;width:100%;max-width:900px;padding:4px 0 28px;color:var(--dsw-alias-label-primary,#e8eeff);box-sizing:border-box}",
          ".hm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}",
          ".hm-title{margin:0;font-size:17px;line-height:26px;font-weight:600;letter-spacing:.2px}",
          ".hm-intro{margin:4px 0 0;font-size:12px;line-height:19px;color:var(--dsw-alias-label-tertiary,#8996b3)}",
          ".hm-head-actions{display:flex;align-items:center;gap:10px;flex:0 0 auto;padding-top:2px}",
          ".hm-total{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#a8b4cf);white-space:nowrap}",
          ".hm-total b{color:var(--dsw-alias-brand-primary,#5b7cfa);font-size:16px;margin:0 3px}",
          ".hm-btn{font-size:11px;line-height:16px;padding:4px 11px;border:.5px solid var(--dsw-alias-border-l3,#2a3654);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary,#e8eeff);cursor:pointer;white-space:nowrap}",
          ".hm-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(91,124,250,.12))}",
          ".hm-btn:disabled{opacity:.45;cursor:default}",
          ".hm-btn-primary{background:var(--dsw-alias-brand-primary,#5b7cfa);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}",
          ".hm-cards{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}",
          ".hm-card{position:relative;padding:10px 12px;border:.5px solid var(--dsw-alias-border-l3,#2a3654);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#0f182b);overflow:hidden}",
          ".hm-card:before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--hm-tone,#5b7cfa)}",
          ".hm-card-label{font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-tertiary,#8996b3)}",
          ".hm-card-value{font-size:21px;line-height:29px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:.3px;margin-top:2px}",
          ".hm-card-sub{font-size:10px;line-height:15px;color:var(--dsw-alias-label-tertiary,#8996b3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
          ".hm-meta{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:10.5px;line-height:17px;color:var(--dsw-alias-label-tertiary,#8996b3)}",
          ".hm-meta code{font-family:var(--dsw-font-markdown-code-block-small,ui-monospace,Menlo,monospace);font-size:10px;color:var(--dsw-alias-label-secondary,#a8b4cf)}",
          ".hm-config{border:.5px solid var(--dsw-alias-border-l3,#2a3654);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#0f182b);padding:10px 12px;display:flex;flex-direction:column;gap:8px}",
          ".hm-config-head{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary,#a8b4cf)}",
          ".hm-config-head b{color:var(--dsw-alias-brand-primary,#5b7cfa)}",
          ".hm-config-current{font-size:10px;line-height:15px;color:var(--dsw-alias-label-tertiary,#8996b3);text-align:right}",
          ".hm-config-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:8px}",
          ".hm-field{display:flex;flex-direction:column;gap:4px;font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-tertiary,#8996b3)}",
          ".hm-field input{box-sizing:border-box;width:100%;padding:5px 8px;font-size:11.5px;line-height:17px;border:.5px solid var(--dsw-alias-border-l3,#2a3654);border-radius:6px;background:var(--dsw-alias-bg-layer-1,#0b1222);color:var(--dsw-alias-label-primary,#e8eeff);outline:none;font-family:inherit}",
          ".hm-field input:focus{box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary,#5b7cfa)}",
          ".hm-field-full{grid-column:1/-1}",
          ".hm-config-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
          ".hm-status{font-size:10.5px;line-height:16px}",
          ".hm-status-ok{color:var(--dsw-alias-state-success-primary,#4ade80)}",
          ".hm-status-warn{color:var(--dsw-alias-state-warning-primary,#f5b84c)}",
          ".hm-status-err{color:var(--dsw-alias-state-error-primary,#f87171)}",
          ".hm-status-work{color:var(--dsw-alias-label-tertiary,#8996b3)}",
          ".hm-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between}",
          ".hm-search{flex:1 1 240px;min-width:180px;box-sizing:border-box;padding:6px 10px;font-size:12px;line-height:18px;border:.5px solid var(--dsw-alias-border-l3,#2a3654);border-radius:7px;background:var(--dsw-alias-bg-layer-2,#0f182b);color:var(--dsw-alias-label-primary,#e8eeff);outline:none}",
          ".hm-search:focus{box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary,#5b7cfa)}",
          ".hm-tabs{display:flex;gap:6px;flex-wrap:wrap}",
          ".hm-tab{font-size:11px;line-height:16px;padding:3px 10px;border:.5px solid var(--dsw-alias-border-l3,#2a3654);border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary,#a8b4cf);cursor:pointer}",
          ".hm-tab:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(91,124,250,.12))}",
          ".hm-tab-on{background:var(--dsw-alias-brand-primary,#5b7cfa);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}",
          ".hm-list{display:flex;flex-direction:column;gap:8px}",
          ".hm-empty{padding:34px 18px;text-align:center;border:.5px dashed var(--dsw-alias-border-l3,#2a3654);border-radius:9px;color:var(--dsw-alias-label-tertiary,#8996b3);font-size:12px;line-height:20px}",
          ".hm-item{padding:10px 12px 9px;border:.5px solid var(--dsw-alias-border-l3,#2a3654);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#0f182b)}",
          ".hm-item:hover{border-color:var(--dsw-alias-brand-primary,#5b7cfa)}",
          ".hm-item-head{display:flex;align-items:center;gap:8px;min-width:0}",
          ".hm-badge{flex:0 0 auto;font-size:9.5px;line-height:14px;font-weight:600;padding:1px 7px;border-radius:999px;letter-spacing:.4px}",
          ".hm-badge[data-layer='l1']{color:#062b32;background:#3ad6e8}",
          ".hm-badge[data-layer='l2']{color:#070f24;background:#5b7cfa}",
          ".hm-badge[data-layer='l3']{color:#1b1038;background:#a78bfa}",
          ".hm-item-title{flex:1 1 auto;min-width:0;font-size:12.5px;line-height:19px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
          ".hm-item-time{flex:0 0 auto;font-size:10px;line-height:16px;color:var(--dsw-alias-label-tertiary,#8996b3);font-variant-numeric:tabular-nums}",
          ".hm-del{flex:0 0 auto;width:22px;height:22px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary,#8996b3);cursor:pointer;font-size:14px;line-height:22px;text-align:center}",
          ".hm-del:hover{background:var(--dsw-alias-state-error-primary,#f87171);color:#fff}",
          ".hm-item-sub{display:flex;flex-wrap:wrap;gap:4px 8px;margin-top:3px;font-size:10px;line-height:16px;color:var(--dsw-alias-label-tertiary,#8996b3)}",
          ".hm-item-sub b{font-weight:500;color:var(--dsw-alias-label-secondary,#a8b4cf)}",
          ".hm-item-text{margin-top:5px;font-size:11.5px;line-height:18px;color:var(--dsw-alias-label-secondary,#a8b4cf);white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}",
          ".hm-item-text.hm-open{display:block;-webkit-line-clamp:unset;max-height:300px;overflow:auto}",
          ".hm-more{align-self:flex-start;margin-top:3px;padding:0;border:0;background:transparent;color:var(--dsw-alias-brand-primary,#5b7cfa);font-size:10.5px;line-height:16px;cursor:pointer}",
          ".hm-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}",
          ".hm-tag{font-size:9.5px;line-height:14px;padding:1px 7px;border-radius:999px;border:.5px solid var(--dsw-alias-border-l3,#2a3654);color:var(--dsw-alias-label-tertiary,#8996b3)}",
          ".hm-inject{border:.5px solid var(--dsw-alias-border-l3,#2a3654);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#0f182b);overflow:hidden}",
          ".hm-inject-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border-bottom:.5px solid var(--dsw-alias-border-l3,#2a3654);font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary,#a8b4cf)}",
          ".hm-inject-head b{color:var(--dsw-alias-brand-primary,#5b7cfa)}",
          ".hm-inject-row{display:grid;grid-template-columns:96px 76px minmax(0,1fr) auto;gap:8px;align-items:baseline;padding:6px 12px;border-top:.5px solid var(--dsw-alias-border-l3,#2a3654);font-size:10.5px;line-height:16px;color:var(--dsw-alias-label-tertiary,#8996b3)}",
          ".hm-inject-row:first-of-type{border-top:0}",
          ".hm-inject-time{font-variant-numeric:tabular-nums;white-space:nowrap}",
          ".hm-inject-session{font-family:var(--dsw-font-markdown-code-block-small,ui-monospace,Menlo,monospace);font-size:9.5px;white-space:nowrap;color:var(--dsw-alias-label-secondary,#a8b4cf)}",
          ".hm-inject-query{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary,#a8b4cf)}",
          ".hm-inject-meta{font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--dsw-alias-label-tertiary,#8996b3)}",
          ".hm-inject-row:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(91,124,250,.08))}",
          ".hm-err{padding:8px 10px;border-radius:7px;border:.5px solid var(--dsw-alias-state-error-primary,#f87171);color:var(--dsw-alias-state-error-primary,#f87171);font-size:11px;line-height:17px;background:rgba(248,113,113,.07)}",
          ".hm-note{margin:2px 0 0;font-size:10px;line-height:16px;color:var(--dsw-alias-label-tertiary,#8996b3)}",
          "@media (max-width:760px){.hm-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.hm-head{flex-direction:column;gap:8px}.hm-total{align-self:flex-start}}",
        ].join("");

        function ensureStyleSheet() {
          if (typeof document === "undefined") return;
          if (document.getElementById(STYLE_ID)) return;
          var el = document.createElement("style");
          el.id = STYLE_ID;
          el.textContent = CSS;
          document.head.appendChild(el);
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

        function shortId(id) {
          return String(id || "").slice(-8);
        }

        function formatTime(ts) {
          if (!ts) return "";
          var date = new Date(ts);
          var pad = function (value) { return String(value).padStart(2, "0"); };
          return pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
        }

        function layerLabel(layer) {
          return layer === "l1" ? "L1 对话" : layer === "l2" ? "L2 事实" : "L3 全息";
        }

        function RecordItem(props) {
          var record = props.record;
          var expandedPair = react.useState(false);
          var expanded = expandedPair[0];
          var setExpanded = expandedPair[1];
          var text = record.text || "";
          var tags = record.tags || record.themes || [];
          return react.createElement(
            "div",
            { className: "hm-item" },
            react.createElement(
              "div",
              { className: "hm-item-head" },
              react.createElement("span", { className: "hm-badge", "data-layer": record.layer }, record.layer.toUpperCase()),
              react.createElement("span", { className: "hm-item-title" }, record.title || text.slice(0, 80)),
              react.createElement("span", { className: "hm-item-time" }, formatTime(record.updatedAt)),
              react.createElement(
                "button",
                {
                  className: "hm-del",
                  title: "删除这条记忆",
                  onClick: function () { props.onDelete(record); },
                },
                "×",
              ),
            ),
            react.createElement(
              "div",
              { className: "hm-item-sub" },
              react.createElement("span", null, record.scope === "user" ? "跨项目" : "项目"),
              react.createElement("span", null, "·"),
              react.createElement("span", null, record.projectLabel || "global"),
              react.createElement("span", null, "·"),
              react.createElement("span", null, "重要度 ", react.createElement("b", null, record.importance)),
              react.createElement("span", null, "·"),
              react.createElement("span", null, record.embedded ? "已向量化" : "仅词法"),
              react.createElement("span", null, "·"),
              react.createElement("code", { style: { fontSize: "10px" } }, "#" + shortId(record.id)),
            ),
            react.createElement(
              "div",
              { className: "hm-item-text" + (expanded ? " hm-open" : "") },
              text,
            ),
            text.length > 160
              ? react.createElement("button", { className: "hm-more", onClick: function () { setExpanded(!expanded); } }, expanded ? "收起" : "展开全文")
              : null,
            tags.length > 0
              ? react.createElement(
                  "div",
                  { className: "hm-tags" },
                  tags.slice(0, 8).map(function (tag, index) {
                    return react.createElement("span", { className: "hm-tag", key: "tag-" + index }, tag);
                  }),
                )
              : null,
          );
        }

        function HoloMemoryPane() {
          var recordsPair = react.useState([]);
          var records = recordsPair[0];
          var setRecords = recordsPair[1];
          var statsPair = react.useState(null);
          var stats = statsPair[0];
          var setStats = statsPair[1];
          var loadingPair = react.useState(true);
          var loading = loadingPair[0];
          var setLoading = loadingPair[1];
          var errorPair = react.useState("");
          var error = errorPair[0];
          var setError = errorPair[1];
          var queryPair = react.useState("");
          var query = queryPair[0];
          var setQuery = queryPair[1];
          var layerPair = react.useState("all");
          var layer = layerPair[0];
          var setLayer = layerPair[1];
          var notePair = react.useState("");
          var note = notePair[0];
          var setNote = notePair[1];
          var injectionsPair = react.useState([]);
          var injections = injectionsPair[0];
          var setInjections = injectionsPair[1];
          var configPair = react.useState(null);
          var config = configPair[0];
          var setConfig = configPair[1];
          var cfgBaseUrlPair = react.useState("");
          var cfgBaseUrl = cfgBaseUrlPair[0];
          var setCfgBaseUrl = cfgBaseUrlPair[1];
          var cfgModelPair = react.useState("");
          var cfgModel = cfgModelPair[0];
          var setCfgModel = cfgModelPair[1];
          var cfgKeyPair = react.useState("");
          var cfgKey = cfgKeyPair[0];
          var setCfgKey = cfgKeyPair[1];
          var cfgDimsPair = react.useState("");
          var cfgDims = cfgDimsPair[0];
          var setCfgDims = cfgDimsPair[1];
          var cfgLoadedRef = react.useRef(false);
          var checkPair = react.useState({ state: "idle", text: "" });
          var check = checkPair[0];
          var setCheck = checkPair[1];
          var savePair = react.useState({ state: "idle", text: "" });
          var save = savePair[0];
          var setSave = savePair[1];

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
                if (cfg && !cfgLoadedRef.current) {
                  cfgLoadedRef.current = true;
                  setCfgBaseUrl(cfg.baseUrl || "");
                  setCfgModel(cfg.model || "");
                  setCfgDims(cfg.dimensions ? String(cfg.dimensions) : "");
                }
              })
              .catch(function (err) {
                setError(String(err && err.message ? err.message : err));
              })
              .finally(function () { setLoading(false); });
          }, []);

          react.useEffect(function () { load(); }, [load]);

          var counts = stats && stats.stats ? stats.stats : { l1: 0, l2: 0, l3: 0, embedded: 0, bytes: 0 };
          var total = stats && typeof stats.total === "number" ? stats.total : records.length;
          var filtered = react.useMemo(function () {
            var q = query.trim().toLowerCase();
            return records.filter(function (record) {
              if (layer !== "all" && record.layer !== layer) return false;
              if (q.length === 0) return true;
              var haystack = [
                record.text, record.title, record.summary, record.hologram,
                (record.tags || []).join(" "), (record.themes || []).join(" "),
                record.id, record.projectLabel,
              ].join(" ").toLowerCase();
              return haystack.indexOf(q) >= 0;
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
              .then(function () {
                setNote("已删除 " + shortId(record.id));
                return load();
              })
              .catch(function (err) { setError(String(err && err.message ? err.message : err)); });
          };

          var testEmbedding = function () {
            setCheck({ state: "work", text: "检测中…" });
            fetchJson("/holo-memory/test-embedding", {
              method: "POST",
              headers: { "content-type": "application/json", "x-holo-memory": "1" },
              body: JSON.stringify({
                baseUrl: cfgBaseUrl,
                model: cfgModel,
                apiKey: cfgKey,
                dimensions: cfgDims ? Number(cfgDims) : 0,
              }),
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
              body: JSON.stringify({
                baseUrl: cfgBaseUrl,
                model: cfgModel,
                apiKey: cfgKey,
                dimensions: cfgDims ? Number(cfgDims) : 0,
              }),
            })
              .then(function (data) {
                setConfig(data.config || null);
                setCfgKey("");
                setSave({ state: "ok", text: "✓ 已保存，立即生效；新记录会在后台补齐向量" });
                return load();
              })
              .catch(function (err) { setSave({ state: "err", text: "✕ " + String(err && err.message ? err.message : err) }); });
          };

          var card = function (label, value, sub, tone) {
            return react.createElement(
              "div",
              { className: "hm-card", style: { "--hm-tone": tone } },
              react.createElement("div", { className: "hm-card-label" }, label),
              react.createElement("div", { className: "hm-card-value" }, String(value)),
              react.createElement("div", { className: "hm-card-sub" }, sub || ""),
            );
          };

          return react.createElement(
            "div",
            { className: "hm-pane" },
            react.createElement(
              "div",
              { className: "hm-head" },
              react.createElement(
                "div",
                null,
                react.createElement("h2", { className: "hm-title" }, "全息记忆控制台"),
                react.createElement(
                  "p",
                  { className: "hm-intro" },
                  "L1 对话摘要 · L2 原子事实 · L3 全息胶囊 · 本地 JSON，自动召回按 1,400 字符预算注入",
                ),
              ),
              react.createElement(
                "div",
                { className: "hm-head-actions" },
                react.createElement("span", { className: "hm-total" }, "共 ", react.createElement("b", null, total), " 条记忆"),
                react.createElement("button", { className: "hm-btn hm-btn-primary", onClick: load, disabled: loading }, loading ? "读取中…" : "刷新"),
              ),
            ),
            react.createElement(
              "div",
              { className: "hm-cards" },
              card("L1 对话", counts.l1, "每轮一条摘要", "#3ad6e8"),
              card("L2 事实", counts.l2, "原子事实 · 可追溯", "#5b7cfa"),
              card("L3 全息", counts.l3, "跨多轮整体胶囊", "#a78bfa"),
              card("已向量化", counts.embedded, "Qwen3 · 4096D", "#4ade80"),
              card("占用", (counts.bytes / 1024).toFixed(1) + " KB", "l1/l2/l3.json", "#f5b84c"),
            ),
            stats
              ? react.createElement(
                  "div",
                  { className: "hm-meta" },
                  react.createElement("span", null, "存储：", react.createElement("code", null, stats.storageDir)),
                  react.createElement(
                    "span",
                    null,
                    "Embedding：",
                    react.createElement("code", null, stats.embedding && stats.embedding.enabled ? stats.embedding.model : "未启用"),
                    stats.embedding && stats.embedding.enabled ? "（" + counts.embedded + " 条已向量化）" : "",
                  ),
                  react.createElement("span", null, "蒸馏：", react.createElement("code", null, stats.extract && stats.extract.enabled ? "启用" : "关闭")),
                )
              : null,
            react.createElement(
              "div",
              { className: "hm-config" },
              react.createElement(
                "div",
                { className: "hm-config-head" },
                react.createElement("span", null, "向量模型配置"),
                react.createElement(
                  "span",
                  { className: "hm-config-current" },
                  config
                    ? (config.hasKey ? "key 已保存" : "key 未设置") + " · " + (config.enabled ? "已启用" : "未启用")
                    : "读取中…",
                ),
              ),
              react.createElement(
                "div",
                { className: "hm-config-grid" },
                react.createElement(
                  "label",
                  { className: "hm-field hm-field-full" },
                  "供应商 / 接口地址",
                  react.createElement("input", {
                    value: cfgBaseUrl,
                    placeholder: "https://api.siliconflow.cn/v1",
                    list: "hm-provider-list",
                    onChange: function (event) { setCfgBaseUrl(event.target.value); },
                  }),
                ),
                react.createElement(
                  "datalist",
                  { id: "hm-provider-list" },
                  [
                    "https://api.siliconflow.cn/v1",
                    "https://api.openai.com/v1",
                    "http://127.0.0.1:11434/v1",
                    "https://ark.cn-beijing.volces.com/api/v3",
                    "https://api.deepseek.com",
                  ].map(function (url) { return react.createElement("option", { value: url, key: url }); }),
                ),
                react.createElement(
                  "label",
                  { className: "hm-field" },
                  "模型",
                  react.createElement("input", {
                    value: cfgModel,
                    placeholder: "Qwen/Qwen3-Embedding-8B",
                    onChange: function (event) { setCfgModel(event.target.value); },
                  }),
                ),
                react.createElement(
                  "label",
                  { className: "hm-field" },
                  "API Key",
                  react.createElement("input", {
                    type: "password",
                    value: cfgKey,
                    autoComplete: "off",
                    placeholder: config && config.hasKey ? "已保存；留空保持不变" : "输入 API Key（本地 Ollama 可空）",
                    onChange: function (event) { setCfgKey(event.target.value); },
                  }),
                ),
                react.createElement(
                  "label",
                  { className: "hm-field hm-field-full" },
                  "维度（可选，0 = 用模型默认）",
                  react.createElement("input", {
                    type: "number",
                    min: "0",
                    value: cfgDims,
                    placeholder: "0",
                    onChange: function (event) { setCfgDims(event.target.value); },
                  }),
                ),
              ),
              react.createElement(
                "div",
                { className: "hm-config-actions" },
                react.createElement(
                  "button",
                  { className: "hm-btn", onClick: testEmbedding, disabled: check.state === "work" },
                  check.state === "work" ? "检测中…" : "检测可用性",
                ),
                react.createElement(
                  "button",
                  { className: "hm-btn hm-btn-primary", onClick: saveEmbedding, disabled: save.state === "work" },
                  save.state === "work" ? "保存中…" : "保存配置",
                ),
                react.createElement(
                  "span",
                  { className: "hm-status hm-status-" + (check.state || "idle") },
                  check.text,
                ),
                react.createElement(
                  "span",
                  { className: "hm-status hm-status-" + (save.state || "idle") },
                  save.text,
                ),
              ),
              react.createElement(
                "p",
                { className: "hm-note" },
                "检测只请求一次 /embeddings（不保存，不会写入记忆）；保存后立即生效，已有记录会在后台按新模型重新回填向量。",
              ),
            ),
            react.createElement(
              "div",
              { className: "hm-toolbar" },
              react.createElement("input", {
                className: "hm-search",
                type: "search",
                placeholder: "搜索摘要 / 事实 / 标签 / id…",
                value: query,
                onChange: function (event) { setQuery(event.target.value); },
              }),
              react.createElement(
                "div",
                { className: "hm-tabs" },
                [["all", "全部"], ["l1", "L1 对话"], ["l2", "L2 事实"], ["l3", "L3 全息"]].map(function (pair) {
                  return react.createElement(
                    "button",
                    {
                      key: pair[0],
                      className: "hm-tab" + (layer === pair[0] ? " hm-tab-on" : ""),
                      onClick: function () { setLayer(pair[0]); },
                    },
                    pair[1] + (pair[0] === "all" ? " · " + total : " · " + (counts[pair[0]] || 0)),
                  );
                }),
              ),
            ),
            injections.length > 0
              ? react.createElement(
                  "div",
                  { className: "hm-inject" },
                  react.createElement(
                    "div",
                    { className: "hm-inject-head" },
                    react.createElement("span", null, "最近自动召回"),
                    react.createElement("span", null, "最近 ", react.createElement("b", null, injections.length), " 次注入 · 跨会话审计"),
                  ),
                  injections.slice(0, 8).map(function (event) {
                    return react.createElement(
                      "div",
                      { className: "hm-inject-row", key: String(event.ts) + ":" + event.sessionId },
                      react.createElement("span", { className: "hm-inject-time" }, formatTime(event.ts)),
                      react.createElement("span", { className: "hm-inject-session", title: event.sessionId }, "#" + shortId(event.sessionId)),
                      react.createElement("span", { className: "hm-inject-query", title: event.query }, event.query || "(短问题兜底)"),
                      react.createElement(
                        "span",
                        { className: "hm-inject-meta" },
                        "L1×" + event.layers.l1 + " L2×" + event.layers.l2 + " L3×" + event.layers.l3 + " · " + event.chars + "字",
                      ),
                    );
                  }),
                )
              : null,
            error ? react.createElement("div", { className: "hm-err" }, "读取失败：" + error + (error.indexOf("403") >= 0 ? "（该路由可能被访问控制拦截）" : "")) : null,
            note ? react.createElement("div", { className: "hm-meta" }, note) : null,
            react.createElement(
              "div",
              { className: "hm-list" },
              filtered.length === 0
                ? react.createElement("div", { className: "hm-empty" }, loading ? "正在读取记忆…" : "没有匹配的记忆。新会话产生摘要后会自动出现在这里。")
                : filtered.map(function (record) {
                    return react.createElement(RecordItem, { key: record.id, record: record, onDelete: deleteRecord });
                  }),
            ),
            react.createElement(
              "p",
              { className: "hm-note" },
              "数据来自 $DSH_HOME/holo-memory/l1.json / l2.json / l3.json；删除立即生效。向量在后台异步补齐，状态以「已向量化」为准。",
            ),
          );
        }

        function apply(ctx) {
          ensureStyleSheet();
          ctx.slots.inject("settings.section", function () {
            return ctx.slots.register(
              { name: "settings.section", id: "holo-memory", order: 44, label: "全息记忆" },
              HoloMemoryPane,
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

