// src/admin/ExamsList.jsx
import { useEffect, useState } from "react";
import { api } from "../utils/api";

export default function ExamsList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/exams-admin");
      setList(res?.list || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const publish = async (id) => {
    await api.post(`/exams-admin/${id}/publish`, {});
    await load();
  };
  const unpublish = async (id) => {
    await api.post(`/exams-admin/${id}/unpublish`, {});
    await load();
  };
  const remove = async (id) => {
    if (!window.confirm("Sınav silinsin mi?")) return;
    await api.delete(`/exams-admin/${id}`);
    await load();
  };

  return (
    <div className="p-4" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h1 className="text-2xl font-bold mb-4">Tüm Sınavlar</h1>
      {loading ? <div>Yükleniyor…</div> : (
        <table className="table">
          <thead>
            <tr>
              <th>Başlık</th>
              <th>Sınıf</th>
              <th>Gruplar</th>
              <th>Başlangıç</th>
              <th>Süre (dk)</th>
              <th>Durum</th>
              <th style={{ width: 220 }}>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {list.map((x) => (
              <tr key={x._id}>
                <td>{x.title}</td>
                <td>{x.classLevel}</td>
                <td>{(x.groupNames || []).join(", ")}</td>
                <td>{new Date(x.startsAt).toLocaleString()}</td>
                <td>{Math.round((x.durationSec || 0) / 60)}</td>
                <td>{x.isPublished ? "yayında" : x.status}</td>
                <td>
                  {!x.isPublished ? (
                    <button className="btn btn-primary" onClick={() => publish(x._id)}>Yayınla</button>
                  ) : (
                    <button className="btn" onClick={() => unpublish(x._id)}>Yayından Al</button>
                  )}
                  <button className="btn btn-danger" style={{ marginLeft: 8 }} onClick={() => remove(x._id)}>
                    Sil
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan="7" style={{ textAlign: "center" }}>Kayıt yok.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
