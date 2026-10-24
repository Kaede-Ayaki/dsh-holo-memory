"""Build the dsh-holo-memory introduction deck (16:9, dark theme).

Deck structure requested by the user:
  01 插件介绍  ·  02 安装方式  ·  03 注意事项
"""
from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt
from lxml import etree

HERE = Path(__file__).resolve().parent
ASSETS = HERE
DOCS = HERE.parent
OUT = DOCS / "dsh-holo-memory-intro.pptx"

# ---------------------------------------------------------------------------
# Design tokens
# ---------------------------------------------------------------------------
SW, SH = 13.333, 7.5
FONT = "Microsoft YaHei"
FONT_EN = "Segoe UI"
FONT_CODE = "Consolas"

TEXT = RGBColor(0xEE, 0xF3, 0xFF)
MUTED = RGBColor(0x93, 0xA1, 0xBF)
FAINT = RGBColor(0x5F, 0x6E, 0x8C)
PANEL = RGBColor(0x0E, 0x17, 0x29)
PANEL2 = RGBColor(0x11, 0x1D, 0x35)
DEEP = RGBColor(0x0B, 0x13, 0x24)
BORDER = RGBColor(0x23, 0x32, 0x55)
ACCENT = RGBColor(0x5B, 0x7C, 0xFA)
BLUE = RGBColor(0x4D, 0x6B, 0xFE)
CYAN = RGBColor(0x3A, 0xD6, 0xE8)
VIOLET = RGBColor(0xA7, 0x8B, 0xFA)
GREEN = RGBColor(0x4A, 0xDE, 0x80)
AMBER = RGBColor(0xF5, 0xB8, 0x4C)
RED = RGBColor(0xF8, 0x71, 0x71)

TOTAL = 14

prs = Presentation()
prs.slide_width = Inches(SW)
prs.slide_height = Inches(SH)
prs.core_properties.title = "dsh-holo-memory — 三层全息记忆"
prs.core_properties.subject = "DeepSeek Harness memory plugin introduction and installation"
prs.core_properties.author = "dsh-holo-memory"


# ---------------------------------------------------------------------------
# Low-level helpers
# ---------------------------------------------------------------------------
def set_run_font(run, name: str, size: float, color: RGBColor, bold: bool = False):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    rpr = run._r.get_or_add_rPr()
    for tag in ("a:ea", "a:cs"):
        node = rpr.find(f"{{http://schemas.openxmlformats.org/drawingml/2006/main}}{tag.split(':')[1]}")
        if node is None:
            node = etree.SubElement(rpr, "{http://schemas.openxmlformats.org/drawingml/2006/main}" + tag.split(":")[1])
        node.set("typeface", name)


def text(
    slide,
    value: str,
    x: float,
    y: float,
    w: float,
    h: float,
    size: float = 14,
    color: RGBColor = TEXT,
    bold: bool = False,
    font: str = FONT,
    align=PP_ALIGN.LEFT,
    anchor=MSO_ANCHOR.TOP,
    line_spacing: float = 1.15,
    space_after: float = 0,
    margin: float = 0,
):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = Inches(margin)
    tf.margin_right = Inches(margin)
    tf.margin_top = Inches(margin)
    tf.margin_bottom = Inches(margin)
    p = tf.paragraphs[0]
    p.alignment = align
    p.line_spacing = line_spacing
    p.space_after = Pt(space_after)
    run = p.add_run()
    run.text = value
    set_run_font(run, font, size, color, bold)
    return box


def rich_text(
    slide,
    runs,
    x: float,
    y: float,
    w: float,
    h: float,
    size: float = 14,
    align=PP_ALIGN.LEFT,
    anchor=MSO_ANCHOR.TOP,
    line_spacing: float = 1.15,
    margin: float = 0,
):
    """runs: list of (value, color, bold, font, size_override)."""
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(margin)
    tf.margin_top = tf.margin_bottom = Inches(margin)
    p = tf.paragraphs[0]
    p.alignment = align
    p.line_spacing = line_spacing
    for value, color, bold, font, size_override in runs:
        r = p.add_run()
        r.text = value
        set_run_font(r, font or FONT, size_override or size, color, bold)
    return box


def rect(
    slide,
    x: float,
    y: float,
    w: float,
    h: float,
    fill: RGBColor | None = PANEL,
    line: RGBColor | None = BORDER,
    line_width: float = 0.8,
    radius: float = 0.06,
    shape=MSO_SHAPE.ROUNDED_RECTANGLE,
):
    shp = slide.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    if shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        shp.adjustments[0] = radius
    if fill is None:
        shp.fill.background()
    else:
        shp.fill.solid()
        shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line
        shp.line.width = Pt(line_width)
    shp.shadow.inherit = False
    return shp


def add_bg(slide, name: str):
    slide.shapes.add_picture(str(ASSETS / name), 0, 0, width=Inches(SW), height=Inches(SH))


def new_slide(bg: str = "bg-content.png"):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide, bg)
    return slide


def kicker(slide, value: str, color: RGBColor = ACCENT):
    text(slide, value, 0.62, 0.42, 8.5, 0.3, size=11, color=color, bold=True, font=FONT_EN)
    rect(slide, 0.64, 0.7, 0.34, 0.035, fill=color, line=None, radius=0)


def title(slide, value: str, size: float = 29):
    text(slide, value, 0.6, 0.78, 12.2, 0.8, size=size, color=TEXT, bold=True)


def footer(slide, idx: int):
    text(slide, "dsh-holo-memory  ·  DeepSeek Harness memory plugin", 0.62, 7.05, 8.5, 0.25, size=9, color=FAINT, font=FONT_EN)
    text(slide, f"{idx:02d} / {TOTAL:02d}", 11.9, 7.02, 0.9, 0.3, size=9.5, color=MUTED, font=FONT_EN, align=PP_ALIGN.RIGHT)


