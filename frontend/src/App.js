import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProductLayout from "@/components/product/ProductLayout";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

import EmployerDashboard from "@/pages/employer/EmployerDashboard";
import FindTalent from "@/pages/employer/FindTalent";
import Shortlist from "@/pages/employer/Shortlist";
import Messages from "@/pages/employer/Messages";
import Interviews from "@/pages/employer/Interviews";
import CandidateProfile from "@/pages/employer/CandidateProfile";
import TalentRoom from "@/pages/employer/TalentRoom";

import TalentDashboard from "@/pages/talent/TalentDashboard";
import Onboarding from "@/pages/talent/Onboarding";
import CareerMatch from "@/pages/talent/CareerMatch";
import Opportunities from "@/pages/talent/Opportunities";
import Readiness from "@/pages/talent/Readiness";

import AdminCommandCenter from "@/pages/admin/AdminCommandCenter";
import AdminCandidates from "@/pages/admin/AdminCandidates";
import AdminEmployers from "@/pages/admin/AdminEmployers";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";

const EMP = ["employer", "recruiter", "admin"];

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/employer" element={<ProductLayout roles={EMP}><EmployerDashboard /></ProductLayout>} />
          <Route path="/employer/find-talent" element={<ProductLayout roles={EMP}><FindTalent /></ProductLayout>} />
          <Route path="/employer/shortlist" element={<ProductLayout roles={EMP}><Shortlist /></ProductLayout>} />
          <Route path="/employer/messages" element={<ProductLayout roles={EMP}><Messages /></ProductLayout>} />
          <Route path="/employer/interviews" element={<ProductLayout roles={EMP}><Interviews /></ProductLayout>} />
          <Route path="/employer/candidate/:slug" element={<ProductLayout roles={EMP}><CandidateProfile /></ProductLayout>} />
          <Route path="/employer/room/:roleId" element={<ProductLayout roles={EMP}><TalentRoom /></ProductLayout>} />

          <Route path="/talent" element={<ProductLayout roles={["talent", "admin"]}><TalentDashboard /></ProductLayout>} />
          <Route path="/talent/onboarding" element={<ProductLayout roles={["talent", "admin"]}><Onboarding /></ProductLayout>} />
          <Route path="/talent/career" element={<ProductLayout roles={["talent", "admin"]}><CareerMatch /></ProductLayout>} />
          <Route path="/talent/opportunities" element={<ProductLayout roles={["talent", "admin"]}><Opportunities /></ProductLayout>} />
          <Route path="/talent/readiness" element={<ProductLayout roles={["talent", "admin"]}><Readiness /></ProductLayout>} />

          <Route path="/admin" element={<ProductLayout roles={["admin"]}><AdminCommandCenter /></ProductLayout>} />
          <Route path="/admin/candidates" element={<ProductLayout roles={["admin"]}><AdminCandidates /></ProductLayout>} />
          <Route path="/admin/employers" element={<ProductLayout roles={["admin"]}><AdminEmployers /></ProductLayout>} />
          <Route path="/admin/analytics" element={<ProductLayout roles={["admin"]}><AdminAnalytics /></ProductLayout>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
