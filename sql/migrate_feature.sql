-- 洞天福地（灵池 / 悬赏令 / 本命法宝）迁移脚本
-- 若已有 spongebob_db 库，执行本脚本后再启动后端：
--   mysql -uroot -p123456 spongebob_db < sql/migrate_feature.sql

ALTER TABLE `user`
  ADD COLUMN `feature` TEXT DEFAULT NULL
  COMMENT '洞天福地统一状态 JSON（灵池/悬赏/本命法宝）'
  AFTER `sign_total`;
