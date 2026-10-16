import json
from pathlib import Path
from html import escape
root=Path(__file__).resolve().parents[1]
home=(root/'dist/index.html').read_text(encoding='utf8')
header=home[home.index('<header>'):home.index('</header>')+9]
footer=home[home.index('<footer>'):home.index('</footer>')+9]
reader=home[home.index('<dialog'):home.index('</dialog>')+9]
contact=home[home.index('<section id="contact"'):home.index('</section></main>')+10]
stories=home[home.index('<section id="stories"'):home.index('<section id="about"')]
for page in json.loads((root/'content/pages.json').read_text(encoding='utf8')):
 body='<section class="page-hero"><p class="eyebrow">'+escape(page['label'])+'</p><h1>'+escape(page['title'])+'</h1><p class="intro">'+escape(page['intro'])+'</p></section>'
 body+='<section class="page-sections">'+''.join('<article><h2>'+escape(title)+'</h2><p>'+escape(text)+'</p></article>' for title,text in page['sections'])+'</section>'
 scripts='<script src="/config.js" defer></script>'
 if page['slug'] in ('blog-2','explore'):
  body+=stories
  scripts+='<script src="/article-media.js" defer></script><script src="/journal.js" defer></script>'
 if page['slug']=='contact':
  body+=contact
  scripts+='<script src="/contact.js" defer></script>'
 if page['slug']=='quiz-and-survey':
  body+='<section><form id="quiz"></form><p id="quiz-result" role="status"></p></section>'
  scripts+='<script src="/quiz.js" defer></script>'
 body+='<section class="source-note"><p>Adapted from the original Bubloo Scientist website.</p><a href="'+escape(page['source'])+'">Visit the original page ↗</a></section>'
 html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(page['label'].title())+' — Bubloo Scientist</title><meta name="description" content="'+escape(page['intro'])+'"><link rel="stylesheet" href="/style.css">'+scripts+'</head><body><a class="skip" href="#main">Skip to content</a>'+header+'<main id="main">'+body+'</main>'+footer+(reader if page['slug'] in ('blog-2','explore') else '')+'</body></html>'
 html=html.replace('href="#main"','href="/"').replace('href="#contact"','href="/contact/"').replace('href="admin.html"','href="/admin.html"').replace('<a class="skip" href="/">','<a class="skip" href="#main">')
 target=root/'dist'/page['slug'];target.mkdir(exist_ok=True);(target/'index.html').write_text(html,encoding='utf8')
print('Generated 8 content pages.')
