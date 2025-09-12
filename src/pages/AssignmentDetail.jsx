import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { api, apiPost } from "../utils/api";
import "../style/AssignmentDetail.css";
import Multi3Input from "../components/Multi3Input";

/* ---------- Helpers ---------- */
function qFormat(q = {}) {
  return String(
    q.questionFormat || q.format || q.type2 || q.kind || ""
  ).toLowerCase();
}

function normalizeMulti3(m) {
  const norm = (arr) =>
    (Array.isArray(arr) ? Array.from(new Set(arr)) : [])
      .filter((x) => ["A", "B", "C", "D", "E"].includes(String(x).toUpperCase()))
      .map((x) => String(x).toUpperCase())
      .sort();
  return { s1: norm(m?.s1), s2: norm(m?.s2), s3: norm(m?.s3) };
}

export default function AssignmentDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [openHelp, setOpenHelp] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [numDraft, setNumDraft] = useState({});

  const pickMap = useMemo(() => {
    const m = {};
    if (data?.items) {
      for (const it of data.items) {
        if (it.state?.answerOption) m[it.id] = it.state.answerOption;
      }
    }
    return m;
  }, [data]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api(`/api/assignments-student/${id}/full`);
        setData(res);
      } catch (e) {
        setError(e.message || "Ödev yüklenemedi");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // TEST
  const onPick = async (questionId, letter) => {
    try {
      await apiPost(`/api/assignments-student/${id}/answer`, {
        questionId,
        answerOption: letter,
      });
      setData((prev) => {
        if (!prev) return prev;
        const copy = { ...prev, items: prev.items.map((x) => ({ ...x })) };
        const it = copy.items.find((x) => x.id === questionId);
        if (it) {
          it.state = { ...(it.state || {}), status: "done", answerOption: letter };
        }
        return copy;
      });
    } catch (e) {
      setError(e.message || "Cevap kaydedilemedi");
    }
  };

  // OPEN (ondalık)
  const onPickNumeric = async (questionId) => {
    try {
      const raw = String(numDraft[questionId] ?? "").trim();
      if (!raw) return;

      const normalized = raw.replace(",", ".");
      const value = Number(normalized);
      if (!Number.isFinite(value)) {
        setError("Geçerli bir sayı girin (örn: 3,14 veya 3.14).");
        return;
      }

      await apiPost(`/api/assignments-student/${id}/answer`, {
        questionId,
        answerNumeric: value,
        answerText: raw, // kullanıcı ne girdiyse
      });

      setData((prev) => {
        if (!prev) return prev;
        const copy = { ...prev, items: prev.items.map((x) => ({ ...x })) };
        const it = copy.items.find((x) => x.id === questionId);
        if (it) {
          it.state = { ...(it.state || {}), status: "done", answerNumeric: value };
        }
        return copy;
      });
    } catch (e) {
      setError(e.message || "Cevap kaydedilemedi");
    }
  };

  // MULTI3
  const onPickMulti3 = async (questionId, nextValue) => {
    try {
      const norm = normalizeMulti3(nextValue);
      await apiPost(`/api/assignments-student/${id}/answer`, {
        questionId,
        answerMulti3: norm,
      });
      setData((prev) => {
        if (!prev) return prev;
        const copy = { ...prev, items: prev.items.map((x) => ({ ...x })) };
        const it = copy.items.find((x) => x.id === questionId);
        if (it) {
          it.state = { ...(it.state || {}), status: "done", answerMulti3: norm };
        }
        return copy;
      });
    } catch (e) {
      setError(e.message || "Cevap kaydedilemedi");
    }
  };

  const onFinish = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const res = await apiPost(`/api/assignments-student/${id}/finish`, {});
      setResult(res.summary);
    } catch (e) {
      setError(e.message || "Ödev bitirilemedi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="aw-wrap">
        <section className="aw-hero">
          <div className="aw-hero-title">Ödev yükleniyor…</div>
        </section>
      </div>
    );
  }
  if (!data) return <div className="aw-wrap">Kayıt bulunamadı.</div>;

  const { assignment, items } = data;

  return (
    <div className="aw-wrap">
      <section className="aw-hero">
        <div className="aw-hero-title">📘 {assignment.title}</div>
        <div className="pill">
          {assignment?.dueAt ? `Teslim: ${new Date(assignment.dueAt).toLocaleString()}` : "Bu ödev verildi"}
        </div>
      </section>

      {error && <div className="aw-error">⚠️ {error}</div>}

      {result && (
        <div className="aw-top" style={{ marginBottom: 12 }}>
          <h2>🎉 Sonuç</h2>
          <p className="aw-sub">
            Başarı: <b>%{Math.round(result.scorePercent)}</b> • Tamamlanan soru:{" "}
            <b>{result.completedCount}/{result.questionCount}</b>
          </p>
        </div>
      )}

      <div className="aw-list">
        {items.map((it, idx) => {
          const q = it.question || {};
          const fmt = qFormat(q);
          const picked = it.state?.answerOption ?? null;
          const hasAnyOptionImg = q?.options && Object.values(q.options).some(Boolean);

          return (
            <div key={it.id} className="aw-qcard">
              <div className="aw-qhead">
                <div className="qidx">Soru {idx + 1}</div>
                <span className="tag small">{it.state?.status || "—"}</span>
              </div>

              {q.imageUrl && (
                <div className="img-card">
                  <img src={q.imageUrl} alt={`soru-${idx + 1}`} />
                </div>
              )}

              {/* TEST */}
              {fmt === "test" && (
                <>
                  {hasAnyOptionImg ? (
                    <div className="choices-col" role="listbox" aria-label="Seçenekler">
                      {["A", "B", "C", "D", "E"].map((k) => {
                        const img = q.options?.[k];
                        if (!img) return null;
                        const active = picked === k;
                        return (
                          <button
                            key={k}
                            className={`opt ${active ? "active" : ""}`}
                            aria-pressed={active}
                            onClick={() => onPick(it.id, k)}
                          >
                            <div className="lbl">Seçenek {k}</div>
                            <img className="opt-img" src={img} alt={`secenek-${k}`} />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="choices-row" role="listbox" aria-label="Seçenekler">
                      {["A", "B", "C", "D", "E"].map((k) => {
                        const active = picked === k;
                        return (
                          <button
                            key={k}
                            className={`opt-pill ${active ? "active" : ""}`}
                            aria-pressed={active}
                            onClick={() => onPick(it.id, k)}
                          >
                            {k}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ONDALIK */}
              {fmt === "open" && (
                <div className="numeric-wrap">
                  <label className="numeric-label">Cevabın (ondalık için “,” veya “.” kullanabilirsin)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="örn: 3,14"
                    className="numeric-input"
                    value={numDraft[it.id] ?? ""}
                    onChange={(e) => setNumDraft((p) => ({ ...p, [it.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") onPickNumeric(it.id); }}
                  />
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <button className="btn btn-primary" onClick={() => onPickNumeric(it.id)}>Kaydet</button>
                    <button className="btn btn-ghost" onClick={() => setNumDraft((p) => ({ ...p, [it.id]: "" }))}>
                      Temizle
                    </button>
                  </div>
                </div>
              )}

              {/* MULTI3 */}
              {fmt === "multi3" && (
                <div>
                  <Multi3Input
                    value={it.state?.answerMulti3 || { s1: [], s2: [], s3: [] }}
                    onChange={(next) => onPickMulti3(it.id, next)}
                  />
                  <div className="aw-sub" style={{ fontSize: ".85rem", marginTop: 6 }}>
                    Her alt soru için en az 1, en fazla 2 harf; aynı harfi iki farklı alt soruda kullanamazsın.
                  </div>
                </div>
              )}

              {/* Yardım */}
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button className="btn" onClick={() => setOpenHelp((p) => ({ ...p, [it.id]: !p[it.id] }))}>
                  {openHelp[it.id] ? "Yardımı Gizle" : "Yardım (Örnek) Göster"}
                </button>
                <Link className="btn btn-ghost" to="/student/homework">Ödev Kutusuna Dön</Link>
              </div>

              <div className={`aw-help ${openHelp[it.id] ? "open" : ""}`}>
                {!it.helper && <div className="aw-sub">Bu blok için örnek soru bulunamadı.</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button className="btn btn-primary" onClick={onFinish} disabled={submitting}>
          {submitting ? "Hesaplanıyor…" : "Ödevi Bitir"}
        </button>
        <Link className="btn btn-ghost" to="/student/homework">Ödev Kutusuna Dön</Link>
      </div>
    </div>
  );
}
