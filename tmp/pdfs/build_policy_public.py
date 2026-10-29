from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Frame
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from xml.sax.saxutils import escape
pdfmetrics.registerFont(TTFont('Korean','/System/Library/Fonts/Supplemental/Arial Unicode.ttf'))
OUT='output/pdf/pokit-privacy-policy-public.pdf'
W,H=595.28,841.89
c=canvas.Canvas(OUT,pagesize=(W,H));c.setTitle('pokit 개인정보처리방침');c.setAuthor('스마일드래곤')
styles={
'body':ParagraphStyle('body',fontName='Korean',fontSize=10.5,leading=17,spaceAfter=11,wordWrap='CJK',textColor=colors.HexColor('#283738')),
'h':ParagraphStyle('h',fontName='Korean',fontSize=13,leading=20,spaceBefore=13,spaceAfter=9,wordWrap='CJK',textColor=colors.HexColor('#155E63')),
'note':ParagraphStyle('note',fontName='Korean',fontSize=10,leading=16,spaceAfter=12,wordWrap='CJK',textColor=colors.HexColor('#155E63')),
'small':ParagraphStyle('small',fontName='Korean',fontSize=8.5,leading=13,spaceAfter=9,wordWrap='CJK',textColor=colors.HexColor('#526768'))}
def para(s,k):
 return Paragraph(escape(s).replace('\n','<br/>'),styles[k])
def page(n,title,sub,items):
 c.setFillColor(colors.HexColor('#155E63'));c.rect(0,H-8,W,8,fill=1,stroke=0)
 c.setFont('Korean',9);c.drawString(44,H-39,'pokit / PRIVACY POLICY')
 c.setFillColor(colors.HexColor('#203B3D'));c.setFont('Korean',24);c.drawString(44,H-82,title)
 c.setFillColor(colors.HexColor('#687D7E'));c.setFont('Korean',10);c.drawString(44,H-108,sub)
 story=[para(t,k) for k,t in items]
 Frame(44,60,W-88,H-190,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0).addFromList(story,c)
 if story:raise RuntimeError(f'page {n} overflow')
 c.setStrokeColor(colors.HexColor('#D8E3E2'));c.line(44,45,W-44,45)
 c.setFillColor(colors.HexColor('#687D7E'));c.setFont('Korean',8);c.drawString(44,30,'스마일드래곤 · 개인정보 문의: yonghk423423@gmail.com');c.drawRightString(W-44,30,f'{n} / 4');c.showPage()
