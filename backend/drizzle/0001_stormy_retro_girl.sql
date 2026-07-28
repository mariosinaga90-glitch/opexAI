CREATE TABLE `backup_power_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`ticketNo` text NOT NULL,
	`siteId` text NOT NULL,
	`siteName` text NOT NULL,
	`backupDate` text,
	`nop` text,
	`cluster` text,
	`plnOffTime` text,
	`rhBefore` real,
	`backupStartTime` text,
	`plnOnTime` text,
	`rhAfter` real,
	`backupEndTime` text,
	`outageCause` text,
	`photoOutageCause` text,
	`photoPlnOff` text,
	`photoRhBefore` text,
	`photoPlnOn` text,
	`photoRhAfter` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `report_items` ADD `nop` text;--> statement-breakpoint
ALTER TABLE `request_items` ADD `nop` text;--> statement-breakpoint
ALTER TABLE `users` ADD `vehicleType` text;--> statement-breakpoint
ALTER TABLE `users` ADD `plateNumber` text;--> statement-breakpoint
ALTER TABLE `users` ADD `gensetBrand` text;--> statement-breakpoint
ALTER TABLE `users` ADD `gensetCapacity` text;--> statement-breakpoint
ALTER TABLE `users` ADD `phoneNumber` text;--> statement-breakpoint
ALTER TABLE `users` ADD `nik` text;--> statement-breakpoint
ALTER TABLE `users` ADD `isLocked` integer DEFAULT false;