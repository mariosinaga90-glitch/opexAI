import React, { useState, useEffect } from 'react';
import { Save, User, Lock, Mail, Phone, CreditCard, Car, Hash, Users, MapPin, Globe, Shield } from 'lucide-react';
import { API_BASE_URL } from '../../config';

function EmployeeProfileView() {
  const [user, setUser] = useState({
    id: '',
    name: '',
    email: '',
    role: '',
    nop: '',
    toCluster: '',
    team: '', // Tim / Divisi
    vehicleType: '',
    plateNumber: '',
    phoneNumber: '',
    nik: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      const res = await fetch(`${API_BASE_URL}/employee/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          nop: user.nop,
          toCluster: user.toCluster,
          team: user.team,
          phoneNumber: user.phoneNumber,
          nik: user.nik,
          vehicleType: user.vehicleType,
          plateNumber: user.plateNumber
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setMessage('Profil berhasil diperbarui!');
        // Dispatch event to sync other components
        window.dispatchEvent(new Event('user-updated'));
        
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(data.error || 'Gagal memperbarui profil.');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan koneksi server.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Password baru dan konfirmasi tidak cocok.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/employee/profile/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id
        },
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordMessage('Password berhasil diperbarui!');
        setPasswordData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setPasswordMessage(''), 3000);
      } else {
        setPasswordError(data.error || 'Gagal memperbarui password.');
      }
    } catch (err) {
      console.error(err);
      setPasswordError('Terjadi kesalahan koneksi server.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem' }}>Edit Profil</h1>
          <p className="page-subtitle">Kelola informasi data diri dan keamanan akun Anda.</p>
        </div>
      </div>

      <div className="form-grid">
        {/* Profile Info Form */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <User className="text-primary" size={24} />
            <h2 className="section-title" style={{ fontSize: '1.2rem', marginBottom: 0 }}>Informasi Pribadi</h2>
          </div>
          
          {message && (
            <div className="alert alert-success" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(52, 211, 153, 0.1)', color: '#34D399', border: '1px solid #34D399', borderRadius: '8px' }}>
              {message}
            </div>
          )}
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid #EF4444', borderRadius: '8px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleProfileUpdate}>
            <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={16} className="text-primary" /> Nama Lengkap
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  name="name"
                  value={user.name || ''} 
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={16} className="text-primary" /> Email
                </label>
                <input 
                  type="email" 
                  className="form-control" 
                  name="email"
                  value={user.email || ''} 
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={16} className="text-primary" /> No HP
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  name="phoneNumber"
                  value={user.phoneNumber || ''} 
                  onChange={handleChange}
                  placeholder="Contoh: 08123456789"
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={16} className="text-primary" /> NIK KTP
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  name="nik"
                  value={user.nik || ''} 
                  onChange={handleChange}
                  placeholder="Contoh: 3201234567890001"
                />
              </div>
            </div>

            <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Car size={16} className="text-primary" /> Jenis Kendaraan
                </label>
                <select 
                  className="form-control" 
                  name="vehicleType"
                  value={user.vehicleType || ''} 
                  onChange={handleChange}
                >
                  <option value="">Pilih Kendaraan...</option>
                  <option value="Mobil">Mobil</option>
                  <option value="Motor">Motor</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Hash size={16} className="text-primary" /> Plat Nomor
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  name="plateNumber"
                  value={user.plateNumber || ''} 
                  onChange={handleChange}
                  placeholder="Contoh: B 1234 ABC"
                />
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '1rem', color: 'var(--primary)', fontWeight: '600' }}>Struktur Organisasi</h3>
            <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} className="text-primary" /> Role
                </label>
                <select 
                  className="form-control" 
                  name="team"
                  value={user.team || ''} 
                  onChange={handleChange}
                >
                  <option value="">Pilih Role...</option>
                  <option value="TS">TS</option>
                  <option value="MBP">MBP</option>
                  <option value="PM">PM</option>
                </select>
              </div>
              <div className="form-group">
                  <label className="form-label">
                    NOP
                  </label>
                  <select 
                    className="form-control" 
                    name="nop"
                    value={user.nop || ''} 
                    onChange={handleChange}
                  >
                    <option value="">Pilih NOP...</option>
                    <option value="Karawang">Karawang</option>
                    <option value="Serang">Serang</option>
                    <option value="Tangerang">Tangerang</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    TO Cluster
                  </label>
                  <select 
                    className="form-control" 
                    name="toCluster"
                    value={user.toCluster || ''} 
                    onChange={handleChange}
                  >
                    <option value="">Pilih TO Cluster...</option>
                    <option value="TO Kab. Bekasi">TO Kab. Bekasi</option>
                    <option value="TO Karawang">TO Karawang</option>
                    <option value="TO Purwakarta">TO Purwakarta</option>
                  </select>
                </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} className="text-primary" /> Role Akun
              </label>
              <input 
                type="text" 
                className="form-control" 
                value={user.role || ''} 
                disabled 
                style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', color: '#94A3B8' }}
              />
              <small className="text-muted" style={{ display: 'block', marginTop: '0.25rem' }}>Role Akun tidak dapat diubah sendiri.</small>
            </div>

            <div className="form-actions" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Menyimpan...' : (
                  <>
                    <Save size={18} style={{ marginRight: '6px' }} /> Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security Form */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Lock className="text-primary" size={24} />
            <h2 className="section-title" style={{ fontSize: '1.2rem', marginBottom: 0 }}>Keamanan Akun</h2>
          </div>

          {passwordMessage && (
            <div className="alert alert-success" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(52, 211, 153, 0.1)', color: '#34D399', border: '1px solid #34D399', borderRadius: '8px' }}>
              {passwordMessage}
            </div>
          )}
          {passwordError && (
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid #EF4444', borderRadius: '8px' }}>
              {passwordError}
            </div>
          )}
          
          <form onSubmit={handlePasswordUpdate}>
            <div className="form-group">
              <label className="form-label">Password Lama</label>
              <input 
                type="password" 
                className="form-control" 
                name="oldPassword"
                placeholder="Masukkan password saat ini" 
                value={passwordData.oldPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password Baru</label>
              <input 
                type="password" 
                className="form-control" 
                name="newPassword"
                placeholder="Masukkan password baru" 
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Konfirmasi Password Baru</label>
              <input 
                type="password" 
                className="form-control" 
                name="confirmPassword"
                placeholder="Konfirmasi password baru" 
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>
            <div className="form-actions" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button type="submit" className="btn btn-secondary" disabled={passwordLoading}>
                {passwordLoading ? 'Memproses...' : (
                  <>
                    <Lock size={18} style={{ marginRight: '6px' }} /> Update Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EmployeeProfileView;
