import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Clock, CheckCircle, FileWarning } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatDateTime } from '../utils/dateFormatter';
import FundRequestView from './employee/FundRequestView';
import FundReportView from './employee/FundReportView';

import { API_BASE_URL } from '../config';

function EmployeeDashboardOverview() {
  const navigate = useNavigate();
  const [comparisonData, setComparisonData] = useState([]);
  const [rawComparisonData, setRawComparisonData] = useState([]);
  const [dateFilter, setDateFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  const activeRequestsCount = rawComparisonData.filter(d => d.requestStatus === 'Pending' || d.requestStatus === 'Revision').length;
  const approvedRequestsCount = rawComparisonData.filter(d => d.requestStatus === 'Approved').length;
  const needsReportCount = rawComparisonData.filter(d => d.requestStatus === 'Approved' && (d.reportStatus === 'Belum Ada' || d.reportStatus === 'Revision')).length;

  const stats = [
    { label: 'Pengajuan Aktif', value: activeRequestsCount.toString(), icon: Clock, color: 'warning', hash: '#pengajuan' },
    { label: 'Disetujui', value: approvedRequestsCount.toString(), icon: CheckCircle, color: 'success', hash: '#pengajuan' },
    { label: 'Perlu Laporan', value: needsReportCount.toString(), icon: FileWarning, color: 'danger', hash: '#laporan' },
  ];

  const [recentRequests, setRecentRequests] = useState([]);

  useEffect(() => {
    if (rawComparisonData.length === 0) {
      setComparisonData([]);
      return;
    }

    const now = new Date();
    let filteredData = rawComparisonData;

    if (dateFilter === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filteredData = rawComparisonData.filter(d => new Date(d.createdAt) >= startOfMonth);
    } else if (dateFilter === 'last_3_months') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      filteredData = rawComparisonData.filter(d => new Date(d.createdAt) >= threeMonthsAgo);
    } else if (dateFilter === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filteredData = rawComparisonData.filter(d => new Date(d.createdAt) >= startOfYear);
    }

    setComparisonData(filteredData);
  }, [dateFilter, rawComparisonData]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const headers = { 'X-User-Id': user.id };

        const [reqRes, repRes] = await Promise.all([
          fetch(`${API_BASE_URL}/employee/requests`, { headers }),
          fetch(`${API_BASE_URL}/employee/reports`, { headers })
        ]);

        if (reqRes.ok && repRes.ok) {
          const reqs = await reqRes.json();
          const reps = await repRes.json();

          // Create a map of reports by requestId for fast lookup
          const repMap = reps.reduce((acc, rep) => {
            acc[rep.requestId || rep.reqId] = rep;
            return acc;
          }, {});

          const compData = reqs.map(req => {
            const report = repMap[req.id];
            const requestedAmount = req.amount || 0;
            const reportedAmount = report ? (report.totalUsed || 0) : 0;
            const difference = requestedAmount - reportedAmount;
            
            return {
              id: req.id,
              title: req.title,
              requestedAmount,
              reportedAmount,
              difference,
              requestStatus: req.status,
              reportStatus: report ? report.status : 'Belum Ada',
              createdAt: req.createdAt
            };
          });

          setRawComparisonData(compData);
          setRecentRequests(reqs.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to fetch data for comparison:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Karyawan</h1>
          <p className="page-subtitle">Ringkasan pengajuan dan laporan Anda</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/employee#pengajuan')}>
          <Plus size={18} style={{ marginRight: '8px' }} />
          Ajukan Dana
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className={`stat-card glass-panel ${stat.color}`} style={{ cursor: 'pointer' }} onClick={() => navigate(`/employee${stat.hash}`)}>
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

      {/* Comparison Chart */}
      <div className="data-section glass-panel" style={{ marginBottom: '2rem' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="section-title">Grafik Perbandingan Nominal</h2>
          <select 
            className="form-control" 
            style={{ width: 'auto', display: 'inline-block', backgroundColor: 'rgba(30, 41, 59, 0.7)' }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">Semua Waktu</option>
            <option value="this_month">Bulan Ini</option>
            <option value="last_3_months">3 Bulan Terakhir</option>
            <option value="this_year">Tahun Ini</option>
          </select>
        </div>
        <div style={{ width: '100%', height: 350, marginBottom: '1rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Memuat grafik...</div>
          ) : comparisonData.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Belum ada data untuk ditampilkan.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={comparisonData}
                margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRequested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818CF8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#818CF8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReported" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34D399" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#34D399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="id" stroke="#94A3B8" tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <YAxis stroke="#94A3B8" tick={{ fill: '#94A3B8', fontSize: 12 }} tickFormatter={(value) => `Rp ${(value/1000).toLocaleString('id-ID')}K`} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#F8FAFC' }}
                  formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`}
                />
                <Legend />
                <Area type="monotone" dataKey="requestedAmount" name="Dana Diajukan" stroke="#818CF8" fillOpacity={1} fill="url(#colorRequested)" />
                <Area type="monotone" dataKey="reportedAmount" name="Dana Terpakai" stroke="#34D399" fillOpacity={1} fill="url(#colorReported)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="data-section glass-panel" style={{ marginBottom: '2rem' }}>
        <div className="section-header">
          <h2 className="section-title">Detail Perbandingan Pengajuan vs Laporan</h2>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Pengajuan</th>
                <th>Judul Pengajuan</th>
                <th>Dana Diajukan</th>
                <th>Dana Terpakai</th>
                <th>Sisa Dana / Selisih</th>
                <th>Status Pengajuan</th>
                <th>Status Laporan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Memuat data perbandingan...</td></tr>
              ) : comparisonData.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada data pengajuan.</td></tr>
              ) : (
                comparisonData.map((data, index) => (
                  <tr key={index}>
                    <td><span className="text-muted">{data.id}</span></td>
                    <td className="font-medium">{data.title}</td>
                    <td>Rp {data.requestedAmount.toLocaleString('id-ID')}</td>
                    <td>Rp {data.reportedAmount.toLocaleString('id-ID')}</td>
                    <td className="font-medium">
                      Rp {data.difference.toLocaleString('id-ID')}
                    </td>
                    <td>
                      <span className={`status-badge status-${data.requestStatus.toLowerCase().replace(' ', '-')}`}>
                        {data.requestStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${data.reportStatus.toLowerCase().replace(' ', '-')}`}>
                        {data.reportStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Requests Table */}
      <div className="data-section glass-panel">
        <div className="section-header">
          <h2 className="section-title">Pengajuan Terakhir</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/employee#pengajuan')}>Lihat Semua</button>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Judul Pengajuan</th>
                <th>Tanggal</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.map((req, index) => (
                <tr key={index}>
                  <td><span className="text-muted">{req.id}</span></td>
                  <td className="font-medium">{req.title}</td>
                  <td>{req.createdAt ? formatDateTime(req.createdAt) : '-'}</td>
                  <td>Rp {req.amount?.toLocaleString('id-ID')}</td>
                  <td>
                    <span className={`status-badge status-${req.status?.toLowerCase()}`}>
                      {req.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => navigate('/employee#pengajuan')}>Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmployeeDashboard() {
  const location = useLocation();
  const [currentHash, setCurrentHash] = useState(location.hash);

  useEffect(() => {
    setCurrentHash(location.hash);
  }, [location.hash]);

  const renderContent = () => {
    switch (currentHash) {
      case '#pengajuan':
        return <FundRequestView />;
      case '#laporan':
        return <FundReportView />;
      default:
        return <EmployeeDashboardOverview />;
    }
  };

  return (
    <div className="dashboard-page">
      {renderContent()}
    </div>
  );
}

export default EmployeeDashboard;
