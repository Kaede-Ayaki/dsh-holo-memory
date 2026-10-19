"""Build the dsh-holo-memory introduction deck (16:9, dark theme)."""
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
OUT = HERE.parent / "dsh-holo-memory-intro.pptx"

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
BORDER = RGBColor(0x23, 0x32, 0x55)
ACCENT = RGBColor(0x5B, 0x7C, 0xFA)
BLUE = RGBColor(0x4D, 0x6B, 0xFE)
CYAN = RGBColor(0x3A, 0xD6, 0xE8)
VIOLET = RGBColor(0xA7, 0x8B, 0xFA)
GREEN = RGBColor(0x4A, 0xDE, 0x80)
AMBER = RGBColor(0xF5, 0xB8, 0x4C)
RED = RGBColor(0xF8, 0x71, 0x71)

prs = Presentation()
prs.slide_width = Inches(SW)
prs.slide_height = Inches(SH)
prs.core_properties.title = "dsh-holo-memory — 三层全息记忆"
prs.core_properties.subject = "DeepSeek Harness memory plugin introduction"
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


def footer(slide, idx: int, total: int = 11):
    text(slide, "dsh-holo-memory  ·  DeepSeek Harness memory plugin", 0.62, 7.05, 8.5, 0.25, size=9, color=FAINT, font=FONT_EN)
    text(slide, f"{idx:02d} / {total:02d}", 11.9, 7.02, 0.9, 0.3, size=9.5, color=MUTED, font=FONT_EN, align=PP_ALIGN.RIGHT)


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


# ---------------------------------------------------------------------------
# 01 — Cover
# ---------------------------------------------------------------------------
s = new_slide("bg-cover.png")
text(s, "D E E P S E E K   H A R N E S S   ·   M E M O R Y   P L U G I N", 0.72, 0.55, 9.5, 0.3, size=10.5, color=CYAN, bold=True, font=FONT_EN)
rich_text(
    s,
    [("dsh-", TEXT, True, FONT_EN, 58), ("holo-memory", ACCENT, True, FONT_EN, 58)],
    0.7,
    1.62,
    8.3,
    1.0,
    size=58,
    line_spacing=0.95,
)
text(s, "三层全息记忆", 0.74, 2.72, 7.5, 0.75, size=38, color=TEXT, bold=True)
text(s, "让 agent 跨会话记得你、记得项目、记得做过什么。", 0.76, 3.55, 7.2, 0.4, size=16.5, color=MUTED)

chip(s, "L1 对话层", 0.74, 4.55, 1.55, CYAN)
chip(s, "L2 事实层", 2.43, 4.55, 1.55, ACCENT)
chip(s, "L3 全息层", 4.12, 4.55, 1.55, VIOLET)

text(s, "向量检索 Qwen3-Embedding-8B  ·  4096D  ·  纯本地  ·  可审计  ·  零服务端", 0.76, 5.45, 7.6, 0.4, size=12.5, color=MUTED)
text(s, "2026.10  ·  v0.1.0", 0.76, 6.6, 4.0, 0.3, size=10.5, color=FAINT, font=FONT_EN)

# floating memory stack on the right
stack_x, stack_y = 9.18, 1.95
stack_data = [
    ("L3", "全息记忆", "≤ 300 条", VIOLET, 0.0),
    ("L2", "事实层", "≤ 3000 条", ACCENT, 1.16),
    ("L1", "对话层", "≤ 2000 条", CYAN, 2.32),
]
for label, name, cap, color, dy in stack_data:
    rect(s, stack_x, stack_y + dy, 3.35, 1.02, fill=PANEL, line=color, line_width=1.0, radius=0.12)
    badge(s, label, stack_x + 0.18, stack_y + dy + 0.26, d=0.5, fill=color, color=RGBColor(7, 10, 20))
    text(s, name, stack_x + 0.86, stack_y + dy + 0.17, 1.7, 0.35, size=15.5, color=TEXT, bold=True)
    text(s, cap, stack_x + 0.86, stack_y + dy + 0.53, 1.7, 0.28, size=10.5, color=MUTED, font=FONT_EN)
    text(s, "auto-inject", stack_x + 2.28, stack_y + dy + 0.34, 0.96, 0.3, size=9, color=FAINT, font=FONT_EN, align=PP_ALIGN.RIGHT)

