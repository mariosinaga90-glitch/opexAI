import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, CheckSquare, Settings, LogOut, Users, Menu, Search, X, BatteryCharging, User } from 'lucide-react';
import '../pages/Dashboard.css';

function DashboardLayout({ role }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const syncUser = () => {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        navigate('/');
      } else {
        const parsedUser = JSON.parse(storedUser);
        // Optional: Check if role matches route
        if (parsedUser.role !== role) {
          navigate(`/${parsedUser.role}`);
        } else {
          setUser(parsedUser);
        }
      }
    };

    syncUser();

    window.addEventListener('user-updated', syncUser);
    window.addEventListener('storage', syncUser);

    return () => {
      window.removeEventListener('user-updated', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, [navigate, role]);

  const employeeNav = [
    { name: 'Dashboard', path: '/employee', icon: LayoutDashboard },
    { name: 'Pengajuan', path: '/employee#pengajuan', icon: FileText },
    { name: 'Laporan', path: '/employee#laporan', icon: CheckSquare },
    { name: 'Report Backup Power', path: '/employee/backup-power', icon: BatteryCharging },
    { name: 'Edit Profil', path: '/employee#profile', icon: User },
  ];

  const adminNav = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Daftar Pengajuan', path: '/admin#pengajuan', icon: FileText },
    { name: 'Review Laporan', path: '/admin#laporan', icon: CheckSquare },
    { name: 'Data Backup Power', path: '/admin/backup-power', icon: BatteryCharging },
    { name: 'Manajemen Pengguna', path: '/admin#users', icon: Users },
    { name: 'Pengaturan', path: '/admin#settings', icon: Settings },
  ];

  const navItems = role === 'admin' ? adminNav : employeeNav;
  
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) return null; // Prevent rendering until user is loaded

  return (
    <div className="dashboard-container">
      <div className="mockup-glow"></div>
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={closeSidebar}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 5, backdropFilter: 'blur(4px)'
          }}
        />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar glass-panel animate-fade-in-up ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="logo-container">
            <span className="logo-text">Opex</span>
            <span className="logo-badge">Tac</span>
          </div>
          {isSidebarOpen && (
            <button className="mobile-toggle" onClick={closeSidebar}>
              <X size={24} />
            </button>
          )}
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const itemPathname = item.path.split('#')[0];
            const itemHash = item.path.includes('#') ? '#' + item.path.split('#')[1] : '';
            const isActive = location.pathname === itemPathname && location.hash === itemHash;
            
            return (
              <Link 
                key={index} 
                to={item.path} 
                onClick={closeSidebar}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="sidebar-footer">
          <a href="/" onClick={handleLogout} className="nav-item text-danger">
            <LogOut size={20} />
            <span>Keluar</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Topbar */}
        <header className="dashboard-topbar glass-panel animate-fade-in-up delay-1">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-toggle" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="search-wrapper">
              <Search size={18} className="text-muted" />
              <input type="text" placeholder="Cari..." />
            </div>
          </div>
          <div className="topbar-profile">
            <div className="profile-info">
              <span className="profile-name">{user.name}</span>
              <span className="profile-role">{user.team || user.role}</span>
            </div>
            <div className="profile-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="dashboard-content animate-fade-in-up delay-2">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