def badge(slide, label: str, x: float, y: float, d: float = 0.42, fill: RGBColor = ACCENT, color: RGBColor = RGBColor(8, 12, 24)):
    shp = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(d), Inches(d))
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    shp.line.fill.background()
    shp.shadow.inherit = False
    tf = shp.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = label
    set_run_font(r, FONT_EN, 11, color, True)


def chip(slide, label: str, x: float, y: float, w: float, color: RGBColor, size: float = 11):
    rect(slide, x, y, w, 0.36, fill=RGBColor(0x0C, 0x14, 0x26), line=color, line_width=0.9, radius=0.5)
    text(slide, label, x, y + 0.055, w, 0.26, size=size, color=color, bold=True, align=PP_ALIGN.CENTER, font=FONT_EN)


def bullet_line(slide, x: float, y: float, w: float, head: str, body: str, color: RGBColor = ACCENT, size: float = 12.5):
    rect(slide, x, y + 0.08, 0.07, 0.07, fill=color, line=None, radius=0, shape=MSO_SHAPE.OVAL)
    rich_text(
        slide,
        [(head, TEXT, True, FONT, size), (body, MUTED, False, FONT, size)],
        x + 0.22,
        y,
        w,
        0.55,
        size=size,
        line_spacing=1.1,
    )


def picture(slide, path: Path, x: float, y: float, w: float, h: float):
    """Add a screenshot with a subtle panel frame behind it."""
    rect(slide, x - 0.08, y - 0.08, w + 0.16, h + 0.16, fill=DEEP, line=BORDER, radius=0.04)
    slide.shapes.add_picture(str(path), Inches(x), Inches(y), width=Inches(w), height=Inches(h))


def section_divider(number: str, heading: str, subtitle: str, points, accent: RGBColor, idx: int):
    s = new_slide("bg-section.png")
    text(s, number, 0.58, 1.35, 3.0, 2.2, size=120, color=RGBColor(0x18, 0x27, 0x46), bold=True, font=FONT_EN)
    text(s, "PART " + number, 0.7, 2.15, 3.5, 0.3, size=11, color=accent, bold=True, font=FONT_EN)
    text(s, heading, 0.66, 2.55, 6.0, 0.85, size=38, color=TEXT, bold=True)
    text(s, subtitle, 0.7, 3.48, 6.4, 0.6, size=15, color=MUTED, line_spacing=1.3)
    for i, (label, body) in enumerate(points):
        y = 4.42 + i * 0.62
        badge(s, f"{i+1}", 0.74, y + 0.03, d=0.34, fill=accent)
        text(s, label, 1.22, y, 2.0, 0.3, size=12, color=TEXT, bold=True)
        text(s, body, 3.2, y - 0.02, 6.0, 0.35, size=11, color=MUTED)
    footer(s, idx)
    return s


# ---------------------------------------------------------------------------
# 01 — Cover
# ---------------------------------------------------------------------------
s = new_slide("bg-cover.png")
text(s, "D E E P S E E K   H A R N E S S   ·   M E M O R Y   P L U G I N", 0.72, 0.55, 9.5, 0.3, size=10.5, color=CYAN, bold=True, font=FONT_EN)
rich_text(
    s,
    [("dsh-", TEXT, True, FONT_EN, 58), ("holo-memory", ACCENT, True, FONT_EN, 58)],
    0.7,
    1.55,
    8.5,
    1.0,
    size=58,
    line_spacing=0.95,
)
text(s, "三层全息记忆", 0.74, 2.62, 7.5, 0.75, size=38, color=TEXT, bold=True)
text(s, "让 agent 跨会话记得你、记得项目、记得做过什么。", 0.76, 3.42, 7.4, 0.4, size=16.5, color=MUTED)
chip(s, "L1 对话层", 0.74, 4.12, 1.55, CYAN)
chip(s, "L2 事实层", 2.43, 4.12, 1.55, ACCENT)
chip(s, "L3 全息层", 4.12, 4.12, 1.55, VIOLET)
text(s, "RRF 三通道召回  ·  Active Window  ·  来源指针  ·  记忆体检", 0.76, 4.78, 8.2, 0.35, size=12.5, color=MUTED)
text(s, "纯本地  ·  可审计  ·  可回取原文  ·  零服务端  ·  v0.4.0", 0.76, 5.2, 8.0, 0.35, size=11, color=FAINT, font=FONT_EN)

# right-side stack
stack_x, stack_y = 9.18, 1.82
stack_data = [
    ("L3", "全息记忆", "整体胶囊", VIOLET, 0.0),
    ("L2", "事实层", "原子事实", ACCENT, 1.12),
    ("L1", "对话层", "每轮摘要", CYAN, 2.24),
]
for label, name, cap, color, dy in stack_data:
    rect(s, stack_x, stack_y + dy, 3.35, 1.02, fill=PANEL, line=color, line_width=1.0, radius=0.12)
    badge(s, label, stack_x + 0.18, stack_y + dy + 0.26, d=0.5, fill=color, color=RGBColor(7, 10, 20))
    text(s, name, stack_x + 0.86, stack_y + dy + 0.17, 1.7, 0.35, size=15.5, color=TEXT, bold=True)
    text(s, cap, stack_x + 0.86, stack_y + dy + 0.53, 1.7, 0.28, size=10.5, color=MUTED)
    text(s, "auto", stack_x + 2.55, stack_y + dy + 0.36, 0.6, 0.3, size=9, color=FAINT, font=FONT_EN, align=PP_ALIGN.RIGHT)