# ---------------------------------------------------------------------------
# 02 — Problem
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "01 / PROBLEM")
title(s, "每个新会话，agent 都从「初次见面」开始")
problems = [
    ("01", "会话一关，记忆归零", "DSH 默认只保留一个会话内的上下文；新开一个 tab，就是一张白纸。", RED),
    ("02", "事件日志不是记忆", "append-only session log 面向审计与 replay，模型不会自动把它读回上下文。", AMBER),
    ("03", "现有插件不是重，就是不全", "SQLite / 常驻 worker / embedding 服务；或者只负责存，不负责自动注入。", CYAN),
    ("04", "跨项目串味", "用户偏好与项目事实混在一个池子里，换个工作区就被无关记忆污染。", VIOLET),
]
for i, (num, head, body, color) in enumerate(problems):
    col, row = i % 2, i // 2
    x = 0.62 + col * 6.12
    y = 1.72 + row * 1.95
    rect(s, x, y, 5.9, 1.7, fill=PANEL, line=BORDER, radius=0.08)
    badge(s, num, x + 0.26, y + 0.28, d=0.46, fill=color, color=RGBColor(7, 10, 20))
    text(s, head, x + 0.9, y + 0.24, 4.7, 0.4, size=17, color=TEXT, bold=True)
    text(s, body, x + 0.9, y + 0.72, 4.75, 0.8, size=12.3, color=MUTED, line_spacing=1.35)

rect(s, 0.62, 5.95, 12.1, 0.72, fill=RGBColor(0x0C, 0x16, 0x2C), line=ACCENT, line_width=0.9, radius=0.12)
text(s, "缺的不是存储，而是「记录 → 蒸馏 → 召回 → 注入」的完整闭环。", 0.95, 6.12, 11.4, 0.4, size=15, color=TEXT, bold=True)
footer(s, 2)

# ---------------------------------------------------------------------------
# 03 — Three layers
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "02 / ARCHITECTURE")
title(s, "三层记忆，各管一件事")
layers = [
    ("L1", "对话层", "每轮对话一条摘要", "用户要什么 · 做了什么 · 结果如何", "上限 2000 条  ·  每轮注入 2 条", CYAN),
    ("L2", "事实层", "原子事实，可追溯出处", "偏好 / 决策 / 约定 / 实体 / 待办 / 纠正", "上限 3000 条  ·  每轮注入 5 条", ACCENT),
    ("L3", "全息层", "跨多轮的整体胶囊", "用户画像 / 项目状态 / 未闭环线索", "上限 300 条  ·  每轮注入 3 条", VIOLET),
]
for i, (code, name, sub, body, cap, color) in enumerate(layers):
    y = 1.72 + i * 1.68
    rect(s, 0.62, y, 7.35, 1.48, fill=PANEL, line=BORDER, radius=0.08)
    rect(s, 0.62, y, 0.09, 1.48, fill=color, line=None, radius=0)
    badge(s, code, 0.9, y + 0.45, d=0.56, fill=color, color=RGBColor(7, 10, 20))
    text(s, name, 1.62, y + 0.18, 2.6, 0.36, size=17, color=TEXT, bold=True)
    text(s, sub, 1.62, y + 0.56, 2.8, 0.3, size=11, color=color, bold=True)
    text(s, body, 4.35, y + 0.22, 3.4, 0.55, size=11.8, color=MUTED, line_spacing=1.25)
    text(s, cap, 4.35, y + 0.9, 3.4, 0.3, size=10, color=FAINT, font=FONT_EN)

# right-side injection budget panel
px, py = 8.35, 1.72
rect(s, px, py, 4.35, 5.0, fill=RGBColor(0x0B, 0x13, 0x24), line=BORDER, radius=0.08)
text(s, "每次注入", px + 0.32, py + 0.25, 3.7, 0.3, size=11, color=CYAN, bold=True, font=FONT_EN)
text(s, "≤ 1400", px + 0.3, py + 0.58, 2.2, 0.7, size=34, color=TEXT, bold=True, font=FONT_EN)
text(s, "字符", px + 1.95, py + 0.9, 1.0, 0.3, size=13, color=MUTED)
text(s, "按分数裁剪，不按层硬切", px + 0.32, py + 1.32, 3.6, 0.3, size=11, color=MUTED)
text(s, "L3", px + 0.32, py + 1.95, 0.6, 0.3, size=11, color=VIOLET, bold=True)
text(s, "L2", px + 0.32, py + 2.45, 0.6, 0.3, size=11, color=ACCENT, bold=True)
text(s, "L1", px + 0.32, py + 2.95, 0.6, 0.3, size=11, color=CYAN, bold=True)
for i, color in enumerate([VIOLET, ACCENT, CYAN]):
    y = py + 2.02 + i * 0.5
    rect(s, px + 0.85, y, 2.9 - i * 0.55, 0.18, fill=color, line=None, radius=0.5)
