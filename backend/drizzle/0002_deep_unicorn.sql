CREATE TABLE `dashboard_data` (
	`id` text PRIMARY KEY NOT NULL,
	`datasetId` text NOT NULL,
	`fileName` text,
	`data` text,
	`columns` text,
	`uploadedAt` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dashboard_data_datasetId_unique` ON `dashboard_data` (`datasetId`);