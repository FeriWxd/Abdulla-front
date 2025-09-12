import { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";
import "../style/Attendance.css";

/** Asia/Baku'ya göre YYYY-MM-DD */
const todayAZ = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baku" }).format(new Date());

/** Kullanılan tüm flag anahtarları (frontend standardı) */
const FLAG_KEYS = [
  "gecikti",
  "derseGelmedi",
  "defteriDuzensiz",
  "dersiDeftereYazmadi",
  "odevYapilmamis", // backend’de yoksa otomatik false olur
  "basarili",
];

/** Server dönen objeden güvenli flag seti üret */
const pickFlags = (obj = {}) => {
  const out = {};
  for (const k of FLAG_KEYS) out[k] = !!obj[k];
  return out;
};

const FLAGS = [
  { key: "gecikti",             label: "Derse gecikti" },
  { key: "derseGelmedi",        label: "Derse gelmedi" },
  { key: "defteriDuzensiz",     label: "Defteri düzensiz" },
  { key: "dersiDeftereYazmadi", label: "Deftere ödevini yazmadı" },
  { key: "odevYapilmamis",      label: "Ödev yapılmamış sitede" },
  { key: "basarili",            label: "Derste başarılı ⭐" },
];

export default function Attendance() {
  const [groups, setGroups] = useState([]);
  const [group, setGroup] = useState("");
  const [date, setDate] = useState(() => todayAZ());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(null); // `${studentId}:${key}`
  const [q, setQ] = useState("");

  // Grupları al
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/users/groups", { noCache: true });
        const items = res.items || [];
        setGroups(items);
        if (items.length === 1) setGroup(items[0].group);
      } catch (e) {
        console.warn("groups yüklenemedi", e);
      }
    })();
  }, []);

  // Seçili grup+tarihe göre yoklama yükle (cache bypass)
  const load = async () => {
    if (!group) return;
    setLoading(true);
    try {
      const res = await api.get("/api/status/by-group", {
        params: { group, date },
        noCache: true,
      });
      const list = res.items || [];
      // Her satır için values alanını güvenli biçimde hazırla
      const normalized = list.map((r) => ({
        ...r,
        values: pickFlags(r.values || r), // server bazı flagleri root’ta da döndürüyor
      }));
      setRows(normalized);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [group, date]);

  // Arama filtresi
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r =>
      r.fullName?.toLowerCase().includes(needle) ||
      r.username?.toLowerCase().includes(needle)
    );
  }, [rows, q]);

  // Toplamlar
  const totals = useMemo(() => {
    const base = { total: rows.length };
    FLAGS.forEach(f => (base[f.key] = rows.filter(r => r.values?.[f.key]).length));
    return base;
  }, [rows]);

  /** ✅ Sağlam toggle: e.target.checked’i alır, tek gerçek kaynak newValues’tır
   *  POST dönen kaydı kullanarak satırı server doğrusu ile günceller (stale/304 problemi yok)
   */
  const toggle = async (row, key, checked) => {
    const studentId = row.studentId;
    const newValues = { ...(row.values || {}), [key]: !!checked };

    // Optimistic UI (hemen göster)
    setRows(prev => prev.map(r =>
      r.studentId === studentId ? { ...r, values: newValues } : r
    ));

    try {
      setSaving(`${studentId}:${key}`);

      // Server’a gönder — tüm değerleri gönderiyoruz ki backend tek kayıt üzerinde $set etsin
      const postRes = await api.post("/api/status", {
        studentId,
        date,
        ...newValues,
      });

      // Server’ın döndürdüğü gerçeği satıra uygula (üstüne yaz)
      const saved = postRes?.status || postRes?.item || postRes || {};
      const serverValues = pickFlags(saved);
      setRows(prev => prev.map(r =>
        r.studentId === studentId ? { ...r, values: serverValues, _id: saved._id || r._id } : r
      ));

      // İstersen burada yeniden fetch de yapabilirsin; gerek yok:
      // await load();

    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="att-wrap">
      <div className="att-head">
        <h1>📋 Yoklama</h1>

        <div className="att-controls">
          <select value={group} onChange={e => setGroup(e.target.value)}>
            <option value="">Grup seç…</option>
            {groups.map(g => (
              <option key={g.group} value={g.group}>
                {g.group} ({g.count})
              </option>
            ))}
          </select>

          <input type="date" value={date} onChange={e => setDate(e.target.value)} />

          <input
            placeholder="Öğrenci ara…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />

          <button className="btn" onClick={load} disabled={!group || loading}>
            Yenile
          </button>
        </div>

        <div className="att-kpis">
          <div className="kpi">Öğrenci: <b>{totals.total}</b></div>
          {FLAGS.map(f => (
            <div key={f.key} className="kpi">
              {f.label}: <b>{totals[f.key] || 0}</b>
            </div>
          ))}
        </div>
      </div>

      {!group ? (
        <div className="att-empty">Önce grup seç.</div>
      ) : loading ? (
        <div className="att-empty">Yükleniyor…</div>
      ) : filtered.length === 0 ? (
        <div className="att-empty">Bu grupta öğrenci bulunamadı.</div>
      ) : (
        <div className="att-table">
          <div className="att-row att-head-row">
            <div className="c-name">Öğrenci</div>
            {FLAGS.map(f => <div key={f.key} className="c-flag">{f.label}</div>)}
            <div className="c-save">—</div>
          </div>

          {filtered.map(r => (
            <div key={r.studentId} className="att-row">
              <div className="c-name">
                <div className="avatar">
                  {(r.fullName || r.username || "?").slice(0,1).toUpperCase()}
                </div>
                <div>
                  <div className="full">{r.fullName}</div>
                  <div className="user">@{r.username}</div>
                </div>
              </div>

              {FLAGS.map(f => (
                <label key={f.key} className="c-flag">
                  <input
                    type="checkbox"
                    checked={!!r.values?.[f.key]}
                    onChange={(e) => toggle(r, f.key, e.target.checked)}
                  />
                </label>
              ))}

              <div className="c-save">
                {saving && saving.startsWith(String(r.studentId) + ":") ? "Kaydediliyor…" : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
