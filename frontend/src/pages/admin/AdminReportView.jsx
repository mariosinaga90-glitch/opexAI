import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Check, AlertTriangle, FileText, Download, FileSpreadsheet, Search, Filter } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { API_BASE_URL } from '../../config';
import { getFileUrl } from '../../utils/fileUrl';
import { formatDateTime, formatDate } from '../../utils/dateFormatter';

function AdminReportView() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionNote, setActionNote] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCluster, setFilterCluster] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
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
            <h1 style={{ fontSize: '1.8rem', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>OpexTac</h1>
            <p style={{ color: 'var(--text-muted)' }}>Dokumen Laporan Realisasi Dana</p>
          </div>

        <div className="form-grid" style={{ marginBottom: '2rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)' }}>Ringkasan Laporan</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
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
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Tanggal Pengajuan</p>
                <p className="font-medium">{selectedReport.requestDate ? formatDateTime(selectedReport.requestDate) : '-'}</p>
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Tanggal Pelaporan</p>
                <p className="font-medium" style={{ color: 'var(--accent-amber)' }}>{selectedReport.createdAt ? formatDateTime(selectedReport.createdAt) : selectedReport.date ? formatDateTime(selectedReport.date) : '-'}</p>
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
                    <td>{item.transferDate ? formatDate(item.transferDate) : '-'}</td>
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
              {selectedReport.attachments?.map(att => {
                const isPdf = att.fileType?.includes('pdf') || att.filePath?.toLowerCase().endsWith('.pdf');
                return (
                  <div key={att.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', display: 'inline-block', padding: '0.5rem', background: 'rgba(255,255,255,0.02)' }}>
                    {isPdf ? (
                      <a href={getFileUrl(att.filePath)} target="_blank" rel="noreferrer" className="btn btn-secondary">
                        Lihat Dokumen PDF
                      </a>
                    ) : (
                      <img src={getFileUrl(att.filePath)} alt="Bukti" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
                    )}
                  </div>
                );
              })}
              {selectedReport.photo && (!selectedReport.attachments || selectedReport.attachments.length === 0) && (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', display: 'inline-block', padding: '0.5rem', background: 'rgba(255,255,255,0.02)' }}>
                  <img src={getFileUrl(selectedReport.photo)} alt="Bukti Laporan" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
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
        <button className="btn btn-success" onClick={async () => {
          if (!reports || reports.length === 0) {
            alert('Tidak ada data laporan untuk diekspor.');
            return;
          }
          try {
            setLoading(true);
            const filteredReps = reports.filter(rep => {
              const matchesStatus = statusFilter === 'all' || rep.status?.toLowerCase() === statusFilter;
              const matchesSearch = searchQuery === '' || 
                rep.user?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                rep.id?.toString().includes(searchQuery) ||
                rep.reqId?.toString().includes(searchQuery);
              const matchesCluster = filterCluster === 'all' || rep.toCluster === filterCluster;
              const matchesCategory = filterCategory === 'all' || rep.categoryLabel === filterCategory;
              return matchesStatus && matchesSearch && matchesCluster && matchesCategory;
            });

            if (filteredReps.length === 0) {
              alert('Tidak ada laporan yang sesuai filter.');
              setLoading(false);
              return;
            }

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Laporan Realisasi');

            sheet.columns = [
              { header: 'ID Laporan', key: 'id', width: 15 },
              { header: 'Terkait Pengajuan', key: 'reqId', width: 20 },
              { header: 'Pembuat', key: 'user', width: 20 },
              { header: 'Role Team', key: 'team', width: 15 },
              { header: 'TO Cluster', key: 'toCluster', width: 20 },
              { header: 'Kategori', key: 'category', width: 20 },
              { header: 'Total Terpakai', key: 'total', width: 18 },
              { header: 'Tanggal Pengajuan', key: 'reqDate', width: 20 },
              { header: 'Status', key: 'status', width: 15 },
              { header: 'Bukti / Nota', key: 'photo', width: 40 }
            ];

            // Setup Header Styling
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            for (let i = 0; i < filteredReps.length; i++) {
              const rep = filteredReps[i];
              const res = await fetch(`${API_BASE_URL}/admin/reports/${rep.id}`);
              const detail = res.ok ? await res.json() : null;
              
              const row = sheet.addRow({
                id: rep.id || '-',
                reqId: rep.reqId || '-',
                user: rep.user || '-',
                team: rep.team || '-',
                toCluster: rep.toCluster || '-',
                category: rep.categoryLabel || '-',
                total: rep.totalUsed || 0,
                reqDate: rep.date || rep.createdAt ? formatDateTime(rep.date || rep.createdAt) : '-',
                status: rep.status || '-',
                photo: ''
              });
              
              row.height = 100;
              row.alignment = { vertical: 'middle' };

              if (detail && detail.attachments && detail.attachments.length > 0) {
                 const imgAtt = detail.attachments.find(a => {
                    const extension = a.filePath?.split('.').pop().toLowerCase();
                    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);
                 });
                 
                 if (imgAtt) {
                    try {
                        const urlToFetch = getFileUrl(imgAtt.filePath);
                        const imgRes = await fetch(urlToFetch);
                        if (!imgRes.ok) throw new Error(`Status ${imgRes.status} on ${urlToFetch}`);
                        
                        const blob = await imgRes.blob();
                        const base64Data = await new Promise((resolve, reject) => {
                           const reader = new FileReader();
                           reader.onloadend = () => resolve(reader.result);
                           reader.onerror = reject;
                           reader.readAsDataURL(blob);
                        });
                        
                        const ext = imgAtt.filePath.split('.').pop().toLowerCase() === 'png' ? 'png' : 'jpeg';
                        const imageId = workbook.addImage({
                          base64: base64Data,
                          extension: ext,
                        });
                        
                        sheet.addImage(imageId, {
                          tl: { col: 9, row: row.number - 1 },
                          ext: { width: 120, height: 120 },
                          editAs: 'oneCell'
                        });
                    } catch(e) {
                        console.error('Failed to embed image', e);
                        sheet.getCell(`J${row.number}`).value = `Gagal: ${e.message || 'Error Buffer/Base64'}`;
                    }
                 } else {
                    sheet.getCell(`J${row.number}`).value = "Bukan format gambar";
                 }
              } else {
                 sheet.getCell(`J${row.number}`).value = "Tidak ada bukti";
              }
            }

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Laporan_Realisasi_${new Date().toISOString().slice(0,10)}.xlsx`);
          } catch (err) {
            console.error('Error exporting excel:', err);
            alert('Gagal mengekspor file Excel. Cek koneksi jaringan Anda.');
          } finally {
            setLoading(false);
          }
        }}>
          <FileSpreadsheet size={18} style={{ marginRight: '8px' }} />
          Export Excel
        </button>
      </div>

      <div className="data-section glass-panel">
        <div className="section-header" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div className="search-input" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '300px' }}>
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Cari nama atau ID..." 
              style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none', width: '100%' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Filter size={18} className="text-muted" />
            <select 
              className="form-control" 
              style={{ width: 'auto', backgroundColor: 'rgba(30, 41, 59, 0.7)' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="revision">Revision</option>
            </select>
            <select 
              className="form-control" 
              style={{ width: 'auto', backgroundColor: 'rgba(30, 41, 59, 0.7)' }}
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
                <th>ID Laporan</th>
                <th>Terkait Pengajuan</th>
                <th>Pembuat & Role</th>
                <th>Kategori</th>
                <th>Total Terpakai</th>
                <th>Tanggal Pengajuan</th>
                <th>Tanggal Pelaporan</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada laporan ditemukan.</td></tr>
              ) : (() => {
                const filteredReps = reports.filter(rep => {
                  const matchesStatus = statusFilter === 'all' || rep.status?.toLowerCase() === statusFilter;
                  const matchesSearch = searchQuery === '' || 
                    rep.user?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    rep.id?.toString().includes(searchQuery) ||
                    rep.reqId?.toString().includes(searchQuery);
                  const matchesCluster = filterCluster === 'all' || rep.toCluster === filterCluster;
                  const matchesCategory = filterCategory === 'all' || rep.categoryLabel === filterCategory;
                  return matchesStatus && matchesSearch && matchesCluster && matchesCategory;
                });

                if (filteredReps.length === 0) {
                  return <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada laporan ditemukan.</td></tr>;
                }

                return filteredReps.map((rep, index) => (
                  <tr key={index}>
                    <td><span className="text-muted">{rep.id}</span></td>
                    <td><span className="text-primary">{rep.reqId}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span className="font-medium">{rep.user}</span>
                        <span className="team-badge" style={{ width: 'fit-content' }}>{rep.team || '-'}</span>
                      </div>
                    </td>
                    <td>{rep.categoryLabel}</td>
                    <td>Rp {rep.totalUsed?.toLocaleString('id-ID')}</td>
                    <td>{rep.requestDate ? formatDateTime(rep.requestDate) : '-'}</td>
                    <td>{rep.date || rep.createdAt ? formatDateTime(rep.date || rep.createdAt) : '-'}</td>
                    <td>
                      <span className={`status-badge status-${rep.status === 'Revision' ? 'warning' : 'pending'}`}>
                        {rep.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => handleReviewClick(rep)}>Review</button>
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

export default AdminReportView;
