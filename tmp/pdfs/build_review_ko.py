from pathlib import Path
s=Path('tmp/pdfs/build_policy_yourday.py').read_text()
s=s.replace("OUT='output/pdf/yourday-privacy-policy.pdf'","OUT='output/pdf/yourday-privacy-policy-ko.pdf'").replace('오늘의주인공 (yourday) 개인정보처리방침','yourday 개인정보처리방침').replace('카툰 다이어리 오늘의주인공 (yourday)','yourday · 카툰 다이어리').replace('오늘의주인공(해외 서비스명: yourday)','yourday').replace('오늘의주인공(yourday)은','yourday는')
s=s.replace('스마일드래곤(이하 “회사”)은 yourday 이용자의 개인정보를 보호하고 관련 문의와 권리 요청에 대응하기 위하여 본 개인정보처리방침을 정합니다. 본 방침은 일기 기능, AI 카툰 이미지 변환 및 이에 수반되는 개인정보 처리에 적용됩니다.','스마일드래곤(이하 “회사”)은 yourday를 제공합니다. 본 개인정보처리방침은 일기 기능, AI 카툰 이미지 변환, 관련 서비스 및 개인정보 문의와 관련하여 개인정보가 처리되는 방법을 설명합니다.')
Path('tmp/pdfs/build_policy_ko.py').write_text(s)
exec(compile(s,'build_policy_ko.py','exec'))
# Separate findings; do not insert review labels into the policy.
c=canvas.Canvas('output/pdf/yourday-privacy-policy-review-ko.pdf',pagesize=(W,H))
c.setTitle('yourday 개인정보처리방침 점검 결과');c.setAuthor('yourday')
styles['body'].fontSize=10;styles['body'].leading=16;styles['body'].spaceAfter=9
styles['h'].fontSize=12;styles['h'].spaceBefore=10;styles['h'].spaceAfter=7

def report(n,title,items):
 c.setFillColor(colors.HexColor('#155E63'));c.rect(0,H-8,W,8,fill=1,stroke=0)
 c.setFont('Korean',9);c.drawString(44,H-39,'yourday / PRIVACY POLICY REVIEW')
 c.setFillColor(colors.HexColor('#203B3D'));c.setFont('Korean',22);c.drawString(44,H-80,title)
 c.setFont('Korean',9);c.setFillColor(colors.HexColor('#687D7E'));c.drawString(44,H-104,'점검일: 2026년 10월 28일 · 영문 방침 및 로컬 앱 소스 기준')
 story=[para(t,k) for k,t in items]
 Frame(44,60,W-88,H-182,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0).addFromList(story,c)
 if story:raise RuntimeError(f'review {n} overflow: {len(story)}')
 c.setStrokeColor(colors.HexColor('#D8E3E2'));c.line(44,45,W-44,45)
 c.setFont('Korean',8);c.drawString(44,30,'방침 본문과 별도의 점검 결과');c.drawRightString(W-44,30,f'{n} / 3');c.showPage()
