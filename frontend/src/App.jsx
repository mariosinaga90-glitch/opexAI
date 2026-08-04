import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DashboardLayout from './components/DashboardLayout';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BackupPowerForm from './pages/employee/BackupPowerForm';
import AdminBackupPowerView from './pages/admin/AdminBackupPowerView';
import ProductivityAchievement from './pages/ProductivityAchievement';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        {/* Dashboard Routes */}
        <Route path="/employee" element={<DashboardLayout role="employee" />}>
          <Route index element={<EmployeeDashboard />} />
          <Route path="backup-power" element={<BackupPowerForm />} />
          <Route path="productivity" element={<ProductivityAchievement />} />
        </Route>
        
        <Route path="/admin" element={<DashboardLayout role="admin" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="backup-power" element={<AdminBackupPowerView />} />
          <Route path="productivity" element={<ProductivityAchievement />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
