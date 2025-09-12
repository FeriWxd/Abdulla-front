// src/admin/StatusHistory.jsx
import React, { useEffect, useState } from "react";
import { apiGet } from "../utils/api";
import "../style/StatusModal.css";

// YYYY-MM-DD'yi Asia/Baku'ya göre üret (UTC sapmasını engeller)
const todayAZ = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baku" }).format(new Date());

const StatusHistoryModal = ({ student, onClose }) => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiGet(`/api/status/${student._id}`);
        const list = Array.isArray(res) ? res : (res?.items || res?.list || []);
        // son tarihler üstte olacak şekilde sırala
        const sorted = list.slice().sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
        if (mounted) setHistory(sorted);
      } catch (err) {
        console.error("Status tarixçəsi alına bilmədi ❌", err);
        if (mounted) setHistory([]);
      }
    })();
    return () => { mounted = false; };
  }, [student._id]);

  const today = todayAZ();

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>
          Status Tarixçəsi – {student.firstName} {student.lastName}
        </h3>

        {!(history && history.length) ? (
          <p>Bu şagird üçün status tapılmadı.</p>
        ) : (
          <ul>
            {history.map((entry) => (
              <li key={entry._id}>
                <strong>{entry.date}{entry.date === today ? " (bugün)" : ""}:</strong>
                <ul>
                  {entry.defteriDuzensiz && <li>📝 Dəftəri düzənsizdir</li>}
                  {entry.dersiDeftereYazmadi && <li>📕 Dərsi dəftərə yazmadı</li>}
                  {entry.odevYapilmamis && <li>📘 Ödev yapılmamış</li>}
                  {entry.gecikti && <li>⏰ Gecikdi</li>}
                  {entry.derseGelmedi && <li>🚫 Dərsə gəlmədi</li>}
                  {entry.basarili && <li>⭐ Dərsdə uğurlu oldu</li>}
                </ul>
              </li>
            ))}
          </ul>
        )}

        <div className="modal-actions">
          <button onClick={onClose}>Bağla</button>
        </div>
      </div>
    </div>
  );
};

export default StatusHistoryModal;
