"""Build the v2 paper/editorial introduction deck for dsh-holo-memory 0.5.2.

A deliberately different visual language from the earlier dark-neon deck:
warm paper, ink serif headings, vermilion rules, archival labels.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt
from lxml import etree

HERE = Path(__file__).resolve().parent
DOCS = HERE.parent
OUT = DOCS / "dsh-holo-memory-intro-v2.pptx"

SW, SH = 13.333, 7.5
FONT = "Microsoft YaHei"
SERIF = "SimSun"
EN = "Georgia"
CODE = "Consolas"

PAPER = RGBColor(0xF6, 0xF0, 0xE4)
PAPER2 = RGBColor(0xEE, 0xE5, 0xD5)
CARD = RGBColor(0xFF, 0xFC, 0xF5)
INK = RGBColor(0x1D, 0x1B, 0x17)
INK2 = RGBColor(0x3B, 0x35, 0x2C)
MUTED = RGBColor(0x6F, 0x65, 0x58)
FAINT = RGBColor(0x9A, 0x8F, 0x7E)
LINE = RGBColor(0xD8, 0xCB, 0xB8)
RED = RGBColor(0xB5, 0x46, 0x30)
TEAL = RGBColor(0x2D, 0x6B, 0x63)
GOLD = RGBColor(0xB2, 0x86, 0x3C)
DARK = RGBColor(0x18, 0x1A, 0x17)
DARK2 = RGBColor(0x22, 0x24, 0x20)

prs = Presentation()
prs.slide_width = Inches(SW)
prs.slide_height = Inches(SH)
prs.core_properties.title = "dsh-holo-memory — 三层全息记忆 · v0.5.2"
prs.core_properties.subject = "DeepSeek Harness memory plugin introduction"
prs.core_properties.author = "dsh-holo-memory"


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


def text(slide, value, x, y, w, h, size=12, color=INK, bold=False, font=FONT,
         align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, line_spacing=1.12,
         margin=0, italic=False):
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
    run = p.add_run()
    run.text = value
    set_run_font(run, font, size, color, bold)
    if italic:
        run.font.italic = True
    return box


def rich(slide, parts, x, y, w, h, size=12, align=PP_ALIGN.LEFT,
         anchor=MSO_ANCHOR.TOP, line_spacing=1.12, margin=0):
    """parts: (text, color, bold, font, size_override)"""
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
    for value, color, bold, font, size_override in parts:
        run = p.add_run()
        run.text = value
        set_run_font(run, font or FONT, size_override or size, color, bold)
    return box


def rect(slide, x, y, w, h, fill, line_color=None, line_w=0.6, radius=True):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,
        Inches(x), Inches(y), Inches(w), Inches(h),
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    if line_color is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = line_color
        shape.line.width = Pt(line_w)
    if radius:
        try:
            shape.adjustments[0] = 0.055
        except Exception:
            pass
    return shape


def hline(slide, x, y, w, color=LINE, width=0.7):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(0.012))
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    shape.height = Pt(width)


def bg(slide, color=PAPER):
    rect(slide, 0, 0, SW, SH, color, radius=False)


def eyebrow(slide, value, x=0.74, y=0.55, color=RED):
    text(slide, value, x, y, 7.4, 0.24, size=8.6, color=color, bold=True, font=EN)


def title(slide, value, x=0.72, y=0.92, w=10.5, h=0.8, size=31):
    text(slide, value, x, y, w, h, size=size, color=INK, bold=False, font=SERIF, line_spacing=1.0)


def subtitle(slide, value, x=0.74, y=1.76, w=10.5, h=0.5, size=12.5):
    text(slide, value, x, y, w, h, size=size, color=MUTED, font=FONT, line_spacing=1.35)


def footer(slide, idx):
    hline(slide, 0.72, 6.98, 11.9, LINE, 0.7)
    text(slide, "DSH · HOLO MEMORY / 0.5.2", 0.74, 7.08, 4.5, 0.2, size=8, color=FAINT, font=EN)
    text(slide, f"{idx:02d} / 14", 11.55, 7.08, 1.05, 0.2, size=8, color=FAINT, font=EN, align=PP_ALIGN.RIGHT)


def kicker_num(slide, num, label, x=0.74, y=0.58):
    text(slide, num, x, y, 0.38, 0.24, size=10, color=RED, bold=True, font=EN)
    text(slide, label, x + 0.43, y, 6.2, 0.24, size=8.6, color=FAINT, font=EN)


def card(slide, x, y, w, h, fill=CARD, line_color=LINE):
    rect(slide, x, y, w, h, fill, line_color, 0.65, True)


def pill(slide, value, x, y, w, color=TEAL, fill=None):
    rect(slide, x, y, w, 0.34, fill or RGBColor(0xEA, 0xF0, 0xE9), None, 0, True)
    text(slide, value, x + 0.13, y + 0.07, w - 0.2, 0.2, size=8.5, color=color, bold=True, font=FONT)


def picture_contain(slide, path, x, y, w, h, frame=True):
    if frame:
        rect(slide, x - 0.08, y - 0.08, w + 0.16, h + 0.16, DARK, None, 0, True)
    img = Image.open(path)
    iw, ih = img.size
    scale = min(w / iw, h / ih)
    pw, ph = iw * scale, ih * scale
    px, py = x + (w - pw) / 2, y + (h - ph) / 2
    slide.shapes.add_picture(str(path), Inches(px), Inches(py), width=Inches(pw), height=Inches(ph))


def label_value(slide, label, value, x, y, w=2.3):
    text(slide, label, x, y, w, 0.2, size=8, color=FAINT, font=EN)
    text(slide, value, x, y + 0.23, w, 0.3, size=12.5, color=INK, bold=True, font=FONT)


# ---------------------------------------------------------------------------
# 01 COVER
# ---------------------------------------------------------------------------
s = prs.slides.add_slide(prs.slide_layouts[6])
bg(s, PAPER)
# faint editorial frame + big watermark
rect(s, 0.42, 0.34, 12.49, 6.82, PAPER, LINE, 0.5, False)
text(s, "DEEPSEEK HARNESS  /  MEMORY PLUGIN", 0.92, 0.82, 6.0, 0.24, size=8.8, color=RED, bold=True, font=EN)
text(s, "记忆，", 0.9, 1.72, 5.6, 0.78, size=51, color=INK, font=SERIF, line_spacing=0.95)
text(s, "不该随会话结束", 0.9, 2.45, 8.4, 0.9, size=51, color=INK, font=SERIF, line_spacing=0.95)
hline(s, 0.92, 3.62, 2.0, RED, 2.2)
text(s, "dsh-holo-memory / 三层全息记忆", 0.92, 3.95, 6.8, 0.36, size=15, color=INK2, bold=True, font=FONT)
text(s, "L1 对话 · L2 事实 · L3 全息 · 神经元联想 · 来源可核对", 0.92, 4.36, 7.6, 0.3, size=10.5, color=MUTED, font=FONT)
text(s, "v0.5.2  ·  2026.11", 0.92, 6.25, 3.2, 0.26, size=9.5, color=FAINT, font=EN)

# layered paper cards on the right
stack = [(8.86, 1.28, 0.78), (9.06, 1.52, 0.62), (9.26, 1.76, 0.46)]
for i, (x, y, alpha) in enumerate(stack):
    rect(s, x + 0.16, y + 0.14, 3.0, 3.92, RGBColor(0xE5, 0xD8, 0xC5), LINE, 0.5, True)
    rect(s, x, y, 3.0, 3.92, CARD, LINE, 0.7, True)
    text(s, f"L{3-i}", x + 0.22, y + 0.2, 0.6, 0.3, size=10, color=RED if i == 0 else TEAL, bold=True, font=EN)
    text(s, ["全息", "事实", "对话"][i], x + 0.22, y + 0.55, 1.3, 0.4, size=16, color=INK, bold=True, font=FONT)
    text(s, ["整体状态", "原子事实", "轮次摘要"][i], x + 0.22, y + 1.02, 2.2, 0.25, size=9, color=MUTED, font=FONT)
    hline(s, x + 0.22, y + 1.45, 2.45, LINE, 0.7)
    for j in range(3):
        text(s, "—" * (12 - j * 2), x + 0.22, y + 1.73 + j * 0.38, 2.45, 0.2, size=8, color=FAINT, font=EN)
    text(s, "id / source / revision", x + 0.22, y + 3.38, 2.5, 0.2, size=7.5, color=TEAL, font=EN)
text(s, "一本会自己整理的记忆账本，外加一张会联想的索引。", 0.92, 5.35, 5.4, 0.3, size=10.5, color=INK2, font=FONT)

# ---------------------------------------------------------------------------
# 02 WHY
# ---------------------------------------------------------------------------
s = prs.slides.add_slide(prs.slide_layouts[6]); bg(s)
kicker_num(s, "01", "WHY MEMORY", 0.74, 0.58)
title(s, "每一轮对话，都是一次重新开始。", 0.72, 1.0, 10.8, 0.8, 30)
subtitle(s, "模型的权重是静态的，上下文窗口是有限的；跨会话的事实、偏好和项目状态，需要一个可检索的外部账本。", 0.74, 1.86, 10.5, 0.6)
# three quiet statement blocks
items = [
    ("01", "会话会结束", "上下文被清空，昨天说过的约定不会自动出现。"),
    ("02", "对话会变长", "把所有历史塞进上下文，既昂贵又会被噪声淹没。"),
    ("03", "事实会漂移", "版本、路径、决定和纠正，需要出处与时间线。"),
]
for i, (n, h, body) in enumerate(items):
    x = 0.74 + i * 4.02
    card(s, x, 2.82, 3.72, 2.28)
    text(s, n, x + 0.26, 3.04, 0.5, 0.24, size=9, color=RED, bold=True, font=EN)
    text(s, h, x + 0.26, 3.34, 2.9, 0.34, size=17, color=INK, bold=True, font=FONT)
    text(s, body, x + 0.26, 3.86, 3.05, 0.78, size=10.2, color=MUTED, font=FONT, line_spacing=1.45)
hline(s, 0.74, 5.5, 11.85, LINE, 0.7)
rich(s, [("dsh-holo-memory", INK, True, FONT, 11), ("  把“记住”拆成三个动作：", MUTED, False, FONT, 11),
         ("分层收纳、按需召回、可回取原文。", TEAL, True, FONT, 11)], 0.74, 5.72, 11.7, 0.34)
text(s, "不是让模型变聪明，而是让它的上下文在该记得的时候，恰好带着该记得的东西。", 0.74, 6.18, 11.3, 0.3, size=10.4, color=FAINT, font=FONT)
footer(s, 2)

# ---------------------------------------------------------------------------
# 03 THREE LAYERS
# ---------------------------------------------------------------------------
s = prs.slides.add_slide(prs.slide_layouts[6]); bg(s)
kicker_num(s, "02", "THREE LAYERS")
title(s, "三层记忆，各管一件事。", 0.72, 1.0, 9.0, 0.8, 30)
subtitle(s, "不是把聊天记录原样堆起来，而是把“过程、事实、整体”拆成可检索的三层。", 0.74, 1.86, 10.5, 0.5)
layers = [
    ("L1", "对话层", "这一轮要什么、做了什么、结果如何。", ["summary", "topics / intent", "session / turn", "·源 / ·指针"], RED),
    ("L2", "事实层", "跨会话复用的原子事实与纠正。", ["preference / decision", "fact / correction", "scope / tags", "confidence"], TEAL),
    ("L3", "全息层", "多轮压缩成的整体印象与待续。", ["hologram", "themes / entities", "open loops", "source sessions"], GOLD),
]
for i, (tag, name, desc, fields, color) in enumerate(layers):
    x = 0.74 + i * 4.0
    card(s, x, 2.7, 3.7, 3.55)
    rect(s, x, 2.7, 0.12, 3.55, color, None, 0, False)
    text(s, tag, x + 0.3, 2.96, 0.6, 0.24, size=10, color=color, bold=True, font=EN)
    text(s, name, x + 0.3, 3.25, 2.7, 0.38, size=19, color=INK, bold=True, font=FONT)
    text(s, desc, x + 0.3, 3.75, 2.95, 0.55, size=10, color=MUTED, font=FONT, line_spacing=1.35)
    hline(s, x + 0.3, 4.42, 3.05, LINE, 0.7)
    for j, f in enumerate(fields):
        text(s, "· " + f, x + 0.3, 4.62 + j * 0.32, 3.0, 0.22, size=8.8, color=INK2, font=CODE)
text(s, "每条记录都带 id、scope、重要度、证据等级与 revision；先成证据，再谈记忆。", 0.74, 6.5, 11.6, 0.26, size=10, color=FAINT, font=FONT)
footer(s, 3)

# ---------------------------------------------------------------------------
# 04 WRITE PATH
# ---------------------------------------------------------------------------
s = prs.slides.add_slide(prs.slide_layouts[6]); bg(s)
kicker_num(s, "03", "WRITE PATH")
title(s, "先记账，再让账本变聪明。", 0.72, 1.0, 9.8, 0.8, 30)
subtitle(s, "turn/end 之后，插件在后台把这一轮蒸馏成结构化记录，再合并进账本。", 0.74, 1.86, 10.6, 0.4)
steps = [
    ("01", "捕获", "turn/start → user → assistant → turn/end\n每个 session 一个 TurnCapture"),
    ("02", "蒸馏", "一次 LLM 调用输出 L1 / L2 / L3\n失败时退化为确定性 L1 摘要"),
    ("03", "校验", "JSON 提取、字段限长、secrets redaction\n空值 / 非法值 / 重复项过滤"),
    ("04", "合并", "L1 同轮更新；L2 近似去重；L3 按 id 修订\n旧版本进入 history，不静默覆盖"),
    ("05", "落盘", "三层 JSON 原子写\n异步向量化 + neuron 增量 sync"),
]
for i, (n, h, body) in enumerate(steps):
    y = 2.55 + i * 0.78
    text(s, n, 0.76, y, 0.45, 0.24, size=9, color=RED, bold=True, font=EN)
    hline(s, 1.2, y + 0.12, 1.0, RED if i == 0 else LINE, 1.4 if i == 0 else 0.7)
    text(s, h, 2.5, y - 0.04, 1.1, 0.3, size=14, color=INK, bold=True, font=FONT)
    text(s, body, 3.7, y - 0.04, 8.25, 0.55, size=9.6, color=MUTED, font=FONT, line_spacing=1.35)
# right note
card(s, 0.78, 6.28, 11.7, 0.46, RGBColor(0xEC, 0xE9, 0xDF), None)
text(s, "纪律：不写 secrets；不写“可读 repo”的琐事；L1 是证据层，不随手删除。", 0.98, 6.4, 11.25, 0.22, size=9.2, color=INK2, font=FONT)
footer(s, 4)

# ---------------------------------------------------------------------------
# 05 READ PATH
# ---------------------------------------------------------------------------
s = prs.slides.add_slide(prs.slide_layouts[6]); bg(s)
kicker_num(s, "04", "READ PATH")
title(s, "四路召回，最后只留一小段。", 0.72, 1.0, 10.0, 0.8, 30)
subtitle(s, "每个新问题，先找候选，再做 RRF 融合、配额与预算裁剪；最后只注入最相关的一小段。", 0.74, 1.86, 10.8, 0.4)
# flow
flow = [("QUERY", "用户消息", 0.8), ("4 CHANNELS", "BM25 / n-gram / 向量 / neuron", 3.28), ("RRF", "rank fusion", 6.88), ("BUDGET", "5k 字符", 9.55)]
for i, (tag, desc, x) in enumerate(flow):
    w = [1.85, 3.05, 2.0, 1.55][i]
    card(s, x, 2.62, w, 0.82, CARD if i != 1 else RGBColor(0xE9, 0xEF, 0xEA))
    text(s, tag, x + 0.16, 2.76, w - 0.2, 0.2, size=8, color=RED if i == 3 else TEAL, bold=True, font=EN)
    text(s, desc, x + 0.16, 3.02, w - 0.2, 0.26, size=9.5, color=INK, bold=True, font=FONT)
    if i < 3:
        text(s, "→", x + w + 0.08, 2.9, 0.3, 0.3, size=14, color=FAINT, font=EN)
# detail cards
channels = [
    ("BM25", "词项匹配，零依赖，永远可用"),
    ("n-gram", "中文子串、错字、中英混合补位"),
    ("Vector", "Qwen3-Embedding-8B，cosine + baseline 校准"),
    ("Neuron", "双部图扩散出候选 holo id；正文仍由 holo 读取"),
]
for i, (h, body) in enumerate(channels):
    x = 0.78 + i * 3.02
    text(s, ["01", "02", "03", "04"][i], x, 3.82, 0.4, 0.2, size=8, color=RED if i == 3 else TEAL, bold=True, font=EN)
    text(s, h, x + 0.35, 3.78, 1.8, 0.24, size=10.5, color=INK, bold=True, font=EN)
    text(s, body, x, 4.08, 2.62, 0.5, size=8.8, color=MUTED, font=FONT, line_spacing=1.35)
hline(s, 0.78, 4.88, 11.65, LINE, 0.7)
text(s, "裁剪规则", 0.78, 5.08, 1.2, 0.22, size=8, color=FAINT, font=EN, bold=True)
rich(s, [("L1×2", INK, True, FONT, 12), ("   ", MUTED, False, FONT, 10), ("L2×5", INK, True, FONT, 12), ("   ", MUTED, False, FONT, 10), ("L3×3", INK, True, FONT, 12),
         ("   +   ", FAINT, False, FONT, 10), ("Active Window", TEAL, True, FONT, 12), ("   +   ", FAINT, False, FONT, 10), ("neuron 保留名额", RED, True, FONT, 12)], 2.0, 5.04, 10.2, 0.3)
text(s, "预算 5,000 字符；neuron 候选在预算中优先于 Active Window，避免“算了但没进去”。", 0.78, 5.5, 11.5, 0.26, size=9.4, color=FAINT, font=FONT)
text(s, "注入行只带 id 后缀与证据等级；原文可用 memory_open 回取。", 0.78, 5.92, 11.5, 0.26, size=9.4, color=FAINT, font=FONT)
footer(s, 5)

# ---------------------------------------------------------------------------
# 06 NEURON
# ---------------------------------------------------------------------------
s = prs.slides.add_slide(prs.slide_layouts[6]); bg(s)
kicker_num(s, "05", "ASSOCIATIVE INDEX")
title(s, "账本之外，再放一张联想索引。", 0.72, 1.0, 10.2, 0.8, 30)
subtitle(s, "neuron-memory 不复制正文，只保存 memory ↔ entity 的双部图；扩散出候选 id，正文仍回 holo 取。", 0.74, 1.86, 10.6, 0.5)
# graph motif
memory_points = [(2.25, 3.55, 0.34), (4.15, 2.95, 0.34), (4.1, 4.35, 0.34), (6.2, 3.55, 0.34)]
entity_points = [(3.05, 2.55), (3.45, 4.0), (5.0, 3.2), (5.25, 4.1)]
for mx, my, _ in memory_points:
    for ex, ey in entity_points:
        if abs(ex - mx) < 1.6 and abs(ey - my) < 1.4:
            connector = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(mx), Inches(my), Inches(ex), Inches(ey))
            connector.line.color.rgb = LINE
            connector.line.width = Pt(0.75)
for cx, cy, r in memory_points:
    shape = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(cx - r), Inches(cy - r), Inches(r * 2), Inches(r * 2))
    shape.fill.solid(); shape.fill.fore_color.rgb = RGBColor(0xE7, 0xEF, 0xEA); shape.line.color.rgb = TEAL; shape.line.width = Pt(0.8)
for i, (ex, ey) in enumerate(entity_points):
    shape = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(ex - 0.13), Inches(ey - 0.13), Inches(0.26), Inches(0.26))
    shape.fill.solid(); shape.fill.fore_color.rgb = RED if i % 2 == 0 else GOLD; shape.line.fill.background()
text(s, "memory", 1.7, 3.62, 1.0, 0.2, size=8, color=TEAL, font=EN, bold=True)
text(s, "entity", 3.08, 2.18, 0.8, 0.2, size=8, color=RED, font=EN, bold=True)
# right side copy
x = 7.0
text(s, "扩散激活", x, 2.64, 4.8, 0.26, size=8, color=RED, bold=True, font=EN)
text(s, "depth 2  ·  damping 0.62", x, 2.92, 4.9, 0.3, size=15, color=INK, bold=True, font=FONT)
text(s, "minSignal 0.025  ·  topK 8", x, 3.28, 4.9, 0.26, size=10, color=MUTED, font=CODE)
hline(s, x, 3.72, 5.0, LINE, 0.7)
for i, (k, v) in enumerate([("427", "memory 节点"), ("1308", "entity 节点"), ("2014", "mention 边"), ("4.7", "平均度数")]):
    text(s, k, x + (i % 2) * 2.55, 3.92 + (i // 2) * 0.92, 1.8, 0.36, size=22, color=INK, bold=True, font=EN)
    text(s, v, x + (i % 2) * 2.55, 4.3 + (i // 2) * 0.92, 2.1, 0.22, size=8.8, color=FAINT, font=FONT)
text(s, "引用反馈会加强被用过的边；度数上限与增量 sync 防止图失控。", x, 5.96, 5.1, 0.3, size=9, color=FAINT, font=FONT)
footer(s, 6)

# ---------------------------------------------------------------------------
# 07 WORKSTEP
# ---------------------------------------------------------------------------
s = prs.slides.add_slide(prs.slide_layouts[6]); bg(s)
kicker_num(s, "06", "VISIBLE RECALL")
title(s, "召回，终于在工作步骤里看得见。", 0.72, 1.0, 11.2, 0.8, 29)
subtitle(s, "聊天「已完成」里多了一行可折叠召回；轨迹里保留完整正文。不是只写日志，是真能看到。", 0.74, 1.84, 11.0, 0.42)
picture_contain(s, HERE / "workstep.png", 0.78, 2.55, 7.35, 4.13)
# annotations
text(s, "① 折叠行", 8.5, 2.62, 1.7, 0.24, size=8.5, color=RED, bold=True, font=EN)
text(s, "「长期记忆自动召回 | holo-memory」\n显示当轮字符数。", 8.5, 2.9, 3.9, 0.65, size=9.6, color=INK2, font=FONT, line_spacing=1.4)
text(s, "② 展开内容", 8.5, 3.72, 2.0, 0.24, size=8.5, color=RED, bold=True, font=EN)
text(s, "query、L1/L2/L3 数量、\nselected id、channels、score。", 8.5, 4.0, 3.9, 0.65, size=9.6, color=INK2, font=FONT, line_spacing=1.4)
text(s, "③ 轨迹全文", 8.5, 4.82, 2.0, 0.24, size=8.5, color=RED, bold=True, font=EN)
text(s, "轨迹页保留完整召回正文，\n工作步骤只放摘要，避免喧宾夺主。", 8.5, 5.1, 3.95, 0.7, size=9.6, color=INK2, font=FONT, line_spacing=1.4)
text(s, "v0.5.2 新增", 8.5, 6.12, 1.4, 0.24, size=8.5, color=TEAL, bold=True, font=EN)
footer(s, 7)

# ---------------------------------------------------------------------------
# 08 SOURCE / AUDIT
# ---------------------------------------------------------------------------
s = prs.slides.add_slide(prs.slide_layouts[6]); bg(s)
kicker_num(s, "07", "EVIDENCE")
title(s, "能回到原文，才算记住。", 0.72, 1.0, 9.8, 0.8, 30)
subtitle(s, "每条记录都有来源指针、证据等级、修订历史；memory_open 可以回取，不确定就明确说没有。", 0.74, 1.86, 10.8, 0.42)
evidence = [("·源", "逐字摘录 + hash", "新记录默认带 excerpt；memory_open 可校验。", RED),
            ("·指针", "只有 session / turn", "旧记录诚实降级，不伪造原文。", GOLD),
            ("·手写", "memory_note", "人工登记；正文可直接回取。", TEAL)]
for i, (tag, h, body, color) in enumerate(evidence):
    x = 0.78 + i * 4.02
    card(s, x, 2.76, 3.72, 1.76)
    text(s, tag, x + 0.26, 2.96, 0.9, 0.24, size=11, color=color, bold=True, font=FONT)
    text(s, h, x + 0.26, 3.3, 3.15, 0.3, size=14, color=INK, bold=True, font=FONT)
    text(s, body, x + 0.26, 3.7, 3.1, 0.55, size=9.2, color=MUTED, font=FONT, line_spacing=1.35)
hline(s, 0.78, 4.9, 11.8, LINE, 0.7)
for i, (h, body) in enumerate([("memory_open(id)", "来源指针 / 原文 / 修订历史"), ("memory_doctor", "真打开一条来源 + 跑一次召回探针"), ("injections.jsonl", "每轮实际注入了哪些 id / 多少字符")]):
    x = 0.78 + i * 4.0
    text(s, "0" + str(i + 1), x, 5.12, 0.4, 0.2, size=8, color=RED, bold=True, font=EN)
    text(s, h, x, 5.38, 3.6, 0.28, size=11, color=INK, bold=True, font=CODE)
    text(s, body, x, 5.7, 3.55, 0.28, size=9, color=MUTED, font=FONT)
text(s, "“忘了”不是缺陷，“假装记得”才是。", 0.78, 6.35, 8.5, 0.28, size=11.2, color=FAINT, font=FONT)
footer(s, 8)

# ---------------------------------------------------------------------------
# 09 MAINTENANCE
# ---------------------------------------------------------------------------
s = prs.slides.add_slide(prs.slide_layouts[6]); bg(s)
kicker_num(s, "08", "MAINTENANCE")
title(s, "每天凌晨，替记忆做一次减法。", 0.72, 1.0, 10.5, 0.8, 30)
subtitle(s, "L2 事实和 L3 全息不删；只归档过期、低重要度的 L1，让账本不无限膨胀。", 0.74, 1.86, 10.8, 0.4)
# clock block
card(s, 0.78, 2.62, 3.25, 3.42, RGBColor(0xEC, 0xE9, 0xDF), None)
text(s, "04:30", 1.02, 2.88, 2.6, 0.75, size=42, color=RED, bold=True, font=EN)
text(s, "本地时间 / 每天", 1.04, 3.7, 2.4, 0.24, size=9, color=MUTED, font=FONT)
hline(s, 1.04, 4.05, 2.65, LINE, 0.7)
text(s, "启动补跑", 1.04, 4.22, 1.2, 0.22, size=8, color=FAINT, font=EN)
text(s, "上次运行 > 20h\n或从未运行 → 30s 后补跑", 1.04, 4.45, 2.75, 0.6, size=9.4, color=INK2, font=FONT, line_spacing=1.4)
# threshold table
text(s, "归档规则", 4.45, 2.62, 2.0, 0.24, size=8.5, color=FAINT, font=EN, bold=True)
rows = [("14 天", "且重要度 < 8", "归档"),
        ("60 天", "无论重要度", "归档"),
        ("L2 / L3", "不参与归档", "保留")]
for i, (a, b, c) in enumerate(rows):
    y = 2.98 + i * 0.82
    hline(s, 4.45, y + 0.55, 7.8, LINE, 0.5)
    text(s, a, 4.45, y, 1.4, 0.28, size=14, color=INK, bold=True, font=EN)
    text(s, b, 6.0, y + 0.04, 3.4, 0.26, size=9.8, color=MUTED, font=FONT)
    text(s, c, 10.9, y + 0.03, 1.2, 0.26, size=9, color=RED if c == "归档" else TEAL, bold=True, font=FONT, align=PP_ALIGN.RIGHT)
text(s, "顺序很重要：先追加 archive/l1-YYYY-MM.jsonl，再从活跃 l1.json 移除；归档文件只追加，不自动删除。", 4.45, 5.62, 8.1, 0.4, size=9.4, color=INK2, font=FONT, line_spacing=1.4)
text(s, "手动预览：memory_maintenance(dryRun=true)", 4.45, 6.22, 7.5, 0.24, size=9, color=FAINT, font=CODE)
footer(s, 9)

# ---------------------------------------------------------------------------
# 10 CONSOLE
# ---------------------------------------------------------------------------
s = prs.slides.add_slide(prs.slide_layouts[6]); bg(s)
kicker_num(s, "09", "CONSOLE")
title(s, "记忆不是黑箱。", 0.72, 1.0, 8.0, 0.8, 30)
subtitle(s, "控制台可以看记录、查证据、跑体检、管向量；新增的神经元页看索引，而不是看正文。", 0.74, 1.84, 6.1, 0.7)
picture_contain(s, DOCS / "console.png", 0.78, 2.55, 6.0, 4.2)
# right descriptors
x = 7.15
text(s, "记忆总览", x, 2.66, 2.2, 0.24, size=9, color=RED, bold=True, font=EN)
text(s, "L1 / L2 / L3 计数、向量覆盖、占用、证据链覆盖、最近注入。", x, 2.92, 4.8, 0.5, size=9.3, color=MUTED, font=FONT, line_spacing=1.35)
text(s, "神经元记忆", x, 3.58, 2.3, 0.24, size=9, color=TEAL, bold=True, font=EN)
text(s, "节点 / 边 / 度数 / 按层分布 / Top 实体。只展示图元数据，正文仍回 holo。", x, 3.84, 4.9, 0.55, size=9.3, color=MUTED, font=FONT, line_spacing=1.35)
text(s, "体检与审计", x, 4.56, 2.3, 0.24, size=9, color=GOLD, bold=True, font=EN)
text(s, "memory_doctor 真打开来源、跑召回探针；injections.jsonl 记录每次注入。", x, 4.82, 4.9, 0.55, size=9.3, color=MUTED, font=FONT, line_spacing=1.35)
hline(s, x, 5.55, 4.8, LINE, 0.7)
text(s, "纯本地 JSON · 无服务端 · 无遥测", x, 5.72, 4.8, 0.24, size=8.8, color=FAINT, font=EN)
footer(s, 10)

# ---------------------------------------------------------------------------
# 11 TOOLS
# ---------------------------------------------------------------------------
s = prs.slides.add_slide(prs.slide_layouts[6]); bg(s)
kicker_num(s, "10", "TOOLS")
title(s, "自动召回是主路径，工具是手动门。", 0.72, 1.0, 10.8, 0.8, 29)
subtitle(s, "日常不需要记命令；需要精确操作时，九个 holo 工具与三个 neuron 工具都在。", 0.74, 1.86, 10.7, 0.4)
holo = ["memory_stats", "memory_recall", "memory_list", "memory_open", "memory_note", "memory_forget", "memory_injections", "memory_maintenance", "memory_doctor"]
neuron = ["neuron_ingest", "neuron_expand", "neuron_stats"]
text(s, "HOLO", 0.78, 2.7, 1.0, 0.22, size=8, color=RED, bold=True, font=EN)
for i, name in enumerate(holo):
    x = 0.78 + (i % 3) * 3.95
    y = 2.98 + (i // 3) * 0.72
    rect(s, x, y, 3.55, 0.46, CARD, LINE, 0.5, True)
    text(s, name, x + 0.16, y + 0.11, 3.2, 0.24, size=9.6, color=INK, font=CODE)
text(s, "NEURON", 0.78, 5.3, 1.2, 0.22, size=8, color=TEAL, bold=True, font=EN)
for i, name in enumerate(neuron):
    x = 0.78 + i * 3.95
    rect(s, x, 5.58, 3.55, 0.46, RGBColor(0xE9, 0xEF, 0xEA), TEAL, 0.5, True)
    text(s, name, x + 0.16, 5.69, 3.2, 0.24, size=9.6, color=TEAL, font=CODE)
text(s, "最常用的是 memory_open：回答里看到 id，就回取原文再下结论。", 0.78, 6.4, 11.6, 0.26, size=9.2, color=FAINT, font=FONT)
footer(s, 11)

# ---------------------------------------------------------------------------
# 12 INSTALL
# ---------------------------------------------------------------------------
s = prs.slides.add_slide(prs.slide_layouts[6]); bg(s)
kicker_num(s, "11", "INSTALL")
title(s, "三步装好，重启生效。", 0.72, 1.0, 9.0, 0.8, 30)
subtitle(s, "桌面版的 profile 由应用独占管理；推荐在应用内「设置 → 插件」添加本地目录。", 0.74, 1.86, 10.8, 0.4)
install = [("01", "构建", "cd dsh-holo-memory\nnpm install\nnpm run build", 0.78),
           ("02", "安装", "设置 → 插件 → 添加插件\n包名或地址填本地目录\n（neuron 可选，同仓库 neuron-memory/）", 4.68),
           ("03", "重启", "完全退出 DSH 再启动\n工具与 client bundle 只在启动加载\n开新会话验证", 8.58)]
for n, h, body, x in install:
    card(s, x, 2.66, 3.58, 2.55)
    text(s, n, x + 0.24, 2.86, 0.5, 0.22, size=8.5, color=RED, bold=True, font=EN)
    text(s, h, x + 0.24, 3.14, 2.8, 0.34, size=18, color=INK, bold=True, font=FONT)
    text(s, body, x + 0.24, 3.6, 3.05, 1.2, size=8.7, color=MUTED, font=CODE, line_spacing=1.45)
# config strip
text(s, "生产建议（profile 覆盖）", 0.78, 5.52, 2.6, 0.22, size=8, color=FAINT, font=EN, bold=True)
rect(s, 0.78, 5.78, 11.65, 0.72, DARK, None, 0, True)
text(s, "injectMaxChars: 5000   ·   activeWindowMaxChars: 1200   ·   injectL2: 5   ·   injectL3: 3", 0.98, 5.97, 11.2, 0.28, size=9.6, color=RGBColor(0xE8, 0xDC, 0xC7), font=CODE)
text(s, "改配置文件后同样需要重启；不要把 embedding key 或 API key 写进仓库。", 0.78, 6.62, 11.6, 0.22, size=8.8, color=FAINT, font=FONT)
footer(s, 12)

# ---------------------------------------------------------------------------
# 13 RELIABILITY
# ---------------------------------------------------------------------------
s = prs.slides.add_slide(prs.slide_layouts[6]); bg(s)
kicker_num(s, "12", "RELIABILITY")
title(s, "能验证的，才敢长期用。", 0.72, 1.0, 9.5, 0.8, 30)
subtitle(s, "存储可审计、来源可回取、失败可降级；记忆不是“感觉对了”，而是一条条能查的证据。", 0.74, 1.86, 10.8, 0.4)
metrics = [("34 / 34", "holo 单元测试"), ("7 / 7", "neuron 单元测试"), ("14", "doctor 检查项"), ("0", "生产数据被改写")]
for i, (v, l) in enumerate(metrics):
    x = 0.78 + i * 3.02
    text(s, v, x, 2.72, 2.7, 0.5, size=26, color=RED if i < 2 else TEAL, bold=True, font=EN)
    text(s, l, x, 3.3, 2.7, 0.24, size=9, color=MUTED, font=FONT)
    hline(s, x, 3.68, 2.55, LINE, 0.7)
# reliability list
items = [("本地账本", "L1/L2/L3 JSON，原子写；可备份、可 diff、可人工阅读。"),
         ("失败降级", "LLM 蒸馏失败 → 确定性 L1；embedding 不可用 → 词法/ngram 继续；neuron 缺失 → 三通道照常。"),
         ("并发安全", "neuron graph 唯一临时文件 + 串行写 + mutation 锁；可选同步异常不再拖垮 host。"),
         ("边界诚实", "旧记录没有逐字来源就标 ·指针；memory_open 不编造原文。")]
for i, (h, body) in enumerate(items):
    y = 4.0 + i * 0.64
    text(s, "0" + str(i + 1), 0.8, y, 0.4, 0.2, size=7.5, color=FAINT, font=EN)
    text(s, h, 1.3, y - 0.02, 1.55, 0.24, size=10.5, color=INK, bold=True, font=FONT)
    text(s, body, 2.95, y - 0.02, 9.4, 0.26, size=8.9, color=MUTED, font=FONT)
text(s, "没有默认开启“全自动相信”；先测试、再观察、再启用。", 0.8, 6.62, 11.6, 0.24, size=9.2, color=FAINT, font=FONT)
footer(s, 13)

# ---------------------------------------------------------------------------
# 14 CLOSE
# ---------------------------------------------------------------------------
s = prs.slides.add_slide(prs.slide_layouts[6]); bg(s)
rect(s, 0.42, 0.34, 12.49, 6.82, PAPER, LINE, 0.5, False)
text(s, "DEEPSEEK HARNESS  /  MEMORY PLUGIN", 0.92, 0.82, 6.2, 0.24, size=8.8, color=RED, bold=True, font=EN)
text(s, "让每一次会话，", 0.9, 1.62, 7.0, 0.72, size=38, color=INK, font=SERIF)
text(s, "都从记得开始。", 0.9, 2.3, 7.2, 0.72, size=38, color=INK, font=SERIF)
hline(s, 0.92, 3.28, 1.9, RED, 2.2)
text(s, "dsh-holo-memory 0.5.2", 0.92, 3.58, 5.0, 0.3, size=12, color=INK2, bold=True, font=FONT)
text(s, "三层全息账本 · 四通道召回 · 神经元联想 · 工作步骤可视化", 0.92, 3.96, 7.0, 0.3, size=9.6, color=MUTED, font=FONT)
text(s, "github.com/Kaede-Ayaki/dsh-holo-memory", 0.92, 4.56, 6.6, 0.3, size=9.8, color=TEAL, font=CODE)
text(s, "v0.5.2  ·  tag v0.5.2  ·  2026.11", 0.92, 6.15, 4.5, 0.24, size=8.8, color=FAINT, font=EN)
text(s, "下一幕：配音。", 9.0, 6.08, 3.4, 0.24, size=9.2, color=RED, bold=True, font=FONT, align=PP_ALIGN.RIGHT)

prs.save(OUT)
print("saved", OUT, "slides", len(prs.slides))