text(s, "snapshot 注入，不是 system prompt 抖动", px + 0.32, py + 3.62, 3.65, 0.55, size=10.5, color=MUTED, line_spacing=1.3)
chip(s, "0 token when nothing matches", px + 0.32, py + 4.3, 3.55, GREEN, size=9.5)

footer(s, 3)

# ---------------------------------------------------------------------------
# 04 — Pipeline
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "03 / PIPELINE")
title(s, "从一条对话，到下一次自动想起")
steps = [
    ("01", "捕获", "turn/start · user · assistant · turn/end", CYAN),
    ("02", "蒸馏", "1 次 LLM → 严格 JSON（L1 / L2 / L3）", ACCENT),
    ("03", "合并", "近似去重 · 原地更新 · 向量回填", VIOLET),
    ("04", "召回", "新用户消息 → BM25 + 向量混合", GREEN),
    ("05", "注入", "≤1400 字符 snapshot → 本步", AMBER),
]
x0, y0, w, gap = 0.62, 1.95, 2.26, 0.23
for i, (num, head, body, color) in enumerate(steps):
    x = x0 + i * (w + gap)
    rect(s, x, y0, w, 2.1, fill=PANEL, line=BORDER, radius=0.08)
    rect(s, x, y0, w, 0.07, fill=color, line=None, radius=0)
    badge(s, num, x + 0.22, y0 + 0.28, d=0.44, fill=color, color=RGBColor(7, 10, 20))
    text(s, head, x + 0.76, y0 + 0.26, 1.4, 0.42, size=18, color=TEXT, bold=True)
    text(s, body, x + 0.22, y0 + 0.93, w - 0.44, 0.85, size=10.8, color=MUTED, line_spacing=1.35)
    if i < len(steps) - 1:
        arrow = s.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(x + w + 0.035), Inches(y0 + 0.92), Inches(0.16), Inches(0.25))
        arrow.fill.solid()
        arrow.fill.fore_color.rgb = FAINT
        arrow.line.fill.background()
        arrow.shadow.inherit = False

text(s, "每个回合只多 1 次蒸馏调用；没有可用模型时退化为确定性 L1 摘要 —— 记录不会丢。", 0.64, 4.55, 12.0, 0.35, size=13, color=TEXT)
text(s, "模型不可用 / 解析失败 / API 报错 都不会阻断对话；下一轮仍可检索已有记忆。", 0.64, 4.95, 12.0, 0.35, size=11.5, color=MUTED)

# a small event strip
rect(s, 0.62, 5.62, 12.1, 0.95, fill=RGBColor(0x0B, 0x13, 0x24), line=BORDER, radius=0.1)
text(s, "event stream", 0.9, 5.84, 1.6, 0.3, size=10.5, color=CYAN, bold=True, font=FONT_EN)
text(s, "user/message  →  assistant/message  →  turn/end  ══▶  extraction queue  ══▶  l1/l2/l3.json", 2.4, 5.82, 9.9, 0.4, size=12, color=TEXT, font=FONT_CODE)
footer(s, 4)

# ---------------------------------------------------------------------------
# 05 — Example
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "04 / IN PRACTICE")
title(s, "一次闭环：从「记住 pnpm」到「下次自己想起来」")

# left panel
rect(s, 0.62, 1.7, 5.75, 4.65, fill=PANEL, line=BORDER, radius=0.08)
text(s, "会话 A · 记录", 0.92, 1.92, 3.0, 0.35, size=14, color=CYAN, bold=True)
text(s, "USER", 0.92, 2.42, 0.8, 0.3, size=10, color=FAINT, font=FONT_EN, bold=True)
text(s, "这个项目用 pnpm，测试命令是 pnpm test。", 1.55, 2.38, 4.5, 0.4, size=12.5, color=TEXT)
text(s, "→ 蒸馏", 0.92, 2.95, 1.0, 0.3, size=10, color=FAINT, font=FONT_EN, bold=True)
for i, (code, value, color) in enumerate(
    [
        ("L1", "用户要求把包管理器统一为 pnpm，并确认测试命令。", CYAN),
        ("L2", "项目使用 pnpm；测试命令 pnpm test。", ACCENT),
        ("L3", "工具链约定：pnpm 为核心，后续任务默认遵循。", VIOLET),
    ]
):
    y = 3.32 + i * 0.92
    badge(s, code, 1.55, y + 0.05, d=0.42, fill=color, color=RGBColor(7, 10, 20))
    text(s, value, 2.16, y, 3.85, 0.62, size=11.5, color=MUTED, line_spacing=1.25)

