// src/pages/Login.jsx (veya mevcut konumun)
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../utils/api";
import "../style/Login.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // api.post -> DOĞRUDAN response.data döndürür
      const res = await api.post("/api/login", { username, password });

      const {
        token,
        accessToken,
        user,
        role: roleFromRoot,
        message,
        success,
      } = res || {};

      if (success === false) throw new Error(message || "Giriş uğursuzdur");

      const jwt = token || accessToken || null;

      // Sadece refresh-cookie tabanlı oturum ise jwt olmayabilir
      if (!jwt) {
        const role = roleFromRoot || user?.role || "user";
        alert("Giriş uğurludur!");
        if (role === "admin") navigate("/admin-dashboard");
        else navigate("/Menu");
        return;
      }

      localStorage.setItem("token", jwt);

      // Role’ü JWT’den okumaya çalış (başarısız olursa fallback kullan)
      let role = roleFromRoot || user?.role || "user";
      try {
        const payload = JSON.parse(atob(jwt.split(".")[1]));
        role = payload?.role || role;
      } catch (_) {}

      alert("Giriş uğurludur!");
      if (role === "admin") navigate("/admin-dashboard");
      else navigate("/Menu");
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.response?.data?.message ||
          err.message ||
          "Giriş zamanı xəta baş verdi"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <p className="title">Giriş</p>
      <p className="message">Hesabınıza daxil olun və davam edin</p>
      {error && <p className="error-message">{error}</p>}

      <label>
        <input
          type="text"
          name="username"
          className="input"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <span>İstifadəçi adı</span>
      </label>

      <label>
        <input
          type="password"
          name="password"
          className="input"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span>Şifrə</span>
      </label>

      <button type="submit" className="submit" disabled={isSubmitting}>
        {isSubmitting ? "Yüklənir..." : "Daxil ol"}
      </button>

      <p className="signin">
        Hesabın yoxdur? <Link to="/register">Qeydiyyatdan keç</Link>
      </p>
    </form>
  );
}

export default Login;