# agenda strip
text(s, "本 次 内 容", 0.76, 6.02, 2.0, 0.28, size=10, color=FAINT, bold=True, font=FONT_EN)
agenda = [("01", "插件介绍", CYAN), ("02", "安装方式", GREEN), ("03", "注意事项", AMBER)]
for i, (num, label, color) in enumerate(agenda):
    x = 2.02 + i * 3.55
    rect(s, x, 5.96, 3.25, 0.5, fill=PANEL, line=BORDER, radius=0.1)
    text(s, num, x + 0.16, 6.03, 0.5, 0.3, size=10, color=color, bold=True, font=FONT_EN)
    text(s, label, x + 0.62, 6.02, 2.2, 0.3, size=12, color=TEXT, bold=True)
text(s, "2026.10  ·  v0.4.0", 0.76, 6.62, 4.0, 0.3, size=10.5, color=FAINT, font=FONT_EN)

# ---------------------------------------------------------------------------
# 02 — Section 01 divider
# ---------------------------------------------------------------------------
section_divider(
    "01",
    "插件介绍",
    "三层记忆、三通道召回、来源可核对，以及为什么这次“看得见”。",
    [
        ("三层记忆", "L1 对话摘要 · L2 原子事实 · L3 整体胶囊"),
        ("混合召回", "RRF 三通道 + Active Window + 引用回写"),
        ("可核对", "来源指针 + memory_open + 记忆体检"),
    ],
    CYAN,
    2,
)

# ---------------------------------------------------------------------------
# 03 — What it does / three layers
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "PLUGIN / WHAT IT DOES")
title(s, "记忆不是数据库，是一条完整闭环")
text(s, "新会话默认是一张白纸；插件把「记录 → 蒸馏 → 召回 → 注入」接了起来。", 0.64, 1.62, 7.2, 0.35, size=12.5, color=MUTED)

layers = [
    ("L1", "对话层", "每轮一条摘要", "用户要什么 · 做了什么 · 结果如何", CYAN),
    ("L2", "事实层", "原子事实，可追溯", "偏好 / 决策 / 约定 / 待办 / 纠正", ACCENT),
    ("L3", "全息层", "跨多轮的整体胶囊", "用户画像 / 项目状态 / 未闭环线索", VIOLET),
]
for i, (code, name, sub, body, color) in enumerate(layers):
    y = 2.12 + i * 1.28
    rect(s, 0.62, y, 7.15, 1.1, fill=PANEL, line=BORDER, radius=0.08)
    rect(s, 0.62, y, 0.08, 1.1, fill=color, line=None, radius=0)
    badge(s, code, 0.88, y + 0.29, d=0.5, fill=color, color=RGBColor(7, 10, 20))
    text(s, name, 1.56, y + 0.14, 2.0, 0.32, size=15.5, color=TEXT, bold=True)
    text(s, sub, 1.56, y + 0.51, 2.5, 0.26, size=10.5, color=color, bold=True)
    text(s, body, 4.05, y + 0.2, 3.45, 0.65, size=11, color=MUTED, line_spacing=1.25)

text(s, "每层都有条数上限；超过上限按重要度与时间淘汰。", 0.64, 6.1, 7.0, 0.3, size=10.5, color=FAINT)

# right pipeline card
px, py = 8.2, 1.75
rect(s, px, py, 4.5, 4.75, fill=DEEP, line=BORDER, radius=0.08)
text(s, "ONE TURN", px + 0.3, py + 0.22, 2.0, 0.28, size=10, color=CYAN, bold=True, font=FONT_EN)
steps = [
    ("01", "捕获", "turn/start · user · assistant · turn/end", CYAN),
    ("02", "蒸馏", "1 次 LLM → 严格 JSON（L1/L2/L3）", ACCENT),
    ("03", "召回", "RRF + Active Window", VIOLET),
    ("04", "注入", "带 id 的 snapshot，≤1400 字符", GREEN),
]
for i, (num, head, body, color) in enumerate(steps):
    y = py + 0.64 + i * 0.93
    badge(s, num, px + 0.28, y + 0.08, d=0.36, fill=color)
    text(s, head, px + 0.78, y, 1.0, 0.3, size=13, color=TEXT, bold=True)
    text(s, body, px + 1.62, y - 0.01, 2.65, 0.55, size=10.2, color=MUTED, line_spacing=1.25)
text(s, "纯本地 JSON · 原子写 · 密钥脱敏", px + 0.3, py + 4.22, 3.9, 0.3, size=10, color=FAINT, font=FONT_EN)
footer(s, 3)

# ---------------------------------------------------------------------------
# 04 — Native plugin, not an MCP server
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "PLUGIN / ARCHITECTURE")
title(s, "不是 MCP 服务，是 DSH 原生插件")
text(s, "不额外起进程、不占端口、不经过 MCP 协议；直接挂进 agent 生命周期。", 0.64, 1.6, 12.2, 0.35, size=12.2, color=MUTED)

# MCP comparison
rect(s, 0.62, 2.08, 7.4, 1.45, fill=PANEL, line=BORDER, radius=0.08)
text(s, "MCP SERVER", 0.9, 2.24, 2.2, 0.25, size=9.5, color=RED, bold=True, font=FONT_EN)
text(s, "独立进程 + 端口 / stdio", 0.9, 2.52, 6.6, 0.32, size=15.5, color=TEXT, bold=True)
text(s, "模型主动调用工具 → 多一跳协议、配置与运维", 0.9, 2.96, 6.7, 0.3, size=10.5, color=MUTED)

rect(s, 0.62, 3.72, 7.4, 1.7, fill=PANEL, line=GREEN, line_width=1.0, radius=0.08)
text(s, "DSH NATIVE PLUGIN", 0.9, 3.9, 3.0, 0.25, size=9.5, color=GREEN, bold=True, font=FONT_EN)
text(s, "进程内插件 + 生命周期钩子", 0.9, 4.18, 6.6, 0.32, size=15.5, color=TEXT, bold=True)
text(s, "agent/pre-step 自动注入；client slot 直接出 UI", 0.9, 4.62, 6.7, 0.3, size=10.5, color=MUTED)
text(s, "无需 mcpServers 配置，也不依赖模型先“想起来”调工具", 0.9, 4.98, 6.7, 0.3, size=9.8, color=FAINT)

