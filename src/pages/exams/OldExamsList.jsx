import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../utils/api";

export default function OldExamsList() {
  const [list, setList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const res = await api.get("/exams-student/history");
      if (res?.ok) setList(res.list || []);
    })();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Eski Sınavlar</h2>
      {list.length === 0 && <p>Henüz sınav geçmişiniz yok.</p>}
      {list.map((item) => (
        <div
          key={item.id}
          className="border p-2 mb-2 cursor-pointer hover:bg-gray-100"
          onClick={() => navigate(`/student/exams/review/${item.id}`)}
          title="Detayı aç"
        >
          {new Date(item.date).toLocaleDateString()} — {item.examTitle} — Skor: {item.totalScore}
        </div>
      ))}
    </div>
  );
}
