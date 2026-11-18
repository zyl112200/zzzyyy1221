-- ============================================================
-- 货币统一为金币：把历史「金石」余额一次性折算进金币（shells）
-- 适用：MySQL（sql/spongebob_db.sql 对应库）
-- 说明：gold_stones 字段保留兼容，迁移后归零；执行前请备份数据。
-- ============================================================

UPDATE `user`
SET `shells` = `shells` + `gold_stones`,
    `gold_stones` = 0
WHERE `gold_stones` > 0;