# why it matters
px, py = 8.3, 2.08
rect(s, px, py, 4.4, 3.45, fill=DEEP, line=BORDER, radius=0.08)
text(s, "为什么重要", px + 0.28, py + 0.2, 3.0, 0.3, size=12.5, color=CYAN, bold=True)
reasons = [
    ("零额外服务", "无独立进程、无端口"),
    ("自动注入", "不靠模型主动点工具"),
    ("事件完整", "turn + session 钩子"),
    ("UI 原生", "侧边栏 + 工作步骤"),
    ("数据本地", "JSON + 可审计"),
]
for i, (head, body) in enumerate(reasons):
    y = py + 0.65 + i * 0.53
    rect(s, px + 0.28, y + 0.08, 0.07, 0.07, fill=GREEN, line=None, radius=0, shape=MSO_SHAPE.OVAL)
    text(s, head, px + 0.48, y, 1.25, 0.28, size=10.2, color=TEXT, bold=True)
    text(s, body, px + 1.72, y, 2.45, 0.28, size=9.5, color=MUTED)

# bottom note
rect(s, 0.62, 5.62, 12.1, 0.95, fill=RGBColor(0x0C, 0x16, 0x2C), line=ACCENT, line_width=0.9, radius=0.1)
text(s, "MCP 也能做记忆，但要多起一个进程、多一次工具调用；这里把这一跳省掉。", 0.9, 5.8, 11.6, 0.3, size=12, color=TEXT)
text(s, "插件仍暴露 memory_* 工具，但记忆的读写与注入链路本身不依赖 MCP 服务器。", 0.9, 6.13, 11.6, 0.28, size=9.8, color=MUTED)

footer(s, 4)

# ---------------------------------------------------------------------------
# 05 — Retrieval
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "PLUGIN / RETRIEVAL")
title(s, "召回：三条独立通道 + 一个主动窗口")

channels = [
    ("LEXICAL", "BM25 + 中文 bigram", "术语、路径、专名；零依赖永远可用", CYAN),
    ("NGRAM", "字符 2/3-gram", "中文子串、错字、中英混合补位", GREEN),
    ("VECTOR", "Qwen3-Embedding-8B", "4096 维语义；baseline 校准后参与", ACCENT),
]
for i, (tag, name, body, color) in enumerate(channels):
    x = 0.62 + i * 4.06
    rect(s, x, 1.72, 3.86, 1.42, fill=PANEL, line=color, line_width=0.9, radius=0.08)
    text(s, tag, x + 0.22, 1.9, 1.4, 0.25, size=9.5, color=color, bold=True, font=FONT_EN)
    text(s, name, x + 0.22, 2.18, 3.4, 0.32, size=13.5, color=TEXT, bold=True)
    text(s, body, x + 0.22, 2.58, 3.4, 0.4, size=10.2, color=MUTED)

# RRF formula
rect(s, 0.62, 3.38, 7.55, 1.08, fill=DEEP, line=BORDER, radius=0.08)
text(s, "RRF(d)  =  Σ  1 / (60 + rank_c(d))", 0.9, 3.55, 6.9, 0.38, size=16, color=TEXT, font=FONT_CODE)
text(s, "三路排名融合，不把不同量纲的原始分硬相加；同 content_hash 并列。", 0.9, 3.98, 6.9, 0.3, size=10.2, color=MUTED)

# active window card
rect(s, 0.62, 4.66, 3.8, 1.55, fill=PANEL, line=VIOLET, line_width=0.9, radius=0.08)
text(s, "ACTIVE WINDOW", 0.86, 4.82, 2.0, 0.25, size=9.5, color=VIOLET, bold=True, font=FONT_EN)
text(s, "主动补位", 0.86, 5.08, 2.6, 0.3, size=14, color=TEXT, bold=True)
text(s, "高重要度 L2/L3；独立预留 420 字符；query 无命中也带。", 0.86, 5.45, 3.25, 0.55, size=10, color=MUTED, line_spacing=1.25)

# citation card
rect(s, 4.58, 4.66, 3.6, 1.55, fill=PANEL, line=GREEN, line_width=0.9, radius=0.08)
text(s, "CITATION", 4.82, 4.82, 1.6, 0.25, size=9.5, color=GREEN, bold=True, font=FONT_EN)
text(s, "引用回写", 4.82, 5.08, 2.5, 0.3, size=14, color=TEXT, bold=True)
text(s, "每行带 (id:xxxxxxxx)；回答引用后回写 citedCount。", 4.82, 5.45, 3.1, 0.55, size=10, color=MUTED, line_spacing=1.25)

# budget bars
px, py = 8.45, 3.38
rect(s, px, py, 4.25, 2.83, fill=DEEP, line=BORDER, radius=0.08)
text(s, "INJECTION BUDGET", px + 0.26, py + 0.18, 2.4, 0.25, size=9.5, color=CYAN, bold=True, font=FONT_EN)
text(s, "≤ 1400", px + 0.24, py + 0.46, 2.2, 0.55, size=28, color=TEXT, bold=True, font=FONT_EN)
text(s, "字符", px + 1.82, py + 0.72, 0.8, 0.28, size=11, color=MUTED)
bands = [("IMMEDIATE", 0.5, GREEN), ("WORKING", 0.3, ACCENT), ("BACKGROUND", 0.2, FAINT)]
for i, (label, ratio, color) in enumerate(bands):
    y = py + 1.2 + i * 0.42
    text(s, label, px + 0.26, y, 1.35, 0.25, size=9.5, color=color, bold=True, font=FONT_EN)
    rect(s, px + 1.68, y + 0.05, 1.9, 0.14, fill=RGBColor(0x1A, 0x25, 0x3D), line=None, radius=0.5)
    rect(s, px + 1.68, y + 0.05, 1.9 * ratio, 0.14, fill=color, line=None, radius=0.5)
