import { Image, Platform, Pressable, Text, View } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { freePhotoCalendar } from '../model/freePhotoCalendars';
import { groupCalendarDiaries } from '../lib/heroCalendar';
import { getLocalDateKey } from '@entities/day-plan/lib/localDateKey';
import { HeroCalendarPhoto } from './HeroCalendarPhoto';
import type { ComicDiary } from '../lib/heroDiaryStorage';
const template = require('../../../../docs/design/photo-diary/city-calendar-template.json');
export function FreePhotoCalendarPaper({ design, width, height, month, today, diaries, miniature, onSelectDate, onPreviousMonth, onNextMonth, background = true }: { design: string; width: number; height: number; month: Date; today: Date; diaries: ComicDiary[]; miniature?: boolean; background?: boolean; onSelectDate?: (key: string) => void; onPreviousMonth?: () => void; onNextMonth?: () => void }) {
 const theme = freePhotoCalendar(design)!;
 const records = groupCalendarDiaries(diaries);
 const offset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
 const ink = theme.ink;
 const region = (values: number[]) => ({ left: values[0]/template.size[0]*width, top: values[1]/template.size[1]*height, width: values[2]/template.size[0]*width, height: values[3]/template.size[1]*height });
 const heading = region(template.month), weekdays = region(template.weekdays), grid = region(template.grid);
 // Keep the same template columns while lifting this photo collection below its subject.
 const lift = height * ('calendarLift' in theme ? theme.calendarLift : 0.13);
 heading.top -= lift; weekdays.top -= lift; grid.top -= lift;
 grid.height = Math.min(height * 0.52, height * 0.85 - grid.top);
 const font = Platform.OS === 'ios' ? 'Baskerville' : 'serif';
 return <View style={{ width, height }}>
 {background && <Image source={miniature ? theme.thumbnail : theme.background} resizeMode="cover" style={{ position:'absolute', width:'100%', height:'100%' }} />}
 <View style={{ position:'absolute', ...heading, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
 <Pressable accessibilityLabel="Previous month" onPress={onPreviousMonth}><Text style={{ color:ink, fontSize:width*.07 }}>‹</Text></Pressable>
 <Text style={{ color:ink, fontFamily:font, fontSize:width*.065 }}>{month.toLocaleString('en-US',{month:'long'})} {month.getFullYear()}</Text>
 <Pressable accessibilityLabel="Next month" onPress={onNextMonth}><Text style={{ color:ink, fontSize:width*.07 }}>›</Text></Pressable>
 </View>
 <View style={{ position:'absolute', ...weekdays, flexDirection:'row', alignItems:'center' }}>{['MON','TUE','WED','THU','FRI','SAT','SUN'].map(day=><Text key={day} style={{ width:'14.2857%', textAlign:'center', color:ink, fontFamily:font, fontSize:width*.026 }}>{day}</Text>)}</View>
 <View style={{ position:'absolute', ...grid, flexDirection:'row', flexWrap:'wrap' }}>{Array.from({length:42},(_,slot)=>{
 const date=new Date(month.getFullYear(),month.getMonth(),slot-offset+1,12), key=getLocalDateKey(date), active=date.getMonth()===month.getMonth();
 const uri=records.get(key)?.flatMap(record=>record.scenes).find(scene=>scene.artworkUri)?.artworkUri;
 const selected=key===getLocalDateKey(today);
 return <Pressable key={key} accessibilityLabel={key} disabled={miniature || !onSelectDate} onPress={() => { tapHaptic('select'); onSelectDate?.(key); }} style={{ width:'14.2857%', height:grid.height/6, alignItems:'center' }}>
 <Text style={{ color:ink, opacity:active?1:.4, fontFamily:font, fontSize:width*.037, borderWidth:selected?1:0, borderColor:ink, borderRadius:20, paddingHorizontal:3 }}>{date.getDate()}</Text>
 {uri && !miniature && <View style={{ width:grid.width/7*.8, height:grid.height/6*.58, borderWidth:1, borderColor:'#F8F0E5', borderRadius:2, overflow:'hidden' }}><HeroCalendarPhoto uri={uri}/></View>}
 </Pressable>;
 })}</View>
 </View>;
}
