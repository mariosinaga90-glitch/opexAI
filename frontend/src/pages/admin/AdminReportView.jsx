import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Check, AlertTriangle, FileText, Download, FileSpreadsheet } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../../config';

function AdminReportView() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionNote, setActionNote] = useState('');
  const printRef = useRef(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reports`);
      if (res.ok) setReports(await res.json());
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleReviewClick = async (repSummary) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reports/${repSummary.id}`);
      if (res.ok) {
        setSelectedReport(await res.json());
        setActionNote('');
      }
    } catch (error) {
      console.error('Failed to fetch report details:', error);
    }
  };

  const handleAction = async (action) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reports/${selectedReport.id}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'revision' ? { revisionNote: actionNote } : {})
      });
      if (res.ok) {
        setSelectedReport(null);
        fetchReports(); // Refresh list
      }
    } catch (error) {
      console.error(`Failed to ${action} report:`, error);
    }
  };

  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    const element = printRef.current;
    const opt = {
      margin:       0.5,
      filename:     `Report_${selectedReport.id}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  if (selectedReport) {
    return (
      <div className="glass-panel animate-fade-in-up" style={{ padding: '2rem' }}>
        <div className="section-header" style={{ marginBottom: '2rem' }}>
          <div>
            <button className="btn-icon" onClick={() => setSelectedReport(null)} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={16} /> Kembali
            </button>
            <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Review Laporan Realisasi</h2>
            <p className="text-muted">Periksa rincian penggunaan dana dan bukti pembayaran.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span className={`status-badge status-${selectedReport.status === 'Revision' ? 'warning' : 'pending'}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
              {selectedReport.status}
            </span>
            <button className="btn btn-primary" onClick={handleDownloadPDF}>
              <Download size={18} style={{ marginRight: '8px' }} />
              Download PDF
            </button>
          </div>
        </div>

        {/* Print Area */}
        <div ref={printRef} style={{ padding: '1rem', backgroundColor: 'var(--bg-card)', borderRadius: '8px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>OpexAI</h1>
            <p style={{ color: 'var(--text-muted)' }}>Dokumen Laporan Realisasi Dana</p>
          </div>

        <div className="form-grid" style={{ marginBottom: '2rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)' }}>Ringkasan Laporan</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>ID Laporan</p>
                <p className="font-medium">{selectedReport.id}</p>
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Pembuat Laporan</p>
                <p className="font-medium">{selectedReport.user}</p>
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Role Team</p>
                <p className="font-medium">{selectedReport.team}</p>
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>TO Cluster</p>
                <p className="font-medium">{selectedReport.toCluster}</p>
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Tanggal Submit</p>
                <p className="font-medium">{selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleDateString() : selectedReport.date ? new Date(selectedReport.date).toLocaleDateString() : '-'}</p>
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Kategori Kebutuhan</p>
                <p className="font-medium">{selectedReport.categoryLabel}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Total Dana Terpakai</p>
                <p className="font-medium" style={{ fontSize: '1.5rem', color: 'var(--secondary)' }}>Rp {selectedReport.totalUsed?.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Daftar Site */}
        {selectedReport.sites && selectedReport.sites.length > 0 && (
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Daftar Site</h3>
            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
              {selectedReport.sites.map((site, i) => (
                <p key={i} className="font-medium" style={{ marginBottom: '0.5rem' }}>{i + 1}. {site}</p>
              ))}
            </div>
          </div>
        )}

        {/* Informasi Kendaraan */}
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Informasi Kendaraan</h3>
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Jenis Kendaraan</p>
                <p className="font-medium">{selectedReport.vehicleType || '-'}</p>
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Plat Nomor</p>
                <p className="font-medium">{selectedReport.plateNumber || '-'}</p>
              </div>
              {['bbm-mobil', 'bbm-motor', 'bbm-genset'].includes(selectedReport.category) && selectedReport.kmBefore != null && (
                <>
                  <div>
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>KM/RH Before</p>
                    <p className="font-medium">{selectedReport.kmBefore?.toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>KM/RH After</p>
                    <p className="font-medium">{selectedReport.kmAfter?.toLocaleString('id-ID')}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Detail Pekerjaan */}
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label className="form-label">Detail Pekerjaan</label>
          <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
            <p>{selectedReport.detail || '-'}</p>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Rincian Item & Bukti</h3>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tgl Transfer</th>
                  <th>Kategori</th>
                  <th>Role</th>
                  <th>Deskripsi Item</th>
                  <th>Harga Satuan</th>
                  <th>Qty</th>
                  <th>Total Harga</th>
                </tr>
              </thead>
              <tbody>
                {selectedReport.items?.map((item, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{item.transferDate ? new Date(item.transferDate).toLocaleDateString() : '-'}</td>
                    <td>{item.categoryLabel || item.category || '-'}</td>
                    <td>{item.team ? item.team.toUpperCase() : '-'}</td>
                    <td className="font-medium">{item.description}</td>
                    <td>Rp {item.unitPrice?.toLocaleString('id-ID')}</td>
                    <td>{item.quantity}</td>
                    <td className="font-medium">Rp {(item.unitPrice * item.quantity)?.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {((selectedReport.attachments && selectedReport.attachments.length > 0) || selectedReport.photo) && (
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Bukti Transaksi / File Tambahan</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {selectedReport.attachments?.map(att => (
                <div key={att.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', display: 'inline-block', padding: '0.5rem', background: 'rgba(255,255,255,0.02)' }}>
                  {att.fileType && att.fileType.includes('pdf') ? (
                    <a href={att.filePath} target="_blank" rel="noreferrer" className="btn btn-secondary">
                      Lihat Dokumen PDF
                    </a>
                  ) : (
                    <img src={att.filePath} alt="Bukti" crossOrigin="anonymous" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
                  )}
                </div>
              ))}
              {selectedReport.photo && (!selectedReport.attachments || selectedReport.attachments.length === 0) && (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', display: 'inline-block', padding: '0.5rem', background: 'rgba(255,255,255,0.02)' }}>
                  <img src={selectedReport.photo} alt="Bukti Laporan" crossOrigin="anonymous" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
                </div>
              )}
            </div>
          </div>
        )}

        </div> {/* End of Print Area */}

        <div className="form-group">
          <label className="form-label">Catatan Revisi (Opsional)</label>
          <textarea 
            className="form-control" 
            placeholder="Tambahkan catatan jika ada revisi yang perlu diperbaiki..."
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
          ></textarea>
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={() => setSelectedReport(null)}>
            Batal
          </button>
          <button className="btn btn-danger" onClick={() => handleAction('reject')}>
            <AlertTriangle size={18} style={{ marginRight: '6px' }} />
            Tolak (Reject)
          </button>
          <button className="btn btn-warning" onClick={() => handleAction('revision')} style={{ color: '#000' }}>
            <AlertTriangle size={18} style={{ marginRight: '6px' }} />
            Minta Revisi
          </button>
          <button className="btn btn-success" onClick={() => handleAction('approve')}>
            <Check size={18} style={{ marginRight: '6px' }} />
            Setujui Laporan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem' }}>Review Laporan</h1>
          <p className="page-subtitle">Periksa laporan realisasi dan bukti nota dari karyawan.</p>
        </div>
        <button className="btn btn-success" onClick={() => {
          if (!reports || reports.length === 0) {
            alert('Tidak ada data laporan untuk diekspor.');
            return;
          }
          try {
            const excelData = reports.map(rep => ({
              'ID Laporan': rep.id || '-',
              'Terkait Pengajuan': rep.reqId || '-',
              'Pembuat': rep.user || '-',
              'Role Team': rep.team || '-',
              'TO Cluster': rep.toCluster || '-',
              'Kategori': rep.categoryLabel || '-',
              'Total Terpakai': rep.totalUsed || 0,
              'Tanggal Submit': rep.date ? new Date(rep.date).toLocaleDateString() : '-',
              'Status': rep.status || '-',
            }));
            const ws = XLSX.utils.json_to_sheet(excelData);
            const colWidths = Object.keys(excelData[0]).map(key => ({ wch: Math.max(key.length, 18) }));
            ws['!cols'] = colWidths;
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Laporan Realisasi');
            XLSX.writeFile(wb, `Laporan_Realisasi_${new Date().toISOString().slice(0,10)}.xlsx`);
          } catch (err) {
            console.error('Error exporting excel:', err);
            alert('Gagal mengekspor file Excel.');
          }
        }}>
          <FileSpreadsheet size={18} style={{ marginRight: '8px' }} />
          Export Excel
        </button>
      </div>

      <div className="data-section glass-panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Laporan</th>
                <th>Terkait Pengajuan</th>
                <th>Pembuat</th>
                <th>Role Team</th>
                <th>Kategori</th>
                <th>Total Terpakai</th>
                <th>Tanggal Submit</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada laporan ditemukan.</td></tr>
              ) : (
                reports.map((rep, index) => (
                  <tr key={index}>
                    <td><span className="text-muted">{rep.id}</span></td>
                    <td><span className="text-primary">{rep.reqId}</span></td>
                    <td>{rep.user}</td>
                    <td><span className="team-badge">{rep.team || '-'}</span></td>
                    <td>{rep.categoryLabel}</td>
                    <td>Rp {rep.totalUsed?.toLocaleString('id-ID')}</td>
                    <td>{rep.date ? new Date(rep.date).toLocaleDateString() : '-'}</td>
                    <td>
                      <span className={`status-badge status-${rep.status === 'Revision' ? 'warning' : 'pending'}`}>
                        {rep.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => handleReviewClick(rep)}>Review</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminReportView;
