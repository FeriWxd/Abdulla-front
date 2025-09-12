// src/admin/QuestionsList.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiDelete, apiPatch } from "../utils/api";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "../style/QuestionsList.css";

/* -------------------- Helpers -------------------- */

const GEOMETRY_SECTION_NAMES = new Set([
  "Həndəsənin əsas anlayışları",
  "Üçbucaqlar",
  "Çoxbucaqlılar. Dördbucaqlılar",
  "Çevrə və dairə",
]);

const isGeometrySection = (secName = "") => GEOMETRY_SECTION_NAMES.has((secName || "").trim());
const isSayisalSection = (secName = "") => !isGeometrySection(secName);

const qFormat = (q) => String(q?.questionFormat || q?.type || "").toLowerCase();

const questionImage = (q) => q?.questionImage || q?.imageUrl || q?.question_img || "";
const answerImage   = (q) => q?.answerImageUrl || q?.answerImage || q?.solutionImage || "";

/* Safe JSON parse */
const parseMaybeJSON = (val) => {
  if (val == null) return val;
  if (typeof val !== "string") return val;
  try { return JSON.parse(val); } catch { return val; }
};

/* Correct letter (A..E) */
const getCorrectLetter = (q) => {
  if (!q) return null;
  let c =
    q.correctAnswer ??
    q.correct_option ??
    q.correctLetter ??
    q.correct_letter ??
    q.correct ??
    q.answer ??
    q.rightAnswer ??
    q.key ??
    q.answerKey ??
    null;

  if (c && typeof c === "object" && c.option) c = c.option;

  if (Number.isInteger(c)) {
    const arr = ["A","B","C","D","E"];
    return arr[c] || null;
  }
  if (typeof c === "string") c = c.trim().toUpperCase();
  return ["A","B","C","D","E"].includes(c) ? c : null;
};

/* Multi3 correct set */
const getCorrectMulti = (q) => {
  if (!q) return null;
  let m =
    q.correctMulti ??
    q.correct_multi ??
    (q.correct && (q.correct.multi ?? q.correct.correctMulti)) ??
    q.correctSet ??
    q.multiAnswer ??
    q.correct ??
    null;

  if (typeof m === "string" && m.includes("|") && !m.trim().startsWith("{")) {
    const parts = m.split("|").map(s => s.trim());
    const normLine = (s) => s.split("").map(x => x.toUpperCase()).filter(x => "ABCDE".includes(x));
    return { s1: normLine(parts[0]||""), s2: normLine(parts[1]||""), s3: normLine(parts[2]||"") };
  }

  m = parseMaybeJSON(m);
  if (m && (m.s1 || m.s2 || m.s3)) {
    const norm = (arr) =>
      (Array.isArray(arr) ? Array.from(new Set(arr)) : [])
        .map((x) => String(x).toUpperCase())
        .filter((x) => ["A","B","C","D","E"].includes(x))
        .sort();
    return { s1: norm(m.s1), s2: norm(m.s2), s3: norm(m.s3) };
  }

  const s1 = q.s1 || q.set1 || q.firstSet || null;
  const s2 = q.s2 || q.set2 || q.secondSet || null;
  const s3 = q.s3 || q.set3 || q.thirdSet || null;
  if (s1 || s2 || s3) {
    const norm = (v) =>
      (Array.isArray(v) ? v : String(v || "").split(""))
        .map(x => String(x).toUpperCase())
        .filter(x => "ABCDE".includes(x))
        .sort();
    return { s1: norm(s1), s2: norm(s2), s3: norm(s3) };
  }

  return null;
};

/* Numeric/decimal answer — geniş */
const getNumericAnswer = (q) => {
  if (!q) return null;
  let a =
    q.numericAnswer ??
    q.answerNumeric ??
    q.decimalAnswer ??
    q.answer_decimal ??
    q.exactAnswer ??
    q.exact_value ??
    q.decimal_value ??
    q.value ??
    q.trueAnswer ??
    q.true_answer ??
    null;

  if (a && typeof a === "object") {
    a = a.value ?? a.exact ?? a.val ?? null;
  }
  if (typeof a === "string") return a.trim() === "" ? null : a.trim();
  if (typeof a === "number") return a;
  return a ?? null;
};

