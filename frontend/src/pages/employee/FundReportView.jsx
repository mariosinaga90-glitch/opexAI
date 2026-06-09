import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Plus, Trash2, ArrowLeft, FileText, Download, X } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { API_BASE_URL } from '../../config';
import { getFileUrl } from '../../utils/fileUrl';
import { formatDateTime } from '../../utils/dateFormatter';

function FundReportView() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  const [approvedRequests, setApprovedRequests] = useState([]);
  const [reqId, setReqId] = useState('');
  const [summary, setSummary] = useState('');
  const [requestedAmount, setRequestedAmount] = useState(0);
  const [requestSites, setRequestSites] = useState([]);
  
  const [items, setItems] = useState([{ id: 1, description: '', team: '', toCluster: '', category: '', categoryLabel: '', vehicleType: '', plateNumber: '', detail: '', transferDate: '', unitPrice: 0, quantity: 1, kmBefore: 0, kmAfter: 0 }]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0,10));

  const fetchData = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const headers = { 'X-User-Id': user.id };

      let historyData = [];
      const resHistory = await fetch(`${API_BASE_URL}/employee/reports`, { headers });
      if (resHistory.ok) {
        historyData = await resHistory.json();
        setHistory(historyData);
      }

      const resReqs = await fetch(`${API_BASE_URL}/employee/requests`, { headers });
      if (resReqs.ok) {
        const reqsData = await resReqs.json();
        const reportedRequestIds = new Set(
          historyData
            .filter(rep => rep.status !== 'Rejected' && rep.status !== 'Revision')
            .map(rep => rep.reqId || rep.requestId)
        );
        setApprovedRequests(reqsData.filter(r => r.status === 'Approved' && !reportedRequestIds.has(r.id)));
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReviewClick = async (rep) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${API_BASE_URL}/employee/reports/${rep.id}`, {
        headers: { 'X-User-Id': user.id }
      });
      if (res.ok) {
        setSelectedReport(await res.json());
      } else {
        setSelectedReport(rep);
      }
    } catch (error) {
      console.error('Failed to fetch report details:', error);
      setSelectedReport(rep);
    }
  };

  const handleReqIdChange = async (e) => {
    const id = e.target.value;
    setReqId(id);
    if (!id) return;
    
    const selectedReq = approvedRequests.find(r => r.id === id);
    if (selectedReq) {
      setSummary(selectedReq.title || '');
      setRequestedAmount(selectedReq.amount || 0);
    }

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${API_BASE_URL}/employee/requests/${id}`, {
        headers: { 'X-User-Id': user.id }
      });
      if (res.ok) {
        const data = await res.json();
        // Set sites from the request
        setRequestSites(data.sites || []);
        if (data.items && data.items.length > 0) {
          setItems(data.items.map((i, idx) => ({
            id: i.id || Date.now() + idx,
            description: i.description || '',
            unitPrice: i.unitPrice || 0,
            quantity: i.quantity || 1,
            category: data.category || '',
            categoryLabel: data.categoryLabel || '',
            vehicleType: data.vehicleType || '',
            plateNumber: data.plateNumber || '',
            kmBefore: data.kmBefore || 0,
            kmAfter: data.kmAfter || 0,
            detail: data.detail || '',
            team: '',
            toCluster: '',
            transferDate: '',
          })));
        }
      }
    } catch (err) {
      console.error('Error fetching request details:', err);
    }
  };

  const addItem = () => setItems([...items, { id: Date.now(), description: '', team: '', toCluster: '', category: '', categoryLabel: '', vehicleType: '', plateNumber: '', detail: '', transferDate: '', unitPrice: 0, quantity: 1, kmBefore: 0, kmAfter: 0 }]);
  const removeItem = (id) => { if (items.length > 1) setItems(items.filter(item => item.id !== id)); };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'category') {
      const select = document.getElementById(`rep-cat-${index}`);
      if (select) {
        newItems[index].categoryLabel = select.options[select.selectedIndex].text;
      }
      if (!['bbm-mobil', 'bbm-motor', 'bbm-genset'].includes(value)) {
        newItems[index].kmBefore = 0;
        newItems[index].kmAfter = 0;
      }
    }
    setItems(newItems);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) setUploadUrl(data.url);
      else alert('Upload gagal');
    } catch (err) {
      console.error(err);
      alert('Upload error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const mainItem = items[0];
    const totalUsed = items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
    
    if (totalUsed !== requestedAmount) {
      alert(`Gagal Submit: Harga Total Realisasi (Rp ${totalUsed.toLocaleString('id-ID')}) harus SAMA PERSIS dengan Harga Total Pengajuan (Rp ${requestedAmount.toLocaleString('id-ID')}).`);
      return;
    }
    
    const payload = {
      requestId: reqId,
      totalUsed: totalUsed,
      summary: summary,
      category: mainItem.category,
      categoryLabel: mainItem.categoryLabel,
      vehicleType: mainItem.vehicleType,
      plateNumber: mainItem.plateNumber,
      kmBefore: mainItem.kmBefore,
      kmAfter: mainItem.kmAfter,
      detail: mainItem.detail,
      items: items,
      uploadUrl: uploadUrl,
      reportDate: reportDate
    };

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${API_BASE_URL}/employee/reports`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': user.id 
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsFormOpen(false);
        setItems([{ id: 1, description: '', team: '', toCluster: '', category: '', categoryLabel: '', vehicleType: '', plateNumber: '', detail: '', transferDate: '', unitPrice: 0, quantity: 1, kmBefore: 0, kmAfter: 0 }]);
        setSummary('');
        setUploadUrl('');
        setReportDate(new Date().toISOString().slice(0,10));
        setRequestSites([]);
        fetchData();
      } else {
        alert('Gagal mengirim laporan');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  };

  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    const opt = {
      margin: 0.5, filename: `Report_${selectedReport.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(printRef.current).save();
  };

  if (selectedReport) {
    return (
      <div className="glass-panel animate-fade-in-up" style={{ padding: '2rem' }}>
        <div className="section-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <button className="btn-icon" onClick={() => setSelectedReport(null)} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={16} /> Kembali
            </button>
            <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Detail Laporan Realisasi</h2>
          </div>
          <button className="btn btn-primary" onClick={handleDownloadPDF}>
            <Download size={18} style={{ marginRight: '8px' }} /> Download PDF
          </button>
        </div>

        <div ref={printRef} style={{ padding: '1rem', backgroundColor: 'var(--bg-card)', borderRadius: '8px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>OpexTac</h1>
            <p style={{ color: 'var(--text-muted)' }}>Dokumen Laporan Realisasi Dana</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              <div><p className="text-muted" style={{ fontSize: '0.9rem' }}>ID Laporan</p><p className="font-medium" style={{ fontSize: '1.1rem' }}>{selectedReport.id}</p></div>
              <div><p className="text-muted" style={{ fontSize: '0.9rem' }}>Tanggal Pengajuan</p><p className="font-medium" style={{ fontSize: '1.1rem' }}>{selectedReport.requestDate ? formatDateTime(selectedReport.requestDate) : '-'}</p></div>
              <div><p className="text-muted" style={{ fontSize: '0.9rem' }}>Tanggal Pelaporan</p><p className="font-medium" style={{ fontSize: '1.1rem', color: 'var(--accent-amber)' }}>{selectedReport.createdAt ? formatDateTime(selectedReport.createdAt) : selectedReport.date ? formatDateTime(selectedReport.date) : '-'}</p></div>
              <div><p className="text-muted" style={{ fontSize: '0.9rem' }}>Terkait Pengajuan</p><p className="font-medium" style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{selectedReport.reqId || selectedReport.requestId}</p></div>
              <div><p className="text-muted" style={{ fontSize: '0.9rem' }}>Status</p><p className="font-medium" style={{ fontSize: '1.1rem' }}>{selectedReport.status}</p></div>
          </div>

          {selectedReport.sites && selectedReport.sites.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Daftar Site</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {selectedReport.sites.map((site, idx) => (
                  <span key={idx} style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--primary)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                  }}>{site}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Ringkasan Penggunaan</h3>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '6px' }}>
              <p>{selectedReport.summary || selectedReport.description || '-'}</p>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Informasi Kendaraan</h3>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '6px' }}>
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

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Detail Pekerjaan</h3>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '6px' }}>
              <p>{selectedReport.detail || '-'}</p>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Total Pengeluaran</h3>
            <p className="font-medium" style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}>Rp {selectedReport.totalUsed?.toLocaleString('id-ID')}</p>
          </div>

          {selectedReport.items && selectedReport.items.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Rincian Item & Bukti</h3>
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
                    {selectedReport.items.map((item, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{item.transferDate ? formatDateTime(item.transferDate) : '-'}</td>
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
          )}

          {((selectedReport.attachments && selectedReport.attachments.length > 0) || selectedReport.photo) && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Bukti Transaksi / File Tambahan</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {selectedReport.attachments?.map(att => (
                  <div key={att.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', display: 'inline-block', padding: '0.5rem', background: 'rgba(0,0,0,0.02)' }}>
                    {att.fileType && att.fileType.includes('pdf') ? (
                      <a href={getFileUrl(att.filePath)} target="_blank" rel="noreferrer" className="btn btn-secondary">
                        Lihat Dokumen PDF
                      </a>
                    ) : (
                      <img src={getFileUrl(att.filePath)} alt="Bukti" crossOrigin="anonymous" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
                    )}
                  </div>
                ))}
                {selectedReport.photo && (!selectedReport.attachments || selectedReport.attachments.length === 0) && (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', display: 'inline-block', padding: '0.5rem', background: 'rgba(0,0,0,0.02)' }}>
                    <img src={getFileUrl(selectedReport.photo)} alt="Bukti" crossOrigin="anonymous" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isFormOpen) {
    return (
      <div className="glass-panel animate-fade-in-up" style={{ padding: '2rem' }}>
        <div className="section-header" style={{ marginBottom: '2rem' }}>
          <div>
            <button className="btn-icon" onClick={() => setIsFormOpen(false)} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={16} /> Kembali
            </button>
            <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Buat Laporan Realisasi</h2>
            <p className="text-muted">Isi rincian pengeluaran dana untuk pengajuan terkait.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">Pilih Pengajuan Terkait (Approved)</label>
            <select className="form-control" value={reqId} onChange={handleReqIdChange} required>
              <option value="">-- Pilih Pengajuan yang Disetujui --</option>
              {approvedRequests.map(req => (
                <option key={req.id} value={req.id}>{req.id} - {req.title} (Rp {req.amount?.toLocaleString('id-ID')})</option>
              ))}
            </select>
          </div>

          {requestSites.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Daftar Site (dari Pengajuan)</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {requestSites.map((site, idx) => (
                  <span key={idx} style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--primary)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                  }}>{site}</span>
                ))}
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">Ringkasan Penggunaan Dana</label>
            <textarea className="form-control" rows="3" placeholder="Jelaskan secara singkat penggunaan dana..." value={summary} onChange={(e) => setSummary(e.target.value)} required></textarea>
          </div>

          <div style={{ marginTop: '3rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>Rincian Laporan (Sesuai Nota)</h3>
          </div>

          {items.map((item, index) => (
            <div key={item.id} className="dynamic-list-item">

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Role Team</label>
                  <select className="form-control" required value={item.team} onChange={(e) => updateItem(index, 'team', e.target.value)}>
                    <option value="">Pilih Role...</option>
                    <option value="ts">TS</option>
                    <option value="mbp">MBP</option>
                    <option value="pm">PM</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">TO Cluster</label>
                  <select className="form-control" required value={item.toCluster} onChange={e => updateItem(index, 'toCluster', e.target.value)}>
                    <option value="">Pilih TO Cluster...</option>
                    <option value="bekasi">TO Kab. Bekasi</option>
                    <option value="karawang">TO Karawang</option>
                    <option value="purwakarta">TO Purwakarta</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Kategori Kebutuhan</label>
                  <select id={`rep-cat-${index}`} className="form-control" required value={item.category} onChange={(e) => updateItem(index, 'category', e.target.value)}>
                    <option value="">Pilih Kategori...</option>
                    <option value="bbm-mobil">BBM Mobil</option>
                    <option value="bbm-motor">BBM Motor</option>
                    <option value="bbm-genset">BBM Genset</option>
                    <option value="parkir-toll">Parkir - Toll</option>
                    <option value="material">Material</option>
                    <option value="ormas">Ormas</option>
                    <option value="homebase-dop">Kebutuhan Homebase/DOP</option>
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Deskripsi / Detail Pekerjaan</label>
                  <input type="text" className="form-control" placeholder="Penjelasan detail..." required value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Jenis Kendaraan</label>
                  <select className="form-control" value={item.vehicleType} onChange={e => updateItem(index, 'vehicleType', e.target.value)}>
                    <option value="">Pilih Kendaraan...</option>
                    <option value="mobil">Mobil</option>
                    <option value="motor">Motor</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Plat Nomor Kendaraan</label>
                  <input type="text" className="form-control" placeholder="Contoh: B 1234 CD" value={item.plateNumber} onChange={e => updateItem(index, 'plateNumber', e.target.value.toUpperCase())} />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Tanggal Transfer</label>
                  <input type="date" className="form-control" required value={item.transferDate} onChange={(e) => updateItem(index, 'transferDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Harga Satuan (Sesuai Nota)</label>
                  <input type="number" className="form-control" placeholder="0" required value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah (Qty)</label>
                  <input type="number" className="form-control" placeholder="1" required value={item.quantity} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Harga Total</label>
                  <input type="text" className="form-control" value={`Rp ${(item.unitPrice * item.quantity).toLocaleString('id-ID')}`} disabled style={{ backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 'bold' }} />
                </div>
              </div>

              {['bbm-mobil', 'bbm-motor', 'bbm-genset'].includes(item.category) && (
              <div className="form-grid" style={{ marginTop: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">KM/RH Before</label>
                  <input type="number" className="form-control" placeholder="Contoh: 45000" min="0" value={item.kmBefore} onChange={(e) => updateItem(index, 'kmBefore', Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">KM/RH After</label>
                  <input type="number" className="form-control" placeholder="Contoh: 45250" min="0" value={item.kmAfter} onChange={(e) => updateItem(index, 'kmAfter', Number(e.target.value))} />
                </div>
              </div>
              )}
            </div>
          ))}

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label className="form-label">Upload Lampiran (Max 5MB)</label>
            <div className="file-upload-box" style={{ position: 'relative' }}>
              <input type="file" onChange={handleFileUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} accept="image/*,.pdf" />
              <UploadCloud size={32} className="file-upload-icon" />
              <p className="file-upload-text">{isUploading ? 'Mengunggah...' : uploadUrl ? 'File berhasil diunggah!' : 'Klik atau drag and drop bukti transfer / nota'}</p>
              {uploadUrl && <span style={{ color: 'var(--success)' }}>Berhasil: {uploadUrl.split('/').pop()}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={isUploading}>Kirim Laporan</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem' }}>Riwayat Laporan</h1>
          <p className="page-subtitle">Daftar laporan realisasi dana yang telah Anda submit.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsFormOpen(true)}>
          <Plus size={18} style={{ marginRight: '8px' }} /> Buat Laporan
        </button>
      </div>

      <div className="data-section glass-panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Terkait Pengajuan</th>
                <th>Tgl Pengajuan & Pelaporan</th>
                <th>Total Terpakai</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada laporan.</td></tr>
              ) : (
                history.map((rep, index) => (
                  <tr key={index}>
                    <td><span className="text-muted">{rep.id}</span></td>
                    <td><span className="text-primary">{rep.reqId || rep.requestId}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span className="font-medium" style={{ fontSize: '0.85rem' }}>Req: {rep.requestDate ? formatDateTime(rep.requestDate) : '-'}</span>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Rep: {rep.createdAt ? formatDateTime(rep.createdAt) : rep.date ? formatDateTime(rep.date) : '-'}</span>
                      </div>
                    </td>
                    <td>Rp {rep.totalUsed?.toLocaleString('id-ID')}</td>
                    <td>
                      <span className={`status-badge status-${rep.status?.toLowerCase().replace(' ', '-')}`}>
                        {rep.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => handleReviewClick(rep)}>Detail</button>
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

export default FundReportView;
