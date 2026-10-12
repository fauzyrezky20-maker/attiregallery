ALTER TABLE `incomes` ADD `gross_amount` integer;--> statement-breakpoint
ALTER TABLE `incomes` ADD `discount_pct` real DEFAULT 0 NOT NULL;