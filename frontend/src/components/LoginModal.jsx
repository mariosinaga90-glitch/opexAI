import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Lock, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './LoginModal.css';

const LoginModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/employee');
        }
      } else {
        setError(data.message || 'Login gagal. Periksa ID dan Password Anda.');
      }
    } catch (err) {
      setError('Terjadi kesalahan pada server. Coba lagi nanti.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-modal animate-fade-in-up">
        <button className="close-btn" onClick={onClose}>
          <X size={24} />
        </button>
        
        <div className="login-header">
          <h2>Selamat Datang</h2>
          <p>Login menggunakan ID Karyawan Anda</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="form-label">ID Karyawan / Email</label>
            <div className="input-with-icon">
              <User className="input-icon" size={18} />
              <input
                type="text"
                className="form-control"
                placeholder="Masukkan ID atau Email Anda"
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                className="form-control"
                placeholder="Masukkan Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary login-btn" 
            disabled={isLoading}
          >
            {isLoading ? 'Memproses...' : 'Login ke Aplikasi'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