# arrow between panels
arrow = s.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(6.55), Inches(3.62), Inches(0.52), Inches(0.34))
arrow.fill.solid()
arrow.fill.fore_color.rgb = ACCENT
arrow.line.fill.background()
arrow.shadow.inherit = False

# right panel
rect(s, 7.25, 1.7, 5.45, 4.65, fill=PANEL, line=BORDER, radius=0.08)
text(s, "会话 B · 召回", 7.55, 1.92, 3.0, 0.35, size=14, color=GREEN, bold=True)
text(s, "USER", 7.55, 2.42, 0.8, 0.3, size=10, color=FAINT, font=FONT_EN, bold=True)
text(s, "这个项目用什么包管理器？", 8.18, 2.38, 4.2, 0.4, size=12.5, color=TEXT)
text(s, "→ 自动召回", 7.55, 2.95, 1.5, 0.3, size=10, color=FAINT, font=FONT_EN, bold=True)
lines = [
    ("[L2]", "项目使用 pnpm；测试命令 pnpm test。", ACCENT),
    ("[L1]", "上次确认了 pnpm 约定，并写入 L3 胶囊。", CYAN),
]
for i, (tag, value, color) in enumerate(lines):
    y = 3.33 + i * 0.72
    text(s, tag, 8.18, y, 0.55, 0.3, size=10.5, color=color, bold=True, font=FONT_EN)
    text(s, value, 8.78, y - 0.02, 3.6, 0.6, size=11.3, color=MUTED, line_spacing=1.2)
text(s, "→ 回答 pnpm，不需要用户再解释一次。", 7.55, 4.78, 4.8, 0.4, size=12, color=TEXT, bold=True)
rect(s, 7.55, 5.32, 4.75, 0.72, fill=RGBColor(0x10, 0x1B, 0x30), line=BORDER, radius=0.08)
text(s, "回答：pnpm", 7.75, 5.46, 1.6, 0.3, size=12, color=GREEN, bold=True, font=FONT_EN)
text(s, "来源：L2 事实 + L1 摘要，可追溯", 9.3, 5.47, 2.9, 0.3, size=10, color=MUTED)

# bottom inject sample
rect(s, 0.62, 6.52, 12.1, 0.34, fill=RGBColor(0x0B, 0x13, 0x24), line=BORDER, radius=0.5)
text(s, "[holo-memory] 注入为 user-role snapshot，模型在开口前就带着背景事实。", 0.92, 6.57, 11.5, 0.26, size=10.5, color=MUTED)
footer(s, 5)

# ---------------------------------------------------------------------------
# 06 — Retrieval
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "05 / RETRIEVAL")
title(s, "双通道混合检索：词法保底，向量提精度")

# left channel cards
rect(s, 0.62, 1.72, 5.55, 1.55, fill=PANEL, line=CYAN, line_width=0.9, radius=0.08)
text(s, "BM25 + 中文 bigram", 0.92, 1.9, 4.2, 0.35, size=15, color=CYAN, bold=True)
text(s, "零依赖 · 离线可用 · 对术语、路径、专名精确", 0.92, 2.32, 4.9, 0.3, size=11, color=MUTED)
text(s, "任何时候的保底通道", 0.92, 2.78, 4.0, 0.3, size=10.5, color=FAINT, font=FONT_EN)

rect(s, 0.62, 3.45, 5.55, 1.55, fill=PANEL, line=ACCENT, line_width=0.9, radius=0.08)
text(s, "Qwen / Qwen3-Embedding-8B", 0.92, 3.63, 4.9, 0.35, size=15, color=ACCENT, bold=True)
text(s, "4096 维 · 跨语言语义 · 硅基流动 API", 0.92, 4.05, 4.9, 0.3, size=11, color=MUTED)
text(s, "单次查询约 200–400ms，超时自动退回词法", 0.92, 4.5, 5.0, 0.3, size=10.5, color=FAINT)

# formula card
rect(s, 6.5, 1.72, 6.22, 1.55, fill=RGBColor(0x0B, 0x13, 0x24), line=BORDER, radius=0.08)
text(s, "relevance  =  0.62 · vec'  +  0.28 · lex", 6.78, 1.92, 5.7, 0.4, size=15.5, color=TEXT, font=FONT_CODE)
text(s, "vec' = max(0, (cos − 0.22) / 0.78)", 6.78, 2.38, 5.4, 0.35, size=13, color=CYAN, font=FONT_CODE)
text(s, "0.22 是无关文本的余弦基线；先减基线，噪声就不会伪装成相关。", 6.78, 2.82, 5.7, 0.3, size=10.5, color=MUTED)

