import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../style/AdminPanel.css";
import { api, getAccessToken } from "../utils/api";

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      navigate("/admin");
      return;
    }

    (async () => {
      try {
        const list = await api.get("/api/users");
        const arr = Array.isArray(list) ? list : (list.items || []);
        setUsers(arr.filter((u) => u.role !== "admin"));
      } catch (err) {
        alert(err?.data?.message || err?.message || "İstifadəçilər yüklənmədi");
        navigate("/admin");
      }
    })();
  }, [navigate]);

  const handleDelete = async (id) => {
    if (!window.confirm("Bu istifadəçini silmək istədiyinizə əminsiniz?")) return;
    try {
      await api.delete(`/api/users/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      alert(err?.data?.message || "Silinmə zamanı xəta baş verdi");
    }
  };

  const handleGroupChange = async (id, newGroup) => {
    try {
      await api.put(`/api/users/${id}`, { group: newGroup });
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, group: newGroup } : u)));
      alert("Qrup uğurla dəyişdirildi");
    } catch (err) {
      alert(err?.data?.message || "Qrup dəyişdirilə bilmədi");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };
  
  const groups = {};
  users.forEach((u) => {
    const g = u.group || "";
    if (g.startsWith("9") || g.startsWith("11")) {
      if (!groups[g]) groups[g] = [];
      groups[g].push(u);
    }
  });
  const sortedGroups = Object.keys(groups).sort();

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>👨‍💼 Admin Paneli</h2>
        <div className="admin-buttons">
          <button onClick={() => navigate("/admin-dashboard")} className="back-btn">
            ← Dashboarda Qayıt
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Çıxış
          </button>
        </div>
      </div>

      <div className="groups-container">
        {sortedGroups.map((group) => (
          <div key={group} className="group-box">
            <h3>{group} Qrupu</h3>
            {groups[group].length === 0 ? (
              <p>Bu qrupda heç bir istifadəçi yoxdur.</p>
            ) : (
              groups[group].map((user) => (
                <div key={user._id} className="user-card">
                  <div>
                    <strong>{user.firstName} {user.lastName}</strong>
                    <p>@{user.username}</p>
                  </div>
                  <select
                    value={user.group || ""}
                    onChange={(e) => handleGroupChange(user._id, e.target.value)}
                  >
                    {["9/A","9/B","9/C","11/A","11/B","11/C"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <button onClick={() => handleDelete(user._id)}>Sil</button>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
export default AdminPanel;
