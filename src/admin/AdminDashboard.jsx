import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "../style/AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();
  const [focusLabel, setFocusLabel] = useState("");

  return (
    <div className="dash-viewport">
      <div className="dash-bg" aria-hidden="true" />
      <div className="dash-shell">
        {/* Header */}
        <header className="dash-header">
          <div className="dash-title-row">
            <h1>İdarə Paneli</h1>
            <span className="dot-live" title="aktiv" />
          </div>
          <p className="dash-sub">Tez giriş üçün qısa yollar</p>

          <div className={`focus-pill ${focusLabel ? "show" : ""}`} aria-live="polite">
            {focusLabel ? `Seçili: ${focusLabel}` : " "}
          </div>
        </header>

        {/* Tiles */}
        <main className="dash-tiles">
          <button
            className="tile accent-teal"
            onClick={() => navigate("/admin-panel")}
            onFocus={() => setFocusLabel("Admin Panel")}
            onBlur={() => setFocusLabel("")}
          >
            <div className="tile-ico" aria-hidden>🧭</div>
            <div className="tile-text">
              <strong>Admin Panel</strong>
              <span>Ayarlar və nəzarət</span>
            </div>
          </button>

          <button
            className="tile accent-orange"
            onClick={() => navigate("/upload-question")}
            onFocus={() => setFocusLabel("Yeni Sual")}
            onBlur={() => setFocusLabel("")}
          >
            <div className="tile-ico" aria-hidden>➕</div>
            <div className="tile-text">
              <strong>Yeni Sual</strong>
              <span>Sual yüklə / test</span>
            </div>
          </button>

          <button
            className="tile accent-blue"
            onClick={() => navigate("/admin-list")}
            onFocus={() => setFocusLabel("Sual Siyahısı")}
            onBlur={() => setFocusLabel("")}
          >
            <div className="tile-ico" aria-hidden>📋</div>
            <div className="tile-text">
              <strong>Sual Siyahısı</strong>
              <span>Filtrlə və idarə et</span>
            </div>
          </button>

          <button
            className="tile accent-blue"
            onClick={() => navigate("/admin/assignments/new")}
            onFocus={() => setFocusLabel("Ödev Oluştur")}
            onBlur={() => setFocusLabel("")}
          >
            <div className="tile-ico" aria-hidden>📝</div>
            <div className="tile-text">
              <strong>Ödev Oluştur</strong>
              <span>Qrup seç • vaxt və bal təyin et</span>
            </div>
          </button>

          {/* ✅ Yoklama – diğerleriyle aynı görünüm */}
          <button
            className="tile accent-green"
            onClick={() => navigate("/admin/attendance")}
            onFocus={() => setFocusLabel("Yoklama")}
            onBlur={() => setFocusLabel("")}
          >
            <div className="tile-ico" aria-hidden>✅</div>
            <div className="tile-text">
              <strong>Yoklama</strong>
              <span>Grup seç • işarətlə</span>
            </div>
          </button>
        </main>

        {/* Footer */}
        <footer className="dash-footer">
          <div className="helper">
            Klaviatura: <span className="kbd">Tab</span> ilə keç •
            <span className="kbd"> Enter</span> ilə aç
          </div>
        </footer>
      </div>
    </div>
  );
}

export default AdminDashboard;