import React, { useState } from 'react';
import { HelpCircle, X, ChevronDown, ChevronUp, FileText, CheckSquare, BatteryCharging } from 'lucide-react';
import './TutorialGuide.css';

const tutorials = [
  {
    id: 'pengajuan',
    icon: <FileText size={18} />,
    title: '1. Pengajuan Dana',
    content: (
      <div className="tutorial-steps">
        <p>Gunakan menu ini saat Anda akan mengajukan dana operasional baru sebelum kegiatan dilakukan.</p>
        <ol>
          <li>Buka menu <strong>Pengajuan</strong> dari bilah navigasi kiri.</li>
          <li>Klik tombol <strong>+ Ajukan Dana Baru</strong> di kanan atas halaman.</li>
          <li>Isi formulir seperti judul pengajuan, nilai nominal (budget), rincian Site dan biaya.</li>
          <li>Pilih <strong>Kategori Dana</strong> (Misal: BBM Kendaraan, Konsumsi, dll).</li>
          <li>Jika memilih kategori BBM, lengkapi informasi tipe kendaraan, nomor polisi, serta odometer (KM) awal & akhir.</li>
          <li>Klik <strong>Kirim Pengajuan</strong> dan tunggu statusnya disetujui (Approved) oleh Admin.</li>
        </ol>
      </div>
    )
  },
  {
    id: 'laporan',
    icon: <CheckSquare size={18} />,
    title: '2. Laporan Dana',
    content: (
      <div className="tutorial-steps">
        <p>Setelah pengajuan Anda disetujui dan dana digunakan, Anda wajib melaporkan realisasi pengeluarannya.</p>
        <ol>
          <li>Buka menu <strong>Laporan</strong> dari navigasi.</li>
          <li>Klik tombol <strong>+ Buat Laporan</strong>.</li>
          <li>Pilih ID/Judul Pengajuan yang telah disetujui (Approved).</li>
          <li>Isi jumlah dana yang benar-benar terpakai beserta rincian item (kuitansi/struk).</li>
          <li>Unggah foto nota, kuitansi, atau struk bukti transaksi pada kolom <strong>Upload Lampiran</strong>.</li>
          <li>Klik <strong>Kirim Laporan</strong> agar Admin bisa meninjau apakah ada sisa/kekurangan dana dari budget awal.</li>
        </ol>
      </div>
    )
  },
  {
    id: 'backuppower',
    icon: <BatteryCharging size={18} />,
    title: '3. Report Backup Power',
    content: (
      <div className="tutorial-steps">
        <p>Laporan teknis khusus saat terjadi insiden pemadaman listrik PLN di Site (BTS).</p>
        <ol>
          <li>Buka menu <strong>Report Backup Power</strong> dan klik <strong>+ Buat Laporan Baru</strong>.</li>
          <li>Pilih <strong>Nama Site</strong> tempat Anda bertugas dan catat No. Ticket/No. Odometer.</li>
          <li>Isi waktu aktual saat <strong>PLN Mati (Off)</strong> dan saat <strong>PLN Menyala kembali (On)</strong>.</li>
          <li>Masukkan status Running Hours (RH) Genset awal dan akhir.</li>
          <li>Pilih jenis <strong>Penyebab Pemadaman</strong> yang terjadi di lapangan.</li>
          <li>Wajib mengunggah minimum 4 foto: Bukti PLN Off, Bukti RH Sebelum, Bukti PLN On, dan Bukti RH Sesudah. Opsional: tambahkan 1 foto terkait penyebab pemadaman.</li>
          <li>Klik <strong>Simpan Laporan</strong>.</li>
        </ol>
      </div>
    )
  }
];

const TutorialGuide = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState('pengajuan'); // Default open first

  const toggleAccordion = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button className="tutorial-fab" onClick={() => setIsOpen(true)} title="Panduan Penggunaan">
        <HelpCircle size={28} />
      </button>

      {/* Tutorial Modal Overlay */}
      {isOpen && (
        <div className="tutorial-overlay" onClick={() => setIsOpen(false)}>
          <div className="tutorial-modal animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="tutorial-header">
              <div className="tutorial-header-title">
                <HelpCircle size={24} className="tutorial-icon-pulse" />
                <h2>Panduan Penggunaan</h2>
              </div>
              <button className="tutorial-close-btn" onClick={() => setIsOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="tutorial-body">
              <p className="tutorial-intro">
                Selamat datang! Ikuti panduan singkat di bawah ini untuk memahami alur penggunaan fitur di aplikasi OpexTracker:
              </p>

              <div className="tutorial-accordion">
                {tutorials.map((item) => (
                  <div className={`accordion-item ${expandedId === item.id ? 'expanded' : ''}`} key={item.id}>
                    <button className="accordion-header" onClick={() => toggleAccordion(item.id)}>
                      <div className="accordion-title">
                        {item.icon}
                        <span>{item.title}</span>
                      </div>
                      <div className="accordion-icon">
                        {expandedId === item.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </button>
                    {expandedId === item.id && (
                      <div className="accordion-content animate-fade-in-up">
                        {item.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TutorialGuide;
