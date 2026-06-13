import React, { useState, useEffect } from 'react';
import { Search, Download, Trash2, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const API_BASE_URL = '/api';

function AdminBackupPowerView() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
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
        { header: 'Cluster', key: 'cluster', width: 20 },
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
          plnOffTime: rep.plnOffTime || '-',
          backupStartTime: rep.backupStartTime || '-',
          rhBefore: rep.rhBefore || '-',
          plnOnTime: rep.plnOnTime || '-',
          backupEndTime: rep.backupEndTime || '-',
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

  const filteredReports = reports.filter(r => 
    (r.siteName || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.ticketNo || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.user || '').toLowerCase().includes(search.toLowerCase())
  );

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
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
          <div className="search-input" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '400px' }}>
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Cari Ticket, Site, atau Karyawan..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}><div className="loader"></div><p>Memuat data...</p></div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No Ticket</th>
                  <th>Site Name</th>
                  <th>Tanggal</th>
                  <th>Pembuat</th>
                  <th>PLN Off</th>
                  <th>Backup Start</th>
                  <th>Foto</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada data ditemukan.</td></tr>
                ) : (
                  filteredReports.map(rep => (
                    <tr key={rep.id}>
                      <td className="font-medium">{rep.ticketNo}</td>
                      <td>{rep.siteId} - {rep.siteName}</td>
                      <td>{rep.backupDate ? new Date(rep.backupDate).toLocaleDateString('id-ID') : '-'}</td>
                      <td>{rep.user}</td>
                      <td>{rep.plnOffTime || '-'}</td>
                      <td>{rep.backupStartTime || '-'}</td>
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

      {previewReport && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setPreviewReport(null)}>
          <div className="modal-content animate-fade-in-up" style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Preview Backup Power</h2>
              <button className="btn-icon" onClick={() => setPreviewReport(null)}>✕</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem', backgroundColor: 'rgba(0,0,0,0.02)', padding: '1.5rem', borderRadius: '8px' }}>
              <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Ticket No</p><p className="font-medium">{previewReport.ticketNo}</p></div>
              <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Site</p><p className="font-medium">{previewReport.siteId} - {previewReport.siteName}</p></div>
              <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Tanggal Backup</p><p className="font-medium">{previewReport.backupDate ? new Date(previewReport.backupDate).toLocaleDateString('id-ID') : '-'}</p></div>
              <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Waktu Pemadaman</p><p className="font-medium">{previewReport.plnOffTime || '-'}</p></div>
              <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Waktu Mulai Backup</p><p className="font-medium">{previewReport.backupStartTime || '-'}</p></div>
              <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Waktu PLN On</p><p className="font-medium">{previewReport.plnOnTime || '-'}</p></div>
              <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Penyebab Pemadaman</p><p className="font-medium">{previewReport.outageCause || '-'}</p></div>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Foto Dokumentasi</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              {previewReport.photoPlnOff ? <div><p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>PLN Off</p><img src={getFileUrl(previewReport.photoPlnOff)} alt="PLN Off" style={{ width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} /></div> : <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>PLN Off</p><p>-</p></div>}
              {previewReport.photoRhBefore ? <div><p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>RH Before</p><img src={getFileUrl(previewReport.photoRhBefore)} alt="RH Before" style={{ width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} /></div> : <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>RH Before</p><p>-</p></div>}
              {previewReport.photoPlnOn ? <div><p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>PLN On</p><img src={getFileUrl(previewReport.photoPlnOn)} alt="PLN On" style={{ width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} /></div> : <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>PLN On</p><p>-</p></div>}
              {previewReport.photoRhAfter ? <div><p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>RH After</p><img src={getFileUrl(previewReport.photoRhAfter)} alt="RH After" style={{ width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} /></div> : <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>RH After</p><p>-</p></div>}
            </div>
            
            <div style={{ marginTop: '2rem', textAlign: 'right' }}>
              <button className="btn" onClick={() => setPreviewReport(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBackupPowerView;
