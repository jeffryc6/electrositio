/**
 * SIMULADOR 3D PRO - ELECTROPLAST PRECISION ENGINE
 * Versión: 2.0 (High-Fidelity Rendering)
 */

class InjectionSimulator3D {
  constructor() {
    this.dom = {
      viewport: document.getElementById('threeViewport'),
      material: document.getElementById('sim-material'),
      area: document.getElementById('sim-area'),
      cavities: document.getElementById('sim-cavities'),
      thickness: document.getElementById('sim-thickness'),
      machine: document.getElementById('sim-machine'),
      resTonnage: document.getElementById('res-tonnage'),
      resCycle: document.getElementById('res-cycle'),
      resOutput: document.getElementById('res-output'),
      simTempDisp: document.getElementById('sim-temp-disp'),
      simPressureDisp: document.getElementById('sim-pressure-disp'),
      simStatusText: document.getElementById('sim-status-text'),
      simStatusDot: document.getElementById('sim-status-dot'),
      simTimestamp: document.getElementById('sim-timestamp'),
      btnRunSim: document.getElementById('btn-run-sim'),
      btnToggleView: document.getElementById('btn-toggle-view'),
      btnToggleText: document.getElementById('btn-toggle-text'),
      canvasPartLabel: document.getElementById('canvas-part-label'),
      canvasModeBadge: document.getElementById('canvas-mode-badge'),
      nozzleBadge: document.getElementById('nozzle-fire-badge'),
      showcasePanel: document.getElementById('part-showcase-panel'),
      partButtons: document.querySelectorAll('.part-btn'),
      simDiagCard: document.getElementById('sim-diagnostic-card'),
      diagTitle: document.getElementById('diag-title'),
      diagDesc: document.getElementById('diag-desc'),
      valArea: document.getElementById('val-area'),
      valCavities: document.getElementById('val-cavities'),
      valThickness: document.getElementById('val-thickness'),
    };

    this.currentPart = 'luer';
    this.currentViewMode = 'mold';
    this.isCycleRunning = false;
    this.injectionParticles = [];

    this.init3DScene();
    this.initEventListeners();
    this.calculate();
  }

