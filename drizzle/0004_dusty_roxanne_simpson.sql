CREATE TABLE `totps` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`secret` text NOT NULL,
	`name` text DEFAULT 'Authenticator App',
	`last_used_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
