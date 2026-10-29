import ast
from pathlib import Path
p=Path('tmp/pdfs/build_policy_en_revised.py')
s=p.read_text();tree=ast.parse(s)
pages=[]
for node in tree.body:
 if isinstance(node,ast.Expr) and isinstance(node.value,ast.Call) and isinstance(node.value.func,ast.Name) and node.value.func.id=='page':
  pages.append([ast.literal_eval(a) for a in node.value.args])
items=pages[4][3]
a=next(i for i,x in enumerate(items) if x[0]=='h' and x[1].startswith('12. '))
b=next(i for i,x in enumerate(items) if x[0]=='h' and x[1].startswith('13. '))
items[a:b]=[
 ('h','12. Children, Teenagers, and the Photo-Use Notice'),
 ('body',"yourday's diary features are intended for users of all ages. Before the first photo selection or capture, we show an advisory notice about AI processing and responsible photo use. We store its acknowledgment on the device; resetting app data clears it."),
 ('body',"The notice asks users to obtain required permissions and consent for photos of children or others, and prohibits sexually explicit or unlawful photos. This notice does not verify anyone's age or parental consent. We do not operate a verified parental-consent process through it."),
 ('body',"This advisory does not replace required parental consent or safeguards, and does not limit the Company's legal obligations. OpenAI requires Zero Data Retention before processing personal information of children under 13 or the applicable age of digital consent. Acknowledging the notice does not enable Zero Data Retention or establish compliance with those conditions."),
 ('body',"A parent or legal guardian may contact our privacy email about a child's information, applicable rights, withdrawal of consent, or deletion. We handle these requests under applicable law."),
]
for page in pages:
 for i,(kind,text) in enumerate(page[3]):
  text=text.replace('The child-photo restrictions in Section 12 also apply when another user submits the photo.','The photo-use notice and child-data requirements described in Section 12 also concern photos submitted by another user.')
  text=text.replace('AI use and photo submissions must meet the eligibility requirements in Section 12.','Section 12 explains the photo-use notice and child-data requirements.')
  page[3][i]=(kind,text)
head=s[:s.index('page(1,')]
revised=head+'\n'.join('page('+', '.join(repr(a) for a in page)+')' for page in pages)+'\nc.save();print(OUT)\n'
Path('tmp/pdfs/build_policy_en_advisory.py').write_text(revised)
exec(compile(revised,'build_policy_en_advisory.py','exec'))
p.write_text(revised)
from pypdf import PdfReader
r=PdfReader('output/pdf/yourday-privacy-policy-en.pdf')
t=' '.join(' '.join(page.extract_text() for page in r.pages).split())
assert len(r.pages)==5
assert 'This notice does not verify' in t
assert "does not limit the Company's legal obligations" in t
assert 'not permitted, including submission by another user' not in t
assert 'only after that consent has been obtained and verified' not in t
assert 'entire original photo' in t
assert all(x not in t.lower() for x in ['draft','tbd','pokit','launch','coming soon'])
print('Verified: warning-only policy, no claimed age blocking or verified parental consent, no draft labels, 5 pages.')
