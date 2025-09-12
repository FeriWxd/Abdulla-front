// src/pages/Menu.jsx
import { useNavigate } from "react-router-dom";
import "../style/Menu.css";
import Navbar from "../Layout/Navbar";

function Menu() {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate("/homework");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="menu-page">
      {/* Üst naviqasiya */}
      <Navbar onLogout={handleLogout} />

      {/* Ana məzmun */}
      <div className="menu-content">
        <div className="cta-box">
          <h1 className="cta-title">📚 Hazırsan?</h1>
          <p className="cta-subtext">
            Ev tapşırıqlarını yerinə yetirərək uğura doğru ilk addımını at!
          </p>
          <button className="cta-button" onClick={handleStart}>
            ✅ Tapşırığa Başla
          </button>
        </div>
      </div>
    </div>
  );
}

export default Menu;
