import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../utils/api";

/* Daire grid (1..N) — cevaplanan koyu mavi, boş açık gri */
function BubbleGrid({ count, current, answeredMap, onJump }) {
  const items = Array.from({ length: count }, (_, i) => i + 1);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
      {items.map((n) => {
        const answered = !!answeredMap[n];
        const isCurrent = n === current;
        const base = {
          width: 34, height: 34, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", userSelect: "none", fontWeight: 700,
          border: "1px solid #cbd5e1",
        };
        const style = answered
          ? { ...base, background: "#1e40af", color: "white", borderColor: "#1e40af",
              boxShadow: isCurrent ? "0 0 0 2px #93c5fd inset" : "none" }
          : { ...base, background: "#f1f5f9", color: "#0f172a",
              boxShadow: isCurrent ? "0 0 0 2px #94a3b8 inset" : "none" };
        return (
          <div key={n} style={style} onClick={() => onJump(n)} title={`Soru ${n}`}>
            {n}
          </div>
        );
      })}
    </div>
  );
}

/* Tek şıklı test formu */
function TestAnswer({ value, onChange }) {
  const letters = ["A", "B", "C", "D", "E"];
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
      {letters.map((L) => (
        <label key={L} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="radio"
            name="answerOption"
            value={L}
            checked={value === L}
            onChange={(e) => onChange(e.target.value)}
          />
          <span>{L}</span>
        </label>
      ))}
    </div>
  );
}

/* Açık uçlu (metin) */
function OpenTextAnswer({ value, onChange }) {
  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      placeholder="Cevabınızı yazın…"
      style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 8, padding: 8, marginTop: 8 }}
    />
  );
}

/* Sayısal cevap */
function NumericAnswer({ value, onChange }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => { setLocal(value ?? ""); }, [value]);
  return (
    <input
      type="number"
      step="any"
      value={local}
      onChange={(e) => {
        setLocal(e.target.value);
        const num = e.target.value === "" ? null : Number(e.target.value);
        if (e.target.value === "" || Number.isFinite(num)) onChange(num);
      }}
      placeholder="Örn: 3.14"
      style={{ width: 220, border: "1px solid #cbd5e1", borderRadius: 8, padding: 8, marginTop: 8 }}
    />
  );
}

export default function ExamPlayer() {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // aktiften sınır ve süre
        const meta = await api.get(`/exams-student/active`);
        const paper = meta?.exam?.paperId === paperId ? meta.exam : null;

        // paper detay (items)
        // NOT: backend’de basit GET açmalısın: GET /api/papers/:paperId → items + exam meta
        const detail = await api.get(`/api/papers/${paperId}`);

        const qs = (detail?.items || []).map((it, i) => ({ ...it, order: i + 1 }));
        setItems(qs);

        setExam({
          id: detail?.exam?._id || paper?.id,
          title: detail?.exam?.title || paper?.title || "Sınav",
          solutionsPdfUrl: detail?.exam?.solutionsPdfUrl || null,
          durationSec: detail?.exam?.durationSec || paper?.durationSec || 0,
          startsAt: detail?.exam?.startsAt || paper?.startsAt || null,
        });

        const endTs = detail?.exam?.endsAt
          ? new Date(detail.exam.endsAt).getTime()
          : (meta?.exam?.startsAt
              ? new Date(meta.exam.startsAt).getTime() + (meta.exam.durationSec * 1000)
              : Date.now());
        const remain = Math.max(0, Math.floor((endTs - Date.now()) / 1000));
        setRemaining(remain);
      } finally {
        setLoading(false);
      }
    })();
  }, [paperId]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          onFinish(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const count = items.length || 25;
  const currentOrder = idx + 1;

  const answeredMap = useMemo(() => {
    const m = {};
    Object.keys(answers).forEach((k) => {
      const v = answers[k];
      m[k] = !!(v && (v.option || v.text || v.numeric !== null && v.numeric !== undefined));
    });
    return m;
  }, [answers]);

  const curr = items[idx] || {};
  const qType = (curr?.type || curr?.format || "test").toLowerCase();
  const isTest = qType.includes("test") || qType === "mcq";
  const isNumeric = qType.includes("numeric") || qType.includes("number");
  const isOpen = !isTest && !isNumeric;

  const onSetAnswer = async (payload) => {
    setAnswers((prev) => ({ ...prev, [currentOrder]: payload }));
    try {
      await api.post(`/exams-student/${paperId}/answer`, {
        questionId: curr.questionId || curr._id,
        answerOption: payload.option,
        answerText: payload.text,
        answerNumeric: payload.numeric,
      });
    } catch (e) {
      console.warn("answer save failed", e);
    }
  };

  const onJump = (order) => setIdx(Math.max(0, Math.min(order - 1, count - 1)));
  const onPrev = () => onJump(currentOrder - 1);
  const onNext = () => onJump(currentOrder + 1);

  const fmtTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (x) => String(x).padStart(2, "0");
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
  };

  const onFinish = async (auto = false) => {
    try {
      await api.post(`/exams-student/${paperId}/finish`, {});
    } finally {
      if (!auto) alert("Sınav sonlandırıldı.");
      navigate(`/student/exams/review/${paperId}`);
    }
  };

  if (loading) return <div className="p-4">Yükleniyor…</div>;
  if (!items.length) return <div className="p-4">Sınav içeriği bulunamadı.</div>;

  const a = answers[currentOrder] || {};

  return (
    <div style={{ maxWidth: 980, margin: "18px auto", padding: 12 }}>
      {/* Üst şerit */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingBottom: 10, borderBottom: "1px solid #e2e8f0", marginBottom: 12
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{exam?.title || "Sınav"}</div>
          <div style={{ fontSize: 13, opacity: .7 }}>
            Kalan süre: <b>{fmtTime(remaining)}</b>
          </div>
        </div>
        <button
          onClick={() => { if (window.confirm("Onayla ve sınavı bitir?")) onFinish(false); }}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          ONAYLA
        </button>
      </div>

      {/* Daire grid */}
      <BubbleGrid count={count} current={currentOrder} answeredMap={answeredMap} onJump={onJump} />

      {/* Soru alanı */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, minHeight: 300 }}>
        <div style={{ marginBottom: 8, fontWeight: 700 }}>Soru {currentOrder}</div>

        {curr.imageUrl && (
          <div style={{ marginBottom: 10 }}>
            <img src={curr.imageUrl} alt={`Soru ${currentOrder}`} style={{ maxWidth: "100%", borderRadius: 8 }} />
          </div>
        )}

        {curr.text && <div style={{ whiteSpace: "pre-wrap" }}>{curr.text}</div>}

        <div style={{ marginTop: 12 }}>
          {isTest && <TestAnswer value={a.option || ""} onChange={(opt) => onSetAnswer({ option: opt })} />}
          {isNumeric && <NumericAnswer value={a.numeric ?? null} onChange={(num) => onSetAnswer({ numeric: num })} />}
          {isOpen && <OpenTextAnswer value={a.text || ""} onChange={(t) => onSetAnswer({ text: t })} />}
        </div>
      </div>

      {/* Navigasyon */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <button className="px-4 py-2 rounded border" onClick={onPrev} disabled={currentOrder === 1}>BİR ÖNCEKİ</button>
        <button className="px-4 py-2 rounded border" onClick={onNext} disabled={currentOrder === count}>BİR SONRAKI</button>
      </div>
    </div>
  );
}
