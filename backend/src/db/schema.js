import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password'), // Optional if not using auth yet
  role: text('role').notNull(), // 'admin' | 'employee'
  cluster: text('cluster'),
  microCluster: text('microCluster'),
  team: text('team'),
  vehicleType: text('vehicleType'),
  plateNumber: text('plateNumber'),
  phoneNumber: text('phoneNumber'),
  nik: text('nik'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const fundRequests = sqliteTable('fund_requests', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  amount: real('amount').notNull(),
  status: text('status').notNull().default('Pending'), // Pending, Approved, Rejected, Completed
  category: text('category'),
  categoryLabel: text('categoryLabel'),
  vehicleType: text('vehicleType'),
  plateNumber: text('plateNumber'),
  kmBefore: real('kmBefore'),
  kmAfter: real('kmAfter'),
  detail: text('detail'),
  adminNote: text('adminNote'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const requestItems = sqliteTable('request_items', {
  id: text('id').primaryKey(),
  requestId: text('requestId').notNull().references(() => fundRequests.id),
  description: text('description').notNull(),
  team: text('team'),
  toCluster: text('toCluster'),
  nop: text('nop'),
  category: text('category'),
  detail: text('detail'),
  unitPrice: real('unitPrice').notNull(),
  quantity: integer('quantity').notNull(),
  total: real('total').notNull(),
});

export const requestSites = sqliteTable('request_sites', {
  id: text('id').primaryKey(),
  requestId: text('requestId').notNull().references(() => fundRequests.id),
  siteName: text('siteName').notNull(),
});

export const fundReports = sqliteTable('fund_reports', {
  id: text('id').primaryKey(),
  requestId: text('requestId').notNull().references(() => fundRequests.id),
  userId: text('userId').notNull().references(() => users.id),
  totalUsed: real('totalUsed').notNull(),
  remaining: real('remaining').default(0),
  summary: text('summary'),
  status: text('status').notNull().default('Pending Review'), // Pending Review, Approved, Revision
  category: text('category'),
  categoryLabel: text('categoryLabel'),
  vehicleType: text('vehicleType'),
  plateNumber: text('plateNumber'),
  kmBefore: real('kmBefore'),
  kmAfter: real('kmAfter'),
  detail: text('detail'),
  revisionNote: text('revisionNote'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const reportItems = sqliteTable('report_items', {
  id: text('id').primaryKey(),
  reportId: text('reportId').notNull().references(() => fundReports.id),
  description: text('description').notNull(),
  team: text('team'),
  toCluster: text('toCluster'),
  nop: text('nop'),
  category: text('category'),
  detail: text('detail'),
  transferDate: text('transferDate'),
  unitPrice: real('unitPrice').notNull(),
  quantity: integer('quantity').notNull(),
  total: real('total').notNull(),
});

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  reportId: text('reportId').references(() => fundReports.id),
  requestId: text('requestId').references(() => fundRequests.id),
  filename: text('filename').notNull(),
  filePath: text('filePath').notNull(),
  fileType: text('fileType'),
  fileSize: integer('fileSize'),
  uploadedAt: integer('uploadedAt', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const backupPowerReports = sqliteTable('backup_power_reports', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id),
  ticketNo: text('ticketNo').notNull(),
  siteId: text('siteId').notNull(),
  siteName: text('siteName').notNull(),
  backupDate: text('backupDate'),
  nop: text('nop'),
  cluster: text('cluster'),
  plnOffTime: text('plnOffTime'),
  rhBefore: real('rhBefore'),
  backupStartTime: text('backupStartTime'),
  plnOnTime: text('plnOnTime'),
  rhAfter: real('rhAfter'),
  backupEndTime: text('backupEndTime'),
  outageCause: text('outageCause'),
  photoOutageCause: text('photoOutageCause'),
  photoPlnOff: text('photoPlnOff'),
  photoRhBefore: text('photoRhBefore'),
  photoPlnOn: text('photoPlnOn'),
  photoRhAfter: text('photoRhAfter'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});
