from pathlib import Path
import ast, shutil
source=Path('tmp/pdfs/build_policy_en.py').read_text()
tree=ast.parse(source)
pages=[]
for node in tree.body:
 if isinstance(node,ast.Expr) and isinstance(node.value,ast.Call) and isinstance(node.value.func,ast.Name) and node.value.func.id=='page':
  pages.append([ast.literal_eval(a) for a in node.value.args])
head=source[:source.index("page(1,")].replace("f'{n} / 4'","f'{n} / 5'")
# Preserve the existing policy while completing verified disclosures.
shutil.copy2('output/pdf/yourday-privacy-policy-en.pdf','tmp/pdfs/yourday-privacy-policy-en-before-revision.pdf')
pages[0][2]='yourday - cartoon diary | Last updated: October 28, 2026'
pages[0][3][0]=('body','Smile Dragon (the "Company," "we," "us," or "our") provides yourday. This Privacy Policy explains how personal information is processed for diary features, AI cartoon image conversion, connected services, and privacy inquiries. The privacy contact is Yonghee Kim, Representative, at yonghk423423@gmail.com.')
# Make selection and permissions specific without promising an unimplemented consent flow.
pages[0][3][-1]=('body','Your photo is processed when you select it and request AI conversion. You may cancel before transmission or choose not to use the AI feature. If you do so, that photo cannot be converted. Only select photos you have a lawful right to use, including any necessary permission from other people depicted in them. You can manage photo access in your device settings; changing a permission does not recall information already transmitted.')
services=[
 ('h','6. Usage Analytics and Error Diagnostics'),
 ('body','On iOS, Google Analytics for Firebase processes app-open and screen-view events, app-instance or installation identifiers, device details, operating-system and app versions, and related usage information to help us understand how the app is used. This collection is separate from the diary records stored on your device.'),
 ('body','Firebase Crashlytics processes crash reports, error messages, stack traces, installation identifiers, and device and app details to diagnose and resolve failures. Firebase states that crash data and associated identifiers are retained for 90 days before removal from live and backup systems begins. Analytics retention depends on the configured Google Analytics retention settings and applicable service policies.'),
 ('body','If Slack crash notifications are enabled, Slack receives an error type, app version, timestamp, and error details or stack trace so that we can investigate problems. Only this notification processing is conditional on the Slack integration being enabled.'),
 ('h','7. Weather, Book Search, and Notices'),
 ('body','Weather. With your device location permission, the app obtains coordinates and sends latitude and longitude rounded to two decimal places to OpenWeather for current weather and the region name. Rounding reduces precision but does not make the location anonymous. You can deny or withdraw location permission in device settings; location-based weather will then be unavailable.'),
 ('body','Book search. Search terms and book identifiers are sent to Aladin or Open Library to retrieve search results and book details. Book cover requests may also be sent to the relevant image provider. Do not include private information in search terms.'),
 ('body','Notices. The app contacts a Supabase-hosted service to load announcements. These requests do not automatically synchronize your diary to that service. Providers receiving network requests can process connection information, such as an IP address, in addition to the data needed for the feature.'),
 ('body','These connected services are used for the purposes described above. Photo or location permission controls do not themselves disable Analytics or Crashlytics. For questions or requests about diagnostic or usage information, contact our privacy email. Deleting local app data does not automatically delete provider records.'),
 ('small','Provider information: firebase.google.com/support/privacy | slack.com/trust/privacy/privacy-policy\nopenweather.co.uk/privacy-policy | aladin.co.kr | openlibrary.org\nsupabase.com/privacy'),
]
p4=[
 ('h','8. External Processing and International Transfers'),
 ('body','OpenAI processes photos and conversion requests for AI conversion and safety screening. Google/Firebase processes usage and diagnostic information. Other connected providers and the information they receive are described in Sections 6 and 7. Processing by a provider is separate from storing your diary on your device.'),
 pages[2][3][6],
 ('body','Transfers occur over a network when you request the relevant AI or connected feature; usage and diagnostic transmissions may occur automatically when the relevant iOS services operate. You can decline an AI photo transfer by not requesting conversion or by cancelling before transmission. In that case the relevant conversion cannot be provided. A request already sent cannot be recalled by revoking a device permission.'),
 pages[2][3][7],
 ('h','9. Retention and Deletion'),
 ('body','Local diary records and settings remain until you delete them or reset app data. You can remove local app records using the app\'s reset-data control in Settings. That process removes the app\'s local stored records; it does not remove separately saved gallery images, operating-system backups, or records already held by providers. We cannot remotely restore or delete local records that we do not hold.'),
 ('body','Source and converted photo retention is explained in Section 5. Inquiry messages and attachments are retained while the inquiry or a related dispute is being handled, and are deleted when that purpose ends unless a legal retention duty applies. Information required for an unresolved legal claim or a legal obligation is kept only for that purpose until the relevant requirement ends. External provider retention and deletion also depend on the service, API, settings, and applicable legal requirements.'),
 ('h','10. Protection of Information'),
 ('body','Connected API requests use HTTPS. The app stores diary records locally rather than automatically uploading them to a Company diary database. Device storage is subject to your device\'s access controls and backup settings. Use a device lock and review your backup settings. No electronic storage or transmission method can guarantee absolute security. To report a suspected privacy or security issue, contact our privacy email without attaching unnecessary sensitive information.'),
]
# Global-region disclosure remains as previously confirmed; no invented recipient, country list, or ZDR assertion.
p4[2]=('body',pages[2][3][6][1].replace('Our OpenAI project','The OpenAI project used for the service'))
last=pages[3][3]
for i,(k,t) in enumerate(last):
 t=t.replace('9. Your Rights and Requests by Guardians','11. Your Rights and Requests by Guardians').replace('10. Children and Teenagers','12. Children and Teenagers').replace('11. Privacy Contact and Complaints','13. Privacy Contact and Complaints').replace('12. Availability and Changes','14. Availability and Changes')
 if k=='h' and t=='14. Availability and Changes': pass
 if t.startswith('We make this Policy available'):
  t='We make this Policy available through app settings or another accessible location. The date shown on the first page identifies the latest revision. If important information changes, including processing purposes, data categories, or external providers, we communicate the changes and when they apply through an appropriate channel. Where additional consent is legally required, we obtain it before the relevant processing.'
 last[i]=(k,t)
newpages=[pages[0],pages[1],[3,'Connected Services','Usage data, location, search requests, and service notices',services],[4,'Transfers and Data Management','International processing, deletion, and protection of information',p4],[5,'Your Rights and Contact',"Privacy requests, children's information, and policy changes",last]]
out=head+'\n'.join('page('+', '.join(repr(a) for a in p)+')' for p in newpages)+'\nc.save();print(OUT)\n'
Path('tmp/pdfs/build_policy_en_revised.py').write_text(out)
exec(compile(out,'build_policy_en_revised.py','exec'))
