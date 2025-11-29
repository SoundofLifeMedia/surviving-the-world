// Surviving The World - Fast & Smooth
const W=window,D=document,PI=Math.PI;
let S,C,R,P,clock,yaw=0,hp=100,stam=100;
let keys={},npcs=[],blds=[];
const CHARS=[
  {color:0xe74c3c,hp:120,speed:5},
  {color:0x27ae60,hp:80,speed:8},
  {color:0x9b59b6,hp:70,speed:6},
  {color:0x2c3e50,hp:90,speed:9},
  {color:0x3498db,hp:150,speed:4}
];
let cfg;

W.play=function(i){
  cfg=CHARS[i];hp=cfg.hp;
  D.getElementById('menu').style.display='none';
  D.getElementById('game').style.display='block';
  init();
};

function init(){
  S=new THREE.Scene();
  S.background=new THREE.Color(0x6eb5ff);
  S.fog=new THREE.Fog(0x6eb5ff,100,500);
  
  C=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,1,600);
  R=new THREE.WebGLRenderer({canvas:D.getElementById('c'),antialias:false});
  R.setSize(innerWidth,innerHeight);
  R.setPixelRatio(Math.min(devicePixelRatio,2));
  
  S.add(new THREE.AmbientLight(0xffffff,0.7));
  const sun=new THREE.DirectionalLight(0xffffff,0.6);
  sun.position.set(50,80,30);
  S.add(sun);
  
  // Ground
  S.add(new THREE.Mesh(new THREE.PlaneGeometry(600,600),new THREE.MeshLambertMaterial({color:0x4a7c3f})).rotateX(-PI/2));
  
  // Roads
  const rm=new THREE.MeshBasicMaterial({color:0x333});
  let r1=new THREE.Mesh(new THREE.PlaneGeometry(600,12),rm);r1.rotation.x=-PI/2;r1.position.y=.1;S.add(r1);
  let r2=new THREE.Mesh(new THREE.PlaneGeometry(12,600),rm);r2.rotation.x=-PI/2;r2.position.y=.1;S.add(r2);

  
  // Player
  P=new THREE.Mesh(new THREE.CapsuleGeometry(.4,1.2,4,8),new THREE.MeshLambertMaterial({color:cfg.color}));
  P.position.y=1;S.add(P);
  
  // Buildings (simple)
  for(let i=0;i<15;i++){
    const w=10+Math.random()*15,h=20+Math.random()*30;
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),new THREE.MeshLambertMaterial({color:0x555+Math.random()*0x333333|0}));
    const x=(Math.random()-.5)*400,z=(Math.random()-.5)*400;
    if(Math.abs(x)>20&&Math.abs(z)>20){b.position.set(x,h/2,z);S.add(b);blds.push(b);}
  }
  
  // Trees (simple cones)
  for(let i=0;i<30;i++){
    const t=new THREE.Mesh(new THREE.ConeGeometry(3,8,6),new THREE.MeshLambertMaterial({color:0x2d5a27}));
    const x=(Math.random()-.5)*400,z=(Math.random()-.5)*400;
    if(Math.abs(x)>15&&Math.abs(z)>15){t.position.set(x,4,z);S.add(t);}
  }
  
  // NPCs
  for(let i=0;i<8;i++){
    const n=new THREE.Mesh(new THREE.CapsuleGeometry(.35,1,4,6),new THREE.MeshLambertMaterial({color:i<2?0xff4444:0x4488ff}));
    n.position.set((Math.random()-.5)*150,1,(Math.random()-.5)*150);
    n.userData={vx:(Math.random()-.5)*3,vz:(Math.random()-.5)*3,bad:i<2};
    S.add(n);npcs.push(n);
  }
  
  clock=new THREE.Clock();
  
  // Controls
  D.addEventListener('keydown',e=>{keys[e.code]=1;});
  D.addEventListener('keyup',e=>{keys[e.code]=0;});
  D.addEventListener('mousemove',e=>{if(D.pointerLockElement)yaw-=e.movementX*.003;});
  D.getElementById('c').onclick=()=>D.getElementById('c').requestPointerLock();
  W.onresize=()=>{C.aspect=innerWidth/innerHeight;C.updateProjectionMatrix();R.setSize(innerWidth,innerHeight);};
  
  loop();
}


function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(clock.getDelta(),.05);
  
  // Movement
  let dx=0,dz=0;
  if(keys.KeyW)dz=-1;if(keys.KeyS)dz=1;
  if(keys.KeyA)dx=-1;if(keys.KeyD)dx=1;
  
  const run=keys.ShiftLeft&&stam>0;
  const spd=(run?cfg.speed*1.8:cfg.speed)*dt;
  
  if(dx||dz){
    const a=Math.atan2(dx,dz)+yaw;
    P.position.x+=Math.sin(a)*spd;
    P.position.z+=Math.cos(a)*spd;
    if(run)stam=Math.max(0,stam-25*dt);
  }
  if(!run)stam=Math.min(100,stam+15*dt);
  
  // Bounds
  P.position.x=Math.max(-280,Math.min(280,P.position.x));
  P.position.z=Math.max(-280,Math.min(280,P.position.z));
  P.rotation.y=yaw;
  
  // Camera
  C.position.set(P.position.x-Math.sin(yaw)*6,P.position.y+3,P.position.z-Math.cos(yaw)*6);
  C.lookAt(P.position.x,P.position.y+1,P.position.z);
  
  // NPCs
  npcs.forEach(n=>{
    n.position.x+=n.userData.vx*dt;
    n.position.z+=n.userData.vz*dt;
    if(Math.abs(n.position.x)>150)n.userData.vx*=-1;
    if(Math.abs(n.position.z)>150)n.userData.vz*=-1;
    if(n.userData.bad){
      const d=n.position.distanceTo(P.position);
      if(d<40&&d>2){
        const dir=P.position.clone().sub(n.position).normalize();
        n.userData.vx=dir.x*4;n.userData.vz=dir.z*4;
      }
      if(d<1.5)hp=Math.max(0,hp-30*dt);
    }
  });
  
  // HUD
  D.getElementById('hp').style.width=(hp/cfg.hp*100)+'%';
  D.getElementById('st').style.width=stam+'%';
  D.getElementById('info').textContent='Pos: '+P.position.x.toFixed(0)+','+P.position.z.toFixed(0);
  
  // Minimap
  const ctx=D.getElementById('mini').getContext('2d');
  ctx.fillStyle='#111';ctx.fillRect(0,0,100,100);
  ctx.fillStyle='#ffd700';ctx.beginPath();ctx.arc(50,50,4,0,PI*2);ctx.fill();
  ctx.strokeStyle='#ffd700';ctx.beginPath();ctx.moveTo(50,50);ctx.lineTo(50-Math.sin(yaw)*10,50-Math.cos(yaw)*10);ctx.stroke();
  npcs.forEach(n=>{
    const nx=50+(n.position.x-P.position.x)*.3,nz=50+(n.position.z-P.position.z)*.3;
    if(nx>0&&nx<100&&nz>0&&nz<100){ctx.fillStyle=n.userData.bad?'#f44':'#48f';ctx.beginPath();ctx.arc(nx,nz,2,0,PI*2);ctx.fill();}
  });
  
  R.render(S,C);
}