text(s, "band 内按分数保留，active 行优先。", px + 0.26, py + 2.45, 3.6, 0.28, size=9.5, color=FAINT)

footer(s, 5)

# ---------------------------------------------------------------------------
# 05 — UI / work-step visibility
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "PLUGIN / VISIBLE")
title(s, "看得见的记忆：页面 + 工作步骤")
text(s, "侧边栏一级入口进入控制台；每次召回在聊天工作步骤里留一行，点开看正文与命中 id。", 0.64, 1.6, 12.0, 0.35, size=12.2, color=MUTED)

picture(s, DOCS / "ppt" / "console-crop.png", 0.62, 2.02, 5.6, 3.93)
text(s, "01  全息记忆控制台", 0.62, 6.12, 6.0, 0.28, size=10, color=CYAN, bold=True, font=FONT_EN)
text(s, "统计 · 模型配置 · 检测/保存 · 搜索筛选 · 召回审计", 0.62, 6.42, 6.2, 0.25, size=9.2, color=FAINT)

picture(s, DOCS / "recall-step.png", 6.95, 2.05, 4.6, 3.88)
text(s, "02  工作步骤里的召回行", 6.95, 6.12, 5.2, 0.28, size=10, color=GREEN, bold=True, font=FONT_EN)
text(s, "[长期记忆自动召回 | holo-memory]  ·  展开看问题/正文/id", 6.95, 6.42, 5.35, 0.5, size=9.2, color=FAINT, line_spacing=1.25)
footer(s, 6)

# ---------------------------------------------------------------------------
# 07 — Provenance: source pointer + memory_open
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "PLUGIN / PROVENANCE")
title(s, "每条记忆，都能回到原文")
text(s, "摘要只是索引；来源指针才是可核对的那一句。", 0.64, 1.6, 12.0, 0.35, size=12.2, color=MUTED)

rect(s, 0.62, 1.98, 6.15, 2.12, fill=PANEL, line=BORDER, radius=0.08)
text(s, "SOURCE POINTER", 0.9, 2.14, 2.4, 0.25, size=9.5, color=CYAN, bold=True, font=FONT_EN)
text(s, "session / turn / seqStart–seqEnd", 0.9, 2.45, 5.5, 0.32, size=15.5, color=TEXT, bold=True)
text(s, "逐字 excerpt（≤1600 字符，不是二次摘要）", 0.9, 2.86, 5.5, 0.3, size=10.8, color=MUTED)
text(s, "excerptHash：写入后若被悄悄改过，校验会报错", 0.9, 3.2, 5.5, 0.3, size=10.4, color=FAINT)

text(s, "证据等级", 0.64, 4.25, 2.0, 0.28, size=10, color=FAINT, bold=True, font=FONT_EN)
levels = [
    ("·源", "逐字原文", GREEN),
    ("·指针", "仅 session/turn", CYAN),
    ("·手写", "memory_note", VIOLET),
    ("无标记", "仅摘要", MUTED),
]
for i, (label, body, color) in enumerate(levels):
    col, row = i % 2, i // 2
    x = 0.62 + col * 3.0
    y = 4.55 + row * 0.62
    rect(s, x, y, 2.86, 0.52, fill=PANEL, line=color, line_width=0.8, radius=0.08)
    text(s, label, x + 0.16, y + 0.06, 0.95, 0.25, size=11, color=color, bold=True, font=FONT_EN)
    text(s, body, x + 0.95, y + 0.09, 1.8, 0.25, size=9.2, color=MUTED)

px, py = 7.05, 1.98
rect(s, px, py, 5.5, 3.55, fill=DEEP, line=GREEN, line_width=0.9, radius=0.08)
text(s, "MEMORY_OPEN", px + 0.28, py + 0.2, 2.2, 0.25, size=9.5, color=GREEN, bold=True, font=FONT_EN)
text(s, 'memory_open("91ec8d6a")', px + 0.28, py + 0.52, 4.9, 0.3, size=11.5, color=TEXT, font=FONT_CODE)
lines = [
    ("source:", " session … · turn 7 · seq 41–57"),
    ("evidence:", " verbatim excerpt (hash verified)"),
    ("---", ""),
    ("[user]", " 记住：部署目标是 Windows…"),
    ("[assistant]", " 好的，已记录这个约定。"),
    ("history=true", " → rev 1 / rev 0"),
]
for i, (head, body) in enumerate(lines):
    y = py + 1.0 + i * 0.36
    text(s, head, px + 0.28, y, 1.35, 0.26, size=9.5, color=CYAN if head in ("source:", "evidence:") else FAINT, font=FONT_CODE)
    text(s, body, px + 1.55, y, 3.7, 0.26, size=9.2, color=MUTED, font=FONT_CODE)

rect(s, 0.62, 6.0, 12.1, 0.72, fill=RGBColor(0x0C, 0x16, 0x2C), line=ACCENT, line_width=0.9, radius=0.1)
text(s, "旧记录 = ·指针（没有逐字片段）；新记录 = ·源；拿不到来源就写 unavailable，绝不猜。", 0.9, 6.18, 11.6, 0.32, size=11.5, color=TEXT)

footer(s, 7)

# ---------------------------------------------------------------------------
# 08 — Doctor + revision history
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "PLUGIN / OBSERVABILITY")
title(s, "会体检，也会留痕")
text(s, "医生真取一次；修正只增不盖。", 0.64, 1.6, 12.0, 0.35, size=12.2, color=MUTED)

