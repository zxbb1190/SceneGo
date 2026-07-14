-- v0.2.2 review and AI quiz system.

-- CreateTable
CREATE TABLE `review_tasks` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `target_type` ENUM('study_item', 'vocabulary_item') NOT NULL,
    `study_item_id` VARCHAR(36) NULL,
    `vocabulary_item_id` VARCHAR(36) NULL,
    `next_review_at` DATETIME(3) NOT NULL,
    `last_reviewed_at` DATETIME(3) NULL,
    `interval_days` INTEGER NOT NULL DEFAULT 0,
    `attempt_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `review_tasks_user_id_study_item_id_key`(`user_id`, `study_item_id`),
    UNIQUE INDEX `review_tasks_user_id_vocabulary_item_id_key`(`user_id`, `vocabulary_item_id`),
    INDEX `review_tasks_user_id_next_review_at_idx`(`user_id`, `next_review_at`),
    INDEX `review_tasks_study_item_id_idx`(`study_item_id`),
    INDEX `review_tasks_vocabulary_item_id_idx`(`vocabulary_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz_items` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `review_task_id` VARCHAR(36) NULL,
    `study_item_id` VARCHAR(36) NULL,
    `vocabulary_item_id` VARCHAR(36) NULL,
    `question_type` ENUM('multiple_choice', 'fill_blank', 'short_answer') NOT NULL DEFAULT 'multiple_choice',
    `question_text` TEXT NOT NULL,
    `choices` JSON NULL,
    `answer` TEXT NOT NULL,
    `explanation` TEXT NULL,
    `quiz_json` JSON NOT NULL,
    `model_name` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `quiz_items_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `quiz_items_review_task_id_idx`(`review_task_id`),
    INDEX `quiz_items_study_item_id_idx`(`study_item_id`),
    INDEX `quiz_items_vocabulary_item_id_idx`(`vocabulary_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `review_attempts` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `review_task_id` VARCHAR(36) NOT NULL,
    `study_item_id` VARCHAR(36) NULL,
    `vocabulary_item_id` VARCHAR(36) NULL,
    `quiz_item_id` VARCHAR(36) NULL,
    `result` ENUM('known', 'fuzzy', 'unknown') NOT NULL,
    `user_answer` TEXT NULL,
    `is_correct` BOOLEAN NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `review_attempts_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `review_attempts_review_task_id_idx`(`review_task_id`),
    INDEX `review_attempts_study_item_id_idx`(`study_item_id`),
    INDEX `review_attempts_vocabulary_item_id_idx`(`vocabulary_item_id`),
    INDEX `review_attempts_quiz_item_id_idx`(`quiz_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `review_tasks` ADD CONSTRAINT `review_tasks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_tasks` ADD CONSTRAINT `review_tasks_study_item_id_fkey` FOREIGN KEY (`study_item_id`) REFERENCES `study_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_tasks` ADD CONSTRAINT `review_tasks_vocabulary_item_id_fkey` FOREIGN KEY (`vocabulary_item_id`) REFERENCES `vocabulary_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_items` ADD CONSTRAINT `quiz_items_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_items` ADD CONSTRAINT `quiz_items_review_task_id_fkey` FOREIGN KEY (`review_task_id`) REFERENCES `review_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_items` ADD CONSTRAINT `quiz_items_study_item_id_fkey` FOREIGN KEY (`study_item_id`) REFERENCES `study_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_items` ADD CONSTRAINT `quiz_items_vocabulary_item_id_fkey` FOREIGN KEY (`vocabulary_item_id`) REFERENCES `vocabulary_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_attempts` ADD CONSTRAINT `review_attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_attempts` ADD CONSTRAINT `review_attempts_review_task_id_fkey` FOREIGN KEY (`review_task_id`) REFERENCES `review_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_attempts` ADD CONSTRAINT `review_attempts_study_item_id_fkey` FOREIGN KEY (`study_item_id`) REFERENCES `study_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_attempts` ADD CONSTRAINT `review_attempts_vocabulary_item_id_fkey` FOREIGN KEY (`vocabulary_item_id`) REFERENCES `vocabulary_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_attempts` ADD CONSTRAINT `review_attempts_quiz_item_id_fkey` FOREIGN KEY (`quiz_item_id`) REFERENCES `quiz_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
