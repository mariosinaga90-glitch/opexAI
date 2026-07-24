import React, { useState, useEffect } from 'react';
import { Save, FileText, ArrowLeft, Image as ImageIcon, Loader2 } from 'lucide-react';
import { formatDateTime } from '../../utils/dateFormatter';

const API_BASE_URL = '/api';

function BackupPowerForm() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [selectedReport, setSelectedReport] = useState(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  
  // Upload states
  const [uploadingField, setUploadingField] = useState(null);

  const initialForm = {
    ticketNo: '',
    siteId: '',
    siteName: '',
    backupDate: '',
    nop: '',
    cluster: '',
    plnOffTime: '',
    rhBefore: '',
    backupStartTime: '',
    plnOnTime: '',
    rhAfter: '',
    backupEndTime: '',
    outageCause: '',
    photoOutageCause: '',
    photoPlnOff: '',
    photoRhBefore: '',
    photoPlnOn: '',
    photoRhAfter: ''
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchReports();
  }, []);

  // Load draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('backupPowerDraft');
      if (saved) {
        setFormData(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading draft', e);
    }
  }, []);

  // Save draft on change
  useEffect(() => {
    if (JSON.stringify(formData) !== JSON.stringify(initialForm)) {
      localStorage.setItem('backupPowerDraft', JSON.stringify(formData));
    }
  }, [formData]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${API_BASE_URL}/backup-power`);
      const data = await res.json();
      // Filter only for this user
      const userReports = data.filter(r => r.userId === user.id);
      setReports(userReports);
    } catch (err) {
      console.error('Failed to fetch backup power reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingField(fieldName);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) {
        setFormData({ ...formData, [fieldName]: data.url });
      } else {
        alert('Upload gagal');
      }
    } catch (err) {
      console.error(err);
      alert('Upload error');
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const payload = {
        userId: user.id,
        ...formData,
        rhBefore: formData.rhBefore ? Number(formData.rhBefore) : null,
        rhAfter: formData.rhAfter ? Number(formData.rhAfter) : null,
      };

      const res = await fetch(`${API_BASE_URL}/backup-power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Laporan Backup Power berhasil disubmit!');
        setFormData(initialForm);
        localStorage.removeItem('backupPowerDraft');
        setActiveTab('list');
        fetchReports();
      } else {
        const err = await res.json();
        alert('Gagal submit: ' + (err.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getFileUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/${cleanPath}`;
  };

  const renderUploadBox = (field, label) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {formData[field] ? (
        <div style={{ position: 'relative', marginTop: '0.5rem', width: '100%', height: '150px', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
          <img src={getFileUrl(formData[field])} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button 
            type="button" 
            onClick={() => setFormData({...formData, [field]: ''})}
            style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', height: '150px', border: '2px dashed var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.01)', cursor: 'pointer' }}>
          {uploadingField === field ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <Loader2 size={24} className="spin" color="var(--primary-color)" />
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>Uploading...</span>
            </div>
          ) : (
            <>
              <ImageIcon size={32} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>Klik / Tap untuk Foto</span>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                onChange={(e) => handleFileUpload(e, field)}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );

  const filteredReports = reports.filter(r => {
    const matchesSearch = searchQuery === '' || 
      (r.ticketNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.siteId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.siteName || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    let matchesDate = true;
    if (filterDateFrom || filterDateTo) {
      if (!r.backupDate) {
        matchesDate = false;
      } else {
        const repDate = new Date(r.backupDate).getTime();
        if (filterDateFrom && repDate < new Date(filterDateFrom).getTime()) matchesDate = false;
        // set end of day for DateTo
        if (filterDateTo) {
          const endTo = new Date(filterDateTo);
          endTo.setHours(23, 59, 59, 999);
          if (repDate > endTo.getTime()) matchesDate = false;
        }
      }
    }
    return matchesSearch && matchesDate;
  });

  if (selectedReport) {
    return (
      <div className="glass-panel animate-fade-in-up" style={{ padding: '2rem' }}>
        <button className="btn-icon" onClick={() => setSelectedReport(null)} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Kembali
        </button>
        <h2 className="section-title">Detail Log Backup Power</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem', backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '8px' }}>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Ticket No</p><p className="font-medium">{selectedReport.ticketNo}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Site</p><p className="font-medium">{selectedReport.siteId} - {selectedReport.siteName}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>NOP</p><p className="font-medium">{selectedReport.nop || '-'}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>TO Cluster</p><p className="font-medium">{selectedReport.cluster}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Tanggal Backup</p><p className="font-medium">{selectedReport.backupDate ? new Date(selectedReport.backupDate).toLocaleDateString('id-ID') : '-'}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Penyebab Pemadaman</p><p className="font-medium">{selectedReport.outageCause || '-'}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Waktu PLN Off</p><p className="font-medium">{formatDateTime(selectedReport.plnOffTime)}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Waktu Mulai Backup</p><p className="font-medium">{formatDateTime(selectedReport.backupStartTime)}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>RH Sebelum Backup</p><p className="font-medium">{selectedReport.rhBefore || '-'}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Waktu PLN On</p><p className="font-medium">{formatDateTime(selectedReport.plnOnTime)}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>Waktu Selesai Backup</p><p className="font-medium">{formatDateTime(selectedReport.backupEndTime)}</p></div>
          <div><p className="text-muted" style={{ fontSize: '0.85rem' }}>RH Sesudah Backup</p><p className="font-medium">{selectedReport.rhAfter || '-'}</p></div>
        </div>

        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Foto Dokumentasi</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          {selectedReport.photoOutageCause && <div><p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Penyebab Pemadaman</p><img src={getFileUrl(selectedReport.photoOutageCause)} alt="Outage Cause" style={{ width: '100%', borderRadius: '8px' }} /></div>}
          {selectedReport.photoPlnOff && <div><p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>PLN Off</p><img src={getFileUrl(selectedReport.photoPlnOff)} alt="PLN Off" style={{ width: '100%', borderRadius: '8px' }} /></div>}
          {selectedReport.photoRhBefore && <div><p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>RH Before</p><img src={getFileUrl(selectedReport.photoRhBefore)} alt="RH Before" style={{ width: '100%', borderRadius: '8px' }} /></div>}
          {selectedReport.photoPlnOn && <div><p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>PLN On</p><img src={getFileUrl(selectedReport.photoPlnOn)} alt="PLN On" style={{ width: '100%', borderRadius: '8px' }} /></div>}
          {selectedReport.photoRhAfter && <div><p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>RH After</p><img src={getFileUrl(selectedReport.photoRhAfter)} alt="RH After" style={{ width: '100%', borderRadius: '8px' }} /></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="dashboard-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="dashboard-title">Report Backup Power</h1>
          <p className="dashboard-subtitle">Catat log pemadaman dan penggunaan genset di site.</p>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '2rem' }}>
        <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>Histori Laporan</button>
        <button className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`} onClick={() => setActiveTab('new')}>+ Laporan Baru</button>
      </div>

      {activeTab === 'list' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px' }}>
            <div className="form-group" style={{ flex: '1 1 200px', margin: 0 }}>
              <label className="text-muted" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Cari No Ticket / Site ID</label>
              <input type="text" className="form-control" placeholder="Ketik kata kunci..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: '1 1 150px', margin: 0 }}>
              <label className="text-muted" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Dari Tanggal</label>
              <input type="date" className="form-control" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: '1 1 150px', margin: 0 }}>
              <label className="text-muted" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Sampai Tanggal</label>
              <input type="date" className="form-control" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
            { (searchQuery || filterDateFrom || filterDateTo) && (
              <div style={{ display: 'flex', alignItems: 'flex-end', margin: 0 }}>
                <button className="btn" onClick={() => { setSearchQuery(''); setFilterDateFrom(''); setFilterDateTo(''); }}>Reset</button>
              </div>
            )}
          </div>

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
                  <th>Dibuat Pada</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={`skel-rep-${idx}`}>
                      <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '150px' }}></div></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '50px' }}></div></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '85px' }}></div></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '110px' }}></div></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                    </tr>
                  ))
                ) : filteredReports.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada histori laporan Backup Power.</td></tr>
                ) : (
                  filteredReports.map(rep => (
                    <tr key={rep.id}>
                      <td className="font-medium">{rep.ticketNo}</td>
                      <td>{rep.siteId || '-'}</td>
                      <td>{rep.siteName}</td>
                      <td>{rep.nop || '-'}</td>
                      <td>{rep.cluster || '-'}</td>
                      <td>{rep.backupDate ? new Date(rep.backupDate).toLocaleDateString('id-ID') : '-'}</td>
                      <td>{formatDate(rep.createdAt)}</td>
                      <td>
                        <button className="btn-icon btn-small" onClick={() => setSelectedReport(rep)}>
                          <FileText size={16} /> Lihat
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'new' && (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Informasi Site & Waktu</h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">No Ticket</label>
              <input type="text" className="form-control" name="ticketNo" value={formData.ticketNo} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Site ID</label>
              <input type="text" className="form-control" name="siteId" value={formData.siteId} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Site Name</label>
              <input type="text" className="form-control" name="siteName" value={formData.siteName} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal Backup Power</label>
              <input type="date" className="form-control" name="backupDate" value={formData.backupDate} onChange={handleInputChange} required />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">NOP</label>
              <select className="form-control" name="nop" value={formData.nop} onChange={handleInputChange}>
                <option value="">Pilih NOP...</option>
                <option value="Karawang">Karawang</option>
                <option value="Serang">Serang</option>
                <option value="Tangerang">Tangerang</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">TO Cluster</label>
              <select className="form-control" name="cluster" value={formData.cluster} onChange={handleInputChange}>
                <option value="">Pilih TO Cluster...</option>
                <option value="TO Kab. Bekasi">TO Kab. Bekasi</option>
                <option value="TO Karawang">TO Karawang</option>
                <option value="TO Purwakarta">TO Purwakarta</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Penyebab Pemadaman</label>
              <input type="text" className="form-control" name="outageCause" value={formData.outageCause} onChange={handleInputChange} placeholder="Contoh: Gardu PLN meledak" />
            </div>
          </div>

          <h3 style={{ fontSize: '1.2rem', margin: '2rem 0 1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Log Jam & Mesin</h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Tanggal & Waktu PLN Off</label>
              <input type="datetime-local" className="form-control" name="plnOffTime" value={formData.plnOffTime} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal & Waktu Mulai Backup</label>
              <input type="datetime-local" className="form-control" name="backupStartTime" value={formData.backupStartTime} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-label">RH Sebelum Backup (Angka)</label>
              <input type="number" step="any" className="form-control" name="rhBefore" value={formData.rhBefore} onChange={handleInputChange} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Tanggal & Waktu PLN On</label>
              <input type="datetime-local" className="form-control" name="plnOnTime" value={formData.plnOnTime} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal & Waktu Selesai Backup</label>
              <input type="datetime-local" className="form-control" name="backupEndTime" value={formData.backupEndTime} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-label">RH Sesudah Backup (Angka)</label>
              <input type="number" step="any" className="form-control" name="rhAfter" value={formData.rhAfter} onChange={handleInputChange} />
            </div>
          </div>

          <h3 style={{ fontSize: '1.2rem', margin: '2rem 0 1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Dokumentasi Foto</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {renderUploadBox('photoOutageCause', 'Foto Penyebab Pemadaman')}
            {renderUploadBox('photoPlnOff', 'Foto Ketika PLN Off')}
            {renderUploadBox('photoRhBefore', 'Foto RH Sebelum Backup')}
            {renderUploadBox('photoPlnOn', 'Foto Ketika PLN On')}
            {renderUploadBox('photoRhAfter', 'Foto RH Sesudah Backup')}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}>
              {isSubmitting ? (
                <><Loader2 size={18} className="spin" style={{ marginRight: '8px' }} /> Menyimpan...</>
              ) : (
                <><Save size={18} style={{ marginRight: '8px' }} /> Submit Laporan</>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default BackupPowerForm;
