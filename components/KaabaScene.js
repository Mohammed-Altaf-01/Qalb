"use client";

import { useEffect, useRef } from "react";

export default function KaabaScene() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animId,
      renderer,
      resizeObserver,
      mounted = true;

    async function init() {
      const THREE = await import("three");
      if (!mounted) return;

      const {
        Scene,
        PerspectiveCamera,
        WebGLRenderer,
        BoxGeometry,
        CircleGeometry,
        RingGeometry,
        EdgesGeometry,
        LineSegments,
        LineBasicMaterial,
        Mesh,
        MeshStandardMaterial,
        MeshBasicMaterial,
        Group,
        BufferGeometry,
        Float32BufferAttribute,
        Points,
        PointsMaterial,
        AmbientLight,
        DirectionalLight,
        PointLight,
        Color,
        FogExp2,
        AdditiveBlending,
        DoubleSide,
      } = THREE;

      const scene = new Scene();
      scene.fog = new FogExp2(0x080f0a, 0.2);

      // Camera — elevated slightly, showing front-right corner so door is visible
      const camera = new PerspectiveCamera(36, 1, 0.1, 30);
      camera.position.set(1.5, 0.9, 2.7);
      camera.lookAt(0.1, -0.05, 0);

      renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0, 0);
      function updateSize() {
        const parent = canvas.parentElement;
        const width = parent?.clientWidth ?? 280;
        const height = parent?.clientHeight ?? width;
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
      updateSize();
      resizeObserver = new ResizeObserver(updateSize);
      if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

      // ── Lighting ────────────────────────────────────────────────────────────
      // Warm sunlight from upper-right (like Makkah midday)
      scene.add(new AmbientLight(0x1e2e1e, 2.0));

      const sun = new DirectionalLight(0xffc870, 2.2);
      sun.position.set(2.5, 5, 3);
      scene.add(sun);

      // Cool blue fill from the opposite side
      const fill = new DirectionalLight(0x2a3a55, 0.7);
      fill.position.set(-3, 0.5, -2);
      scene.add(fill);

      // Gold accent — illuminates the door and belt
      const goldGlow = new PointLight(0xc8a951, 1.8, 7);
      goldGlow.position.set(0.6, 0.5, 2.2);
      scene.add(goldGlow);

      // ── Materials (reused) ──────────────────────────────────────────────────
      const goldMat = new MeshStandardMaterial({
        color: new Color(0xd4a843),
        metalness: 0.82,
        roughness: 0.18,
        emissive: new Color(0x4a2c00),
        emissiveIntensity: 0.65,
      });

      // ── Kaaba group (body + all attached elements rotate together) ──────────
      const kaabaGroup = new Group();

      // Main body — Kiswa-black
      const bodyGeo = new BoxGeometry(1, 1.18, 1);
      kaabaGroup.add(
        new Mesh(
          bodyGeo,
          new MeshStandardMaterial({
            color: new Color(0x0a0a0a),
            roughness: 0.94,
            metalness: 0.06,
          }),
        ),
      );

      // Very subtle dark-gold corner edges (not full wireframe — just edges)
      kaabaGroup.add(
        new LineSegments(
          new EdgesGeometry(bodyGeo),
          new LineBasicMaterial({ color: 0x5a4010, opacity: 0.45, transparent: true }),
        ),
      );

      // ── Kiswa Belt (Hizam) — gold band, ~upper third ────────────────────────
      const beltMesh = new Mesh(
        new BoxGeometry(1.007, 0.11, 1.007),
        new MeshStandardMaterial({
          color: new Color(0xc8a951),
          metalness: 0.68,
          roughness: 0.22,
          emissive: new Color(0x4a3000),
          emissiveIntensity: 0.7,
        }),
      );
      beltMesh.position.y = 0.3;
      kaabaGroup.add(beltMesh);

      // Belt inscription line (thin brighter stripe on belt top edge)
      const beltTopLine = new Mesh(
        new BoxGeometry(1.009, 0.012, 1.009),
        new MeshStandardMaterial({
          color: 0xe8c870,
          metalness: 0.9,
          roughness: 0.1,
          emissive: 0x5a3c00,
          emissiveIntensity: 0.8,
        }),
      );
      beltTopLine.position.y = 0.361;
      kaabaGroup.add(beltTopLine);

      // Belt inscription line (bottom edge)
      const beltBotLine = new Mesh(
        new BoxGeometry(1.009, 0.012, 1.009),
        new MeshStandardMaterial({
          color: 0xe8c870,
          metalness: 0.9,
          roughness: 0.1,
          emissive: 0x5a3c00,
          emissiveIntensity: 0.8,
        }),
      );
      beltBotLine.position.y = 0.239;
      kaabaGroup.add(beltBotLine);

      // ── Door (Bab al-Kaaba) — front face +Z ────────────────────────────────
      // Real door: elevated ~2m, roughly 3m wide × 4m tall on 13m Kaaba
      // In our space (height=1.18): bottom at y ≈ -0.59 + (2/13)*1.18 = -0.41
      // Door center y ≈ -0.41 + 0.36/2 = -0.23

      // Door panel (dark brass)
      const doorPanel = new Mesh(
        new BoxGeometry(0.23, 0.37, 0.016),
        new MeshStandardMaterial({
          color: 0x7a5815,
          metalness: 0.65,
          roughness: 0.38,
          emissive: 0x1a0c00,
          emissiveIntensity: 0.4,
        }),
      );
      doorPanel.position.set(0, -0.23, 0.508);
      kaabaGroup.add(doorPanel);

      // Door frame — 4 gold bars
      const framePositions = [
        // [w, h, d, x, y, z]
        [0.27, 0.024, 0.016, 0, -0.037, 0.512], // top bar
        [0.27, 0.024, 0.016, 0, -0.422, 0.512], // bottom bar
        [0.024, 0.41, 0.016, -0.127, -0.23, 0.512], // left bar
        [0.024, 0.41, 0.016, 0.127, -0.23, 0.512], // right bar
      ];
      framePositions.forEach(([w, h, d, x, y, z]) => {
        const m = new Mesh(new BoxGeometry(w, h, d), goldMat);
        m.position.set(x, y, z);
        kaabaGroup.add(m);
      });

      // Small arch above door (semi-circular feel with a thin box)
      const arch = new Mesh(
        new BoxGeometry(0.23, 0.04, 0.014),
        new MeshStandardMaterial({
          color: 0xd4a843,
          metalness: 0.85,
          roughness: 0.15,
          emissive: 0x5a3500,
          emissiveIntensity: 0.9,
        }),
      );
      arch.position.set(0, -0.017, 0.512);
      kaabaGroup.add(arch);

      // Door step / threshold
      const step = new Mesh(
        new BoxGeometry(0.32, 0.045, 0.14),
        new MeshStandardMaterial({ color: 0x9a8f78, roughness: 0.88, metalness: 0.12 }),
      );
      step.position.set(0, -0.435, 0.57);
      kaabaGroup.add(step);

      scene.add(kaabaGroup);

      // ── Maqam Ibrahim — fixed structure in front-right ──────────────────────
      // (Does NOT rotate with Kaaba — it's a separate fixed monument)
      const maqamGroup = new Group();

      // Glass/metal enclosure (small, simplified)
      const maqamBody = new Mesh(
        new BoxGeometry(0.14, 0.24, 0.14),
        new MeshStandardMaterial({
          color: 0xb89828,
          metalness: 0.6,
          roughness: 0.3,
          emissive: 0x2a1800,
          emissiveIntensity: 0.45,
        }),
      );

      const maqamCap = new Mesh(
        new BoxGeometry(0.11, 0.07, 0.11),
        new MeshStandardMaterial({
          color: 0xd4a843,
          metalness: 0.78,
          roughness: 0.2,
          emissive: 0x4a2c00,
          emissiveIntensity: 0.6,
        }),
      );
      maqamCap.position.y = 0.155;

      // Gold corner accents
      [
        [-0.07, 0, -0.07],
        [0.07, 0, -0.07],
        [-0.07, 0, 0.07],
        [0.07, 0, 0.07],
      ].forEach(([x, y, z]) => {
        const pillar = new Mesh(
          new BoxGeometry(0.018, 0.26, 0.018),
          new MeshStandardMaterial({
            color: 0xe0c870,
            metalness: 0.88,
            roughness: 0.12,
            emissive: 0x5a3c00,
            emissiveIntensity: 0.7,
          }),
        );
        pillar.position.set(x, y, z);
        maqamGroup.add(pillar);
      });

      maqamGroup.add(maqamBody, maqamCap);
      maqamGroup.position.set(0.82, -0.475, 1.1);
      scene.add(maqamGroup);

      // ── Mataf ground ────────────────────────────────────────────────────────
      const mataf = new Mesh(
        new CircleGeometry(2.8, 52),
        new MeshStandardMaterial({ color: 0x0e1a12, roughness: 1, metalness: 0, transparent: true, opacity: 0.55 }),
      );
      mataf.rotation.x = -Math.PI / 2;
      mataf.position.set(0, -0.59, 0);
      scene.add(mataf);

      // Tawaf ring (faint gold circle on the ground)
      const tawafRing = new Mesh(
        new RingGeometry(1.25, 1.32, 52),
        new MeshBasicMaterial({ color: 0xc8a951, transparent: true, opacity: 0.1, side: DoubleSide }),
      );
      tawafRing.rotation.x = -Math.PI / 2;
      tawafRing.position.y = -0.584;
      scene.add(tawafRing);

      // ── Ambient particles (pilgrims / light motes) ──────────────────────────
      const COUNT = 90;
      const pos = new Float32Array(COUNT * 3);
      for (let i = 0; i < COUNT; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 1.0 + Math.random() * 1.2;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 1.6;
        pos[i * 3 + 2] = Math.sin(a) * r;
      }
      const pGeo = new BufferGeometry();
      pGeo.setAttribute("position", new Float32BufferAttribute(pos, 3));
      const particles = new Points(
        pGeo,
        new PointsMaterial({
          color: 0xd4b468,
          size: 0.02,
          transparent: true,
          opacity: 0.4,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      scene.add(particles);

      // ── Animation ────────────────────────────────────────────────────────────
      let t = 0;
      function animate() {
        animId = requestAnimationFrame(animate);
        if (document.hidden) return;

        if (!reducedMotion) {
          t += 0.004;
          kaabaGroup.rotation.y = t * 0.2; // ~31s per full turn
          particles.rotation.y = t * 0.06; // slow counter-drift
          // gentle float
          const float = Math.sin(t * 0.45) * 0.025;
          kaabaGroup.position.y = float;
        }

        renderer.render(scene, camera);
      }
      animate();
    }

    init().catch(console.error);

    return () => {
      mounted = false;
      if (animId) cancelAnimationFrame(animId);
      if (resizeObserver) resizeObserver.disconnect();
      if (renderer) renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" aria-hidden="true" />;
}
