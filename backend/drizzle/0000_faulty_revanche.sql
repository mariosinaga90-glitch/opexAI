CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`reportId` text,
	`requestId` text,
	`filename` text NOT NULL,
	`filePath` text NOT NULL,
	`fileType` text,
	`fileSize` integer,
	`uploadedAt` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`reportId`) REFERENCES `fund_reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requestId`) REFERENCES `fund_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fund_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`requestId` text NOT NULL,
	`userId` text NOT NULL,
	`totalUsed` real NOT NULL,
	`remaining` real DEFAULT 0,
	`summary` text,
	`status` text DEFAULT 'Pending Review' NOT NULL,
	`category` text,
	`categoryLabel` text,
	`vehicleType` text,
	`plateNumber` text,
	`kmBefore` real,
	`kmAfter` real,
	`detail` text,
	`revisionNote` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now')),
	`updatedAt` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`requestId`) REFERENCES `fund_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fund_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`amount` real NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`category` text,
	`categoryLabel` text,
	`vehicleType` text,
	`plateNumber` text,
	`kmBefore` real,
	`kmAfter` real,
	`detail` text,
	`adminNote` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now')),
	`updatedAt` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `report_items` (
	`id` text PRIMARY KEY NOT NULL,
	`reportId` text NOT NULL,
	`description` text NOT NULL,
	`team` text,
	`toCluster` text,
	`category` text,
	`detail` text,
	`transferDate` text,
	`unitPrice` real NOT NULL,
	`quantity` integer NOT NULL,
	`total` real NOT NULL,
	FOREIGN KEY (`reportId`) REFERENCES `fund_reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `request_items` (
	`id` text PRIMARY KEY NOT NULL,
	`requestId` text NOT NULL,
	`description` text NOT NULL,
	`team` text,
	`toCluster` text,
	`category` text,
	`detail` text,
	`unitPrice` real NOT NULL,
	`quantity` integer NOT NULL,
	`total` real NOT NULL,
	FOREIGN KEY (`requestId`) REFERENCES `fund_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `request_sites` (
	`id` text PRIMARY KEY NOT NULL,
	`requestId` text NOT NULL,
	`siteName` text NOT NULL,
	FOREIGN KEY (`requestId`) REFERENCES `fund_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text,
	`role` text NOT NULL,
	`cluster` text,
	`microCluster` text,
	`team` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);