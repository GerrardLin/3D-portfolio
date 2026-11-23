import { useEffect,useRef,useState } from "react";
import * as T from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { reachable } from "./simulation.ts";

interface Props {
  kind: "record" | "web" | "evidence" | "priority" | "compare";
  clueLabels?: string[];
  seen?: number[];
  openClue?: (index: number) => void;
  ranked?: number[];
  onPick?: (index: number) => void;
  mode: number;
  playing: boolean;
  layout: "central" | "distributed";
  offline: boolean;
}
export function Stage(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef(props);
  live.current = props;
  const [failed, fail] = useState(false);
  useEffect(() => {
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas.current!, alpha: true, antialias: true });
    } catch {
      fail(true);
      return;
    }
    const container = host.current!;
    const surface = canvas.current!;
    const scene = new T.Scene();
    const world = new T.Group();
    scene.add(world);
    const camera = new T.OrthographicCamera(-6,6,3,-3,.1,55);
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene.add(new T.HemisphereLight("#efdcbc","#605f64",1.55));
    const key = new T.DirectionalLight("#ffe4b4",2.15);
    key.position.set(-4,7,4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024,1024);
    Object.assign(key.shadow.camera,{left:-7,right:7,bottom:-6,top:6});
    key.shadow.normalBias = .021;
    scene.add(key);
    const rim = new T.DirectionalLight(props.kind==="record"?"#b0cdbc":"#a3e3cc",1.6);
    rim.position.set(4,4,-5);
    scene.add(rim);
    const pool = new Map<string,T.Material>();
    const geometries: T.BufferGeometry[] = [];
    const textures: T.Texture[] = [];
    const rounded = new Map<string,T.BufferGeometry>();
    function paint(hex:string,emissive=false) {
      const tag = hex+emissive;
      if (!pool.has(tag)) pool.set(tag,emissive ? new T.MeshBasicMaterial({color:hex}) : new T.MeshStandardMaterial({color:hex,roughness:.60,metalness:.10}));
      return pool.get(tag)!;
    }
    function mesh(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number,parent:T.Object3D) {
      const obj = new T.Mesh(g,m);
      obj.position.set(x,y,z);
      obj.castShadow=true;
      obj.receiveShadow=true;
      parent.add(obj);
      return obj;
    }
    function box(x:number,y:number,z:number,w:number,h:number,d:number,c:string,parent:T.Object3D=world,r=.05) {
      const tag=[w,h,d,r].join("/");
      if (!rounded.has(tag)) rounded.set(tag,new RoundedBoxGeometry(w,h,d,2,r));
      return mesh(rounded.get(tag)!,paint(c),x,y,z,parent);
    }
    function disk(x:number,y:number,z:number,r:number,h:number,c:string,parent:T.Object3D=world) {
      const g = new T.CylinderGeometry(r,r,h,80);
      geometries.push(g);
      return mesh(g,paint(c),x,y,z,parent);
    }
    function wire(points:number[][], color:string, parent:T.Object3D=world, radius=.025) {
      const path = new T.CatmullRomCurve3(points.map(([x,y,z])=>new T.Vector3(x,y,z)));
      const g = new T.TubeGeometry(path,32,radius,7,false);
      geometries.push(g);
      return mesh(g,paint(color),0,0,0,parent);
    }
    function label(text:string,caption:string,w:number,h:number,x:number,y:number,z:number,parent:T.Object3D=world,flat=false,bg="#f0dcb7",fg="#20302c") {
      const bitmap=document.createElement("canvas");
      bitmap.width=512;
      bitmap.height=Math.max(78,Math.round(512*h/w));
      const c=bitmap.getContext("2d")!;
      c.fillStyle=bg;
      c.fillRect(0,0,bitmap.width,bitmap.height);
      c.strokeStyle=fg;
      c.lineWidth=2;
      c.strokeRect(6,6,500,bitmap.height-12);
      c.fillStyle=fg;
      c.textAlign="center";
      c.font="bold "+Math.min(80,bitmap.height*.49)+"px monospace";
      c.fillText(text,256,bitmap.height*.55,473);
      if(caption){c.font="bold "+Math.min(29,bitmap.height*.19)+"px monospace";c.fillText(caption,256,bitmap.height*.83,473);}
      const tex=new T.CanvasTexture(bitmap);
      tex.colorSpace=T.SRGBColorSpace;
      textures.push(tex);
      const mat=new T.MeshBasicMaterial({map:tex});
      pool.set("texture-"+textures.length,mat);
      const geom=new T.PlaneGeometry(w,h);
      geometries.push(geom);
      const part=mesh(geom,mat,x,y,z,parent);
      if(flat)part.rotation.x=-Math.PI/2;
      return part;
    }
    const record = new T.Group();
    const needle = new T.Group();
    const central = new T.Group(), distributed = new T.Group(), centralFailed = new T.Group(), distributedFailed = new T.Group();
    const power: T.Mesh[] = [];
    const meters:T.Mesh[]=[];
    const folders: T.Group[] = [];
    const ray = new T.Raycaster();
    const pointer = new T.Vector2();

    if(props.kind==="record") {
      box(0,-.61,.05,9.12,.31,6.06,"#41271d");
      box(0,-.38,0,9.02,.24,5.98,"#9d6240");
      box(0,-.14,0,8.87,.27,5.82,"#a89979");
      for (let i=0;i<18;i++) {
        box(0,-.43+(i%6)*.036,3.005+i*.0006,8.60,.012,.011,["#503328","#d99c68","#a97048"][i%3]);
      }
      const platen=disk(-1.08,.098,-.09,2.41,.28,"#d4c5a8");
      const rib = new T.Group();
      platen.add(rib);
      for (let i=0;i<72;i++) {
        const θ=i*Math.PI/36;
        const t=box(2.394*Math.sin(θ),0,2.394*Math.cos(θ),.071,.078,.032,i%3?"#716456":"#353733",rib,.008);
        t.rotation.y=θ;
      }
      record.position.set(-1.08,.28,-.09);
      world.add(record);
      disk(0,.003,0,2.29,.056,"#111615",record);
      for(let i=0;i<47;i++) {
        const g = new T.TorusGeometry(.73+i*.032,.0075,6,112);
        geometries.push(g);
        const x=mesh(g,paint(["#343a35","#212722","#5c5b50"][i%3]),0,.035,0,record);
        x.rotation.x=-Math.PI/2;
        x.castShadow=false;
      }
      disk(0,.035,0,.76,.016,"#e8b45d",record);
      label("GROOVE","33 RPM   /   2012",1.13,.78,0,.046,0,record,true,"#e8b45d","#332821");
      disk(0,.091,0,.059,.11,"#c1b39c",record);
      disk(3.28,.16,-1.78,.44,.33,"#444641");
      disk(3.28,.38,-1.78,.28,.14,"#b6ab92");
      needle.position.set(3.28,.47,-1.78);
      world.add(needle);
      wire([[0,.06,0],[-.30,.05,.96],[-.72,.03,2.69]],"#e4d9b5",needle,.055);
      box(-.74,-.025,2.76,.31,.17,.49,"#aa583c",needle,.031);
      for(let i=0;i<7;i++)box(-.81+i*.023,.065,2.78,.012,.009,.34,"#4b2d24",needle,.004);
      box(-.76,-.15,2.84,.05,.12,.04,"#d7c79b",needle,.007);
      box(3.29,.059,.32,1.14,.21,1.45,"#524b3c");
      for(let i=0;i<10;i++)box(3.29,.175,-.25+i*.113,.95,.012,.038,i%2?"#39413a":"#6c6c51",world,.006);
      for (let i=0;i<2;i++) {
        disk(2.42+i*1.03,.16,2.17,.22,.27,"#353733");
        disk(2.42+i*1.03,.31,2.17,.17,.034,"#c2ad85");
      }
      label("SIGNAL PRESS","RESIN  /  AUDIO",1.79,.60,2.61,.012,1.23,world,true);
      for(let i=0;i<3;i++) {
        box(-3.84+i*.35,.036,2.46,.20,.125,.24,"#433d34",world,.018);
        meters.push(box(-3.84+i*.35,.102,2.46,.134,.027,.16,"#90683f",world,.012));
      }
    } else if(props.kind==="web") {
      box(0,-.48,0,9,.3,5.5,"#102925");
      box(0,-.29,0,9,.12,5.5,"#ccaf81");
      box(0,-.16,0,8.88,.15,5.43,"#5a7363");
      for(let i=0;i<19;i++)box(-4.2+i*.45,-.079,2.41,.013,.010,.22,"#a4a784",world,.003);
      const locations=[[-3,-.83],[0,-1.07],[3,-.83]];
      for(let i=0;i<3;i++) {
        const [x,z]=locations[i];
        box(x,.03,z,2.50,.19,2.39,"#384c42");
        box(x,.72,z,1.89,1.27,1.38,"#d5be91");
        box(x,.79,z+.71,1.58,.94,.11,"#293d34");
        label(["VM/CMS","VAX/VMS","UNIX"][i],"LOCAL ARCHIVE",1.35,.68,x,.81,z+.771,world,false,"#1a392f","#a1e3aa");
        box(x,.108,z+1.01,1.38,.10,.42,"#d2c099");
        for(let row=0;row<3;row++)for(let col=0;col<9;col++)box(x-.51+col*.128,.17,z+.87+row*.11,.095,.033,.075,"#786f5b",world,.006);
        power.push(disk(x+.73,1.45,z+.4,.066,.037,"#afcba4"));
        for(let j=0;j<9;j++) box(x-.64+j*.16,1.361,z-.29,.035,.02,.40,"#98876b",world,.006);
      }
      world.add(central,distributed,centralFailed,distributedFailed);
      box(0,.18,1.85,2,.46,.82,"#334641");
      label("INDEX","LINK SERVICE",1.62,.24,0,.25,2.27);
      for(const [x,z] of locations) {
        wire([[0,.07,1.65],[x*.4,.04,1.50],[x,.05,.97],[x,.06,z+.34]],"#eead64",central,.046);
        wire([[0,.07,1.65],[x*.4,.04,1.50],[x,.05,.97],[x,.06,z+.34]],"#ce6a53",centralFailed,.034);
      }
      wire([[-3,.07,-.65],[-2,.04,.76],[2,.04,.88],[3,.07,-.65]],"#a2d49c",distributed,.046);
      wire([[-3,.07,-.65],[-2,.04,.76],[2,.04,.88],[3,.07,-.65]],"#a2d49c",distributedFailed,.046);
      wire([[0,.05,-.57],[-.56,.045,.09],[-1.5,.04,.88]],"#a2d49c",distributed);
      wire([[0,.05,-.57],[-.56,.045,.09],[-1.5,.04,.88]],"#ce6a53",distributedFailed);
    } else if (props.kind === "priority" || props.kind === "compare") {
      const priority = props.kind === "priority";
      box(0,-.50,0,9.20,.32,5.25,priority?"#3d2b20":"#1c3b38");
      box(0,-.27,0,9.12,.17,5.18,priority?"#ac7046":"#83a08e");
      box(0,-.14,0,9,.13,5.04,priority?"#604637":"#2b554d");
      const labels = props.clueLabels ?? [];
      const spacing = priority ? 2.7 : 3.65;
      labels.forEach((caption,index) => {
        const item = new T.Group();
        item.position.x = (index-(labels.length-1)/2)*spacing;
        folders.push(item);
        world.add(item);
        const tint = ["#d39c60","#93b59e","#bc7b69"][index];
        if (priority) {
          box(0,.10,.25,2.32,.34,2.88,"#3f3226",item);
          box(0,.34,.20,2.19,.18,2.69,tint,item);
          for (let slot=0;slot<3;slot++) box(-.55+slot*.55,.438,.73,.29,.032,.43,"#4b382b",item,.01);
          label(caption.slice(0,16),"",1.96,.78,0,.442,-.47,item,true,"#eed1a6","#3d3026");
          meters.push(disk(0,.53,1.10,.13,.044,"#6c5240",item));
        } else {
          box(0,.28,0,3.06,.63,2.90,"#243632",item);
          box(0,.72,-.12,2.91,.27,2.69,tint,item);
          box(0,.89,-.30,2.65,.08,1.95,"#c6ceac",item);
          label(caption.slice(0,20),"",2.40,.73,0,.94,-.46,item,true,"#dfecce","#23463f");
          meters.push(disk(0,.80,1.12,.19,.07,"#466951",item));
        }
      });
    } else {
      box(0,-.47,0,8.60,.29,5.05,"#372e24");
      box(0,-.27,0,8.56,.16,5.02,"#b29864");
      box(0,-.13,0,8.39,.18,4.87,"#3b5750");
      box(0,-.026,-1.56,8.10,.040,.12,"#b89958");
      const labels = props.clueLabels ?? [];
      for(let i=0;i<labels.length;i++) {
        const folder = new T.Group();
        folder.position.set((i-(labels.length-1)/2)*2.46,0,.15);
        world.add(folder);
        folders.push(folder);
        box(0,.065,0,2.12,.15,3.23,"#a16846",folder);
        box(0,.19,.10,2.03,.075,2.91,"#e0c698",folder);
        box(-.59,.172,-1.49,.74,.09,.37,"#d9af79",folder);
        for(let row=0;row<9;row++)box(.05,.233,-.32+row*.17,1.47,.006,.013,"#938c6a",folder,.002);
        label(labels[i].slice(0,24),"FIELD NOTE",1.76,.63,0,.236,-.85,folder,true,"#e5cc9d","#30453b");
        disk(.72,.244,1.17,.20,.022,"#ba7956",folder);
        box(-.69,.233,1.20,.30,.007,.13,"#b79c79",folder,.006);
      }
      label("EVIDENCE","OPEN A FIELD NOTE",1.85,.42,-2.83,.002,-1.96,world,true,"#2e4f43","#e6ca99");
    }

    let frame=0, still=true, drag=false, previous=0, start=0, yaw=0;
    const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    function draw(time:number) {
      frame=0;
      if(!still)return;
      const state=live.current;
      if(state.kind==="record") {
        if(state.playing && !reduced) record.rotation.y=-time*.003;
        needle.rotation.y=state.playing?-.47:-.06;
        meters.forEach((obj,i)=>{obj.material=paint(i===state.mode?"#f2b86c":"#624b38",true);});
      } else if(state.kind==="web") {
        central.visible=state.layout==="central"&&!state.offline;
        centralFailed.visible=state.layout==="central"&&state.offline;
        distributed.visible=state.layout==="distributed"&&!state.offline;
        distributedFailed.visible=state.layout==="distributed"&&state.offline;
        reachable(state.layout,state.offline).forEach((on,i)=>{power[i].material=paint(on?"#a5f4a7":"#e76750",true);});
      } else if (state.kind === "priority" || state.kind === "compare") {
        folders.forEach((item,index) => {
          const rank = state.ranked?.indexOf(index) ?? -1;
          const active = state.kind === "priority" ? rank >= 0 : index === state.mode;
          item.position.y = state.kind === "priority" ? (rank < 0 ? 0 : .28 + (folders.length-rank)*.16) : active ? .40 : 0;
          meters[index].material = paint(active ? "#ffd380" : "#6b7460", true);
        });
      } else {
        folders.forEach((folder,i)=>{
          const open=state.seen?.includes(i);
          folder.rotation.x=open?-.19:0;
          folder.position.y=open?.20:0;
        });
      }
      world.rotation.y=yaw;
      renderer.render(scene,camera);
      if(state.playing&&!reduced)wake();
    }
    function wake(){if(!frame&&still)frame=requestAnimationFrame(draw);}
    function resize() {
      const w=container.clientWidth,h=container.clientHeight;
      if(!w||!h)return;
      renderer.setSize(w,h,false);
      const ratio=w/h;
      const half=Math.max(3.28,5.35/ratio);
      camera.left=-half*ratio;camera.right=half*ratio;camera.top=half;camera.bottom=-half;
      camera.position.set(3.65,9.6,11.2);
      camera.lookAt(0,.12,0);
      camera.updateProjectionMatrix();
      wake();
    }
    const pointerDown=(e:PointerEvent)=>{drag=true;start=previous=e.clientX;surface.setPointerCapture(e.pointerId);};
    const pointerMove=(e:PointerEvent)=>{if(!drag)return;yaw=T.MathUtils.clamp(yaw+(e.clientX-previous)*.006,-.55,.60);previous=e.clientX;wake();};
    const pointerUp=(event:PointerEvent)=>{
      if(drag && folders.length && Math.abs(event.clientX-start)<5){
        const bounds=surface.getBoundingClientRect();
        pointer.set((event.clientX-bounds.left)/bounds.width*2-1,1-(event.clientY-bounds.top)/bounds.height*2);
        ray.setFromCamera(pointer,camera);
        const picked=ray.intersectObjects(folders,true)[0];
        if(picked){
          let obj:T.Object3D|null=picked.object;
          while(obj && !folders.includes(obj as T.Group))obj=obj.parent;
          if(obj) {
            const pickedIndex = folders.indexOf(obj as T.Group);
            if (live.current.kind === "evidence") live.current.openClue?.(pickedIndex);
            else live.current.onPick?.(pickedIndex);
          }
        }
      }
      drag=false;
    };
    const pointerCancel=()=>{drag=false;};
    surface.addEventListener("pointerdown",pointerDown);
    surface.addEventListener("pointermove",pointerMove);
    surface.addEventListener("pointerup",pointerUp);
    surface.addEventListener("pointercancel",pointerCancel);
    container.addEventListener("stage-change",wake);
    const observer=new ResizeObserver(resize);
    observer.observe(container);
    resize();
    return ()=>{
      still=false;
      observer.disconnect();cancelAnimationFrame(frame);
      surface.removeEventListener("pointerdown",pointerDown);surface.removeEventListener("pointermove",pointerMove);
      surface.removeEventListener("pointerup",pointerUp);surface.removeEventListener("pointercancel",pointerCancel);
      container.removeEventListener("stage-change",wake);
      geometries.forEach(g=>g.dispose());rounded.forEach(g=>g.dispose());
      pool.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
      key.shadow.map?.dispose();renderer.dispose();
    };
  },[props.kind]);
  useEffect(()=>{host.current?.dispatchEvent(new Event("stage-change"));},[props.mode,props.playing,props.layout,props.offline,props.seen,props.ranked]);
  return <div className="stage" ref={host}><canvas ref={canvas} aria-hidden="true"/>{failed&&<span className="stage-error">可通过页面上的按钮继续体验。</span>}</div>;
}
