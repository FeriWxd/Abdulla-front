// src/pages/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import "../style/Register.css";

function Register() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    group: "9/A",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // api.post istifadə et
      const res = await api.post("/api/register", form);

      if (res?.success === false) {
        throw new Error(res?.message || "Qeydiyyat uğursuz oldu");
      }

      alert("Qeydiyyat uğurla tamamlandı ✅");
      navigate("/login");
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.response?.data?.message ||
          err.message ||
          "Xəta baş verdi"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <p className="title">Qeydiyyat</p>
      <p className="message">İndi qoşul və sistemə tam giriş əldə et.</p>
      {error && <p className="error-message">{error}</p>}

      <div className="flex">
        <label>
          <input
            required
            name="firstName"
            type="text"
            className="input"
            value={form.firstName}
            onChange={handleChange}
            placeholder=" "
          />
          <span>Ad</span>
        </label>

        <label>
          <input
            required
            name="lastName"
            type="text"
            className="input"
            value={form.lastName}
            onChange={handleChange}
            placeholder=" "
          />
          <span>Soyad</span>
        </label>
      </div>

      <label>
        <input
          required
          name="username"
          type="text"
          className="input"
          value={form.username}
          onChange={handleChange}
          placeholder=" "
        />
        <span>İstifadəçi adı</span>
      </label>

      <label>
        <input
          required
          name="password"
          type="password"
          className="input"
          value={form.password}
          onChange={handleChange}
          placeholder=" "
        />
        <span>Şifrə</span>
      </label>

      <label>
        <select
          required
          name="group"
          className="input"
          value={form.group}
          onChange={handleChange}
        >
          {["9/A", "9/B", "9/C", "11/A", "11/B", "11/C"].map((gr) => (
            <option key={gr} value={gr}>
              {gr}
            </option>
          ))}
        </select>
        <span>Qrup</span>
      </label>

      <button type="submit" className="submit" disabled={isSubmitting}>
        {isSubmitting ? "Yüklənir..." : "Qeydiyyatdan keç"}
      </button>

      <p className="signin">
        Hesabın var? <Link to="/login">Giriş et</Link>
      </p>
    </form>
  );
}

export default Register;
