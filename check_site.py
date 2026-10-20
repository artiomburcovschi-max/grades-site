#!/usr/bin/env python3
"""Проверка сайта перед публикацией: python tools/check_site.py
Ищет: битые внутренние ссылки и якоря, inline-скрипты/стили (их запретит наша CSP), забытые заглушки."""
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = [f for f in os.listdir(ROOT) if f.endswith(".html")]


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.links, self.problems = set(), [], []
        self.in_script = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.add(a["id"])
        if tag == "a" and a.get("href"):
            self.links.append(a["href"])
        if tag in ("link",) and a.get("href"):
            self.links.append(a["href"])
        if tag == "script":
            if a.get("src"):
                self.links.append(a["src"])
            else:
                self.in_script = True
                self.problems.append("inline <script> (CSP его заблокирует)")
        if "style" in a:
            self.problems.append(f"inline style= у <{tag}> (CSP его заблокирует)")
        for k in a:
            if k.startswith("on"):
                self.problems.append(f"inline-обработчик {k}= у <{tag}>")

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_script = False


def main():
    errors = []
    parsed = {}
    for name in PAGES:
        p = Page()
        with open(os.path.join(ROOT, name), encoding="utf-8") as f:
            p.feed(f.read())
        parsed[name] = p
        errors += [f"{name}: {x}" for x in p.problems]

    for name, p in parsed.items():
        for href in p.links:
            if re.match(r"^(https?:|mailto:|data:)", href):
                continue
            path, _, frag = href.partition("#")
            target = name if not path else path
            full = os.path.join(ROOT, target)
            if not os.path.exists(full):
                errors.append(f"{name}: нет файла для ссылки {href}")
                continue
            if frag and target.endswith(".html") and frag not in parsed.get(target, Page()).ids:
                errors.append(f"{name}: нет якоря #{frag} в {target}")

    # заглушки, которые нельзя забыть при публикации
    cfg = open(os.path.join(ROOT, "assets", "config.js"), encoding="utf-8").read()
    warnings = []
    if "GITHUB_USER" in cfg:
        warnings.append("assets/config.js: ещё стоит GITHUB_USER (кнопка скачивания отключена)")
    if re.search(r'signingCertSha256:\s*""', cfg):
        warnings.append("assets/config.js: не заполнен signingCertSha256 (блок с отпечатком скрыт)")
    if any('name="robots" content="noindex' in open(os.path.join(ROOT, n), encoding="utf-8").read() for n in PAGES):
        warnings.append("страницы скрыты от поисковиков (noindex): убери перед публичным запуском")

    for e in errors:
        print("ОШИБКА:", e)
    for w in warnings:
        print("напоминание:", w)
    print("страниц проверено:", len(PAGES))
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