px, py = 0.62, 1.98
rect(s, px, py, 6.3, 3.78, fill=PANEL, line=BORDER, radius=0.08)
text(s, "MEMORY_DOCTOR", px + 0.25, py + 0.2, 2.6, 0.25, size=9.5, color=CYAN, bold=True, font=FONT_EN)
text(s, "快检 9 项 · 深检 2 项", px + 0.25, py + 0.5, 3.2, 0.3, size=15, color=TEXT, bold=True)
checks = [
    "存储可读", "来源覆盖", "原文哈希",
    "向量覆盖", "重复内容", "引用回写",
    "召回审计", "阈值合法", "体检器自检",
]
for i, label in enumerate(checks):
    col, row = i % 3, i // 3
    x = px + 0.25 + col * 1.95
    y = py + 1.0 + row * 0.5
    rect(s, x, y + 0.07, 0.07, 0.07, fill=GREEN, line=None, radius=0, shape=MSO_SHAPE.OVAL)
    text(s, label, x + 0.18, y, 1.65, 0.26, size=9.8, color=MUTED)
text(s, "deep：真打开一条来源 + 跑一次词法召回探针", px + 0.25, py + 2.6, 5.7, 0.3, size=10.2, color=GREEN)
text(s, "PASS · 9 ok / 0 warn / 0 error", px + 0.25, py + 3.05, 4.8, 0.35, size=13, color=GREEN, bold=True, font=FONT_EN)
text(s, "配置看起来对，不算通过。", px + 0.25, py + 3.42, 4.8, 0.25, size=9.5, color=FAINT)

rx, ry = 7.2, 1.98
rect(s, rx, ry, 5.35, 3.78, fill=PANEL, line=VIOLET, line_width=0.9, radius=0.08)
text(s, "REVISION", rx + 0.26, ry + 0.2, 2.0, 0.25, size=9.5, color=VIOLET, bold=True, font=FONT_EN)
text(s, "rev 2", rx + 0.24, ry + 0.48, 2.2, 0.62, size=32, color=TEXT, bold=True, font=FONT_EN)
text(s, "history 1 · 最多保留 20 条", rx + 0.26, ry + 1.17, 4.4, 0.28, size=10, color=MUTED)
revision_lines = [
    ("01", "L2 修正：旧文本进 history", VIOLET),
    ("02", "revision 递增，不静默覆盖", ACCENT),
    ("03", "memory_open(history=true) 回看", GREEN),
]
for i, (num, body, color) in enumerate(revision_lines):
    y = ry + 1.65 + i * 0.55
    badge(s, num, rx + 0.26, y, d=0.3, fill=color)
    text(s, body, rx + 0.72, y - 0.02, 4.2, 0.3, size=9.8, color=MUTED)
text(s, "修正不是覆盖，是留痕。", rx + 0.26, ry + 3.36, 4.2, 0.28, size=10.2, color=VIOLET)

footer(s, 8)

# ---------------------------------------------------------------------------
# 09 — Section 02 divider
# ---------------------------------------------------------------------------
section_divider(
    "02",
    "安装方式",
    "从源码到可用：构建、安装、重启、验证。",
    [
        ("准备", "DSH Desktop 0.2.1-rc.1+ · Node ≥ 22.19"),
        ("安装", "设置 → 插件 → 添加插件 → 本地目录"),
        ("配置", "可选向量模型；不配也能用词法召回"),
    ],
    GREEN,
    9,
)

# ---------------------------------------------------------------------------
# 07 — Install steps
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "INSTALL / 4 STEPS")
title(s, "安装：四步，最后一定要重启")

steps = [
    ("01", "准备环境", "DSH Desktop 0.2.1-rc.1+；Node.js ≥ 22.19；不需要 Python/数据库。", CYAN),
    ("02", "构建插件", "npm install  →  npm run build  →  npm test（可选）。", ACCENT),
    ("03", "安装目录", "设置 → 插件 → 添加插件 → 填本地目录，或 web profile 用 dsh plugin add link。", VIOLET),
    ("04", "重启验证", "完全退出并重启 DSH；新会话问一个只有记忆知道的问题。", GREEN),
]
for i, (num, head, body, color) in enumerate(steps):
    y = 1.72 + i * 1.1
    rect(s, 0.62, y, 8.05, 0.92, fill=PANEL, line=BORDER, radius=0.08)
    badge(s, num, 0.86, y + 0.21, d=0.46, fill=color, color=RGBColor(7, 10, 20))
    text(s, head, 1.48, y + 0.12, 1.8, 0.3, size=14.5, color=TEXT, bold=True)
    text(s, body, 1.48, y + 0.5, 6.7, 0.3, size=10.8, color=MUTED)

# right code / paths
px, py = 9.0, 1.72
rect(s, px, py, 3.7, 4.55, fill=DEEP, line=BORDER, radius=0.08)
text(s, "LOCAL BUILD", px + 0.24, py + 0.2, 2.2, 0.25, size=9.5, color=FAINT, bold=True, font=FONT_EN)
code = [
    "cd dsh-holo-memory",
    "npm install",
    "npm run build",
    "npm test",
]
for i, line in enumerate(code):
    text(s, line, px + 0.24, py + 0.56 + i * 0.32, 3.25, 0.28, size=10.2, color=TEXT, font=FONT_CODE)
text(s, "DATA", px + 0.24, py + 2.1, 1.0, 0.25, size=9.5, color=FAINT, bold=True, font=FONT_EN)
text(s, "$DSH_HOME/holo-memory/", px + 0.24, py + 2.42, 3.25, 0.28, size=9.8, color=CYAN, font=FONT_CODE)
text(s, "l1.json / l2.json / l3.json / embedding.key", px + 0.24, py + 2.72, 3.25, 0.28, size=8.8, color=MUTED, font=FONT_CODE)
text(s, "DESKTOP", px + 0.24, py + 3.25, 1.1, 0.25, size=9.5, color=FAINT, bold=True, font=FONT_EN)
text(s, "desktop profile 由 Electron 管理；", px + 0.24, py + 3.58, 3.2, 0.28, size=9.2, color=MUTED)
text(s, "用设置页安装，不要用 CLI 改 desktop profile。", px + 0.24, py + 3.86, 3.2, 0.45, size=9.2, color=AMBER, line_spacing=1.25)

