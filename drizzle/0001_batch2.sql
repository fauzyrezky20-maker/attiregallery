CREATE TABLE `store_savings` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`amount` integer NOT NULL,
	`account` text,
	`note` text,
	`proof_url` text,
	`user_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `store_savings_date_idx` ON `store_savings` (`date`);--> statement-breakpoint
ALTER TABLE `customers` ADD `event_type` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `campus` text;--> statement-breakpoint
ALTER TABLE `fitting_schedules` ADD `photo_url` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `pickup_time` text;--> statement-breakpoint
ALTER TABLE `store_settings` ADD `rental_guide` text;--> statement-breakpoint
ALTER TABLE `store_settings` ADD `dp_amount` integer DEFAULT 200000 NOT NULL;--> statement-breakpoint
ALTER TABLE `store_settings` ADD `settle_days_before` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `store_settings` ADD `pickup_from` text DEFAULT '16:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `store_settings` ADD `pickup_until` text DEFAULT '20:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `store_settings` ADD `instagram` text;--> statement-breakpoint
ALTER TABLE `store_settings` ADD `savings_account` text;--> statement-breakpoint
ALTER TABLE `store_settings` ADD `mbanking_url` text;--> statement-breakpoint
UPDATE `store_settings` SET
  `terms_text` = replace(replace(`terms_text`,
    '3. Keterlambatan pengembalian dikenakan denda per hari sesuai ketentuan toko.',
    '3. Keterlambatan pengembalian per hari dikenakan denda sesuai harga sewa baju.'),
    '6. Uang sewa yang sudah dibayar tidak dapat dikembalikan bila pesanan dibatalkan kurang dari 2 hari sebelum tanggal ambil.',
    '6. Wajib pelunasan sewa maks. H-3 jadwal sewa & telah menyetujui aturan yang berlaku.'),
  `terms_version` = CASE WHEN `terms_text` LIKE '%6. Uang sewa yang sudah dibayar%' THEN '1.1' ELSE `terms_version` END;
