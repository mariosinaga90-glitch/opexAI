import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { Inbox, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { formatDateTime } from '../utils/dateFormatter';
import AdminRequestView from './admin/AdminRequestView';
import AdminReportView from './admin/AdminReportView';
import AdminUserView from './admin/AdminUserView';
import AdminSettingsView from './admin/AdminSettingsView';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function AdminDashboardOverview() {
  const navigate = useNavigate();

  const [statsData, setStatsData] = useState({
    totalRequests: 0,
    pendingReview: 0,
    completedThisMonth: 0,
    totalEmployees: 0,
    requestsByCategory: []
  });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [filterTeam, setFilterTeam] = useState('all');
  const [filterCluster, setFilterCluster] = useState('all');
  const [filterNop, setFilterNop] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(-1);
  const [activeFundIndex, setActiveFundIndex] = useState(-1);

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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
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
                <option key={`team-${idx}`} value={team}>{team}</option>
              ))}
            </select>
            <select 
              className="form-control" 
              style={{ width: 'auto', minWidth: '150px', backgroundColor: 'rgba(30, 41, 59, 0.7)' }}
              value={filterCluster}
              onChange={(e) => setFilterCluster(e.target.value)}
            >
              <option value="all">Semua TO Cluster</option>
              <option value="TO Kab. Bekasi">Kab. Bekasi</option>
              <option value="TO Karawang">Karawang</option>
              <option value="TO Purwakarta">Purwakarta</option>
            </select>
            <select 
              className="form-control" 
              style={{ width: 'auto', backgroundColor: 'rgba(30, 41, 59, 0.7)' }}
              value={filterNop}
              onChange={(e) => setFilterNop(e.target.value)}
            >
              <option value="all">Semua NOP</option>
              <option value="Karawang">Karawang</option>
              <option value="Serang">Serang</option>
              <option value="Tangerang">Tangerang</option>
            </select>
            <select 
              className="form-control" 
              style={{ width: 'auto', backgroundColor: 'rgba(30, 41, 59, 0.7)' }}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">Semua Kategori</option>
              <option value="BBM Mobil">BBM Mobil</option>
              <option value="BBM Motor">BBM Motor</option>
              <option value="BBM Genset">BBM Genset</option>
              <option value="Parkir - Toll">Parkir - Toll</option>
              <option value="Material">Material</option>
              <option value="Ormas">Ormas</option>
              <option value="Kebutuhan Homebase/DOP">Kebutuhan Homebase/DOP</option>
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
                <th>NOP</th>
                <th>Kategori</th>
                <th>Tanggal Pengajuan</th>
                <th>Jumlah</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`skel-pending-${idx}`}>
                    <td><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div className="skeleton skeleton-text" style={{ width: '100px' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '60px' }}></div>
                      </div>
                    </td>
                    <td><div className="skeleton skeleton-text" style={{ width: '90px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '85px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                  </tr>
                ))
              ) : pendingRequests.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada pengajuan pending.</td></tr>
              ) : (() => {
                const filteredReqs = pendingRequests.filter(req => {
                  const matchesName = req.user?.toLowerCase().includes(searchName.toLowerCase()) || false;
                  const matchesTeam = filterTeam === 'all' || req.team === filterTeam;
                  const matchesCluster = filterCluster === 'all' || req.toCluster === filterCluster;
                  const matchesNop = filterNop === 'all' || req.nop === filterNop;
                  const matchesCategory = filterCategory === 'all' || req.categoryLabel === filterCategory;
                  return matchesName && matchesTeam && matchesCluster && matchesNop && matchesCategory;
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
                    <td style={{ color: 'var(--text-secondary)' }}>{req.toCluster || '-'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{req.nop || '-'}</td>
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

      {/* Charts Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Pie Chart Card */}
        <div className="glass-panel" style={{ padding: '1.75rem', position: 'relative' }}>
          <h2 className="section-title" style={{ marginBottom: '1.5rem', fontSize: '1.15rem' }}>Sebaran Kategori</h2>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320 }}>
              <div className="skeleton" style={{ width: 140, height: 140, borderRadius: '50%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '50%', marginTop: '1.5rem' }}></div>
            </div>
          ) : statsData.requestsByCategory && statsData.requestsByCategory.length > 0 ? (
            (() => {
              const CATEGORY_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F43F5E'];
              const categoryTotal = statsData.requestsByCategory.reduce((acc, curr) => acc + curr.value, 0);
              const activeCategory = activeCategoryIndex !== -1 ? statsData.requestsByCategory[activeCategoryIndex] : null;
              const categoryCenterValue = activeCategory ? activeCategory.value : categoryTotal;
              const categoryCenterLabel = activeCategory ? activeCategory.name : 'Total Tiket';

              return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ position: 'relative', width: '210px', height: 210, margin: '0 auto' }}>
                    <PieChart width={210} height={210}>
                      <Pie
                        data={statsData.requestsByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        onMouseEnter={(data, index) => setActiveCategoryIndex(index)}
                        onMouseLeave={() => setActiveCategoryIndex(-1)}
                      >
                        {statsData.requestsByCategory.map((entry, index) => {
                          const isHovered = index === activeCategoryIndex;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                              style={{
                                outline: 'none',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                                transformOrigin: '50% 50%',
                                cursor: 'pointer',
                                opacity: activeCategoryIndex === -1 ? 1 : (isHovered ? 1 : 0.45)
                              }}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div style={{
                                backgroundColor: 'rgba(15, 23, 42, 0.96)',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  borderRadius: '10px',
                                  padding: '0.6rem 0.85rem',
                                  boxShadow: 'var(--shadow-md)',
                                  backdropFilter: 'blur(8px)',
                                  pointerEvents: 'none'
                                }}>
                                  <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                    {data.name}
                                  </p>
                                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '1.05rem', fontWeight: 700, color: payload[0].color || 'var(--primary)' }}>
                                    {data.value} Tiket
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>


                    {/* Center KPI Information */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      pointerEvents: 'none',
                      width: 120,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <span style={{ 
                        fontSize: '1.8rem', 
                        fontWeight: '800', 
                        color: 'var(--text-main)', 
                        lineHeight: '1.1',
                        transition: 'all 0.15s ease' 
                      }}>
                        {categoryCenterValue}
                      </span>
                      <span style={{ 
                        display: 'block', 
                        fontSize: '0.72rem', 
                        color: 'var(--text-muted)', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.04em',
                        marginTop: '0.3rem',
                        fontWeight: '600',
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}>
                        {categoryCenterLabel}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Legend Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.65rem 0.85rem',
                    marginTop: '1.25rem',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '1.25rem'
                  }}>
                    {statsData.requestsByCategory.map((entry, index) => {
                      const isHovered = index === activeCategoryIndex;
                      const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                      return (
                        <div 
                          key={index} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.8rem',
                            color: isHovered ? 'var(--text-main)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            fontWeight: isHovered ? '600' : '500'
                          }}
                          onMouseEnter={() => setActiveCategoryIndex(index)}
                          onMouseLeave={() => setActiveCategoryIndex(-1)}
                        >
                          <span style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: color,
                            boxShadow: isHovered ? `0 0 8px ${color}` : 'none',
                            transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                          }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.name}: <strong style={{ color: 'var(--text-main)', marginLeft: '2px' }}>{entry.value}</strong>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          ) : (
            <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Belum ada data kategori.
            </div>
          )}
        </div>

        {/* Realisasi Dana Pie Chart */}
        <div className="glass-panel" style={{ padding: '1.75rem', position: 'relative' }}>
          <h2 className="section-title" style={{ marginBottom: '1.5rem', fontSize: '1.15rem' }}>Realisasi vs Pengajuan</h2>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320 }}>
              <div className="skeleton" style={{ width: 140, height: 140, borderRadius: '50%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '50%', marginTop: '1.5rem' }}></div>
            </div>
          ) : statsData.fundsOverview && statsData.fundsOverview.length > 0 ? (
            (() => {
              const FUND_COLORS = ['#10B981', '#6366F1']; // Emerald green for Realisasi, Indigo for Remaining
              const fundsTotal = statsData.fundsOverview.reduce((acc, curr) => acc + curr.value, 0);
              const realizedAmount = statsData.fundsOverview.find(f => f.name.includes('Realisasi') || f.name.includes('Nominal'))?.value || 0;
              const realizedPct = fundsTotal > 0 ? Math.round((realizedAmount / fundsTotal) * 100) : 0;
              
              const activeFund = activeFundIndex !== -1 ? statsData.fundsOverview[activeFundIndex] : null;
              const fundCenterValue = activeFund 
                ? `${Math.round((activeFund.value / (fundsTotal || 1)) * 100)}%`
                : `${realizedPct}%`;
              const fundCenterLabel = activeFund ? activeFund.name : 'Realisasi';

              return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ position: 'relative', width: '210px', height: 210, margin: '0 auto' }}>
                    <PieChart width={210} height={210}>
                      <Pie
                        data={statsData.fundsOverview}
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        onMouseEnter={(data, index) => setActiveFundIndex(index)}
                        onMouseLeave={() => setActiveFundIndex(-1)}
                      >
                        {statsData.fundsOverview.map((entry, index) => {
                          const isHovered = index === activeFundIndex;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={FUND_COLORS[index % FUND_COLORS.length]}
                              style={{
                                outline: 'none',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                                transformOrigin: '50% 50%',
                                cursor: 'pointer',
                                opacity: activeFundIndex === -1 ? 1 : (isHovered ? 1 : 0.45)
                              }}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div style={{
                                backgroundColor: 'rgba(15, 23, 42, 0.96)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '10px',
                                padding: '0.6rem 0.85rem',
                                boxShadow: 'var(--shadow-md)',
                                backdropFilter: 'blur(8px)',
                                pointerEvents: 'none'
                              }}>
                                <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                  {data.name}
                                </p>
                                <p style={{ margin: '0.2rem 0 0 0', fontSize: '1.05rem', fontWeight: 700, color: payload[0].color || 'var(--primary)' }}>
                                  Rp {data.value.toLocaleString('id-ID')}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>

                    {/* Center KPI Information */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      pointerEvents: 'none',
                      width: 125,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <span style={{ 
                        fontSize: '1.8rem', 
                        fontWeight: '800', 
                        color: 'var(--text-main)', 
                        lineHeight: '1.1',
                        transition: 'all 0.15s ease' 
                      }}>
                        {fundCenterValue}
                      </span>
                      <span style={{ 
                        display: 'block', 
                        fontSize: '0.72rem', 
                        color: 'var(--text-muted)', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.04em',
                        marginTop: '0.3rem',
                        fontWeight: '600',
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}>
                        {fundCenterLabel}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Legend Grid */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                    marginTop: '1.25rem',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '1.25rem'
                  }}>
                    {statsData.fundsOverview.map((entry, index) => {
                      const isHovered = index === activeFundIndex;
                      const color = FUND_COLORS[index % FUND_COLORS.length];
                      return (
                        <div 
                          key={index} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.8rem',
                            color: isHovered ? 'var(--text-main)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            fontWeight: isHovered ? '600' : '500'
                          }}
                          onMouseEnter={() => setActiveFundIndex(index)}
                          onMouseLeave={() => setActiveFundIndex(-1)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: color,
                              boxShadow: isHovered ? `0 0 8px ${color}` : 'none',
                              transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                              transition: 'all 0.15s ease',
                              flexShrink: 0
                            }} />
                            <span>{entry.name}</span>
                          </div>
                          <strong style={{ color: 'var(--text-main)' }}>
                            Rp {entry.value.toLocaleString('id-ID')}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          ) : (
            <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Belum ada data dana.
            </div>
          )}
        </div>
      </div>

      </div> {/* End Grid */}
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
