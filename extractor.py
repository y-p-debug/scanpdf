#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pdf_gray_box_extractor.py
Quét file PDF dạng job posting dựa theo màu sắc khung tiêu đề và khung nội dung.
Chính xác theo thuật toán phát hiện màu nền đậm nhất (luminance thấp nhất)
và liên kết khung tiêu đề với khung nội dung.
"""

import argparse
import glob
import json
import os
import re
import shutil
import sys
import tempfile
import traceback
from collections import OrderedDict

import pdfplumber
import pandas as pd

try:
    from PIL import Image as PILImage
    _HAS_PIL = True
except ImportError:
    _HAS_PIL = False

_ILLEGAL_EXCEL_CHARS_RE = None

def _get_illegal_chars_re():
    global _ILLEGAL_EXCEL_CHARS_RE
    if _ILLEGAL_EXCEL_CHARS_RE is None:
        _ILLEGAL_EXCEL_CHARS_RE = re.compile("[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
    return _ILLEGAL_EXCEL_CHARS_RE

def _clean_text_for_excel(text):
    if not isinstance(text, str):
        return text
    return _get_illegal_chars_re().sub("", text)

TITLE_NEAR_WHITE_LUM = 0.92
TITLE_COLOR_TOLERANCE = 0.12
TITLE_MIN_RECT_AREA = 200
TITLE_MIN_RECT_SIDE = 6
TITLE_MIN_OCCURRENCE = 2
GROUP_SIMILARITY_THRESHOLD = 0.8

def _color_key(color, precision=2):
    if color is None:
        return None
    if isinstance(color, (int, float)):
        v = round(color, precision)
        return (v, v, v)
    if isinstance(color, (list, tuple)) and len(color) >= 3:
        return tuple(round(v, precision) for v in color[:3])
    return None

def _color_luminance(color):
    if color is None:
        return 1.0
    if isinstance(color, (int, float)):
        return float(color)
    if isinstance(color, (list, tuple)) and len(color) >= 3:
        return float(sum(color[:3]) / 3)
    return 1.0

def _detect_title_color(pdf):
    color_counts = {}
    color_rep = {}
    for page in pdf.pages:
        for r in page.rects:
            if not r.get("fill"):
                continue
            color = r.get("non_stroking_color")
            lum = _color_luminance(color)
            if lum >= TITLE_NEAR_WHITE_LUM:
                continue
            w = r["x1"] - r["x0"]
            h = r["bottom"] - r["top"]
            if w < TITLE_MIN_RECT_SIDE or h < TITLE_MIN_RECT_SIDE:
                continue
            area = w * h
            if area < TITLE_MIN_RECT_AREA:
                continue
            key = _color_key(color)
            if key is None:
                continue
            color_counts[key] = color_counts.get(key, 0) + 1
            color_rep.setdefault(key, color)

    if not color_rep:
        return None

    candidates = [(k, c) for k, c in color_rep.items() if color_counts[k] >= TITLE_MIN_OCCURRENCE]
    if not candidates:
        candidates = list(color_rep.items())

    _darkest_key, darkest_color = min(candidates, key=lambda kv: _color_luminance(kv[1]))
    return darkest_color

def _is_title_color(color, title_color):
    if color is None or title_color is None:
        return False
    if isinstance(color, (list, tuple)) and isinstance(title_color, (list, tuple)):
        a = color[:3]
        b = title_color[:3]
        return max(abs(x - y) for x, y in zip(a, b)) <= TITLE_COLOR_TOLERANCE
    return abs(_color_luminance(color) - _color_luminance(title_color)) <= TITLE_COLOR_TOLERANCE

def _bbox_center(bbox):
    x0, top, x1, bottom = bbox
    return ((x0 + x1) / 2, (top + bottom) / 2)

def _title_rects_on_page(page, title_color):
    rects = []
    if title_color is None:
        return rects
    for r in page.rects:
        if r.get("fill") and _is_title_color(r.get("non_stroking_color"), title_color):
            rects.append((r["x0"], r["top"], r["x1"], r["bottom"]))
    return rects

def _bbox_is_title(bbox, title_rects):
    cx, cy = _bbox_center(bbox)
    for (x0, top, x1, bottom) in title_rects:
        if x0 - 0.5 <= cx <= x1 + 0.5 and top - 0.5 <= cy <= bottom + 0.5:
            return True
    return False

def _text_in_bbox(page, bbox):
    x0, top, x1, bottom = bbox
    cropped = page.within_bbox((x0, top, x1, bottom), relative=False, strict=False) \
        if hasattr(page, "within_bbox") else page.crop((x0, top, x1, bottom))
    txt = cropped.extract_text() or ""
    return txt.strip()

IMAGE_EXPORT_MAX_WIDTH_PX = 320
IMAGE_EXPORT_RESOLUTION = 150

class ImageRef:
    def __init__(self, path):
        self.path = path
    def __repr__(self):
        return f"ImageRef({self.path!r})"

def _bbox_has_image(page, bbox):
    x0, top, x1, bottom = bbox
    for im in page.images:
        cx = (im["x0"] + im["x1"]) / 2
        cy = (im["top"] + im["bottom"]) / 2
        if x0 - 1 <= cx <= x1 + 1 and top - 1 <= cy <= bottom + 1:
            return True
    return False

def _clip_bbox_to_page(bbox, page):
    x0, top, x1, bottom = bbox
    x0 = max(0, min(x0, page.width))
    x1 = max(0, min(x1, page.width))
    top = max(0, min(top, page.height))
    bottom = max(0, min(bottom, page.height))
    if x1 <= x0 or bottom <= top:
        return None
    return (x0, top, x1, bottom)

def _export_region_image(page, bbox, out_dir, base_name):
    bbox = _clip_bbox_to_page(bbox, page)
    if bbox is None:
        return None
    try:
        cropped = page.crop(bbox)
        page_image = cropped.to_image(resolution=IMAGE_EXPORT_RESOLUTION)
        pil_img = getattr(page_image, "original", None)
        if pil_img is None:
            return None
        w, h = pil_img.size
        if w > IMAGE_EXPORT_MAX_WIDTH_PX:
            ratio = IMAGE_EXPORT_MAX_WIDTH_PX / w
            pil_img = pil_img.resize((IMAGE_EXPORT_MAX_WIDTH_PX, max(1, int(h * ratio))))
        os.makedirs(out_dir, exist_ok=True)
        path = os.path.join(out_dir, f"{base_name}.png")
        pil_img.convert("RGB").save(path, "PNG")
        return path
    except Exception:
        return None

def _union_bbox(bboxes):
    x0 = min(b[0] for b in bboxes)
    top = min(b[1] for b in bboxes)
    x1 = max(b[2] for b in bboxes)
    bottom = max(b[3] for b in bboxes)
    return (x0, top, x1, bottom)

def _stitch_images_vertically(paths, out_path, gap=6):
    if not _HAS_PIL:
        return paths[0] if paths else None

    imgs = []
    for p in paths:
        try:
            imgs.append(PILImage.open(p))
        except Exception:
            continue
    if not imgs:
        return None
    if len(imgs) == 1:
        return paths[0]

    total_w = max(im.size[0] for im in imgs)
    total_h = sum(im.size[1] for im in imgs) + gap * (len(imgs) - 1)
    canvas = PILImage.new("RGB", (total_w, total_h), "white")
    y = 0
    for im in imgs:
        has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
        if has_alpha:
            im_rgba = im.convert("RGBA")
            canvas.paste(im_rgba, (0, y), im_rgba)
        else:
            canvas.paste(im.convert("RGB"), (0, y))
        y += im.size[1] + gap
    canvas.save(out_path, "PNG")
    return out_path

import re

def _extract_embedded_key_values(text):
    """
    Checks if text has lines with 'Key: Value' or 'Key：Value'.
    Japanese labels: 2-15 chars, followed by colon or fullwidth colon.
    Returns list of (key, value) pairs if at least 2 key-value lines found.
    Otherwise returns None.
    """
    if not text:
        return None
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    kv_pattern = re.compile(r'^([^\s:：]{2,15})[:：]\s*(.*)$')
    
    parsed = []
    current_k = None
    current_v = []
    matches_count = 0
    
    for line in lines:
        m = kv_pattern.match(line)
        if m:
            matches_count += 1
            if current_k:
                parsed.append((current_k, "\n".join(current_v).strip()))
            current_k = m.group(1).strip()
            val = m.group(2).strip()
            current_v = [val] if val else []
        else:
            if current_k:
                current_v.append(line)
            else:
                return None
    if current_k:
        parsed.append((current_k, "\n".join(current_v).strip()))
        
    if matches_count >= 2:
        return parsed
    return None

def _extract_free_text_lines(page, table_bboxes):
    try:
        words = page.extract_words(keep_blank_chars=False, use_text_flow=False)
    except Exception:
        words = []

    def _in_any_table(w):
        cx = (w["x0"] + w["x1"]) / 2
        cy = (w["top"] + w["bottom"]) / 2
        for (x0, top, x1, bottom) in table_bboxes:
            if x0 - 1 <= cx <= x1 + 1 and top - 1 <= cy <= bottom + 1:
                return True
        return False

    free_words = [w for w in words if not _in_any_table(w)]
    free_words.sort(key=lambda w: (round(w["top"], 0), w["x0"]))

    # Step 1: Group words on the same horizontal line
    raw_lines = []
    cur_line = []
    cur_top = None
    for w in free_words:
        if cur_top is None or abs(w["top"] - cur_top) <= 4:
            cur_line.append(w)
            cur_top = w["top"] if cur_top is None else cur_top
        else:
            raw_lines.append(cur_line)
            cur_line = [w]
            cur_top = w["top"]
    if cur_line:
        raw_lines.append(cur_line)

    # Step 2: Build line objects with bbox and text
    line_objs = []
    for line in raw_lines:
        x0 = min(w["x0"] for w in line) - 1
        x1 = max(w["x1"] for w in line) + 1
        top = min(w["top"] for w in line) - 1
        bottom = max(w["bottom"] for w in line) + 1
        bbox = (x0, top, x1, bottom)
        text = _text_in_bbox(page, bbox)
        if text:
            line_objs.append({
                "text": text,
                "bbox": bbox,
                "top": top,
                "bottom": bottom,
                "x0": x0,
                "x1": x1
            })

    # Step 3: Merge consecutive wrapped lines into a single block/paragraph
    # This prevents multi-line text (e.g., job titles/catchphrases) from splitting into separate columns like col 1 & col 29
    merged_lines = []
    i = 0
    while i < len(line_objs):
        curr = dict(line_objs[i])
        while i + 1 < len(line_objs):
            nxt = line_objs[i + 1]
            gap_y = nxt["top"] - curr["bottom"]
            # Close vertical gap indicating a wrapped line in the same paragraph/title
            is_close_vertically = (-2 <= gap_y <= 20)
            horiz_overlap = not (nxt["x1"] < curr["x0"] - 30 or nxt["x0"] > curr["x1"] + 30)

            if is_close_vertically and horiz_overlap:
                curr["text"] = curr["text"] + "\n" + nxt["text"]
                curr["bottom"] = max(curr["bottom"], nxt["bottom"])
                curr["x0"] = min(curr["x0"], nxt["x0"])
                curr["x1"] = max(curr["x1"], nxt["x1"])
                curr["bbox"] = (curr["x0"], curr["top"], curr["x1"], curr["bottom"])
                i += 1
            else:
                break
        merged_lines.append(curr)
        i += 1

    return merged_lines

def extract_pairs_from_pdf(pdf_path, image_out_dir=None):
    if image_out_dir is None:
        image_out_dir = tempfile.mkdtemp(prefix="pdf_extract_imgs_")

    pairs = []
    pending_col_titles = {}
    current_title = None
    seen_company_name = False
    blank_counter = 0
    img_counter = 0
    pdf_base = os.path.splitext(os.path.basename(pdf_path))[0]

    def _new_image_name():
        nonlocal img_counter
        img_counter += 1
        return f"{pdf_base}_{img_counter:03d}"

    with pdfplumber.open(pdf_path) as pdf:
        title_color = _detect_title_color(pdf)

        for page_idx, page in enumerate(pdf.pages):
            title_rects = _title_rects_on_page(page, title_color)
            tables = page.find_tables()
            table_bboxes = [t.bbox for t in tables]
            free_lines = _extract_free_text_lines(page, table_bboxes)

            events = []
            for table in tables:
                for row in table.rows:
                    row_tops = [c[1] for c in row.cells if c]
                    row_top = min(row_tops) if row_tops else 0
                    events.append((row_top, "table_row", row))
            for line in free_lines:
                events.append((line["top"], "free_line", line))

            events.sort(key=lambda e: e[0])

            for _, kind, data in events:
                if kind == "table_row":
                    row = data
                    cell_info = []
                    for idx, cell_bbox in enumerate(row.cells):
                        if cell_bbox is None:
                            continue
                        text = _text_in_bbox(page, cell_bbox)
                        if text:
                            is_title = _bbox_is_title(cell_bbox, title_rects)
                            cell_info.append((idx, "text", text, is_title))
                        elif _bbox_has_image(page, cell_bbox):
                            cell_info.append((idx, "image", cell_bbox, False))

                    if not cell_info:
                        continue

                    title_cells = [c for c in cell_info if c[3]]
                    content_cells = [c for c in cell_info if not c[3]]

                    def _emit_image_pair(label, bboxes):
                        if not label or not bboxes:
                            return
                        merged_bbox = _union_bbox(bboxes)
                        path = _export_region_image(page, merged_bbox, image_out_dir, _new_image_name())
                        if path:
                            pairs.append((label, ImageRef(path)))

                    if title_cells and content_cells:
                        cur_label = current_title
                        pending_image_label = None
                        pending_image_bboxes = []
                        for idx, ckind, payload, is_title in cell_info:
                            if is_title:
                                _emit_image_pair(pending_image_label, pending_image_bboxes)
                                pending_image_label, pending_image_bboxes = None, []
                                cur_label = payload
                                current_title = payload
                                pending_col_titles = {}
                            elif ckind == "text":
                                _emit_image_pair(pending_image_label, pending_image_bboxes)
                                pending_image_label, pending_image_bboxes = None, []
                                label = cur_label if cur_label else f"列{idx}"
                                pairs.append((label, payload))
                            else:
                                if pending_image_label != cur_label:
                                    _emit_image_pair(pending_image_label, pending_image_bboxes)
                                    pending_image_label, pending_image_bboxes = cur_label, []
                                pending_image_bboxes.append(payload)
                        _emit_image_pair(pending_image_label, pending_image_bboxes)

                    elif title_cells and not content_cells:
                        if len(title_cells) == 1:
                            idx0, _k0, text0, _ = title_cells[0]
                            if not seen_company_name:
                                pairs.append(("会社名", text0))
                                seen_company_name = True
                                current_title = None
                                pending_col_titles = {}
                            else:
                                current_title = text0
                                pending_col_titles = {}
                        else:
                            for idx, _k, text, _ in title_cells:
                                pending_col_titles[idx] = text
                            current_title = None

                    else:
                        if pending_col_titles:
                            for idx, ckind, payload, _ in content_cells:
                                label = pending_col_titles.get(idx, f"列{idx}")
                                if ckind == "text":
                                    embedded_kvs = _extract_embedded_key_values(payload)
                                    if embedded_kvs:
                                        for ek, ev in embedded_kvs:
                                            pairs.append((ek, ev))
                                    else:
                                        pairs.append((label, payload))
                                else:
                                    _emit_image_pair(label, [payload])
                        elif current_title:
                            text_parts = [payload for _, ckind, payload, _ in content_cells if ckind == "text"]
                            image_bboxes = [payload for _, ckind, payload, _ in content_cells if ckind == "image"]
                            full_text = "\n".join(text_parts) if text_parts else ""
                            embedded_kvs = _extract_embedded_key_values(full_text) if full_text else None
                            if embedded_kvs:
                                for ek, ev in embedded_kvs:
                                    pairs.append((ek, ev))
                            else:
                                if full_text:
                                    pairs.append((current_title, full_text))
                            if image_bboxes:
                                _emit_image_pair(current_title, image_bboxes)
                        else:
                            text_parts = [payload for _, ckind, payload, _ in content_cells if ckind == "text"]
                            image_bboxes = [payload for _, ckind, payload, _ in content_cells if ckind == "image"]
                            full_text = "\n".join(text_parts) if text_parts else ""
                            embedded_kvs = _extract_embedded_key_values(full_text) if full_text else None
                            if embedded_kvs:
                                for ek, ev in embedded_kvs:
                                    pairs.append((ek, ev))
                            else:
                                label = "詳細"
                                if full_text:
                                    pairs.append((label, full_text))
                            if image_bboxes:
                                _emit_image_pair("詳細", image_bboxes)

                else:
                    line = data
                    text = line["text"]
                    if not text:
                        continue
                    is_title = _bbox_is_title(line["bbox"], title_rects)

                    if is_title:
                        if not seen_company_name:
                            pairs.append(("会社名", text))
                            seen_company_name = True
                            current_title = None
                            pending_col_titles = {}
                        else:
                            current_title = text
                            pending_col_titles = {}
                    else:
                        # Check if this free text is a standalone section heading (e.g. どのような人を求めているか, 求人概要)
                        clean_line = text.strip()
                        is_section_header = (
                            len(clean_line) <= 25 and 
                            (clean_line.endswith("か") or clean_line.endswith("概要") or clean_line.endswith("事項") or clean_line.endswith("について"))
                        )
                        if is_section_header:
                            current_title = None
                            pending_col_titles = {}
                        elif current_title:
                            pairs.append((current_title, text))
                        elif pending_col_titles:
                            label = pending_col_titles.get(0) or next(iter(pending_col_titles.values()))
                            pairs.append((label, text))
                        else:
                            # Keep active free text in "詳細" without creating fragmented "詳細2", "詳細3" columns
                            pairs.append(("詳細", text))

    return pairs

def pairs_to_row_dict(pairs, image_out_dir=None):
    row = OrderedDict()
    image_paths = OrderedDict()

    for label, value in pairs:
        label = _clean_text_for_excel(label.strip()) or "(無題)"
        if isinstance(value, ImageRef):
            image_paths.setdefault(label, []).append(value.path)
            continue
        value = _clean_text_for_excel(value)
        if label in row:
            row[label] = row[label] + "\n" + value
        else:
            row[label] = value

    images = OrderedDict()
    for label, paths in image_paths.items():
        if len(paths) > 1 and image_out_dir:
            stitched = _stitch_images_vertically(
                paths, os.path.join(image_out_dir, f"__stitch_{abs(hash(label)) % 10**8}.png")
            )
            final_path = stitched or paths[0]
        else:
            final_path = paths[0]
        images[label] = final_path
        if label not in row:
            row[label] = f"[Ảnh ({len(paths)})]" if len(paths) > 1 else "[Ảnh]"

    return row, images

def _jaccard_similarity(set_a, set_b):
    if not set_a and not set_b:
        return 1.0
    union = set_a | set_b
    if not union:
        return 1.0
    inter = set_a & set_b
    return len(inter) / len(union)

def group_rows_by_structure(rows, similarity_threshold=GROUP_SIMILARITY_THRESHOLD):
    groups = []
    for row in rows:
        cols = set(k for k in row.keys() if k not in ("_ファイル名", "_images"))
        best_entry = None
        best_score = -1.0
        for entry in groups:
            score = _jaccard_similarity(entry[0], cols)
            if score >= similarity_threshold and score > best_score:
                best_entry = entry
                best_score = score

        if best_entry is not None:
            best_entry[0] = best_entry[0] | cols
            best_entry[1].append(row)
        else:
            groups.append([cols, [row]])

    groups.sort(key=lambda entry: -len(entry[1]))
    return [entry[1] for entry in groups]

def rows_to_dataframe(rows):
    images_list = [row.get("_images", {}) for row in rows]
    clean_rows = [OrderedDict((k, v) for k, v in row.items() if k != "_images") for row in rows]

    all_columns = []
    for row in clean_rows:
        for col in row.keys():
            if col not in all_columns:
                all_columns.append(col)
    if "_ファイル名" in all_columns:
        all_columns.remove("_ファイル名")
        all_columns = ["_ファイル名"] + all_columns

    df = pd.DataFrame(clean_rows)
    df = df.reindex(columns=all_columns)
    df = df.rename(columns={"_ファイル名": "ファイル名"})
    df = df.map(_clean_text_for_excel) if hasattr(df, "map") else df.applymap(_clean_text_for_excel)
    return df, images_list

def _safe_sheet_name(name, used_names):
    name = (name or "Sheet")[:31]
    base = name
    i = 2
    while name in used_names:
        suffix = f" ({i})"
        name = (base[: 31 - len(suffix)]) + suffix
        i += 1
    used_names.add(name)
    return name

def _embed_images_into_sheet(ws, df, images_list, max_display_width_px=140):
    try:
        from openpyxl.drawing.image import Image as XLImage
        from openpyxl.utils import get_column_letter
    except ImportError:
        return

    col_index = {col: idx + 1 for idx, col in enumerate(df.columns)}

    for row_i, images in enumerate(images_list):
        if not images:
            continue
        excel_row = row_i + 2
        row_max_height_px = 0
        for label, path in images.items():
            if label not in col_index or not path or not os.path.exists(path):
                continue
            try:
                xl_img = XLImage(path)
            except Exception:
                continue
            if xl_img.width > max_display_width_px:
                scale = max_display_width_px / xl_img.width
                xl_img.width = max_display_width_px
                xl_img.height = int(xl_img.height * scale)
            col_letter = get_column_letter(col_index[label])
            anchor_cell = f"{col_letter}{excel_row}"
            try:
                ws.add_image(xl_img, anchor_cell)
            except Exception:
                continue
            row_max_height_px = max(row_max_height_px, xl_img.height)
            cur_w = ws.column_dimensions[col_letter].width or 10
            ws.column_dimensions[col_letter].width = max(cur_w, max_display_width_px / 7)
        if row_max_height_px:
            cur_h = ws.row_dimensions[excel_row].height or 15
            ws.row_dimensions[excel_row].height = max(cur_h, row_max_height_px * 0.75 + 6)

def run_extraction_to_excel(pdf_files, output_path, group_by_format=True):
    tmp_img_dir = tempfile.mkdtemp(prefix="pdf_extract_imgs_")
    try:
        rows = []
        for pdf_path in pdf_files:
            pairs = extract_pairs_from_pdf(pdf_path, image_out_dir=tmp_img_dir)
            row, images = pairs_to_row_dict(pairs, image_out_dir=tmp_img_dir)
            row["_ファイル名"] = os.path.basename(pdf_path)
            if images:
                row["_images"] = images
            rows.append(row)

        if not rows:
            return False

        if group_by_format and len(rows) > 1:
            groups = group_rows_by_structure(rows)
        else:
            groups = [rows]

        used_sheet_names = set()
        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            if len(groups) > 1:
                full_df, full_images_list = rows_to_dataframe(rows)
                summary_sheet_name = _safe_sheet_name("Tổng hợp", used_sheet_names)
                full_df.to_excel(writer, sheet_name=summary_sheet_name, index=False)
                ws_summary = writer.sheets[summary_sheet_name]
                _embed_images_into_sheet(ws_summary, full_df, full_images_list)

            for i, grp in enumerate(groups, start=1):
                df, images_list = rows_to_dataframe(grp)
                raw_name = f"Dạng {i}" if len(groups) > 1 else "Dữ liệu"
                sheet_name = _safe_sheet_name(raw_name, used_sheet_names)
                df.to_excel(writer, sheet_name=sheet_name, index=False)
                ws = writer.sheets[sheet_name]
                _embed_images_into_sheet(ws, df, images_list)

        return True
    finally:
        shutil.rmtree(tmp_img_dir, ignore_errors=True)

def process_single_pdf_to_json(pdf_path):
    tmp_img_dir = tempfile.mkdtemp(prefix="pdf_extract_imgs_")
    try:
        with pdfplumber.open(pdf_path) as pdf:
            title_color = _detect_title_color(pdf)
            page_count = len(pdf.pages)

        pairs = extract_pairs_from_pdf(pdf_path, image_out_dir=tmp_img_dir)
        row, images = pairs_to_row_dict(pairs, image_out_dir=tmp_img_dir)

        fields = []
        color_hex = "#374151"
        color_name = "Xám than (#374151)"

        if title_color is not None:
            if isinstance(title_color, (list, tuple)) and len(title_color) >= 3:
                r, g, b = [int(round(c * 255 if c <= 1.0 else c)) for c in title_color[:3]]
                color_hex = f"#{r:02x}{g:02x}{b:02x}"
                color_name = f"Màu tiêu đề ({color_hex})"
            elif isinstance(title_color, (int, float)):
                v = int(round(title_color * 255 if title_color <= 1.0 else title_color))
                color_hex = f"#{v:02x}{v:02x}{v:02x}"
                color_name = f"Xám ({color_hex})"

        for k, v in row.items():
            is_img = "[Ảnh" in str(v)
            fields.append({
                "key": k,
                "value": v,
                "isImage": is_img,
                "hasHandwriting": False,
                "confidence": 0.99,
                "colorNote": "Khung tiêu đề" if k != "詳細" and k != "会社名" else "Nội dung"
            })

        return {
            "fields": fields,
            "detectedTitleColor": color_name,
            "titleColorHex": color_hex,
            "pageCount": page_count
        }
    except Exception as e:
        return {
            "error": str(e),
            "traceback": traceback.format_exc(),
            "fields": []
        }
    finally:
        shutil.rmtree(tmp_img_dir, ignore_errors=True)

if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--export-excel":
        out_excel = sys.argv[2]
        in_files = sys.argv[3:]
        ok = run_extraction_to_excel(in_files, out_excel)
        sys.exit(0 if ok else 1)
    elif len(sys.argv) > 1:
        pdf_file = sys.argv[1]
        res = process_single_pdf_to_json(pdf_file)
        print(json.dumps(res, ensure_ascii=False))
