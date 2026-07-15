-- Preserve legacy reasoning while allowing each model pass to render independently.

ALTER TABLE `conversation_messages`
    ADD COLUMN `classification_reasoning` TEXT NULL,
    ADD COLUMN `analysis_reasoning` TEXT NULL;

UPDATE `conversation_messages`
SET `classification_reasoning` = `reasoning`
WHERE `reasoning` IS NOT NULL;
