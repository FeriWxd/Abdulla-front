// src/admin/UploadQuestion.jsx
import { useEffect, useMemo, useState } from "react";
import "../style/UploadQuestion.css";
import { api } from "../utils/api";
import Multi3Input from "../components/Multi3Input";

const GEOMETRY_SECTION_NAMES = new Set([
  "Həndəsənin əsas anlayışları",
  "Üçbucaqlar",
  "Çoxbucaqlılar. Dördbucaqlılar",
  "Çevrə və dairə",
]);

// Multi3 yardımcıları
const LETTERS = ["A","B","C","D","E"];
const normalizeMulti3 = (m) => {
  const norm = (arr) =>
    (Array.isArray(arr) ? Array.from(new Set(arr)) : [])
      .map((x) => String(x).toUpperCase())
      .filter((x) => LETTERS.includes(x))
      .sort();
  return { s1: norm(m?.s1), s2: norm(m?.s2), s3: norm(m?.s3) };
};
const validMulti3 = (m) => {
  const v = normalizeMulti3(m);
  const sizesOk = [v.s1.length, v.s2.length, v.s3.length].every(n => n >= 1 && n <= 2);
  const all = [...v.s1, ...v.s2, ...v.s3];
  const uniqueOk = new Set(all).size === all.length;
  return sizesOk && uniqueOk;
};

