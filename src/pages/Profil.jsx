// src/Profil.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setAccessToken } from "../utils/api";
import "../style/Profil.css";
import Navbar from "../Layout/Navbar";

function fmtDate(d) {
  if (!d) return "-";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "-" : x.toLocaleString();
}
function initials(u) {
  const a = (u?.firstName || "").trim()[0] || "";
  const b = (u?.lastName || "").trim()[0] || "";
  return (a + b || u?.username?.[0] || "?").toUpperCase();
}
function chipClass(st) {
  if (st === "completed") return "chip chip-green";
  if (st === "in_progress") return "chip chip-amber";
  return "chip chip-blue";
}

/* ✅ Yoklama rozetleri — odevYapilmamis eklendi */
const FLAG_META = [
  { key: "gecikti",             label: "Gecikti",              icon: "⏰", tone: "warn"   },
  { key: "derseGelmedi",        label: "Derse gelmedi",        icon: "🚫", tone: "danger" },
  { key: "defteriDuzensiz",     label: "Defteri nizamsız",     icon: "📒", tone: "warn"   },
  { key: "dersiDeftereYazmadi", label: "Deftere ödev yazmadı", icon: "📝", tone: "warn"   },
  { key: "odevYapilmamis",      label: "Ödev yapılmamış",      icon: "📘", tone: "warn"   }, // ← EKLENDİ
  { key: "basarili",            label: "Derste başarılı",      icon: "⭐", tone: "ok"     },
];

