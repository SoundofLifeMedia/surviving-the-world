// Surviving The World™ - 3D Game Demo
// Controls: WASD + Mouse / Gamepad

let scene, camera, renderer, player, clock;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false, isSprinting = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let prevTime = performance.now();
let health = 100, stamina = 100;
let enemies = [], buildings = [], trees = [];
let gamepad = null;
let isPointerLocked = false;

// Player settings
const WALK_SPEED = 100;
const SPRINT_SPEED = 200;
const JUMP_FORCE = 350;
const PLAYER_HEIGHT = 10;

// Initialize game
function init() {
  updateLoadStatus('Creating world...');
  
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 100, 1000);
  
  // Camera (third person)
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
  
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game-container').appendChild(renderer.domElement);
  
  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);
  
  const sunLight = new THREE.DirectionalLight(0xffffff, 1);
  sunLight.position.set(100, 200, 100);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  scene.add(sunLight);
  
  clock = new THREE.Clock();

  
  updateLoadStatus('Building terrain...');
  createTerrain();
  
  updateLoadStatus('Creating player...');
  createPlayer();
  
  updateLoadStatus('Spawning world objects...');
  createBuildings();
  createTrees();
  createRoads();
  createNPCs();
  
  updateLoadStatus('Setting up controls...');
  setupControls();
  setupGamepad();
  
  // Hide loading screen
  setTimeout(() => {
    document.getElementById('loading').style.display = 'none';
  }, 1000);
  
  // Start game loop
  animate();
}

function updateLoadStatus(text) {
  document.getElementById('load-status').textContent = text;
}

function createTerrain() {
  // Ground
  const groundGeo = new THREE.PlaneGeometry(2000, 2000, 100, 100);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x3d8b3d });
  
  // Add some height variation
  const vertices = groundGeo.attributes.position.array;
  for (let i = 0; i < vertices.length; i += 3) {
    vertices[i + 2] = Math.random() * 2 - 1; // Small height variation
  }
  groundGeo.computeVertexNormals();
  
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  
  // Water (ocean in distance)
  const waterGeo = new THREE.PlaneGeometry(5000, 5000);
  const waterMat = new THREE.MeshLambertMaterial({ color: 0x0077be, transparent: true, opacity: 0.8 });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -5;
  scene.add(water);
}

function createPlayer() {
  // Player body (capsule shape)
  const bodyGeo = new THREE.CapsuleGeometry(2, 6, 8, 16);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
  player = new THREE.Mesh(bodyGeo, bodyMat);
  player.position.set(0, PLAYER_HEIGHT, 0);
  player.castShadow = true;
  scene.add(player);
  
  // Player head
  const headGeo = new THREE.SphereGeometry(1.5, 16, 16);
  const headMat = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 5;
  player.add(head);
  
  // Camera follows player
  camera.position.set(0, 20, 30);
  camera.lookAt(player.position);
}


function createBuildings() {
  const buildingColors = [0x808080, 0x606060, 0x707070, 0x505050, 0xb8860b];
  
  for (let i = 0; i < 30; i++) {
    const width = 15 + Math.random() * 20;
    const height = 20 + Math.random() * 60;
    const depth = 15 + Math.random() * 20;
    
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshLambertMaterial({ 
      color: buildingColors[Math.floor(Math.random() * buildingColors.length)] 
    });
    const building = new THREE.Mesh(geo, mat);
    
    // Position buildings in a city-like grid
    const gridX = (Math.floor(i / 6) - 2.5) * 80;
    const gridZ = ((i % 6) - 2.5) * 80;
    building.position.set(
      gridX + (Math.random() - 0.5) * 20,
      height / 2,
      gridZ + (Math.random() - 0.5) * 20 - 200
    );
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
    buildings.push(building);
    
    // Add windows
    addWindows(building, width, height, depth);
  }
}

function addWindows(building, w, h, d) {
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
  const windowSize = 2;
  
  for (let y = 5; y < h - 5; y += 8) {
    for (let x = -w/2 + 3; x < w/2 - 3; x += 6) {
      const windowGeo = new THREE.PlaneGeometry(windowSize, windowSize * 1.5);
      const win = new THREE.Mesh(windowGeo, windowMat);
      win.position.set(x, y - h/2, d/2 + 0.1);
      building.add(win);
    }
  }
}

function createTrees() {
  for (let i = 0; i < 100; i++) {
    const tree = createTree();
    tree.position.set(
      (Math.random() - 0.5) * 800,
      0,
      (Math.random() - 0.5) * 800
    );
    // Don't place trees on roads or buildings
    if (Math.abs(tree.position.x) > 30 || Math.abs(tree.position.z) > 30) {
      scene.add(tree);
      trees.push(tree);
    }
  }
}