report(1,'점검 결과와 우선 보완 사항',[
('note','결론: 핵심 사진 처리 설명은 포함되어 있으나, 누락 사항과 운영 확인이 필요한 내용이 있습니다. 현재 문서를 모든 국가에 그대로 공지해도 된다고 판단할 수는 없습니다. 한국어판은 기존 영문판의 내용을 옮긴 것이며, 아래 미확인 사실을 임의로 채우지 않았습니다.'),
('h','이미 포함된 내용'),
('body','선택한 사진의 OpenAI 전송, 회사 서버의 사진 미보관과 외부 업체 보관의 구분, 기본 학습 미사용, 선정적·불법 콘텐츠 제한 및 자동 검사의 한계, 이용자의 권리와 문의 이메일이 포함되어 있습니다. “초안” 표시를 없애는 것과 고지 내용·운영의 적정성을 갖추는 것은 별개입니다.'),
('h','1. 국외 이전 및 처리위탁의 구체적인 정보'),
('body','제7조의 “OpenAI”, “Google/Firebase”, “Global”만으로는 이전 국가와 수령 법인을 특정할 수 없습니다. 실제 계약에 따라 수령 법인·연락처, 이전 국가, 항목, 시점·방법, 이용 목적, 보유기간, 거부 방법·효과 및 이전 근거를 작성해야 합니다. 업체별 처리위탁 업무도 구분해야 합니다. 한국 개인정보 보호법 제28조의8은 적용되는 이전 근거에 따른 고지·동의 요건을 정합니다. 모든 이전에 별도 동의가 필수라고 단정할 수는 없습니다. [1, 2]'),
('h','2. 전 연령 AI 이용과 아동 보호'),
('body','제10조의 “별도 연령 확인·보호자 동의 절차 없음”은 보호조치를 대신하지 못합니다. OpenAI는 13세 미만 또는 적용되는 디지털 동의 연령 미만 아동의 개인정보를 처리하기 전에 API Zero Data Retention을 구현하도록 안내합니다. 현재 이 적용 여부는 확인되지 않았습니다. ZDR도 지역별 보호자 동의 등 법적 의무를 대체하지 않습니다. [3]'),
('body','전체 연령 앱이라는 이유만으로 모든 나라에서 동일한 의무가 발생하는 것은 아닙니다. 그러나 아동이 실제로 사진을 전송할 수 있는 운영에서는 적용 연령·동의 근거·연령별 접근과 보호조치를 먼저 정해야 합니다. 안내문에 “관련 법령에 따릅니다”라고 적는 것만으로 해결되지 않습니다.'),
('h','3. 보유기간과 파기 방법'),
('body','제6·8조의 Analytics 보관 설정, 문의 기록 보관 기준, Slack 전송 시 보관기간이 구체적이지 않습니다. 실제 기간 또는 명확한 판단 기준과 삭제 절차·방법, 법령상 별도 보관 시 항목·근거를 보완해야 합니다. Crashlytics의 90일 안내와 OpenAI의 기본 최대 30일 설명을 모든 데이터에 일괄 적용하면 안 됩니다. [1, 4, 5]'),
])
report(2,'실제 앱 동작과 문구의 일치',[
('h','4. 사진 외의 외부 처리도 구체적으로 고지'),
('body','로컬 코드에서 iOS Firebase Analytics·Crashlytics 수집 활성화, OpenWeather 위치 기반 날씨, Aladin·OpenLibrary 도서 검색, Supabase 공지 조회가 확인됩니다. Slack 오류 전송은 웹훅 설정이 있는 경우 실행됩니다. 제6조의 “각 제공자”를 실제 서비스·처리 항목·목적·역할로 구체화하고, 개인정보가 이전되는 경우 수령자·국외 이전 안내에도 반영해야 합니다.'),
('body','날씨 코드에서는 위치 권한을 요청하고 좌표를 소수점 두 자리로 반올림해 OpenWeather에 전달합니다. 이는 익명화를 보장하지 않습니다. 사진 변환만이 외부 전송이라는 설명은 현재 소스와 일치하지 않습니다. Slack의 실제 활성화 여부와 서버 측 로그는 별도 확인이 필요합니다.'),
('h','5. 처리 근거, 이용자의 선택과 보호조치'),
('body','목적별 적법한 처리 근거와 동의 철회·선택 방법을 더 구체화해야 합니다. 특히 사진 권한을 끄는 방법과 분석 수집을 거부하는 방법은 서로 다릅니다. 확인한 코드에서는 분석 수집을 활성화하지만 관련 동의·거부 흐름은 확인되지 않았습니다. 적용 지역에 필요한 동의나 선택권을 실제 앱 흐름으로 제공해야 합니다. EEA 적용 시 처리 근거와 국제 이전 보호조치 등의 투명한 안내도 필요합니다. [6]'),
('body','접근 권한 관리, 전송 보호, 로그의 사진·개인정보 제외, 보관 자료의 보호 등 실제 시행하는 안전조치를 방침에 설명해야 합니다. 기기 내 저장만으로 암호화나 안전성이 보장된다고 적으면 안 됩니다. 현재 확인된 저장 방식은 네이티브 AsyncStorage와 웹 localStorage입니다.'),
('h','6. AI 처리와 사전 차단은 배포 구현 확인 필요'),
('body','검토한 src·app·supabase 소스 검색에서는 OpenAI 변환·별도 선정성 검사 구현을 확인하지 못했습니다. 따라서 “사진 미보관”, 학습 공유 비활성화, 적용 API와 보관 조건, 검사 단계는 사용자 설명 및 기존 문구와 별도로 배포 환경에서 검증해야 합니다. 요청·오류 로그와 임시 파일도 확인 대상입니다.'),
('body','외부 안전 검사 자체가 사진 전송일 수 있으므로 “부적절한 사진은 외부로 전송되기 전에 모두 차단된다”고 보장하면 안 됩니다. 현재 문구는 검사 한계를 설명하고 있습니다. 추가 입력·출력 검사를 적용한다고 확정하려면 해당 기능이 실제로 동작해야 합니다.'),
('h','7. 시행일과 변경 이력'),
('body','영문판에는 시행일이 없습니다. 실제 적용일을 정해 양 언어에 동일하게 넣고, 이전 방침 및 변경 내용의 확인 경로를 마련하세요. 점검일을 임의로 시행일로 간주하지 않았습니다. 운영자·책임자·이메일은 포함되어 있지만, 국가별 추가 연락 정보·대리인 지정 의무의 적용 여부는 별도로 판단해야 합니다.'),
])
report(3,'완료에 필요한 확인과 근거',[
('h','확인할 설정과 운영 사실'),
('body','• OpenAI: 계약 상대 법인, 처리 국가·지역, 사용할 API, ZDR 승인·적용 여부, 실제 데이터 공유 설정과 안전 검사 흐름\n• Google/Firebase: 계약·처리 지역, Analytics 보관 설정 및 동의·거부 흐름\n• 기타 제공자: 실제 사용 서비스, Slack 활성화, 수령자·보관기간·전송 정보\n• 운영: 문의 기록 삭제 기준, 실제 안전조치, 아동 이용 방식, 방침 시행일'),
('h','로컬 코드 확인 범위'),
('small','수집 활성화: src/shared/lib/analytics/client.ts 및 crashlytics/client.ts\n오류 알림: src/shared/lib/crashlytics/slackCrashAlert.ts\n위치·날씨: src/pages/day-plan/ui/WeatherSummary.tsx\n도서 검색: src/features/aladin-book-search 및 open-library-book-search\n기기 저장: src/shared/lib/storage/localStorageClient.ts\n설정 초기화: src/pages/settings/ui/SettingsPage.tsx'),
('body','이 점검은 방침 문구와 로컬 소스를 대조한 결과입니다. 실제 배포 앱의 네트워크, 외부 계정·계약, 서버 로그 전체를 감사한 결과는 아닙니다. 한국어판과 영문판에 남아 있는 미확정 사항은 같은 사실관계로 보완해야 합니다.'),
('h','공식 확인 자료'),
('small','[1] 국가법령정보센터 · 개인정보 보호법 제30조 (처리방침)\nhttps://www.law.go.kr/법령/개인정보보호법/제30조\n[2] 국가법령정보센터 · 개인정보 보호법 제28조의8 (국외 이전)\nhttps://www.law.go.kr/법령/개인정보보호법/제28조의8\n[3] OpenAI · Under-18 API guidance\nhttps://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance\n[4] OpenAI · Data controls in the OpenAI platform\nhttps://developers.openai.com/api/docs/guides/your-data\n[5] Firebase · Privacy and Security\nhttps://firebase.google.com/support/privacy\n[6] Irish Data Protection Commission · Transparency (GDPR Articles 13–14)\nhttps://www.dataprotection.ie/en/individuals/know-your-rights/right-be-informed-transparency-article-13-14-gdpr'),
('note','다음 수정에서는 사실 확인이 끝난 항목을 한국어·영문 방침에 함께 반영하고, 앱의 동의·거부·아동 보호 흐름과 문서 내용이 일치하는지 확인해야 합니다. 문구 수정만으로 운영상 누락이 해결되지는 않습니다.'),
])
c.save();print('output/pdf/yourday-privacy-policy-review-ko.pdf')
