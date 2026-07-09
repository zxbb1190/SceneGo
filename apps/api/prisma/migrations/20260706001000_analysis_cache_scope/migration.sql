-- Align subtitle-backed AI cache with project_id + subtitle_line_id + language.
DROP INDEX `sentence_analysis_project_id_text_hash_language_key` ON `sentence_analysis`;

CREATE INDEX `sentence_analysis_project_id_text_hash_language_idx` ON `sentence_analysis`(`project_id`, `text_hash`, `language`);