# scores
text(s, "实测召回（同一 L1 记录）", 6.52, 3.55, 4.0, 0.3, size=11, color=FAINT, bold=True, font=FONT_EN)
rows = [
    ("这个项目用什么包管理器？", 0.546, "cos 0.454", GREEN, "✓"),
    ("Which package manager…?", 0.246, "cos 0.429", GREEN, "✓"),
    ("明天天气怎么样？", 0.0, "cos 0.30", RED, "过滤"),
]
for i, (query, score, cos_text, color, mark) in enumerate(rows):
    y = 3.95 + i * 0.68
    text(s, query, 6.52, y, 3.0, 0.3, size=10.5, color=TEXT)
    rect(s, 9.55, y + 0.07, 1.9, 0.13, fill=RGBColor(0x1A, 0x25, 0x3D), line=None, radius=0.5)
    if score > 0:
        rect(s, 9.55, y + 0.07, 1.9 * min(1.0, score / 0.6), 0.13, fill=color, line=None, radius=0.5)
    text(s, cos_text, 11.55, y, 0.9, 0.3, size=9.5, color=MUTED, font=FONT_EN)
    text(s, mark, 12.35, y - 0.02, 0.5, 0.3, size=11, color=color, bold=True)

rect(s, 0.62, 5.55, 12.1, 0.82, fill=RGBColor(0x0C, 0x16, 0x2C), line=BORDER, radius=0.1)
text(s, "无关问题不注入（0 token）；查询 embedding 超过 2.5s 时本轮退回词法，不阻塞对话。", 0.92, 5.76, 11.4, 0.35, size=12.5, color=TEXT)
text(s, "向量写入是后台异步的：新记录先可被词法检索，随后补齐 4096 维向量。", 0.92, 6.08, 11.4, 0.3, size=10.5, color=MUTED)
footer(s, 6)

# ---------------------------------------------------------------------------
# 07 — Injection
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "06 / INJECTION")
title(s, "只在需要时，只给需要的量")

steps = [
    ("01", "新用户消息到达", "每条消息只处理一次；后续工具步不重复注入", CYAN),
    ("02", "排除当前会话 L1", "避免把本轮对话再复述一遍", ACCENT),
    ("03", "阈值 + 配额排序", "L3 / L2 / L1 = 3 / 5 / 2 条", VIOLET),
    ("04", "预算裁剪 → 注入", "≤1400 字符 snapshot，写入本步", GREEN),
]
for i, (num, head, body, color) in enumerate(steps):
    y = 1.78 + i * 1.12
    rect(s, 0.62, y, 6.35, 0.95, fill=PANEL, line=BORDER, radius=0.08)
    badge(s, num, 0.86, y + 0.22, d=0.44, fill=color, color=RGBColor(7, 10, 20))
    text(s, head, 1.46, y + 0.14, 2.6, 0.32, size=14.5, color=TEXT, bold=True)
    text(s, body, 1.46, y + 0.52, 4.9, 0.3, size=10.8, color=MUTED)

# right panel
px, py = 7.35, 1.78
rect(s, px, py, 5.35, 4.55, fill=RGBColor(0x0B, 0x13, 0x24), line=BORDER, radius=0.08)
text(s, "注入预算", px + 0.3, py + 0.22, 3.0, 0.3, size=11, color=CYAN, bold=True, font=FONT_EN)
text(s, "1400 chars", px + 0.28, py + 0.56, 3.4, 0.5, size=25, color=TEXT, bold=True, font=FONT_EN)
text(s, "按分数裁剪", px + 3.45, py + 0.72, 1.5, 0.3, size=10, color=MUTED, align=PP_ALIGN.RIGHT)
# budget bar
segments = [(0.0, 0.30, VIOLET, "L3"), (0.30, 0.62, ACCENT, "L2"), (0.62, 1.0, CYAN, "L1")]
for start, end, color, label in segments:
    rect(s, px + 0.3 + start * 4.7, py + 1.32, (end - start) * 4.7 - 0.05, 0.24, fill=color, line=None, radius=0.5)
    text(s, label, px + 0.3 + start * 4.7, py + 1.66, 1.0, 0.25, size=9.5, color=color, bold=True)
text(s, "高分条目优先；超预算时从最低分开始删，而不是砍掉整层。", px + 0.3, py + 2.05, 4.75, 0.55, size=10.8, color=MUTED, line_spacing=1.3)

