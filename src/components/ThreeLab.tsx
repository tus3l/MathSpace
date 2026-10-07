import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RotateCcw } from "lucide-react";
import { compileFunction, fmt } from "../engine/math";
import { Slider, Why } from "./Controls";
import { Insight, LabHeader } from "./CoreLabs";

export default function ThreeLab() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    mesh: THREE.Mesh;
    controls: OrbitControls;
    camera: THREE.PerspectiveCamera;
  } | null>(null);
  const [shape, setShape] = useState("cube"),
    [dimension, setDimension] = useState(2),
    [height, setHeight] = useState(3),
    [surface, setSurface] = useState("x^2+y^2"),
    [draft, setDraft] = useState("x^2+y^2"),
    [error, setError] = useState("");
  useEffect(() => {
    const mount = mountRef.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      const frame = requestAnimationFrame(() =>
        setError("WebGL غير متاح في هذا المتصفح."),
      );
      return () => cancelAnimationFrame(frame);
    }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(
      document.documentElement.dataset.theme === "dark" ? "#191c22" : "#fbfcfd",
    );
    const themeObserver = new MutationObserver(() => {
      scene.background = new THREE.Color(
        document.documentElement.dataset.theme === "dark"
          ? "#191c22"
          : "#fbfcfd",
      );
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
    camera.up.set(0, 0, 1);
    camera.position.set(10, -12, 10);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "مختبر ثلاثي الأبعاد قابل للدوران",
    );
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 1);
    const grid = new THREE.GridHelper(20, 20, "#afb7c4", "#e1e5eb");
    grid.rotateX(Math.PI / 2);
    scene.add(grid);
    scene.add(new THREE.AxesHelper(5));
    scene.add(new THREE.AmbientLight(0xffffff, 2));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(5, -5, 10);
    scene.add(light);
    const material = new THREE.MeshStandardMaterial({
      color: "#8a80d2",
      roughness: 0.4,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material);
    scene.add(mesh);
    sceneRef.current = { scene, mesh, camera, controls };
    const observer = new ResizeObserver(() => {
      const { width, height } = mount.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    });
    observer.observe(mount);
    let animation: number;
    const render = () => {
      animation = requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();
    return () => {
      cancelAnimationFrame(animation);
      observer.disconnect();
      themeObserver.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.LineSegments
        ) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((item) => item.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, []);
  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    let geometry: THREE.BufferGeometry;
    if (shape === "surface") {
      const evaluate = compileFunction(surface),
        segments = 60,
        positions: number[] = [],
        indices: number[] = [],
        colors: number[] = [];
      for (let row = 0; row <= segments; row++)
        for (let column = 0; column <= segments; column++) {
          const x = -3 + (column / segments) * 6,
            y = -3 + (row / segments) * 6,
            z = evaluate(x, { y });
          positions.push(
            x,
            y,
            Number.isFinite(z) ? Math.max(-8, Math.min(12, z)) : NaN,
          );
          const color = new THREE.Color().setHSL(
            0.48 + Math.min(1, Math.max(0, (z + 2) / 12)) * 0.24,
            0.48,
            0.58,
          );
          colors.push(color.r, color.g, color.b);
        }
      for (let row = 0; row < segments; row++)
        for (let column = 0; column < segments; column++) {
          const index = row * (segments + 1) + column,
            neighbors = [
              index,
              index + 1,
              index + segments + 1,
              index + segments + 2,
            ];
          if (
            neighbors.every((vertex) =>
              Number.isFinite(positions[vertex * 3 + 2]),
            )
          )
            indices.push(
              index,
              index + 1,
              index + segments + 1,
              index + 1,
              index + segments + 2,
              index + segments + 1,
            );
        }
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          positions.map((value) => (Number.isFinite(value) ? value : 0)),
          3,
        ),
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3),
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
    } else if (shape === "sphere")
      geometry = new THREE.SphereGeometry(dimension, 48, 32);
    else if (shape === "cylinder")
      geometry = new THREE.CylinderGeometry(dimension, dimension, height, 48);
    else if (shape === "cone")
      geometry = new THREE.ConeGeometry(dimension, height, 48);
    else if (shape === "pyramid")
      geometry = new THREE.ConeGeometry(dimension / Math.sqrt(2), height, 4);
    else if (shape === "prism")
      geometry = new THREE.CylinderGeometry(
        dimension / Math.sqrt(3),
        dimension / Math.sqrt(3),
        height,
        3,
      );
    else geometry = new THREE.BoxGeometry(dimension, dimension, dimension);
    if (["cylinder", "cone", "pyramid", "prism"].includes(shape))
      geometry.rotateX(Math.PI / 2);
    state.mesh.geometry.dispose();
    state.mesh.geometry = geometry;
    state.mesh.position.set(
      0,
      0,
      shape === "surface"
        ? 0
        : shape === "sphere"
          ? dimension
          : shape === "cube"
            ? dimension / 2
            : height / 2,
    );
    const material = state.mesh.material as THREE.MeshStandardMaterial;
    material.vertexColors = shape === "surface";
    material.color.set(shape === "surface" ? "#ffffff" : "#8a80d2");
    material.needsUpdate = true;
  }, [shape, dimension, height, surface]);
  const volume =
    shape === "cube"
      ? dimension ** 3
      : shape === "sphere"
        ? (4 / 3) * Math.PI * dimension ** 3
        : shape === "cylinder"
          ? Math.PI * dimension ** 2 * height
          : shape === "cone"
            ? (Math.PI * dimension ** 2 * height) / 3
            : shape === "pyramid"
              ? (dimension ** 2 * height) / 3
              : (Math.sqrt(3) / 4) * dimension ** 2 * height;
  const area =
    shape === "cube"
      ? 6 * dimension ** 2
      : shape === "sphere"
        ? 4 * Math.PI * dimension ** 2
        : shape === "cylinder"
          ? 2 * Math.PI * dimension * (dimension + height)
          : shape === "cone"
            ? Math.PI * dimension * (dimension + Math.hypot(dimension, height))
            : shape === "pyramid"
              ? dimension ** 2 +
                2 * dimension * Math.hypot(height, dimension / 2)
              : (Math.sqrt(3) / 2) * dimension ** 2 + 3 * dimension * height;
  return (
    <>
      <LabHeader english="3D MATH LAB" title="بُعد آخر للفهم" />
      <div className="lab-layout">
        <section className="lab-stage three-stage">
          <div className="section-heading">
            <h2>
              {shape === "surface" ? "سطح دالة متعددة المتغيرات" : "المجسم"}
            </h2>
            <button
              title="إعادة ضبط الكاميرا"
              aria-label="إعادة ضبط الكاميرا"
              onClick={() => {
                const state = sceneRef.current;
                if (state) {
                  state.camera.position.set(10, -12, 10);
                  state.controls.target.set(0, 0, 1);
                  state.controls.update();
                }
              }}
            >
              <RotateCcw size={17} />
            </button>
          </div>
          <div className="three-canvas" ref={mountRef} />
          <div className="three-axes" dir="ltr">
            <span className="axis-x">X</span>
            <span className="axis-y">Y</span>
            <span className="axis-z">Z</span>
          </div>
          <Insight>
            <p>
              {shape === "surface"
                ? `ارتفاع كل نقطة يساوي z = ${surface}. تعديل الدالة يغير السطح نفسه. المجال المعروض [-3,3]² والارتفاع مقصوص بين -8 و12 لحفظ وضوح العرض.`
                : `تغيير ${["sphere", "cylinder", "cone"].includes(shape) ? "نصف القطر" : "طول ضلع القاعدة"} يعيد حساب المجسم وحجمه ومساحته. الحجم يتناسب تكعيبيًا عند تكبير جميع الأبعاد بالنسبة نفسها، والمساحة تربيعيًا.`}
            </p>
          </Insight>
        </section>
        <aside className="lab-properties">
          <h3>خصائص المجسم</h3>
          <select
            className="full-select"
            aria-label="المجسم"
            value={shape}
            onChange={(event) => setShape(event.target.value)}
          >
            {[
              ["cube", "مكعب"],
              ["sphere", "كرة"],
              ["cylinder", "أسطوانة"],
              ["cone", "مخروط"],
              ["pyramid", "هرم مربع"],
              ["prism", "منشور مثلثي منتظم"],
              ["surface", "سطح دالة"],
            ].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          {shape === "surface" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  compileFunction(draft);
                  setSurface(draft);
                  setError("");
                } catch {
                  setError("تعذر قراءة الدالة في x وy.");
                }
              }}
            >
              <label className="field-label">
                z =
                <input
                  aria-label="دالة السطح"
                  dir="ltr"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
              </label>
              <button className="button primary full-width">تحديث السطح</button>
              <button
                type="button"
                className="what-if"
                onClick={() => {
                  setDraft("sin(x)*cos(y)");
                  setSurface("sin(x)*cos(y)");
                }}
              >
                z = sin(x) cos(y)
              </button>
            </form>
          ) : (
            <>
              <Slider
                label={
                  ["sphere", "cylinder", "cone"].includes(shape) ? "r" : "s"
                }
                min={0.5}
                max={4}
                step={0.1}
                value={dimension}
                onChange={setDimension}
              />
              {!["cube", "sphere"].includes(shape) && (
                <Slider
                  label="h"
                  min={0.5}
                  max={6}
                  step={0.1}
                  value={height}
                  onChange={setHeight}
                />
              )}
              <div className="metric">
                <span>الحجم</span>
                <strong>{fmt(volume)}</strong>
              </div>
              <div className="metric">
                <span>مساحة السطح</span>
                <strong>{fmt(area)}</strong>
              </div>
              <Why>
                الحجم يقيس الحيز الداخلي، ومساحة السطح تجمع مساحات الأوجه أو
                السطح المنحني. الهرم والمخروط لهما ثلث حجم المنشور أو الأسطوانة
                ذات القاعدة والارتفاع نفسيهما.
              </Why>
            </>
          )}
          {error && <p className="error-message">{error}</p>}
        </aside>
      </div>
    </>
  );
}