const isMulti3 = (q) => qFormat(q) === "multi3" || !!getCorrectMulti(q);
const isTest   = (q) => qFormat(q) === "test" || !!getCorrectLetter(q);
const hasNonEmptyMulti3 = (S) =>
  !!(S && ((S.s1 && S.s1.length) || (S.s2 && S.s2.length) || (S.s3 && S.s3.length)));

/* -------------------- Component -------------------- */

export default function QuestionsList() {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);

  const [topicBlocks, setTopicBlocks] = useState([]);
  const [blocksIndex, setBlocksIndex] = useState({});

  const [catFilter, setCatFilter] = useState("sayisal");

  const [editTopicId, setEditTopicId] = useState(null);
  const [editTopicName, setEditTopicName] = useState("");

  const [openBlocks, setOpenBlocks] = useState(() => new Set());
  const contentRef = useRef(null);
  const contentTopRef = useRef(null);

  const [detailMap, setDetailMap] = useState({});
  const mergeDetail = (id, obj) =>
    setDetailMap((p) => ({ ...p, [String(id)]: { ...(p[String(id)]||{}), ...(obj||{}) } }));

  const ensureDetailsForRef = useRef(new Set());

  const isExample = (q) => q.group === "örnek" || q.type === "example";
  const groupLabel = (q) =>
    q.group === "örnek" ? "Örnek" :
    q.group === "ev ödevi" ? "Ev Ödevi" :
    q.type === "example" ? "Örnek" : "Ev Ödevi";

  /* --- NEW: backend order-based sorting (no localStorage override) --- */
  const sortByOrder = (arr) =>
    arr.slice().sort((a, b) =>
      (Number(a.order) || 1e9) - (Number(b.order) || 1e9) ||
      String(a.name || "").localeCompare(String(b.name || ""))
    );

  const sectionsArr = useMemo(
    () => (Array.isArray(sections) ? sections : (sections?.items || sections?.list || [])),
    [sections]
  );

  const sectionsById = useMemo(() => {
    const m = new Map();
    sectionsArr.forEach((s) => m.set(String(s._id), s));
    return m;
  }, [sectionsArr]);

  const topicCategory = (t) => {
    const sec = sectionsById.get(String(t.sectionId));
    if (!sec) return "sayisal";
    return isGeometrySection(sec.name) ? "geometri" : "sayisal";
  };

  const visibleSections = useMemo(() => {
    const base = sectionsArr.filter((s) =>
      catFilter === "geometri" ? isGeometrySection(s.name) : isSayisalSection(s.name)
    );
    return base.slice().sort((a,b) =>
      (Number(a.order)||1e9) - (Number(b.order)||1e9) ||
      String(a.name||"").localeCompare(String(b.name||""))
    );
  }, [sectionsArr, catFilter]);

  const visibleTopics = useMemo(() => {
    const secIds = new Set(visibleSections.map((s) => String(s._id)));
    return topics
      .filter((t) => secIds.has(String(t.sectionId)))
      .sort((a,b) =>
        (Number(a.order)||1e9) - (Number(b.order)||1e9) ||
        String(a.name||"").localeCompare(String(b.name||""))
      );
  }, [topics, visibleSections]);

  const blockNumberOf = (q) => {
    if (Number.isInteger(q.blockNumber)) return q.blockNumber;
    if (q.block?.blockNumber != null)    return q.block.blockNumber;
    const viaIdx = blocksIndex[String(q.blockId)]?.blockNumber;
    return viaIdx != null ? viaIdx : null;
  };

  const filtered = useMemo(() => {
    if (!questions.length || !selectedTopicId) return [];
    return questions.filter((q) => {
      const viaIdx = blocksIndex[String(q.blockId)]?.topicId;
      const t = q.topicId || q.block?.topicId || viaIdx;
      return String(t) === String(selectedTopicId);
    });
  }, [questions, selectedTopicId, blocksIndex]);

  const filteredIdsKey = useMemo(() => filtered.map(q => q._id).join(","), [filtered]);

  const makeGroupsFromFiltered = (arr) => {
    const map = new Map();
    for (const q of arr) {
      const bnRaw = blockNumberOf(q);
      const key = bnRaw != null ? `num:${bnRaw}` : q.blockId ? `id:${q.blockId}` : `id:${q._id}`;
      const display = bnRaw != null ? (bnRaw === 0 ? 1 : bnRaw) : null;
      const title = display ? `Blok ${display}` : "Blok";
      if (!map.has(key)) map.set(key, { key, title, items: [] });
      map.get(key).items.push(q);
    }
    return Array.from(map.values()).sort((a, b) => {
      const an = a.title.match(/\d+/) ? parseInt(a.title.match(/\d+/)[0], 10) : 1e9;
      const bn = b.title.match(/\d+/) ? parseInt(b.title.match(/\d+/)[0], 10) : 1e9;
      return an - bn;
    });
  };

  /* -------------------- Load -------------------- */

  useEffect(() => {
    (async () => {
      await Promise.all([loadSections(), loadBlocksAll(), loadTopics(), loadQuestions()]);
    })();
  }, []);

  const loadSections = async () => {
    try {
      const data = await apiGet("/api/sections");
      const arr = Array.isArray(data) ? data : (data?.items || data?.list || []);
      setSections(arr);
    } catch {
      setSections([]);
    }
  };

  const loadTopics = async () => {
    try {
      const t = await apiGet("/api/topics");
      const arr = Array.isArray(t) ? t : (t?.items || t?.list || []);
      const list = arr
        .map((x) => ({ _id: x._id, name: x.name, sectionId: x.sectionId, order: x.order }))
        .sort((a,b) =>
          (Number(a.order)||1e9) - (Number(b.order)||1e9) ||
          String(a.name||"").localeCompare(String(b.name||""))
        );
      setTopics(list);
    } catch {
      setTopics([]);
    }
  };

  const loadBlocksAll = async () => {
    try {
      const blocks = await apiGet("/api/blocks");
      const arr = Array.isArray(blocks) ? blocks : (blocks?.items || blocks?.list || []);
      const idx = {};
      arr.forEach((b) => {
        idx[String(b._id)] = {
          topicId: b.topicId ? String(b.topicId) : null,
          blockNumber: b.blockNumber ?? null,
        };
      });
      setBlocksIndex(idx);
    } catch {
      setBlocksIndex({});
    }
  };

  const loadQuestions = async () => {
    try {
      const q = await apiGet("/api/questions");
      const raw = Array.isArray(q) ? q : (q?.items || q?.list || []);

      let idx = blocksIndex;
      if (!idx || !Object.keys(idx).length) {
        try {
          const bres = await apiGet("/api/blocks");
          const arr = Array.isArray(bres) ? bres : (bres?.items || bres?.list || []);
          idx = {};
          arr.forEach((b) => {
            idx[String(b._id)] = {
              topicId: b.topicId ? String(b.topicId) : null,
              blockNumber: b.blockNumber ?? null,
            };
          });
          setBlocksIndex(idx);
        } catch {}
      }

      const enriched = raw.map((q) => {
        const fromIdx = idx[String(q.blockId)] || {};
        const topicId =
          q.topicId || q.block?.topicId || fromIdx.topicId || null;
        const blockNumber =
          (Number.isInteger(q.blockNumber) ? q.blockNumber : null) ??
          (q.block && q.block.blockNumber != null ? q.block.blockNumber : null) ??
          (fromIdx.blockNumber != null ? fromIdx.blockNumber : null);

        const block =
          q.block ||
          (fromIdx.topicId || fromIdx.blockNumber != null
            ? { _id: q.blockId, topicId: fromIdx.topicId, blockNumber: fromIdx.blockNumber }
            : undefined);

        return { ...q, topicId, blockNumber, block };
      });

      setQuestions(enriched);
    } catch (err) {
      console.error("❌ Sorular çekilemedi:", err);
    }
  };

  /* -------------------- Topic change -------------------- */

  useEffect(() => {
    const vis = visibleTopics;
    if (!vis.length) { setSelectedTopicId(null); return; }
    setSelectedTopicId((prev) => {
      const still = prev && vis.some((t) => String(t._id) === String(prev));
      return still ? prev : String(vis[0]._id);
    });
  }, [catFilter, visibleTopics]);

  useEffect(() => {
    if (!selectedTopicId) { setTopicBlocks([]); setOpenBlocks(new Set()); return; }
    (async () => {
      try {
        const blks = await apiGet(`/api/topics/${selectedTopicId}/blocks`);
        const arr = Array.isArray(blks) ? blks : (blks?.items || blks?.list || []);
        const sorted = arr.slice().sort((a, b) => {
          const an = a.blockNumber ?? 1e9;
          const bn = b.blockNumber ?? 1e9;
          return an - bn;
        });
        setTopicBlocks(sorted);

        requestAnimationFrame(() => {
          if (contentRef.current) contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
        });

        const s = new Set();
        if (sorted[0]) s.add(String(sorted[0]._id));
        setOpenBlocks(s);
      } catch {
        setTopicBlocks([]);
        setOpenBlocks(new Set());
      }
    })();
  }, [selectedTopicId]);

  /* -------------------- Delete & Edit -------------------- */

  const deleteTopic = async (topicId) => {
    if (!confirm("Bu mövzunu və bağlı blok/soruları silmək istəyirsiniz?")) return;
    try {
      await apiDelete(`/api/topics/${topicId}`);
      setTopics((prev) => prev.filter((t) => String(t._id) !== String(topicId)));
      if (String(selectedTopicId) === String(topicId)) {
        const vis = visibleTopics.filter((t) => String(t._id) !== String(topicId));
        setSelectedTopicId(vis[0]?._id ? String(vis[0]._id) : null);
      }
    } catch (e) {
      alert("Silinmədi: " + (e?.data?.message || e.message));
    }
  };

  const saveTopicName = async () => {
    if (!editTopicId) return;
    const name = (editTopicName || "").trim();
    if (!name) return alert("Konu adı boş olmamalı");
    try {
      const data = await apiPatch(`/api/topics/${editTopicId}`, { name });
      setTopics((prev) =>
        prev.map((t) => (String(t._id) === String(editTopicId) ? { ...t, name: data.name } : t))
      );
      setEditTopicId(null);
      setEditTopicName("");
    } catch (e) {
      alert("Kaydedilemedi: " + (e?.data?.message || e.message));
    }
  };

  const deleteBlockById = async (blockId) => {
    if (!confirm("Bu bloku silmək istərsiniz?")) return;
    try {
      await apiDelete(`/api/blocks/${blockId}`);
      if (selectedTopicId) {
        const blks = await apiGet(`/api/topics/${selectedTopicId}/blocks`);
        const arr = Array.isArray(blks) ? blks : (blks?.items || blks?.list || []);
        const sorted = arr.slice().sort((a, b) => {
          const an = a.blockNumber ?? 1e9;
          const bn = b.blockNumber ?? 1e9;
          return an - bn;
        });
        setTopicBlocks(sorted);
      }
      await Promise.all([loadBlocksAll(), loadQuestions()]);
    } catch (e) {
      alert("Blok silinmədi: " + (e?.data?.message || e.message));
    }
  };

  const deleteQuestion = async (id) => {
    if (!confirm("Bu sualı silmək istərsiniz?")) return;
    try {
      await apiDelete(`/api/questions/${id}`);
      setQuestions((qs) => qs.filter((x) => x._id !== id));
    } catch (e) {
      alert("Sual silinmədi: " + (e?.data?.message || e.message));
    }
  };

  /* -------------------- Drag & Drop -------------------- */
  // Sıralama seed order-a görə sabitdir; DnD reorder pasif.
  const onDragEnd = () => { return; };

  /* -------------------- Details fetch -------------------- */

  const tryFetchDetail = async (id) => {
    const iid = String(id);
    if (!iid) return null;

    const candidates = [
      `/api/questions/${iid}`,
      `/api/questions/${iid}/full`,
      `/api/question/${iid}`,
      `/api/question/${iid}/full`
    ];

    for (const url of candidates) {
      try {
        const res = await apiGet(url);
        if (res && typeof res === "object") return res.item || res.data || res;
      } catch (_) {}
    }
    return null;
  };

  const needDetailFieldsMissing = (q) => {
    if (isTest(q)) {
      // Artık şık görselleri beklemiyoruz; yalnız doğru harf yeter
      const hasCorrect = !!getCorrectLetter(q);
      if (!hasCorrect) return true;
    }
    if (isMulti3(q) && !getCorrectMulti(q)) return true;

    const a = getNumericAnswer(q);
    if (qFormat(q) !== "test" && (a == null || String(a).trim() === "")) return true;

    return false;
  };

  const hydrateVisibleDetails = async (blockQuestions) => {
    const jobs = [];
    for (const base of blockQuestions) {
      const id = String(base._id);
      const merged = { ...base, ...(detailMap[id] || {}) };
      if (ensureDetailsForRef.current.has(id)) continue;
      if (!needDetailFieldsMissing(merged)) continue;
      ensureDetailsForRef.current.add(id);
      jobs.push(
        (async () => {
          const det = await tryFetchDetail(id);
          if (det) mergeDetail(id, det);
        })()
      );
    }
    if (jobs.length) await Promise.all(jobs);
  };

  /* -------------------- UI helpers -------------------- */

  const toggleBlock = (id) => {
    setOpenBlocks((s) => {
      const n = new Set(s);
      const key = String(id);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const openAllBlocks = async () => {
    const s = new Set((topicBlocks?.map((b) => String(b._id)) || []));
    setOpenBlocks(s);
  };

  const closeAllBlocks = () => setOpenBlocks(new Set());

  const topicName =
    visibleTopics.find((x) => String(x._id) === String(selectedTopicId))?.name || "";

  const totalQuestionsInTopic = filtered.length;
  const totalBlocksInTopic = topicBlocks?.length || makeGroupsFromFiltered(filtered).length;

  /* -------------------- ONE effect: opened blocks -> hydrate details -------------------- */
  useEffect(() => {
    const opened = new Set(Array.from(openBlocks).map(String));
    if (!opened.size) return;

    let blockQuestions = [];
    if (topicBlocks && topicBlocks.length) {
      blockQuestions = filtered.filter(
        (q) => opened.has(String(q.blockId)) || opened.has(String(q.block?._id))
      );
    } else {
      const groups = makeGroupsFromFiltered(filtered);
      groups.forEach((grp) => {
        if (opened.has(String(grp.key))) blockQuestions.push(...grp.items);
      });
    }

    if (blockQuestions.length) {
      (async () => { await hydrateVisibleDetails(blockQuestions); })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openBlocks, filteredIdsKey, topicBlocks?.length]);

  /* -------------------- Render helpers (UI) -------------------- */

  // Doğru Set: testdə heç vaxt göstərmə; qalan hər tipdə correctMulti varsa göstər
  const RenderMulti3 = (q) => {
    const S = getCorrectMulti(q);
    const show = (qFormat(q) !== "test") && hasNonEmptyMulti3(S);
    if (!show) return null;
    return (
      <div className="ql-multi3">
        <div className="ql-media-label">Doğru Set</div>
        <div className="ql-multi3-rows">
          <div>1. {S.s1.join(", ")}</div>
          <div>2. {S.s2.join(", ")}</div>
          <div>3. {S.s3.join(", ")}</div>
        </div>
      </div>
    );
  };

  // Numeric/Decimal cavab: test xaric bütün tiplərdə varsa göstər
  const RenderNumeric = (q) => {
    if (qFormat(q) === "test") return null;
    const a = getNumericAnswer(q);
    if (a == null || String(a).trim() === "") return null;
    return (
      <div className="ql-correct-text">
        Doğru Cevap: <b>{String(a)}</b>
      </div>
    );
  };

  // TEST: Yalnız doğru harfi yazdır
  const RenderVariants = (q) => {
    if (!isTest(q)) return null;
    const correct = getCorrectLetter(q);
    if (!correct) return null;
    return <div className="ql-correct-text">Doğru Cevap: <b>{correct}</b></div>;
  };

  /* -------------------- RENDER -------------------- */

  return (
    <div className="ql-page">
      {/* Sidebar */}
      <div className="ql-sidebar">
        <h2 className="ql-side-title">📚 Bölgə & Mövzular</h2>

        <div className="ql-tabs">
          <button
            className={`ql-chip ${catFilter === "sayisal" ? "active" : ""}`}
            onClick={() => setCatFilter("sayisal")}
          >
            Sayısal
          </button>
        </div>
        <div className="ql-tabs">
          <button
            className={`ql-chip ${catFilter === "geometri" ? "active" : ""}`}
            onClick={() => setCatFilter("geometri")}
          >
            Geometri
          </button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="topics-droppable">
            {(provided) => (
              <div
                className="ql-topics"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {(() => {
                  let dndIndex = -1;
                  return visibleSections.map((sec) => {
                    const secTopics = sortByOrder(
                      visibleTopics.filter((t) => String(t.sectionId) === String(sec._id))
                    );
                    if (!secTopics.length) return null;

                    return (
                      <div key={sec._id} className="ql-section">
                        <div className="ql-section-title">{sec.name}</div>

                        {secTopics.map((t) => {
                          const id = String(t._id);
                          const active = String(selectedTopicId) === id;
                          const index = ++dndIndex;
                          const isEditing = String(editTopicId) === id;

                          return (
                            <Draggable draggableId={`topic-${id}`} index={index} key={id}>
                              {(p) => (
                                <div
                                  className="ql-topic-row"
                                  ref={p.innerRef}
                                  {...p.draggableProps}
                                  {...p.dragHandleProps}
                                >
                                  {!isEditing ? (
                                    <>
                                      <button
                                        className={`ql-topic ${active ? "active" : ""}`}
                                        onClick={() => setSelectedTopicId((prev) => (prev === id ? null : id))}
                                        title={t.name}
                                      >
                                        {t.name}
                                      </button>

                                      <div className="ql-topic-actions">
                                        <button
                                          className="ql-tiny"
                                          title="Düzenle"
                                          onClick={() => {
                                            setEditTopicId(id);
                                            setEditTopicName(t.name);
                                          }}
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          className="ql-tiny danger"
                                          title="Sil"
                                          onClick={() => deleteTopic(id)}
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="ql-edit-row">
                                      <input
                                        className="ql-edit-input"
                                        value={editTopicName}
                                        onChange={(e) => setEditTopicName(e.target.value)}
                                        autoFocus
                                      />
                                      <button className="ql-tiny success" onClick={saveTopicName} title="Kaydet">
                                        💾
                                      </button>
                                      <button
                                        className="ql-tiny"
                                        onClick={() => { setEditTopicId(null); setEditTopicName(""); }}
                                        title="Vazgeç"
                                      >
                                        ✖️
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                      </div>
                    );
                  });
                })()}

                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Content */}
      <div className="ql-content" ref={contentRef}>
        <div ref={contentTopRef} style={{ height: 0, width: 0 }} />

        <div className="ql-toolbar">
          <div className="ql-toolbar-left">
            <div className="ql-title">
              🧩 Mövzu: <b>{topicName || "—"}</b>
            </div>
            <div className="ql-stats">
              <span className="ql-stat">Blok: <b>{totalBlocksInTopic}</b></span>
              <span className="ql-dot">•</span>
              <span className="ql-stat">Sual: <b>{totalQuestionsInTopic}</b></span>
            </div>
          </div>
          <div className="ql-toolbar-right">
            <button className="ql-btn ghost" onClick={async () => { await openAllBlocks(); }}>
              Tümünü aç
            </button>
            <button className="ql-btn ghost" onClick={closeAllBlocks}>Hepsini kapat</button>
          </div>
        </div>

        {!selectedTopicId ? (
          <div className="ql-empty">Soldan bir mövzu seçin</div>
        ) : topicBlocks && topicBlocks.length ? (
          topicBlocks.map((b) => {
            const displayNumber = Number.isInteger(b.blockNumber)
              ? b.blockNumber === 0 ? 1 : b.blockNumber
              : null;
            const title = displayNumber ? `Blok ${displayNumber}` : (b.title || "Blok");

            const blockQuestions = filtered.filter(
              (q) => String(q.blockId) === String(b._id) || String(q.block?._id) === String(b._id)
            );

            const opened = openBlocks.has(String(b._id));

            return (
              <section className="ql-block" key={b._id}>
                <header className="ql-block-head">
                  <button
                    className={`ql-accordion ${opened ? "open" : ""}`}
                    onClick={() => toggleBlock(b._id)}
                    aria-expanded={opened}
                  >
                    <span className="ql-acc-ico">{opened ? "▾" : "▸"}</span>
                    <span className="ql-block-title">{title}</span>
                    <span className="ql-count">({blockQuestions.length})</span>
                  </button>

                  <button className="ql-mini danger" title="Bloku sil" onClick={() => deleteBlockById(b._id)}>
                    ❌
                  </button>
                </header>

                {opened && (
                  blockQuestions.length ? (
                    <div className="ql-questions">
                      {blockQuestions.map((qBase) => {
                        const id = String(qBase._id);
                        const q = { ...qBase, ...(detailMap[id] || {}) };

                        return (
                          <article key={qBase._id} className={`ql-qcard ${isExample(q) ? "example" : "homework"}`}>
                            <div className="ql-qheader">
                              <span className="ql-badge">{isExample(q) ? "ÖRNEK" : "EV ÖDEVİ"}</span>
                              <div className="ql-meta">
                                <span>Çətinlik: <b>{q.difficulty}</b></span>
                                <span className="ql-sep">•</span>
                                <span>Kateqoriya: <b>{q.category}</b></span>
                                <span className="ql-sep">•</span>
                                <span>Grup: <b>{groupLabel(q)}</b></span>
                              </div>
                              <button className="ql-mini danger" onClick={() => deleteQuestion(qBase._id)} title="Sil">
                                🗑️
                              </button>
                            </div>

                            <div className="ql-qa">
                              <div className="ql-media">
                                <div className="ql-media-label">Sual</div>
                                <img
                                  src={questionImage(q)}
                                  alt="Sual"
                                  className="ql-img"
                                  onClick={() => setSelectedImage(questionImage(q))}
                                />
                              </div>

                              {answerImage(q) && (
                                <div className="ql-media">
                                  <div className="ql-media-label">Çözüm</div>
                                  <img
                                    src={answerImage(q)}
                                    alt="Çözüm görseli"
                                    className="ql-img"
                                    onClick={() => setSelectedImage(answerImage(q))}
                                  />
                                </div>
                              )}
                            </div>

                            {RenderMulti3(q)}   {/* test değilse multi3 doğru set */}
                            {RenderVariants(q)} {/* test: sadece doğru harf */}
                            {RenderNumeric(q)}  {/* test harici numeric cevap */}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="ql-empty small">Bu blokda sual yoxdur</div>
                  )
                )}
              </section>
            );
          })
        ) : (
          (() => {
            const groups = makeGroupsFromFiltered(filtered);
            if (!groups.length) {
              return <div className="ql-empty">Bu mövzu üçün heç məlumat tapılmadı</div>;
            }
            return groups.map((grp) => {
              const opened = openBlocks.has(String(grp.key));
              return (
                <section className="ql-block" key={grp.key}>
                  <header className="ql-block-head">
                    <button
                      className={`ql-accordion ${opened ? "open" : ""}`}
                      onClick={() => toggleBlock(grp.key)}
                      aria-expanded={opened}
                    >
                      <span className="ql-acc-ico">{opened ? "▾" : "▸"}</span>
                      <span className="ql-block-title">{grp.title}</span>
                      <span className="ql-count">({grp.items.length})</span>
                    </button>
                  </header>

                  {opened && (
                    <div className="ql-questions">
                      {grp.items.map((qBase) => {
                        const id = String(qBase._id);
                        const q = { ...qBase, ...(detailMap[id] || {}) };

                        return (
                          <article key={qBase._id} className={`ql-qcard ${isExample(q) ? "example" : "homework"}`}>
                            <div className="ql-qheader">
                              <span className="ql-badge">{isExample(q) ? "ÖRNEK" : "EV ÖDEVİ"}</span>
                              <div className="ql-meta">
                                <span>Çətinlik: <b>{q.difficulty}</b></span>
                                <span className="ql-sep">•</span>
                                <span>Kateqoriya: <b>{q.category}</b></span>
                                <span className="ql-sep">•</span>
                                <span>Grup: <b>{groupLabel(q)}</b></span>
                              </div>
                            </div>

                            <div className="ql-qa">
                              <div className="ql-media">
                                <div className="ql-media-label">Sual</div>
                                <img
                                  src={questionImage(q)}
                                  alt="Sual"
                                  className="ql-img"
                                  onClick={() => setSelectedImage(questionImage(q))}
                                />
                              </div>

                              {answerImage(q) && (
                                <div className="ql-media">
                                  <div className="ql-media-label">Çözüm</div>
                                  <img
                                    src={answerImage(q)}
                                    alt="Çözüm görseli"
                                    className="ql-img"
                                    onClick={() => setSelectedImage(answerImage(q))}
                                  />
                                </div>
                              )}
                            </div>

                            {RenderMulti3(q)}
                            {RenderVariants(q)}
                            {RenderNumeric(q)}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            });
          })()
        )}

        {selectedImage && (
          <div className="ql-modal" onClick={() => setSelectedImage(null)}>
            <img src={selectedImage} alt="Böyük şəkil" className="ql-modal-img" />
          </div>
        )}
      </div>
    </div>
  );
}