function createTree() {
  const tree = new THREE.Group();
  
  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(1, 1.5, 10, 8);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 5;
  trunk.castShadow = true;
  tree.add(trunk);
  
  // Leaves
  const leavesGeo = new THREE.ConeGeometry(8, 15, 8);
  const leavesMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });
  const leaves = new THREE.Mesh(leavesGeo, leavesMat);
  leaves.position.y = 15;
  leaves.castShadow = true;
  tree.add(leaves);
  
  return tree;
}


function createRoads() {
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  
  // Main road X
  const roadX = new THREE.Mesh(new THREE.PlaneGeometry(2000, 20), roadMat);
  roadX.rotation.x = -Math.PI / 2;
  roadX.position.y = 0.1;
  scene.add(roadX);
  
  // Main road Z
  const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(20, 2000), roadMat);
  roadZ.rotation.x = -Math.PI / 2;
  roadZ.position.y = 0.1;
  scene.add(roadZ);
  
  // Road markings
  const markingMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  for (let i = -500; i < 500; i += 20) {
    const marking = new THREE.Mesh(new THREE.PlaneGeometry(8, 1), markingMat);
    marking.rotation.x = -Math.PI / 2;
    marking.position.set(i, 0.2, 0);
    scene.add(marking);
  }
}

function createNPCs() {
  // Create some NPCs walking around
  for (let i = 0; i < 15; i++) {
    const npc = createNPC();
    npc.position.set(
      (Math.random() - 0.5) * 300,
      PLAYER_HEIGHT,
      (Math.random() - 0.5) * 300
    );
    npc.userData = { 
      velocity: new THREE.Vector3((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20),
      isEnemy: Math.random() > 0.7
    };
    scene.add(npc);
    enemies.push(npc);
  }
}

function createNPC() {
  const npc = new THREE.Group();
  
  // Body
  const bodyGeo = new THREE.CapsuleGeometry(1.5, 5, 8, 16);
  const isEnemy = Math.random() > 0.7;
  const bodyMat = new THREE.MeshLambertMaterial({ color: isEnemy ? 0xff4444 : 0x4444ff });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  npc.add(body);
  
  // Head
  const headGeo = new THREE.SphereGeometry(1.2, 16, 16);
  const headMat = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 4;
  npc.add(head);
  
  return npc;
}

function setupControls() {
  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    switch(e.code) {
      case 'KeyW': case 'ArrowUp': moveForward = true; break;
      case 'KeyS': case 'ArrowDown': moveBackward = true; break;
      case 'KeyA': case 'ArrowLeft': moveLeft = true; break;
      case 'KeyD': case 'ArrowRight': moveRight = true; break;
      case 'Space': if (canJump) { velocity.y = JUMP_FORCE; canJump = false; } break;
      case 'ShiftLeft': case 'ShiftRight': isSprinting = true; break;
    }
  });
  
  document.addEventListener('keyup', (e) => {
    switch(e.code) {
      case 'KeyW': case 'ArrowUp': moveForward = false; break;
      case 'KeyS': case 'ArrowDown': moveBackward = false; break;
      case 'KeyA': case 'ArrowLeft': moveLeft = false; break;
      case 'KeyD': case 'ArrowRight': moveRight = false; break;
      case 'ShiftLeft': case 'ShiftRight': isSprinting = false; break;
    }
  });
  
  // Mouse look
  document.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
  });
  
  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === renderer.domElement;
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isPointerLocked) return;
    player.rotation.y -= e.movementX * 0.002;
  });
  
  // Window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}


function setupGamepad() {
  window.addEventListener('gamepadconnected', (e) => {
    console.log('Gamepad connected:', e.gamepad.id);
    gamepad = e.gamepad;
  });
  
  window.addEventListener('gamepaddisconnected', () => {
    gamepad = null;
  });
}

function handleGamepad() {
  const gamepads = navigator.getGamepads();
  if (!gamepads[0]) return;
  
  const gp = gamepads[0];
  const deadzone = 0.15;
  
  // Left stick - movement
  const lx = Math.abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0;
  const ly = Math.abs(gp.axes[1]) > deadzone ? gp.axes[1] : 0;
  
  moveLeft = lx < -deadzone;
  moveRight = lx > deadzone;
  moveForward = ly < -deadzone;
  moveBackward = ly > deadzone;
  
  // Right stick - camera
  const rx = Math.abs(gp.axes[2]) > deadzone ? gp.axes[2] : 0;
  player.rotation.y -= rx * 0.05;
  
  // Buttons
  // A (0) - Jump
  if (gp.buttons[0].pressed && canJump) {
    velocity.y = JUMP_FORCE;
    canJump = false;
  }
  
  // L3 (10) or LB (4) - Sprint
  isSprinting = gp.buttons[10]?.pressed || gp.buttons[4]?.pressed;
}

