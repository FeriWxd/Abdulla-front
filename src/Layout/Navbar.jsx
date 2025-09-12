import { Link, useNavigate } from "react-router-dom";
import { setAccessToken } from "../utils/api";
import "../style/Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    setAccessToken(null);
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <h2 className="logo">
        <Link to="/">Platform</Link>
      </h2>

      <ul className="nav-links">
        <li>
          <Link to="/profile" className="nav-item">
            Profil
          </Link>
        </li>
        <li>
          <button className="nav-item logout-btn" onClick={handleLogout}>
            Çıxış
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