export default function Profile() {
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [u, box] = await Promise.all([
          api.get("/api/profile"),
          api.get("/api/assignments-student/box"),
        ]);
        if (!mounted) return;
        setUser(u?.user || u || null);
        setAssignments(Array.isArray(box?.items) ? box.items : []);
      } catch {
        setAccessToken(null);
        navigate("/login");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [navigate]);

  const stats = useMemo(() => {
    const list = assignments || [];
    const total = list.length;
    const completed = list.filter((x) => x.status === "completed").length;
    const percents = list
      .map((x) => (typeof x.lastPercent === "number" ? x.lastPercent : null))
      .filter((n) => n !== null);
    const avg = percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : 0;
    const best = percents.length ? Math.max(...percents) : 0;
    const worst = percents.length ? Math.min(...percents) : 0;
    return { total, completed, avg, best, worst };
  }, [assignments]);

  const handleLogout = () => {
    setAccessToken(null);
    navigate("/login");
  };

  /* Profildeki “Yoxlama Tarixi” */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const limit = showAll ? 1000 : 15;
        const res = await api.get(`/api/status/me?limit=${limit}`);
        if (mounted) setChecks(res.items || []);
      } catch {
        if (mounted) setChecks([]);
      }
    })();
    return () => { mounted = false; };
  }, [showAll]);

  return (
    <>
      <Navbar />
      <div className="profile-wrapper">
        <div className="profile-card">
          <div className="profile-header">
            <div className="avatar">{user ? initials(user) : "…"}</div>
            <div className="head-texts">
              <h2 className="profile-title">👤 Şəxsi Məlumatlar</h2>
              {user && <p className="muted">Son giriş: {fmtDate(user?.lastLoginAt)}</p>}
            </div>
          </div>

          {loading ? (
            <div className="loading-text">Yüklənir...</div>
          ) : user ? (
            <>
              {/* Bilgi blokları */}
              <div className="info-grid">
                <div className="info-item"><div className="label">Ad</div><div className="value">{user.firstName || "—"}</div></div>
                <div className="info-item"><div className="label">Soyad</div><div className="value">{user.lastName || "—"}</div></div>
                <div className="info-item"><div className="label">İstifadəçi adı</div><div className="value">{user.username || "—"}</div></div>
                <div className="info-item"><div className="label">Qrup</div><div className="value">{user.group || "—"}</div></div>
                {user.email && <div className="info-item"><div className="label">Email</div><div className="value">{user.email}</div></div>}
                {user.phone && <div className="info-item"><div className="label">Telefon</div><div className="value">{user.phone}</div></div>}
              </div>

              {/* Hızlı istatistikler */}
              <div className="kpi-grid">
                <div className="kpi"><div className="kpi-label">Toplam Ödev</div><div className="kpi-value">{stats.total}</div></div>
                <div className="kpi"><div className="kpi-label">Tamamlanan</div><div className="kpi-value">{stats.completed}</div></div>
                <div className="kpi"><div className="kpi-label">Ortalama Son Başarı</div><div className="kpi-value">%{stats.avg}</div></div>
                <div className="kpi"><div className="kpi-label">En İyi • En Düşük</div><div className="kpi-value">%{stats.best} <span className="sep">•</span> %{stats.worst}</div></div>
              </div>

              {/* Son ödevler */}
              <div className="section-title">Son Ödevler</div>
              {assignments && assignments.length ? (
                <div className="assn-list">
                  {assignments.slice(0, 6).map((it) => {
                    const a = it.assignment || {};
                    return (
                      <div key={it.id} className="assn-row">
                        <div className="assn-main">
                          <div className="assn-title">{a.title || "Günlük Ödev"}</div>

                          <div className="assn-meta">
                            <span>Soru: <b>{a.questionCount ?? 0}</b></span>
                            <span className="dot">•</span>
                            <span>Verilme: <b>{fmtDate(a.visibleAt)}</b></span>
                          </div>

                          {Array.isArray(a.topics) && a.topics.length > 0 && (
                            <div className="topics-row">
                              <span className="topics-label">Konular:</span>
                              <div className="topics">
                                {a.topics.slice(0, 6).map((t, i) => (
                                  <span className="topic-pill" key={i} title={t}>
                                    {t}
                                  </span>
                                ))}
                                {a.topics.length > 6 && (
                                  <span
                                    className="topic-more"
                                    title={a.topics.slice(6).join(", ")}
                                  >
                                    +{a.topics.length - 6} daha
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="assn-aside">
                          <span className={chipClass(it.status)}>
                            {it.status === "completed"
                              ? "tamamlandı"
                              : it.status === "in_progress"
                              ? "devam ediyor"
                              : "verildi"}
                          </span>
                          {typeof it.lastPercent === "number" && (
                            <span className="chip chip-soft">%{it.lastPercent}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty">Henüz ödev görünmüyor.</div>
              )}

              {/* YOKLAMA TARİHÇESİ */}
              <div className="section-title">
                Yoxlama Tarixi ({showAll ? "hamısı" : "son 15"})
                <button className="link-btn" onClick={() => setShowAll((v) => !v)} style={{ marginLeft: 12 }}>
                  {showAll ? "Yalnız son 15" : "Hepsini gör"}
                </button>
              </div>

              {checks.length ? (
                <div className="assn-list">
                  {checks.map((c) => {
                    const active = FLAG_META.filter(f => !!c[f.key]); // ← odevYapilmamis artık yakalanır
                    return (
                      <div key={c._id || c.date} className="assn-row">
                        <div className="assn-main">
                          <div className="assn-title">{c.date}</div>
                          <div className="assn-sub">
                            <div className="flags-row">
                              {active.length ? active.map(f => (
                                <span key={f.key} className={`flag flag--${f.tone}`}>
                                  <span className="flag-ico" aria-hidden>{f.icon}</span>
                                  <span className="flag-text">{f.label}</span>
                                </span>
                              )) : (
                                <span className="flag flag--muted">Kayıt yok</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty">Hələ qeyd yoxdur.</div>
              )}

              {/* Butonlar */}
              <div className="profile-buttons">
                <button className="profile-btn logout-btn" onClick={handleLogout}>Çıxış</button>
                <button className="profile-btn menu-btn" onClick={() => navigate("/Menu")}>🔙 Menü</button>
              </div>
            </>
          ) : (
            <p className="loading-text">Yüklənir...</p>
          )}
        </div>
      </div>
    </>
  );
}

