import*as THREE from'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

let scene,camera,renderer,player,clock;
let keys={w:0,a:0,s:0,d:0,shift:0,space:0};
let vel=new THREE.Vector3(),onGround=1;
let yaw=0,pitch=0,hp=100,stamina=100;
let npcs=[],buildings=[];

function init(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x87CEEB);
  scene.fog=new THREE.Fog(0x87CEEB,200,800);
  
  camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,1,1000);
  
  renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;
  
  // Lights
  scene.add(new THREE.AmbientLight(0xffffff,0.6));
  const sun=new THREE.DirectionalLight(0xffffff,0.8);
  sun.position.set(50,100,50);
  sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  scene.add(sun);
  
  // Ground
  const ground=new THREE.Mesh(
    new THREE.PlaneGeometry(1000,1000),
    new THREE.MeshLambertMaterial({color:0x3d8b40})
  );
  ground.rotation.x=-Math.PI/2;
  ground.receiveShadow=true;
  scene.add(ground);
  
  // Roads
  const roadMat=new THREE.MeshLambertMaterial({color:0x333333});
  const road1=new THREE.Mesh(new THREE.PlaneGeometry(1000,15),roadMat);
  road1.rotation.x=-Math.PI/2;road1.position.y=0.1;scene.add(road1);
  const road2=new THREE.Mesh(new THREE.PlaneGeometry(15,1000),roadMat);
  road2.rotation.x=-Math.PI/2;road2.position.y=0.1;scene.add(road2);

  
  // Player
  player=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.4,1.2,4,8),new THREE.MeshLambertMaterial({color:0x2c3e50}));
  body.castShadow=true;
  player.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,8),new THREE.MeshLambertMaterial({color:0xf5cba7}));
  head.position.y=1;head.castShadow=true;
  player.add(head);
  player.position.set(0,1,0);
  scene.add(player);
  
  // Buildings
  for(let i=0;i<20;i++){
    const w=8+Math.random()*12,h=15+Math.random()*40,d=8+Math.random()*12;
    const b=new THREE.Mesh(
      new THREE.BoxGeometry(w,h,d),
      new THREE.MeshLambertMaterial({color:0x555555+Math.random()*0x333333|0})
    );
    const x=(Math.random()-.5)*400,z=(Math.random()-.5)*400;
    if(Math.abs(x)>20||Math.abs(z)>20){
      b.position.set(x,h/2,z);
      b.castShadow=true;b.receiveShadow=true;
      scene.add(b);
      buildings.push(b);
    }
  }
  
  // Trees
  for(let i=0;i<50;i++){
    const t=new THREE.Group();
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.3,.4,4,6),new THREE.MeshLambertMaterial({color:0x8B4513}));
    trunk.position.y=2;t.add(trunk);
    const leaves=new THREE.Mesh(new THREE.ConeGeometry(2.5,6,6),new THREE.MeshLambertMaterial({color:0x228B22}));
    leaves.position.y=6;t.add(leaves);
    const x=(Math.random()-.5)*500,z=(Math.random()-.5)*500;
    if(Math.abs(x)>15&&Math.abs(z)>15){t.position.set(x,0,z);scene.add(t);}
  }
  
  // NPCs
  for(let i=0;i<10;i++){
    const npc=new THREE.Group();
    const nb=new THREE.Mesh(new THREE.CapsuleGeometry(.35,1,4,8),new THREE.MeshLambertMaterial({color:i<3?0xe74c3c:0x3498db}));
    npc.add(nb);
    const nh=new THREE.Mesh(new THREE.SphereGeometry(.25,8,8),new THREE.MeshLambertMaterial({color:0xf5cba7}));
    nh.position.y=.9;npc.add(nh);
    npc.position.set((Math.random()-.5)*200,1,(Math.random()-.5)*200);
    npc.userData={vx:(Math.random()-.5)*2,vz:(Math.random()-.5)*2,enemy:i<3};
    scene.add(npc);
    npcs.push(npc);
  }
  
  clock=new THREE.Clock();
  setupControls();
  animate();
}


