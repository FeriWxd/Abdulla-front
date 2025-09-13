// src/admin/AssignmentCreate.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiPost } from "../utils/api";
import "../style/AssignmentCreate.css";

const CAT_LABEL = { math: "Sayısal", geometry: "Geometri" };
const GEOMETRY_HINTS = [
  "həndəsə","geometri","bucaq","bucaqlar","tənbölən","tənböləni","şüa","parça",
  "üçbucaq","üçbucaqlar","bərabəryanlı","bərabərtərəfli","düzbucaqlı",
  "pifaqor","sinus","kosinus",
  "çoxbucaqlı","dördbucaq","paraleloqram","trapesiya","kvadrat","romb",
  "çevrə","dairə","radius","diametr","vətər","qövs","toxunan","kəsən",
  "mərkəzi bucaq","daxilə çəkilmiş","xaricə çəkilmiş",
];

const looksGeometryText = (s = "") =>
  GEOMETRY_HINTS.some((h) => (s || "").toLowerCase().includes(h));
const fmt = (t) => { try { return new Date(t).toLocaleString(); } catch { return t; } };

// cevabı güvenle diziye çevir
const asArr = (x) => (Array.isArray(x) ? x : x?.items ?? x?.list ?? []);

export default function AssignmentCreate() {
  const [loading, setLoading] = useState(true);

  // data
  const [users, setUsers] = useState([]);
  const [sections, setSections] = useState([]);
  const [topics, setTopics] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [questions, setQuestions] = useState([]);

  // selections
  const [selGroups, setSelGroups] = useState([]);
  const [selTopics, setSelTopics] = useState(new Set());
  const [activeCat, setActiveCat] = useState("math");

  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);

  // list panel
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // hepsini GET ile çek ve normalize et
        const [u, s, t, b, q] = await Promise.all([
          api.get("/api/users"),
          api.get("/api/sections"),
          api.get("/api/topics"),
          api.get("/api/blocks"),
          api.get("/api/questions"),
        ]);
        setUsers(asArr(u));
        setSections(asArr(s));
        setTopics(asArr(t));
        setBlocks(asArr(b));
        setQuestions(asArr(q));
      } catch (e) {
        alert(e.message || "Veriler yüklenemedi");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function loadAssignments() {
    try {
      setListError("");
      setListLoading(true);
      const res = await api.get("/api/assignments-admin", {
        params: { withSummary: 1 },
      });
      setAssignments(asArr(res));
    } catch (e) {
      console.error(e);
      setListError(e?.message || "Liste alınamadı");
      setAssignments([]);
    } finally {
      setListLoading(false);
    }
  }
  useEffect(() => { loadAssignments(); }, []);

  // groups
  const groupNames = useMemo(() => {
    const set = new Set(asArr(users).map((u) => u.group).filter(Boolean));
    return Array.from(set).sort();
  }, [users]);

  // section -> topics
  const topicsBySection = useMemo(() => {
    const by = new Map();
    for (const t of asArr(topics)) {
      const k = String(t.sectionId);
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(t);
    }
    for (const [, arr] of by) arr.sort((a, b) => (a.order || 0) - (b.order || 0));
    return by;
  }, [topics]);

  function sectionCat(sec) {
    const key = (sec.key || "").toLowerCase();
    if (key.startsWith("geometry-")) return "geometry";
    if (key.startsWith("math-")) return "math";
    if (looksGeometryText(sec.name || "")) return "geometry";
    const list = topicsBySection.get(String(sec._id)) || [];
    if (list.some((t) => looksGeometryText(t.name))) return "geometry";
    return "math";
  }

  const sectionsByCat = useMemo(() => {
    const out = { math: [], geometry: [] };
    for (const s of asArr(sections)) out[sectionCat(s)].push(s);
    return out;
  }, [sections, topicsBySection]);

  const topicAvailCount = useMemo(() => {
    const blockToTopic = new Map(asArr(blocks).map((b) => [String(b._id), String(b.topicId)]));
    const hwQs = asArr(questions).filter(
      (q) => q.type === "homework" || q.group === "ev ödevi"
    );
    const count = new Map();
    for (const q of hwQs) {
      const tId = blockToTopic.get(String(q.blockId));
      if (!tId) continue;
      count.set(tId, (count.get(tId) || 0) + 1);
    }
    return count;
  }, [blocks, questions]);

  const totalTopicsSelected = selTopics.size;
  const totalQuestionsWillInclude = useMemo(() => {
    let sum = 0;
    for (const id of selTopics) sum += topicAvailCount.get(String(id)) || 0;
    return sum;
  }, [selTopics, topicAvailCount]);

  const toggleTopic = (id) => {
    const n = new Set(selTopics);
    const key = String(id);
    if (n.has(key)) n.delete(key);
    else n.add(key);
    setSelTopics(n);
  };

  const create = async () => {
    if (!selGroups.length || !selTopics.size) {
      alert("Grup ve konu seçmelisiniz.");
      return;
    }
    setCreating(true);
    try {
      const body = {
        groupNames: selGroups,
        topicIds: Array.from(selTopics),
        publishNow: true,
      };
      const res = await apiPost("/api/assignments-admin/create-by-topics", body);
      setCreated(res.assignment);
      alert(`Ödev oluşturuldu. Toplam soru: ${res.counts?.questions ?? "?"}`);
      await loadAssignments();
    } catch (e) {
      alert(e.message || "Oluşturulamadı");
    } finally {
      setCreating(false);
    }
  };

  async function onDelete(id) {
    if (!confirm("Bu ödevi silmek istiyor musunuz?")) return;
    try {
      await api.delete(`/api/assignments-admin/${id}`);
      await loadAssignments();
    } catch (e) {
      alert(e.message || "Silinemedi");
    }
  }

  async function onTogglePublish(a) {
    try {
      if (a.isPublished) await apiPost(`/api/assignments-admin/${a._id}/unpublish`, {});
      else await apiPost(`/api/assignments-admin/${a._id}/publish`, {});
      await loadAssignments();
    } catch (e) {
      alert(e.message || "İşlem başarısız");
    }
  }

  if (loading) return <div className="ac-wrap">Yükleniyor…</div>;
  const secList = sectionsByCat[activeCat] || [];

  return (
    <div className="ac-wrap">
      <div className="ac-title">Ödev Oluştur</div>
      <div className="ac-sub">
        Grup(lar) ve konu(lar) seç; o konunun tüm bloklarındaki ödev soruları otomatik eklenir.
      </div>

      {/* SON ÖDEVLER */}
      <div className="ac-card" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="ac-title" style={{ fontSize: 18, margin: 0 }}>Son Ödevler</div>
          <button className="mini" onClick={loadAssignments}>Yenile</button>
        </div>

        {listLoading ? (
          <div>Yükleniyor…</div>
        ) : listError ? (
          <div style={{ color: "#b91c1c" }}>{listError}</div>
        ) : !assignments.length ? (
          <div>Henüz ödev yok.</div>
        ) : (
          <div className="assn-table">
            <div className="assn-head">
              <div>Tarih</div><div>Gruplar</div><div>Konular</div>
              <div>Soru</div><div>Yayın</div><div>Aksiyon</div>
            </div>
            {assignments.map((a) => (
              <div className="assn-row" key={a._id}>
                <div>
                  <div className="muted">{a.dateKey}</div>
                  <div className="tiny">{fmt(a.createdAt)}</div>
                </div>
                <div>{(a.groupNames || []).join(", ")}</div>
                <div title={(a.topicNames || []).join(", ")}>
                  {(a.topicNames || []).slice(0, 3).join(", ")}
                  {(a.topicNames || []).length > 3 ? " …" : ""}
                </div>
                <div>{a.questionCount}</div>
                <div>
                  <span className={`badge ${a.isPublished ? "pub" : "unpub"}`}>
                    {a.isPublished ? "Yayında" : "Taslak"}
                  </span>
                </div>
                <div className="acts">
                  <Link className="mini" to={`/admin/assignments/${a._id}/stats`}>İstatistik</Link>
                  <button className="mini" onClick={() => onTogglePublish(a)}>
                    {a.isPublished ? "Yayından Kaldır" : "Yayınla"}
                  </button>
                  <button className="mini danger" onClick={() => onDelete(a._id)}>Sil</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OLUŞTURMA ALANI */}
      <div className="ac-grid">
        {/* SOL: gruplar + özet + oluştur */}
        <div className="ac-card">
          <h3>Gruplar</h3>
          <div className="ac-chiplist" style={{ marginBottom: 10 }}>
            {groupNames.map((g) => {
              const on = selGroups.includes(g);
              return (
                <div
                  key={g}
                  className={`ac-chip ${on ? "on" : ""}`}
                  onClick={() =>
                    setSelGroups((prev) => (on ? prev.filter((x) => x !== g) : [...prev, g]))
                  }
                >
                  {g}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <div className="ac-card" style={{ padding: 10 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div className="ac-kpi"><b>Seçili Grup:</b> {selGroups.length}</div>
                <div className="ac-kpi"><b>Seçili Konu:</b> {totalTopicsSelected}</div>
                <div className="ac-kpi"><b>Toplam Soru (tahmini):</b> {totalQuestionsWillInclude}</div>
              </div>
            </div>

            <button
              className="ac-btn"
              disabled={creating || selGroups.length === 0 || selTopics.size === 0}
              onClick={create}
            >
              {creating ? "Oluşturuluyor…" : "Ödevi Oluştur"}
            </button>

            {created && (
              <div className="ac-card" style={{ marginTop: 6 }}>
                <div><b>ID:</b> {created._id}</div>
                <div><b>Yayın:</b> {created.isPublished ? "Evet" : "Hayır"}</div>
              </div>
            )}
          </div>
        </div>

        {/* SAĞ: bölümler & konular */}
        <div className="ac-card">
          <div className="ac-tabs">
            {["math", "geometry"].map((cat) => (
              <button
                key={cat}
                className={`ac-tab ${activeCat === cat ? "active" : ""}`}
                onClick={() => setActiveCat(cat)}
              >
                {CAT_LABEL[cat]}
              </button>
            ))}
          </div>

          {(sectionsByCat[activeCat] || []).map((sec) => {
            const tList = (new Map(topicsBySection)).get(String(sec._id)) || [];
            if (!tList.length) return null;
            return (
              <div key={sec._id} style={{ marginBottom: 14 }}>
                <div className="ac-section">{sec.name}</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {tList.map((t) => {
                    const selected = selTopics.has(String(t._id));
                    const available = topicAvailCount.get(String(t._id)) || 0;
                    return (
                      <button
                        key={t._id}
                        className="ac-topic-row"
                        style={{ cursor: "pointer", borderColor: selected ? "#4f46e5" : undefined }}
                        onClick={() => toggleTopic(t._id)}
                        title={selected ? "Seçildi" : "Seç"}
                      >
                        <div className="ac-topic-name">{t.name}</div>
                        <div className="ac-available">Soru: {available}</div>
                        <div className="ac-chip" style={{ pointerEvents: "none" }}>
                          {selected ? "Seçildi" : "Seç"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}