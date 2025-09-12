// src/admin/ExamCreate.jsx
import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";

/** ---- Yardımcılar ---- */
const groupsByClass = {
  9: ["9A", "9B", "9C"],
  11: ["11A", "11B", "11C"],
};
const SCALES_9  = [100 / 29, 100 / 29, 200 / 29];
const SCALES_11 = [25 / 8, 25 / 8, 25 / 4];

// Varsayılan konu ağaçları (API'den gelirse bunları ezip kullanırız)
const FALLBACK_TOPICS = {
  numeric: {
    "BÖLÜM 1": Array.from({ length: 10 }, (_, i) => `Konu ${i + 1}`),
    "BÖLÜM 2": Array.from({ length: 10 }, (_, i) => `Konu ${i + 1}`),
  },
  geometry: {
    "BÖLÜM 1": Array.from({ length: 10 }, (_, i) => `Konu ${i + 1}`),
    "BÖLÜM 2": Array.from({ length: 10 }, (_, i) => `Konu ${i + 1}`),
  },
};

function SectionRow({ label, topics, selectedSet, onToggleSection, onToggleTopic }) {
  // bölüm (select all) checkbox tri-state
  const all = topics.every((t) => selectedSet.has(t));
  const some = !all && topics.some((t) => selectedSet.has(t));
  const sectionRef = useRef(null);
  useEffect(() => {
    if (sectionRef.current) sectionRef.current.indeterminate = some;
  }, [some]);

  return (
    <div className="section-block">
      <label className="section-title">
        <input
          ref={sectionRef}
          type="checkbox"
          checked={all}
          onChange={(e) => onToggleSection(label, e.target.checked)}
        />
        <span style={{ marginLeft: 8 }}>{label}</span>
      </label>
      <div className="topics-grid">
        {topics.map((t) => (
          <label key={t} className="topic-item">
            <input
              type="checkbox"
              checked={selectedSet.has(t)}
              onChange={(e) => onToggleTopic(label, t, e.target.checked)}
            />
            <span>{t}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function ExamCreate() {
  const nav = useNavigate();

  /** Adım 0 – SINIF SEÇ */
  const [cls, setCls] = useState(9);
  const [selectedGroups, setSelectedGroups] = useState(new Set(groupsByClass[9]));
  const toggleGroup = (g, on) =>
    setSelectedGroups((prev) => {
      const s = new Set(prev);
      on ? s.add(g) : s.delete(g);
      return s;
    });

  /** Adım 1 – KONULARI SEÇ (SAYISAL/GEOMETRİ) */
  const [topicTree, setTopicTree] = useState(FALLBACK_TOPICS);
  const [selNumeric, setSelNumeric] = useState(new Set());
  const [selGeometry, setSelGeometry] = useState(new Set());
  const [tab, setTab] = useState("numeric"); // "numeric" | "geometry"

  // Konu ağacını API'den alma (opsiyonel)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/api/topics/tree"); // varsa kullanırız
        if (!mounted || !res?.tree) return;
        setTopicTree({
          numeric: res.tree.numeric || FALLBACK_TOPICS.numeric,
          geometry: res.tree.geometry || FALLBACK_TOPICS.geometry,
        });
      } catch {
        // fallback ile devam
      }
    })();
    return () => { mounted = false; };
  }, []);

  const onToggleSection = (cat, section, on) => {
    const tree = topicTree[cat][section] || [];
    const updater = cat === "numeric" ? setSelNumeric : setSelGeometry;
    updater((prev) => {
      const s = new Set(prev);
      tree.forEach((t) => (on ? s.add(`${section}::${t}`) : s.delete(`${section}::${t}`)));
      return s;
    });
  };
  const onToggleTopic = (cat, section, topic, on) => {
    const updater = cat === "numeric" ? setSelNumeric : setSelGeometry;
    updater((prev) => {
      const s = new Set(prev);
      const key = `${section}::${topic}`;
      on ? s.add(key) : s.delete(key);
      return s;
    });
  };

  /** Adım 2 – PARAMETRELERİ GİR (3 PARÇA) */
  const scales = useMemo(() => (cls === 9 ? SCALES_9 : SCALES_11), [cls]);

  const [title, setTitle] = useState("");
  const [dateStr, setDateStr] = useState(""); // yyyy-mm-dd
  const [timeStr, setTimeStr] = useState(""); // HH:MM
  const [durationMin, setDurationMin] = useState(60);

  const [p1, setP1] = useState({
    math: { easy: 0, medium: 0, hard: 0 },
    geom: { easy: 0, medium: 0, hard: 0 },
  });
  const [p2, setP2] = useState({
    math: { easy: 0, medium: 0, hard: 0 },
    geom: { easy: 0, medium: 0, hard: 0 },
  });
  const [p3, setP3] = useState({
    math: { easy: 0, medium: 0, hard: 0 },
    geom: { easy: 0, medium: 0, hard: 0 },
  });

  const [solutionsPdfUrl, setSolutionsPdfUrl] = useState("");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Sınıf değişince grup setini defaultla
  useEffect(() => {
    setSelectedGroups(new Set(groupsByClass[cls]));
  }, [cls]);

  const partCard = (label, state, setState, isTestPart) => (
    <div className="part-card">
      <div className="part-head">
        <b>{label}</b>
        {isTestPart ? <span className="pill pill-blue">Test • -0.25</span> : <span className="pill">Açık uçlu</span>}
        <span className="pill">{`Katsayı: ${scales[ label.endsWith("I") ? 2 : label.endsWith("II") ? 1 : 0 ].toFixed(4)}`}</span>
      </div>
      <div className="rows">
        <div className="row">
          <div className="row-title">SAYISAL</div>
          {["easy", "medium", "hard"].map((k) => (
            <label key={k} className="num-input">
              <span>{k === "easy" ? "kolay" : k === "medium" ? "orta" : "zor"}</span>
              <input
                type="number"
                min="0"
                value={state.math[k]}
                onChange={(e) => setState({ ...state, math: { ...state.math, [k]: Number(e.target.value) } })}
              />
            </label>
          ))}
        </div>
        <div className="row">
          <div className="row-title">GEOMETRİ</div>
          {["easy", "medium", "hard"].map((k) => (
            <label key={k} className="num-input">
              <span>{k === "easy" ? "kolay" : k === "medium" ? "orta" : "zor"}</span>
              <input
                type="number"
                min="0"
                value={state.geom[k]}
                onChange={(e) => setState({ ...state, geom: { ...state.geom, [k]: Number(e.target.value) } })}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const asPayloadPart = (index, state, isTestPart) => ({
    index,
    format: isTestPart ? "test" : "open",
    negative025: !!isTestPart, // I. parça için true
    scale: scales[index - 1],
    questionsConfig: {
      math: { easy: state.math.easy, medium: state.math.medium, hard: state.math.hard },
      geometry: { easy: state.geom.easy, medium: state.geom.medium, hard: state.geom.hard },
    },
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!title) return alert("Başlık zorunludur.");
    if (!selectedGroups.size) return alert("En az bir grup seçiniz.");
    if (!dateStr || !timeStr) return alert("Tarih ve saat giriniz.");

    const startsAt = new Date(`${dateStr}T${timeStr}:00`);
    const durationSec = Number(durationMin) * 60;

    // seçili konu anahtarlarını payload'a bölüp gönderiyoruz
    const splitSelections = (set) => {
      const bySection = {};
      Array.from(set).forEach((key) => {
        const [section, topic] = key.split("::");
        bySection[section] = bySection[section] || [];
        bySection[section].push(topic);
      });
      return bySection;
    };

    const payload = {
      title,
      classLevel: Number(cls),
      groupNames: Array.from(selectedGroups),
      startsAt,
      durationSec,
      solutionsPdfUrl: solutionsPdfUrl || undefined,
      topicSelection: {
        numeric: splitSelections(selNumeric),
        geometry: splitSelections(selGeometry),
      },
      parts: [
        asPayloadPart(1, p1, true),
        asPayloadPart(2, p2, false),
        asPayloadPart(3, p3, false),
      ],
      publishNow: false, // önce kaydet, sonra gerekirse yayınla
    };

    try {
      setBusy(true);
      const res = await api.post("/exams-admin", payload);
      if (res?.ok) {
        alert("Sınav kaydedildi. 'Tüm Sınavlar' ekranından yayınlayabilirsiniz.");
        nav("/admin/exams/list");
      } else {
        alert(res?.message || "Kaydedilemedi.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="exam-create" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 className="title">Sınav Oluştur</h1>

      {/* --- STEP BAR --- */}
      <div className="steps">
        <div className={`step ${step === 0 ? "active" : step > 0 ? "done" : ""}`}>1. Sınıf Seç</div>
        <div className={`step ${step === 1 ? "active" : step > 1 ? "done" : ""}`}>2. Konuları Seç</div>
        <div className={`step ${step === 2 ? "active" : ""}`}>3. Parametreleri Gir</div>
      </div>

      {/* --- STEP 0 --- */}
      {step === 0 && (
        <div className="card">
          <div className="row" style={{ gap: 18, alignItems: "center" }}>
            <label className="inline">
              <span>Sınıf:</span>
              <select value={cls} onChange={(e) => setCls(Number(e.target.value))}>
                <option value={9}>9. sınıf</option>
                <option value={11}>11. sınıf</option>
              </select>
            </label>

            <div className="groups">
              {(groupsByClass[cls] || []).map((g) => (
                <label key={g} className="chk">
                  <input
                    type="checkbox"
                    checked={selectedGroups.has(g)}
                    onChange={(e) => toggleGroup(g, e.target.checked)}
                  />
                  <span>{g}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="actions">
            <button className="btn" onClick={() => nav("/admin/exams")}>İptal</button>
            <button className="btn btn-primary" onClick={() => setStep(1)}>Devam</button>
          </div>
        </div>
      )}

      {/* --- STEP 1 --- */}
      {step === 1 && (
        <div className="card">
          <div className="tabs">
            <button className={`tab ${tab === "numeric" ? "active" : ""}`} onClick={() => setTab("numeric")}>
              SAYISAL
            </button>
            <button className={`tab ${tab === "geometry" ? "active" : ""}`} onClick={() => setTab("geometry")}>
              GEOMETRİ
            </button>
          </div>

          {/* SAYISAL */}
          {tab === "numeric" && (
            <>
              {Object.entries(topicTree.numeric).map(([section, topics]) => (
                <SectionRow
                  key={section}
                  label={section}
                  topics={topics}
                  selectedSet={new Set(Array.from(selNumeric).filter(k => k.startsWith(section + "::")).map(k => k.split("::")[1]))}
                  onToggleSection={(sec, on) => onToggleSection("numeric", sec, on)}
                  onToggleTopic={(sec, t, on) => onToggleTopic("numeric", sec, t, on)}
                />
              ))}
            </>
          )}

          {/* GEOMETRİ */}
          {tab === "geometry" && (
            <>
              {Object.entries(topicTree.geometry).map(([section, topics]) => (
                <SectionRow
                  key={section}
                  label={section}
                  topics={topics}
                  selectedSet={new Set(Array.from(selGeometry).filter(k => k.startsWith(section + "::")).map(k => k.split("::")[1]))}
                  onToggleSection={(sec, on) => onToggleSection("geometry", sec, on)}
                  onToggleTopic={(sec, t, on) => onToggleTopic("geometry", sec, t, on)}
                />
              ))}
            </>
          )}

          <div className="actions">
            <button className="btn" onClick={() => setStep(0)}>Geri</button>
            <button className="btn btn-primary" onClick={() => setStep(2)}>Devam</button>
          </div>
        </div>
      )}

      {/* --- STEP 2 --- */}
      {step === 2 && (
        <form className="card" onSubmit={onSubmit}>
          <div className="grid">
            <label>
              <span>Sınav Başlığı</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: 18.09.2025 Sınav 5" />
            </label>

            <label>
              <span>Sınav Tarihi</span>
              <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            </label>

            <label>
              <span>Başlama Saati</span>
              <input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} />
            </label>

            <label>
              <span>Sınav Süresi (dakika)</span>
              <input type="number" min="1" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
            </label>

            <label className="col-span">
              <span>Çözüm PDF URL (opsiyonel)</span>
              <input value={solutionsPdfUrl} onChange={(e) => setSolutionsPdfUrl(e.target.value)} placeholder="https://..." />
            </label>
          </div>

          {/* Parçalar */}
          {partCard("I. PARÇA",  p1, setP1, true)}
          {partCard("II. PARÇA", p2, setP2, false)}
          {partCard("III. PARÇA", p3, setP3, false)}

          <div className="actions">
            <button type="button" className="btn" onClick={() => setStep(1)}>Geri</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Kaydediliyor..." : "ONAYLA"}
            </button>
          </div>
        </form>
      )}

      {/* Stil */}
      <style>{`
        .title { font-size: 22px; font-weight: 800; margin: 14px 0; }
        .steps { display:flex; gap:8px; margin: 8px 0 16px; }
        .step { padding:8px 12px; border-radius:12px; background:#e2e8f0; font-weight:700; }
        .step.active{ background:#2563eb; color:#fff; }
        .step.done{ background:#93c5fd; color:#0f172a; }
        .card { border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:14px; }
        .row { display:flex; flex-wrap:wrap; }
        .inline > span { margin-right:8px; font-weight:600; }
        .groups { display:flex; gap:10px; flex-wrap:wrap; }
        .chk { display:flex; align-items:center; gap:6px; border:1px solid #cbd5e1; padding:6px 10px; border-radius:8px; }
        .tabs { display:flex; gap:8px; margin-bottom:12px; }
        .tab { padding:8px 12px; border:1px solid #cbd5e1; border-radius:999px; background:#f8fafc; }
        .tab.active { background:#2563eb; color:#fff; border-color:#2563eb; }
        .section-block { margin-bottom:12px; }
        .section-title { display:flex; align-items:center; font-weight:700; }
        .topics-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:8px; margin-top:8px; }
        .topic-item { display:flex; align-items:center; gap:6px; border:1px solid #e2e8f0; border-radius:8px; padding:6px 8px; }
        .grid { display:grid; gap:12px; grid-template-columns: repeat(4, 1fr); }
        .grid label { display:flex; flex-direction:column; gap:6px; }
        .grid input, select { border:1px solid #cbd5e1; border-radius:8px; padding:8px; }
        .col-span { grid-column: 1 / -1; }
        .part-card { border:1px dashed #cbd5e1; border-radius:12px; padding:12px; margin:12px 0; }
        .part-head { display:flex; gap:8px; align-items:center; margin-bottom:10px; }
        .rows .row { gap:18px; margin-bottom:6px; }
        .row-title { min-width:90px; font-weight:700; }
        .num-input { display:flex; align-items:center; gap:6px; }
        .num-input input { width:90px; }
        .pill { background:#e5e7eb; padding:4px 8px; border-radius:999px; font-size:12px; }
        .pill-blue { background:#bfdbfe; }
        .actions { display:flex; justify-content:flex-end; gap:10px; margin-top:10px; }
        .btn { padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; }
        .btn-primary { background:#2563eb; color:#fff; border-color:#2563eb; }
        @media (max-width: 900px) { .grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
