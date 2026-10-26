CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_by_user` ON `account` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_by_provider` ON `account` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `activity` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`board_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activity_by_board` ON `activity` (`board_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `board_members` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`board_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `board_members_by_board` ON `board_members` (`board_id`);--> statement-breakpoint
CREATE INDEX `board_members_by_user` ON `board_members` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `board_members_by_board_and_user` ON `board_members` (`board_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `boards` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `boards_by_owner` ON `boards` (`owner_id`);--> statement-breakpoint
CREATE TABLE `card_assignees` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`card_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `card_assignees_by_card` ON `card_assignees` (`card_id`);--> statement-breakpoint
CREATE INDEX `card_assignees_by_user` ON `card_assignees` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `card_assignees_by_card_and_user` ON `card_assignees` (`card_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `card_labels` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`card_id` text NOT NULL,
	`label_id` text NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `card_labels_by_card` ON `card_labels` (`card_id`);--> statement-breakpoint
CREATE INDEX `card_labels_by_label` ON `card_labels` (`label_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `card_labels_by_card_and_label` ON `card_labels` (`card_id`,`label_id`);--> statement-breakpoint
CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`list_id` text,
	`board_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`due_date` integer,
	`position` integer NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "cards_position_nonnegative" CHECK("cards"."position" >= 0),
	CONSTRAINT "active_cards_have_list" CHECK("cards"."archived" = 1 OR "cards"."list_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX `cards_by_list` ON `cards` (`list_id`);--> statement-breakpoint
CREATE INDEX `cards_by_board` ON `cards` (`board_id`);--> statement-breakpoint
CREATE INDEX `cards_by_list_and_position` ON `cards` (`list_id`,`position`);--> statement-breakpoint
CREATE INDEX `cards_by_board_and_archived` ON `cards` (`board_id`,`archived`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`card_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comments_by_card` ON `comments` (`card_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `comments_by_author` ON `comments` (`author_id`);--> statement-breakpoint
CREATE TABLE `labels` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`board_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "labels_valid_color" CHECK("labels"."color" IN ('red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'))
);
--> statement-breakpoint
CREATE INDEX `labels_by_board` ON `labels` (`board_id`);--> statement-breakpoint
CREATE TABLE `lists` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`board_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "lists_position_nonnegative" CHECK("lists"."position" >= 0)
);
--> statement-breakpoint
CREATE INDEX `lists_by_board` ON `lists` (`board_id`);--> statement-breakpoint
CREATE INDEX `lists_by_board_and_position` ON `lists` (`board_id`,`position`);--> statement-breakpoint
CREATE TABLE `presence` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`board_id` text NOT NULL,
	`user_id` text NOT NULL,
	`last_seen` integer NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `presence_by_board` ON `presence` (`board_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `presence_by_board_and_user` ON `presence` (`board_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `presence_by_last_seen` ON `presence` (`last_seen`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_by_user` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_by_identifier` ON `verification` (`identifier`);