  init3DScene() {
    if (!this.dom.viewport || !window.THREE) return;

    const width = this.dom.viewport.clientWidth;
    const height = this.dom.viewport.clientHeight;

    this.scene = new THREE.Scene();
    
    // Cámara con ángulo cinematográfico
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    this.camera.position.set(40, 35, 110);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.dom.viewport.appendChild(this.renderer.domElement);

    // Iluminación de Estudio Industrial
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const mainLight = new THREE.SpotLight(0xffffff, 1.5);
    mainLight.position.set(50, 100, 50);
    mainLight.angle = 0.5;
    mainLight.penumbra = 0.5;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    fillLight.position.set(-40, 20, 20);
    this.scene.add(fillLight);

    // Luz de borde (Rim Light) para el acero
    const rimLight = new THREE.PointLight(0x00ff88, 1, 100);
    rimLight.position.set(0, 50, -20);
    this.scene.add(rimLight);

    // Grupos
    this.moldGroup = new THREE.Group();
    this.showcaseGroup = new THREE.Group();
    this.showcaseGroup.visible = false;
    this.scene.add(this.moldGroup);
    this.scene.add(this.showcaseGroup);

    this.buildDetailedMold();
    this.buildDetailedShowcase();
    this.initDragControls();

    const animate = () => {
      requestAnimationFrame(animate);
      if (this.currentViewMode === 'showcase' && !this.isDragging) {
        this.showcaseGroup.rotation.y += 0.01;
      }
      if (this.isCycleRunning) {
        this.updateInjectionParticles();
      }
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  // --- MOLDURAS MECÁNICAS DETALLADAS ---
  buildDetailedMold() {
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.9,
      roughness: 0.1,
      envMapIntensity: 1
    });

    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 1,
      roughness: 0.2
    });

    // Placa Fija con detalles de pernos
    const plateGeom = new THREE.BoxGeometry(8, 40, 55);
    this.fixedPlate = new THREE.Mesh(plateGeom, steelMat);
    this.fixedPlate.position.x = -20;
    this.moldGroup.add(this.fixedPlate);

    // Añadir pernos en las esquinas de la placa
    const boltGeom = new THREE.CylinderGeometry(1.2, 1.2, 2, 12);
    const corners = [[-18, 25], [18, 25], [-18, -25], [18, -25]];
    corners.forEach(([z, y]) => {
      const bolt = new THREE.Mesh(boltGeom, darkSteelMat);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(-16.5, y, z);
      this.moldGroup.add(bolt);
    });

    // Tie Bars (Columnas de guía) con casquillos
    const barGeom = new THREE.CylinderGeometry(1.8, 1.8, 100, 20);
    const barPos = [[-23, 16], [23, 16], [-23, -16], [23, -16]];
    barPos.forEach(([bz, by]) => {
      const bar = new THREE.Mesh(barGeom, steelMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, by, bz);
      this.moldGroup.add(bar);
      
      // Casquillo de bronce/acero
      const bushGeom = new THREE.CylinderGeometry(2.5, 2.5, 12, 20);
      const bush = new THREE.Mesh(bushGeom, darkSteelMat);
      bush.rotation.z = Math.PI / 2;
      bush.position.set(-16, by, bz);
      this.moldGroup.add(bush);
    });

    // Boquilla de Inyección Compleja
    const nozzleGroup = new THREE.Group();
    const n1 = new THREE.Mesh(new THREE.CylinderGeometry(2, 4, 10, 16), darkSteelMat);
    const n2 = new THREE.Mesh(new THREE.SphereGeometry(2.1, 16, 16), darkSteelMat);
    n2.position.y = 5;
    nozzleGroup.add(n1, n2);
    nozzleGroup.rotation.z = Math.PI / 2;
    nozzleGroup.position.set(-33, 0, 0);
    this.moldGroup.add(nozzleGroup);

    // Placa Móvil
    this.movablePlate = new THREE.Mesh(plateGeom, steelMat);
    this.movablePlate.position.set(-12, 0, 0);
    this.moldGroup.add(this.movablePlate);

    // Contenedor de cavidades
    this.partsGroup = new THREE.Group();
    this.movablePlate.add(this.partsGroup);
    this.updatePartsGeometry();
  }

  // --- PIEZAS MÉDICAS HIGH-DEF ---
  buildDetailedShowcase() {
    while (this.showcaseGroup.children.length > 0) {
        this.showcaseGroup.remove(this.showcaseGroup.children[0]);
    }

    // Material de polímero médico realista (Refractivo)
    const medicalPlastic = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.05,
      transmission: 0.95, // Transparencia física
      thickness: 2.0,
      ior: 1.49, // Índice de refracción del acrílico/PC
      transparent: true,
      opacity: 1,
      clearcoat: 1,
      envMapIntensity: 1.5
    });

    const meshObj = new THREE.Group();

    if (this.currentPart === 'luer') {
      // LUER LOCK CON ROSCA HELICOIDAL
      const body = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 25, 32), medicalPlastic);
      
      // Rosca (Simulada con anillos inclinados para realismo)
      for(let i=0; i<3; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.6, 8, 32), medicalPlastic);
        ring.position.y = -5 + (i * 2.5);
        ring.rotation.x = Math.PI / 2.2;
        meshObj.add(ring);
      }

      // Aletas ergonómicas con bordes redondeados
      const wingGeom = new THREE.BoxGeometry(24, 4, 3);
      const wings = new THREE.Mesh(wingGeom, medicalPlastic);
      wings.position.y = -8;
      meshObj.add(body, wings);

    } else if (this.currentPart === 'manifold') {
      // MANIFOLD CON CANALES INTERNOS VISIBLES
      const core = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 12), medicalPlastic);
      
      // Puertos con reborde
      const portGeom = new THREE.CylinderGeometry(3, 3, 10, 24);
      const flangeGeom = new THREE.CylinderGeometry(4, 4, 1.5, 24);
      
      [-10, 0, 10].forEach(x => {
        const p = new THREE.Mesh(portGeom, medicalPlastic);
        p.position.set(x, 10, 0);
        const f = new THREE.Mesh(flangeGeom, medicalPlastic);
        f.position.set(x, 14, 0);
        meshObj.add(p, f);
      });
      meshObj.add(core);

    } else if (this.currentPart === 'cap') {
      // TAPA VIAL CON MICRO-ESTRIADO
      const main = new THREE.Mesh(new THREE.CylinderGeometry(14, 15, 18, 40), medicalPlastic);
      
      // 32 Estrías reales
      for(let i=0; i<32; i++){
        const rib = new THREE.Mesh(new THREE.BoxGeometry(1, 16, 1.5), medicalPlastic);
        const angle = (i / 32) * Math.PI * 2;
        rib.position.set(Math.cos(angle)*15, 0, Math.sin(angle)*15);
        rib.rotation.y = -angle;
        meshObj.add(rib);
      }
      meshObj.add(main);
    }

    this.showcaseGroup.add(meshObj);
    meshObj.scale.set(1.5, 1.5, 1.5);
  }

  // --- LÓGICA DE SIMULACIÓN MEJORADA ---
  runCycle3D() {
    if (this.isCycleRunning) return;
    this.isCycleRunning = true;

    if (this.currentViewMode !== 'mold') this.switchToView('mold');

    this.dom.simStatusText.innerText = "INICIANDO INYECCIÓN VOLUMÉTRICA...";
    this.dom.nozzleBadge.classList.remove('hidden');

    // Color de resina fundida (Incandescente)
    this.plasticMaterial.opacity = 1.0;
    this.plasticMaterial.color.setHex(0xffaa00);
    this.plasticMaterial.emissive.setHex(0xff4400);
    this.plasticMaterial.emissiveIntensity = 1;

    let startTime = Date.now();
    const duration = 6000; // 6 segundos total

    const step = () => {
      const elapsed = Date.now() - startTime;
      const p = elapsed / duration;

      if (p < 0.3) {
        // Fase de Inyección
        this.spawnParticles();
      } else if (p < 0.6) {
        // Fase de Enfriamiento (Cambio de color)
        this.dom.simStatusText.innerText = "ENFRIAMIENTO Y CRISTALIZACIÓN...";
        this.plasticMaterial.color.lerp(new THREE.Color(0x34d399), 0.05);
        this.plasticMaterial.emissiveIntensity *= 0.9;
        this.dom.nozzleBadge.classList.add('hidden');
      } else if (p < 0.9) {
        // Apertura
        this.dom.simStatusText.innerText = "APERTURA DE MOLDE...";
        this.movablePlate.position.x = -12 + (p - 0.6) * 40;
      } else if (p >= 1) {
        this.finishCycle();
        return;
      }

      this.dom.simTimestamp.innerText = `CYCLE: ${(p * 12).toFixed(1)}s`;
      if (this.isCycleRunning) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  finishCycle() {
    this.isCycleRunning = false;
    this.movablePlate.position.x = -12;
    this.dom.simStatusText.innerText = "PIEZA VALIDADA - LISTA PARA INSPECCIÓN";
    
    window.confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00ff88', '#ffffff']
    });

    setTimeout(() => {
        this.switchToView('showcase');
        this.dom.btnToggleView.classList.remove('hidden');
    }, 800);
  }

  spawnParticles() {
    const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffcc00 })
    );
    p.position.set(-28, (Math.random()-0.5)*2, (Math.random()-0.5)*2);
    this.moldGroup.add(p);
    this.injectionParticles.push({ mesh: p, life: 1 });
  }

  updateInjectionParticles() {
    for (let i = this.injectionParticles.length - 1; i >= 0; i--) {
      const p = this.injectionParticles[i];
      p.mesh.position.x += 1.5;
      p.life -= 0.04;
      if (p.life <= 0 || p.mesh.position.x > -12) {
        this.moldGroup.remove(p.mesh);
        this.injectionParticles.splice(i, 1);
      }
    }
  }

  // --- UTILIDADES ---
  updatePartsGeometry() {
    while (this.partsGroup.children.length > 0) this.partsGroup.remove(this.partsGroup.children[0]);
    
    this.plasticMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0,
      roughness: 0.2
    });

    const runner = new THREE.Mesh(new THREE.BoxGeometry(0.8, 25, 0.8), this.plasticMaterial);
    runner.position.set(-4.1, 0, 0);
    this.partsGroup.add(runner);

    const cavs = parseInt(this.dom.cavities.value);
    for(let i=0; i<cavs; i++){
        const z = (i - (cavs-1)/2) * 10;
        const p = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 6, 16), this.plasticMaterial);
        p.rotation.z = Math.PI/2;
        p.position.set(-4.5, 8, z);
        const p2 = p.clone(); p2.position.y = -8;
        this.partsGroup.add(p, p2);
    }
  }

  switchToView(mode) {
    this.currentViewMode = mode;
    const isShowcase = mode === 'showcase';
    this.moldGroup.visible = !isShowcase;
    this.showcaseGroup.visible = isShowcase;
    
    if (isShowcase) {
        this.camera.position.set(0, 15, 60);
        this.dom.canvasModeBadge.innerText = "VISTA: INSPECCIÓN 3D";
        this.dom.showcasePanel.classList.remove('hidden');
        this.buildDetailedShowcase();
    } else {
        this.camera.position.set(40, 35, 110);
        this.dom.canvasModeBadge.innerText = "VISTA: MOLDE";
        this.dom.showcasePanel.classList.add('hidden');
    }
    this.camera.lookAt(0,0,0);
  }

  initEventListeners() {
    this.dom.partButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentPart = e.currentTarget.dataset.part;
        this.dom.partButtons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.updatePartsGeometry();
        if(this.currentViewMode === 'showcase') this.buildDetailedShowcase();
      });
    });

    this.dom.btnRunSim.addEventListener('click', () => this.runCycle3D());
    this.dom.btnToggleView.addEventListener('click', () => {
        this.switchToView(this.currentViewMode === 'mold' ? 'showcase' : 'mold');
    });

    [this.dom.material, this.dom.area, this.dom.cavities, this.dom.thickness].forEach(el => {
        el.addEventListener('input', () => this.calculate());
    });
  }

  initDragControls() {
    this.isDragging = false;
    this.prevM = { x: 0, y: 0 };
    this.dom.viewport.addEventListener('mousedown', (e) => { this.isDragging = true; this.prevM = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mouseup', () => this.isDragging = false);
    this.dom.viewport.addEventListener('mousemove', (e) => {
        if(!this.isDragging) return;
        const dx = e.clientX - this.prevM.x;
        const dy = e.clientY - this.prevM.y;
        if(this.currentViewMode === 'showcase') {
            this.showcaseGroup.rotation.y += dx * 0.01;
            this.showcaseGroup.rotation.x += dy * 0.01;
        } else {
            this.moldGroup.rotation.y += dx * 0.01;
        }
        this.prevM = { x: e.clientX, y: e.clientY };
    });
  }

  calculate() {
    // Mantener la misma lógica de cálculos que tenías
    const area = parseFloat(this.dom.area.value);
    const cavs = parseInt(this.dom.cavities.value);
    const thick = parseFloat(this.dom.thickness.value);
    this.dom.valArea.innerText = `${area} cm²`;
    this.dom.valCavities.innerText = `${cavs} cav.`;
    this.dom.valThickness.innerText = `${thick} mm`;
    this.dom.resTonnage.innerText = `${Math.round(area * cavs * 0.6)} T`;
    this.dom.resCycle.innerText = `${(thick * 4 + 5).toFixed(1)} s`;
    this.dom.resOutput.innerText = `${Math.round(3600 / (thick*4+5) * cavs)} pzs`;
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    new InjectionSimulator3D();
});