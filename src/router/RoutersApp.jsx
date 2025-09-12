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

// Ödevler
import AssignmentCreate from "../admin/AssignmentCreate";
import AssignmentStats from "../admin/AssignmentStats";
import Homework from "../pages/Homework";

// ✅ Öğrenci – Sınav sayfaları
import ExamHub from "../pages/exams/ExamHub";
import OldExamsList from "../pages/exams/OldExamsList";
import ActiveExam from "../pages/exams/ActiveExam";
import ExamPlayer from "../pages/exams/ExamPlayer";
import ExamReview from "../pages/exams/ExamReview";

// ✅ Admin – Sınav sayfaları
import ExamsHome from "../admin/ExamsHome";
import ExamsList from "../admin/ExamsList";
import ExamCreate from "../admin/ExamCreate";

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
      <Route path="/homework" element={<Navigate to="/student/homework" replace />} />
      <Route path="/student/homework" element={<Homework />} />
      <Route path="/student/assignment/:id" element={<AssignmentDetail />} />

      {/* ✅ Student sınav */}
      <Route path="/student/exams" element={<ExamHub />} />
      <Route path="/student/exams/history" element={<OldExamsList />} />
      <Route path="/student/exams/active" element={<ActiveExam />} />
      <Route path="/student/exams/play/:paperId" element={<ExamPlayer />} />
      <Route path="/student/exams/review/:paperId" element={<ExamReview />} />

      {/* ✅ Admin */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/admin-panel" element={<AdminPanel />} />
      <Route path="/upload-question" element={<UploadQuestion />} />
      <Route path="/admin-list" element={<QuestionsList />} />
      <Route path="/admin/attendance" element={<Attendance />} />

      {/* ✅ Admin – Sınavlar */}
      <Route path="/admin/exams" element={<ExamsHome />} />
      <Route path="/admin/exams/list" element={<ExamsList />} />
      <Route path="/admin/exams/new" element={<ExamCreate />} />

      {/* bilinmeyen rota */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default RoutersApp;
