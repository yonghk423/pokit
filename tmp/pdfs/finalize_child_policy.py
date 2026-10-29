import ast
from pathlib import Path
source_path=Path('tmp/pdfs/build_policy_en_revised.py')
source=source_path.read_text()
tree=ast.parse(source)
pages=[]
for node in tree.body:
 if isinstance(node,ast.Expr) and isinstance(node.value,ast.Call) and isinstance(node.value.func,ast.Name) and node.value.func.id=='page':
  pages.append([ast.literal_eval(a) for a in node.value.args])
assert len(pages)==5
# Adopt the user's child-AI eligibility policy without asserting that age checks or ZDR have already been implemented.
items=pages[4][3]
a=next(i for i,x in enumerate(items) if x[0]=='h' and x[1].startswith('12. '))
b=next(i for i,x in enumerate(items) if x[0]=='h' and x[1].startswith('13. '))
items[a:b]=[
 ('h','12. Children and Teenagers'),
 ('body',"yourday's diary features are intended for users of all ages. AI photo conversion is subject to additional eligibility requirements and restrictions on children's personal information."),
 ('body',"Children who require a parent or legal guardian's consent under applicable law may use AI photo conversion only after that consent has been obtained and verified and the necessary safeguards are in place. Until these conditions are met, their AI use and submission of their photos for AI conversion are not permitted, including submission by another user."),
 ('body',"Processing personal information of children under 13, or under the applicable age of digital consent, through OpenAI is not permitted unless Zero Data Retention has been approved and enabled for the API and features used, alongside applicable consent and safety requirements. Parental consent alone does not replace this requirement."),
 ('body',"A parent or legal guardian may contact our privacy email to ask about a child's information, exercise applicable rights, withdraw consent, or request deletion. Withdrawal stops any further processing that depends on that consent."),
]
# Place provider references alongside the AI retention explanation, keeping the rights page readable.
refs=items.pop() if items[-1][0]=='small' else None
if refs:
 pages[1][3].append(('small',refs[1].split('\n')[0]+'\nOpenAI under-18 guidance: https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance'))
last=pages[0][3][-1]
pages[0][3][-1]=(last[0],last[1]+' The child-photo restrictions in Section 12 also apply when another user submits the photo.')
first_ai=pages[1][3][1]
pages[1][3][1]=(first_ai[0],first_ai[1]+' AI use and photo submissions must meet the eligibility requirements in Section 12.')
analytics=pages[2][3][1]
pages[2][3][1]=(analytics[0],analytics[1].replace('how the app is used.','which screens are used most and country-level usage patterns.'))
# Avoid repeating the same transfer-refusal explanation twice.
for i,(kind,text) in enumerate(pages[3][3]):
 if text.startswith('The OpenAI project used for the service'):
  pages[3][3][i]=(kind,text.split(' You can decline')[0])
head=source[:source.index('page(1,')]
head=head.replace(' story=[Paragraph', " if n==5:\n  styles['body'].leading=14.5;styles['body'].spaceAfter=7\n  styles['h'].spaceBefore=10;styles['h'].spaceAfter=7\n story=[Paragraph")
revised=head+'\n'.join('page('+', '.join(repr(a) for a in page)+')' for page in pages)+'\nc.save();print(OUT)\n'
Path('tmp/pdfs/build_policy_en_final.py').write_text(revised)
exec(compile(revised,'build_policy_en_final.py','exec'))
# Keep the current editable source aligned with the delivered PDF.
source_path.write_text(revised)
from pypdf import PdfReader
reader=PdfReader('output/pdf/yourday-privacy-policy-en.pdf')
text=' '.join(' '.join(page.extract_text() for page in reader.pages).split())
assert len(reader.pages)==5
assert 'We do not currently operate a separate age-verification' not in text
assert 'their AI use and submission of their photos for AI conversion are not permitted' in text
assert 'unless Zero Data Retention has been approved and enabled' in text
assert 'including submission by another user' in text
assert 'entire original photo' in text
assert 'yonghk423423@gmail.com' in text
for bad in ['draft','tbd','pokit','launch','coming soon','review copy']:
 assert bad not in text.lower(),bad
for n in range(1,15):
 assert str(n)+'. ' in text,n
print('Verified: 5 pages, 14 sections, whole-photo conversion, child-use restrictions, conditional ZDR, correct contact, no draft or launch labels.')
