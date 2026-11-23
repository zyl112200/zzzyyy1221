-- ============================================================
-- 新增「修为系统」：给用户表加 cultivation（修为百分比）字段
-- 适用：MySQL（sql/spongebob_db.sql 对应库）；已有库执行本脚本即可升级。
-- 说明：
--   · cultivation 初始 0，单独计算在基础力量（strength）上，不并入基础力量本身；
--   · 总力量 = strength × (1 + cultivation/100)，基础力量提升后按同百分比重算，无上限；
--   · 极限突破时基础力量涨 1~50%，修为独立涨 1~50 个百分点；
--   · 全新安装请直接用 sql/spongebob_db.sql（已含该字段），无需执行本脚本。
-- 执行前请备份数据。
-- ============================================================

ALTER TABLE `user`
  ADD COLUMN `cultivation` INT NOT NULL DEFAULT 0
  COMMENT '修为%（无上限，单独作用于基础力量；总力量=strength×(1+cultivation/100)）'
  AFTER `strength`;