rect(s, px + 0.3, py + 2.85, 4.75, 0.78, fill=RGBColor(0x10, 0x1B, 0x30), line=BORDER, radius=0.08)
text(s, "短问题", px + 0.5, py + 2.98, 0.9, 0.25, size=10, color=AMBER, bold=True)
text(s, "“继续” → 最近 L1 + 最重要 L3 快照", px + 1.45, py + 2.95, 3.4, 0.3, size=10.5, color=TEXT)
text(s, "无关问题 → 0 token", px + 1.45, py + 3.28, 3.2, 0.25, size=10, color=MUTED)

text(s, "source.kind = \"holo-memory\"  ·  form = snapshot", px + 0.3, py + 3.9, 4.7, 0.3, size=10, color=FAINT, font=FONT_CODE)

footer(s, 7)

# ---------------------------------------------------------------------------
# 08 — Engineering & safety
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "07 / ENGINEERING")
title(s, "本地、可审计、不撑爆上下文")
tiles = [
    ("纯本地 JSON", "l1.json / l2.json / l3.json，可 grep、diff、手工改、rm 即遗忘。", CYAN),
    ("原子写", "临时文件 + rename；崩溃不会留下半截记忆文件。", ACCENT),
    ("容量护栏", "2000 / 3000 / 300；超过按重要度与时间淘汰。", VIOLET),
    ("Scope 隔离", "user 跨项目；project 跟工作区，随 git 共享给团队。", GREEN),
    ("密钥全链路脱敏", "写入拒存、召回渲染再脱敏；L1/L2/L3 都覆盖。", AMBER),
    ("0 服务端 / 0 账号", "没有遥测；embedding 也可以指向本地 Ollama。", RED),
]
for i, (head, body, color) in enumerate(tiles):
    col, row = i % 3, i // 3
    x = 0.62 + col * 4.05
    y = 1.72 + row * 2.05
    rect(s, x, y, 3.87, 1.8, fill=PANEL, line=BORDER, radius=0.08)
    rect(s, x, y, 3.87, 0.06, fill=color, line=None, radius=0)
    text(s, head, x + 0.26, y + 0.26, 3.3, 0.35, size=15, color=TEXT, bold=True)
    text(s, body, x + 0.26, y + 0.78, 3.35, 0.8, size=11.2, color=MUTED, line_spacing=1.35)

text(s, "运行时依赖 0  ·  宿主提供 @deepseek-ai/* 服务  ·  插件包 28.5 KB（tarball）", 0.64, 6.35, 12.0, 0.3, size=11.5, color=FAINT, font=FONT_EN)
footer(s, 8)

# ---------------------------------------------------------------------------
# 09 — Verification
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "08 / VERIFIED")
title(s, "不是 PPT 工程，是已经在跑的插件")
metrics = [
    ("17 / 17", "单元测试", CYAN),
    ("4096", "向量维度", ACCENT),
    ("341 ms", "2 条文本 embedding", VIOLET),
    ("98 KB", "解包体积", GREEN),
]
for i, (num, label, color) in enumerate(metrics):
    x = 0.62 + i * 3.05
    rect(s, x, 1.68, 2.85, 1.22, fill=PANEL, line=BORDER, radius=0.08)
    text(s, num, x + 0.24, 1.82, 2.4, 0.55, size=25, color=color, bold=True, font=FONT_EN)
    text(s, label, x + 0.24, 2.38, 2.4, 0.3, size=10.5, color=MUTED)

# left: e2e checks
rect(s, 0.62, 3.18, 6.0, 3.05, fill=PANEL, line=BORDER, radius=0.08)
text(s, "真实 DSH 运行时 E2E", 0.92, 3.38, 4.0, 0.35, size=14, color=CYAN, bold=True)
checks = [
    "临时 profile + mock Anthropic SSE 服务，插件正常加载",
    "第 1 轮后生成 l1.json / l2.json / l3.json",
    "第 2 轮模型请求中检测到注入块（injected=true）",
    "已有 L1 自动回填 4096 维向量；新事实即时嵌入",
]
for i, value in enumerate(checks):
    y = 3.86 + i * 0.52
    text(s, "✓", 0.94, y, 0.3, 0.3, size=13, color=GREEN, bold=True, font=FONT_EN)
    text(s, value, 1.28, y - 0.01, 5.1, 0.4, size=11.3, color=MUTED)

