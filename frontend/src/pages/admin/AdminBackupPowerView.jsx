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
          { key: 'photoPlnOff', colIndex: 15 },    // col P (0-indexed)
          { key: 'photoRhBefore', colIndex: 16 },  // col Q
          { key: 'photoPlnOn', colIndex: 17 },     // col R
          { key: 'photoRhAfter', colIndex: 18 }    // col S
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
                        <button className="btn-icon btn-small" onClick={() => handleDelete(rep.id)} title="Hapus Laporan">
                          <Trash2 size={16} color="var(--danger-color)" />
                        </button>
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
