import React, { useState, useRef, useEffect } from 'react';
import { Plus, ArrowLeft, Download, FileText, X, UploadCloud, Trash2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { API_BASE_URL } from '../../config';

function FundRequestView({ onBack }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  // Form State
  const [items, setItems] = useState([{ id: 1, description: '', team: '', toCluster: '', category: '', categoryLabel: '', vehicleType: '', plateNumber: '', detail: '', transferDate: '', unitPrice: 0, quantity: 1, kmBefore: 0, kmAfter: 0 }]);
  const [sites, setSites] = useState([{ id: 1, siteName: '' }]);
  const [uploadUrl, setUploadUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${API_BASE_URL}/employee/requests`, {
        headers: { 'X-User-Id': user.id }
      });
      if (res.ok) setHistory(await res.json());
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClick = async (req) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${API_BASE_URL}/employee/requests/${req.id}`, {
        headers: { 'X-User-Id': user.id }
      });
      if (res.ok) {
        setSelectedRequest(await res.json());
      } else {
        setSelectedRequest(req);
      }
    } catch (error) {
      console.error('Failed to fetch request details:', error);
      setSelectedRequest(req);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const addSite = () => setSites([...sites, { id: Date.now(), siteName: '' }]);
  const removeSite = (id) => { if (sites.length > 1) setSites(sites.filter(site => site.id !== id)); };

  const addItem = () => {
    setItems([...items, { id: Date.now(), description: '', team: '', toCluster: '', category: '', categoryLabel: '', vehicleType: '', plateNumber: '', detail: '', unitPrice: 0, quantity: 1, kmBefore: 0, kmAfter: 0 }]);
  };

  const removeItem = (id) => { if (items.length > 1) setItems(items.filter(item => item.id !== id)); };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Auto-set category label
    if (field === 'category') {
      const select = document.getElementById(`cat-select-${index}`);
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
    const payload = {
      title: `Pengajuan ${mainItem.categoryLabel || 'Dana'}`,
      description: mainItem.detail || mainItem.description,
      amount: items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0),
      category: mainItem.category,
      categoryLabel: mainItem.categoryLabel,
      vehicleType: mainItem.vehicleType,
      plateNumber: mainItem.plateNumber,
      kmBefore: mainItem.kmBefore,
      kmAfter: mainItem.kmAfter,
      detail: mainItem.detail,
      items: items,
      sites: sites,
      uploadUrl: uploadUrl,
      requestDate: requestDate
    };

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${API_BASE_URL}/employee/requests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': user.id 
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsFormOpen(false);
        setItems([{ id: 1, description: '', team: '', toCluster: '', category: '', categoryLabel: '', vehicleType: '', plateNumber: '', detail: '', unitPrice: 0, quantity: 1, kmBefore: 0, kmAfter: 0 }]);
        setSites([{ id: 1, siteName: '' }]);
        setUploadUrl('');
        fetchHistory();
      } else {
        alert('Gagal mengirim pengajuan');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
    }
  };

  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    const opt = {
      margin: 0.5, filename: `Request_${selectedRequest.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(printRef.current).save();
  };

  if (selectedRequest) {
    return (
      <div className="glass-panel animate-fade-in-up" style={{ padding: '2rem' }}>
        <div className="section-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <button className="btn-icon" onClick={() => setSelectedRequest(null)} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={16} /> Kembali
            </button>
            <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Detail Pengajuan</h2>
          </div>
          <button className="btn btn-primary" onClick={handleDownloadPDF}>
            <Download size={18} style={{ marginRight: '8px' }} /> Download PDF
          </button>
        </div>

        <div ref={printRef} style={{ padding: '1rem', backgroundColor: 'var(--bg-card)', borderRadius: '8px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>OpexAI</h1>
            <p style={{ color: 'var(--text-muted)' }}>Dokumen Pengajuan Dana Operasional</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <div><p className="text-muted" style={{ fontSize: '0.9rem' }}>ID Pengajuan</p><p className="font-medium" style={{ fontSize: '1.1rem' }}>{selectedRequest.id}</p></div>
            <div><p className="text-muted" style={{ fontSize: '0.9rem' }}>Tanggal</p><p className="font-medium" style={{ fontSize: '1.1rem' }}>{selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleDateString() : '-'}</p></div>
            <div><p className="text-muted" style={{ fontSize: '0.9rem' }}>Judul Pengajuan</p><p className="font-medium" style={{ fontSize: '1.1rem' }}>{selectedRequest.title}</p></div>
            <div><p className="text-muted" style={{ fontSize: '0.9rem' }}>Status</p><p className="font-medium" style={{ fontSize: '1.1rem' }}>{selectedRequest.status}</p></div>
          </div>

          {selectedRequest.sites && selectedRequest.sites.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Daftar Site</h3>
              <div style={{ padding: '1rem', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '6px' }}>
                {selectedRequest.sites.map((site, i) => (
                  <p key={i} className="font-medium" style={{ marginBottom: '0.25rem' }}>{i + 1}. {site}</p>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Informasi Kendaraan</h3>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '6px' }}>
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

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Deskripsi Keperluan</h3>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '6px' }}>
              <p>{selectedRequest.description}</p>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Jumlah Dana</h3>
            <p className="font-medium" style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}>Rp {selectedRequest.amount?.toLocaleString('id-ID')}</p>
          </div>

          {selectedRequest.items && selectedRequest.items.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Rincian Item</h3>
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
                      <th>Total Harga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRequest.items.map((item, i) => (
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
          )}

          {((selectedRequest.attachments && selectedRequest.attachments.length > 0) || selectedRequest.photo) && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Bukti Transaksi / File Tambahan</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {selectedRequest.attachments?.map(att => (
                  <div key={att.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', display: 'inline-block', padding: '0.5rem', background: 'rgba(0,0,0,0.02)' }}>
                    {att.fileType && att.fileType.includes('pdf') ? (
                      <a href={att.filePath} target="_blank" rel="noreferrer" className="btn btn-secondary">
                        Lihat Dokumen PDF
                      </a>
                    ) : (
                      <img src={att.filePath} alt="Bukti" crossOrigin="anonymous" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
                    )}
                  </div>
                ))}
                {selectedRequest.photo && (!selectedRequest.attachments || selectedRequest.attachments.length === 0) && (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', display: 'inline-block', padding: '0.5rem', background: 'rgba(0,0,0,0.02)' }}>
                    <img src={selectedRequest.photo} alt="Bukti" crossOrigin="anonymous" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
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
            <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Buat Pengajuan Dana</h2>
            <p className="text-muted">Isi formulir di bawah ini dengan lengkap untuk mengajukan dana operasional.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
            <label className="form-label">Tanggal Pengajuan</label>
            <input 
              type="date" 
              className="form-control" 
              required 
              value={requestDate}
              onChange={(e) => setRequestDate(e.target.value)}
            />
          </div>

          <div style={{ marginTop: '3rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>Daftar Site</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addSite}>
              <Plus size={16} style={{ marginRight: '4px' }} /> Tambah Site
            </button>
          </div>

          {sites.map((site, index) => (
            <div key={site.id} className="dynamic-list-item" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              {sites.length > 1 && (
                <button type="button" className="remove-item-btn" onClick={() => removeSite(site.id)}>
                  <Trash2 size={18} />
                </button>
              )}
              <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Site #{index + 1}</h4>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama / ID Site</label>
                <input type="text" className="form-control" placeholder="Contoh: BKS001 - Site Tambun" required value={site.siteName} onChange={e => {
                  const newSites = [...sites];
                  newSites[index].siteName = e.target.value;
                  setSites(newSites);
                }} />
              </div>
            </div>
          ))}

          <div style={{ marginTop: '3rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>Rincian Estimasi Kebutuhan</h3>
          </div>

          {items.map((item, index) => (
            <div key={item.id} className="dynamic-list-item">
              <div className="form-group">
                <label className="form-label">Deskripsi Item</label>
                <input type="text" className="form-control" placeholder="Contoh: Pembelian Snack Box" required value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Role Team</label>
                  <select className="form-control" required value={item.team} onChange={e => updateItem(index, 'team', e.target.value)}>
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
                  <select id={`cat-select-${index}`} className="form-control" required value={item.category} onChange={e => updateItem(index, 'category', e.target.value)}>
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
                  <label className="form-label">Detail Pekerjaan</label>
                  <input type="text" className="form-control" placeholder="Penjelasan detail..." value={item.detail} onChange={e => updateItem(index, 'detail', e.target.value)} />
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
                  <label className="form-label">Harga Satuan (Estimasi)</label>
                  <input type="number" className="form-control" placeholder="0" required value={item.unitPrice} onChange={e => updateItem(index, 'unitPrice', Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah (Qty)</label>
                  <input type="number" className="form-control" placeholder="1" required value={item.quantity} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} />
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
                  <input type="number" className="form-control" placeholder="Contoh: 45000" min="0" value={item.kmBefore} onChange={e => updateItem(index, 'kmBefore', Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">KM/RH After</label>
                  <input type="number" className="form-control" placeholder="Contoh: 45250" min="0" value={item.kmAfter} onChange={e => updateItem(index, 'kmAfter', Number(e.target.value))} />
                </div>
              </div>
              )}
            </div>
          ))}

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label className="form-label">Upload Foto / Bukti (Opsional, Max 5MB)</label>
            <div className="file-upload-box" style={{ position: 'relative' }}>
              <input type="file" onChange={handleFileUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} accept="image/*,.pdf" />
              <UploadCloud size={32} className="file-upload-icon" />
              <p className="file-upload-text">{isUploading ? 'Mengunggah...' : uploadUrl ? 'File berhasil diunggah!' : 'Klik atau drag and drop file di sini'}</p>
              {uploadUrl && <span style={{ color: 'var(--success)' }}>Berhasil: {uploadUrl.split('/').pop()}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={isUploading}>Submit Pengajuan</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem' }}>Riwayat Pengajuan</h1>
          <p className="page-subtitle">Daftar seluruh pengajuan dana Anda beserta status terkini.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsFormOpen(true)}>
          <Plus size={18} style={{ marginRight: '8px' }} />
          Ajukan Dana Baru
        </button>
      </div>

      <div className="data-section glass-panel">
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
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada pengajuan.</td></tr>
              ) : (
                history.map((req, index) => (
                  <tr key={index}>
                    <td><span className="text-muted">{req.id}</span></td>
                    <td className="font-medium">{req.title}</td>
                    <td>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}</td>
                    <td>Rp {req.amount?.toLocaleString('id-ID')}</td>
                    <td>
                      <span className={`status-badge status-${req.status?.toLowerCase()}`}>
                        {req.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => handleReviewClick(req)}>Detail</button>
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

export default FundRequestView;