text(s, "装完 / 更新后：client 半在启动时加载，刷新页面不够，必须重启 DSH。", 0.64, 6.35, 12.0, 0.3, size=11.2, color=AMBER)
footer(s, 10)

# ---------------------------------------------------------------------------
# 08 — Configure embedding
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "INSTALL / OPTIONAL")
title(s, "配置向量模型（可选，不配也能用）")

# left fields
rect(s, 0.62, 1.7, 6.35, 4.75, fill=PANEL, line=BORDER, radius=0.08)
text(s, "侧边栏 → 全息记忆 → 向量模型配置", 0.9, 1.9, 5.7, 0.32, size=13, color=CYAN, bold=True)
fields = [
    ("供应商 / 接口地址", "https://api.siliconflow.cn/v1", CYAN),
    ("模型", "Qwen/Qwen3-Embedding-8B", ACCENT),
    ("API Key", "已保存；留空保持不变", VIOLET),
    ("维度（可选）", "0 = 用模型默认", GREEN),
]
for i, (label, value, color) in enumerate(fields):
    y = 2.38 + i * 0.78
    text(s, label, 0.92, y, 1.8, 0.25, size=10, color=FAINT)
    rect(s, 2.75, y - 0.05, 3.95, 0.42, fill=DEEP, line=BORDER, radius=0.06)
    text(s, value, 2.92, y + 0.02, 3.6, 0.28, size=10.2, color=color, font=FONT_CODE)
text(s, "① 检测可用性：请求一次 /embeddings，判断是否向量模型", 0.92, 5.62, 5.8, 0.28, size=10, color=MUTED)
text(s, "② 保存配置：写 embedding.json + embedding.key，立即生效", 0.92, 5.94, 5.8, 0.28, size=10, color=MUTED)
text(s, "已有记录会在后台按新模型重新回填向量。", 0.92, 6.24, 5.8, 0.25, size=9.5, color=FAINT)

# right note
px = 7.35
rect(s, px, 1.7, 5.35, 2.1, fill=DEEP, line=BORDER, radius=0.08)
text(s, "不配向量模型？", px + 0.28, 1.9, 3.2, 0.3, size=13, color=GREEN, bold=True)
text(s, "词法 + 字符 n-gram 仍然可用；只是少了语义召回通道。", px + 0.28, 2.28, 4.75, 0.6, size=10.8, color=MUTED, line_spacing=1.3)
text(s, "API Key 不进 YAML、不进 GET 响应。", px + 0.28, 3.05, 4.75, 0.3, size=9.8, color=AMBER)
rect(s, px, 4.0, 5.35, 1.8, fill=DEEP, line=BORDER, radius=0.08)
text(s, "支持的端点", px + 0.28, 4.2, 3.0, 0.3, size=13, color=CYAN, bold=True)
text(s, "SiliconFlow · OpenAI · 本地 Ollama · 火山方舟 · 任意 OpenAI 兼容 /embeddings", px + 0.28, 4.58, 4.75, 0.8, size=10.5, color=MUTED, line_spacing=1.35)
text(s, "换模型 / 换维度后，旧向量会按 embeddingModel 自动失效并回填。", px + 0.28, 5.4, 4.75, 0.35, size=9.5, color=FAINT)
footer(s, 11)

# ---------------------------------------------------------------------------
# 09 — Section 03 divider
# ---------------------------------------------------------------------------
section_divider(
    "03",
    "注意事项",
    "安全、token、兼容性，以及上线前最容易忽略的细节。",
    [
        ("密钥", "单独文件 0600；不进仓库、不进日志"),
        ("隐私", "记忆是本地明文；embedding 会发查询文本"),
        ("兼容", "DSH 0.2.x；更新后必须重启 client"),
    ],
    AMBER,
    12,
)

# ---------------------------------------------------------------------------
# 10 — Notes / cautions
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "NOTES / BEFORE YOU SHIP")
title(s, "六条底线，先看再装")

notes = [
    ("密钥安全", "embedding.key 单独文件、0600；GET 不返回；不要提交到 Git。", RED),
    ("隐私边界", "记忆是本地明文 JSON；开启 embedding 会把查询文本发给供应商。", AMBER),
    ("Token 预算", "默认注入 ≤1400 字符；active 单独 420；可关 active 或调小。", CYAN),
    ("更新重启", "client 半启动时加载；更新插件后刷新页面不够，要重启 DSH。", GREEN),
    ("异步蒸馏", "turn/end 后异步；headless 退出太快可能丢最后一条；L3 可能暂为 0。", VIOLET),
    ("Scope 隔离", "user 跨项目、project 跟工作区；共享/备份前先确认里面没有秘密。", ACCENT),
]
for i, (head, body, color) in enumerate(notes):
    col, row = i % 3, i // 3
    x = 0.62 + col * 4.06
    y = 1.72 + row * 2.0
    rect(s, x, y, 3.86, 1.72, fill=PANEL, line=BORDER, radius=0.08)
    rect(s, x, y, 3.86, 0.06, fill=color, line=None, radius=0)
    text(s, head, x + 0.24, y + 0.24, 3.3, 0.32, size=14, color=TEXT, bold=True)
    text(s, body, x + 0.24, y + 0.7, 3.35, 0.8, size=10.6, color=MUTED, line_spacing=1.35)

