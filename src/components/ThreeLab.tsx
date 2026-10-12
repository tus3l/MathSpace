import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RotateCcw } from "lucide-react";
import { compileFunction, fmt, mathRequest, normalize } from "../engine/math";
import { sampleSurface, surfacePresets } from "../engine/surfaces";
import { explainDerivative } from "../engine/calculusSteps";
import { MathInput, Slider, Why } from "./Controls";
import { Insight, LabHeader } from "./CoreLabs";
import { LearningPanel } from "./LearningPanel";
import { MathTools } from "./MathTools";

function traceSegments(points: [number, number, number][]) {
  const positions: number[] = [];
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1],
      current = points[index];
    if ([...previous, ...current].every(Number.isFinite))
      positions.push(...previous, ...current);
  }
  return new THREE.Float32BufferAttribute(positions, 3);
}

function frameSurface(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  geometry: THREE.BufferGeometry,
) {
  geometry.computeBoundingSphere();
  const bounds = geometry.boundingSphere;
  if (!bounds || bounds.radius <= 0 || !Number.isFinite(bounds.radius)) return;
  const direction = camera.position.clone().sub(controls.target).normalize();
  const vertical = THREE.MathUtils.degToRad(camera.fov) / 2;
  const angle = Math.min(
    vertical,
    Math.atan(Math.tan(vertical) * camera.aspect),
  );
  controls.target.copy(bounds.center);
  camera.position
    .copy(bounds.center)
    .addScaledVector(direction, (bounds.radius / Math.sin(angle)) * 1.1);
  controls.update();
}