page(1,'개인정보처리방침','카툰 다이어리 pokit',[
('body','스마일드래곤(이하 “회사”)은 pokit 이용자의 개인정보를 보호하고 관련 문의와 권리 요청에 대응하기 위하여 본 개인정보처리방침을 정합니다. 본 방침은 일기 기능, AI 카툰 이미지 변환 및 이에 수반되는 개인정보 처리에 적용됩니다.'),
('note','사진 처리의 핵심: 회사는 AI 변환용 원본 사진과 변환 결과를 회사 서버에 별도로 저장하지 않습니다. 이용자가 요청한 카툰 변환을 위해 선택한 사진을 OpenAI로 전송합니다. 부적절한 콘텐츠의 검사·차단 과정에서도 외부 처리가 발생할 수 있습니다.'),
('h','제1조 개인정보 처리 목적 및 항목'),
('body','1. 일기 작성과 관리\n일기 제목, 주인공 이름, 장면, 메모, 할 일 및 설정 등 이용자가 입력·선택한 정보는 일기 작성·조회·편집과 개인 설정 유지를 위해 기기 내에서 처리됩니다. 해당 일기 데이터를 회사 서버로 자동 동기화하지 않습니다.'),
('body','2. AI 카툰 이미지 변환\n이용자가 선택한 사진과 변환 요청에 포함되는 지시사항을 카툰 이미지 변환 및 결과 제공을 위해 처리합니다. 변환을 요청하지 않은 사진첩 전체를 AI 처리 대상으로 전송하지 않습니다. 얼굴이나 주변 사물 등 사진에 포함된 내용이 함께 처리될 수 있습니다.'),
('body','3. 안전한 서비스 이용\n선정적·음란한 콘텐츠, 아동·청소년 성착취물 및 그 밖의 금지 콘텐츠를 제한하기 위해 입력 사진, 변환 요청과 생성 결과를 자동 검사하거나 외부 AI 서비스의 안전 필터로 처리할 수 있습니다.'),
('body','4. 문의 응대\n이용자가 이메일로 제공하는 이메일 주소, 문의 내용 및 첨부자료를 문의 응대와 권리 요청 처리에 이용합니다. 문의 해결에 필요하지 않은 사진이나 민감정보의 제공은 피해주세요.'),
('h','제2조 사진 선택과 이용자의 선택권'),
('body','사진은 이용자가 기기에서 선택하고 AI 변환을 요청할 때 처리됩니다. 이용자는 전송 전에 변환을 취소하거나 AI 기능을 이용하지 않을 수 있습니다. 이 경우 해당 사진의 AI 변환은 제공되지 않습니다. 타인의 사진은 적법하게 이용할 권한이 있는 경우에만 선택해야 합니다.'),
])
page(2,'AI 처리와 콘텐츠 제한','OpenAI 전송 · 안전 필터 · 사진 미보관',[
('h','제3조 OpenAI를 통한 사진 처리'),
('body','회사는 사진의 카툰 변환을 위해 OpenAI API를 이용합니다. 사진과 필요한 변환 요청은 네트워크를 통해 OpenAI로 전송되며, 회사는 전달받은 결과를 이용자에게 제공합니다. 부적절한 콘텐츠 검사에 외부 API가 사용되는 경우 생성이 차단된 사진도 검사 목적으로 OpenAI에 전송될 수 있습니다.'),
('body','회사는 사진을 자체 AI 모델 학습이나 이용자가 요청하지 않은 광고 목적으로 사용하지 않습니다. 회사의 OpenAI API 입력·출력 학습용 공유 설정은 비활성화합니다. OpenAI 공식 API 정책에 따르면 별도 데이터 공유 동의가 없는 API 데이터는 기본적으로 모델 학습·개선에 사용되지 않습니다.'),
('h','제4조 선정적·불법 콘텐츠의 제한'),
('body','회사는 선정적·음란한 사진의 변환, 아동·청소년의 성적 이미지 생성·변환, 비동의 성적 이미지 및 그 밖의 위법한 콘텐츠 요청을 허용하지 않습니다. 금지 콘텐츠가 감지되거나 OpenAI의 안전 정책에 따라 요청이 거부되는 경우 변환을 중단하거나 결과 제공을 제한합니다.'),
('body','OpenAI 이미지 서비스의 안전 필터가 입력과 생성 과정에 적용됩니다. 추가적인 입력·결과 검사가 적용되는 경우 검사 결과에 따라 변환 요청 또는 결과 표시를 차단합니다. 자동 검사는 부적절한 콘텐츠를 놓치거나 정상적인 사진을 잘못 차단할 수 있으며, 모든 부적절한 콘텐츠의 완전한 차단을 보장하지 않습니다.'),
('body','자동 선정성 검사만으로 사진 속 인물의 연령이나 미성년자 여부를 정확히 판별할 수는 없습니다. 차단에 관한 문의는 개인정보 문의 이메일로 접수할 수 있으며, 문제 사진을 다시 첨부하지 않고 발생 상황을 설명할 수 있습니다.'),
('h','제5조 사진의 보관과 파기'),
('body','회사는 AI 변환용 원본 사진과 변환 결과를 회사 서버에 별도로 보관하지 않습니다. 이용자가 자신의 기기에 저장한 사진·결과물과 운영체제 백업은 이용자 기기 및 해당 서비스의 설정에 따릅니다. 회사 서버의 미보관은 OpenAI 등 외부 처리업체의 미보관을 의미하지 않습니다.'),
('body','OpenAI에서는 악용 방지 로그에 요청·응답 등 콘텐츠가 포함될 수 있으며 기본적으로 최대 30일 보관될 수 있습니다. 법령상 의무, 안전 검토 또는 서비스·제3자 보호를 위한 예외적인 보관이 적용될 수 있습니다. 실제 보관은 이용하는 API·기능·계약에 따른 추가 저장 조건의 영향도 받습니다.'),
])
page(3,'다른 정보 처리와 해외 전송','기기 내 기록과 외부 서비스 처리를 구분합니다.',[
('h','제6조 앱 이용 분석 및 오류 진단'),
('body','앱의 iOS 환경에서는 Firebase Analytics와 Crashlytics를 통해 앱 실행·화면 조회 등 이용 이벤트, 앱 인스턴스·설치 관련 식별자, 기기·운영체제·앱 버전 및 오류 메시지·스택 추적 등 진단 정보가 처리될 수 있습니다. 목적은 이용 현황 파악과 오류 진단입니다. 일기 데이터의 기기 내 저장과 이러한 외부 처리는 별개입니다.'),
('body','Firebase Crashlytics의 공식 안내상 오류 데이터와 관련 식별자는 90일간 보관된 뒤 실제·백업 시스템에서 제거 절차가 시작됩니다. Analytics 데이터는 해당 서비스의 보관 설정과 정책에 따라 관리됩니다. 오류 알림용 Slack 연동이 활성화된 경우 오류 유형·앱 버전·발생 시각과 오류 내용이 전달될 수 있습니다.'),
('body','이용자가 날씨·도서 검색 등의 외부 조회 기능을 사용하는 경우 해당 요청에 필요한 위치·검색어 등의 정보와 통신 정보가 각 제공자에게 전달될 수 있습니다. 공지 조회에도 외부 서버 통신이 발생합니다. 따라서 사진 변환만이 앱의 유일한 외부 통신인 것은 아닙니다.'),
('h','제7조 외부 처리 및 국외 이전'),
('body','AI 변환과 안전 검사에는 OpenAI가, 이용 분석·오류 진단에는 Google/Firebase가 관여합니다. 회사는 각 처리의 목적과 범위를 구분하고 관련 법령과 적용 계약에 따라 외부 처리업체를 관리합니다. 회사 서버에 사진을 저장하지 않더라도 해외 전송·처리는 발생할 수 있습니다.'),
('body','OpenAI 운영 프로젝트는 Global 지역 설정을 사용하므로 사진 등 요청 정보가 해외에서 처리·보관될 수 있습니다. Global 설정은 미국 한 국가에서만 처리·보관됨을 의미하지 않습니다. 이용자는 AI 변환을 요청하지 않거나 전송 전에 취소하여 해당 사진의 해외 전송을 거부할 수 있으며, 이 경우 해당 AI 변환을 이용할 수 없습니다.'),
('body','EEA·영국 등 관련 법률이 적용되는 경우 해당 지역의 적법한 처리 근거와 국외 이전 요건이 적용됩니다. 이용자는 회사가 처리하는 자신의 개인정보, 외부 수령자 및 적용되는 보호조치에 관한 설명을 개인정보 문의 이메일로 요청할 수 있습니다.'),
('h','제8조 그 밖의 보유 및 삭제'),
('body','기기 내 일기·설정은 이용자가 해당 기록이나 앱 데이터를 삭제할 때까지 유지될 수 있습니다. 문의 자료는 응대·분쟁 해결에 필요한 기간 동안 처리하며, 목적이 끝난 개인정보는 법령상 보관이 필요한 경우를 제외하고 지체 없이 삭제·파기합니다. 회사가 보유하지 않는 기기 내 기록은 회사가 원격으로 복구하거나 삭제할 수 없습니다.'),
])
page(4,'이용자의 권리와 문의','개인정보 보호책임자 및 권리 행사 안내',[
('h','제9조 이용자 및 보호자의 권리'),
('body','이용자는 적용 법률에 따라 자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지·제한, 동의 철회, 이의 제기 및 데이터 이동을 요청할 수 있습니다. 회사는 요청 처리에 필요한 범위에서 본인 또는 적법한 대리인임을 확인하고 법령상 기한과 절차에 따라 대응합니다. 요청을 처리할 수 없는 경우에는 그 사유를 설명합니다.'),
('body','동의를 근거로 하는 처리는 동의를 철회할 수 있습니다. 철회 전 적법한 처리의 효력은 영향을 받지 않습니다. 외부 처리업체가 보유한 자료에 대해서는 적용 계약·법령 및 회사가 행사할 수 있는 권한의 범위에서 삭제·제한 요청을 처리합니다. 회사가 외부 업체의 모든 자료를 즉시 직접 삭제할 수 있다고 보장하지 않습니다.'),
('h','제10조 아동·청소년의 개인정보'),
('body','pokit은 전체 연령 이용자를 대상으로 합니다. 회사는 현재 별도의 연령 확인·법정대리인 동의 절차를 운영하지 않습니다. 법정대리인은 아동의 개인정보 처리에 관한 문의, 열람·삭제 등 권리 요청을 아래 이메일로 접수할 수 있습니다.'),
('body','아동·청소년의 개인정보에는 거주 지역의 관련 법령이 적용됩니다. 보호자는 아동이 본인이나 타인의 사진을 AI 서비스로 전송하기 전에 사진에 포함된 정보와 처리 내용을 함께 확인할 수 있습니다. 아동 개인정보에 관한 요청은 관련 법령에 따라 처리합니다.'),
('h','제11조 보호책임자 및 고충 처리'),
('body','운영자: 스마일드래곤\n개인정보 보호책임자: 김용희 / 대표\n개인정보 문의·권리 행사: yonghk423423@gmail.com'),
('body','이용자는 개인정보침해신고센터(privacy.kisa.or.kr, 국번 없이 118) 또는 개인정보분쟁조정위원회(kopico.go.kr)에 상담·분쟁조정을 신청할 수 있습니다. 거주 지역의 관련 감독기관에 불만을 제기할 권리도 유지됩니다. 본 방침은 적용되는 강행 법령상의 권리를 제한하지 않습니다.'),
('h','제12조 방침의 공개 및 변경'),
('body','회사는 앱 설정 등 이용자가 확인할 수 있는 경로에 본 방침을 공개합니다. 처리 항목·목적·외부 제공자 등 중요한 사항이 변경되면 변경 내용과 적용 시점을 적절한 방법으로 알리고, 법령상 추가 동의가 필요한 경우 처리 전에 동의를 받습니다.'),
('small','OpenAI 공식 데이터 처리 안내: https://developers.openai.com/api/docs/guides/your-data\nFirebase 공식 개인정보 안내: https://firebase.google.com/support/privacy'),
])
c.save();print(OUT)
