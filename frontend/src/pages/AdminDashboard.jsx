import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { Inbox, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { formatDateTime } from '../utils/dateFormatter';
import AdminRequestView from './admin/AdminRequestView';
import AdminReportView from './admin/AdminReportView';
import AdminUserView from './admin/AdminUserView';
import AdminSettingsView from './admin/AdminSettingsView';

function AdminDashboardOverview() {
  const navigate = useNavigate();

  const [statsData, setStatsData] = useState({
    totalRequests: 0,
    pendingReview: 0,
    completedThisMonth: 0,
    totalEmployees: 0
  });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [filterTeam, setFilterTeam] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, pendingRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/dashboard/stats`),
          fetch(`${API_BASE_URL}/admin/dashboard/pending`)
        ]);
        
        if (statsRes.ok) setStatsData(await statsRes.json());
        if (pendingRes.ok) setPendingRequests(await pendingRes.json());
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    { label: 'Pengajuan Masuk', value: statsData.totalRequests, icon: Inbox, color: 'primary' },
    { label: 'Menunggu Review', value: statsData.pendingReview, icon: AlertTriangle, color: 'warning' },
    { label: 'Selesai Bulan Ini', value: statsData.completedThisMonth, icon: CheckCircle, color: 'success' },
    { label: 'Total Karyawan', value: statsData.totalEmployees, icon: Users, color: 'info' },
  ];

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Admin</h1>
          <p className="page-subtitle">Kelola pengajuan dana operasional dan laporan realisasi</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className={`stat-card glass-panel ${stat.color}`} style={{ cursor: 'pointer' }} onClick={() => {
              if (stat.label === 'Total Karyawan') navigate('/admin#users');
              else if (stat.label === 'Menunggu Review') navigate('/admin#laporan');
              else navigate('/admin#pengajuan');
            }}>
              <div className="stat-content">
                <div>
                  <p className="stat-label">{stat.label}</p>
                  <h3 className="stat-value">{stat.value}</h3>
                </div>
                <div className="stat-icon">
                  <Icon size={28} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending Requests Table */}
      <div className="data-section glass-panel">
        <div className="section-header" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="section-title" style={{ margin: 0 }}>Pengajuan Perlu Persetujuan</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin#pengajuan')}>Lihat Semua</button>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="search-input" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '200px', backgroundColor: 'rgba(30, 41, 59, 0.7)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <input 
                type="text" 
                placeholder="Cari nama pengaju..." 
                style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none', width: '100%' }}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
            <select 
              className="form-control" 
              style={{ width: 'auto', minWidth: '150px', backgroundColor: 'rgba(30, 41, 59, 0.7)' }}
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
            >
              <option value="all">Semua Role Team</option>
              {[...new Set(pendingRequests.map(r => r.team).filter(Boolean))].map((team, idx) => (
                <option key={idx} value={team}>{team}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Pengaju & Role</th>
                <th>TO Cluster</th>
                <th>Kategori</th>
                <th>Tanggal Pengajuan</th>
                <th>Jumlah</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</td></tr>
              ) : pendingRequests.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada pengajuan pending.</td></tr>
              ) : (() => {
                const filteredReqs = pendingRequests.filter(req => {
                  const matchesName = req.user?.toLowerCase().includes(searchName.toLowerCase()) || false;
                  const matchesTeam = filterTeam === 'all' || req.team === filterTeam;
                  return matchesName && matchesTeam;
                });
                
                if (filteredReqs.length === 0) {
                  return <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada pengajuan yang sesuai filter.</td></tr>;
                }
                
                return filteredReqs.map((req, index) => (
                  <tr key={index}>
                    <td><span className="text-muted">{req.id}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span className="font-medium">{req.user}</span>
                        <span className="team-badge" style={{ width: 'fit-content' }}>{req.team}</span>
                      </div>
                    </td>
                    <td>{req.toCluster}</td>
                    <td>{req.categoryLabel}</td>
                    <td>{req.createdAt ? formatDateTime(req.createdAt) : req.date ? formatDateTime(req.date) : '-'}</td>
                    <td>Rp {req.amount?.toLocaleString('id-ID')}</td>
                    <td className="action-cell">
                      <button className="btn btn-success btn-xs" onClick={() => navigate('/admin#pengajuan')}>Review</button>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const location = useLocation();
  const [currentHash, setCurrentHash] = useState(location.hash);

  useEffect(() => {
    setCurrentHash(location.hash);
  }, [location.hash]);

  const renderContent = () => {
    switch (currentHash) {
      case '#pengajuan':
        return <AdminRequestView />;
      case '#laporan':
        return <AdminReportView />;
      case '#users':
        return <AdminUserView />;
      case '#settings':
        return <AdminSettingsView />;
      default:
        return <AdminDashboardOverview />;
    }
  };

  return (
    <div className="dashboard-page">
      {renderContent()}
    </div>
  );
}

export default AdminDashboard;
