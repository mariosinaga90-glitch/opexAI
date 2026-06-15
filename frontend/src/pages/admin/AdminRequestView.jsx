import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Check, X, Search, Filter, Download, FileSpreadsheet } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { API_BASE_URL } from '../../config';
import { getFileUrl } from '../../utils/fileUrl';
import { formatDateTime } from '../../utils/dateFormatter';

function AdminRequestView() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionNote, setActionNote] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCluster, setFilterCluster] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const printRef = useRef(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/requests`);
      if (res.ok) setRequests(await res.json());
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleReviewClick = async (reqSummary) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/requests/${reqSummary.id}`);
      if (res.ok) {
        setSelectedRequest(await res.json());
        setActionNote('');
      }
    } catch (error) {
      console.error('Failed to fetch request details:', error);
    }
  };

  const handleAction = async (action) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/requests/${selectedRequest.id}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote: actionNote })
      });
      if (res.ok) {
        setSelectedRequest(null);
        fetchRequests(); // Refresh list
      }
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
    }
  };

  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    const element = printRef.current;
    const opt = {
      margin:       0.5,
      filename:     `Request_${selectedRequest.id}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  if (selectedRequest) {
    return (
      <div className="glass-panel animate-fade-in-up" style={{ padding: '2rem' }}>
        <div className="section-header" style={{ marginBottom: '2rem' }}>
          <div>
            <button className="btn-icon" onClick={() => setSelectedRequest(null)} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={16} /> Kembali
            </button>
            <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Detail Pengajuan</h2>
            <p className="text-muted">Review dan berikan persetujuan untuk pengajuan dana ini.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span className={`status-badge status-${selectedRequest.status.toLowerCase()}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
              {selectedRequest.status}
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
            <p style={{ color: 'var(--text-muted)' }}>Dokumen Pengajuan Dana Operasional</p>
          </div>

        <div className="form-grid" style={{ marginBottom: '2rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)' }}>Profil Pengaju</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Nama Lengkap</p>
                <p className="font-medium">{selectedRequest.user}</p>
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Email</p>
                <p className="font-medium">{selectedRequest.email}</p>
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Role Team</p>
                <p className="font-medium">{selectedRequest.team}</p>
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>TO Cluster</p>
                <p className="font-medium">{selectedRequest.toCluster}</p>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)' }}>Informasi Pengajuan</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>ID Pengajuan</p>
                <p className="font-medium">{selectedRequest.id}</p>
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Tanggal Pengajuan</p>
                <p className="font-medium">{selectedRequest.createdAt ? formatDateTime(selectedRequest.createdAt) : formatDateTime(selectedRequest.date)}</p>
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Kategori Kebutuhan</p>
                <p className="font-medium">{selectedRequest.categoryLabel}</p>
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Judul</p>
                <p className="font-medium">{selectedRequest.title}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Total Estimasi Dana</p>
                <p className="font-medium" style={{ fontSize: '1.5rem', color: 'var(--secondary)' }}>Rp {selectedRequest.amount?.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Daftar Site */}
        {selectedRequest.sites && selectedRequest.sites.length > 0 && (
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Daftar Site</h3>
            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
              {selectedRequest.sites.map((site, i) => (
                <p key={i} className="font-medium" style={{ marginBottom: '0.5rem' }}>{i + 1}. {site}</p>
              ))}
            </div>
          </div>
        )}

        {/* Detail Kendaraan */}
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Informasi Kendaraan</h3>
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Jenis Kendaraan</p>
                <p className="font-medium">{selectedRequest.vehicleType || '-'}</p>
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Plat Nomor</p>
                <p className="font-medium">{selectedRequest.plateNumber || '-'}</p>
              </div>
              {['bbm-mobil', 'bbm-motor', 'bbm-genset'].includes(selectedRequest.category) && selectedRequest.kmBefore != null && (
                <>
                  <div>
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>KM/RH Before</p>
                    <p className="font-medium">{selectedRequest.kmBefore?.toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>KM/RH After</p>
                    <p className="font-medium">{selectedRequest.kmAfter?.toLocaleString('id-ID')}</p>
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
            <p>{selectedRequest.detail || '-'}</p>
          </div>
        </div>

        {/* Rincian Item */}
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Rincian Estimasi Kebutuhan</h3>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Kategori</th>
                  <th>Role</th>
                  <th>Deskripsi Item</th>
                  <th>Harga Satuan</th>
                  <th>Qty</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedRequest.items?.map((item, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{item.category || '-'}</td>
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

        {((selectedRequest.attachments && selectedRequest.attachments.length > 0) || selectedRequest.photo) && (
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Lampiran Pendukung</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {selectedRequest.attachments?.map(att => {
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
              {selectedRequest.photo && (!selectedRequest.attachments || selectedRequest.attachments.length === 0) && (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', display: 'inline-block', padding: '0.5rem', background: 'rgba(255,255,255,0.02)' }}>
                  <img src={getFileUrl(selectedRequest.photo)} alt="Lampiran" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
                </div>
              )}
            </div>
          </div>
        )}

        </div> {/* End of Print Area */}

        <div className="form-group">
          <label className="form-label">Catatan Admin (Opsional)</label>
          <textarea 
            className="form-control" 
            placeholder="Tambahkan catatan jika menyetujui atau alasan jika menolak..."
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
          ></textarea>
        </div>

        {selectedRequest.status === 'Pending' && (
          <div className="form-actions">
            <button className="btn btn-danger" onClick={() => handleAction('reject')}>
              <X size={18} style={{ marginRight: '6px' }} />
              Tolak (Reject)
            </button>
            <button className="btn btn-success" onClick={() => handleAction('approve')}>
              <Check size={18} style={{ marginRight: '6px' }} />
              Setujui (Approve)
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem' }}>Daftar Pengajuan</h1>
          <p className="page-subtitle">Kelola dan review seluruh pengajuan dana karyawan.</p>
        </div>
        <button className="btn btn-success" onClick={async () => {
          if (!requests || requests.length === 0) {
            alert('Tidak ada data untuk diekspor.');
            return;
          }
          try {
            setLoading(true);
            const filteredReqs = requests.filter(req => {
              const matchesStatus = statusFilter === 'all' || req.status?.toLowerCase() === statusFilter;
              const matchesSearch = searchQuery === '' || 
                req.user?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                req.id?.toString().includes(searchQuery);
              const matchesCluster = filterCluster === 'all' || req.toCluster === filterCluster;
              const matchesCategory = filterCategory === 'all' || req.categoryLabel === filterCategory;
              return matchesStatus && matchesSearch && matchesCluster && matchesCategory;
            });

            if (filteredReqs.length === 0) {
              alert('Tidak ada pengajuan yang sesuai filter.');
              setLoading(false);
              return;
            }

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Daftar Pengajuan');

            sheet.columns = [
              { header: 'ID Pengajuan', key: 'id', width: 15 },
              { header: 'Pengaju', key: 'user', width: 20 },
              { header: 'Email', key: 'email', width: 25 },
              { header: 'Role Team', key: 'team', width: 15 },
              { header: 'TO Cluster', key: 'toCluster', width: 20 },
              { header: 'Kategori', key: 'category', width: 20 },
              { header: 'Judul', key: 'title', width: 30 },
              { header: 'Jumlah', key: 'amount', width: 18 },
              { header: 'Tanggal', key: 'date', width: 20 },
              { header: 'Status', key: 'status', width: 15 },
              { header: 'Lampiran / Bukti', key: 'photo', width: 40 }
            ];

            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            for (let i = 0; i < filteredReqs.length; i++) {
              const req = filteredReqs[i];
              const res = await fetch(`${API_BASE_URL}/admin/requests/${req.id}`);
              const detail = res.ok ? await res.json() : null;
              
              const row = sheet.addRow({
                id: req.id || '-',
                user: req.user || '-',
                email: req.email || '-',
                team: req.team || '-',
                toCluster: req.toCluster || '-',
                category: req.categoryLabel || '-',
                title: req.title || '-',
                amount: req.amount || 0,
                date: req.date || req.createdAt ? formatDateTime(req.date || req.createdAt) : '-',
                status: req.status || '-',
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
                          tl: { col: 10, row: row.number - 1 },
                          ext: { width: 120, height: 120 },
                          editAs: 'oneCell'
                        });
                    } catch(e) {
                        console.error('Failed to embed image', e);
                        sheet.getCell(`K${row.number}`).value = `Gagal memuat: ${e.message}`;
                    }
                 } else {
                    sheet.getCell(`K${row.number}`).value = "Bukan format gambar";
                 }
              } else {
                 sheet.getCell(`K${row.number}`).value = "Tidak ada lampiran";
              }
            }

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Pengajuan_Dana_${new Date().toISOString().slice(0,10)}.xlsx`);
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
        <div className="section-header" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="search-input" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '300px' }}>
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Cari nama, ID, atau judul..." 
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
              <option value="completed">Completed</option>
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
                <th>ID</th>
                <th>Pengaju & Role</th>
                <th>TO Cluster</th>
                <th>Kategori</th>
                <th>Tanggal Pengajuan</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skel-admin-req-${idx}`}>
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
                    <td><div className="skeleton skeleton-text" style={{ width: '90px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '70px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada pengajuan ditemukan.</td></tr>
              ) : (() => {
                const filteredReqs = requests.filter(req => {
                  const matchesStatus = statusFilter === 'all' || req.status?.toLowerCase() === statusFilter;
                  const matchesSearch = searchQuery === '' || 
                    req.user?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    req.id?.toString().includes(searchQuery) ||
                    req.title?.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesCluster = filterCluster === 'all' || req.toCluster === filterCluster;
                  const matchesCategory = filterCategory === 'all' || req.categoryLabel === filterCategory;
                  return matchesStatus && matchesSearch && matchesCluster && matchesCategory;
                });
                
                if (filteredReqs.length === 0) {
                  return <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada pengajuan ditemukan.</td></tr>;
                }
                
                return filteredReqs.map((req, index) => (
                  <tr key={index}>
                    <td><span className="text-muted">{req.id}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span className="font-medium">{req.user}</span>
                        <span className="team-badge" style={{ width: 'fit-content' }}>{req.team || '-'}</span>
                      </div>
                    </td>
                    <td>{req.toCluster || '-'}</td>
                    <td>{req.categoryLabel}</td>
                    <td>{req.createdAt ? formatDateTime(req.createdAt) : req.date ? formatDateTime(req.date) : '-'}</td>
                    <td>Rp {req.amount?.toLocaleString('id-ID')}</td>
                    <td>
                      <span className={`status-badge status-${req.status?.toLowerCase()}`}>
                        {req.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => handleReviewClick(req)}>Review</button>
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

export default AdminRequestView;