# right: live stats + recall
rect(s, 6.85, 3.18, 5.85, 3.05, fill=RGBColor(0x0B, 0x13, 0x24), line=BORDER, radius=0.08)
text(s, "live memory_stats", 7.15, 3.38, 3.0, 0.3, size=11, color=FAINT, bold=True, font=FONT_EN)
text(s, "L1 = 1   ·   L2 = 1   ·   L3 = 0", 7.15, 3.72, 5.1, 0.32, size=13, color=TEXT, font=FONT_CODE)
text(s, "embedded = 2  ·  Qwen/Qwen3-Embedding-8B", 7.15, 4.1, 5.1, 0.32, size=11.5, color=MUTED, font=FONT_CODE)
text(s, "召回分数", 7.15, 4.65, 2.0, 0.3, size=10.5, color=FAINT, bold=True, font=FONT_EN)
for i, (label, score, color) in enumerate([("中文相关", 0.546, GREEN), ("英文相关", 0.246, GREEN), ("无关问题", 0.0, RED)]):
    y = 5.02 + i * 0.38
    text(s, label, 7.15, y, 1.2, 0.25, size=10, color=MUTED)
    rect(s, 8.35, y + 0.06, 2.5, 0.12, fill=RGBColor(0x1A, 0x25, 0x3D), line=None, radius=0.5)
    if score > 0:
        rect(s, 8.35, y + 0.06, 2.5 * min(1.0, score / 0.6), 0.12, fill=color, line=None, radius=0.5)
    text(s, f"{score:.3f}" if score > 0 else "filtered", 11.0, y - 0.02, 1.2, 0.25, size=9.5, color=color, font=FONT_EN)

footer(s, 9)

# ---------------------------------------------------------------------------
# 10 — Usage
# ---------------------------------------------------------------------------
s = new_slide()
kicker(s, "09 / USAGE")
title(s, "怎么用：5 个工具 + 3 个文件")
tools = [
    ("memory_recall", "混合检索三层记忆，返回带 id 的记录"),
    ("memory_note", "写入 L2 事实或 L3 全息胶囊"),
    ("memory_list", "按层浏览最近的记忆"),
    ("memory_forget", "按 id 删除过时/错误的记忆"),
    ("memory_stats", "层数量、向量覆盖、存储路径"),
]
for i, (name, desc) in enumerate(tools):
    y = 1.72 + i * 0.82
    rect(s, 0.62, y, 6.1, 0.68, fill=PANEL, line=BORDER, radius=0.08)
    text(s, name, 0.88, y + 0.13, 2.2, 0.3, size=12.5, color=CYAN, bold=True, font=FONT_CODE)
    text(s, desc, 3.14, y + 0.14, 3.4, 0.3, size=10.8, color=MUTED)

# config card
rect(s, 7.0, 1.72, 5.65, 3.55, fill=RGBColor(0x0B, 0x13, 0x24), line=BORDER, radius=0.08)
text(s, "cordis.patch.yml", 7.28, 1.9, 3.0, 0.3, size=10.5, color=FAINT, bold=True, font=FONT_EN)
code = [
    "- id: holo-memory",
    "  config:",
    "    embeddingEnabled: true",
    "    embeddingBaseUrl:",
    "      https://api.siliconflow.cn/v1",
    "    embeddingModel:",
    "      Qwen/Qwen3-Embedding-8B",
    "    embeddingApiKeyFile:",
    "      .../holo-memory/embedding.key",
]
for i, line in enumerate(code):
    color = CYAN if i == 0 else (ACCENT if "embedding" in line else TEXT)
    text(s, line, 7.28, 2.22 + i * 0.31, 5.1, 0.28, size=9.8, color=color, font=FONT_CODE)

text(s, "安装", 0.64, 6.0, 0.8, 0.3, size=11, color=FAINT, bold=True, font=FONT_EN)
text(s, "设置 → 插件 → 添加插件 → 填本地目录 → 重启 dsh", 1.28, 5.95, 5.8, 0.35, size=11.5, color=TEXT)
text(s, "存储", 0.64, 6.38, 0.8, 0.3, size=11, color=FAINT, bold=True, font=FONT_EN)
text(s, "$DSH_HOME/holo-memory/{l1,l2,l3}.json", 1.28, 6.34, 5.8, 0.32, size=10.5, color=MUTED, font=FONT_CODE)
footer(s, 10)

# ---------------------------------------------------------------------------
# 11 — Boundaries / next
# ---------------------------------------------------------------------------
s = new_slide("bg-section.png")
kicker(s, "10 / BOUNDARIES & NEXT", VIOLET)
title(s, "先做对记忆，再做多")

