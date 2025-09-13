// src/router/RoutersApp.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Register from "../auth/Register";
import Login from "../auth/Login";
import Profile from "../pages/Profil";
import Menu from "../pages/Menu";
import AdminLogin from "../admin/AdminLogin";
import AdminPanel from "../admin/AdminPanel";
import AdminDashboard from "../admin/AdminDashboard";
import UploadQuestion from "../admin/UploadQuestion";
import QuestionsList from "../admin/QuestionsList";
import AssignmentDetail from "../pages/AssignmentDetail";
import Attendance from "../admin/Attendance";

// İstersen sonra silebilirsin; AdminTeaching içinde zaten “Ödev Ver” var
import AssignmentCreate from "../admin/AssignmentCreate";
import AssignmentStats from "../admin/AssignmentStats";
import Homework from "../pages/Homework";

function RoutersApp() {
  return (
    <Routes>
      {/* Auth / Student */}
      <Route path="/" element={<Register />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/menu" element={<Menu />} />
      <Route path="/profile" element={<Profile />} />

      {/* Student ödev */}
      <Route
        path="/homework"
        element={<Navigate to="/student/homework" replace />}
      />
      <Route path="/student/homework" element={<Homework />} />
      <Route path="/student/assignment/:id" element={<AssignmentDetail />} />

      {/* Admin */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/admin-panel" element={<AdminPanel />} />
      <Route path="/upload-question" element={<UploadQuestion />} />
      <Route path="/admin-list" element={<QuestionsList />} />
      <Route path="/admin/attendance" element={<Attendance />} />
      {/* Tek panel: öğretim + ödev kontrol + ödev ver */}

      {/* (opsiyonel) ayrı sayfalar hâlâ dursun istiyorsan: */}
      <Route path="/admin/assignments/new" element={<AssignmentCreate />} />
      <Route
        path="/admin/assignments/:id/stats"
        element={<AssignmentStats />}
      />

      {/* bilinmeyen rota */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default RoutersApp;
