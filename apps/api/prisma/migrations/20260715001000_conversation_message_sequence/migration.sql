-- Add a deterministic order for messages created in the same database timestamp.

ALTER TABLE `conversation_messages`
    ADD COLUMN `message_index` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `reasoning` TEXT NULL;

UPDATE `conversation_messages` AS current_message
JOIN (
    SELECT
        `id`,
        ROW_NUMBER() OVER (
            PARTITION BY `conversation_id`
            ORDER BY `created_at` ASC, CASE WHEN `role` = 'user' THEN 0 ELSE 1 END ASC, `id` ASC
        ) - 1 AS `message_index`
    FROM `conversation_messages`
) AS ranked_message ON ranked_message.`id` = current_message.`id`
SET current_message.`message_index` = ranked_message.`message_index`;

CREATE UNIQUE INDEX `conversation_messages_conversation_id_message_index_key`
    ON `conversation_messages`(`conversation_id`, `message_index`);
