-- v0.2 text study mode: study items, reusable text analysis, notes, and source-aware vocabulary.

-- CreateTable
CREATE TABLE `study_items` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `project_id` VARCHAR(36) NULL,
    `subtitle_line_id` VARCHAR(36) NULL,
    `item_type` ENUM('word', 'phrase', 'sentence', 'paragraph', 'mixed') NOT NULL,
    `source_type` ENUM('manual_input', 'video_subtitle', 'external_manual') NOT NULL DEFAULT 'manual_input',
    `language` VARCHAR(20) NOT NULL,
    `text_original` TEXT NOT NULL,
    `normalized_text` TEXT NOT NULL,
    `normalized_text_hash` VARCHAR(128) NOT NULL,
    `source_note` VARCHAR(255) NULL,
    `tags` JSON NULL,
    `is_favorite` BOOLEAN NOT NULL DEFAULT false,
    `mastery_status` ENUM('new', 'learning', 'mastered') NOT NULL DEFAULT 'new',
    `review_count` INTEGER NOT NULL DEFAULT 0,
    `last_viewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `study_items_user_id_normalized_text_hash_language_key`(`user_id`, `normalized_text_hash`, `language`),
    INDEX `study_items_user_id_item_type_idx`(`user_id`, `item_type`),
    INDEX `study_items_user_id_source_type_idx`(`user_id`, `source_type`),
    INDEX `study_items_user_id_is_favorite_idx`(`user_id`, `is_favorite`),
    INDEX `study_items_user_id_updated_at_idx`(`user_id`, `updated_at`),
    INDEX `study_items_project_id_idx`(`project_id`),
    INDEX `study_items_subtitle_line_id_idx`(`subtitle_line_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `study_item_analysis` (
    `id` VARCHAR(36) NOT NULL,
    `study_item_id` VARCHAR(36) NOT NULL,
    `language` VARCHAR(20) NOT NULL,
    `analysis_json` JSON NOT NULL,
    `model_name` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `study_item_analysis_study_item_id_key`(`study_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_notes` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `study_item_id` VARCHAR(36) NULL,
    `project_id` VARCHAR(36) NULL,
    `subtitle_line_id` VARCHAR(36) NULL,
    `note_text` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_notes_user_id_updated_at_idx`(`user_id`, `updated_at`),
    INDEX `user_notes_study_item_id_idx`(`study_item_id`),
    INDEX `user_notes_project_id_idx`(`project_id`),
    INDEX `user_notes_subtitle_line_id_idx`(`subtitle_line_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `vocabulary_items`
    ADD COLUMN `study_item_id` VARCHAR(36) NULL,
    ADD COLUMN `source_text` TEXT NULL,
    ADD COLUMN `source_type` ENUM('manual_input', 'video_subtitle', 'external_manual') NULL;

-- AlterTable
ALTER TABLE `ai_usage_logs`
    ADD COLUMN `study_item_id` VARCHAR(36) NULL,
    ADD COLUMN `source_type` ENUM('manual_input', 'video_subtitle', 'external_manual') NULL,
    ADD COLUMN `input_hash` VARCHAR(128) NULL,
    ADD COLUMN `model_name` VARCHAR(100) NULL,
    ADD COLUMN `total_tokens` INTEGER NULL;

-- CreateIndex
CREATE INDEX `vocabulary_items_user_id_source_type_idx` ON `vocabulary_items`(`user_id`, `source_type`);

-- CreateIndex
CREATE INDEX `vocabulary_items_study_item_id_idx` ON `vocabulary_items`(`study_item_id`);

-- CreateIndex
CREATE INDEX `ai_usage_logs_study_item_id_idx` ON `ai_usage_logs`(`study_item_id`);

-- CreateIndex
CREATE INDEX `ai_usage_logs_input_hash_idx` ON `ai_usage_logs`(`input_hash`);

-- AddForeignKey
ALTER TABLE `study_items` ADD CONSTRAINT `study_items_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `study_items` ADD CONSTRAINT `study_items_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `learning_projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `study_items` ADD CONSTRAINT `study_items_subtitle_line_id_fkey` FOREIGN KEY (`subtitle_line_id`) REFERENCES `subtitle_lines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `study_item_analysis` ADD CONSTRAINT `study_item_analysis_study_item_id_fkey` FOREIGN KEY (`study_item_id`) REFERENCES `study_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_notes` ADD CONSTRAINT `user_notes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_notes` ADD CONSTRAINT `user_notes_study_item_id_fkey` FOREIGN KEY (`study_item_id`) REFERENCES `study_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_notes` ADD CONSTRAINT `user_notes_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `learning_projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_notes` ADD CONSTRAINT `user_notes_subtitle_line_id_fkey` FOREIGN KEY (`subtitle_line_id`) REFERENCES `subtitle_lines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vocabulary_items` ADD CONSTRAINT `vocabulary_items_study_item_id_fkey` FOREIGN KEY (`study_item_id`) REFERENCES `study_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_usage_logs` ADD CONSTRAINT `ai_usage_logs_study_item_id_fkey` FOREIGN KEY (`study_item_id`) REFERENCES `study_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
