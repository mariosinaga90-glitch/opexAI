import React from 'react';
import { Save, Bell, Lock } from 'lucide-react';

function AdminSettingsView() {
  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem' }}>Pengaturan</h1>
          <p className="page-subtitle">Kelola preferensi akun dan sistem.</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Lock className="text-primary" size={24} />
            <h2 className="section-title" style={{ fontSize: '1.2rem', marginBottom: 0 }}>Keamanan Akun</h2>
          </div>
          
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label className="form-label">Password Lama</label>
              <input type="password" className="form-control" placeholder="••••••••" />
            </div>
            <div className="form-group">
              <label className="form-label">Password Baru</label>
              <input type="password" className="form-control" placeholder="••••••••" />
            </div>
            <div className="form-group">
              <label className="form-label">Konfirmasi Password Baru</label>
              <input type="password" className="form-control" placeholder="••••••••" />
            </div>
            <div className="form-actions" style={{ marginTop: '1.5rem', paddingTop: '1.5rem' }}>
              <button className="btn btn-primary">
                <Save size={18} style={{ marginRight: '6px' }} /> Update Password
              </button>
            </div>
          </form>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Bell className="text-primary" size={24} />
            <h2 className="section-title" style={{ fontSize: '1.2rem', marginBottom: 0 }}>Notifikasi Sistem</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="font-medium">Email Notifikasi Pengajuan Baru</p>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Kirim email saat ada karyawan mengajukan dana.</p>
              </div>
              <label style={{ cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
              </label>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="font-medium">Email Notifikasi Laporan Masuk</p>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Kirim email saat karyawan mengunggah laporan realisasi.</p>
              </div>
              <label style={{ cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="font-medium">Ringkasan Mingguan</p>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Kirim statistik pengajuan dana setiap hari Senin.</p>
              </div>
              <label style={{ cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSettingsView;
