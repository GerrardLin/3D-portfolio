import type { CareerEntry } from './profile.ts';
export const entrances=['field-atlas','evidence-desk','print-edition','logic-board','signal-service','gallery'] as const;
export type Entrance=typeof entrances[number];
export const entranceNames:Record<Entrance,string>={'field-atlas':'Field atlas · trace a route','evidence-desk':'Evidence desk · compare records','print-edition':'Print edition · turn the proofs','logic-board':'Logic board · inspect linked modules','signal-service':'Signal Service · operate a workshop',gallery:'Gallery · walk the floor'};
const cues: [Exclude<Entrance,'gallery'|'logic-board'>,RegExp][]=[
 ['field-atlas',/\b(?:community|fieldwork|accessib\w*|geospatial|routes?|maps?|qgis|neighbourhood|residents?|interviews?|screen.reader|surveying|urban|cartograph\w*|volunteers?|diary study|street|trail|wayfinding)\b|访谈|社区|路线|地图|无障碍|调研|田野|街区|志愿|用户研究/giu],
 ['evidence-desk',/\b(?:financ\w*|margin[s]?|treasury|cash|audit\w*|budget\w*|revenues?|valuation|scenario[s]?|invest\w*|reconcil\w*|forecast\w*|operating margin|economics|accounting|business analy\w*|business intelligence|kpis?|costs?|profit\w*|market analys\w*|cohort analys\w*)\b|金融|估值|对账|财务|预测|毛利|证券|营业收入|经营指标|量化|商业分析|投资|定价/giu],
 ['print-edition',/\b(?:graphic|typograph\w*|editorial|illustrat\w*|posters?|visual identity|brand\w*|art direction|photograph\w*|artwork|fashion|printmaking|animation|zine|publication|exhibition design|creative direction|magazine)\b|海报|平面|排版|视觉|品牌|插画|摄影|刊物|艺术|动效|美术/giu],
 ['signal-service',/\b(?:engineer\w*|ai|retriev\w*|python|software|reliability|latency|queue|telemetry|postgres\w*|algorithm\w*|pipeline[s]?|idempoten\w*|timeouts?|rollback|tutoring|radio|audio|broadcast|podcast|service mesh|robot\w*|embedded|sensor[s]?|backend|automation|linux|typescript|machine learning)\b|算法|检索|工程|后端|模型|软件|传感器|机器学习|流水线|机器人/giu],
];
export function directionFor(entries:CareerEntry[]):Entrance{
 const scores=cues.map(([id,regex])=>{const count=(s:string)=>Math.min(4,new Set(Array.from(s.toLowerCase().matchAll(regex),m=>m[0])).size);let points=0;for(const e of entries){const weight=e.kind==='Skill'?.23:e.kind==='Achievement'?.8:1;points+=weight*(2.4*count(e.title)+count(e.summary));}return {id,points};});
 scores.sort((a,b)=>b.points-a.points);if(scores[0].points<=0)return 'print-edition';if(scores[0].id==='signal-service'&&!entries.some(e=>e.kind!=='Skill'&&(/\b(radio|audio|broadcast|music|podcast|tutoring)\b|电台|音频|播客|辅导/iu.test(e.title)||/\b(tutor(?:ing)? (?:system|prototype|assistant)|audio processing|radio receiver)\b|辅导系统|音频处理/iu.test(e.summary))))return 'logic-board';return scores[0].id;
}
export function fingerprint(s:string){let h=2166136261;for(const c of s)h=Math.imul(h^c.codePointAt(0)!,16777619);return h>>>0;}

export function fieldInstrument(e:CareerEntry):'notebook'|'map table'|'survey tripod'|'field marker'{
 for(const text of [e.title,e.summary]){
  if(/interview|diar(y|ies)|focus group|访谈|日记|访谈笔记/iu.test(text))return 'notebook';
  if(/maps?|routes?|wayfinding|crossings?|地图|制图|路线|街区|导航/iu.test(text))return 'map table';
  if(/sampl|sensor|measure|survey|observation|测量|观测|采样|监测|调研/iu.test(text))return 'survey tripod';
 }
 return 'field marker';
}
