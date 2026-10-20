CREATE TABLE `finance_edits` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`record_id` text NOT NULL,
	`action` text NOT NULL,
	`user_name` text,
	`changes` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
