-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `nickname` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `learning_projects` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `language` VARCHAR(20) NOT NULL,
    `source_type` ENUM('local_file', 'network_url', 'external_embed', 'official_licensed', 'public_domain', 'creative_commons') NOT NULL,
    `source_url` TEXT NULL,
    `video_file_name` VARCHAR(255) NULL,
    `subtitle_file_name` VARCHAR(255) NULL,
    `duration` DOUBLE NULL,
    `last_position` DOUBLE NOT NULL DEFAULT 0,
    `status` ENUM('active', 'archived') NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `learning_projects_user_id_status_idx`(`user_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subtitle_lines` (
    `id` VARCHAR(36) NOT NULL,
    `project_id` VARCHAR(36) NOT NULL,
    `line_index` INTEGER NOT NULL,
    `start_time` DOUBLE NOT NULL,
    `end_time` DOUBLE NOT NULL,
    `text_original` TEXT NOT NULL,
    `text_translation` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `subtitle_lines_project_id_start_time_end_time_idx`(`project_id`, `start_time`, `end_time`),
    UNIQUE INDEX `subtitle_lines_project_id_line_index_key`(`project_id`, `line_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sentence_analysis` (
    `id` VARCHAR(36) NOT NULL,
    `project_id` VARCHAR(36) NOT NULL,
    `subtitle_line_id` VARCHAR(36) NULL,
    `language` VARCHAR(20) NOT NULL,
    `text_hash` VARCHAR(128) NOT NULL,
    `analysis_json` JSON NOT NULL,
    `model_name` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sentence_analysis_project_id_subtitle_line_id_language_key`(`project_id`, `subtitle_line_id`, `language`),
    UNIQUE INDEX `sentence_analysis_project_id_text_hash_language_key`(`project_id`, `text_hash`, `language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sentence_progress` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `project_id` VARCHAR(36) NOT NULL,
    `subtitle_line_id` VARCHAR(36) NULL,
    `manual_text` TEXT NULL,
    `status` ENUM('viewed', 'learning', 'mastered') NOT NULL DEFAULT 'viewed',
    `listen_count` INTEGER NOT NULL DEFAULT 0,
    `is_favorite` BOOLEAN NOT NULL DEFAULT false,
    `note` TEXT NULL,
    `last_viewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_sentence_progress_user_id_is_favorite_idx`(`user_id`, `is_favorite`),
    UNIQUE INDEX `user_sentence_progress_user_id_project_id_subtitle_line_id_key`(`user_id`, `project_id`, `subtitle_line_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vocabulary_items` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `project_id` VARCHAR(36) NULL,
    `subtitle_line_id` VARCHAR(36) NULL,
    `word` VARCHAR(255) NOT NULL,
    `meaning` TEXT NULL,
    `language` VARCHAR(20) NOT NULL,
    `note` TEXT NULL,
    `mastery_status` ENUM('new', 'learning', 'mastered') NOT NULL DEFAULT 'new',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `vocabulary_items_user_id_language_mastery_status_idx`(`user_id`, `language`, `mastery_status`),
    INDEX `vocabulary_items_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_usage_logs` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `project_id` VARCHAR(36) NULL,
    `action_type` VARCHAR(100) NOT NULL,
    `input_tokens` INTEGER NULL,
    `output_tokens` INTEGER NULL,
    `cost_estimated` DECIMAL(10, 6) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_usage_logs_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `ai_usage_logs_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `learning_projects` ADD CONSTRAINT `learning_projects_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subtitle_lines` ADD CONSTRAINT `subtitle_lines_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `learning_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sentence_analysis` ADD CONSTRAINT `sentence_analysis_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `learning_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sentence_analysis` ADD CONSTRAINT `sentence_analysis_subtitle_line_id_fkey` FOREIGN KEY (`subtitle_line_id`) REFERENCES `subtitle_lines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sentence_progress` ADD CONSTRAINT `user_sentence_progress_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sentence_progress` ADD CONSTRAINT `user_sentence_progress_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `learning_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sentence_progress` ADD CONSTRAINT `user_sentence_progress_subtitle_line_id_fkey` FOREIGN KEY (`subtitle_line_id`) REFERENCES `subtitle_lines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vocabulary_items` ADD CONSTRAINT `vocabulary_items_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vocabulary_items` ADD CONSTRAINT `vocabulary_items_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `learning_projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vocabulary_items` ADD CONSTRAINT `vocabulary_items_subtitle_line_id_fkey` FOREIGN KEY (`subtitle_line_id`) REFERENCES `subtitle_lines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_usage_logs` ADD CONSTRAINT `ai_usage_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_usage_logs` ADD CONSTRAINT `ai_usage_logs_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `learning_projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