rect(s, 0.62, 5.55, 12.1, 1.12, fill=RGBColor(0x0C, 0x16, 0x2C), line=AMBER, line_width=0.9, radius=0.1)
text(s, "兼容性：DSH 0.2.x。persona 模板不要写 {{cwd}}（只注册 provider/model）；工作目录由 runtime context 提供。", 0.9, 5.72, 11.6, 0.5, size=10.6, color=TEXT, line_spacing=1.25)
text(s, "建议先在小 workspace 试运行，确认召回质量和 token 成本后再日常使用。", 0.9, 6.24, 11.6, 0.28, size=9.8, color=MUTED)
footer(s, 13)

# ---------------------------------------------------------------------------
# 11 — Closing
# ---------------------------------------------------------------------------
s = new_slide("bg-section.png")
kicker(s, "THANKS / LINKS", GREEN)
text(s, "记住该记住的，", 0.66, 1.8, 9.0, 0.7, size=38, color=TEXT, bold=True)
text(s, "忘掉该忘掉的。", 0.66, 2.55, 9.0, 0.7, size=38, color=CYAN, bold=True)
text(s, "三层记忆 · 混合召回 · 主动补位 · 引用回写 · 全程可审计", 0.7, 3.55, 8.5, 0.35, size=14, color=MUTED)

rect(s, 0.7, 4.35, 5.5, 1.4, fill=PANEL, line=BORDER, radius=0.08)
text(s, "REPOSITORY", 0.95, 4.52, 2.0, 0.25, size=9.5, color=FAINT, bold=True, font=FONT_EN)
text(s, "github.com/Kaede-Ayaki/dsh-holo-memory", 0.95, 4.86, 5.0, 0.32, size=12, color=CYAN, font=FONT_CODE)
text(s, "源码 · README · PPT 生成脚本 · 控制台截图", 0.95, 5.27, 4.9, 0.28, size=9.8, color=MUTED)

rect(s, 6.5, 4.35, 6.15, 1.4, fill=PANEL, line=BORDER, radius=0.08)
text(s, "VERSION", 6.75, 4.52, 1.5, 0.25, size=9.5, color=FAINT, bold=True, font=FONT_EN)
text(s, "v0.3.0  ·  2026.10", 6.75, 4.86, 3.2, 0.32, size=12, color=GREEN, font=FONT_CODE)
text(s, "测试 24/24  ·  RRF / Active Window / Citation / Bands", 6.75, 5.27, 5.6, 0.28, size=9.8, color=MUTED)

text(s, "dsh-holo-memory  ·  DeepSeek Harness memory plugin", 0.7, 6.35, 8.5, 0.3, size=10.5, color=FAINT, font=FONT_EN)
text(s, "END", 11.9, 6.25, 0.8, 0.3, size=11, color=FAINT, bold=True, font=FONT_EN, align=PP_ALIGN.RIGHT)

# ---------------------------------------------------------------------------
# Speaker notes
# ---------------------------------------------------------------------------
NOTES = [
    "开场：dsh-holo-memory v0.4.0。三部分：插件介绍、安装方式、注意事项。先用一句话说明它让 agent 跨会话记得你、记得项目。",
    "第一部分：先讲三层记忆和闭环，再讲召回，最后看界面。强调它不是一个数据库，而是记录、蒸馏、召回、注入的完整链路。",
    "三层各司其职：L1 对话摘要，L2 原子事实，L3 整体胶囊。右侧是一轮对话的闭环：捕获、蒸馏、召回、注入；纯本地 JSON。",
    "架构选择：它不是 MCP 服务器，而是 DSH 原生进程内插件。不额外起进程、不占端口、不经过 MCP 协议；agent/pre-step 直接自动注入，client slot 直接出 UI。仍暴露 memory_* 工具，但记忆读写不依赖 MCP。",
    "召回升级为三通道 RRF：词法、字符 n-gram、向量；再加 Active Window 主动补位和 citation 回写。预算按 IMMEDIATE/WORKING/BACKGROUND 分配。",
    "看得见的两个界面：侧边栏的独立控制台，以及聊天工作步骤里的召回行。工作步骤行可以展开看问题、正文和命中 id。",
    "来源链：每条记录带 session/turn/seq 指针和逐字 excerpt，excerptHash 可校验。证据等级分 ·源、·指针、·手写，无标记就是仅摘要。memory_open 可以回取原文和修订历史；拿不到来源会明确写 unavailable，不猜。",
    "体检与修订：memory_doctor 快检覆盖存储、来源、哈希、向量、重复、引用、审计、阈值和自检；深检真的打开一条来源并跑召回探针。修正不会覆盖旧版本，revision/history 留痕，memory_open(history=true) 可回看。",
    "第二部分：安装方式。准备环境、构建、在设置里添加本地目录、重启验证。桌面版 profile 由 Electron 管理，不要用 CLI 改 desktop profile。",
    "四步安装：Node 22.19+，npm install/build/test，设置→插件→添加插件→本地目录，最后完全重启 DSH。数据在 $DSH_HOME/holo-memory。",
    "向量模型是可选的。在侧边栏页面填接口、模型、Key，先检测再保存；不配也能用词法和 n-gram。Key 单独文件保存，GET 不返回。",
    "第三部分：注意事项。重点讲密钥、隐私、token、重启、异步蒸馏、scope 六条，以及 DSH 兼容性。",
    "六条底线逐条过。最后给建议：先小 workspace 试运行，观察召回质量和 token 成本，再日常使用。",
    "收尾：记住该记住的，忘掉该忘掉的。仓库、版本和下一步：P2 内容压缩/marker、Query Intent、更多评测。",
]
for slide, note in zip(prs.slides, NOTES):
    slide.notes_slide.notes_text_frame.text = note

prs.save(OUT)
print("saved", OUT, OUT.stat().st_size if OUT.exists() else "?")