rect(s, 0.62, 1.75, 5.9, 3.55, fill=PANEL, line=BORDER, radius=0.08)
text(s, "已知边界", 0.92, 1.95, 2.0, 0.35, size=14, color=AMBER, bold=True)
limits = [
    "每轮多 1 次蒸馏调用（可配置关闭或跟随会话模型）",
    "headless 一次性任务退出太快时，最后一条蒸馏可能来不及",
    "L2 写入去重是词法近似，极端近义改写可能各存一条",
    "目前没有 Web 设置页，配置走 profile patch",
]
for i, value in enumerate(limits):
    bullet_line(s, 0.94, 2.5 + i * 0.64, 5.2, "", value, AMBER, size=11)
chip(s, "CURRENT · v0.1", 4.55, 1.92, 1.75, ACCENT, size=9.5)

rect(s, 6.62, 1.75, 6.1, 3.55, fill=PANEL, line=BORDER, radius=0.08)
text(s, "下一步", 6.92, 1.95, 2.0, 0.35, size=14, color=GREEN, bold=True)
nexts = [
    "Web 设置页：查看 / 编辑 L1-L3，实时看召回",
    "L3 定时 consolidation：跨会话合并主题胶囊",
    "关系图与时间线：把记忆长成可浏览的结构",
    "导出 / 导入、更多 embedding 后端",
]
for i, value in enumerate(nexts):
    bullet_line(s, 6.94, 2.5 + i * 0.64, 5.3, "", value, GREEN, size=11)
chip(s, "NEXT · v0.2", 10.55, 1.92, 1.75, GREEN, size=9.5)

text(s, "记住该记住的，忘掉该忘掉的。", 0.64, 5.75, 9.0, 0.55, size=22, color=TEXT, bold=True, font=FONT)
text(s, "plugin-dev/dsh-holo-memory   ·   98 KB  ·   纯本地   ·   可审计", 0.66, 6.42, 9.0, 0.35, size=11, color=MUTED, font=FONT_CODE)
text(s, "dsh-holo-memory  ·  v0.1.0  ·  2026.10", 9.5, 6.2, 3.2, 0.3, size=10, color=FAINT, font=FONT_EN, align=PP_ALIGN.RIGHT)

# ---------------------------------------------------------------------------
# Speaker notes (brief talking points, not shown on the slide)
# ---------------------------------------------------------------------------
NOTES = [
    "开场：DSH 默认没有跨会话记忆。dsh-holo-memory 用三层结构补上「记住 → 蒸馏 → 召回 → 注入」闭环。当前版本 v0.1.0，已在本机运行。",
    "四个问题：会话结束归零、日志只用于审计、现有方案偏重或不自动注入、跨项目串味。结论：缺的是完整闭环而不是又一个数据库。",
    "三层各司其职：L1 保留对话摘要，L2 保留可追溯原子事实，L3 把多轮压成整体胶囊。每层都有条数上限；每次注入总预算 1400 字符。",
    "流水线：捕获事件 → 每轮一次 LLM 蒸馏 → 去重/更新/回填向量 → 新消息到达时混合召回 → 预算内注入。模型不可用时退化为确定性 L1 摘要。",
    "用 pnpm 的例子说明闭环：A 会话写入 L1/L2/L3；B 会话在模型开口前自动召回，用户不需要再解释。",
    "检索双通道：BM25+中文 bigram 永远可用；Qwen3-Embedding-8B 提供 4096 维语义。用 0.22 余弦基线校准，无关问题被过滤。",
    "注入策略：每条新用户消息只处理一次；排除当前会话 L1；L3/L2/L1 配额 3/5/2；超预算从最低分删；短问题用最近快照兜底。",
    "工程与安全：纯本地 JSON、原子写、容量护栏、user/project 隔离、密钥全链路脱敏、零服务端。运行时依赖为 0（宿主提供 @deepseek-ai/*）。",
    "实测：17/17 单测；真实 DSH runtime + mock provider 跑通蒸馏与注入；SiliconFlow 4096 维、2 条文本 341ms；召回分数与过滤符合预期。",
    "使用：5 个工具覆盖召回/写入/浏览/删除/统计；配置在 profile patch；数据在 $DSH_HOME/holo-memory/。安装走设置 → 插件 → 本地目录。",
    "收尾：当前边界是每轮一次蒸馏、headless 尾部竞争、去重为词法近似、暂无 UI；下一步是 Web 设置页、L3 consolidation、关系图与导入导出。",
]
for slide, note in zip(prs.slides, NOTES):
    slide.notes_slide.notes_text_frame.text = note

# ---------------------------------------------------------------------------
prs.save(OUT)
print("saved", OUT, OUT.stat().st_size if OUT.exists() else "?")
