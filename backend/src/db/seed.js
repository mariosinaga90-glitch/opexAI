import { db } from './index.js';
import { users, fundRequests, requestItems, requestSites, fundReports, reportItems, attachments } from './schema.js';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database...');

  // 1. Users
  const userRows = [
    { id: 'USR-001', name: 'Admin Utama', email: 'admin@opex.ai', password: '123456', role: 'admin', team: 'Management' },
    { id: 'USR-002', name: 'Andi S.', email: 'andi@opex.ai', password: '123456', role: 'employee', cluster: 'Commercial', microCluster: 'B2B', team: 'TS' },
    { id: 'USR-003', name: 'Rina M.', email: 'rina@opex.ai', password: '123456', role: 'employee', cluster: 'Commercial', microCluster: 'Marketing', team: 'MBP' },
    { id: 'USR-004', name: 'Budi Santoso', email: 'budi@opex.ai', password: '123456', role: 'employee', cluster: 'Operations', microCluster: 'Tech', team: 'PM' },
    { id: 'USR-005', name: 'Siti K.', email: 'siti@opex.ai', password: '123456', role: 'employee', cluster: 'Operations', microCluster: 'Support', team: 'TS' },
  ];
  await db.insert(users).values(userRows).onConflictDoUpdate({
    target: users.id,
    set: { password: '123456' }
  });

  // 2. Fund Requests
  const requestRows = [
    { id: 'REQ-012', userId: 'USR-002', title: 'BBM Kendaraan Operasional', amount: 2500000, status: 'Pending', category: 'bbm-mobil', categoryLabel: 'BBM Mobil', vehicleType: 'Mobil', plateNumber: 'B 1234 CD', kmBefore: 45000, kmAfter: 45250, detail: 'Pengisian BBM untuk kunjungan site' },
    { id: 'REQ-013', userId: 'USR-003', title: 'Material Perbaikan Tower', amount: 5000000, status: 'Pending', category: 'material', categoryLabel: 'Material', vehicleType: '-', plateNumber: '-', detail: 'Pembelian kabel dan konektor untuk perbaikan tower' },
    { id: 'REQ-014', userId: 'USR-004', title: 'BBM Genset Site', amount: 8000000, status: 'Pending', category: 'bbm-genset', categoryLabel: 'BBM Genset', vehicleType: '-', plateNumber: '-', kmBefore: 1200, kmAfter: 1350, detail: 'Pengisian BBM genset untuk backup power' },
    { id: 'REQ-010', userId: 'USR-005', title: 'Parkir & Toll Operasional', amount: 1500000, status: 'Approved', category: 'parkir-toll', categoryLabel: 'Parkir - Toll', vehicleType: 'Mobil', plateNumber: 'B 5678 EF', detail: 'Biaya parkir dan toll kunjungan site' }
  ];

  await db.insert(fundRequests).values(requestRows).onConflictDoNothing();

  // 3. Request Sites & Items
  await db.insert(requestSites).values([
    { id: 'RS-01', requestId: 'REQ-012', siteName: 'BKS001 - Site Tambun' },
    { id: 'RS-02', requestId: 'REQ-012', siteName: 'BKS002 - Site Cikarang' },
    { id: 'RS-03', requestId: 'REQ-013', siteName: 'KRW001 - Site Karawang Barat' },
    { id: 'RS-04', requestId: 'REQ-014', siteName: 'PWK001 - Site Purwakarta' },
    { id: 'RS-05', requestId: 'REQ-010', siteName: 'BKS003 - Site Cibarusah' }
  ]).onConflictDoNothing();

  await db.insert(requestItems).values([
    { id: 'RI-01', requestId: 'REQ-012', description: 'BBM Pertamax', unitPrice: 500000, quantity: 5, total: 2500000 },
    { id: 'RI-02', requestId: 'REQ-013', description: 'Kabel Fiber Optik 100m', unitPrice: 2500000, quantity: 2, total: 5000000 },
    { id: 'RI-03', requestId: 'REQ-014', description: 'Solar 200 Liter', unitPrice: 4000000, quantity: 2, total: 8000000 },
    { id: 'RI-04', requestId: 'REQ-010', description: 'Toll Jakarta-Bekasi PP', unitPrice: 750000, quantity: 2, total: 1500000 }
  ]).onConflictDoNothing();

  // 4. Fund Reports & Items
  const reportRows = [
    { id: 'REP-001', requestId: 'REQ-013', userId: 'USR-003', totalUsed: 1200000, status: 'Pending Review', category: 'material', categoryLabel: 'Material', detail: 'Pembelian kabel dan konektor' },
    { id: 'REP-002', requestId: 'REQ-012', userId: 'USR-002', totalUsed: 480000, status: 'Pending Review', category: 'bbm-mobil', categoryLabel: 'BBM Mobil', kmBefore: 45000, kmAfter: 45250, detail: 'Pengisian BBM untuk kunjungan site' },
    { id: 'REP-003', requestId: 'REQ-010', userId: 'USR-004', totalUsed: 350000, status: 'Revision', category: 'homebase-dop', categoryLabel: 'Kebutuhan Homebase/DOP', detail: 'Konsumsi rapat evaluasi bulanan' }
  ];

  await db.insert(fundReports).values(reportRows).onConflictDoNothing();

  await db.insert(reportItems).values([
    { id: 'RPI-01', reportId: 'REP-001', description: 'Kabel Fiber Optik 100m', team: 'MBP', category: 'material', transferDate: '2026-05-25', unitPrice: 600000, quantity: 2, total: 1200000 },
    { id: 'RPI-02', reportId: 'REP-002', description: 'BBM Pertamax', team: 'TS', category: 'bbm-mobil', transferDate: '2026-06-02', unitPrice: 240000, quantity: 2, total: 480000 },
    { id: 'RPI-03', reportId: 'REP-003', description: 'Snack Box', team: 'PM', category: 'homebase-dop', transferDate: '2026-05-29', unitPrice: 35000, quantity: 10, total: 350000 }
  ]).onConflictDoNothing();

  // Fix any old hardcoded localhost URLs in the database
  const allAttachments = await db.select().from(attachments);
  for (const att of allAttachments) {
    if (att.filePath && att.filePath.includes('http://localhost:3001')) {
      const newPath = att.filePath.replace(/http:\/\/localhost:3001/g, '');
      await db.update(attachments).set({ filePath: newPath }).where(eq(attachments.id, att.id));
      console.log(`Fixed URL for attachment ${att.id}`);
    }
  }

  console.log('Seed completed successfully!');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
