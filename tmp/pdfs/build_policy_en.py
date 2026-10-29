from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Frame
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from xml.sax.saxutils import escape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont("Arial", "/System/Library/Fonts/Supplemental/Arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"))
OUT='output/pdf/yourday-privacy-policy-en.pdf'
W,H=595.28,841.89
c=canvas.Canvas(OUT,pagesize=(W,H));c.setTitle('yourday Privacy Policy');c.setAuthor('Smile Dragon')
styles={
'body':ParagraphStyle('body',fontName='Arial',fontSize=10.5,leading=15.5,spaceAfter=10,textColor=colors.HexColor('#283738')),
'h':ParagraphStyle('h',fontName='Arial-Bold',fontSize=12,leading=17,spaceBefore=12,spaceAfter=8,textColor=colors.HexColor('#155E63')),
'note':ParagraphStyle('note',fontName='Arial',fontSize=10.5,leading=15.5,spaceAfter=12,textColor=colors.HexColor('#155E63')),
'small':ParagraphStyle('small',fontName='Arial',fontSize=8,leading=12,spaceAfter=8,textColor=colors.HexColor('#526768'))}
def page(n,title,sub,items):
 c.setFillColor(colors.HexColor('#155E63'));c.rect(0,H-8,W,8,fill=1,stroke=0)
 c.setFont('Arial',9);c.drawString(44,H-39,'yourday / PRIVACY POLICY')
 c.setFillColor(colors.HexColor('#203B3D'));c.setFont('Arial-Bold',24);c.drawString(44,H-82,title)
 c.setFillColor(colors.HexColor('#687D7E'));c.setFont('Arial',10);c.drawString(44,H-108,sub)
 story=[Paragraph(escape(t).replace('\n','<br/>'),styles[k]) for k,t in items]
 Frame(44,60,W-88,H-190,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0).addFromList(story,c)
 if story:raise RuntimeError(f'page {n} overflow {len(story)}')
 c.setStrokeColor(colors.HexColor('#D8E3E2'));c.line(44,45,W-44,45)
 c.setFillColor(colors.HexColor('#687D7E'));c.setFont('Arial',8);c.drawString(44,30,'Smile Dragon | Privacy inquiries: yonghk423423@gmail.com');c.drawRightString(W-44,30,f'{n} / 4');c.showPage()
