#!/usr/bin/env python3
"""Generate the README preview SVGs.

The repository intentionally ships **no screenshots** (they would expose the
author's local memory content). These SVGs are hand-drawn UI mockups with
synthetic example data: they show the layout and the design language without
containing a single byte of real user data.

Run:  python gen_previews.py
Out:  workbench.svg, recall-block.svg, input-toggles.svg (same directory)
"""

from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).resolve().parent

BG = "#0b1220"
PANEL = "#0f182b"
PANEL2 = "#142039"
DEEP = "#0c1526"
BORDER = "#263450"
LINE = "#1b2740"
TEXT = "#e8eeff"
SUB = "#a8b4cf"
FAINT = "#8996b3"
BRAND = "#5b7cfa"
CYAN = "#22d3ee"
VIOLET = "#a78bfa"
GREEN = "#4ade80"
AMBER = "#f5b84c"

SANS = "'Microsoft YaHei','Noto Sans SC','PingFang SC','Segoe UI',sans-serif"
MONO = "'JetBrains Mono','Cascadia Code',Consolas,monospace"


class Svg:
    def __init__(self, w, h, title):
        self.w, self.h = w, h
        self.title = title
        self.parts = []

    def add(self, s):
        self.parts.append("  " + s)

    def rect(self, x, y, w, h, fill, rx=0, stroke=None, sw=1, opacity=None):
        a = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"'
        if stroke:
            a += f' stroke="{stroke}" stroke-width="{sw}"'
        if opacity is not None:
            a += f' opacity="{opacity}"'
        self.add(a + "/>")

    def line(self, x1, y1, x2, y2, stroke=LINE, sw=1):
        self.add(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{sw}"/>')

    def circle(self, cx, cy, r, fill, stroke=None, sw=1):
        a = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"'
        if stroke:
            a += f' stroke="{stroke}" stroke-width="{sw}"'
        self.add(a + "/>")

    def path(self, d, stroke=None, fill="none", sw=1.4, cap="round", join="round", opacity=None):
        a = f'<path d="{d}" fill="{fill}"'
        if stroke:
            a += f' stroke="{stroke}" stroke-width="{sw}" stroke-linecap="{cap}" stroke-linejoin="{join}"'
        if opacity is not None:
            a += f' opacity="{opacity}"'
        self.add(a + "/>")

    def text(self, x, y, s, size=12, fill=TEXT, weight=400, anchor="start", mono=False, opacity=None, spacing=None):
        fam = MONO if mono else SANS
        a = (f'<text x="{x}" y="{y}" font-family="{fam}" font-size="{size}" '
             f'fill="{fill}" font-weight="{weight}" text-anchor="{anchor}"')
        if opacity is not None:
            a += f' opacity="{opacity}"'
        if spacing:
            a += f' letter-spacing="{spacing}"'
        self.add(a + f'>{escape(s)}</text>')

    def pill(self, x, y, w, h, label, fill, stroke, color, size=11, weight=500, mono=False):
        self.rect(x, y, w, h, fill, rx=h / 2, stroke=stroke)
        self.text(x + w / 2, y + h / 2 + size * 0.36, label, size=size, fill=color,
                  weight=weight, anchor="middle", mono=mono)

    def bar(self, x, y, w, h, pct, fill, track=LINE):
        """Thin progress bar."""
        self.rect(x, y, w, h, track, rx=h / 2)
        if pct > 0:
            self.rect(x, y, max(4, w * pct), h, fill, rx=h / 2)

    def glyph(self, x, y, size, color, kind):
        """Small 16x16-ish line icons, drawn in a size box."""
        k = size / 16.0
        def p(d):
            return f'<g transform="translate({x},{y}) scale({k})"><path d="{d}" fill="none" stroke="{color}" stroke-width="{1.5 / k:.2f}" stroke-linecap="round" stroke-linejoin="round"/></g>'
        icons = {
            "layers": "M2 6l6-3 6 3-6 3-6-3Zm0 4l6 3 6-3",
            "user": "M8 8a2.4 2.4 0 1 0 0-4.8A2.4 2.4 0 0 0 8 8Zm-4.5 5c.5-2.2 2.3-3.4 4.5-3.4s4 1.2 4.5 3.4",
            "network": "M8 3.2a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4ZM3.5 10v1.2a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Zm9 0v1.2a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2ZM8 6.8v3.4m-3.4 1.4 2.4-2m4.4 2-2.4-2",
            "sliders": "M3 5h10M3 11h10M6 3v4M10 9v4",
            "refresh": "M13 8a5 5 0 1 1-1.6-3.7M13 3v3h-3",
            "search": "M7 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Zm3.4 1 2.4 2.4",
            "check": "M3 8.4 6.2 11.6 13 4.6",
            "chevron": "M4 6l4 4 4-4",
            "spark": "M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2",
            "attach": "M9.5 5 5.6 9a1.9 1.9 0 0 0 2.7 2.7l4.4-4.4a3.2 3.2 0 0 0-4.5-4.5L3.9 7.1",
            "send": "M3 8h9M8.5 4.5 12 8l-3.5 3.5",
            "db": "M3 4.4c0-1 2.2-1.6 5-1.6s5 .6 5 1.6-2.2 1.6-5 1.6-5-.6-5-1.6Zm0 0v3.2c0 1 2.2 1.6 5 1.6s5-.6 5-1.6V4.4m-10 3.2v3.2c0 1 2.2 1.6 5 1.6s5-.6 5-1.6V7.6",
            "vector": "M3 12 6.5 8l2.6 2.2L13 4",
        }
        self.add(p(icons[kind]))

    def render(self):
        head = (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" '
            f'viewBox="0 0 {self.w} {self.h}" role="img" aria-label="{escape(self.title)}">\n'
            f'  <title>{escape(self.title)}</title>\n'
            f'  <desc>Synthetic UI mockup with example data; contains no real memory content.</desc>\n'
            f'  <rect width="{self.w}" height="{self.h}" fill="{BG}"/>\n'
        )
        self.parts.insert(0, head)
        return "\n".join(self.parts) + "\n</svg>\n"


def accent_for(layer):
    return {"L1": CYAN, "L2": BRAND, "L3": VIOLET, "向量": GREEN, "画像": AMBER}.get(layer, SUB)


# ---------------------------------------------------------------- workbench
def workbench():
    s = Svg(1280, 860, "全息记忆工作台 0.7.0 界面示意图")

    # frame
    s.rect(1, 1, 1278, 858, BG, rx=18, stroke=BORDER)

    # header
    s.rect(40, 32, 46, 46, "url(#brand)", rx=13)
    s.glyph(55, 47, 16, "#ffffff", "layers")
    s.text(100, 55, "全息记忆工作台", 20, TEXT, 700)
    s.text(100, 76, "分层存储 · 混合召回 · 用户画像 · 联想索引", 11.5, FAINT)
    s.circle(1074, 55, 4, GREEN)
    s.pill(1060, 40, 96, 30, "运行中", "#12203a", "#2b4a3e", "#b8f0c8", 11.5)
    s.pill(1168, 40, 72, 30, "示例数据", "#1a2340", BORDER, FAINT, 11)

    # nav
    tabs = [("记忆总览", "layers", "1,284", True), ("用户画像", "user", "12", False),
            ("神经元", "network", "573", False), ("运行与设置", "sliders", "", False)]
    x = 40
    for label, icon, badge, active in tabs:
        w = 158 if badge == "" else 140
        fill = "#182545" if active else PANEL
        stroke = "#3d5bb8" if active else BORDER
        color = TEXT if active else SUB
        s.rect(x, 100, w, 38, fill, rx=10, stroke=stroke)
        s.glyph(x + 14, 111, 16, BRAND if active else FAINT, icon)
        s.text(x + 40, 124, label, 12.5, color, 600 if active else 500)
        if badge:
            bw = 44
            s.rect(x + w - bw - 10, 110, bw, 18, "#22315a" if active else "#1a2340", rx=9)
            s.text(x + w - bw / 2 - 10, 123, badge, 10.5, "#9fb4e8" if active else FAINT, 500, "middle", mono=True)
        x += w + 10

    # metric cards
    metrics = [
        ("记忆总数", "1,284", "跨 3 层 · 向量覆盖 92%", None, BRAND),
        ("L1 对话层", "742", "回合摘要 · 最近 14 天", 0.58, CYAN),
        ("L2 事实层", "386", "原子事实 · 可回原文", 0.34, BRAND),
        ("L3 胶囊层", "156", "整体印象 · 长期", 0.14, VIOLET),
    ]
    x = 40
    for label, value, sub, pct, accent in metrics:
        s.rect(x, 158, 292, 98, PANEL, rx=12, stroke=BORDER)
        s.text(x + 16, 183, label, 11.5, FAINT)
        s.text(x + 16, 214, value, 23, TEXT, 700)
        s.text(x + 16, 234, sub, 10.5, FAINT)
        if pct is None:
            # composition bar: three segments
            bx, bw = x + 16, 200
            for i, (c, p) in enumerate([(CYAN, .58), (BRAND, .30), (VIOLET, .12)]):
                seg = bw * p
                s.rect(bx, 243, seg - 3, 5, c, rx=2.5)
                bx += seg
        else:
            s.bar(x + 16, 243, 200, 5, pct, accent)
        x += 308

    # left card: memory records
    s.rect(40, 276, 812, 482, PANEL, rx=14, stroke=BORDER)
    s.text(60, 306, "记忆记录", 14, TEXT, 700)
    s.text(60, 324, "最近 5 条 · 按时间倒序", 10.5, FAINT)
    s.rect(660, 288, 172, 30, PANEL2, rx=15, stroke=BORDER)
    s.glyph(674, 295, 16, FAINT, "search")
    s.text(700, 307, "搜索记忆…", 11, FAINT)

    rows = [
        ("L1", "今天 11:42", "整理 0.7.0 工作台改版清单：页头、导航、卡片统一。", "·源"),
        ("L2", "今天 10:15", "偏好：文档标题用中文，代码块统一 text。", "·源"),
        ("L3", "昨天 21:30", "项目节奏：先做评估基线，再改记忆 schema。", "·指针"),
        ("L2", "昨天 18:04", "约定：回复先给结论，再给证据。", "·源"),
        ("L1", "昨天 15:22", "排查向量回填失败，确认是超时问题。", "·手写"),
    ]
    y = 338
    for i, (layer, when, body, ev) in enumerate(rows):
        c = accent_for(layer)
        s.rect(60, y + 12, 34, 20, c, rx=6, opacity=0.14)
        s.text(77, y + 26, layer, 10.5, c, 700, "middle")
        s.text(108, y + 26, body, 12.5, TEXT, 500)
        s.text(108, y + 46, when + " · 会话摘要", 10.5, FAINT)
        s.pill(726, y + 16, 46, 20, ev, "#12203a", "#2b4a3e", "#9fe0b4", 10)
        s.pill(782, y + 16, 50, 20, "核对", "#1a2340", BORDER, FAINT, 10)
        if i < 4:
            s.line(60, y + 68, 812 + 20, y + 68, LINE)
        y += 78

    # right card: recent injections
    s.rect(868, 276, 372, 482, PANEL, rx=14, stroke=BORDER)
    s.text(888, 306, "最近自动召回", 14, TEXT, 700)
    s.text(888, 324, "跨会话注入 · 可回溯来源", 10.5, FAINT)
    s.line(888, 340, 1220, 340, LINE)

    items = [
        ("今天 11:40", "session-8f2c", "这个项目下一步该做什么？", [("L1", 2), ("L2", 4), ("L3", 1)], "注入 1.1K 字符 · 命中 7 条"),
        ("今天 09:12", "session-31a7", "把工作台四个视图的间距再统一一下。", [("L1", 1), ("L2", 3), ("L3", 2)], "注入 860 字符 · 命中 6 条"),
        ("昨天 22:05", "session-c40e", "上次改到哪一步了？", [("L1", 3), ("L2", 2), ("L3", 1)], "注入 1.4K 字符 · 命中 6 条"),
    ]
    y = 356
    for when, sess, query, chips, meta in items:
        s.text(888, y + 14, when, 10.5, FAINT, 500)
        s.text(1218, y + 14, sess, 10, FAINT, 400, "end", mono=True)
        s.text(888, y + 38, query, 12, SUB, 500)
        cx = 888
        for layer, n in chips:
            c = accent_for(layer)
            s.rect(cx, y + 50, 54, 20, c, rx=6, opacity=0.13)
            s.text(cx + 27, y + 64, f"{layer} · {n}", 10, c, 600, "middle")
            cx += 62
        s.text(888, y + 90, meta, 10.5, FAINT)
        y += 134

    # footer
    s.line(40, 782, 1220, 782, LINE)
    s.text(40, 805, "存储：$DSH_HOME/holo-memory", 10.5, FAINT, 400, mono=True)
    s.text(1220, 805, "工作台 0.7.0 · 四视图统一", 10.5, FAINT, 400, "end")

    defs = (
        '  <defs>\n'
        '    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">\n'
        '      <stop offset="0" stop-color="#7b93ff"/>\n'
        '      <stop offset="1" stop-color="#4459d8"/>\n'
        '    </linearGradient>\n'
        '  </defs>\n'
    )
    return s.render().replace("</svg>", defs + "</svg>")


# ---------------------------------------------------------------- recall block
def recall_block():
    s = Svg(1000, 430, "工作步骤里的长期记忆自动召回示意图")
    s.rect(1, 1, 998, 428, BG, rx=16, stroke=BORDER)

    # step header
    s.circle(42, 44, 11, "#123a2a", GREEN, 1.4)
    s.glyph(34, 36, 16, GREEN, "check")
    s.text(62, 49, "已完成 · 工作步骤", 12.5, SUB, 600)
    s.pill(880, 30, 88, 26, "示例数据", "#1a2340", BORDER, FAINT, 10.5)

    # collapsed recall row
    s.rect(24, 72, 952, 40, PANEL2, rx=10, stroke=BORDER)
    s.glyph(42, 84, 16, BRAND, "spark")
    s.text(68, 97, "长期记忆自动召回", 12.5, TEXT, 600)
    s.text(188, 97, "holo-memory", 11, SUB, 400, mono=True)
    s.text(276, 97, "· 1,248 字符", 11, SUB)
    s.glyph(912, 84, 16, FAINT, "chevron")

    # expanded body
    s.rect(24, 122, 952, 250, DEEP, rx=10, stroke=BORDER)
    s.text(44, 150, "query", 10.5, FAINT, 700, mono=True)
    s.text(96, 150, "这个项目下一步该做什么？", 12.5, TEXT, 500)
    s.line(44, 162, 956, 162, LINE)

    s.text(44, 182, "命中", 10.5, FAINT, 700, mono=True)
    cx = 96
    for layer, n in [("L1", 2), ("L2", 4), ("L3", 1), ("向量", 4), ("画像", 1)]:
        c = accent_for(layer)
        s.rect(cx, 166, 66, 22, c, rx=7, opacity=0.13)
        s.text(cx + 33, 181, f"{layer} · {n}", 10.5, c, 600, "middle")
        cx += 74

    s.text(44, 214, "selected", 10.5, FAINT, 700, mono=True)
    s.text(120, 214, "l2:8f3c0d2a  ·  0.82", 11, SUB, 400, mono=True)
    s.text(120, 234, "l3:11be47c9  ·  0.74", 11, SUB, 400, mono=True)
    s.text(120, 254, "l1:9a02e5f1  ·  0.69", 11, SUB, 400, mono=True)

    s.text(44, 284, "channels", 10.5, FAINT, 700, mono=True)
    s.text(120, 284, "lexical · vector · profile", 11, SUB, 400, mono=True)
    s.text(44, 306, "score", 10.5, FAINT, 700, mono=True)
    s.bar(120, 298, 260, 7, 0.78, BRAND)
    s.text(392, 306, "0.78  ·  阈值 0.35", 11, SUB)

    s.line(44, 326, 956, 326, LINE)
    s.text(44, 348, "展开后可看 query、L1/L2/L3 数量、selected id、channels 与 score；轨迹页保留完整召回正文。", 11, FAINT)
    s.text(44, 372, "本图为示意图：内容为合成示例，不含真实记忆数据。", 11, FAINT)
    return s.render()


# ---------------------------------------------------------------- input toggles
def input_toggles():
    s = Svg(1000, 300, "输入框读取与写入双开关示意图")
    s.rect(1, 1, 998, 298, BG, rx=16, stroke=BORDER)

    # composer
    s.rect(40, 44, 920, 150, PANEL, rx=14, stroke=BORDER)
    s.text(64, 82, "给 DeepSeek 发送消息…", 13, FAINT)

    # toolbar row
    s.glyph(64, 148, 20, FAINT, "attach")

    # toggle "读"
    def toggle(x, label, on=True):
        s.text(x, 160, label, 12.5, TEXT, 600)
        tx = x + 22
        s.rect(tx, 143, 44, 24, BRAND if on else "#2a3348", rx=12)
        s.circle(tx + (30 if on else 14), 155, 9, "#ffffff")
        s.text(tx + 52, 159, "开" if on else "关", 11, GREEN if on else FAINT, 500, "start", mono=True)

    toggle(110, "读")
    toggle(216, "写")

    # json + send
    s.rect(760, 140, 78, 30, PANEL2, rx=8, stroke=BORDER)
    s.text(799, 160, "JSON", 11, SUB, 600, "middle", mono=True)
    s.rect(858, 136, 78, 38, BRAND, rx=10)
    s.glyph(886, 147, 16, "#ffffff", "send")

    # legend
    y = 224
    s.text(40, y, "读", 11.5, CYAN, 700)
    s.text(60, y, "关掉后不自动召回、不注入记忆（手动 memory_recall 仍可用）", 11.5, SUB)
    s.text(40, y + 24, "写", 11.5, AMBER, 700)
    s.text(60, y + 24, "关掉后不捕获回合、不蒸馏、不写向量与神经元反馈", 11.5, SUB)
    s.text(40, y + 48, "状态由 Host 持有并持久化：$DSH_HOME/holo-memory/runtime-toggles.json", 11, FAINT, 400, mono=True)
    return s.render()


def main():
    (OUT / "workbench.svg").write_text(workbench(), encoding="utf-8", newline="\n")
    (OUT / "recall-block.svg").write_text(recall_block(), encoding="utf-8", newline="\n")
    (OUT / "input-toggles.svg").write_text(input_toggles(), encoding="utf-8", newline="\n")
    for name in ("workbench.svg", "recall-block.svg", "input-toggles.svg"):
        p = OUT / name
        print(f"wrote {name} {p.stat().st_size} bytes")


if __name__ == "__main__":
    main()
