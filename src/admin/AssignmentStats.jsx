import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../utils/api";
import { Link, useParams } from "react-router-dom";

export default function AssignmentStats() {
  const { id } = useParams();
  const [stats, setStats] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [groupAvg, setGroupAvg] = useState([]);
  const [studentsPerf, setStudentsPerf] = useState([]);
  const [zoomSrc, setZoomSrc] = useState(null);

  // data fetch
  useEffect(() => {
    (async () => {
      try {
        const a = await api(`/api/assignments-admin/${id}`);
        setAssignment(a.assignment);

        const s = await api(`/api/assignments-admin/${id}/stats`);
        setStats(s.stats);
        setGroupAvg(s.groupAverages || []);
        setStudentsPerf(s.studentsPerf || []);
      } catch (e) {
        alert(e.message);
      }
    })();
  }, [id]);

  // ESC ile zoom kapat
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setZoomSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openZoom = useCallback((src) => setZoomSrc(src || null), []);
  const closeZoom = useCallback(() => setZoomSrc(null), []);

  /* ----------------- Yardımcılar: yüzde/puan ----------------- */
  const toNumLoose = (x) => {
    if (typeof x === "number") return x;
    if (x == null) return null;
    const s = String(x).trim();
    if (!s) return null;
    const cleaned = s.replace(/%/g, "").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  };

  const normalizePercent = (v) => {
    const n = typeof v === "number" ? v : toNumLoose(v);
    if (n == null) return null;
    const scaled = n > 1 ? n : n * 100;
    if (!Number.isFinite(scaled)) return null;
    return Math.round(Math.max(0, Math.min(100, scaled)));
  };

  const fmtPercent = (p) => (p == null ? "—" : `${normalizePercent(p)}%`);

  const computePercent = (score, maxScore) => {
    const s = toNumLoose(score);
    const m = toNumLoose(maxScore);
    if (s == null || m == null || m === 0) return null;
    return normalizePercent((s / m) * 100);
  };

  const getPercent = (row, which) => {
    const directCandidates = [
      row?.[`${which}Percent`],
      row?.[`${which}ScorePercent`],
      row?.[`${which}_percent`],
      row?.[which]?.percent,
      row?.[which]?.scorePercent,
      row?.[which]?.pct,
      row?.[which]?.pctStr,
    ];
    for (const c of directCandidates) {
      const v = normalizePercent(c);
      if (v != null) return v;
    }
    const scoreCandidates = [
      row?.[`${which}Score`],
      row?.[which]?.score,
      row?.[which]?.points,
    ];
    const maxCandidates = [
      row?.maxScore,
      row?.[`${which}MaxScore`],
      row?.[which]?.maxScore,
      stats?.maxScore,
      assignment?.maxScore,
      assignment?.totalPoints,
    ];
    const score = scoreCandidates.find((v) => toNumLoose(v) != null);
    const maxScore = maxCandidates.find((v) => toNumLoose(v) != null);
    return computePercent(score, maxScore);
  };
  /* ----------------------------------------------------------- */

  /* ----------------- Yardımcılar: doğru cevap çıkarımı ----------------- */
  const qFormat = (q) =>
    String(q?.questionFormat || q?.type || q?.format || "").toLowerCase();

  const questionImage = (q) => q?.imageUrl || q?.questionImage || q?.question_img || null;

  const parseMaybeJSON = (val) => {
    if (val == null || typeof val !== "string") return val;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  };

  const getCorrectLetter = (q) => {
    let c =
      q?.correctAnswer ??
      q?.correct_option ??
      q?.correctLetter ??
      q?.correct_letter ??
      q?.correct ??
      q?.answer ??
      q?.rightAnswer ??
      q?.key ??
      q?.answerKey ??
      null;
    if (c && typeof c === "object" && c.option) c = c.option;
    if (Number.isInteger(c)) {
      const arr = ["A", "B", "C", "D", "E"];
      return arr[c] || null;
    }
    if (typeof c === "string") {
      c = c.trim().toUpperCase();
      if (["A", "B", "C", "D", "E"].includes(c)) return c;
    }
    return null;
  };

  const getCorrectMulti = (q) => {
    let m =
      q?.correctMulti ??
      q?.correct_multi ??
      (q?.correct && (q.correct.multi ?? q.correct.correctMulti)) ??
      q?.correctSet ??
      q?.multiAnswer ??
      q?.correct ??
      null;

    if (typeof m === "string" && m.includes("|") && !m.trim().startsWith("{")) {
      const parts = m.split("|").map((s) => s.trim());
      const norm = (s) =>
        s
          .split("")
          .map((x) => x.toUpperCase())
          .filter((x) => "ABCDE".includes(x));
      return { s1: norm(parts[0] || ""), s2: norm(parts[1] || ""), s3: norm(parts[2] || "") };
    }
    m = parseMaybeJSON(m);
    if (m && (m.s1 || m.s2 || m.s3)) {
      const normArr = (arr) =>
        (Array.isArray(arr) ? Array.from(new Set(arr)) : [])
          .map((x) => String(x).toUpperCase())
          .filter((x) => ["A", "B", "C", "D", "E"].includes(x))
          .sort();
      return { s1: normArr(m.s1), s2: normArr(m.s2), s3: normArr(m.s3) };
    }
    return null;
  };

  const getNumericAnswer = (q) => {
    let a =
      q?.numericAnswer ??
      q?.answerNumeric ??
      q?.decimalAnswer ??
      q?.answer_decimal ??
      q?.exactAnswer ??
      q?.exact_value ??
      q?.decimal_value ??
      q?.value ??
      q?.trueAnswer ??
      q?.true_answer ??
      null;
    if (a && typeof a === "object") a = a.value ?? a.exact ?? a.val ?? null;
    if (typeof a === "string") return a.trim() === "" ? null : a.trim();
    if (typeof a === "number") return a;
    return a ?? null;
  };

  const renderCorrectNode = (qObj) => {
    if (!qObj) return null;

    const fmt = qFormat(qObj);
    const multi = getCorrectMulti(qObj);
    const letter = getCorrectLetter(qObj);
    const num = getNumericAnswer(qObj);

    // multi3 (test değilse veya multi formatı özel ise)
    if (multi && ((fmt && fmt.includes("multi")) || (!letter && !num))) {
      const has = (arr) => arr && arr.length;
      if (!has(multi.s1) && !has(multi.s2) && !has(multi.s3)) return null;
      return (
        <div style={{ fontSize: 12, marginTop: 4 }}>
          <b>Doğru set:</b>
          {has(multi.s1) && <div>1) {multi.s1.join(", ")}</div>}
          {has(multi.s2) && <div>2) {multi.s2.join(", ")}</div>}
          {has(multi.s3) && <div>3) {multi.s3.join(", ")}</div>}
        </div>
      );
    }

    // tek şık test
    if (letter) {
      return (
        <div style={{ fontSize: 12, marginTop: 4 }}>
          <b>Doğru:</b> {letter}
        </div>
      );
    }

    // sayısal
    if (num != null && String(num).trim() !== "") {
      return (
        <div style={{ fontSize: 12, marginTop: 4 }}>
          <b>Doğru:</b> {String(num)}
        </div>
      );
    }

    return null;
  };
  /* ----------------------------------------------------------- */

  // sadece sıralama (varsayılan: adı göre)
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const sortedStudents = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const arr = [...(studentsPerf || [])];
    arr.sort((a, b) => {
      if (sortKey === "redoCount")
        return ((a.redoCount || 0) - (b.redoCount || 0)) * dir;

      if (sortKey === "firstPercent") {
        return ((getPercent(a, "first") || 0) - (getPercent(b, "first") || 0)) * dir;
      }
      if (sortKey === "lastPercent") {
        return ((getPercent(a, "last") || 0) - (getPercent(b, "last") || 0)) * dir;
      }
      return a.fullName.localeCompare(b.fullName) * dir; // name
    });
    return arr;
  }, [studentsPerf, sortKey, sortDir, stats, assignment]);

  if (!assignment || !stats) return <div style={{ padding: 20 }}>Yükleniyor…</div>;

  const perQ = stats.perQuestion || {};

  // Soru listesi – qObj’yi de tut
  const qList = (assignment.items || [])
    .filter((it) => it?.questionId || it?.question)
    .map((it, idx) => {
      const qObj = it.questionId || it.question || {};
      return {
        id: String(qObj?._id ?? idx),
        img: questionImage(qObj),
        order: idx + 1,
        qObj,
      };
    });

  return (
    <div style={{ maxWidth: 1100, margin: "20px auto", padding: 16 }}>
      <h2>Ödev İstatistikleri</h2>
      <div style={{ marginBottom: 10 }}>
        <b>Ödev:</b> {assignment.title} • <b>Gruplar:</b>{" "}
        {(assignment.groupNames || []).join(", ")}
      </div>

      {/* Üst KPI’lar */}
      <div
        style={{
          display: "grid",
          gap: 8,
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          marginBottom: 16,
        }}
      >
        <Stat label="Öğrenci Sayısı" value={stats.totalStudents} />
        <Stat label="Ortalama %" value={`${stats.avgScorePercent}%`} />
      </div>

      {/* Grup ortalamaları */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Sınıf (Grup) Ortalamaları
        </div>
        {groupAvg.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Henüz teslim yok.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,minmax(0,1fr))",
              gap: 8,
            }}
          >
            {groupAvg.map((g) => (
              <div
                key={g.groupName}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7 }}>{g.groupName}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {g.avgScorePercent}%
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Teslim: {g.submittedCount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Öğrenci tekrar performansı */}
      <h3>Öğrenci Tekrar Performansı</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
        <thead>
          <tr>
            <Th
              label="Ad Soyad"
              sortKey="name"
              sortKeyState={sortKey}
              sortDir={sortDir}
              setSortKey={setSortKey}
              setSortDir={setSortDir}
            />
            <Th label="Grup" />
            <Th
              label="Tekrar"
              sortKey="redoCount"
              sortKeyState={sortKey}
              sortDir={sortDir}
              setSortKey={setSortKey}
              setSortDir={setSortDir}
            />
            <Th
              label="İlk %"
              sortKey="firstPercent"
              sortKeyState={sortKey}
              sortDir={sortDir}
              setSortKey={setSortKey}
              setSortDir={setSortDir}
            />
            <Th
              label="Son %"
              sortKey="lastPercent"
              sortKeyState={sortKey}
              sortDir={sortDir}
              setSortKey={setSortKey}
              setSortDir={setSortDir}
            />
          </tr>
        </thead>
        <tbody>
          {sortedStudents.map((s) => (
            <tr key={s._id} style={{ borderTop: "1px solid #eee" }}>
              <td>{s.fullName}</td>
              <td>{s.group}</td>
              <td>{s.redoCount ?? 0}</td>
              <td>{fmtPercent(getPercent(s, "first"))}</td>
              <td>{fmtPercent(getPercent(s, "last"))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Soru bazında */}
      <h3>Soru Bazında</h3>
      <div style={{ display: "grid", gap: 12 }}>
        {qList.map((q) => {
          const row =
            perQ[q.id] || {
              done: 0,
              correct: 0,
              wrong: 0,
              blank: 0,
              wrongUsers: [],
              blankUsers: [],
            };
          const correctNode = renderCorrectNode(q.qObj);

          return (
            <div
              key={q.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div style={{ display: "flex", gap: 12 }}>
                {(q.img || correctNode) && (
                  <div>
                    {q.img && (
                      <button
                        type="button"
                        onClick={() => openZoom(q.img)}
                        title="Büyüt (projeksiyon)"
                        style={{
                          border: 0,
                          background: "transparent",
                          padding: 0,
                          cursor: "zoom-in",
                        }}
                      >
                        <img
                          src={q.img}
                          alt=""
                          style={{
                            width: 140,
                            borderRadius: 6,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      </button>
                    )}
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.7,
                        textAlign: q.img ? "center" : "left",
                        marginTop: 4,
                      }}
                    >
                      Soru {q.order}{q.img ? " • Büyüt" : ""}
                    </div>
                    {/* ✅ Doğru cevap burada (görsel altı) */}
                    {correctNode}
                  </div>
                )}

                <div style={{ flex: 1, display: "grid", gap: 6 }}>
                  <div>
                    <b>Cevaplayan:</b> {row.done}
                  </div>
                  <div>
                    <b>Doğru:</b> {row.correct} • <b>Yanlış:</b> {row.wrong} •{" "}
                    <b>Boş:</b> {row.blank}
                  </div>
                  {!q.img && correctNode /* görsel yoksa sağ kolon içinde göster */}
                  <ListLine title="Yanlış Yapanlar" users={row.wrongUsers} />
                  <ListLine title="Boş Bırakanlar" users={row.blankUsers} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <Link
          to="/admin/assignments/new"
          style={{
            display: "inline-block",
            padding: "10px 18px",
            borderRadius: 8,
            background: "#2563eb",
            color: "white",
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            transition: "all 0.2s ease-in-out",
          }}
        >
          ← Admin Panel
        </Link>
      </div>

      {zoomSrc && (
        <div
          onClick={closeZoom}
          style={{
            position: "fixed",
            inset: 0,
            background: "#fff",
            zIndex: 9999,
            cursor: "zoom-out",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 24,
              left: "50%",
              transform: "translateX(-50%)",
              maxWidth: "92vw",
              maxHeight: "92vh",
            }}
          >
            <img
              src={zoomSrc}
              alt="zoom"
              style={{
                display: "block",
                maxWidth: "92vw",
                maxHeight: "92vh",
                objectFit: "contain",
                boxShadow: "0 2px 12px rgba(0,0,0,.12)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function ListLine({ title, users }) {
  const [open, setOpen] = useState(false);
  const names = (users || []).map((u) => `${u.fullName} (${u.group})`);
  const preview = names.slice(0, 4).join(", ");
  return (
    <div>
      <div style={{ fontWeight: 600, marginTop: 4 }}>{title}</div>
      {names.length === 0 ? (
        <div style={{ opacity: 0.7, fontSize: 13 }}>—</div>
      ) : (
        <>
          <div style={{ fontSize: 13 }}>
            {open ? names.join(", ") : preview}
            {names.length > 4 && !open ? " …" : ""}
          </div>
          {names.length > 4 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              style={{
                marginTop: 4,
                fontSize: 12,
                border: "1px solid #e5e7eb",
                padding: "2px 8px",
                borderRadius: 6,
                background: "white",
                cursor: "pointer",
              }}
            >
              {open ? "Gizle" : "Tümünü Göster"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Th({ label, sortKey, sortKeyState, sortDir, setSortKey, setSortDir }) {
  const active = sortKey && sortKeyState === sortKey;
  const toggle = () => {
    if (active) setSortDir(sortDir === "asc" ? "desc" : "asc");
    setSortKey(sortKey);
  };
  return (
    <th
      onClick={sortKey ? toggle : undefined}
      style={{
        textAlign: "left",
        cursor: sortKey ? "pointer" : "default",
        padding: 6,
      }}
    >
      {label} {active ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  );
}

