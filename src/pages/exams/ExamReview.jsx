import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../utils/api";

export default function ExamReview() {
  const { paperId } = useParams();
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // GET /exams-student/:paperId/review → { exam:{title,solutionsPdfUrl}, items:[{correct,given,isCorrect}] }
        const res = await api.get(`/exams-student/${paperId}/review`);
        setExam(res.exam || {});
        setItems((res.items || []).map((x, i) => ({ order: i + 1, ...x })));
      } finally {
        setLoading(false);
      }
    })();
  }, [paperId]);

  const count = items.length || 25;
  const numbers = useMemo(() => Array.from({ length: count }, (_, i) => i + 1), [count]);

  if (loading) return <div className="p-4">Yükleniyor…</div>;
  if (!items.length) return <div className="p-4">İçerik bulunamadı.</div>;

  const row = (getter) => (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${count}, minmax(24px, 1fr))`, gap: 6 }}>
      {numbers.map((n) => (
        <div key={n} style={{ textAlign: "center", fontFamily: "monospace" }}>
          {getter(n)}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 980, margin: "18px auto", padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ fontWeight: 800 }}>{exam?.title || "Sınav"}</h2>
        {exam?.solutionsPdfUrl && (
          <a
            href={exam.solutionsPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-emerald-600 text-white px-4 py-2 rounded"
            title="Çözümleri PDF olarak aç"
          >
            ÇÖZÜMÜNÜ GÖR (PDF)
          </a>
        )}
      </div>

      {/* 1..N şeridi */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${count}, minmax(24px, 1fr))`, gap: 6 }}>
          {numbers.map((n) => {
            const it = items[n - 1];
            const bg = it?.isCorrect === true ? "#dcfce7" : it?.isCorrect === false ? "#fee2e2" : "#f1f5f9";
            return (
              <div key={n} style={{ textAlign: "center", padding: "6px 0", borderRadius: 8, background: bg }}>
                {n}
              </div>
            );
          })}
        </div>
      </div>

      {/* Doğru / Verilen */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Doğru cevaplar:</div>
        {row((n) => (items[n - 1]?.correct ?? "—"))}
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Verilen cevaplar:</div>
        {row((n) => (items[n - 1]?.given ?? "—"))}
      </div>
    </div>
  );
}
