import React from 'react';
import { FileText, Zap, BarChart3, ShieldCheck } from 'lucide-react';
import './Features.css';

const featuresData = [
  {
    title: 'Pengajuan Terstruktur',
    description: 'Formulir mudah untuk dana operasional. Lacak status dari pengajuan hingga selesai secara real-time.',
    icon: FileText
  },
  {
    title: 'Alur Persetujuan Real-time',
    description: 'Manajemen persetujuan cepat oleh Admin untuk menghilangkan hambatan proses operasional.',
    icon: Zap
  },
  {
    title: 'Laporan Komprehensif',
    description: 'Unggah bukti pembayaran dan pantau setiap pengeluaran dengan rincian yang lengkap.',
    icon: BarChart3
  },
  {
    title: 'Dashboard Berbasis Peran',
    description: 'Tampilan khusus untuk Karyawan dan Admin. Lihat tepat apa yang Anda butuhkan.',
    icon: ShieldCheck
  }
];

const Features = () => {
  return (
    <section id="features" className="features">
      <div className="container">
        <div className="features-header text-center animate-fade-in-up">
          <h2 className="section-title">Fitur Utama</h2>
          <p className="section-subtitle">Semua yang Anda butuhkan untuk mengelola operasional dengan efisien.</p>
        </div>
        
        <div className="features-grid">
          {featuresData.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className={`feature-card glass-panel animate-fade-in-up delay-${(index % 3) + 1}`}>
                <div className="feature-icon-wrapper">
                  <Icon className="feature-icon" size={32} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