page(1,'Privacy Policy','yourday - cartoon diary',[
('body','Smile Dragon (the "Company," "we," "us," or "our") provides yourday. This Privacy Policy explains how personal information is processed in connection with diary features, AI cartoon image conversion, related services, and privacy inquiries.'),
('note','Photo processing at a glance: We do not separately store source photos or converted images on Company servers. We send the photo you select to OpenAI to perform your requested cartoon conversion. External processing may also occur when content is checked for safety or blocked.'),
('h','1. Information We Process and Why'),
('body','Diary features. Diary titles, character names, scenes, notes, tasks, and settings that you enter or select are processed on your device to create, view, edit, and manage your diary. We do not automatically synchronize this diary data to Company servers.'),
('body','AI cartoon conversion. We process the photo you select and instructions included in your conversion request to create a cartoon image and return the result. We do not send your entire photo library for AI processing. Faces, surroundings, objects, and other information visible in the selected photo may be processed.'),
('body','Content safety. Input photos, conversion requests, and generated results may be checked automatically or processed by an external AI service\'s safety filters to restrict sexual or pornographic content, child sexual exploitation material, and other prohibited content.'),
('body','Inquiries. We use your email address, message, and attachments you choose to send to respond to inquiries and privacy rights requests. Please avoid sending photos or sensitive information that is unnecessary to resolve your inquiry.'),
('h','2. Selecting Photos and Your Choices'),
('body','Your photo is processed when you select it and request AI conversion. You may cancel before transmission or choose not to use the AI feature. If you do so, we cannot provide that photo\'s AI conversion. Only select photos that you have a lawful right to use, including any necessary permission from other people depicted in them.'),
])
page(2,'AI and Content Safety','OpenAI processing, prohibited content, and photo retention',[
('h','3. Processing Through OpenAI'),
('body','We use the OpenAI API to convert photos into cartoon images. The photo and necessary conversion request are transmitted to OpenAI over a network, and we provide the returned result to you. If an external API is used for safety screening, a photo may be sent to OpenAI for screening even if its conversion is subsequently blocked.'),
('body','We do not use your photos to train our own AI models or for advertising purposes you have not requested. We keep sharing of API inputs and outputs for OpenAI model training disabled. Under OpenAI\'s published API policy, API data is not used to train or improve its models by default unless the customer separately opts in to data sharing.'),
('h','4. Restrictions on Sexual and Illegal Content'),
('body','We do not permit conversion of sexually explicit or pornographic photos, creation or conversion of sexual images involving children or teenagers, non-consensual sexual images, or other unlawful content. When prohibited content is detected or OpenAI refuses a request under its safety policies, conversion may be stopped or delivery of the result restricted.'),
('body','OpenAI\'s image service applies safety filters to inputs and generation. Where additional input or output screening is applied, a request or display of its result is blocked according to the screening outcome. Automated screening may miss inappropriate content or incorrectly block an ordinary photo. It does not guarantee that all inappropriate content will be blocked.'),
('body','General sexual-content screening cannot reliably establish the age of a person in a photo or whether they are a minor. You can contact our privacy email about a blocked request and describe the issue without attaching the photo again.'),
('h','5. Photo Storage and Deletion'),
('body','We do not separately retain source photos or converted images on Company servers. Photos and results saved on your device, and operating-system backups, are governed by your device and service settings. Our non-retention of photos does not mean that OpenAI or another external provider retains no data.'),
('body','OpenAI abuse-monitoring logs may contain request and response content and may be retained for up to 30 days by default. Exceptions may apply for legal obligations, safety review, or protection of the service or third parties. Additional storage conditions may depend on the API, features, and contract used.'),
])
page(3,'Other Data and Transfers','Local diary storage is separate from external service processing.',[
('h','6. Usage Analytics and Error Diagnostics'),
('body','On iOS, Firebase Analytics and Crashlytics may process app-open and screen-view events, app-instance or installation identifiers, device details, operating-system and app versions, error messages, stack traces, and related diagnostic information. These services help us understand usage and diagnose errors. This processing is separate from local storage of your diary.'),
('body','Firebase\'s published documentation states that Crashlytics retains crash data and associated identifiers for 90 days before starting removal from live and backup systems. Analytics data is managed under the service\'s retention settings and policies. If Slack error notifications are enabled, error type, app version, time, and error details may also be transmitted.'),
('body','When you use external features such as weather or book search, information needed for the request, such as location or search terms, and connection information may be sent to the relevant provider. Loading notices also involves communication with an external server. AI photo conversion is therefore not the app\'s only external communication.'),
('h','7. External Processing and International Transfers'),
('body','OpenAI is involved in AI conversion and safety screening. Google/Firebase is involved in usage analytics and error diagnostics. We distinguish the purposes and scope of these activities and manage external processing under applicable laws and contracts. International transmission and processing can occur even though we do not store photos on Company servers.'),
('body','Our OpenAI project uses the Global region setting, so photos and related request information may be processed or stored outside your country. Global does not mean processing or storage occurs exclusively in the United States. You can decline the transfer of a photo by not requesting AI conversion or by cancelling before transmission; in that case, the relevant AI conversion will not be available.'),
('body','Where laws of the EEA, United Kingdom, or another jurisdiction apply, the relevant requirements for lawful processing and international transfers apply. You may contact our privacy email to ask about your information, external recipients, and applicable safeguards.'),
('h','8. Other Retention and Deletion'),
('body','Local diary data and settings may remain until you delete the relevant records or app data. We process inquiry records for as long as needed to respond and resolve related disputes. We delete or destroy personal information without undue delay when its purpose ends, except where retention is required by law. We cannot remotely restore or delete local records we do not hold.'),
])
page(4,'Your Rights and Contact','Privacy requests, children\'s information, and policy changes',[
('h','9. Your Rights and Requests by Guardians'),
('body','Depending on applicable law, you may request access, correction, deletion, suspension or restriction of processing, withdrawal of consent, objection, or data portability. We may verify your identity or an authorized representative\'s authority to the extent necessary. We respond under applicable legal procedures and time limits and explain if a request cannot be fulfilled.'),
('body','Where processing is based on consent, you may withdraw that consent without affecting the lawfulness of processing before withdrawal. We handle requests concerning information held by external providers within our rights and authority under applicable contracts and law. We cannot guarantee immediate direct deletion of all records held by a provider.'),
('h','10. Children and Teenagers'),
('body','yourday is intended for users of all ages. We do not currently operate a separate age-verification or parental-consent process. A parent or legal guardian may contact the email below with questions about a child\'s information or to request access, deletion, or other applicable rights.'),
('body','Children\'s and teenagers\' information is subject to the laws applicable in their location. Parents and guardians can review the information visible in a photo and how it will be processed before a child sends their own or another person\'s photo to an AI service. Requests concerning children\'s personal information are handled under applicable law.'),
('h','11. Privacy Contact and Complaints'),
('body','Operator: Smile Dragon\nPerson responsible for privacy: Yonghee Kim, Representative\nPrivacy inquiries and rights requests: yonghk423423@gmail.com'),
('body','In South Korea, you can contact the Personal Information Infringement Report Center (privacy.kisa.or.kr; 118 within South Korea) or the Personal Information Dispute Mediation Committee (kopico.go.kr). You also retain the right to complain to the relevant supervisory authority in your jurisdiction. This Policy does not restrict rights provided by mandatory applicable law.'),
('h','12. Availability and Changes'),
('body','We make this Policy available through app settings or another accessible location. If important information changes, including processing purposes, data categories, or external providers, we communicate the changes and when they apply through an appropriate channel. Where additional consent is legally required, we obtain it before the relevant processing.'),
('small','OpenAI data controls: https://developers.openai.com/api/docs/guides/your-data\nFirebase privacy information: https://firebase.google.com/support/privacy'),
])
c.save();print(OUT)