export default function UploadQuestion({ fetchQuestions }) {
  const [sections, setSections] = useState([]);
  const [topics, setTopics] = useState([]);
  const [blocks, setBlocks] = useState([]);

  const [sectionId, setSectionId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [blockId, setBlockId] = useState("");

  const [category, setCategory] = useState("sayisal");
  const [newBlockNumber, setNewBlockNumber] = useState("");

  const [questionType, setQuestionType] = useState("test"); // "test" | "open" | "multi3"
  const [difficulty, setDifficulty] = useState("kolay");
  const [group, setGroup] = useState("örnek"); // "örnek" | "ev ödevi"

  const [questionImage, setQuestionImage] = useState(null);
  const [solutionImage, setSolutionImage] = useState(null); // opsiyonel çözüm görseli
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [numericAnswer, setNumericAnswer] = useState("");
  const [correctMulti, setCorrectMulti] = useState({ s1:[], s2:[], s3:[] });

  const [blockSummary, setBlockSummary] = useState({ hasOrnek:false, hasOdev:false });

  const isGeometrySection = (name = "") => GEOMETRY_SECTION_NAMES.has(name.trim());
  const isSayisalSection  = (name = "") => !isGeometrySection(name);

  const filteredSections = useMemo(() => {
    if (!sections.length) return [];
    return sections
      .filter(s => (category === "geometri" ? isGeometrySection(s.name) : isSayisalSection(s.name)))
      .sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));
  }, [sections, category]);

  const blockLabel = (b) =>
    Number.isInteger(b.blockNumber) ? `Blok ${b.blockNumber}` : "Blok";

  const handleImageChange = (e, key) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (key === "solution") setSolutionImage(file);
    else setQuestionImage(file);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/sections");
        setSections(res.items || res || []);
      } catch (e) {
        console.error("Sections load error:", e);
      }
    })();
  }, []);

  useEffect(() => {
    setSectionId(""); setTopicId(""); setBlockId("");
    setTopics([]); setBlocks([]);
    setBlockSummary({ hasOrnek:false, hasOdev:false });
  }, [category]);

  useEffect(() => {
    setTopics([]); setTopicId("");
    setBlocks([]); setBlockId("");
    setBlockSummary({ hasOrnek:false, hasOdev:false });

    if (!sectionId) return;
    (async () => {
      try {
        const res = await api.get(`/api/sections/${sectionId}/topics`);
        const arr = res.items || res || [];
        const sorted = arr.slice().sort((a,b) => (a.order ?? 1e9) - (b.order ?? 1e9));
        setTopics(sorted);
      } catch (e) {
        console.error("Topics load error:", e);
      }
    })();
  }, [sectionId]);

  useEffect(() => {
    setBlocks([]); setBlockId("");
    setBlockSummary({ hasOrnek:false, hasOdev:false });
    setNewBlockNumber("");
    if (!topicId) return;
    loadBlocks(topicId);
  }, [topicId]);

  async function loadBlocks(tid) {
    try {
      const res = await api.get(`/api/topics/${tid}/blocks`);
      const arr = res.items || res || [];
      const sorted = arr.slice().sort((a,b) => {
        const an = a.blockNumber ?? Number.POSITIVE_INFINITY;
        const bn = b.blockNumber ?? Number.POSITIVE_INFINITY;
        return an - bn;
      });
      setBlocks(sorted);
    } catch (e) {
      console.error("Blocks load error:", e);
    }
  }

  useEffect(() => {
    setBlockSummary({ hasOrnek:false, hasOdev:false });
    if (!blockId) return;
    (async () => {
      try {
        const res = await api.get(`/api/blocks/${blockId}/summary`);
        const data = res.item || res || {};
        setBlockSummary({ hasOrnek: !!data.hasOrnek, hasOdev: !!data.hasOdev });
      } catch {}
    })();
  }, [blockId]);

  const groupWarning = useMemo(() => {
    if (!blockId) return "";
    if (blockSummary.hasOrnek && blockSummary.hasOdev)
      return "Bu blok artıq 2 sualla doludur (örnek + ev ödevi).";
    if (group === "örnek" && blockSummary.hasOrnek)
      return "Bu blokda artıq 'örnek' sualı var.";
    if (group === "ev ödevi" && blockSummary.hasOdev)
      return "Bu blokda artıq 'ev ödevi' sualı var.";
    return "";
  }, [blockId, group, blockSummary]);

  const handleCreateBlock = async () => {
    if (!topicId) return alert("Əvvəl Konu seçin.");
    const numVal = newBlockNumber ? parseInt(newBlockNumber, 10) : NaN;
    if (!Number.isInteger(numVal) || numVal < 1) {
      return alert("Düzgün bir blok nömrəsi yazın (ən az 1).");
    }
    try {
      const data = await api.post("/api/blocks/create-by-topic", { topicId, blockNumber: numVal });
      await loadBlocks(topicId);
      setBlockId((data.item?._id) || data._id);
      setNewBlockNumber("");
    } catch (e) {
      const msg = e?.data?.message || "";
      alert("Xəta: " + (msg || "Blok yaratmaq mümkün olmadı"));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sectionId || !topicId || !blockId) {
      return alert("Zəhmət olmasa Bölüm → Konu → Blok seçin.");
    }
    if (groupWarning) {
      const ok = confirm(groupWarning + "\nYenə də davam etmək?");
      if (!ok) return;
    }
    if (!questionImage) return alert("Sual şəkli seçin.");

    const formData = new FormData();
    formData.append("blockId", blockId);
    formData.append("questionType", questionType);
    formData.append("difficulty", difficulty);
    formData.append("category", category);
    formData.append("group", group);
    formData.append("questionImage", questionImage);

    if (solutionImage) {
      formData.append("solutionImage", solutionImage); // opsiyonel
    }

    if (questionType === "test") {
      // TEK GÖRSEL MODU: her zaman true
      formData.append("optionsEmbedded", "true");
      formData.append("correctAnswer", correctAnswer);
    } else if (questionType === "open") {
      const val = String(numericAnswer ?? "").trim();
      if (!val) return alert("Açıq uçlu sualda dəqiq cavab lazımdır.");
      formData.append("numericAnswer", val);
    } else if (questionType === "multi3") {
      if (!validMulti3(correctMulti)) {
        return alert("Multi3: Hər sətirdə 1–2 seçim et və eyni hərfi iki sətirdə istifadə etmə.");
      }
      formData.append("correctMulti", JSON.stringify(normalizeMulti3(correctMulti)));
    }

    try {
      await api.post("/api/questions/upload", formData);
      alert("Sual uğurla əlavə edildi!");
      typeof fetchQuestions === "function" && fetchQuestions();

      // reset
      setQuestionImage(null);
      setSolutionImage(null);
      setCorrectAnswer("A");
      setNumericAnswer("");
      setGroup("örnek");
      setCorrectMulti({ s1:[], s2:[], s3:[] });
    } catch (err) {
      console.error("❌ Upload error:", err);
      const msg = err?.data?.message || "Sual yüklənərkən xəta baş verdi.";
      alert("Xəta: " + msg);
    }
  };

  return (
    <div className="upload-wrapper compact">
      <h2>Sual Əlavə Et</h2>

      <div className="category-switch">
        <button
          type="button"
          className={`chip ${category === "sayisal" ? "active" : ""}`}
          onClick={() => setCategory("sayisal")}
        >
          Sayısal
        </button>
        <button
          type="button"
          className={`chip ${category === "geometri" ? "active" : ""}`}
          onClick={() => setCategory("geometri")}
        >
          Geometri
        </button>
      </div>

      <form className="upload-form grid" onSubmit={handleSubmit}>
        <div className="left-col">
          <label className="inline">
            <span>Bölüm</span>
            <select
              value={sectionId}
              onChange={(e)=>setSectionId(e.target.value)}
              required
            >
              <option value="">Seçin</option>
              {filteredSections.map(s => (
                <option key={s._id} value={s._id}>
                  {s.order ? `Bölüm ${s.order} – ` : ""}{s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="inline">
            <span>Konu</span>
            <select
              value={topicId}
              onChange={(e)=>setTopicId(e.target.value)}
              required
              disabled={!sectionId}
            >
              <option value="">
                {sectionId ? "Seçin" : "Əvvəl bölüm seçin"}
              </option>
              {topics.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </label>

          <label className="inline">
            <span>Blok</span>
            <select
              value={blockId}
              onChange={(e)=>setBlockId(e.target.value)}
              required
              disabled={!topicId}
            >
              <option value="">
                {topicId ? "Seçin" : "Əvvəl konu seçin"}
              </option>
              {blocks.map(b => (
                <option key={b._id} value={b._id}>{blockLabel(b)}</option>
              ))}
            </select>
          </label>

          {blockId && (
            <div className="block-summary">
              <span className={`pill ${blockSummary.hasOrnek ? "ok" : ""}`}>
                Örnek {blockSummary.hasOrnek ? "var" : "yok"}
              </span>
              <span className={`pill ${blockSummary.hasOdev ? "ok" : ""}`}>
                Ev Ödevi {blockSummary.hasOdev ? "var" : "yok"}
              </span>
            </div>
          )}

          {topicId && (
            <div className="new-block">
              <div className="hint">Yeni blok yarat (yalnız nömrə):</div>
              <div className="row">
                <input
                  type="number"
                  placeholder="Blok №"
                  value={newBlockNumber}
                  onChange={(e)=>setNewBlockNumber(e.target.value)}
                  min={1}
                />
                <button type="button" onClick={handleCreateBlock}>+ Əlavə et</button>
              </div>
            </div>
          )}
        </div>

        <div className="right-col">
          <div className="row2">
            <label className="inline">
              <span>Tip</span>
              <select value={questionType} onChange={(e)=>setQuestionType(e.target.value)}>
                <option value="test">Test</option>
                <option value="open">Açıq Uçlu</option>
                <option value="multi3">Multi3</option>
              </select>
            </label>

            <label className="inline">
              <span>Çətinlik</span>
              <select value={difficulty} onChange={(e)=>setDifficulty(e.target.value)}>
                <option value="kolay">Kolay</option>
                <option value="orta">Orta</option>
                <option value="çətin">Çətin</option>
              </select>
            </label>

            <label className="inline">
              <span>Qrup</span>
              <select value={group} onChange={(e)=>setGroup(e.target.value)}>
                <option value="örnek">Örnek</option>
                <option value="ev ödevi">Ev Ödevi</option>
              </select>
            </label>
          </div>

          <label className="stack">
            <span>Sual şəkli</span>
            <input type="file" accept="image/*" onChange={(e)=>handleImageChange(e)} required />
          </label>

          <label className="stack">
            <span>Çözüm görseli (opsiyonel)</span>
            <input type="file" accept="image/*" onChange={(e)=>handleImageChange(e,"solution")} />
          </label>

          {/* TEST: yalnız doğru harfi seçiyoruz */}
          {questionType === "test" && (
            <label className="inline">
              <span>Doğru Cavab</span>
              <select value={correctAnswer} onChange={(e)=>setCorrectAnswer(e.target.value)}>
                {["A","B","C","D","E"].map(opt=> <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </label>
          )}

          {questionType === "open" && (
            <label className="inline">
              <span>Dəqiq Cavab</span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="məs: 12.5"
                value={numericAnswer}
                onChange={(e)=>setNumericAnswer(e.target.value)}
                required
              />
            </label>
          )}

          {questionType === "multi3" && (
            <div className="stack">
              <span>Doğru Set (Multi3)</span>
              <Multi3Input value={correctMulti} onChange={setCorrectMulti} />
              <div className="aw-sub" style={{ fontSize: ".85rem", marginTop: 6 }}>
                Hər sətirdə ən az 1, ən çox 2 seçim; eyni hərf fərqli sətirlərdə istifadə olunmamalıdır.
              </div>
            </div>
          )}

          <button className="submit" type="submit" disabled={!blockId}>Yüklə</button>
        </div>
      </form>
    </div>
  );
}
