"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { scrollStore } from "../scroll/scrollStore";
import { SCENES70 } from "@/lib/scenes70";

/**
 * Hand-rolled Three.js canvas: mesh constellation world + scroll-driven
 * camera rig. Renders straight to the canvas, no React per-frame.
 */
export default function Canvas3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121216);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
    camera.position.set(0, 0, 10);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(0, 10, 8);
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight2.position.set(-8, -4, -6);
    scene.add(ambient, dirLight, dirLight2);

    const nodes: THREE.Mesh[] = [];
    const connections: THREE.LineSegments[] = [];

    for (let i = 0; i < 18; i++) {
      const x = (i % 6) * 26 - 65;
      const y = Math.floor(i / 6) * 22 - 22;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(3, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xff6b1a,
          emissiveIntensity: 0.5,
          metalness: 0.2,
          roughness: 0.3,
        })
      );
      mesh.position.set(x, y + 10, 0);
      nodes.push(mesh);
    }
    scene.add(...nodes);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = nodes[i].position.distanceTo(nodes[j].position);
        if (dist < 90) {
          connections.push(
            new THREE.LineSegments(
              new THREE.BufferGeometry().setFromPoints([nodes[i].position, nodes[j].position]),
              new THREE.LineBasicMaterial({ color: 0xff6b1a, opacity: 0.3, transparent: true })
            )
          );
        }
      }
    }
    scene.add(...connections);

    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(160, 2, 120),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    platform.position.set(0, -1, 0);
    scene.add(platform);

    const bigBox = new THREE.Mesh(
      new THREE.BoxGeometry(20, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    bigBox.position.set(0, 0, 0);
    scene.add(bigBox);

    const onResize = () => {
      const w = canvas.clientWidth || 800;
      const h = canvas.clientHeight || 560;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const draw = () => {
      const p = scrollStore.smooth;
      const sceneCfg = SCENES70.find((s) => p >= s.tStart && p < s.tEnd) ?? SCENES70[0];
      const span = sceneCfg.tEnd - sceneCfg.tStart;
      const t = span > 0 ? (p - sceneCfg.tStart) / span : 0;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(...sceneCfg.camPos),
        new THREE.Vector3(...sceneCfg.camPos2),
      ]);
      const pos = curve.getPointAt(Math.min(1, Math.max(0, t)));
      camera.position.copy(pos);
      camera.lookAt(new THREE.Vector3(...sceneCfg.lookAt));
      renderer.render(scene, camera);

      // debug: in-page pixel readback
      const gl = renderer.getContext();
      const w2 = gl.drawingBufferWidth, h2 = gl.drawingBufferHeight;
      const d = new Uint8Array(w2 * h2 * 4);
      gl.readPixels(0, 0, w2, h2, gl.RGBA, gl.UNSIGNED_BYTE, d);
      let nonBlack = 0, maxR = 0, maxA = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > maxR) maxR = d[i];
        if (d[i+3] > maxA) maxA = d[i+3];
        if (d[i] + d[i+1] + d[i+2] + d[i+3] > 0) nonBlack++;
      }
      canvas.dataset.dbg = JSON.stringify({
        sceneChildren: scene.children.length,
        cam: camera.position.toArray(),
        nonBlack, maxR, maxA, dbuf: [w2, h2],
      });
    };
    const animate = (ts: number) => {
      void ts;
      if (!canvas.dataset.drawn) canvas.dataset.drawn = "1";
      draw();
      requestAnimationFrame(animate);
    };
    onResize();
    draw(); // first frame synchronously (avoids blank flash in backgrounded tabs)
    requestAnimationFrame(animate);
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          obj.material.dispose();
        }
        if (obj instanceof THREE.LineSegments) {
          obj.geometry.dispose();
          obj.material.dispose();
        }
      });
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="mesh-frame-canvas"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
