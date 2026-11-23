import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export type Instrument = 'receiver' | 'patch' | 'printer';
export const anchors:Record<Instrument,[number,number,number]> = {receiver:[-2.0,1.96,1.08],patch:[.34,1.93,.86],printer:[2.48,1.62,1.02]};
const tau=Math.PI*2;
const shortSign=(s:string)=>Array.from(s.toUpperCase()).slice(0,24).join('')||'SIGNAL SERVICE';
export function makeWorkshop(author:string, theme:string) {
  const group=new T.Group(), materials=new Map<string,T.Material>(), textures:T.Texture[]=[];
  const batches=new Map<T.Material,T.BufferGeometry[]>(), geometryCache=new Map<string,T.BufferGeometry>();
  const black='#172929', ink='#263b39', green=theme==='clay'?'#6c6355':'#35716b', dark='#193e3b', light='#bad2bc', ivory='#ead9ae', copper='#bb7551', orange='#de7745', gold='#ffd795';
  function mat(c:string,em=false){const k=c+em;if(!materials.has(k))materials.set(k,em?new T.MeshBasicMaterial({color:c}):new T.MeshStandardMaterial({color:c,roughness:.77,metalness:.11}));return materials.get(k)!;}
  function geo(k:string,f:()=>T.BufferGeometry){if(!geometryCache.has(k))geometryCache.set(k,f());return geometryCache.get(k)!;}
  const trans=new T.Object3D();
  function shape(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number,w:number,h:number,d:number,rx=0,ry=0,rz=0){
    trans.position.set(x,y,z);trans.scale.set(w,h,d);trans.rotation.set(rx,ry,rz);trans.updateMatrix();const copy=(g.index?g.toNonIndexed():g.clone()).applyMatrix4(trans.matrix); for(const key of Object.keys(copy.attributes))if(!['normal','uv','position'].includes(key))copy.deleteAttribute(key);if(!batches.has(m))batches.set(m,[]);batches.get(m)!.push(copy);
  }
  const cube=geo('box',()=>new T.BoxGeometry()),soft=geo('soft',()=>new RoundedBoxGeometry(1,1,1,2,.08)),cyl=geo('cyl',()=>new T.CylinderGeometry(1,1,1,20)),sphere=geo('sphere',()=>new T.SphereGeometry(1,10,8));
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,c:string,round=false,rx=0,ry=0,rz=0,em=false)=>shape(round?soft:cube,mat(c,em),x,y,z,w,h,d,rx,ry,rz);
  const tube=(x:number,y:number,z:number,r:number,h:number,c:string,rx=0,rz=0)=>shape(cyl,mat(c),x,y,z,r,h,r,rx,0,rz);
  const ball=(x:number,y:number,z:number,w:number,h:number,d:number,c:string,rz=0,em=false)=>shape(sphere,mat(c,em),x,y,z,w,h,d,0,0,rz);
  function line(points:number[][],r:number,c:string,em=false){const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number])));const g=new T.TubeGeometry(path,Math.max(8,points.length*5),r,7,false);shape(g,mat(c,em),0,0,0,1,1,1);g.dispose();}
  function canvasTex(w:number,h:number,paint:(ctx:CanvasRenderingContext2D)=>void){const ca=document.createElement('canvas');ca.width=w;ca.height=h;const c=ca.getContext('2d')!;paint(c);const t=new T.CanvasTexture(ca);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;textures.push(t);return t;}
  function panel(x:number,y:number,z:number,w:number,h:number,t:T.Texture,ry=0,rx=0){const m=new T.MeshBasicMaterial({map:t,side:T.DoubleSide,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});const obj=new T.Mesh(new T.PlaneGeometry(w,h),m);obj.position.set(x,y,z);obj.rotation.order='YXZ';obj.rotation.set(rx,ry,0);group.add(obj);return obj;}
  let rng=19023;function rnd(){rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;}
  function placard(x:number,y:number,z:number,w:number,h:number,top:string,bottom:string,fg:string,bg:string,ry=0){const pw=768,ph=Math.max(100,Math.min(830,Math.round(768*h/w)));const t=canvasTex(pw,ph,c=>{c.fillStyle=bg;c.fillRect(0,0,pw,ph);c.strokeStyle=fg;c.lineWidth=Math.max(2,ph*.012);c.strokeRect(7,5,pw-14,ph-10);c.fillStyle=fg;c.textAlign='center';c.font=`bold ${Math.min(ph*(bottom?.64:.76),pw/(Math.max(top.length,1)*.60))}px Helvetica, Arial, sans-serif`;c.fillText(top,pw/2,ph*(bottom?.64:.73),pw*.94);if(bottom){c.font=`bold ${Math.min(ph*.16,pw/(bottom.length*.63))}px monospace`;c.fillText(bottom,pw/2,ph*.87,pw*.91);}for(let i=0;i<1800;i++){c.fillStyle=i%2?'rgba(25,44,39,.10)':'rgba(255,240,198,.12)';c.fillRect(rnd()*pw,rnd()*ph,1+rnd()*3,1);}});panel(x,y,z,w,h,t,ry);}
  const grain=canvasTex(256,256,c=>{c.fillStyle='#f5f4ee';c.fillRect(0,0,256,256);const im=c.getImageData(0,0,256,256);for(let i=0;i<im.data.length;i+=4){const a=Math.floor(rnd()*32);im.data[i]=248-a;im.data[i+1]=246-a;im.data[i+2]=239-a;}c.putImageData(im,0,0);for(let i=0;i<70;i++){c.fillStyle='rgba(54,53,42,.09)';c.fillRect(rnd()*256,rnd()*256,1+rnd()*13,.8);}});grain.wrapS=grain.wrapT=T.RepeatWrapping;
  const wood=canvasTex(512,256,c=>{c.fillStyle='#e8b881';c.fillRect(0,0,512,256);for(let i=0;i<280;i++){const y=rnd()*256;c.strokeStyle=i%2?'rgba(91,42,24,.13)':'rgba(255,242,200,.32)';c.lineWidth=.4+rnd()*1.6;c.beginPath();let x=rnd()*512-256;c.moveTo(x,y);c.bezierCurveTo(x+100,y-7,x+152,y+6,x+210+rnd()*320,y);c.stroke();}for(let j=1;j<5;j++){c.fillStyle='rgba(63,40,23,.19)';c.fillRect(0,j*51,512,1.5);}});
  const woodmat=new T.MeshStandardMaterial({map:wood,roughness:.73});shape(cube,woodmat,0,1.239,.16,7.73,.018,1.96);
  // Cast-iron curb, inlaid pavement and painted roadway form the foreground silhouette.
  box(0,-.43,.15,10.4,.54,7.4,black,true);box(0,-.17,.15,10.42,.10,7.42,'#5c7472',true);
  box(0,-.085,.15,10.34,.09,7.35,'#425b5a');box(0,.015,-.28,9.55,.16,5.48,'#99a39a',true);
  for(let i=0;i<16;i++)box(-4.47+i*.59,.075,2.43,.572,.18,.22,i%3?'#a8afa2':'#c5c3aa',true);
  for(let i=0;i<8;i++)box(-4.6+i*1.3,-.026,3.15,.76,.012,.065,'#e2bd77');
  for(let i=0;i<12;i++)box(-4.64+i*.83,.106,1.88,.015,.009,1.05,'#778783');
  for(let i=0;i<9;i++)box(-4.6+i*.062,.015,2.84,.031,.018,.32,black);
  // Ceramic tile façade, chunky wood counter, vertically seamed wall and roof flashing.
  box(0,.16,-.60,8.04,.14,3.65,'#bca887',true);box(0,1.91,-2.25,7.92,3.52,.18,green);box(3.88,1.88,-.63,.18,3.45,3.44,green);
  for(let i=0;i<39;i++)box(-3.82+i*.2,1.91,-2.135,.025,3.4,.028,'#54827a');
  for(let i=0;i<17;i++)box(3.988,1.88,-2.14+i*.2,.023,3.32,.026,'#56877b');
  box(0,2.88,-2.05,7.8,.14,.12,copper);box(0,.39,-2.07,7.8,.28,.14,ink);
  box(0,.66,.18,7.48,.86,1.72,green,true);box(0,1.13,.16,7.73,.17,1.95,'#985d40',true);box(0,1.215,.16,7.75,.055,1.97,'#e5b77a',true);
  for(let row=0;row<3;row++)for(let col=0;col<24;col++)box(-3.58+col*.312,.32+row*.249,1.058,.299,.235,.037,[green,'#598b79','#689786','#5f9282'][(row*7+col*3)%4],true);
  box(0,.18,1.07,7.49,.10,.10,copper);box(0,1.09,1.13,7.71,.063,.08,gold);
  // Partial roof deliberately reveals the working surfaces and screens below it.
  box(0,3.55,-1.66,8.37,.24,1.65,dark,true);for(let i=0;i<34;i++)box(-4+i*.242,3.71,-1.66,.067,.075,1.70,'#658c83',true);
  box(0,3.57,-.79,8.42,.18,.13,ink);box(0,3.46,-.72,8.15,.045,.055,'#ffcf81',false,0,0,0,true);
  for(const x of [-3.57,3.57]){box(x,3.99,-1.35,.105,.72,.10,black);box(x,3.93,-1.66,.08,.71,.08,ink,false,-.35);}
  box(-.32,4.26,-1.35,6.55,1.04,.25,'#885b41',true);box(-.32,4.26,-1.195,6.44,.94,.08,ivory,true);
  placard(-.32,4.26,-1.14,6.28,.85,shortSign(author),'R E C O R D S    /    R E P A I R    /    R E L A Y','#364d43','#f6ddaa');
  // Wall print, inventory shelves and books, an illuminated service window and a station clock.
  box(-2.96,2.26,-2.08,1.35,1.69,.12,ivory); const poster=canvasTex(256,352,c=>{c.fillStyle='#e3c98d';c.fillRect(0,0,256,352);c.fillStyle='#ce663e';c.beginPath();c.arc(126,147,87,0,tau);c.fill();c.fillStyle='#29574f';for(let i=0;i<8;i++)c.fillRect(15,124+i*13,225,4+i*.65);c.font='bold 30px monospace';c.fillText('FIELD / 04',15,42);c.font='bold 17px monospace';c.fillText('TRANSMISSION STUDY',15,300);c.fillText('SERIES NO. 023',15,328);});panel(-2.96,2.26,-2.004,1.20,1.54,poster);
  box(.1,2.30,-2.04,2.75,1.67,.12,ivory,true);box(.1,2.30,-1.96,2.61,1.54,.08,'#e9a967',false,0,0,0,true);
  for(let i=0;i<9;i++)box(.1,1.67+i*.16,-1.89,2.56,.046,.09,i%2?copper:'#b98559',false,.22);for(let i=0;i<3;i++)box(-1.19+i*1.29,2.28,-1.86,.050,1.54,.07,dark);
  for(const y of [1.68,2.47]){box(2.47,y,-1.87,1.65,.09,.45,copper);for(let i=0;i<8;i++){let h=.22+(i%3)*.07;box(1.81+i*.151,y+.045+h/2,-1.84,.125,h,.28,[ivory,green,copper,light,ink][i%5],false,0,0,(i===6?.11:0));}}
  tube(3.44,2.94,-2.00,.32,.095,black,Math.PI/2);tube(3.44,2.94,-1.937,.274,.035,ivory,Math.PI/2);box(3.44,3.026,-1.909,.022,.17,.015,ink);box(3.506,2.94,-1.908,.135,.025,.02,ink);
  // Wall-mounted paperwork and miniature details give the close camera a second scale.
  placard(-.20,2.38,-1.80,.94,.23,'W-023','CALIBRATION BAY','#304d43','#ebc684');
  placard(-2.05,1.415,.637,1.14,.103,'N O C T U R N E   /   R X   2 3','','#4a5145','#c3aa82');
  placard(2.40,1.50,.686,.77,.16,'FIELD PRESS','SERIAL 031','#47534a','#d6b991');
  for(const x of [-3.00,-1.14])for(const y of [1.46,2.35]){tube(x,y,.601,.032,.035,copper,Math.PI/2);box(x,y,.625,.031,.008,.008,ink,false,0,0,.65);}
  for(let i=0;i<6;i++)box(-2.84+i*.13,2.508,-.13,.067,.015,.32,ink,true);
  for(const x of [-.61,1.07])for(const y of [1.37,2.067])tube(x,y,.435,.025,.034,copper,Math.PI/2);
  placard(.24,1.735,.435,1.32,.079,'INPUT  1    2    3    4    5    6','','#45574a','#cbb589');
  // A hinged service lamp pools warm light onto the worktop.
  tube(-3.47,1.30,-.42,.18,.08,ink);line([[-3.47,1.30,-.42],[-3.55,2.02,-.48],[-3.08,2.40,-.26]],.035,ink);
  ball(-3.54,2.03,-.48,.085,.082,.085,copper);const shade=geo('shade',()=>new T.CylinderGeometry(.44,1,1,24));shape(shade,mat(green),-3.08,2.36,-.26,.245,.20,.245,0,0,.18);tube(-3.06,2.269,-.26,.201,.019,'#ffe6ac',0,.18);
  // Turn a single electrical line into a loop of visible drops and warm bulbs.
  const sag=(x:number)=>3.19+.021*(x+.2)*(x+.2);line(Array.from({length:9},(_,i)=>{const x=-3.93+i*.97;return [x,sag(x),-.52];}),.019,black);
  for(let i=0;i<9;i++){let x=-3.71+i*.91,y=sag(x);tube(x,y-.065,-.52,.036,.13,black);ball(x,y-.185,-.52,.068,.105,.068,'#ffe6a3',0,true);}
  // Working CRT: inner bezel, physical dial, louvers, keys and a speaker grille.
  box(-2.06,1.34,.23,1.84,.20,1.16,'#b2936b',true);box(-2.06,1.91,.08,1.94,1.16,1.04,ivory,true);box(-2.20,1.94,.616,1.40,.87,.095,ink,true);box(-2.20,1.94,.672,1.26,.74,.078,'#27534b',true);
  for(let i=0;i<6;i++)box(-1.29,1.63+i*.067,.62,.19,.025,.045,black,true);tube(-1.29,2.16,.663,.118,.115,black,Math.PI/2);tube(-1.29,2.16,.733,.085,.035,copper,Math.PI/2);
  box(-2.11,1.295,.94,1.40,.084,.35,light,true);for(let i=0;i<11;i++)for(let j=0;j<3;j++)box(-2.70+i*.115,1.352,.833+j*.08,.09,.04,.059,j===2&&i>8?orange:ivory,true);
  // Patch bay: machined face, two analog meters, sockets, plugs and drooping cords.
  box(.23,1.72,.02,1.97,.96,.71,ink,true);box(.23,1.72,.392,1.84,.86,.065,'#bdab83',true);
  for(let i=0;i<2;i++){const x=-.18+i*.78;box(x,1.955,.439,.58,.27,.040,black,true);box(x,1.955,.467,.51,.20,.025,'#ffe39b',true,0,0,0,true);for(let j=0;j<8;j++)box(x-.207+j*.059,2.004,.485,.011,.048,.008,ink);box(x+.035,1.952,.489,.018,.13,.009,orange,false,0,0,-.55+i*.64);}
  for(let i=0;i<6;i++)for(let j=0;j<2;j++){let x=-.46+i*.276,y=1.48+j*.171;tube(x,y,.445,.076,.07,ink,Math.PI/2);tube(x,y,.487,.047,.028,i%3===0?orange:dark,Math.PI/2);}
  const patchPoints=[-.46,-.185,.09,.365,.64,.915];
  for(let i=0;i<3;i++){const x=patchPoints[i],e=patchPoints[i+3];line([[x,1.65,.51],[x,1.61,.68],[x+.11,1.27-i*.065,.72+i*.06],[e-.10,1.30-i*.06,.70+i*.07],[e,1.48,.51]],.025,[orange,'#527e77','#c5a654'][i]);}
  // Thermal printer and its hinged paper roll, spooled strip and exit tray.
  box(2.38,1.34,.22,1.56,.23,1.10,black,true);box(2.38,1.61,.19,1.45,.48,.94,'#c4754f',true);box(2.38,1.755,.32,1.30,.21,.80,'#e8a16d',true);box(2.36,1.77,.74,.94,.076,.06,black,true);
  for(const x of [1.89,2.86])box(x,1.92,-.15,.092,.34,.14,ink,true);tube(2.37,2.03,-.15,.175,.97,ivory,0,Math.PI/2);tube(2.37,2.03,-.15,.07,1.02,black,0,Math.PI/2);box(2.95,1.863,.49,.11,.04,.10,'#bdf1b2',true,0,0,0,true);
  // Side façade: a projecting blade sign, vent grilles, conduits and a meter box.
  box(4.04,2.3,-.88,.09,1.03,1.23,'#d9c6a0',true);for(let i=0;i<9;i++)box(4.104,1.95+i*.085,-.88,.068,.032,1.09,ink);
  for(const z of [-1.94,.61])line([[4.03,.28,z],[4.03,.56,z],[4.03,2.77,z],[4.05,3.22,z-.22]],.048,copper);
  box(4.23,3.22,.75,.64,.08,.12,ink);box(4.46,2.70,.75,.78,1.04,.20,orange,true);placard(4.46,2.70,.87,.69,.88,'FM','88.3','#ffe3a3','#9f5438');
  box(0,.72,1.11,2.29,.41,.06,dark,true);placard(0,.72,1.15,2.20,.35,'AFTER HOURS','WALK-IN SERVICE','#ffe2ac','#31554a');
  // Side label and an owner's inventory tag; all names come from the public export.
  placard(4.001,.93,-.72,1.27,.37,'RELAY NO. 23','SERVICE ACCESS','#c5d2af','#355a51',Math.PI/2);
  placard(-2.52,.75,1.092,1.15,.29,'STATION FILE',author.toUpperCase().slice(0,35),'#efe0bd','#9c6448');
  // Roof hardware: exhaust blades, a dipole, aerial, insulators, pipework and guy wire.
  box(2.76,3.91,-1.83,1.12,.48,.81,'#aaa88f',true);for(let i=0;i<8;i++)box(2.30+i*.126,3.94,-1.406,.079,.26,.024,ink);
  tube(-3.43,4.78,-1.91,.045,2.25,ink);for(let i=0;i<4;i++){const y=5.15+i*.17,l=.97-i*.15;line([[-3.43-l,y+.07,-1.91],[-3.43,y,-1.91],[-3.43+l,y-.07,-1.91]],.023,light);}
  line([[-3.43,5.32,-1.91],[-3.02,4.5,-2.07],[-2.54,3.75,-2.24]],.012,copper);ball(-3.43,5.94,-1.91,.065,.07,.065,orange,0,true);
  // Pavement props: a sandwich board, milk crate of records, a stool, thermos, coffee and potted foliage.
  box(-3.51,.69,1.72,.93,1.13,.11,copper,true,-.11);box(-3.51,.68,1.45,.79,1.11,.08,'#806348',true,.19);placard(-3.51,.70,1.79,.79,.87,'OPEN','NIGHT SHIFT','#f6dca5','#365e54');
  for(const x of [-.70,1.07]){tube(x,.65,1.77,.32,.11,'#bd744f');tube(x,.37,1.77,.052,.53,black);tube(x,.155,1.77,.23,.071,ink);}
  function plant(x:number,y:number,z:number,s:number){tube(x,y+s*.20,z,s*.27,s*.38,copper);tube(x,y+s*.40,z,s*.295,s*.07,'#db9b70');for(let i=0;i<12;i++){const a=i*2.399;const hh=(.19+.28*((i*11)%9)/8)*s;let ox=Math.cos(a)*s*.24,oz=Math.sin(a)*s*.24;ball(x+ox,y+s*.45+hh*.52,z+oz,.08*s,hh,.098*s,['#50795b','#6c925e','#7a9b6e'][i%3],-ox*1.8/s);}}
  plant(3.63,.1,1.78,1.15);plant(-3.32,1.25,-.12,.64);
  for(let i=0;i<2;i++){const x=-4.32+i*.23;box(x,.37,.73,.16,.43,.53,[orange,ivory][i],false,0,0,.11);}
  for(let j=0;j<3;j++)box(-4.19,.21+j*.104,1.02,.88,.063,.058,green);for(const x of [-4.59,-3.80])box(x,.34,.73,.084,.42,.67,green);
  tube(1.49,1.41,.52,.119,.33,ivory);tube(1.49,1.586,.52,.12,.02,ink);tube(-3.43,1.50,.71,.094,.49,green);tube(-3.43,1.77,.71,.096,.078,ivory);
  // Warm under-counter strip and tiny lit indicators stay visible without a bloom post-process.
  for(const x of [-3.20,3.20]){box(x,.31,1.087,.36,.07,.05,'#ffdf9c',true,0,0,0,true);}
  for(const [m,arr] of batches){const g=mergeGeometries(arr);if(!g)throw Error('Unable to batch workshop geometry');const obj=new T.Mesh(g,m);obj.castShadow=true;obj.receiveShadow=true;group.add(obj);arr.forEach(a=>a.dispose());}geometryCache.forEach(g=>g.dispose());
  // Photographic cues: stippled enamel, an irregular trim and a soft light falloff.
  for(const m of materials.values())if(m instanceof T.MeshStandardMaterial){m.map=grain;m.bumpMap=grain;m.bumpScale=.008;}
  const halo=canvasTex(128,128,c=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,230,159,.87)');g.addColorStop(.13,'rgba(253,184,98,.36)');g.addColorStop(.43,'rgba(247,131,48,.12)');g.addColorStop(1,'rgba(244,130,50,0)');c.fillStyle=g;c.fillRect(0,0,128,128);});const haloMat=new T.SpriteMaterial({map:halo,transparent:true,opacity:.72,blending:T.AdditiveBlending,depthWrite:false});
  for(let i=0;i<9;i++){const x=-3.71+i*.91;const sp=new T.Sprite(haloMat);sp.position.set(x,sag(x)-.185,-.47);sp.scale.set(.78,.78,1);group.add(sp);}
  // A real lathed parabolic dish turns with the receiver. The feed horn and rim read in silhouette.
  const pedestal=new T.Mesh(new T.CylinderGeometry(.09,.15,.53,16),mat('#4f6961'));pedestal.position.set(3.47,4.0,-1.85);group.add(pedestal);
  const dish=new T.Group();dish.position.set(3.47,4.30,-1.85);group.add(dish);const bowl=new T.Group();bowl.rotation.x=.76;bowl.rotation.z=-.23;dish.add(bowl);
  const par=new T.MeshStandardMaterial({color:'#d38764',side:T.DoubleSide,metalness:.38,roughness:.53,map:grain});const outline=Array.from({length:17},(_,i)=>{const r=.69*i/16;return new T.Vector2(r,.56*r*r);});const reflector=new T.Mesh(new T.LatheGeometry(outline,40),par);bowl.add(reflector);const rim=new T.Mesh(new T.TorusGeometry(.69,.024,8,50),mat('#e4be8d'));rim.rotation.x=Math.PI/2;rim.position.y=.267;bowl.add(rim);
  for(let i=0;i<3;i++){const a=i*tau/3;const ends=[new T.Vector3(Math.cos(a)*.57,.18,Math.sin(a)*.57),new T.Vector3(0,.55,0)];const leg=new T.Mesh(new T.TubeGeometry(new T.LineCurve3(ends[0],ends[1]),1,.013,6,false),mat('#4f625b'));bowl.add(leg);}const horn=new T.Mesh(new T.CylinderGeometry(.075,.046,.13,14),mat('#e4be8d'));horn.position.y=.57;bowl.add(horn);
  const pointer=new T.Group();pointer.position.set(-1.29,2.16,.758);const tick=new T.Mesh(new T.BoxGeometry(.017,.061,.016),mat('#ffe2a4',true));tick.position.y=.040;pointer.add(tick);group.add(pointer);
  const plugged=new T.Group();plugged.position.set(-.46,1.65,.52);const lead=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(0,-.03,.17),new T.Vector3(-.09,-.40,.38),new T.Vector3(-.39,-.59,.32),new T.Vector3(-.57,-.43,-.02)]),25,.025,8,false),mat('#ffbb75'));plugged.add(lead);group.add(plugged);
  const crt=panel(-2.20,1.94,.720,1.19,.65,canvasTex(512,288,()=>{}));
  const paper=panel(2.35,1.62,.825,.75,.30,canvasTex(256,192,c=>{c.fillStyle='#faf0d6';c.fillRect(0,0,256,192);c.fillStyle='#42534b';c.font='bold 24px monospace';c.fillText('SIGNAL / 023',13,38);for(let i=0;i<10;i++)c.fillRect(15,59+i*11,70+(i*47)%157,3);}));paper.rotation.x=-.40;
  const wire=new T.Mesh(new T.TorusGeometry(.084,.017,8,24),mat('#fff0a9',true));wire.position.set(-.46,1.65,.51);group.add(wire);
  function receipt(lines:string[],by:string){const t=(paper.material as T.MeshBasicMaterial).map!,ca=t.image as HTMLCanvasElement,c=ca.getContext('2d')!;c.fillStyle='#f5e9ca';c.fillRect(0,0,256,192);c.fillStyle='#2a473c';c.font='bold 19px monospace';c.fillText('FIELD NOTE / '+String(lines.length).padStart(2,'0'),12,28);c.font='13px monospace';c.fillText(by,12,50,230);c.fillRect(12,60,230,1);lines.slice(0,6).forEach((v,i)=>c.fillText((i+1)+'. '+v,12,81+17*i,227));t.needsUpdate=true;}
  function tune(title:string,index:number,total:number,page:string[]|null,pageno:number,mode:string){const t=(crt.material as T.MeshBasicMaterial).map!;const ca=t.image as HTMLCanvasElement,c=ca.getContext('2d')!;c.fillStyle='#123f38';c.fillRect(0,0,512,288);c.fillStyle='#a1fac4';c.font='bold 25px monospace';c.fillText('REC  '+String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0'),18,40);if(page){c.font='bold 22px monospace';c.fillText(mode+'   P.'+String(pageno).padStart(2,'0'),242,40);c.fillRect(18,54,476,2);c.font='26px monospace';page.forEach((s,i)=>c.fillText(s,18,100+i*41,470));t.needsUpdate=true;return;}c.strokeStyle='#79c690';c.lineWidth=2;c.beginPath();for(let i=0;i<480;i++){const y=99+Math.sin(i*.039+index)*Math.cos(i*.011)*31;(i?c.lineTo(i+16,y):c.moveTo(i+16,y));}c.stroke();c.font='bold 35px monospace';const words=title.split(/\s+/u);let row='';let y=177;for(const w of words){const next=row?row+' '+w:w;if(c.measureText(next).width>465&&row){c.fillText(row,17,y,465);row=w;y+=39;if(y>258)break;}else row=next;}if(y<=258)c.fillText(row,17,y,465);c.fillStyle='rgba(8,38,30,.24)';for(let i=0;i<288;i+=5)c.fillRect(0,i,512,1.5);t.needsUpdate=true;}
  return {group,tune,receipt,wire,paper,pointer,dish,plugged,textures,dispose(){const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();group.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());haloMat.dispose();textures.forEach(t=>t.dispose());}};
}
