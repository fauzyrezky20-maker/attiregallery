CREATE TABLE `incomes` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text DEFAULT 'tunai' NOT NULL,
	`category` text DEFAULT 'Sewa' NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `incomes_date_idx` ON `incomes` (`date`);