import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { SCENE_CONFIG, CAMERA_LIMITS, PHYSICS } from '../constants';
import { HandGesture } from '../types';

interface ThreeSceneProps {
  gesture: HandGesture;
  uploadedTextures: string[];
}

interface ParticleData {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  // Which mesh group this particle belongs to
  meshIndex: number;
  // Index within that specific instance mesh
  instanceIndex: number;
}

const ThreeScene: React.FC<ThreeSceneProps> = ({ gesture, uploadedTextures }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  
  // Store multiple meshes (one per texture)
  const meshesRef = useRef<THREE.InstancedMesh[]>([]);
  // Store the container group for meshes to easy cleanup
  const meshGroupRef = useRef<THREE.Group | null>(null);

  // Physics State
  const stateRef = useRef({
    cameraZ: CAMERA_LIMITS.DEFAULT_Z,
    velocityZ: 0,
    scatterAmount: 0,
    flowAmount: 0, // Track intensity of the flowing effect
    scaleMultiplier: 1,
    // All particles with their assigned mesh/instance indices
    particles: [] as ParticleData[],
  });

  // --- 1. Texture Loading Helper ---
  const loadTexture = (url: string): THREE.Texture => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(url);
    return tex;
  };

  // --- 2. Text Particle Generation (Raw Data) ---
  const generateRawParticlePositions = () => {
    const canvas = document.createElement('canvas');
    canvas.width = SCENE_CONFIG.CANVAS_WIDTH;
    canvas.height = SCENE_CONFIG.CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    // Background Black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Text White
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${SCENE_CONFIG.FONT_SIZE}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SCENE_CONFIG.TEXT, canvas.width / 2, canvas.height / 2);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const rawParticles = [];
    
    // Scan pixel data
    for (let y = 0; y < canvas.height; y += SCENE_CONFIG.PARTICLE_GAP) {
      for (let x = 0; x < canvas.width; x += SCENE_CONFIG.PARTICLE_GAP) {
        const index = (y * canvas.width + x) * 4;
        const r = imageData.data[index];
        
        // If pixel is bright enough
        if (r > 128) {
          rawParticles.push({
            x: (x - canvas.width / 2) * SCENE_CONFIG.PARTICLE_SIZE,
            y: (canvas.height / 2 - y) * SCENE_CONFIG.PARTICLE_SIZE, // Flip Y
            z: 0,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            vz: (Math.random() - 0.5) * 0.5,
          });
        }
      }
    }
    return rawParticles;
  };

  // --- 3. Scene Initialization (Run Once) ---
  useEffect(() => {
    if (!containerRef.current) return;

    // A. Basics
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SCENE_CONFIG.BG_COLOR);
    scene.fog = new THREE.FogExp2(SCENE_CONFIG.BG_COLOR, 0.02);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = CAMERA_LIMITS.DEFAULT_Z;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // B. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // C. Mesh Group container
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshGroupRef.current = meshGroup;

    // Store refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

  }, []);

  // --- 4. Handle Particle & Mesh Reconstruction when Textures Change ---
  useEffect(() => {
    if (!meshGroupRef.current) return;

    // 1. Cleanup old meshes
    meshGroupRef.current.clear();
    meshesRef.current = [];

    // 2. Determine Textures to use
    const texturesToUse = uploadedTextures.length > 0 
      ? uploadedTextures 
      : ['https://picsum.photos/64/64']; // Default placeholder

    // 3. Generate Base Particles (if not done or static)
    const rawParticles = generateRawParticlePositions();
    
    // 4. Distribute Particles to Meshes
    const particlesPerMesh: typeof rawParticles[] = texturesToUse.map(() => []);
    
    // Assign each particle to a texture group randomly
    const finalParticles: ParticleData[] = [];

    rawParticles.forEach((p) => {
      const meshIndex = Math.floor(Math.random() * texturesToUse.length);
      particlesPerMesh[meshIndex].push(p);
      
      finalParticles.push({
        ...p,
        meshIndex,
        instanceIndex: particlesPerMesh[meshIndex].length - 1
      });
    });

    stateRef.current.particles = finalParticles;

    // 5. Create InstancedMeshes
    const geometry = new THREE.PlaneGeometry(SCENE_CONFIG.PARTICLE_SIZE * 4, SCENE_CONFIG.PARTICLE_SIZE * 4);
    
    texturesToUse.forEach((url, i) => {
      const count = particlesPerMesh[i].length;
      if (count === 0) return; 

      const material = new THREE.MeshBasicMaterial({
        color: SCENE_CONFIG.DEFAULT_COLOR,
        side: THREE.DoubleSide,
        transparent: true,
        map: loadTexture(url),
      });

      const mesh = new THREE.InstancedMesh(geometry, material, count);
      meshGroupRef.current?.add(mesh);
      meshesRef.current.push(mesh);
    });

  }, [uploadedTextures]);


  // --- 5. Animation Loop (Active Effect) ---
  const latestGestureRef = useRef(gesture);
  useEffect(() => { latestGestureRef.current = gesture; }, [gesture]);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    let reqId: number;

    const animate = () => {
      if (!cameraRef.current || !rendererRef.current || !sceneRef.current) return;
      
      const gesture = latestGestureRef.current;
      const state = stateRef.current;
      const camera = cameraRef.current;

      // --- Camera Physics ---
      if (gesture === HandGesture.FIST) {
        state.velocityZ += PHYSICS.PULL_ACCELERATION;
      } else if (gesture === HandGesture.OPEN_PALM) {
        // Reduced force from 0.5 to 0.05 for much gentler start (Ease-in feel)
        state.velocityZ -= 0.05; 
      }
      
      // Always apply friction/damping to prevent infinite acceleration
      // This ensures "Fast then Slow" if input stops, but also limits max speed during input
      state.velocityZ *= 0.96; 

      state.cameraZ += state.velocityZ;

      // Limits
      if (state.cameraZ > CAMERA_LIMITS.MAX_Z) {
        state.cameraZ = CAMERA_LIMITS.MAX_Z;
        state.velocityZ = 0;
      }
      if (state.cameraZ < CAMERA_LIMITS.MIN_Z) {
        state.cameraZ = CAMERA_LIMITS.MIN_Z;
        state.velocityZ = 0; 
      }

      camera.position.z = THREE.MathUtils.lerp(camera.position.z, state.cameraZ, 0.1);
      camera.lookAt(0, 0, 0);

      // --- Particle Logic ---
      
      // 1. Flow Logic (Activated by OPEN_PALM)
      const isFlowing = gesture === HandGesture.OPEN_PALM;
      // Reduced lerp speed from 0.05 to 0.015. 
      // This creates a very slow, smooth entry into the wave effect ("刚张开手掌的时候就慢一点").
      state.flowAmount = THREE.MathUtils.lerp(state.flowAmount, isFlowing ? 1 : 0, 0.015);

      // 2. Scatter Logic (Activated by Close Proximity + OPEN_PALM)
      const shouldScatter = state.cameraZ < 10 && gesture === HandGesture.OPEN_PALM;
      state.scatterAmount = THREE.MathUtils.lerp(state.scatterAmount, shouldScatter ? 1 : 0, 0.05);

      // 3. Scale Logic
      const targetScale = gesture === HandGesture.OK_SIGN ? PHYSICS.OK_SCALE_MULTIPLIER : 1;
      state.scaleMultiplier = THREE.MathUtils.lerp(state.scaleMultiplier, targetScale, 0.1);

      const time = Date.now() * 0.001;

      // Update every particle
      for (let i = 0; i < state.particles.length; i++) {
        const p = state.particles[i];
        
        // Base Position
        let x = p.x;
        let y = p.y;
        let z = p.z;
        
        let rotX = 0;
        let rotY = 0;
        let rotZ = 0;

        // Apply Flow/Wave (Liquid Rolling Effect)
        if (state.flowAmount > 0.001) {
            // Keep wave speed slow (0.2)
            const wavePhase = p.x * 0.08 - time * 0.2;
            
            // Z-axis displacement (Depth wave)
            z += Math.sin(wavePhase) * 5.0 * state.flowAmount;
            
            // Y-axis displacement (Vertical ripple)
            y += Math.cos(wavePhase * 0.5) * 2.0 * state.flowAmount;

            // Minimal rotation to keep photos visible
            rotX = Math.sin(wavePhase) * Math.PI * 0.08 * state.flowAmount;
            rotZ = Math.cos(wavePhase) * Math.PI * 0.04 * state.flowAmount;
        }

        // Apply Scatter (Explosion)
        if (state.scatterAmount > 0.001) {
          x += p.vx * 50 * state.scatterAmount;
          y += p.vy * 50 * state.scatterAmount;
          z += p.vz * 50 * state.scatterAmount;
          
          rotX += time * p.vx * 10 * state.scatterAmount;
          rotY += time * p.vy * 10 * state.scatterAmount;
        }

        dummy.position.set(x, y, z);
        dummy.rotation.set(rotX, rotY, rotZ);

        const s = (gesture === HandGesture.OK_SIGN) ? state.scaleMultiplier : 1;
        dummy.scale.set(s, s, s);

        dummy.updateMatrix();

        // Update the specific mesh instance
        if (meshesRef.current[p.meshIndex]) {
           meshesRef.current[p.meshIndex].setMatrixAt(p.instanceIndex, dummy.matrix);
        }
      }

      // Mark all meshes for update
      meshesRef.current.forEach(mesh => {
        mesh.instanceMatrix.needsUpdate = true;
      });
      
      rendererRef.current.render(sceneRef.current, camera);
      reqId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(reqId);
  }, []);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
};

export default ThreeScene;