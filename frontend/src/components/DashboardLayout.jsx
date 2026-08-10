import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, CheckSquare, Settings, LogOut, Users, Menu, Search, X, BatteryCharging, User, Download, TrendingUp } from 'lucide-react';
import TutorialGuide from './TutorialGuide';
import '../pages/Dashboard.css';

function DashboardLayout({ role }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    { name: 'Productivity', path: '/employee/productivity', icon: TrendingUp },
    { name: 'Edit Profil', path: '/employee#profile', icon: User },
  ];

  const adminNav = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Daftar Pengajuan', path: '/admin#pengajuan', icon: FileText },
    { name: 'Review Laporan', path: '/admin#laporan', icon: CheckSquare },
    { name: 'Data Backup Power', path: '/admin/backup-power', icon: BatteryCharging },
    { name: 'Productivity', path: '/admin/productivity', icon: TrendingUp },
    { name: 'Manajemen Pengguna', path: '/admin#users', icon: Users },
    { name: 'Pengaturan', path: '/admin#settings', icon: Settings },
  ];

  const navItems = role === 'admin' ? adminNav : employeeNav;
  
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = (e) => {
    if (e) e.preventDefault();
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else {
      // Fallback manual instructions
      alert(
        "Aplikasi belum siap diinstal secara otomatis, atau Anda menggunakan iPhone (iOS).\n\n" +
        "CARA INSTALL MANUAL:\n" +
        "1. Android (Chrome): Klik ikon titik tiga di pojok kanan atas, lalu pilih 'Tambahkan ke Layar Utama' (Add to Home screen).\n" +
        "2. iPhone (Safari): Klik ikon 'Share' (kotak dengan panah ke atas) di bawah, lalu geser dan pilih 'Tambahkan ke Layar Utama' (Add to Home Screen)."
      );
    }
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
          <button 
            onClick={handleInstallClick} 
            className="nav-item text-primary" 
            style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', marginBottom: '0.5rem', color: 'var(--primary-color)' }}
          >
            <Download size={20} />
            <span style={{ fontWeight: 600 }}>Install Aplikasi</span>
          </button>
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
          <div className="topbar-profile" ref={profileMenuRef} style={{ position: 'relative' }}>
            <div className="profile-info">
              <span className="profile-name">{user.name}</span>
              <span className="profile-role">{user.team || user.role}</span>
            </div>
            <div 
              className="profile-avatar" 
              style={{ cursor: 'pointer', textDecoration: 'none' }}
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              title="Menu Profil"
            >
              {user.name.charAt(0).toUpperCase()}
            </div>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '200px',
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Link 
                  to={role === 'admin' ? '/admin#profile' : '/employee#profile'}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', color: 'var(--text-main)', textDecoration: 'none', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  <User size={18} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Edit Profil</span>
                </Link>
                <a 
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsProfileMenuOpen(false);
                    handleLogout();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', color: 'var(--accent-rose)', textDecoration: 'none', cursor: 'pointer' }}
                >
                  <LogOut size={18} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Keluar</span>
                </a>
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="dashboard-content animate-fade-in-up delay-2">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation for Mobile dihilangkan (Semua akses menu via Sidebar) */}


      {/* Floating Tutorial Guide */}
      <TutorialGuide />
    </div>
  );
}

export default DashboardLayout;
