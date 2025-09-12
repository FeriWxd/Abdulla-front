// src/admin/ExamsHome.jsx
import { useNavigate } from "react-router-dom";

export default function ExamsHome() {
  const navigate = useNavigate();
  return (
    <div className="p-4" style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 className="text-2xl font-bold mb-4">Sınavlar</h1>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="tile accent-blue" onClick={() => navigate("/admin/exams/new")}>
          <div className="tile-ico" aria-hidden>🆕</div>
          <div className="tile-text">
            <strong>Sınav Oluştur</strong>
            <span>9/11 • 3 parça • takvim</span>
          </div>
        </button>

        <button className="tile accent-teal" onClick={() => navigate("/admin/exams/list")}>
          <div className="tile-ico" aria-hidden>📚</div>
          <div className="tile-text">
            <strong>Tüm Sınavlar</strong>
            <span>Listele • yayınla • kapat</span>
          </div>
        </button>
      </div>
    </div>
  );
}
