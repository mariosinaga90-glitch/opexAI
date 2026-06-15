import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, User as UserIcon, Search } from 'lucide-react';
import { API_BASE_URL } from '../../config';

function AdminUserView() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'employee',
    cluster: '', microCluster: '', team: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users`);
      if (res.ok) setUsers(await res.json());
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const url = editingUserId ? `${API_BASE_URL}/admin/users/${editingUserId}` : `${API_BASE_URL}/admin/users`;
      const method = editingUserId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        closeForm();
        fetchUsers();
      } else {
        alert(editingUserId ? 'Gagal mengubah user' : 'Gagal membuat user');
      }
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingUserId(null);
    setFormData({ name: '', email: '', password: '', role: 'employee', cluster: '', microCluster: '', team: '' });
  };

  const handleEditClick = (user) => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '', // do not populate password
      role: user.role || 'employee',
      cluster: user.cluster || '',
      microCluster: user.microCluster || '',
      team: user.team || ''
    });
    setEditingUserId(user.id);
    setIsFormOpen(true);
  };

  const confirmDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchUsers();
        setDeleteConfirmId(null);
      } else {
        alert('Gagal menghapus user');
        setDeleteConfirmId(null);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setDeleteConfirmId(null);
    }
  };

  if (isFormOpen) {
    return (
      <div className="glass-panel animate-fade-in-up" style={{ padding: '2rem' }}>
        <div className="section-header" style={{ marginBottom: '2rem' }}>
          <div>
            <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Tambah / Edit Pengguna</h2>
            <p className="text-muted">Kelola data profil dan akses akun pengguna.</p>
          </div>
        </div>

        <form onSubmit={handleCreateUser}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input type="text" className="form-control" placeholder="Contoh: Budi Santoso" required 
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" placeholder="budi@opex.ai" required 
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Password Sementara</label>
              <input type="password" className="form-control" placeholder="Biarkan kosong jika tidak ingin mengubah" 
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Role Akun</label>
              <select className="form-control" required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                <option value="employee">Employee (Karyawan)</option>
                <option value="admin">Admin (Administrator)</option>
              </select>
            </div>
          </div>

          <h3 style={{ fontSize: '1.1rem', marginTop: '1rem', marginBottom: '1rem', color: 'var(--primary)' }}>Struktur Organisasi</h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">NOP</label>
              <select className="form-control" value={formData.cluster} onChange={e => setFormData({...formData, cluster: e.target.value})}>
                <option value="">Pilih NOP</option>
                <option value="Karawang">Karawang</option>
                <option value="Serang">Serang</option>
                <option value="Tangerang">Tangerang</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">TO Cluster</label>
              <select className="form-control" value={formData.microCluster} onChange={e => setFormData({...formData, microCluster: e.target.value})}>
                <option value="">Pilih TO Cluster</option>
                <option value="TO Kab. Bekasi">TO Kab. Bekasi</option>
                <option value="TO Karawang">TO Karawang</option>
                <option value="TO Purwakarta">TO Purwakarta</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tim</label>
              <input type="text" className="form-control" placeholder="Contoh: Sales" 
                value={formData.team} onChange={e => setFormData({...formData, team: e.target.value})} />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={closeForm}>Batal</button>
            <button type="submit" className="btn btn-primary">{editingUserId ? 'Update Pengguna' : 'Simpan Pengguna'}</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem' }}>Manajemen Pengguna</h1>
          <p className="page-subtitle">Kelola akun admin dan karyawan yang memiliki akses ke sistem.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsFormOpen(true)}>
          <Plus size={18} style={{ marginRight: '8px' }} />
          Tambah Pengguna
        </button>
      </div>

      <div className="data-section glass-panel">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="search-input" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '300px', backgroundColor: 'rgba(30, 41, 59, 0.7)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Cari nama atau email..." 
              style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none', width: '100%' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="form-control" 
            style={{ width: 'auto', backgroundColor: 'rgba(30, 41, 59, 0.7)' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Semua Role</option>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
          </select>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama & Email</th>
                <th>Role</th>
                <th>NOP / TO Cluster</th>
                <th>Tim</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada pengguna ditemukan.</td></tr>
              ) : (() => {
                const filteredUsers = users.filter(user => {
                  const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                        user.email?.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesRole = roleFilter === 'all' || user.role === roleFilter;
                  return matchesSearch && matchesRole;
                });
                
                if (filteredUsers.length === 0) {
                  return <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada pengguna sesuai filter.</td></tr>;
                }
                
                return filteredUsers.map((user, index) => (
                  <tr key={index}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="font-medium">{user.name}</span>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>{user.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className="status-badge" style={{ 
                        background: user.role === 'admin' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(255, 255, 255, 0.1)', 
                        color: user.role === 'admin' ? 'var(--primary)' : 'var(--text-main)',
                        border: `1px solid ${user.role === 'admin' ? 'var(--primary-glow)' : 'transparent'}`,
                        display: 'inline-flex', alignItems: 'center', gap: '4px'
                      }}>
                        {user.role === 'admin' ? <Shield size={12} /> : <UserIcon size={12} />}
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{user.cluster || '-'}</span>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>{user.microCluster || '-'}</span>
                      </div>
                    </td>
                    <td><span className="team-badge">{user.team || '-'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-icon" onClick={() => handleEditClick(user)} title="Edit User">
                          <Edit2 size={16} />
                        </button>
                        {user.role !== 'admin' && (
                          <button className="btn-icon" onClick={() => confirmDelete(user.id)} style={{ color: '#EF4444' }} title="Hapus User">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem' }}>Konfirmasi Hapus</h3>
            <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>Apakah Anda yakin ingin menghapus pengguna ini? Semua data pengajuan dan laporannya akan ikut terhapus.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirmId(null)}>Batal</button>
              <button className="btn btn-primary" style={{ backgroundColor: '#EF4444', borderColor: '#EF4444' }} onClick={handleDeleteUser}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUserView;
