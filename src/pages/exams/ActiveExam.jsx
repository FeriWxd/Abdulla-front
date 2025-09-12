import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../utils/api";

const fmt = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (x) => String(x).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export default function ActiveExam() {
  const [exam, setExam] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const res = await api.get("/exams-student/active");
      if (res?.ok) setExam(res.exam || null);
    })();
  }, []);

  if (!exam) return <div className="p-4">Şu an aktif sınav yok</div>;

  const onStart = async () => {
    try {
      await api.post(`/exams-student/${exam.paperId}/start`, {});
      navigate(`/student/exams/play/${exam.paperId}`);
    } catch (e) {
      alert(e?.message || "Başlatılamadı");
    }
  };

  return (
    <div className="p-4 border rounded shadow">
      <h2 className="text-lg font-bold mb-2">{exam.title}</h2>
      <p>Başlangıç: {new Date(exam.startsAt).toLocaleString()}</p>
      <p>Kalan Süre: {fmt(exam.remainingSec || 0)}</p>

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
        disabled={(exam.remainingSec || 0) <= 0}
        onClick={onStart}
      >
        BAŞLA
      </button>
    </div>
  );
}
