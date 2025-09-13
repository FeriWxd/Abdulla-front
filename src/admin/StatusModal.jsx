// src/admin/StatusModal.jsx
import React, { useState, useEffect } from "react";
import { apiGet, apiPost } from "../utils/api";
import "../style/StatusModal.css";

// YYYY-MM-DD'yi Asia/Baku'ya göre üret (UTC sapmasını engeller)
const todayAZ = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baku" }).format(new Date());

const StatusModal = ({ student, onClose, onStatusSaved }) => {
  const [statuses, setStatuses] = useState({
    defteriDuzensiz: false,
    dersiDeftereYazmadi: false,
    odevYapilmamis: false,   // ✅ eklendi
    gecikti: false,
    derseGelmedi: false,
    basarili: false,
  });

  const [existingStatuses, setExistingStatuses] = useState([]);
  const today = todayAZ();

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet(`/api/status/${student._id}`);
        const list = Array.isArray(res) ? res : (res?.items || res?.list || []);
        const todayStatuses = list.filter((s) => s.date === today);
        setExistingStatuses(todayStatuses);

        // kombinle (aynı güne tek kayıt olsa da güvenli)
        const combined = todayStatuses.reduce(
          (acc, curr) => ({
            defteriDuzensiz: acc.defteriDuzensiz || !!curr.defteriDuzensiz,
            dersiDeftereYazmadi: acc.dersiDeftereYazmadi || !!curr.dersiDeftereYazmadi,
            odevYapilmamis: acc.odevYapilmamis || !!curr.odevYapilmamis,
            gecikti: acc.gecikti || !!curr.gecikti,
            derseGelmedi: acc.derseGelmedi || !!curr.derseGelmedi,
            basarili: acc.basarili || !!curr.basarili,
          }),
          {
            defteriDuzensiz: false,
            dersiDeftereYazmadi: false,
            odevYapilmamis: false,
            gecikti: false,
            derseGelmedi: false,
            basarili: false,
          }
        );

        setStatuses(combined);
      } catch (err) {
        console.error("Tarixçə məlumatı alınmadı ❌", err);
      }
    })();
  }, [student._id, today]);

  const handleChange = (e) => {
    const { name, checked } = e.target;
    setStatuses((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSave = async () => {
    try {
      // tek gerçek kaynak: statuses (hepsini gönder -> backend tek kaydı upsert/set eder)
      await apiPost("/api/status", {
        studentId: student._id,
        date: today,
        ...statuses,
      });

      alert("Status uğurla qeyd edildi ✅");
      onClose();
      onStatusSaved && onStatusSaved();
    } catch (err) {
      console.error("Status qeyd edilə bilmədi ❌", err);
      alert("Xəta baş verdi, status qeyd olunmadı.");
    }
  };

  const renderHistory = () => {
    if (!existingStatuses.length) return <p>Bu gün üçün status yoxdur.</p>;

    const combined = existingStatuses.reduce(
      (acc, curr) => ({
        defteriDuzensiz: acc.defteriDuzensiz || !!curr.defteriDuzensiz,
        dersiDeftereYazmadi: acc.dersiDeftereYazmadi || !!curr.dersiDeftereYazmadi,
        odevYapilmamis: acc.odevYapilmamis || !!curr.odevYapilmamis,
        gecikti: acc.gecikti || !!curr.gecikti,
        derseGelmedi: acc.derseGelmedi || !!curr.derseGelmedi,
        basarili: acc.basarili || !!curr.basarili,
      }),
      {
        defteriDuzensiz: false,
        dersiDeftereYazmadi: false,
        odevYapilmamis: false,
        gecikti: false,
        derseGelmedi: false,
        basarili: false,
      }
    );

    return (
      <ul className="status-history-list">
        <li>
          <strong>{today}:</strong>
          {combined.defteriDuzensiz && " Dəftəri düzənsizdir |"}
          {combined.dersiDeftereYazmadi && " Dərsi dəftərə yazmadı |"}
          {combined.odevYapilmamis && " Ödev yapılmamış |"}
          {combined.gecikti && " Gecikdi |"}
          {combined.derseGelmedi && " Dərsə gəlmədi |"}
          {combined.basarili && " ⭐ Dərsdə uğurlu oldu |"}
        </li>
      </ul>
    );
  };

  const FIELDS = [
    { key: "defteriDuzensiz", label: "Dəftəri düzənsizdir" },
    { key: "dersiDeftereYazmadi", label: "Dərsi dəftərə yazmadı" },
    { key: "odevYapilmamis", label: "Ödev yapılmamış" }, // ✅ eklendi
    { key: "gecikti", label: "Gecikdi" },
    { key: "derseGelmedi", label: "Dərsə gəlmədi" },
    { key: "basarili", label: "⭐ Dərsdə uğurlu oldu" },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>
          {student.firstName} {student.lastName}
        </h3>

        {FIELDS.map((item) => (
          <label key={item.key}>
            <input
              type="checkbox"
              name={item.key}
              checked={!!statuses[item.key]}
              onChange={handleChange}
            />
            {item.label}
          </label>
        ))}

        <div className="modal-actions">
          <button onClick={handleSave}>Yadda saxla</button>
          <button onClick={onClose}>İmtina et</button>
        </div>

        <div className="modal-history">
          <h4>📅 Bugünkü statuslar</h4>
          {renderHistory()}
        </div>
      </div>
    </div>
  );
};

export default StatusModal;