import React, { useState, useEffect } from 'react';
import { Search, Download, Trash2, FileSpreadsheet, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { formatDateTime } from '../../utils/dateFormatter';

const API_BASE_URL = '/api';

function AdminBackupPowerView() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [filterNop, setFilterNop] = useState('all');
  const [filterCluster, setFilterCluster] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewReport, setPreviewReport] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/backup-power`);
      const data = await res.json();
      setReports(data);
    } catch (err) {
      console.error('Failed to fetch backup power reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus laporan ini?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/backup-power/${id}`, { method: 'DELETE' });
      if (res.ok) fetchReports();
      else alert('Gagal menghapus laporan');
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const getFileUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/${cleanPath}`;
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Report Backup Power', {
        properties: { tabColor: { argb: 'FF00B0F0' } },
        views: [{ state: 'frozen', ySplit: 1 }]
      });

      // Define columns
      sheet.columns = [
        { header: 'ID Laporan', key: 'id', width: 15 },
        { header: 'Pembuat', key: 'user', width: 20 },
        { header: 'No Ticket', key: 'ticketNo', width: 20 },
        { header: 'Site ID', key: 'siteId', width: 15 },
        { header: 'Site Name', key: 'siteName', width: 30 },
        { header: 'Tanggal Backup', key: 'backupDate', width: 15 },
        { header: 'NOP', key: 'nop', width: 15 },
        { header: 'TO Cluster', key: 'cluster', width: 20 },
        { header: 'Penyebab', key: 'outageCause', width: 25 },
        { header: 'PLN Off', key: 'plnOffTime', width: 15 },
        { header: 'Backup Start', key: 'backupStartTime', width: 15 },
        { header: 'RH Before', key: 'rhBefore', width: 15 },
        { header: 'PLN On', key: 'plnOnTime', width: 15 },
        { header: 'Backup End', key: 'backupEndTime', width: 15 },
        { header: 'RH After', key: 'rhAfter', width: 15 },
        { header: 'Tanggal Dibuat', key: 'createdAt', width: 20 },
        { header: 'Foto PLN Off', key: 'foto1', width: 30 },
        { header: 'Foto RH Before', key: 'foto2', width: 30 },
        { header: 'Foto PLN On', key: 'foto3', width: 30 },
        { header: 'Foto RH After', key: 'foto4', width: 30 },
      ];

      // Style header
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004E8A' } };
      sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      const fetchImageAsBase64 = async (url) => {
        if (!url) return null;
        try {
          const imgRes = await fetch(url);
          if (!imgRes.ok) return null;
          const blob = await imgRes.blob();
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };

      for (let i = 0; i < filteredReports.length; i++) {
        const rep = filteredReports[i];
        const row = sheet.addRow({
          id: rep.id,
          user: rep.user || '-',
          ticketNo: rep.ticketNo || '-',
          siteId: rep.siteId || '-',
          siteName: rep.siteName || '-',
          backupDate: rep.backupDate ? new Date(rep.backupDate).toLocaleDateString('id-ID') : '-',
          nop: rep.nop || '-',
          cluster: rep.cluster || '-',
          outageCause: rep.outageCause || '-',
          plnOffTime: formatDateTime(rep.plnOffTime),
          backupStartTime: formatDateTime(rep.backupStartTime),
          rhBefore: rep.rhBefore || '-',
          plnOnTime: formatDateTime(rep.plnOnTime),
          backupEndTime: formatDateTime(rep.backupEndTime),
          rhAfter: rep.rhAfter || '-',
          createdAt: rep.createdAt ? new Date(rep.createdAt).toLocaleString('id-ID') : '-'
        });

        // Set row height for images
        row.height = 100;
        row.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

        const photoFields = [
          { key: 'photoPlnOff', colIndex: 16 },    // shifted to accommodate Tanggal Backup
          { key: 'photoRhBefore', colIndex: 17 },  
          { key: 'photoPlnOn', colIndex: 18 },     
          { key: 'photoRhAfter', colIndex: 19 }    
        ];

        for (const p of photoFields) {
          const pathUrl = rep[p.key];
          if (pathUrl) {
            const b64 = await fetchImageAsBase64(getFileUrl(pathUrl));
            if (b64) {
              const ext = pathUrl.split('.').pop().toLowerCase() === 'png' ? 'png' : 'jpeg';
              try {
                const imageId = workbook.addImage({ base64: b64, extension: ext });
                sheet.addImage(imageId, {
                  tl: { col: p.colIndex, row: row.number - 1 },
                  ext: { width: 120, height: 120 },
                  editAs: 'oneCell'
                });
              } catch (e) {
                console.error('Error adding image to cell', e);
              }
            } else {
              sheet.getCell(row.number, p.colIndex + 1).value = "Gagal memuat gambar";
            }
          } else {
            sheet.getCell(row.number, p.colIndex + 1).value = "Tidak ada foto";
          }
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Backup_Power_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (err) {
      console.error('Error exporting excel:', err);
      alert('Gagal mengekspor file Excel. Pastikan koneksi lancar.');
    } finally {
      setExporting(false);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = search === '' || 
      (r.siteName || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.siteId || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.ticketNo || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.user || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesNop = filterNop === 'all' || r.nop === filterNop;
    const matchesCluster = filterCluster === 'all' || r.cluster === filterCluster;
    
    let matchesDate = true;
    if (filterDateFrom || filterDateTo) {
      if (!r.backupDate) {
        matchesDate = false;
      } else {
        const repDate = new Date(r.backupDate).getTime();
        if (filterDateFrom && repDate < new Date(filterDateFrom).getTime()) matchesDate = false;
        if (filterDateTo) {
          const endTo = new Date(filterDateTo);
          endTo.setHours(23, 59, 59, 999);
          if (repDate > endTo.getTime()) matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesNop && matchesCluster && matchesDate;
  });

  if (previewReport) {
    return (
      <div className="glass-panel animate-fade-in-up" style={{ padding: '2rem' }}>
        <button className="btn-icon" onClick={() => setPreviewReport(null)} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Kembali
        </button>
        <h2 className="section-title">Detail Log Backup Power</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem', backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '8px' }}>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Ticket No</p><p className="font-medium">{previewReport.ticketNo}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Site</p><p className="font-medium">{previewReport.siteId} - {previewReport.siteName}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>NOP</p><p className="font-medium">{previewReport.nop || '-'}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>TO Cluster</p><p className="font-medium">{previewReport.cluster}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Tanggal Backup</p><p className="font-medium">{previewReport.backupDate ? new Date(previewReport.backupDate).toLocaleDateString('id-ID') : '-'}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Penyebab Pemadaman</p><p className="font-medium">{previewReport.outageCause || '-'}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Waktu PLN Off</p><p className="font-medium">{formatDateTime(previewReport.plnOffTime)}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Waktu Mulai Backup</p><p className="font-medium">{formatDateTime(previewReport.backupStartTime)}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>RH Sebelum Backup</p><p className="font-medium">{previewReport.rhBefore || '-'}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Waktu PLN On</p><p className="font-medium">{formatDateTime(previewReport.plnOnTime)}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Waktu Selesai Backup</p><p className="font-medium">{formatDateTime(previewReport.backupEndTime)}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>RH Sesudah Backup</p><p className="font-medium">{previewReport.rhAfter || '-'}</p></div>
        </div>

        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Foto Dokumentasi</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          {previewReport.photoPlnOff && <div><p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>PLN Off</p><img src={getFileUrl(previewReport.photoPlnOff)} alt="PLN Off" style={{ width: '100%', borderRadius: '8px' }} /></div>}
          {previewReport.photoRhBefore && <div><p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>RH Before</p><img src={getFileUrl(previewReport.photoRhBefore)} alt="RH Before" style={{ width: '100%', borderRadius: '8px' }} /></div>}
          {previewReport.photoPlnOn && <div><p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>PLN On</p><img src={getFileUrl(previewReport.photoPlnOn)} alt="PLN On" style={{ width: '100%', borderRadius: '8px' }} /></div>}
          {previewReport.photoRhAfter && <div><p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>RH After</p><img src={getFileUrl(previewReport.photoRhAfter)} alt="RH After" style={{ width: '100%', borderRadius: '8px' }} /></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="dashboard-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="dashboard-title">Data Backup Power</h1>
          <p className="dashboard-subtitle">Monitoring log genset dan pemadaman dari lapangan.</p>
        </div>
        <button className="btn btn-primary" onClick={handleExportExcel} disabled={exporting || reports.length === 0}>
          <FileSpreadsheet size={18} style={{ marginRight: '8px' }} />
          {exporting ? 'Memproses Excel...' : 'Export Excel'}
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Top Search Bar */}
          <div className="search-input" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '400px' }}>
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Cari No Ticket, Site ID, atau Karyawan..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
            />
          </div>

          {/* Filters Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px' }}>
            <div className="form-group" style={{ flex: '1 1 200px', margin: 0 }}>
              <label className="text-muted" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>NOP</label>
              <select className="form-control" value={filterNop} onChange={(e) => setFilterNop(e.target.value)}>
                <option value="all">Semua NOP</option>
                <option value="Karawang">Karawang</option>
                <option value="Serang">Serang</option>
                <option value="Tangerang">Tangerang</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: '1 1 200px', margin: 0 }}>
              <label className="text-muted" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>TO Cluster</label>
              <select className="form-control" value={filterCluster} onChange={(e) => setFilterCluster(e.target.value)}>
                <option value="all">Semua TO Cluster</option>
                <option value="TO Kab. Bekasi">TO Kab. Bekasi</option>
                <option value="TO Karawang">TO Karawang</option>
                <option value="TO Purwakarta">TO Purwakarta</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: '1 1 150px', margin: 0 }}>
              <label className="text-muted" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Dari Tanggal</label>
              <input type="date" className="form-control" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: '1 1 150px', margin: 0 }}>
              <label className="text-muted" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Sampai Tanggal</label>
              <input type="date" className="form-control" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
            { (filterNop !== 'all' || filterCluster !== 'all' || filterDateFrom || filterDateTo || search) && (
              <div style={{ display: 'flex', alignItems: 'flex-end', margin: 0 }}>
                <button className="btn" onClick={() => { setFilterNop('all'); setFilterCluster('all'); setFilterDateFrom(''); setFilterDateTo(''); setSearch(''); }}>Reset</button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No Ticket</th>
                  <th>Site ID</th>
                  <th>Site Name</th>
                  <th>NOP</th>
                  <th>TO Cluster</th>
                  <th>Tanggal</th>
                  <th>Pembuat</th>
                  <th>Foto</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skel-bp-${idx}`}>
                    <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '150px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No Ticket</th>
                  <th>Site ID</th>
                  <th>Site Name</th>
                  <th>NOP</th>
                  <th>TO Cluster</th>
                  <th>Tanggal</th>
                  <th>Pembuat</th>
                  <th>Foto</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length === 0 ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada data ditemukan.</td></tr>
                ) : (
                  filteredReports.map(rep => (
                    <tr key={rep.id}>
                      <td className="font-medium">{rep.ticketNo}</td>
                      <td>{rep.siteId || '-'}</td>
                      <td>{rep.siteName}</td>
                      <td>{rep.nop || '-'}</td>
                      <td>{rep.cluster || '-'}</td>
                      <td>{rep.backupDate ? new Date(rep.backupDate).toLocaleDateString('id-ID') : '-'}</td>
                      <td>{rep.user}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {rep.photoPlnOff ? <ImageIcon size={16} color="green" /> : <ImageIcon size={16} color="#ccc" />}
                          {rep.photoRhBefore ? <ImageIcon size={16} color="green" /> : <ImageIcon size={16} color="#ccc" />}
                          {rep.photoPlnOn ? <ImageIcon size={16} color="green" /> : <ImageIcon size={16} color="#ccc" />}
                          {rep.photoRhAfter ? <ImageIcon size={16} color="green" /> : <ImageIcon size={16} color="#ccc" />}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn-icon btn-small" onClick={() => setPreviewReport(rep)} title="Preview Laporan">
                            <ImageIcon size={16} />
                          </button>
                          <button className="btn-icon btn-small" onClick={() => handleDelete(rep.id)} title="Hapus Laporan">
                            <Trash2 size={16} color="var(--danger-color)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminBackupPowerView;
