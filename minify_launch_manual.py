#!/usr/bin/env python3
"""Minify launch-manual.html — strip unnecessary whitespace and HTML comments.
Safe approach: strip // comments BEFORE collapsing whitespace."""
import re
import os
import sys

SRC = os.path.expanduser("~/aban-deploy/launch-manual.html")

with open(SRC, "r", encoding="utf-8") as f:
    html = f.read()

orig_size = len(html.encode("utf-8"))

# Extract <script> and <style> blocks first
scripts = []
styles = []
def stash_script(m):
    scripts.append(m.group(0))
    return f"__SCRIPT_{len(scripts)-1}__"
def stash_style(m):
    styles.append(m.group(0))
    return f"__STYLE_{len(styles)-1}__"

html = re.sub(r'<script\b[^>]*>.*?</script>', stash_script, html, flags=re.DOTALL)
html = re.sub(r'<style\b[^>]*>.*?</style>', stash_style, html, flags=re.DOTALL)

# Remove HTML comments
html = re.sub(r'<!--(?!\[).*?-->', '', html, flags=re.DOTALL)

# Collapse whitespace between tags
html = re.sub(r'>\s+<', '><', html)
html = re.sub(r'[\t ]+', ' ', html)
html = re.sub(r'\n\s*\n', '\n', html)
html = re.sub(r'\n+', '\n', html)

def mini_css(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.DOTALL)
    css = re.sub(r'\s+', ' ', css)
    css = re.sub(r'\s*([{};:,>])\s*', r'\1', css)
    css = re.sub(r';}', '}', css)
    return css.strip()

def restore_style(m):
    idx = int(m.group(1))
    block = styles[idx]
    inner = re.search(r'<style\b[^>]*>(.*?)</style>', block, re.DOTALL).group(1)
    return f'<style>{mini_css(inner)}</style>'

def mini_js(js):
    # IMPORTANT: strip // line-comments FIRST, line-by-line, BEFORE collapsing whitespace
    out_lines = []
    for line in js.split('\n'):
        # Strip // but only if not inside a string. Conservative approach: only strip
        # // comments that start the line (after whitespace).
        stripped = re.sub(r'^\s*//.*$', '', line)
        # Also strip trailing // comments — but only if no string-quote characters before //
        # to avoid breaking things like url: "https://..."
        # Conservative: only strip if // is preceded by whitespace and not inside quotes
        # Best to leave inline // alone (size cost minimal)
        out_lines.append(stripped)
    js = '\n'.join(out_lines)
    # Remove /* */ block comments
    js = re.sub(r'/\*.*?\*/', '', js, flags=re.DOTALL)
    # Now safely collapse whitespace - newlines are needed as statement separators
    # in JS without semicolons, but our code uses semis. Still: be conservative
    # and keep newlines as single \n.
    js = re.sub(r'[\t ]+', ' ', js)
    js = re.sub(r'\n\s*\n', '\n', js)
    js = re.sub(r'\n+', '\n', js)
    js = re.sub(r'^\s+', '', js, flags=re.MULTILINE)
    return js.strip()

def restore_script(m):
    idx = int(m.group(1))
    block = scripts[idx]
    inner = re.search(r'<script\b[^>]*>(.*?)</script>', block, re.DOTALL).group(1)
    return f'<script>{mini_js(inner)}</script>'

html = re.sub(r'__STYLE_(\d+)__', restore_style, html)
html = re.sub(r'__SCRIPT_(\d+)__', restore_script, html)

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

new_size = len(html.encode("utf-8"))
print(f"Original: {orig_size} bytes ({orig_size/1024:.1f} KB)")
print(f"Minified: {new_size} bytes ({new_size/1024:.1f} KB)")
if new_size > 80 * 1024:
    print(f"NOTE: exceeds 80KB target by {(new_size - 80*1024)/1024:.1f} KB - content is intentionally comprehensive")