function setupControls(){
  document.addEventListener('keydown',e=>{
    if(e.code=='KeyW')keys.w=1;
    if(e.code=='KeyS')keys.s=1;
    if(e.code=='KeyA')keys.a=1;
    if(e.code=='KeyD')keys.d=1;
    if(e.code=='ShiftLeft')keys.shift=1;
    if(e.code=='Space'&&onGround){vel.y=8;onGround=0;}
  });
  document.addEventListener('keyup',e=>{
    if(e.code=='KeyW')keys.w=0;
    if(e.code=='KeyS')keys.s=0;
    if(e.code=='KeyA')keys.a=0;
    if(e.code=='KeyD')keys.d=0;
    if(e.code=='ShiftLeft')keys.shift=0;
  });
  document.addEventListener('mousemove',e=>{
    if(document.pointerLockElement){
      yaw-=e.movementX*.002;
      pitch-=e.movementY*.002;
      pitch=Math.max(-1.2,Math.min(1.2,pitch));
    }
  });
  document.getElementById('c').addEventListener('click',()=>document.getElementById('c').requestPointerLock());
  window.addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  });
}

let lastTime=0,frames=0,fps=0;
function animate(time){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.1);
  
  // FPS
  frames++;
  if(time-lastTime>1000){fps=frames;frames=0;lastTime=time;document.getElementById('fps').textContent=fps;}
  
  // Player movement
  const speed=keys.shift&&stamina>0?12:6;
  const dir=new THREE.Vector3(keys.d-keys.a,0,keys.s-keys.w).normalize();
  
  if(dir.length()>0){
    dir.applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
    vel.x=dir.x*speed;
    vel.z=dir.z*speed;
    if(keys.shift&&stamina>0)stamina=Math.max(0,stamina-30*dt);
  }else{
    vel.x*=.9;vel.z*=.9;
  }
  
  if(!keys.shift)stamina=Math.min(100,stamina+15*dt);
  
  // Gravity
  vel.y-=20*dt;
  player.position.add(vel.clone().multiplyScalar(dt));
  
  // Ground
  if(player.position.y<1){player.position.y=1;vel.y=0;onGround=1;}
  
  // Bounds
  player.position.x=Math.max(-450,Math.min(450,player.position.x));
  player.position.z=Math.max(-450,Math.min(450,player.position.z));
  
  player.rotation.y=yaw;

  
  // Camera follow (third person)
  const camDist=8,camHeight=4;
  const camTarget=new THREE.Vector3(
    player.position.x-Math.sin(yaw)*camDist,
    player.position.y+camHeight,
    player.position.z-Math.cos(yaw)*camDist
  );
  camera.position.lerp(camTarget,.1);
  camera.lookAt(player.position.x,player.position.y+1.5,player.position.z);
  
  // NPCs
  npcs.forEach(n=>{
    n.position.x+=n.userData.vx*dt;
    n.position.z+=n.userData.vz*dt;
    if(Math.abs(n.position.x)>200)n.userData.vx*=-1;
    if(Math.abs(n.position.z)>200)n.userData.vz*=-1;
    n.rotation.y=Math.atan2(n.userData.vx,n.userData.vz);
    
    // Enemy chase
    if(n.userData.enemy){
      const dist=n.position.distanceTo(player.position);
      if(dist<50&&dist>2){
        const chase=player.position.clone().sub(n.position).normalize().multiplyScalar(3);
        n.userData.vx=chase.x;n.userData.vz=chase.z;
      }
      if(dist<2)hp=Math.max(0,hp-20*dt);
    }
  });
  
  // UI
  document.getElementById('hp').style.width=hp+'%';
  document.getElementById('sp').style.width=stamina+'%';
  document.getElementById('pos').textContent=player.position.x.toFixed(0)+','+player.position.z.toFixed(0);
  
  // Minimap
  const ctx=document.getElementById('mini').getContext('2d');
  ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,120,120);
  ctx.fillStyle='#ffd700';ctx.beginPath();ctx.arc(60,60,4,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#ffd700';ctx.lineWidth=2;ctx.beginPath();
  ctx.moveTo(60,60);ctx.lineTo(60-Math.sin(yaw)*12,60-Math.cos(yaw)*12);ctx.stroke();
  npcs.forEach(n=>{
    const nx=60+(n.position.x-player.position.x)*.2;
    const nz=60+(n.position.z-player.position.z)*.2;
    if(nx>5&&nx<115&&nz>5&&nz<115){
      ctx.fillStyle=n.userData.enemy?'#e74c3c':'#3498db';
      ctx.beginPath();ctx.arc(nx,nz,3,0,Math.PI*2);ctx.fill();
    }
  });
  buildings.forEach(b=>{
    const bx=60+(b.position.x-player.position.x)*.2;
    const bz=60+(b.position.z-player.position.z)*.2;
    if(bx>0&&bx<120&&bz>0&&bz<120){
      ctx.fillStyle='#555';ctx.fillRect(bx-2,bz-2,4,4);
    }
  });
  
  renderer.render(scene,camera);
}

window.startGame=()=>{
  document.getElementById('start').style.display='none';
  init();
};
