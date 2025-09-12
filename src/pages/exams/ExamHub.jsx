import { useNavigate } from "react-router-dom";

export default function ExamHub() {
  const navigate = useNavigate();

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Sınav Menüsü</h2>
      <div className="space-x-4" style={{ display: "flex", gap: 12 }}>
        <button
          className="bg-gray-600 text-white px-4 py-2 rounded"
          onClick={() => navigate("/student/exams/history")}
        >
          ESKİ SINAVLAR
        </button>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => navigate("/student/exams/active")}
        >
          SINAV YAP
        </button>
      </div>
    </div>
  );
}
