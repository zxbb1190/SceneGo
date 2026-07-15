-- Persist chat sessions and message-level learning decisions.

CREATE TABLE `conversations` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `conversations_user_id_updated_at_idx`(`user_id`, `updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `conversation_messages` (
    `id` VARCHAR(36) NOT NULL,
    `conversation_id` VARCHAR(36) NOT NULL,
    `study_item_id` VARCHAR(36) NULL,
    `role` VARCHAR(20) NOT NULL,
    `content` TEXT NOT NULL,
    `message_type` VARCHAR(40) NULL,
    `should_save` BOOLEAN NOT NULL DEFAULT false,
    `tags` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `conversation_messages_conversation_id_created_at_idx`(`conversation_id`, `created_at`),
    INDEX `conversation_messages_study_item_id_idx`(`study_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `conversations`
    ADD CONSTRAINT `conversations_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `conversation_messages`
    ADD CONSTRAINT `conversation_messages_conversation_id_fkey`
    FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `conversation_messages_study_item_id_fkey`
    FOREIGN KEY (`study_item_id`) REFERENCES `study_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
