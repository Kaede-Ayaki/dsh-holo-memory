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
          ".hm-view-tabs{display:flex;gap:5px;margin-top:10px}",
          ".hm-view-tab{height:26px;padding:0 11px;border:.5px solid transparent;border-radius:7px;background:transparent;color:var(--hm-faint);font-size:10.5px;line-height:24px;cursor:pointer;transition:all .15s}",
          ".hm-view-tab:hover{color:var(--hm-text);background:rgba(255,255,255,.04)}",
          ".hm-view-tab-on{border-color:rgba(91,124,250,.38);background:rgba(91,124,250,.16);color:var(--hm-text)}",
          ".hm-neuron-page{display:flex;flex-direction:column;gap:12px}",
          ".hm-neuron-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}",
          ".hm-neuron-card{padding:11px 12px;border:.5px solid var(--hm-border);border-radius:10px;background:var(--dsw-alias-bg-layer-1,rgba(11,18,34,.55))}",
          ".hm-neuron-num{font-size:21px;line-height:24px;font-weight:650;font-variant-numeric:tabular-nums;letter-spacing:-.02em}",
          ".hm-neuron-label{margin-top:2px;font-size:9.5px;line-height:14px;color:var(--hm-faint)}",
          ".hm-neuron-panel{padding:13px 14px;border:.5px solid var(--hm-border);border-radius:11px;background:var(--dsw-alias-bg-layer-1,rgba(11,18,34,.55))}",
          ".hm-neuron-panel-title{display:flex;align-items:center;gap:7px;font-size:11px;line-height:17px;font-weight:600;margin-bottom:9px}",
          ".hm-neuron-note{font-size:9.5px;line-height:15px;color:var(--hm-faint)}",
          ".hm-neuron-entity{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:.5px solid rgba(255,255,255,.04)}",
          ".hm-neuron-entity:last-child{border-bottom:0}",
          ".hm-neuron-entity-name{flex:1 1 auto;min-width:0;font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
          ".hm-neuron-degree{flex:0 0 auto;font-size:9.5px;color:var(--hm-faint);font-variant-numeric:tabular-nums}",
          ".hm-neuron-bar{height:3px;border-radius:99px;background:linear-gradient(90deg,#5b7cfa,#a78bfa);margin-top:3px}",
          ".hm-neuron-sample{display:flex;gap:7px;align-items:baseline;padding:4px 0;font-size:10px;line-height:15px;color:var(--hm-muted)}",
          ".hm-neuron-sample b{color:var(--hm-text);font-weight:550}",
          ".hm-neuron-badge{display:inline-flex;align-items:center;gap:4px;padding:1px 6px;border-radius:5px;background:rgba(167,139,250,.14);color:#c4b5fd;font-size:9px;line-height:15px;font-weight:650}",
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
          /* conversation work-step row */
          ".hm-recall{min-width:0;padding:1px 0}",
          ".hm-recall-head{display:flex;align-items:center;gap:7px;width:100%;min-width:0;padding:3px 0;border:0;background:transparent;color:var(--dsw-alias-label-secondary,#a8b4cf);cursor:pointer;text-align:left;font:inherit;line-height:20px}",
          ".hm-recall-head:hover .hm-recall-label{color:var(--dsw-alias-label-primary,#e8eeff)}",
          ".hm-recall-icon{display:inline-flex;color:var(--dsw-alias-brand-primary,#5b7cfa);flex:0 0 auto;opacity:.95}",
          ".hm-recall-label{font-size:12.5px;line-height:20px;color:var(--dsw-alias-label-secondary,#a8b4cf);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .15s}",
          ".hm-recall-meta{font-size:10.5px;line-height:20px;color:var(--dsw-alias-label-tertiary,#8996b3);white-space:nowrap;flex:0 0 auto;font-variant-numeric:tabular-nums}",
          ".hm-recall-chevron{display:inline-flex;margin-left:auto;color:var(--dsw-alias-label-tertiary,#8996b3);transition:transform .15s;flex:0 0 auto}",
          ".hm-recall-chevron.hm-open{transform:rotate(180deg)}",
          ".hm-native-recall{margin:0}",
          ".hm-native-recall>summary{cursor:pointer;list-style:none;color:var(--dsw-alias-brand-primary,#5b7cfa);font-size:12.5px;line-height:20px;font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
          ".hm-native-recall>summary::-webkit-details-marker{display:none}",
          ".hm-native-recall-body{margin-top:5px;padding:8px 10px;border:.5px solid var(--dsw-alias-border-l3,#263450);border-radius:8px;background:var(--dsw-alias-bg-layer-2,#0f182b);color:var(--dsw-alias-label-secondary,#a8b4cf);font-size:11px;line-height:17px;white-space:pre-wrap;max-height:280px;overflow:auto}",
          ".hm-workstep-recall{margin:2px 0 5px}",
          ".hm-workstep-recall>summary{cursor:pointer;list-style:none;color:var(--dsw-alias-brand-primary,#5b7cfa);font-size:11.5px;line-height:18px;font-weight:550}",
          ".hm-workstep-recall>summary::-webkit-details-marker{display:none}",
          ".hm-workstep-recall-body{margin-top:4px;padding:6px 8px;border-left:2px solid rgba(91,124,250,.5);color:var(--dsw-alias-label-tertiary,#8996b3);font-size:10.5px;line-height:16px;white-space:pre-wrap}",
          /* input toolbar read/write toggles, next to the JSON clipboard pill */
          ".hm-tgl-group{display:inline-flex;align-items:center;gap:4px;flex:none}",
          ".hm-tgl-btn{display:inline-flex;align-items:center;gap:4px;flex:none;height:26px;padding:0 8px;border-radius:999px;border:1px solid rgba(128,128,128,.30);background:transparent;color:inherit;font:inherit;font-size:11px;line-height:1;letter-spacing:.02em;cursor:pointer;opacity:.72;transition:background-color .12s,border-color .12s,opacity .12s}",
          ".hm-tgl-btn:hover{opacity:1;background:rgba(127,140,160,.14)}",
          ".hm-tgl-btn[data-on=\"1\"]{opacity:1;border-color:rgba(96,146,255,.60);background:rgba(96,146,255,.14)}",
          ".hm-tgl-btn[data-busy=\"1\"]{opacity:.5;cursor:wait}",
          ".hm-tgl-btn[data-flash=\"fail\"]{border-color:rgba(220,92,92,.72);background:rgba(220,92,92,.18)}",
          ".hm-tgl-btn[data-flash=\"ok\"]{border-color:rgba(64,180,110,.78);background:rgba(64,180,110,.22)}",
          ".hm-tgl-dot{width:6px;height:6px;border-radius:50%;background:rgba(128,128,128,.60);flex:none}",
          ".hm-tgl-btn[data-on=\"1\"] .hm-tgl-dot{background:rgb(86,196,140)}",
          ".hm-tgl-btn[data-error=\"1\"] .hm-tgl-dot{background:rgb(220,92,92)}",
          ".hm-recall-body{margin:4px 0 5px 21px;padding:8px 10px;border-radius:7px;border:.5px solid var(--dsw-alias-border-l3,#263450);background:var(--dsw-alias-markdown-code-block,rgba(255,255,255,.04));color:var(--dsw-alias-label-secondary,#a8b4cf);max-height:220px;overflow:auto}",
          ".hm-recall-query{margin-bottom:4px;font:10px/15px var(--dsw-font-markdown-code-block-small,ui-monospace,Menlo,Consolas,monospace);color:var(--dsw-alias-label-tertiary,#8996b3);white-space:pre-wrap;word-break:break-word}",
          ".hm-recall-text{margin:0;font:11px/16px var(--dsw-font-markdown-code-block-small,ui-monospace,Menlo,Consolas,monospace);white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-secondary,#a8b4cf)}",
          ".hm-recall-ids{margin-top:6px;font:9px/14px var(--dsw-font-markdown-code-block-small,ui-monospace,Menlo,Consolas,monospace);color:var(--dsw-alias-label-tertiary,#8996b3)}",
          ".hm-recall-fallback{padding:3px 0;font:11px/16px var(--dsw-font-markdown-code-block-small,ui-monospace,Menlo,Consolas,monospace);color:var(--dsw-alias-label-tertiary,#8996b3);white-space:pre-wrap}",
          /* responsive */
          "@media (max-width:880px){.hm-columns{grid-template-columns:minmax(0,1fr)}.hm-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.hm-hero{align-items:flex-start}.hm-total-box{text-align:left}}",
          "@media (max-width:520px){.hm-config-grid{grid-template-columns:minmax(0,1fr)}.hm-hero{padding:16px}.hm-hero h2{font-size:20px}.hm-hero-side{align-items:flex-start;gap:8px}}",
          /* unified workbench v0.7 */
          ".hm-pane{--hm-surface:var(--dsw-alias-bg-layer-2,#0f182b);--hm-surface2:var(--dsw-alias-bg-layer-3,#142039);--hm-border:var(--dsw-alias-border-l3,#263450);--hm-text:var(--dsw-alias-label-primary,#e8eeff);--hm-sub:var(--dsw-alias-label-secondary,#a8b4cf);--hm-faint:var(--dsw-alias-label-tertiary,#8996b3);--hm-brand:var(--dsw-alias-brand-primary,#5b7cfa);padding:22px clamp(16px,3.6vw,38px) 38px;background:radial-gradient(1100px 420px at 78% -120px,rgba(91,124,250,.13),transparent 65%)}",
          ".hm-shell{max-width:1180px;gap:13px}",
          ".hm-workbench-head{position:relative;display:flex!important;align-items:flex-start;justify-content:space-between;gap:20px;padding:18px 20px!important;border:1px solid rgba(91,124,250,.30)!important;border-radius:16px!important;background:linear-gradient(135deg,rgba(91,124,250,.18),rgba(167,139,250,.07) 45%,transparent 75%),var(--hm-surface2)!important;box-shadow:0 12px 34px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.05)!important;overflow:hidden}",
          ".hm-workbench-head:before{content:'';position:absolute;right:-100px;top:-160px;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(91,124,250,.26),transparent 68%);pointer-events:none}",
          ".hm-brand{position:relative;z-index:1;display:flex;align-items:flex-start;gap:12px;min-width:0}",
          ".hm-brand-mark{width:38px;height:38px;flex:0 0 auto;display:grid;place-items:center;border-radius:11px;color:#fff;background:linear-gradient(145deg,#647dfb,#9b8cff);box-shadow:0 6px 18px rgba(91,124,250,.36),inset 0 1px 0 rgba(255,255,255,.18)}",
          ".hm-brand-copy{min-width:0}",
          ".hm-eyebrow{display:flex;align-items:center;gap:7px;font-size:9px;line-height:14px;font-weight:650;letter-spacing:.16em;text-transform:uppercase;color:var(--hm-cyan)}",
          ".hm-eyebrow:before{content:'';width:14px;height:1px;background:var(--hm-cyan);opacity:.8}",
          ".hm-brand-copy h1{margin:3px 0 3px;font-size:21px;line-height:28px;font-weight:650;letter-spacing:-.015em}",
          ".hm-brand-copy p{margin:0;font-size:11px;line-height:17px;color:var(--hm-sub)}",
          ".hm-head-actions{position:relative;z-index:1;display:flex;flex-direction:column;align-items:flex-end;gap:9px;flex:0 0 auto}",
          ".hm-pill-row{display:flex;align-items:center;justify-content:flex-end;gap:5px;flex-wrap:wrap;max-width:460px}",
          ".hm-pill{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 8px;border:.5px solid var(--hm-border);border-radius:999px;background:rgba(255,255,255,.025);color:var(--hm-faint);font-size:9.5px;line-height:22px;white-space:nowrap}",
          ".hm-pill b{color:var(--hm-text);font-weight:600;font-variant-numeric:tabular-nums}",
          ".hm-pill-dot{width:5px;height:5px;border-radius:50%;background:var(--hm-green);box-shadow:0 0 0 3px rgba(74,222,128,.1)}",
          ".hm-pill-dot.hm-amber{background:var(--hm-amber);box-shadow:0 0 0 3px rgba(245,184,76,.1)}",
          ".hm-pill-dot.hm-red{background:var(--hm-red);box-shadow:0 0 0 3px rgba(248,113,113,.1)}",
          ".hm-workbench-nav{display:flex;align-items:center;gap:3px;padding:4px;border:.5px solid var(--hm-border);border-radius:12px;background:rgba(10,16,30,.35);overflow:auto}",
          ".hm-nav-item{display:inline-flex;align-items:center;gap:6px;height:31px;padding:0 11px;border:0;border-radius:8px;background:transparent;color:var(--hm-faint);font-family:inherit;font-size:11px;line-height:29px;white-space:nowrap;cursor:pointer;transition:background .15s,color .15s}",
          ".hm-nav-item:hover{color:var(--hm-text);background:rgba(255,255,255,.045)}",
          ".hm-nav-item.hm-nav-on{color:var(--hm-text);background:rgba(91,124,250,.16);box-shadow:inset 0 0 0 .5px rgba(91,124,250,.35)}",
          ".hm-nav-item svg{opacity:.9}",
          ".hm-nav-count{min-width:16px;padding:0 5px;border-radius:5px;background:rgba(255,255,255,.06);color:var(--hm-faint);font-size:9px;line-height:15px;text-align:center;font-variant-numeric:tabular-nums}",
          ".hm-nav-item.hm-nav-on .hm-nav-count{color:var(--hm-sub);background:rgba(91,124,250,.15)}",
          ".hm-page{display:flex;flex-direction:column;gap:12px;min-width:0}",
          ".hm-page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:2px 2px 0}",
          ".hm-page-title{display:flex;align-items:center;gap:8px;font-size:15px;line-height:21px;font-weight:620;letter-spacing:-.01em}",
          ".hm-page-title svg{color:var(--hm-brand)}",
          ".hm-page-sub{margin-top:2px;font-size:10px;line-height:15px;color:var(--hm-faint)}",
          ".hm-page-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}",
          ".hm-metrics{grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}",
          ".hm-metric{padding:12px 13px;border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,.018),transparent),var(--hm-surface)}",
          ".hm-metric-icon{width:28px;height:28px;border-radius:8px}",
          ".hm-metric-value{font-size:20px;line-height:24px}",
          ".hm-metric-label{font-size:9px;line-height:13px}",
          ".hm-panel{border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,.012),transparent),var(--hm-surface);box-shadow:0 1px 0 rgba(255,255,255,.015) inset}",
          ".hm-panel-head{padding:12px 14px 9px}",
          ".hm-panel-title{font-size:12px;line-height:17px}",
          ".hm-panel-body{padding:0 14px 13px}",
          ".hm-columns{gap:11px;grid-template-columns:minmax(0,1.55fr) minmax(280px,1fr)}",
          ".hm-col-main,.hm-col-side{gap:11px}",
          ".hm-profile-hero{display:flex;align-items:flex-start;gap:12px;padding:15px 16px;border:.5px solid var(--hm-border);border-radius:12px;background:linear-gradient(135deg,rgba(91,124,250,.11),rgba(167,139,250,.04),transparent),var(--hm-surface)}",
          ".hm-profile-avatar{width:34px;height:34px;flex:0 0 auto;display:grid;place-items:center;border-radius:10px;background:rgba(91,124,250,.16);color:var(--hm-brand)}",
          ".hm-profile-copy{min-width:0;flex:1 1 auto}",
          ".hm-profile-copy h3{margin:0 0 3px;font-size:14px;line-height:20px;font-weight:620}",
          ".hm-profile-copy p{margin:0;font-size:10.5px;line-height:17px;color:var(--hm-sub)}",
          ".hm-profile-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px}",
          ".hm-profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}",
          ".hm-profile-card .hm-panel-body{padding-top:1px}",
          ".hm-profile-list{display:flex;flex-direction:column;gap:7px}",
          ".hm-profile-line{position:relative;padding:7px 9px 7px 12px;border-radius:7px;background:rgba(255,255,255,.022);font-size:10.5px;line-height:17px;color:var(--hm-sub);white-space:pre-wrap;word-break:break-word}",
          ".hm-profile-line:before{content:'';position:absolute;left:0;top:9px;bottom:9px;width:2px;border-radius:9px;background:rgba(91,124,250,.55)}",
          ".hm-profile-empty{padding:18px 12px;border:.5px dashed var(--hm-border);border-radius:9px;color:var(--hm-faint);font-size:10.5px;line-height:17px;text-align:center}",
          ".hm-neuron-page{display:flex;flex-direction:column;gap:11px}",
          ".hm-neuron-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}",
          ".hm-neuron-card{padding:12px 13px;border:.5px solid var(--hm-border);border-radius:12px;background:var(--hm-surface)}",
          ".hm-neuron-num{font-size:20px;line-height:24px}",
          ".hm-neuron-panel{padding:0;border:.5px solid var(--hm-border);border-radius:12px;background:var(--hm-surface);overflow:hidden}",
          ".hm-neuron-panel-title{padding:12px 14px 9px;margin:0;font-size:12px;line-height:17px;border-bottom:.5px solid var(--hm-border)}",
          ".hm-neuron-panel>.hm-neuron-note{padding:11px 14px 13px}",
          ".hm-neuron-panel>.hm-neuron-note~.hm-neuron-note{padding-top:0}",
          ".hm-neuron-note{font-size:10px;line-height:16px;color:var(--hm-faint)}",
          ".hm-neuron-entity{padding:6px 14px;border-bottom:.5px solid rgba(255,255,255,.035)}",
          ".hm-neuron-bar{display:block;flex:0 0 76px;height:4px;border-radius:99px;background:linear-gradient(90deg,#5b7cfa,#a78bfa);margin-top:0}",
          ".hm-neuron-entity:last-child{border-bottom:0}",
          ".hm-neuron-sample{padding:6px 14px;border-bottom:.5px solid rgba(255,255,255,.035);font-size:10px;line-height:16px;color:var(--hm-sub)}",
          ".hm-neuron-sample:last-child{border-bottom:0}",
          ".hm-neuron-badge{display:inline-flex;align-items:center;gap:4px;padding:1px 6px;border-radius:5px;background:rgba(91,124,250,.14);color:#b8c5ff;font-size:8.5px;line-height:15px;font-weight:650;letter-spacing:.05em}",
          ".hm-empty{padding:24px 14px;border-radius:10px;background:rgba(255,255,255,.012)}",
          ".hm-btn{height:28px;line-height:26px;border-radius:7px;font-size:10px}",
          ".hm-btn-primary{font-size:10px}",
          ".hm-workbench-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:2px 2px 0;color:var(--hm-faint);font-size:9px;line-height:14px}",
          ".hm-workbench-foot code{font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--hm-sub)}",
          "@media (max-width:980px){.hm-head-actions{align-items:flex-start}.hm-workbench-head{flex-direction:column}.hm-pill-row{justify-content:flex-start;max-width:none}}",
          "@media (max-width:880px){.hm-profile-grid{grid-template-columns:minmax(0,1fr)}.hm-neuron-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hm-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.hm-workbench-nav{overflow-x:auto}.hm-page-head{align-items:flex-start;flex-direction:column}}",
          "@media (max-width:520px){.hm-neuron-grid{grid-template-columns:minmax(0,1fr)}.hm-brand-copy h1{font-size:19px}.hm-workbench-head{padding:15px}.hm-head-actions{width:100%}.hm-pill-row{max-width:none}}",
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
          chevron: ["m6 9 6 6 6-6"],
          user: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4 21a8 8 0 0 1 16 0"],
          sliders: ["M4 7h10", "M18 7h2", "M14 7v0", "M4 17h2", "M10 17h10", "M8 4v6", "M16 14v6"],
          network: ["M12 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z", "M5 15a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z", "M19 15a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z", "m10.8 8.5-4.3 5.8", "m13.2 8.5 4.3 5.8", "M7.5 17.5h9"],
          share: ["M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "m8.6 13.5 6.8 3.9", "m15.4 6.6-6.8 3.9"],
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
          var evidenceText = {
            source: "逐字源",
            pointer: "仅指针",
            manual: "手写",
            summary: "摘要",
          }[record.evidence] || "摘要";
          var sourceTitle = record.source
            ? "session " + shortId(record.source.sessionId || "") + " · turn " + (record.source.turn || "?") +
              (record.source.seqStart ? " · seq " + record.source.seqStart + "–" + (record.source.seqEnd || record.source.seqStart) : "")
            : "没有来源指针";
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
              h("span", null, "引用 ", h("b", null, record.citedCount || 0)),
              h("span", null, "·"),
              h("span", { title: sourceTitle }, "证据 ", evidenceText),
              record.revision > 0 ? h("span", null, "·") : null,
              record.revision > 0 ? h("span", null, "rev ", record.revision, record.historyCount ? " · 历史 " + record.historyCount : "") : null,
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

        var RECALL_LABEL = "[长期记忆自动召回 | holo-memory]";
        var originalContext = null;

        function contentText(content) {
          if (typeof content === "string") return content;
          if (!Array.isArray(content)) return "";
          return content
            .map(function (block) { return block && block.type === "text" && typeof block.text === "string" ? block.text : ""; })
            .filter(function (part) { return part.length > 0; })
            .join("\n");
        }

        /** One collapsible work-step row for an automatic memory recall. */
        function MemoryRecallStep(props) {
          var data = props && props.data ? props.data : {};
          var openState = react.useState(false);
          var open = openState[0];
          var setOpen = openState[1];
          var text = typeof data.text === "string" ? data.text : "";
          var query = typeof data.query === "string" ? data.query : "";
          var chars = Number.isFinite(data.chars) ? data.chars : text.length;
          var layers = data.layers || {};
          var selected = Array.isArray(data.selected) ? data.selected : [];
          var active = Number.isFinite(data.active) ? data.active : 0;
          var aProfile = Number.isFinite(data.a) ? data.a : 0;
          // The host text starts with the same label line the header already shows.
          var body = text.replace(/^\[[^\n]*holo-memory[^\n]*\]\s*\n?/i, "").trim();
          var meta = (data.mode === "recent-fallback" ? "兜底 · " : "") +
            (active > 0 ? "主动×" + active + " · " : "") +
            (aProfile > 0 ? "画像×" + aProfile + " · " : "") +
            "L1×" + (layers.l1 || 0) + " L2×" + (layers.l2 || 0) + " L3×" + (layers.l3 || 0) +
            " · " + chars + " 字符";
          return h(
            "div",
            { className: "hm-recall" },
            h(
              "button",
              {
                type: "button",
                className: "hm-recall-head",
                "aria-expanded": open,
                onClick: function () { setOpen(!open); },
              },
              h("span", { className: "hm-recall-icon" }, icon("layers", 14)),
              h("span", { className: "hm-recall-label" }, RECALL_LABEL),
              h("span", { className: "hm-recall-meta" }, meta),
              h("span", { className: "hm-recall-chevron" + (open ? " hm-open" : "") }, icon("chevron", 12)),
            ),
            open
              ? h(
                  "div",
                  { className: "hm-recall-body" },
                  query ? h("div", { className: "hm-recall-query" }, "问题：" + query) : null,
                  h("pre", { className: "hm-recall-text" }, body || text || "(空)"),
                  selected.length > 0
                    ? h(
                        "div",
                        { className: "hm-recall-ids" },
                        "命中：" + selected.map(function (item) {
                          return (item && item.layer ? item.layer.toUpperCase() : "?") + " " + String(item && item.id || "").slice(-8);
                        }).join(" · "),
                      )
                    : null,
                )
              : null,
          );
        }

        /** Replaces the shipped `context` row only for holo-memory messages. */
        function MemoryContextNode(props) {
          var data = props && props.node && props.node.data ? props.node.data : {};
          var source = data.source || {};          if (source.kind === "holo-memory") {
            var text = contentText(data.content);
            return h(MemoryRecallStep, {
              data: {
                text: text,
                query: typeof source.query === "string" ? source.query : "",
                chars: Number.isFinite(source.chars) ? source.chars : text.length,
                mode: source.mode === "recent-fallback" ? "recent-fallback" : "recall",
                active: Number.isFinite(source.active) ? source.active : 0,
                a: Number.isFinite(source.a) ? source.a : 0,
                layers: source.layers && typeof source.layers === "object" ? source.layers : { l1: 0, l2: 0, l3: 0 },
                selected: Array.isArray(source.selected) ? source.selected : [],
              },
            });
          }
          if (originalContext !== null) return h(originalContext, props);
          return h("div", { className: "hm-recall-fallback" }, contentText(data.content));
        }

        /**
         * Capture the shipped `context` renderer first, then replace it. The
         * replacement delegates every non-holo context row to the original.
         */
        function installContextStep(ctx) {
          var installed = false;
          var install = function () {
            if (originalContext !== null || installed) return;
            var entries = typeof ctx.slots.entries === "function"
              ? ctx.slots.entries("conversation.chat.node")
              : typeof ctx.slots.entriesOfSlot === "function"
                ? ctx.slots.entriesOfSlot("conversation.chat.node")
                : [];            var entry = null;
            for (var i = 0; i < entries.length; i += 1) {
              var candidate = entries[i];
              if (candidate && candidate.options && candidate.options.key === "context" && candidate.component !== MemoryContextNode) {
                entry = candidate;
                break;
              }
            }
            if (entry === null) return;
            var previous = entry.component;            // The shipped `context` entry is registered at priority 0. A
            // same-key registration at the same priority is rejected by the
            // keyed slot; a lower priority shadows it and is rendered.
            try {
              ctx.slots.inject("conversation.chat.node", function () {
                try {
                  var registration = ctx.slots.register(
                    { name: "conversation.chat.node", key: "context", priority: -1 },
                    MemoryContextNode,
                  );
                  originalContext = previous;
                  installed = true;                  return registration;
                } catch (error) {
                  originalContext = null;
                  installed = false;
                  if (typeof console !== "undefined" && console.warn) {
                    console.warn("[dsh-holo-memory] recall step registration failed:", error);
                  }
                  return undefined;
                }
              });
            } catch (error) {
              // Keep the shipped renderer and allow the slot subscription to
              // retry on the next registration change.
              originalContext = null;
              installed = false;
              if (typeof console !== "undefined" && console.warn) {
                console.warn("[dsh-holo-memory] recall step registration failed:", error);
              }
            }
          };
          install();
          if (!installed && typeof ctx.slots.subscribe === "function") {
            var dispose = ctx.slots.subscribe("conversation.chat.node", install);
            if (typeof ctx.effect === "function") {
              ctx.effect(function () { return dispose; }, "holo-memory: context node");
            }
          }
        }

        /**
         * DSH 0.2.x renders context messages in the Trajectory surface, which
         * has no per-record extension slot. Fall back to decorating the
         * native context row in-place, without touching React's message data.
         */
        function installRecallDecorator(ctx) {
          if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
          var scheduled = false;
          var decorate = function () {
            scheduled = false;
            var tags = document.querySelectorAll('[data-role-kind="context"]');
            for (var i = 0; i < tags.length; i += 1) {
              var row = tags[i].closest("tr") || tags[i].parentElement;
              if (!row || row.getAttribute("data-hm-recall-decorated") === "1") continue;
              var nodes = row.querySelectorAll("*");
              var target = null;
              for (var j = 0; j < nodes.length; j += 1) {
                var node = nodes[j];
                if (node.children.length === 0 && node.textContent && node.textContent.indexOf(RECALL_LABEL) === 0) {
                  target = node;
                  break;
                }
              }
              if (!target) {
                if (row.textContent && row.textContent.indexOf(RECALL_LABEL) >= 0) target = row;
                else continue;
              }
              var text = target.textContent || "";
              var body = text.replace(/^\[[^\n]*holo-memory[^\n]*\]\s*\n?/i, "").trim();
              target.style.display = "none";
              var details = document.createElement("details");
              details.className = "hm-native-recall";
              var summary = document.createElement("summary");
              summary.textContent = "长期记忆自动召回 | holo-memory · " + text.length + " 字符";
              var pre = document.createElement("div");
              pre.className = "hm-native-recall-body";
              pre.textContent = body;
              details.appendChild(summary);
              details.appendChild(pre);
              target.parentNode.insertBefore(details, target.nextSibling);
              row.setAttribute("data-hm-recall-decorated", "1");
            }
          };
          var schedule = function () {
            if (scheduled) return;
            scheduled = true;
            setTimeout(decorate, 40);
          };
          var observer = new MutationObserver(schedule);
          observer.observe(document.body, { childList: true, subtree: true, characterData: true });
          decorate();
          if (typeof ctx.effect === "function") {
            ctx.effect(function () { return function () { observer.disconnect(); }; }, "holo-memory: recall decorator");
          }
        }

        function installWorkStepRecall(ctx) {
          if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
          var latest = null;
          var fetchedAt = 0;
          var fetching = false;
          var scheduled = false;
          var decorate = function () {
            scheduled = false;
            if (!latest || Date.now() - fetchedAt > 3000) {
              if (fetching) return;
              fetching = true;
              fetchJson("/holo-memory/injections?limit=5")
                .then(function (data) {
                  var events = Array.isArray(data && data.injections) ? data.injections : [];
                  latest = events.find(function (event) { return event && Array.isArray(event.selected) && event.selected.length > 0; }) || null;
                  fetchedAt = Date.now();
                })
                .catch(function () {})
                .finally(function () { fetching = false; schedule(); });
              return;
            }
            var contents = document.querySelectorAll("[data-step-process-content]");
            var target = contents[contents.length - 1];
            if (!target || target.getAttribute("data-hm-workstep") === "1") return;
            var event = latest;
            var details = document.createElement("details");
            details.className = "hm-workstep-recall";
            var summary = document.createElement("summary");
            summary.textContent = "长期记忆自动召回 | holo-memory · " + event.chars + " 字符";
            var body = document.createElement("div");
            body.className = "hm-workstep-recall-body";
            var lines = [
              "query: " + (event.query || ""),
              "chars: " + event.chars + " · layers: L1×" + ((event.layers && event.layers.l1) || 0) + " L2×" + ((event.layers && event.layers.l2) || 0) + " L3×" + ((event.layers && event.layers.l3) || 0),
              "selected:",
            ];
            (event.selected || []).forEach(function (item) {
              lines.push("- " + String(item.id || "").slice(-8) + " · " + item.layer + " · " + ((item.channels || []).join("/") || "unknown") + " · " + item.score);
            });
            body.textContent = lines.join("\n");
            details.appendChild(summary);
            details.appendChild(body);
            target.insertBefore(details, target.firstChild);
            target.setAttribute("data-hm-workstep", "1");
          };
          var schedule = function () {
            if (scheduled) return;
            scheduled = true;
            setTimeout(decorate, 60);
          };
          var observer = new MutationObserver(schedule);
          observer.observe(document.body, { childList: true, subtree: true });
          schedule();
          if (typeof ctx.effect === "function") {
            ctx.effect(function () { return function () { observer.disconnect(); }; }, "holo-memory: work-step recall");
          }
        }

        /**
         * Two compact pills in `conversation.input.left`, right after the
         * JSON-clipboard pill (order 40). They own no state in localStorage:
         * the Host runtime switch is the authority, because injection and
         * extraction happen in the Host process.
         */
        function MemoryToggles() {
          var state = react.useState({ read: true, write: true });
          var toggles = state[0];
          var setToggles = state[1];
          var busyState = react.useState("");
          var busy = busyState[0];
          var setBusy = busyState[1];
          var flashState = react.useState("");
          var flash = flashState[0];
          var setFlash = flashState[1];
          var errorState = react.useState(false);
          var error = errorState[0];
          var setError = errorState[1];
          var busyRef = react.useRef("");
          var flashTimer = react.useRef(0);
          var pollTimer = react.useRef(0);

          var load = react.useCallback(function () {
            fetchJson("/holo-memory/toggles")
              .then(function (data) {
                var value = data && data.toggles;
                if (!value) return;
                setToggles({ read: value.read !== false, write: value.write !== false });
                setError(false);
              })
              .catch(function () { setError(true); });
          }, []);

          react.useEffect(function () {
            load();
            pollTimer.current = window.setInterval(function () {
              if (busyRef.current === "") load();
            }, 6000);
            return function () {
              window.clearInterval(pollTimer.current);
              window.clearTimeout(flashTimer.current);
            };
          }, [load]);

          var toggle = react.useCallback(function (kind) {
            if (busyRef.current !== "") return;
            var next = !toggles[kind];
            var requestBody = {};
            requestBody[kind] = next;
            busyRef.current = kind;
            setBusy(kind);
            setToggles(function (prev) {
              var copy = { read: prev.read, write: prev.write };
              copy[kind] = next;
              return copy;
            });
            fetch("/holo-memory/toggles", {
              method: "POST",
              headers: { "content-type": "application/json", "x-holo-memory": "1" },
              body: JSON.stringify(requestBody),
            })
              .then(function (response) {
                return response.json().catch(function () { return {}; }).then(function (data) {
                  if (!response.ok || !data || data.ok !== true) throw new Error((data && data.error) || ("HTTP " + response.status));
                  return data;
                });
              })
              .then(function (data) {
                if (data.toggles) setToggles({ read: data.toggles.read !== false, write: data.toggles.write !== false });
                setError(false);
                setFlash("ok");
                window.clearTimeout(flashTimer.current);
                flashTimer.current = window.setTimeout(function () { setFlash(""); }, 900);
              })
              .catch(function () {
                setToggles(function (prev) {
                  var copy = { read: prev.read, write: prev.write };
                  copy[kind] = !next;
                  return copy;
                });
                setError(true);
                setFlash("fail");
                window.clearTimeout(flashTimer.current);
                flashTimer.current = window.setTimeout(function () { setFlash(""); }, 1400);
              })
              .finally(function () {
                busyRef.current = "";
                setBusy("");
              });
          }, [toggles]);

          function button(kind, label, title, icon) {
            var on = toggles[kind] !== false;
            return h("button", {
              type: "button",
              className: "hm-tgl-btn",
              "data-on": on ? "1" : "0",
              "data-busy": busy === kind ? "1" : "0",
              "data-flash": flash,
              "data-error": error ? "1" : "0",
              title: title,
              "aria-label": title,
              "aria-pressed": on ? "true" : "false",
              onClick: function () { toggle(kind); },
            },
              icon,
              h("span", null, label),
              h("span", { className: "hm-tgl-dot" }));
          }

          return h("span", { className: "hm-tgl-group" },
            button("read", "读", "自动召回读取全息记忆：开（点击关闭，关闭后上下文不注入记忆）",
              h("svg", { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
                h("path", { d: "M3.5 5.5A8.5 8.5 0 0 1 12 2.5a8.5 8.5 0 0 1 8.5 3v13a8.5 8.5 0 0 0-8.5-3 8.5 8.5 0 0 0-8.5 3z" }),
                h("path", { d: "M12 2.5v16" }))),
            button("write", "写", "自动写入全息记忆：开（点击关闭，关闭后不捕获、不蒸馏、不写入）",
              h("svg", { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
                h("path", { d: "M12 20h9" }),
                h("path", { d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" }))));
        }

        function HoloMemoryPane() {
          var recordsState = react.useState([]);
          var records = recordsState[0];
          var setRecords = recordsState[1];
          var statsState = react.useState(null);
          var stats = statsState[0];
          var setStats = statsState[1];
          var neuronState = react.useState(null);
          var neuron = neuronState[0];
          var setNeuron = neuronState[1];
          var profileState = react.useState(null);
          var profile = profileState[0];
          var setProfile = profileState[1];
          var viewState = react.useState("memory");
          var view = viewState[0];
          var setView = viewState[1];
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
          var doctorState = react.useState(null);
          var doctor = doctorState[0];
          var setDoctor = doctorState[1];
          var doctorBusyState = react.useState(false);
          var doctorBusy = doctorBusyState[0];
          var setDoctorBusy = doctorBusyState[1];
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
              fetchJson("/holo-memory/neuron").catch(function () { return { ok: false, available: false }; }),
              fetchJson("/holo-memory/profile").catch(function () { return { ok: false, profile: null }; }),
            ])
              .then(function (values) {
                setStats(values[0]);
                setRecords(values[1].records || []);
                setInjections(values[2].injections || []);
                var cfg = values[3].config || null;
                setConfig(cfg);
                setNeuron(values[4] || { ok: false, available: false });
                setProfile(values[5] || { ok: false, profile: null });
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

          var runDoctor = function () {
            setDoctorBusy(true);
            fetchJson("/holo-memory/doctor?deep=1")
              .then(function (data) { setDoctor(data); })
              .catch(function (err) { setError(String(err && err.message ? err.message : err)); })
              .finally(function () { setDoctorBusy(false); });
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
                statusRow("证据链", "shield", (stats && stats.source ? stats.source.coverage : 0) + "%", " · 逐字 " + (stats && stats.source ? stats.source.backed : 0)),
                statusRow("引用回写", "chat", (stats && stats.citation ? stats.citation.injected : 0) + " 条注入", " · " + (stats && stats.citation ? stats.citation.cited : 0) + " 条被引用"),
                statusRow("自动召回", "layers", h("b", null, "开"), " · " + (stats && stats.inject ? stats.inject.maxChars : 0) + " 字符"),
                statusRow("蒸馏", "sparkles", stats && stats.extract && stats.extract.enabled ? h("b", null, "开") : "关闭"),
              ),
              h("div", { className: "hm-meter" }, h("span", { style: { width: embeddedPct + "%" } })),
              note ? h("div", { className: "hm-status", style: { marginTop: "8px", color: "var(--hm-green)" } }, note) : null,
            ),
          );

          var doctorChecks = doctor && doctor.checks ? doctor.checks : [];
          var doctorProblems = doctorChecks.filter(function (check) { return check.level === "warn" || check.level === "error"; });
          var doctorPanel = h(
            "section",
            { className: "hm-panel" },
            h(
              "div",
              { className: "hm-panel-head" },
              h("div", { className: "hm-panel-title" }, icon("shield", 14), "记忆体检"),
              h("span", { className: "hm-panel-meta" }, doctor ? (doctor.ok ? "PASS" : "FAIL") : "未运行"),
            ),
            h(
              "div",
              { className: "hm-panel-body" },
              h(
                "div",
                { className: "hm-status-list" },
                h(
                  "div",
                  { className: "hm-status-row" },
                  h("span", { className: "hm-status-label" }, "检查"),
                  h("span", { className: "hm-status-value" },
                    doctor
                      ? h("b", null, doctor.summary.ok + " 通过 · " + doctor.summary.warn + " 警告 · " + doctor.summary.error + " 错误 · " + doctor.summary.skip + " 跳过")
                      : "点“运行体检”做快速检查；深检会真打开一条来源并跑一次召回"),
                ),
                doctorProblems.slice(0, 8).map(function (check) {
                  return h(
                    "div",
                    { className: "hm-status-row", key: check.id },
                    h("span", { className: "hm-status-label" }, check.title),
                    h("span", { className: "hm-status-value hm-status-" + (check.level === "error" ? "err" : "warn"), title: check.detail }, check.detail),
                  );
                }),
              ),
              h(
                "div",
                { className: "hm-config-actions", style: { marginTop: "10px" } },
                h("button", { className: "hm-btn", onClick: runDoctor, disabled: doctorBusy }, doctorBusy ? "体检中…" : "运行体检"),
                h("span", { className: "hm-status hm-status-work" }, "深检：打开一条原文 + 词法召回探针"),
              ),
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
                            "L1×" + event.layers.l1 + "  L2×" + event.layers.l2 + "  L3×" + event.layers.l3 +
                              (event.active > 0 ? "  主动×" + event.active : "") + "  ·  " + event.chars + " 字符",
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

          var neuronAvailable = Boolean(neuron && neuron.available && neuron.stats);
          var neuronStats = neuronAvailable ? neuron.stats : null;
          var neuronTop = neuronAvailable && Array.isArray(neuron.topEntities) ? neuron.topEntities : [];
          var neuronSamples = neuronAvailable && Array.isArray(neuron.sampleMemories) ? neuron.sampleMemories : [];
          var neuronMaxDegree = neuronAvailable ? Math.max(1, neuron.maxDegree || 0) : 1;
          var aProfile = profile && profile.profile ? profile.profile : null;

          var pageHead = function (title, subtitle, actions, iconName) {
            return h(
              "div",
              { className: "hm-page-head" },
              h(
                "div",
                null,
                h("div", { className: "hm-page-title" }, icon(iconName || "layers", 15), title),
                subtitle ? h("div", { className: "hm-page-sub" }, subtitle) : null,
              ),
              actions && actions.length > 0 ? h("div", { className: "hm-page-actions" }, actions) : null,
            );
          };
          var pill = function (label, value, tone) {
            return h(
              "span",
              { className: "hm-pill" },
              h("span", { className: "hm-pill-dot" + (tone ? " hm-" + tone : "") }),
              label,
              h("b", null, value),
            );
          };
          var simplePanel = function (title, iconName, meta, body) {
            return h(
              "section",
              { className: "hm-panel" },
              h(
                "div",
                { className: "hm-panel-head" },
                h("div", { className: "hm-panel-title" }, icon(iconName || "layers", 14), title),
                meta ? h("span", { className: "hm-panel-meta" }, meta) : null,
              ),
              h("div", { className: "hm-panel-body" }, body),
            );
          };
          var navItem = function (key, label, iconName, count) {
            return h(
              "button",
              {
                key: key,
                className: "hm-nav-item" + (view === key ? " hm-nav-on" : ""),
                onClick: function () { setView(key); },
              },
              icon(iconName, 14),
              h("span", null, label),
              typeof count === "number" ? h("span", { className: "hm-nav-count" }, String(count)) : null,
            );
          };

          var refreshProfile = function () {
            fetchJson("/holo-memory/profile/refresh", {
              method: "POST",
              headers: { "x-holo-memory": "1" },
            }).then(function (value) { setProfile(value); }).catch(function (err) {
              setError(String(err && err.message ? err.message : err));
            });
          };
          var profileCard = function (title, iconName, items, options) {
            var opts = options || {};
            var list = Array.isArray(items) ? items : [];
            return h(
              "section",
              { className: "hm-panel hm-profile-card" },
              h(
                "div",
                { className: "hm-panel-head" },
                h("div", { className: "hm-panel-title" }, icon(iconName || "sparkles", 14), title),
                h("span", { className: "hm-panel-meta" }, String(list.length)),
              ),
              h(
                "div",
                { className: "hm-panel-body" },
                list.length === 0
                  ? h("div", { className: "hm-profile-empty" }, opts.empty || "暂无")
                  : opts.chips
                    ? h("div", { className: "hm-tags" }, list.map(function (item, index) {
                        return h("span", { className: "hm-tag", key: title + "-" + index }, item);
                      }))
                    : h("div", { className: "hm-profile-list" }, list.map(function (item, index) {
                        return h("div", { className: "hm-profile-line", key: title + "-" + index }, item);
                      })),
              ),
            );
          };

          var profilePanel = h(
            "div",
            { className: "hm-page" },
            pageHead(
              "用户画像",
              "从 L1-L3 蒸馏出的稳定偏好、行为习惯、人格与工作方式。低风险事项可默认按此执行；重要抉择仍先询问。",
              [
                h("button", { className: "hm-btn", onClick: refreshProfile }, "重新蒸馏"),
                h("button", { className: "hm-btn", onClick: load, disabled: loading }, loading ? "读取中" : "刷新"),
              ],
              "user",
            ),
            !aProfile
              ? simplePanel("用户画像", "user", null,
                  h("div", { className: "hm-empty" },
                    icon("user", 22),
                    h("div", null, "用户画像还没有内容。"),
                    h("div", null, "先正常对话几轮让它自动蒸馏，或点击“重新蒸馏”从现有 L1-L3 重建。")))
              : h(
                  "div",
                  { className: "hm-page", style: { gap: "11px" } },
                  h(
                    "div",
                    { className: "hm-profile-hero" },
                    h("div", { className: "hm-profile-avatar" }, icon("user", 18)),
                    h(
                      "div",
                      { className: "hm-profile-copy" },
                      h("h3", null, "用户画像 · 偏好与人格"),
                      h("p", null, aProfile.summary || "从 L1-L3 蒸馏出的用户侧画像。"),
                      h(
                        "div",
                        { className: "hm-profile-meta" },
                        h("span", { className: "hm-pill" }, h("span", { className: "hm-pill-dot" }), "证据 ", h("b", null, String((aProfile.evidenceIds || []).length))),
                        h("span", { className: "hm-pill" }, h("span", { className: "hm-pill-dot" }), "版本 ", h("b", null, String(aProfile.revision || 0))),
                        h("span", { className: "hm-pill" }, h("span", { className: "hm-pill-dot" }), "自动执行 ", h("b", null, aProfile.autoApply ? "开" : "关")),
                      ),
                    ),
                  ),
                  h(
                    "div",
                    { className: "hm-profile-grid" },
                    profileCard("偏好偏向", "sparkles", aProfile.preferences),
                    profileCard("行为习惯", "activity", aProfile.habits),
                    profileCard("人格 / 工作方式", "user", aProfile.personality),
                    profileCard("工作风格关键词", "layers", aProfile.workingStyle, { chips: true }),
                    profileCard("重要抉择：先询问", "shield", aProfile.confirmFor),
                    profileCard("证据与状态", "database", [
                      "证据记录 " + ((aProfile.evidenceIds || []).length) + " 条",
                      "画像版本 revision " + (aProfile.revision || 0),
                      "自动执行：" + (aProfile.autoApply ? "开启（仅低风险事项）" : "关闭"),
                      "重要抉择：先咨询用户",
                    ]),
                  ),
                ),
          );

          var neuronPanel = h(
            "div",
            { className: "hm-page" },
            pageHead(
              "神经元记忆",
              "实体关联与扩散激活。只提供候选 holo id，不复制正文，也不自行注入上下文。",
              [pill("节点", neuronAvailable ? String((neuronStats.memoryNodes || 0) + (neuronStats.entityNodes || 0)) : "未加载", neuronAvailable ? "" : "amber")],
              "network",
            ),
            h(
              "div",
              { className: "hm-metrics" },
              metric("memory 节点", neuronAvailable ? neuronStats.memoryNodes : "—", "关联记忆", "#22d3ee", "layers"),
              metric("entity 节点", neuronAvailable ? neuronStats.entityNodes : "—", "实体/标签", "#5b7cfa", "network"),
              metric("边", neuronAvailable ? neuronStats.edges : "—", "mention", "#a78bfa", "share"),
              metric("平均度数", neuronAvailable ? neuronStats.averageDegree : "—", "连接密度", "#4ade80", "activity"),
              metric("最大度数", neuronAvailable ? (neuronStats.maxDegree || 0) : "—", "hub 上限", "#f5b84c", "alert"),
            ),
            !neuronAvailable
              ? simplePanel("未加载", "network", null,
                  h("div", { className: "hm-empty" }, icon("network", 20),
                    h("div", null, "未检测到 dsh-neuron-memory，或该插件未在当前 profile 加载。"),
                    neuron && neuron.reason ? h("div", null, neuron.reason) : null))
              : h(
                  "div",
                  { className: "hm-columns" },
                  h(
                    "div",
                    { className: "hm-col-main" },
                    simplePanel("Top 实体", "database", neuronTop.length + " 个",
                      neuronTop.length === 0
                        ? h("div", { className: "hm-profile-empty" }, "暂无实体节点")
                        : h("div", { className: "hm-profile-list" }, neuronTop.map(function (entity) {
                            return h("div", { className: "hm-status-row", key: entity.label },
                              h("span", { className: "hm-status-label", style: { color: "var(--hm-sub)" } }, entity.label),
                              h("span", { className: "hm-status-value", style: { display: "flex", alignItems: "center", gap: "7px" } },
                                h("span", { className: "hm-neuron-bar", style: { width: Math.max(8, Math.round((entity.degree / neuronMaxDegree) * 100)) + "%" } }),
                                h("span", { style: { fontVariantNumeric: "tabular-nums" } }, String(entity.degree)),
                              ));
                          }))),
                    simplePanel("样本记忆", "layers", neuronSamples.length + " 条",
                      neuronSamples.length === 0
                        ? h("div", { className: "hm-profile-empty" }, "暂无样本记忆")
                        : h("div", { className: "hm-profile-list" }, neuronSamples.map(function (sample) {
                            return h("div", { className: "hm-status-row", key: sample.holoId },
                              h("span", { className: "hm-status-label" }, String(sample.layer || "").toUpperCase(), h("span", { style: { color: "var(--hm-faint)" } }, sample.holoId.slice(-8))),
                              h("span", { className: "hm-status-value", title: sample.label }, sample.label));
                          }))),
                  ),
                  h(
                    "div",
                    { className: "hm-col-side" },
                    simplePanel("按层统计", "layers", null,
                      h("div", { className: "hm-tags" },
                        h("span", { className: "hm-tag" }, "L1 " + ((neuron.byLayer && neuron.byLayer.l1) || 0)),
                        h("span", { className: "hm-tag" }, "L2 " + ((neuron.byLayer && neuron.byLayer.l2) || 0)),
                        h("span", { className: "hm-tag" }, "L3 " + ((neuron.byLayer && neuron.byLayer.l3) || 0)))),
                    simplePanel("说明", "shield", null,
                      h("div", { className: "hm-profile-list" },
                        h("div", { className: "hm-profile-line" }, "神经元只负责联想候选；正文始终回 holo 读取。"),
                        h("div", { className: "hm-profile-line" }, "实体与边来自 holo 记录标签，标签已统一清洗 Markdown/HTML。"),
                        h("div", { className: "hm-profile-line" }, "Top 实体按 degree 排序；hub 过强会触发剪枝与衰减。"))),
                  ),
                ),
          );

          var settingsPage = h(
            "div",
            { className: "hm-page" },
            pageHead(
              "运行与设置",
              "向量模型、运行状态与记忆体检。所有配置只影响 holo 索引，不改写 canonical 记忆正文。",
              [pill("向量", config && config.enabled ? "已启用" : "未启用", config && config.enabled ? "" : "amber")],
              "sliders",
            ),
            h(
              "div",
              { className: "hm-columns" },
              h("div", { className: "hm-col-main" }, configPanel, statusPanel),
              h("div", { className: "hm-col-side" }, doctorPanel),
            ),
          );

          var memoryPage = h(
            "div",
            { className: "hm-page" },
            pageHead(
              "记忆总览",
              "L1 对话摘要、L2 原子事实、L3 全息胶囊，以及最近一次自动召回审计。",
              [pill("records", String(total), "")],
              "layers",
            ),
            h(
              "div",
              { className: "hm-metrics" },
              metric("L1 对话", counts.l1 || 0, "每轮摘要", "#22d3ee", "chat"),
              metric("L2 事实", counts.l2 || 0, "原子事实", "#5b7cfa", "database"),
              metric("L3 全息", counts.l3 || 0, "整体胶囊", "#a78bfa", "sparkles"),
              metric("已向量化", embedded, embeddedPct + "%", "#4ade80", "cpu"),
              metric("占用", (counts.bytes / 1024).toFixed(1) + " KB", "l1/l2/l3.json", "#f5b84c", "box"),
            ),
            h(
              "div",
              { className: "hm-columns" },
              h("div", { className: "hm-col-main" }, memoryPanel),
              h("div", { className: "hm-col-side" }, auditPanel),
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
                { className: "hm-workbench-head", "data-window-drag": "true" },
                h(
                  "div",
                  { className: "hm-brand" },
                  h("div", { className: "hm-brand-mark" }, icon("layers", 20)),
                  h(
                    "div",
                    { className: "hm-brand-copy" },
                    h("div", { className: "hm-eyebrow" }, "Holographic Memory"),
                    h("h1", null, "全息记忆"),
                    h("p", null, "长期记忆工作台 · 分层存储 / 混合召回 / 用户画像 / 联想索引"),
                  ),
                ),
                h(
                  "div",
                  { className: "hm-head-actions" },
                  h(
                    "div",
                    { className: "hm-pill-row" },
                    pill("存储", total + " 条"),
                    pill("向量", embeddedPct + "%", embeddedPct === 100 ? "" : "amber"),
                    pill("画像", aProfile ? "已生成" : "待生成", aProfile ? "" : "amber"),
                    pill("神经", neuronAvailable ? neuronStats.memoryNodes + " 节点" : "未加载", neuronAvailable ? "" : "amber"),
                  ),
                  h(
                    "button",
                    { className: "hm-btn hm-btn-primary", onClick: load, disabled: loading },
                    h("span", { className: loading ? "hm-spin" : "", style: { display: "inline-flex" } }, icon("refresh", 12)),
                    loading ? "读取中" : "刷新",
                  ),
                ),
              ),
              h(
                "nav",
                { className: "hm-workbench-nav" },
                navItem("memory", "记忆总览", "layers", total),
                navItem("profile", "用户画像", "user"),
                navItem("neuron", "神经元", "network", neuronAvailable ? neuronStats.memoryNodes : undefined),
                navItem("settings", "运行与设置", "sliders"),
              ),
              view === "profile" ? profilePanel : view === "neuron" ? neuronPanel : view === "settings" ? settingsPage : memoryPage,
              h(
                "div",
                { className: "hm-workbench-foot" },
                h("span", null, "本地 JSON · ", h("code", { title: stats ? stats.storageDir : "" }, stats ? stats.storageDir : "$DSH_HOME/holo-memory")),
                h("span", null, "自动召回 · 来源可追溯 · 画像只用于低风险默认"),
              ),
            ),
          );
        }


                function HoloMemoryIcon(props) {
          return icon("layers", (props && props.size) || 18);
        }

        function apply(ctx) {
          ensureStyleSheet();
          installContextStep(ctx);
          installRecallDecorator(ctx);
          installWorkStepRecall(ctx);
          ctx.slots.inject("main", function () {
            return ctx.slots.register({ name: "main", key: "holo-memory" }, HoloMemoryPane);
          });
          ctx.slots.inject("sidebar.panellist", function () {
            return ctx.slots.register(
              { name: "sidebar.panellist", id: "holo-memory", order: 10, label: "全息记忆" },
              HoloMemoryIcon,
            );
          });
          ctx.slots.inject("conversation.input.left", function () {
            return ctx.slots.register(
              { name: "conversation.input.left", id: "holo-memory-toggles", order: 41, label: "全息记忆读取/写入开关" },
              MemoryToggles,
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