export default function ThreeLab() {
  const mountRef = useRef<HTMLDivElement>(null);
  const surfaceInputRef = useRef<HTMLInputElement>(null);
  const focusSurfaceRef = useRef(false);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    mesh: THREE.Mesh;
    controls: OrbitControls;
    camera: THREE.PerspectiveCamera;
    section: THREE.LineSegments;
    traces: THREE.LineSegments[];
    probe: THREE.Mesh;
  } | null>(null);
  const [shape, setShape] = useState("cube"),
    [dimension, setDimension] = useState(2),
    [height, setHeight] = useState(3),
    [surface, setSurface] = useState("x^2+y^2"),
    [surfaceSource, setSurfaceSource] = useState("x^2+y^2"),
    [draft, setDraft] = useState("x^2+y^2"),
    [error, setError] = useState("");
  const [scope, setScope] = useState({ a: 2, b: 1.5, c: 2 });
  const [domain, setDomain] = useState([0, 2 * Math.PI, 0, 2 * Math.PI]);
  const [showSection, setShowSection] = useState(false);
  const [probe, setProbe] = useState({ x: 1, y: -1 });
  const [showTraces, setShowTraces] = useState(true);
  const explicit = useMemo(() => {
    const expression = normalize(surface);
    const sides = expression.split("=");
    const body =
      sides.length === 1
        ? expression
        : sides.length === 2 && sides[0].trim() === "z"
          ? sides[1]
          : "";
    if (!body || body.includes(";") || /\bz\b/.test(body)) return null;
    if (mathRequest(body).operation) return null;
    try {
      return {
        body,
        dx: explainDerivative(body, "x"),
        dy: explainDerivative(body, "y"),
      };
    } catch {
      return null;
    }
  }, [surface]);
  const slope = useMemo(() => {
    if (!explicit) return null;
    const at = (expression: string, x: number, y: number) => {
      try {
        return compileFunction(expression)(x, { ...scope, y });
      } catch {
        return NaN;
      }
    };
    return {
      at,
      z: at(explicit.body, probe.x, probe.y),
      fx: at(explicit.dx.result, probe.x, probe.y),
      fy: at(explicit.dy.result, probe.x, probe.y),
    };
  }, [explicit, scope, probe]);
  const sampled = useMemo(() => {
    try {
      return { data: sampleSurface(surface, scope, domain), error: "" };
    } catch (failure) {
      return {
        data: null,
        error: failure instanceof Error ? failure.message : "تعذر رسم السطح.",
      };
    }
  }, [surface, scope, domain]);
  useEffect(() => {
    if (shape === "surface" && focusSurfaceRef.current) {
      surfaceInputRef.current?.focus();
      focusSurfaceRef.current = false;
    }
  }, [shape]);
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
    const section = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: "#e34965", depthTest: false }),
    );
    section.renderOrder = 2;
    scene.add(section);
    const traces = ["#e28e4e", "#249b8d", "#e28e4e", "#249b8d"].map(
      (color, index) => {
        const line = new THREE.LineSegments(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({
            color,
            depthTest: index < 2,
            transparent: index < 2,
            opacity: index < 2 ? 0.9 : 1,
          }),
        );
        line.renderOrder = 3;
        scene.add(line);
        return line;
      },
    );
    const probe = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 20, 14),
      new THREE.MeshBasicMaterial({ color: "#d8687e", depthTest: false }),
    );
    probe.renderOrder = 4;
    scene.add(probe);
    sceneRef.current = {
      scene,
      mesh,
      camera,
      controls,
      section,
      traces,
      probe,
    };
    const observer = new ResizeObserver(() => {
      const { width, height } = mount.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      if (mesh.userData.surface) frameSurface(camera, controls, mesh.geometry);
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
      const positions = sampled.data?.positions || [];
      const colors: number[] = [];
      for (let index = 2; index < positions.length; index += 3) {
        const color = new THREE.Color().setHSL(
          0.48 + Math.min(1, Math.max(0, (positions[index] + 4) / 8)) * 0.24,
          0.48,
          0.58,
        );
        colors.push(color.r, color.g, color.b);
      }
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3),
      );
      geometry.computeVertexNormals();
      frameSurface(state.camera, state.controls, geometry);
      const sectionPositions: number[] = [];
      for (let index = 0; index < positions.length; index += 9) {
        const intersections: number[][] = [];
        for (const [start, end] of [
          [0, 1],
          [1, 2],
          [2, 0],
        ]) {
          const first = positions.slice(
              index + start * 3,
              index + start * 3 + 3,
            ),
            second = positions.slice(index + end * 3, index + end * 3 + 3);
          if (first[2] < 0 === second[2] < 0) continue;
          const ratio = first[2] / (first[2] - second[2]);
          intersections.push([
            first[0] + ratio * (second[0] - first[0]),
            first[1] + ratio * (second[1] - first[1]),
            0,
          ]);
        }
        if (intersections.length === 2)
          sectionPositions.push(...intersections[0], ...intersections[1]);
      }
      state.section.geometry.dispose();
      state.section.geometry = new THREE.BufferGeometry();
      state.section.geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(sectionPositions, 3),
      );
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
    state.mesh.userData.surface = shape === "surface";
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
  }, [shape, dimension, height, sampled]);
  useEffect(() => {
    if (sceneRef.current)
      sceneRef.current.section.visible = shape === "surface" && showSection;
  }, [shape, showSection]);
  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    const visible =
      shape === "surface" &&
      showTraces &&
      !!explicit &&
      !!slope &&
      Number.isFinite(slope.z) &&
      Math.abs(slope.z) <= 12;
    state.probe.visible = visible;
    state.traces.forEach((line) => (line.visible = visible));
    if (!visible || !explicit || !slope) return;
    const clip = (z: number) => (Math.abs(z) <= 12 ? z : NaN);
    const range = Array.from({ length: 161 }, (_, index) => -4 + index / 20);
    const reach = Array.from({ length: 21 }, (_, index) => -1.2 + index * 0.12);
    const shapes: [number, number, number][][] = [
      range.map((x) => [x, probe.y, clip(slope.at(explicit.body, x, probe.y))]),
      range.map((y) => [probe.x, y, clip(slope.at(explicit.body, probe.x, y))]),
      reach.map((t) => [probe.x + t, probe.y, clip(slope.z + slope.fx * t)]),
      reach.map((t) => [probe.x, probe.y + t, clip(slope.z + slope.fy * t)]),
    ];
    state.traces.forEach((line, index) => {
      line.geometry.dispose();
      line.geometry = new THREE.BufferGeometry();
      line.geometry.setAttribute("position", traceSegments(shapes[index]));
    });
    state.probe.position.set(probe.x, probe.y, slope.z);
  }, [shape, showTraces, explicit, slope, probe]);
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
  function applySurface(expression: string, nextDomain?: number[]) {
    try {
      const selectedDomain =
        nextDomain ||
        surfacePresets.find((preset) => preset.expression === expression)
          ?.domain ||
        domain;
      sampleSurface(expression, scope, selectedDomain);
      setDraft(expression);
      setSurfaceSource(expression);
      setSurface(expression);
      setDomain(selectedDomain);
      setShape("surface");
      setError("");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "تعذر قراءة الدالة في x وy.",
      );
    }
  }
  return (
    <>
      <LabHeader english="3D MATH LAB" title="بُعد آخر للفهم" />
      <MathTools
        expression={surfaceSource}
        variables={["x", "y", "z", "a", "b", "c", "u", "v"]}
        onWrite={() => {
          if (shape === "surface") {
            surfaceInputRef.current?.focus();
          } else {
            focusSurfaceRef.current = true;
            setShape("surface");
          }
        }}
        onApply={applySurface}
        presets={surfacePresets}
      />
      <div className="lab-layout">
        <section className="lab-stage three-stage">
          <div className="section-heading">
            <h2>{shape === "surface" ? "السطح الرياضي" : "المجسم"}</h2>
            <button
              title="إعادة ضبط الكاميرا"
              aria-label="إعادة ضبط الكاميرا"
              onClick={() => {
                const state = sceneRef.current;
                if (state) {
                  state.camera.position.set(10, -12, 10);
                  state.controls.target.set(0, 0, 1);
                  if (shape === "surface")
                    frameSurface(
                      state.camera,
                      state.controls,
                      state.mesh.geometry,
                    );
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
                ? sampled.data?.kind === "implicit"
                  ? "تمثيل تقريبي للمعادلة الضمنية في المجال [-4,4]³. المعادلة التي لا تحتوي z تمتد رأسيًا كأسطوانة. المقطع الأحمر هو التقاطع مع المستوى z=0."
                  : sampled.data?.kind === "parametric"
                    ? "سطح بارامتري بالإحداثيات x(u,v)، y(u,v)، z(u,v). زجاجة كلاين هنا تمثيل متقاطع ذاتيًا في ثلاثة أبعاد، وليست تضمينًا بلا تقاطع."
                    : "سطح ارتفاع z=f(x,y) في المجال [-4,4]²؛ تستبعد القيم غير الحقيقية والارتفاعات خارج [-12,12]."
                : `تغيير ${["sphere", "cylinder", "cone"].includes(shape) ? "نصف القطر" : "طول ضلع القاعدة"} يعيد حساب المجسم وحجمه ومساحته. الحجم يتناسب تكعيبيًا عند تكبير جميع الأبعاد بالنسبة نفسها، والمساحة تربيعيًا.`}
            </p>
          </Insight>
          {shape === "surface" && explicit && slope && showTraces && (
            <Insight title="المشتقات الجزئية على السطح">
              <p>
                النقطة الوردية عند ({fmt(probe.x)}, {fmt(probe.y)},{" "}
                {fmt(slope.z)}). المنحنى البرتقالي هو مقطع السطح عند y ={" "}
                {fmt(probe.y)}، ومماسه المستقيم ميله ∂f/∂x = {fmt(slope.fx)}.
                المنحنى الأخضر هو المقطع عند x = {fmt(probe.x)}، ومماسه ميله
                ∂f/∂y = {fmt(slope.fy)}. كل مشتقة جزئية ترى الحركة في اتجاه واحد
                فقط مع تثبيت المتغير الآخر؛ لذلك قد يصعد السطح في اتجاه x ويهبط
                في اتجاه y عند النقطة نفسها.
              </p>
            </Insight>
          )}
          {shape === "surface" && explicit && (
            <section
              className="calculus-steps"
              aria-label="خطوات الاشتقاق الجزئي"
            >
              {[explicit.dx, explicit.dy].map((item) => (
                <details key={item.variable} open={item.variable === "x"}>
                  <summary dir="ltr">
                    ∂f/∂{item.variable} = {item.display}
                  </summary>
                  <ol className="explained-steps">
                    {item.steps.map((step, index) => (
                      <li key={index}>
                        <h4>{step.operation}</h4>
                        <code dir="ltr">{step.after}</code>
                        <span className="rule-label" dir="auto">
                          {step.rule}
                        </span>
                        <p>{step.reason}</p>
                      </li>
                    ))}
                  </ol>
                </details>
              ))}
            </section>
          )}
          {shape === "surface" && (
            <section aria-label="المكتبة والمستشار للسطح الحالي">
              <div className="section-heading">
                <h2>المكتبة والمستشار</h2>
              </div>
              <LearningPanel
                source={explicit ? explicit.body : surface}
                graphDescription={
                  explicit
                    ? "سطح ارتفاع z = f(x,y)؛ القوانين المناسبة هنا هي المشتقات الجزئية."
                    : "سطح ضمني أو بارامتري؛ لا توجد في المكتبة قوانين متحقق منها آليًا لهذا النوع."
                }
                values={{ ...scope, x: probe.x, y: probe.y }}
                activity={[]}
                running={false}
                showAnimation={false}
                onPlay={() => {}}
                onReset={() => {}}
                onShowSteps={() => {}}
                onClearPreview={() => {}}
                onPreview={() => {}}
              />
            </section>
          )}
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
              ["surface", "سطح رياضي"],
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
                applySurface(draft);
              }}
            >
              <label className="field-label">
                المعادلة أو الإحداثيات الوسيطة
                <MathInput
                  inputRef={surfaceInputRef}
                  label="دالة السطح"
                  value={draft}
                  onChange={setDraft}
                  variables={["x", "y", "z", "a", "b", "c", "u", "v"]}
                />
              </label>
              <label className="field-label">
                اسم السطح
                <select
                  aria-label="اسم السطح"
                  value={
                    surfacePresets.find(
                      (preset) => preset.expression === surface,
                    )?.title || ""
                  }
                  onChange={(event) => {
                    const preset = surfacePresets.find(
                      (item) => item.title === event.target.value,
                    );
                    if (preset) applySurface(preset.expression, preset.domain);
                  }}
                >
                  <option value="" disabled>
                    سطح مخصص
                  </option>
                  {surfacePresets.map((preset) => (
                    <option key={preset.title}>{preset.title}</option>
                  ))}
                </select>
              </label>
              {(sampled.data?.parameters || ["a", "b", "c"]).map((name) => (
                <Slider
                  key={name}
                  label={name}
                  min={0.25}
                  max={3}
                  step={0.05}
                  value={scope[name as keyof typeof scope]}
                  onChange={(value) =>
                    setScope((previous) => ({ ...previous, [name]: value }))
                  }
                />
              ))}
              <label className="field-label">
                <input
                  type="checkbox"
                  checked={showSection}
                  onChange={(event) => setShowSection(event.target.checked)}
                />{" "}
                المقطع في المستوى z = 0
              </label>
              {explicit && (
                <>
                  <label className="field-label">
                    <input
                      type="checkbox"
                      checked={showTraces}
                      onChange={(event) => setShowTraces(event.target.checked)}
                    />{" "}
                    مقاطع المشتقات الجزئية عند نقطة
                  </label>
                  {showTraces && (
                    <>
                      <Slider
                        label="x₀"
                        min={-3.5}
                        max={3.5}
                        step={0.05}
                        value={probe.x}
                        onChange={(x) =>
                          setProbe((previous) => ({ ...previous, x }))
                        }
                      />
                      <Slider
                        label="y₀"
                        min={-3.5}
                        max={3.5}
                        step={0.05}
                        value={probe.y}
                        onChange={(y) =>
                          setProbe((previous) => ({ ...previous, y }))
                        }
                      />
                      <div className="metric">
                        <span>∂f/∂x (المقطع البرتقالي)</span>
                        <strong>{fmt(slope?.fx ?? NaN)}</strong>
                      </div>
                      <div className="metric">
                        <span>∂f/∂y (المقطع الأخضر)</span>
                        <strong>{fmt(slope?.fy ?? NaN)}</strong>
                      </div>
                    </>
                  )}
                </>
              )}
              {sampled.data?.kind === "parametric" &&
                ["u", "v"].map((name, index) => (
                  <div key={name} className="field-label">
                    {name}
                    {["الأدنى", "الأعلى"].map((label, edge) => (
                      <label key={label}>
                        {label}
                        <input
                          aria-label={`${name} ${label}`}
                          type="number"
                          step="0.1"
                          value={domain[index * 2 + edge]}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (Number.isFinite(value))
                              setDomain((previous) =>
                                previous.map((item, position) =>
                                  position === index * 2 + edge ? value : item,
                                ),
                              );
                          }}
                        />
                      </label>
                    ))}
                  </div>
                ))}
              <button className="button primary full-width">تحديث السطح</button>
              <button
                type="button"
                className="what-if"
                onClick={() => applySurface("sin(x)*cos(y)")}
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
          {(error || (shape === "surface" && sampled.error)) && (
            <p className="error-message">{error || sampled.error}</p>
          )}
        </aside>
      </div>
    </>
  );
}
