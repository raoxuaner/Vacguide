export const VERSION=1;
export function preset(key='study') {
 const angles=key==='arch'?[38,38,38,38]:key==='wave'?[45,60,60,45]:[20,30,50,70];
 return {schema:'vacguide-studio',version:VERSION,name:key==='arch'?'拱形展示 · 同步成形':key==='wave'?'折线翼片 · 两组时序':'四关节 · 局部角度研究',preset:key,panelLength:45,span:30,gap:8,joints:angles.map((angle,i)=>({id:`J${i+1}`,angle,plane:'out',direction:key==='wave'&&i%2===1?-1:1,group:key==='wave'&&i>=2?'B':'A'})),timing:{duration:8,A:{start:0,end:4},B:{start:3,end:7},reset:'manual'},notes:'几何及装配规划；未校准实物响应。',createdAt:new Date().toISOString()};
}
const number=(v,min,max,name)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(`${name} 必须在 ${min}–${max} 之间`);return v};
export function validateProject(p){
 if(!p||p.schema!=='vacguide-studio'||p.version!==VERSION)throw Error('不是受支持的 VacGuide Studio v1 项目');
 if(typeof p.name!=='string'||p.name.length>60)throw Error('项目名称无效');
 if(!Array.isArray(p.joints)||p.joints.length<1||p.joints.length>12)throw Error('项目需要 1–12 个关节');
 const out={schema:p.schema,version:VERSION,name:p.name,preset:['study','arch','wave'].includes(p.preset)?p.preset:'custom',panelLength:number(p.panelLength,15,120,'面片长度'),span:number(p.span,10,100,'跨度'),gap:number(p.gap,4,30,'预留间距'),joints:p.joints.map((j,i)=>{
 if(!j||!['in','out'].includes(j.plane)||![1,-1].includes(j.direction)||!['A','B'].includes(j.group))throw Error(`J${i+1} 参数无效`);
 return {id:`J${i+1}`,angle:number(j.angle,0,120,'目标角度'),plane:j.plane,direction:j.direction,group:j.group};
 }),timing:{duration:number(p.timing?.duration,2,60,'序列时长'),reset:p.timing?.reset==='unverified'?'unverified':p.timing?.reset==='passive'?'passive':'manual'},notes:typeof p.notes==='string'?p.notes.slice(0,2000):'',createdAt:typeof p.createdAt==='string'?p.createdAt:new Date().toISOString()};
 for(const g of ['A','B']){const start=number(p.timing?.[g]?.start,0,out.timing.duration-.2,'开始时间'),end=number(p.timing?.[g]?.end,.2,out.timing.duration,'结束时间');if(end-start<.2-1e-8)throw Error(`${g} 组抽气结束必须比开始晚至少 0.2 秒`);out.timing[g]={start,end};}
 return out;
}
export function channelFactor(t,channel){if(t<channel.start)return 0;if(t<=channel.end)return Math.min(1,(t-channel.start)/.8);return Math.min(1,(channel.end-channel.start)/.8)*Math.max(0,1-(t-channel.end)/.8)}
export const resetLabel={manual:'手动辅助',passive:'被动复位（用户设定，待实测核验）',unverified:'尚未确认'};
