import { useEffect, useState, useCallback } from "react";
import { api } from "../utils/api";
import { Link } from "react-router-dom";
import "../style/Homework.css";

function fmtDate(d) {
  if (!d) return "-";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "-" : x.toLocaleString();
}

function statusLabel(s) {
  switch (s) {
    case "done":
    case "completed":
      return "tamamlandı";
    case "in_progress":
      return "devam edir";
    case "assigned":
    default:
      return "verildi";
  }
}

export default function Homework() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api("/api/assignments-student/box");
      setList(res?.items || []);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Ödev kutusu alınamadı");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="aw-wrap">
      <header className="aw-top">
        <h2>🗃️ Ödev Kutusu</h2>
        <p className="aw-sub">Buradan tüm ödevlerinize ulaşabilirsiniz.</p>
      </header>

      {error && (
        <div className="aw-error" role="alert">
          ⚠️ {error}{" "}
          <button className="btn btn-ghost btn-xs" onClick={load}>Yenilə</button>
        </div>
      )}

      {loading ? (
        <div className="aw-top">
          <p className="aw-sub">Ödevler yükleniyor…</p>
        </div>
      ) : list.length === 0 ? (
        <div className="aw-empty">
          Şu an görünür bir ödev yok.
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={load}>Yenilə</button>
          </div>
        </div>
      ) : (
        <div className="aw-list" aria-live="polite">
          {list.map((it) => {
            const a = it.assignment || {};
            const st = it.status || "assigned";

            // Son başarı (backend lastPercent varsa)
            const lp =
              typeof it.lastPercent === "number"
                ? it.lastPercent
                : (typeof a.lastPercent === "number" ? a.lastPercent : null);
            const percentText = typeof lp === "number" ? `%${lp}` : "—";

            // Konular: assignment.topics -> assignment.topicNames -> item.topicNames
            const topics = Array.isArray(a.topics) && a.topics.length
              ? a.topics
              : (Array.isArray(a.topicNames) && a.topicNames.length
                  ? a.topicNames
                  : (Array.isArray(it.topicNames) ? it.topicNames : []));
            const shownTopics = topics.slice(0, 4);
            const moreCnt = Math.max((topics.length || 0) - shownTopics.length, 0);

            return (
              <div key={it.id} className="aw-item">
                <div className="aw-item-main">
                  <div className="aw-item-title">{a.title || "Ödev"}</div>

                  <div className="aw-item-sub">
                    Soru: <b>{a.questionCount ?? 0}</b> • Puan:{" "}
                    <b>{a.totalPoints ?? 0}</b> • Verilme:{" "}
                    <b>{fmtDate(a.visibleAt)}</b> • Son başarı:{" "}
                    <b>{percentText}</b>
                  </div>

                  {/* Konu etiketleri (varsa) */}
                  {shownTopics.length > 0 && (
                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {shownTopics.map((t, i) => (
                        <span
                          key={`${t}-${i}`}
                          className="tag"
                          title={t}
                          style={{ background: "#eef2ff", borderColor: "#c7d2fe" }}
                        >
                          {t}
                        </span>
                      ))}
                      {moreCnt > 0 && (
                        <span className="tiny muted" title={topics.join(", ")}>
                          +{moreCnt} daha
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="aw-item-aside">
                  <span className={`tag ${st}`}>{statusLabel(st)}</span>
                  {typeof lp === "number" && (
                    <span className="tag completed">%{lp}</span>
                  )}
                  <Link className="btn btn-primary" to={`/student/assignment/${it.id}`}>
                    Aç
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
