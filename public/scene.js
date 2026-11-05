/* WorldLayer: a tiny procedural atlas. Native WebGL, no assets or dependencies. */
(() => {
  'use strict';
  let canvas = document.querySelector('#scene');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { seed: 42918, oldSeed: 42918, biome: 0, oldBiome: 0, spread: .35, targetSpread: .35, morph: 1, yaw: -.64, targetYaw: -.64, pitch: .68, targetPitch: .68, zoom: 1, targetZoom: 1, paused: reducedMotion.matches, dragging: false };
  const names = [['The quiet divide','A fold in the earth','Where the light settles','The long way home','An unnamed ridge','Before the first road','A place between places','The sleeping highlands'],['Sea of stillness','Where the wind goes','The amber hour','A soft horizon','After the last rain','The wandering sands','Under a distant sun','The long afternoon'],['A quieter moon','The far side of here','Somewhere after Earth','A different gravity','What the dark kept','The silver interval','An impossible shore','The pale frontier']];
  let gl = null, renderScene = null, lastTime = 0, elapsed = 0, frameId = 0, visible = true, width = 0, height = 0, disposed = false;
  try { gl = canvas.getContext('webgl', { alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' }); } catch (_) { /* A 2D fallback is provided below. */ }
  function announce() {
    const detail = { seed: state.seed, biome: state.biome, name: names[state.biome][state.seed % names[state.biome].length], paused: state.paused };
    document.dispatchEvent(new CustomEvent('atlaschange', { detail }));
    return detail;
  }
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  function rotate(yaw, pitch = 0) { state.targetYaw += yaw; state.targetPitch = clamp(state.targetPitch + pitch, .34, 1.13); requestFrame(); }
  function requestFrame() { if (!frameId && !disposed && visible && !document.hidden) frameId = requestAnimationFrame(frame); }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    width = Math.max(1, Math.round(rect.width * ratio)); height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  }

  const vertexSource = `
precision highp float;
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
uniform float uSeed;
uniform float uOldSeed;
uniform float uBiome;
uniform float uOldBiome;
uniform float uMorph;
uniform float uSpread;
uniform float uLayer;
uniform float uTime;
varying vec3 vNormal;
varying vec3 vWorld;
varying float vElevation;
varying float vSurface;
varying float vLayer;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453123); }
float noise(vec2 p) { vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
float fbm(vec2 p) { return .5*noise(p)+.25*noise(p*2.03+2.7)+.125*noise(p*4.07+7.1)+.0625*noise(p*8.11+11.4); }
float terrain(vec2 p,float seed,float biome) {
  vec2 o=vec2(mod(seed,137.0)*.31,mod(seed,173.0)*.27);
  vec2 q=p+o;
  float edge=1.0-smoothstep(1.45,2.14,max(abs(p.x),abs(p.y)));
  float radial=1.0-smoothstep(.2,2.65,length(p));
  if(biome<.5) {
    float n=fbm(q*1.05);
    float r=pow(1.0-abs(noise(q*.95)*2.0-1.0),3.2);
    float r2=pow(1.0-abs(noise(q*1.9+3.4)*2.0-1.0),2.6);
    return .035+edge*(radial*(r*.95+r2*.43+n*.35)+n*.075);
  } else if(biome<1.5) {
    float wave=sin(p.x*4.2+p.y*1.9+fbm(q*.56)*10.0);
    float dunes=pow(.5+.5*wave,2.0)*.5;
    return .04+edge*(dunes+fbm(q*.7)*.27+radial*.17);
  }
  float h=fbm(q*2.2)*.37;
  for(int i=0;i<4;i++) {
    float k=float(i);
    vec2 c=vec2(hash(vec2(k,seed*.001)),hash(vec2(seed*.003,k+4.0)))*2.8-1.4;
    float d=length(p-c), r=.32+hash(c)*.36;
    h+=exp(-pow((d-r)*9.0,2.0))*.32-exp(-pow(d/r,3.0))*.24;
  }
  return .06+edge*(h+.10);
}
float topHeight(vec2 p) {
  if(uLayer>.5) return -.16-uLayer*.22-uSpread*uLayer*.43+noise(p*1.5+uSeed*.01)*.022;
  float t=uMorph*uMorph*(3.0-2.0*uMorph);
  float h=mix(terrain(p,uOldSeed,uOldBiome),terrain(p,uSeed,uBiome),t);
  return .08+h+uSpread*.35+sin(uMorph*3.14159265)*.14*sin(p.x*2.0+p.y*1.7);
}
void main() {
  vec2 p=aPosition.xz;
  float y=topHeight(p);
  float base=uLayer<.5 ? -.20+uSpread*.35 : y-.14;
  vec3 pos=vec3(p.x,mix(base,y,aPosition.y),p.y);
  vec3 normal=aNormal;
  if(aNormal.y>.5) {
    float dx=topHeight(p+vec2(.014,0.))-topHeight(p-vec2(.014,0.));
    float dz=topHeight(p+vec2(0.,.014))-topHeight(p-vec2(0.,.014));
    normal=normalize(vec3(-dx,.028,-dz));
  }
  vec4 world=uModel*vec4(pos,1.);
  vWorld=world.xyz;
  vNormal=mat3(uModel)*normal;
  vElevation=y-uSpread*.35;
  vSurface=aNormal.y;
  vLayer=uLayer;
  gl_Position=uProjection*uView*world;
}`;
  const fragmentSource = `
precision highp float;
varying vec3 vNormal;
varying vec3 vWorld;
varying float vElevation;
varying float vSurface;
varying float vLayer;
uniform float uBiome;
uniform float uOldBiome;
uniform float uMorph;
uniform float uTime;
uniform float uSpread;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
vec3 terrainColor(float biome,float h) {
  if(biome<.5) {
    vec3 low=vec3(.28,.37,.18), mid=vec3(.66,.72,.38), high=vec3(.89,.91,.73);
    return mix(mix(low,mid,smoothstep(.07,.54,h)),high,smoothstep(.71,1.25,h));
  } else if(biome<1.5) return mix(vec3(.48,.24,.12),vec3(.91,.69,.42),smoothstep(.03,.86,h));
  return mix(vec3(.29,.33,.34),vec3(.78,.79,.70),smoothstep(.04,.65,h));
}
void main() {
  vec3 normal=normalize(vNormal);
  vec3 light=normalize(vec3(-.55,1.0,.65));
  float diffuse=.48+max(dot(normal,light),0.)*.62;
  float t=uMorph*uMorph*(3.0-2.0*uMorph);
  vec3 color=mix(terrainColor(uOldBiome,vElevation),terrainColor(uBiome,vElevation),t);
  if(vLayer>.5) {
    color=mix(vec3(.36,.43,.24),vec3(.22,.27,.19),(vLayer-1.)*.7);
    float strata=abs(fract((vWorld.x*.18+vWorld.z*.22+sin(vWorld.x*1.9)*.08)*14.)-.5);
    color*=.84+smoothstep(.015,.06,strata)*.16;
  }
  if(vSurface<.5) {
    color=mix(vec3(.19,.23,.13),vec3(.49,.48,.28),.5+.5*sin(vWorld.y*90.0+sin(vWorld.x*4.0)*.7+sin(vWorld.z*3.0)));
    color*=.65+.35*diffuse;
    float thin=step(.94,fract(vWorld.y*22.+sin(vWorld.x*2.)*.15));
    color+=thin*.07;
  } else {
    float line=abs(fract(vElevation*14.0)-.5);
    float contour=1.0-smoothstep(.014,.054,line);
    color*=diffuse*(1.0-contour*.23);
    float grain=hash(floor(vWorld.xz*240.));
    color+=(grain-.5)*.038;
    float rim=pow(1.0-abs(dot(normal,normalize(vec3(0.,.6,1.)))),3.0);
    color+=rim*.045;
  }
  gl_FragColor=vec4(color,1.);
}`;
  function makeShader(type, source) {
    const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  function multiply(a,b) {
    const out=new Float32Array(16);
    for(let col=0;col<4;col++) for(let row=0;row<4;row++) out[col*4+row]=a[row]*b[col*4]+a[4+row]*b[col*4+1]+a[8+row]*b[col*4+2]+a[12+row]*b[col*4+3];
    return out;
  }
  function perspective(fov,aspect,near,far) { const f=1/Math.tan(fov/2), nf=1/(near-far); return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]); }
  function lookAt(eye,target) {
    let zx=eye[0]-target[0],zy=eye[1]-target[1],zz=eye[2]-target[2], len=Math.hypot(zx,zy,zz); zx/=len;zy/=len;zz/=len;
    let xx=zz,xz=-zx;len=Math.hypot(xx,xz);xx/=len;xz/=len;
    const yx=zy*xz,yy=zz*xx-zx*xz,yz=-zy*xx;
    return new Float32Array([xx,yx,zx,0,0,yy,zy,0,xz,yz,zz,0,-xx*eye[0]-xz*eye[2],-yx*eye[0]-yy*eye[1]-yz*eye[2],-zx*eye[0]-zy*eye[1]-zz*eye[2],1]);
  }
  function makeMesh() {
    const positions=[],normals=[],indices=[],n=128,size=4.2;
    for(let z=0;z<=n;z++) for(let x=0;x<=n;x++) { positions.push((x/n-.5)*size,1,(z/n-.5)*size); normals.push(0,1,0); }
    for(let z=0;z<n;z++) for(let x=0;x<n;x++) { const i=z*(n+1)+x;indices.push(i,i+n+1,i+1,i+1,i+n+1,i+n+2); }
    const surfaceCount=indices.length;
    for(let edge=0;edge<4;edge++) for(let i=0;i<n;i++) {
      const k=positions.length/3, a=(i/n-.5)*size,b=((i+1)/n-.5)*size;
      let p1,p2,normal;
      if(edge===0){p1=[a,-size/2];p2=[b,-size/2];normal=[0,0,-1];}
      if(edge===1){p1=[size/2,a];p2=[size/2,b];normal=[1,0,0];}
      if(edge===2){p1=[b,size/2];p2=[a,size/2];normal=[0,0,1];}
      if(edge===3){p1=[-size/2,b];p2=[-size/2,a];normal=[-1,0,0];}
      positions.push(p1[0],0,p1[1],p2[0],0,p2[1],p1[0],1,p1[1],p2[0],1,p2[1]);
      for(let j=0;j<4;j++)normals.push(...normal);
      indices.push(k,k+1,k+2,k+2,k+1,k+3);
    }
    return {positions:new Float32Array(positions),normals:new Float32Array(normals),indices:new Uint16Array(indices),surfaceCount};
  }
  let program = null;
  if(gl) {
    try {
      program=gl.createProgram();gl.attachShader(program,makeShader(gl.VERTEX_SHADER,vertexSource));gl.attachShader(program,makeShader(gl.FRAGMENT_SHADER,fragmentSource));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      const mesh=makeMesh(),positionBuffer=gl.createBuffer(),normalBuffer=gl.createBuffer(),indexBuffer=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);
      const aPosition=gl.getAttribLocation(program,'aPosition'),aNormal=gl.getAttribLocation(program,'aNormal'),u={};
      ['Projection','View','Model','Seed','OldSeed','Biome','OldBiome','Morph','Spread','Layer','Time'].forEach(key=>{u[key]=gl.getUniformLocation(program,'u'+key);});
      gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
      renderScene=()=>{
        gl.viewport(0,0,width,height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);gl.enableVertexAttribArray(aPosition);gl.vertexAttribPointer(aPosition,3,gl.FLOAT,false,0,0);
        gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer);gl.enableVertexAttribArray(aNormal);gl.vertexAttribPointer(aNormal,3,gl.FLOAT,false,0,0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
        const aspect=width/height, mobile=window.innerWidth<=760;
        const distance=(mobile?8.9:8.2)/state.zoom;
        const view=lookAt([0,Math.sin(state.pitch)*distance,Math.cos(state.pitch)*distance],[0,.04,0]);
        const c=Math.cos(state.yaw),s=Math.sin(state.yaw),floatY=state.paused?0:Math.sin(elapsed*.6)*.025;
        const model=new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,floatY,0,1]);
        gl.uniformMatrix4fv(u.Projection,false,perspective(.55,aspect,.1,60));gl.uniformMatrix4fv(u.View,false,view);gl.uniformMatrix4fv(u.Model,false,model);
        gl.uniform1f(u.Seed,state.seed);gl.uniform1f(u.OldSeed,state.oldSeed);gl.uniform1f(u.Biome,state.biome);gl.uniform1f(u.OldBiome,state.oldBiome);gl.uniform1f(u.Morph,state.morph);gl.uniform1f(u.Spread,state.spread);gl.uniform1f(u.Time,elapsed);
        for(let layer=2;layer>=0;layer--){gl.uniform1f(u.Layer,layer);gl.drawElements(gl.TRIANGLES,mesh.indices.length,gl.UNSIGNED_SHORT,0);}
      };
    } catch(error) {
      console.warn('WorldLayer: using the static landscape fallback.',error.message);
      const fallback=document.createElement('canvas');fallback.id=canvas.id;fallback.className=canvas.className;fallback.setAttribute('role','img');fallback.setAttribute('aria-label','A static fallback illustration of an imaginary floating terrain. The world controls remain available.');canvas.replaceWith(fallback);canvas=fallback;
      const ctx=fallback.getContext('2d');
      renderScene=()=>drawFallback(ctx,fallback);
    }
  } else {
    const ctx=canvas.getContext('2d');renderScene=()=>drawFallback(ctx,canvas);
  }
  function fallbackHeight(x,z) {
    const p=(state.seed%997)/97;
    const edge=Math.max(0,1-Math.max(Math.abs(x),Math.abs(z))/2.2);
    if(state.biome===1)return .1+edge*(.3+.25*Math.sin(x*4+z*1.3+p));
    if(state.biome===2)return .15+edge*(.2+.15*Math.sin(x*6+p)*Math.cos(z*5));
    return .1+edge*(.3+Math.abs(Math.sin(x*1.6+p)*Math.cos(z*1.7+p))*.95);
  }
  function drawFallback(ctx,target) {
    if(!ctx)return;target.width=width;target.height=height;ctx.clearRect(0,0,width,height);
    const scale=Math.min(width*.15,height*.26),cy=height*.53;
    const c=Math.cos(state.yaw),s=Math.sin(state.yaw);
    const project=(x,y,z)=>{const rx=x*c+z*s,rz=-x*s+z*c;return [width*.5+rx*scale,cy+rz*scale*.5-y*scale];};
    for(let layer=2;layer>=0;layer--){
      const n=42;
      for(let z=0;z<n;z++)for(let x=0;x<n;x++){
        const px=(x/n-.5)*4.2,pz=(z/n-.5)*4.2,step=4.2/n,base=-.16-layer*.22-state.spread*layer*.43;
        const h=(a,b)=>layer?base:fallbackHeight(a,b)+state.spread*.35;
        const pts=[[px,pz],[px+step,pz],[px+step,pz+step],[px,pz+step]].map(p=>project(p[0],h(...p),p[1]));
        const height=h(px,pz),light=clamp(.35+height*.45,.3,.87);
        const hue=state.biome===1?31:state.biome===2?70:78,saturation=state.biome===2?8:34;
        ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=`hsl(${hue} ${saturation}% ${layer?25-layer*4:light*76}%)`;ctx.fill();ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=1;ctx.stroke();
      }
    }
    document.querySelector('#scene-hint').textContent='STATIC LANDSCAPE · WEBGL UNAVAILABLE';
  }
  function frame(now) {
    frameId=0;if(disposed||!visible||document.hidden)return;
    resize();const dt=Math.min((now-(lastTime||now))/1000,.05);lastTime=now;
    if(!state.paused)elapsed+=dt;
    const speed=reducedMotion.matches?1:Math.min(1,dt*8);
    state.yaw+=(state.targetYaw-state.yaw)*speed;state.pitch+=(state.targetPitch-state.pitch)*speed;state.zoom+=(state.targetZoom-state.zoom)*speed;state.spread+=(state.targetSpread-state.spread)*speed;
    state.morph=reducedMotion.matches?1:Math.min(1,state.morph+dt*.62);
    if(!state.paused&&!state.dragging)state.targetYaw+=dt*.026;
    if(renderScene)renderScene();
    const active=!state.paused||state.morph<1||Math.abs(state.yaw-state.targetYaw)>.001||Math.abs(state.pitch-state.targetPitch)>.001||Math.abs(state.zoom-state.targetZoom)>.001||Math.abs(state.spread-state.targetSpread)>.001;
    if(active)requestFrame();
  }
  let pointer=null;
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||pointer)return;pointer={id:event.pointerId,x:event.clientX,y:event.clientY};state.dragging=true;canvas.setPointerCapture(event.pointerId);requestFrame();
  });
  canvas.addEventListener('pointermove',event=>{
    if(!pointer||pointer.id!==event.pointerId)return;
    rotate((event.clientX-pointer.x)*.008,(event.clientY-pointer.y)*.004);pointer.x=event.clientX;pointer.y=event.clientY;
  });
  const endPointer=()=>{pointer=null;state.dragging=false;};canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('lostpointercapture',endPointer);
  canvas.addEventListener('wheel',event=>{event.preventDefault();state.targetZoom=clamp(state.targetZoom-event.deltaY*.00065,.72,1.42);requestFrame();},{passive:false});
  canvas.addEventListener('keydown',event=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();rotate(event.key==='ArrowLeft'?-.18:event.key==='ArrowRight'?.18:0,event.key==='ArrowUp'?-.1:event.key==='ArrowDown'?.1:0);}
    if(event.key==='Home'){event.preventDefault();window.WorldAtlas.reset();}
  });
  window.addEventListener('resize',requestFrame);
  window.addEventListener('blur',endPointer);
  document.addEventListener('visibilitychange',()=>{lastTime=0;if(document.hidden)endPointer();else requestFrame();});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){lastTime=0;requestFrame();}},{threshold:0}).observe(canvas);
  reducedMotion.addEventListener('change',event=>{state.paused=event.matches;state.morph=1;announce();requestFrame();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();state.paused=true;document.querySelector('#scene-hint').textContent='GRAPHICS PAUSED · RELOAD TO RESTORE';announce();});
  canvas.addEventListener('webglcontextrestored',()=>window.location.reload());
  window.WorldAtlas = Object.freeze({
    getState:()=>({...state,...announce()}),
    regenerate(){state.oldSeed=state.seed;state.oldBiome=state.biome;state.seed=100000+Math.floor(Math.random()*899999);state.morph=reducedMotion.matches?1:0;announce();requestFrame();},
    setBiome(index){index=clamp(Math.round(Number(index)||0),0,2);if(index===state.biome)return;state.oldBiome=state.biome;state.oldSeed=state.seed;state.biome=index;state.morph=reducedMotion.matches?1:0;announce();requestFrame();},
    setLayers(value){state.targetSpread=clamp(Number(value)||0,0,1);requestFrame();},
    toggleMotion(){state.paused=!state.paused;lastTime=0;announce();requestFrame();return state.paused;},
    reset(){state.targetYaw=-.64;state.targetPitch=.68;state.targetZoom=1;requestFrame();},
    async capture(){
      resize();if(renderScene)renderScene();
      const output=document.createElement('canvas');output.width=1600;output.height=1200;const ctx=output.getContext('2d');
      ctx.fillStyle='#131c17';ctx.fillRect(0,0,1600,1200);
      const source=document.querySelector('#scene');const ratio=Math.min(1470/source.width,900/source.height);
      ctx.drawImage(source,(1600-source.width*ratio)/2,90+(900-source.height*ratio)/2,source.width*ratio,source.height*ratio);
      ctx.fillStyle='#d4ee82';ctx.font='500 55px Space, Arial, sans-serif';ctx.fillText('worldlayer.si',75,90);
      ctx.fillStyle='#e9eedc';ctx.font='400 37px Space, Arial, sans-serif';ctx.fillText(names[state.biome][state.seed%8],75,1080);
      ctx.fillStyle='#929c87';ctx.font='18px Plex, monospace';ctx.fillText(`SEED ${state.seed} / ${['ALPINE','DUNE','LUNAR'][state.biome]}`,75,1125);ctx.textAlign='right';ctx.fillText('AN ATLAS OF PLACES THAT DON’T EXIST.',1525,1125);
      return new Promise(resolve=>output.toBlob(blob=>{if(!blob){resolve(false);return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`worldlayer-${state.seed}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);resolve(true);},'image/png'));
    }
  });
  requestFrame();
})();
