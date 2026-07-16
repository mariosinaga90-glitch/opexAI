import React, { useState } from 'react';
import LoginModal from '../components/LoginModal';

function LandingPage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <div className="app-container" style={{ minHeight: '100vh', position: 'relative' }}>

      <div className="logo-container" style={{ position: 'absolute', top: '2rem', left: '2rem', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
        <span className="logo-icon" style={{ color: 'var(--primary)', fontSize: '1.8rem' }}>▲</span>
        <span className="logo-text">OpexTac</span>
      </div>
      
      <div style={{ position: 'relative', zIndex: 10, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 1rem' }}>
        <div className="badge animate-fade-in-up" style={{ marginBottom: '1.5rem', display: 'inline-block', padding: '0.5rem 1rem', background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.3) 50%, rgba(99, 102, 241, 0.2) 100%)', backgroundSize: '200% auto', color: '#818CF8', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600, border: '1px solid rgba(99, 102, 241, 0.4)', animation: 'shimmer 3s infinite linear' }}>✨ OpexTac Internal Tool</div>
        <h1 className="animate-fade-in-up delay-1" style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '1.5rem', color: '#FFFFFF', textShadow: '0 4px 20px rgba(0,0,0,0.6)' }}>Sistem Manajemen Operasional</h1>
        <p className="animate-fade-in-up delay-2" style={{ fontSize: '1.25rem', color: '#F8FAFC', maxWidth: '600px', marginBottom: '3rem', lineHeight: 1.6, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Kelola dana operasional, pelaporan, dan log backup power dengan efisien dan transparan dalam satu sistem.</p>
        
        <button 
          className="btn btn-primary animate-fade-in-up delay-3" 
          style={{ padding: '1rem 3rem', fontSize: '1.15rem', borderRadius: '12px', boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)' }} 
          onClick={() => setIsLoginOpen(true)}
        >
          Masuk ke Aplikasi
        </button>
      </div>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} hideClose={false} />
    </div>
  );
}

export default LandingPage;