function updatePlayer(delta) {
  // Apply gravity
  velocity.y -= 980 * delta;
  
  // Ground collision
  if (player.position.y <= PLAYER_HEIGHT) {
    velocity.y = 0;
    player.position.y = PLAYER_HEIGHT;
    canJump = true;
  }
  
  // Movement
  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize();
  
  const speed = isSprinting ? SPRINT_SPEED : WALK_SPEED;
  
  if (moveForward || moveBackward) {
    velocity.z = direction.z * speed;
  } else {
    velocity.z *= 0.9;
  }
  
  if (moveLeft || moveRight) {
    velocity.x = direction.x * speed;
  } else {
    velocity.x *= 0.9;
  }
  
  // Apply movement in player's facing direction
  const moveX = velocity.x * delta;
  const moveZ = velocity.z * delta;
  
  player.position.x += moveX * Math.cos(player.rotation.y) - moveZ * Math.sin(player.rotation.y);
  player.position.z += moveX * Math.sin(player.rotation.y) + moveZ * Math.cos(player.rotation.y);
  player.position.y += velocity.y * delta;
  
  // Stamina management
  if (isSprinting && (moveForward || moveBackward || moveLeft || moveRight)) {
    stamina = Math.max(0, stamina - 20 * delta);
    if (stamina <= 0) isSprinting = false;
  } else {
    stamina = Math.min(100, stamina + 10 * delta);
  }
  
  // Update camera to follow player (third person)
  const cameraOffset = new THREE.Vector3(0, 15, 25);
  cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
  camera.position.lerp(player.position.clone().add(cameraOffset), 0.1);
  camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 5, 0)));
}


function updateNPCs(delta) {
  enemies.forEach(npc => {
    if (!npc.userData.velocity) return;
    
    // Move NPC
    npc.position.x += npc.userData.velocity.x * delta;
    npc.position.z += npc.userData.velocity.z * delta;
    
    // Bounce off boundaries
    if (Math.abs(npc.position.x) > 400) npc.userData.velocity.x *= -1;
    if (Math.abs(npc.position.z) > 400) npc.userData.velocity.z *= -1;
    
    // Face movement direction
    npc.rotation.y = Math.atan2(npc.userData.velocity.x, npc.userData.velocity.z);
    
    // Enemy behavior - chase player if close
    if (npc.userData.isEnemy) {
      const dist = npc.position.distanceTo(player.position);
      if (dist < 100 && dist > 10) {
        const dir = player.position.clone().sub(npc.position).normalize();
        npc.userData.velocity.x = dir.x * 30;
        npc.userData.velocity.z = dir.z * 30;
      }
      
      // Damage player if very close
      if (dist < 5) {
        health = Math.max(0, health - 10 * delta);
      }
    }
  });
}

function updateHUD() {
  document.getElementById('health-bar').style.width = health + '%';
  document.getElementById('stamina-bar').style.width = stamina + '%';
  document.getElementById('pos').textContent = 
    `${player.position.x.toFixed(0)}, ${player.position.z.toFixed(0)}`;
}

function updateMinimap() {
  const canvas = document.getElementById('minimap-canvas');
  const ctx = canvas.getContext('2d');
  const size = 150;
  const scale = 0.15;
  
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, size, size);
  
  // Draw buildings
  ctx.fillStyle = '#666';
  buildings.forEach(b => {
    const x = size/2 + (b.position.x - player.position.x) * scale;
    const y = size/2 + (b.position.z - player.position.z) * scale;
    if (x > 0 && x < size && y > 0 && y < size) {
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }
  });
  
  // Draw NPCs
  enemies.forEach(e => {
    const x = size/2 + (e.position.x - player.position.x) * scale;
    const y = size/2 + (e.position.z - player.position.z) * scale;
    if (x > 0 && x < size && y > 0 && y < size) {
      ctx.fillStyle = e.userData.isEnemy ? '#ff4444' : '#4444ff';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  
  // Draw player (center, with direction indicator)
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(size/2, size/2, 5, 0, Math.PI * 2);
  ctx.fill();
  
  // Direction indicator
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size/2, size/2);
  ctx.lineTo(
    size/2 - Math.sin(player.rotation.y) * 10,
    size/2 - Math.cos(player.rotation.y) * 10
  );
  ctx.stroke();
}

let frameCount = 0;
let lastFpsUpdate = 0;

function animate() {
  requestAnimationFrame(animate);
  
  const time = performance.now();
  const delta = (time - prevTime) / 1000;
  prevTime = time;
  
  // FPS counter
  frameCount++;
  if (time - lastFpsUpdate > 1000) {
    document.getElementById('fps').textContent = frameCount;
    frameCount = 0;
    lastFpsUpdate = time;
  }
  
  // Handle gamepad input
  handleGamepad();
  
  // Update game
  updatePlayer(delta);
  updateNPCs(delta);
  updateHUD();
  updateMinimap();
  
  // Render
  renderer.render(scene, camera);
}

// Start the game
init();
