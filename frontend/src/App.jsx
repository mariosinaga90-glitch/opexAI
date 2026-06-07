import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DashboardLayout from './components/DashboardLayout';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        {/* Dashboard Routes */}
        <Route path="/employee" element={<DashboardLayout role="employee" />}>
          <Route index element={<EmployeeDashboard />} />
        </Route>
        
        <Route path="/admin" element={<DashboardLayout role="admin" />}>
          <Route index element={<AdminDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
