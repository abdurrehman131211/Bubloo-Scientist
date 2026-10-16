"""Convert a WordPress Tools > Export XML file into reviewable article SQL.
Usage: python scripts/import-wordpress.py export.xml output.sql
No network calls or database changes are performed.
"""
import sys,re,xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
class Text(HTMLParser):
 def __init__(self): super().__init__();self.parts=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ('script','style'):self.skip+=1
  if tag in ('p','div','br','h1','h2','h3','li'):self.parts.append('\n')
 def handle_endtag(self,tag):
  if tag in ('script','style'):self.skip=max(0,self.skip-1)
  if tag in ('p','div','h1','h2','h3','li'):self.parts.append('\n')
 def handle_data(self,data):
  if not self.skip:self.parts.append(data)
def plain(value):
 p=Text();p.feed(value or '');return re.sub(r'\n\s*\n+', '\n\n',''.join(p.parts)).strip()
def quote(value):return "'"+value.replace("'","''")+"'"
if len(sys.argv)!=3:raise SystemExit(__doc__)
names={'wp':'http://wordpress.org/export/1.2/','content':'http://purl.org/rss/1.0/modules/content/'}
tree=ET.parse(sys.argv[1]);rows=[]
for item in tree.findall('./channel/item'):
 if item.findtext('wp:post_type',namespaces=names)!='post':continue
 if item.findtext('wp:status',namespaces=names)!='publish':continue
 title=item.findtext('title') or 'Untitled'
 body=plain(item.findtext('content:encoded',namespaces=names))
 if not body:continue
 if len(title)>200 or len(body)>100000:raise SystemExit('Article exceeds schema limits: '+title)
 url=item.findtext('link') or ''
 postid=item.findtext('wp:post_id',namespaces=names) or url
 category=next((c.text for c in item.findall('category') if c.attrib.get('domain')=='category' and c.text),'Science')
 values=[postid,title,category[:100],body[:240],body,url]
 rows.append('insert into public.articles(source_id,title,category,excerpt,body,source_url,content_kind,published) values('+','.join(quote(v) for v in values)+",'original',true) on conflict(source_id) do update set title=excluded.title,category=excluded.category,excerpt=excluded.excerpt,body=excluded.body,source_url=excluded.source_url,content_kind='original';")
Path(sys.argv[2]).write_text('begin;\n'+'\n'.join(rows)+'\ncommit;\n',encoding='utf8')
print('Prepared',len(rows),'articles. Review the SQL before applying.')
