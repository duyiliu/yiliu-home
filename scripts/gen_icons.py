#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Generate PWA icons for yiliu-home: orange rounded square + white 流 glyph.
Matches existing favicon style (#c96f2c bg, #fff7e7 glyph)."""
from PIL import Image, ImageDraw, ImageFont
import os

FONT = 'C:/Windows/Fonts/msyh.ttc'
ACCENT = '#c96f2c'
GLYPH = '#fff7e7'
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'icons')
os.makedirs(OUT, exist_ok=True)


def make_icon(size, path, rounded=True):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=size // 4, fill=ACCENT)
    else:
        d.rectangle([0, 0, size - 1, size - 1], fill=ACCENT)
    font = ImageFont.truetype(FONT, int(size * 0.46))
    bbox = d.textbbox((0, 0), '流', font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = (size - w) / 2 - bbox[0]
    y = (size - h) / 2 - bbox[1]
    d.text((x, y), '流', font=font, fill=GLYPH)
    img.save(path)
    print('saved', path, img.size)


make_icon(192, os.path.join(OUT, 'icon-192.png'))
make_icon(512, os.path.join(OUT, 'icon-512.png'))
make_icon(192, os.path.join(OUT, 'maskable-192.png'), rounded=False)
make_icon(512, os.path.join(OUT, 'maskable-512.png'), rounded=False)
