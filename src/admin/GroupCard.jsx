// src/admin/GroupCard.jsx
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../utils/api";
import StatusModal from "./StatusModal";
import StatusHistoryModal from "./StatusHistory"; // dosya adı böyleyse doğru
import "../style/GroupCard.css";

// ---- Yardımcılar ----
// "Gün" 04:00'da değişsin: 00:00–03:59 arası hala "dün" sayılır
const todayKeyBaku4 = () => {
  const shifted = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 saat geri
  return shifted.toISOString().slice(0, 10); // YYYY-MM-DD
};

// Sayfayı bir sonraki 04:00'da otomatik yenile
const scheduleReloadAt4 = () => {
  const now = new Date();
  const next = new Date();
  next.setHours(4, 0, 0, 0); // bugün 04:00
  if (now >= next) next.setDate(next.getDate() + 1); // geçtiyse yarın 04:00
  const ms = next.getTime() - now.getTime();
  setTimeout(() => window.location.reload(), ms);
};

const GroupCard = ({ groupName }) => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [historyStudent, setHistoryStudent] = useState(null);
  const [todayStatusMap, setTodayStatusMap] = useState({});
  const [savingStar, setSavingStar] = useState({}); // { [studentId]: true/false }

  useEffect(() => {
    scheduleReloadAt4();
  }, []);

  const fetchTodayStatuses = async (studentsList) => {
    const today = todayKeyBaku4();
    const statusMap = {};

    for (const student of studentsList) {
      try {
        const res = await apiGet(`/api/status/${student._id}`);
        const todayStatus = (res || []).find((s) => s.date === today);
        statusMap[student._id] = todayStatus || null;
      } catch {
        statusMap[student._id] = null;
      }
    }

    setTodayStatusMap(statusMap);
  };

  const fetchStudents = async () => {
    try {
      const response = await apiGet("/api/users");
      const cleanGroupName = groupName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

      const filtered = (response || []).filter((student) => {
        if (student.role === "admin") return false;
        const cleanStudentGroup = (student.group || "")
          .replace(/[^a-zA-Z0-9]/g, "")
          .toLowerCase();
        return cleanStudentGroup === cleanGroupName;
      });

      setStudents(filtered);
      await fetchTodayStatuses(filtered);
    } catch (error) {
      console.log("İstifadəçilər alınmadı", error);
    }
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupName]);

  const getStatusEmoji = (status) => {
    if (!status) return "🟩";
    const { defteriDuzensiz, dersiDeftereYazmadi, gecikti, derseGelmedi } = status;
    if (derseGelmedi || defteriDuzensiz || dersiDeftereYazmadi) return "🟥";
    if (gecikti) return "🟨";
    return "🟩";
  };

  const getUnmarkedStudents = () => {
    return students.filter((student) => {
      const status = todayStatusMap[student._id];
      return (
        !status ||
        (!status.defteriDuzensiz &&
          !status.dersiDeftereYazmadi &&
          !status.gecikti &&
          !status.derseGelmedi &&
          !status.basarili)
      );
    });
  };

  // ⭐ Optimistic toggle
  const toggleBasariliStatus = async (studentId) => {
    if (savingStar[studentId]) return;

    const today = todayKeyBaku4();
    const currentStatus = todayStatusMap[studentId];
    const newBasarili = !(currentStatus?.basarili || false);

    // 1) Optimistic UI
    setTodayStatusMap((prev) => {
      const next = { ...prev };
      const base =
        next[studentId] || {
          studentId,
          date: today,
          defteriDuzensiz: false,
          dersiDeftereYazmadi: false,
          gecikti: false,
          derseGelmedi: false,
          basarili: false,
        };
      next[studentId] = { ...base, basarili: newBasarili };
      return next;
    });
    setSavingStar((s) => ({ ...s, [studentId]: true }));

    // 2) API
    try {
      await apiPost("/api/status", {
        studentId,
        date: today,
        defteriDuzensiz: currentStatus?.defteriDuzensiz || false,
        dersiDeftereYazmadi: currentStatus?.dersiDeftereYazmadi || false,
        gecikti: currentStatus?.gecikti || false,
        derseGelmedi: currentStatus?.derseGelmedi || false,
        basarili: newBasarili,
      });

      await fetchTodayStatuses(students);
    } catch {
      // 3) Hata → geri al
      setTodayStatusMap((prev) => {
        const next = { ...prev };
        if (currentStatus) next[studentId] = currentStatus;
        else delete next[studentId];
        return next;
      });
      alert("Yıldız kaydedilemedi. Tekrar deneyin.");
    } finally {
      setSavingStar((s) => ({ ...s, [studentId]: false }));
    }
  };

  return (
    <div className="group-card">
      <h2>{groupName}</h2>

      <ul>
        {students.length === 0 && <li>Bu qrupda tələbə yoxdur.</li>}
        {students.map((student) => {
          const st = todayStatusMap[student._id];
          const active = !!st?.basarili;
          const saving = !!savingStar[student._id];
          return (
            <li key={student._id} className="student-line">
              <div className="left-tools">
                <span className="status-emoji">{getStatusEmoji(st)}</span>

                <button
                  className="status-btn"
                  onClick={() => setSelectedStudent(student)}
                >
                  ✓
                </button>

                <button
                  className="history-btn"
                  onClick={() => setHistoryStudent(student)}
                >
                  🕘
                </button>

                <button
                  className={`star-button ${active ? "active" : ""} ${saving ? "saving" : ""}`}
                  onClick={() => toggleBasariliStatus(student._id)}
                  aria-pressed={active}
                  title={active ? "Başarılı (kaldırmak için tıkla)" : "Başarılı işaretle"}
                  disabled={saving}
                >
                  <span className="star-emoji" aria-hidden>⭐</span>
                </button>
              </div>

              <div className="student-name">
                {student.firstName} {student.lastName}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="unmarked-section">
        <h4>📌 Bugünkü statusu yazılmayanlar:</h4>
        <ul>
          {getUnmarkedStudents().length === 0 ? (
            <li>Hamı üçün status yazılıb ✅</li>
          ) : (
            getUnmarkedStudents().map((student) => (
              <li key={student._id}>
                {student.firstName} {student.lastName}
                <button
                  className="status-button"
                  onClick={() => setSelectedStudent(student)}
                >
                  Yaz
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {selectedStudent && (
        <StatusModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onStatusSaved={() => fetchTodayStatuses(students)}
        />
      )}

      {historyStudent && (
        <StatusHistoryModal
          student={historyStudent}
          onClose={() => setHistoryStudent(null)}
        />
      )}
    </div>
  );
};

export default GroupCard;
