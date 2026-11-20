-- ============================================================
-- 新增「灵鱼图鉴」解锁字段
-- 适用：MySQL（sql/spongebob_db.sql 对应库）
-- 说明：记录每位玩家钓起过、已解锁图鉴的鱼名（逗号分隔）。
--       已有数据库执行本脚本即可；全新部署直接用 spongebob_db.sql 建表。
-- ============================================================

ALTER TABLE `user`
    ADD COLUMN `codex` TEXT DEFAULT NULL COMMENT '已解锁图鉴的鱼名列表，逗号分隔' AFTER `current_map`;
