"""Build both versions of Qadam SAT from app.html + content.js.
   ../index.html -> the website (Firebase sign-in, see ../SETUP.md)"""
import os
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(here, p), encoding='utf-8').read()
app, content = rd('app.html'), rd('content.js')
full = app.replace('/*CONTENT*/', content)

head, body = full.split('<div class="app" id="app">', 1)
body = '<div class="app" id="app" hidden>' + body
body = body.replace('<nav class="nav" aria-label="Main">', '<nav class="nav" aria-label="Main" hidden>')
start = "(function(){\n'use strict';"
assert body.count(start) == 1
body = body.replace(start, "window.startQadam=function(){\n'use strict';")
i = body.rfind('})();')
body = body[:i] + '};' + body[i+5:]
gate = rd('gate.html')
fb = ''.join(f'<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-{m}-compat.js"></script>\n' for m in ('app', 'auth', 'firestore'))
page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="description" content="Daily SAT Reading and Writing practice">\n'
        '<link rel="icon" href="icon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="icon-192.png">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n'
        + head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '') +
        '</head>\n<body>\n' + gate + body.replace('<script>\n', fb + '<script src="config.js"></script>\n<script>\n', 1)
         )
# boot.js must run after the app script defines startQadam
page = page.rstrip() + '\n<script src="boot.js"></script>\n</body>\n</html>\n'
open(os.path.join(here, '..', 'index.html'), 'w', encoding='utf-8').write(page)
print('built', len(full), len(page))
