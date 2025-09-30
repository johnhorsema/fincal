-- Initial schema migration for social accounting feed

-- Create users table
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`personas` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- Create unique index on email
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);

-- Create accounts table
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- Create unique constraint on name and type combination
CREATE UNIQUE INDEX `accounts_name_type_unique` ON `accounts` (`name`, `type`);

-- Create posts table
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`author_id` text NOT NULL,
	`author_persona` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`attachments` text,
	`transaction_id` text,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

-- Create transactions table
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`description` text NOT NULL,
	`date` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_by` text NOT NULL,
	`approved_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

-- Create transaction_entries table
CREATE TABLE `transaction_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`account_id` text NOT NULL,
	`debit_amount` real,
	`credit_amount` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);

-- Create indexes for better performance
CREATE INDEX `posts_author_id_idx` ON `posts` (`author_id`);
CREATE INDEX `posts_created_at_idx` ON `posts` (`created_at`);
CREATE INDEX `transactions_post_id_idx` ON `transactions` (`post_id`);
CREATE INDEX `transactions_created_by_idx` ON `transactions` (`created_by`);
CREATE INDEX `transactions_status_idx` ON `transactions` (`status`);
CREATE INDEX `transactions_date_idx` ON `transactions` (`date`);
CREATE INDEX `transaction_entries_transaction_id_idx` ON `transaction_entries` (`transaction_id`);
CREATE INDEX `transaction_entries_account_id_idx` ON `transaction_entries` (`account_id`);