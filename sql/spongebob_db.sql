-- ============================================================
-- 比奇堡登录注册 + 钓鱼小游戏 - 数据库初始化脚本
-- 数据库：spongebob_db
-- 适用：MySQL 8.0+
-- 执行方式：mysql -uroot -p123456 < spongebob_db.sql
-- ============================================================

-- 创建数据库（不存在则创建）
CREATE DATABASE IF NOT EXISTS spongebob_db
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE spongebob_db;

-- 用户表
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
  `username`    VARCHAR(50)  NOT NULL                COMMENT '用户名',
  `email`       VARCHAR(100) NOT NULL                COMMENT '邮箱',
  `password`    VARCHAR(100) NOT NULL                COMMENT '密码（BCrypt 加密存储）',
  `shells`      INT          NOT NULL DEFAULT 50     COMMENT '贝壳余额（游戏货币）',
  `strength`    INT          NOT NULL DEFAULT 10     COMMENT '力量（影响收线与可抗衡鱼重）',
  `gold_stones` INT          NOT NULL DEFAULT 0      COMMENT '金石（升级力量的材料）',
  `power_realm` INT          NOT NULL DEFAULT 1      COMMENT '力量境界（修仙式层级，1-999，突破消耗贝壳按 2^(境界-1) 翻倍）',
  `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_general_ci
  COMMENT ='比奇堡用户表';

-- 商店商品目录
DROP TABLE IF EXISTS `item`;
CREATE TABLE `item` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
  `name`        VARCHAR(50)  NOT NULL                COMMENT '商品名',
  `type`        VARCHAR(10)  NOT NULL                COMMENT 'ROD 钓竿 / BAIT 鱼饵 / LUCK 幸运物 / LINE 鱼线工具',
  `price`       INT          NOT NULL                COMMENT '售价（贝壳）',
  `power`       INT          NOT NULL DEFAULT 0      COMMENT '钓力 / 幸运加成',
  `line_strength`    INT     NOT NULL DEFAULT 0      COMMENT '鱼线承重（斤）',
  `max_catch_weight` INT     NOT NULL DEFAULT 0      COMMENT '最大可钓重量（斤）',
  `icon`        VARCHAR(10)  DEFAULT NULL            COMMENT '展示 emoji',
  `description` VARCHAR(200) DEFAULT NULL            COMMENT '描述',
  `sort`        INT          NOT NULL DEFAULT 0      COMMENT '排序',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_general_ci
  COMMENT ='商店商品目录';

-- 用户背包
DROP TABLE IF EXISTS `user_item`;
CREATE TABLE `user_item` (
  `id`        BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
  `user_id`   BIGINT NOT NULL                COMMENT '用户 ID',
  `item_id`   BIGINT NOT NULL                COMMENT '商品 ID',
  `quantity`  INT    NOT NULL DEFAULT 0      COMMENT '拥有数量',
  `equipped`  TINYINT NOT NULL DEFAULT 0     COMMENT '是否装备（仅钓竿：1=已装备）',
  PRIMARY KEY (`id`),
  KEY `idx_user_item_user` (`user_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_general_ci
  COMMENT ='用户背包';

-- 后台管理员账号
DROP TABLE IF EXISTS `admin_account`;
CREATE TABLE `admin_account` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
  `username`    VARCHAR(50)  NOT NULL                COMMENT '管理员用户名',
  `password`    VARCHAR(100) NOT NULL                COMMENT '密码（BCrypt 加密）',
  `role`        VARCHAR(20)  NOT NULL DEFAULT 'ADMIN' COMMENT '角色',
  `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_username` (`username`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_general_ci
  COMMENT ='后台管理员账号';

-- AI 对话预设
DROP TABLE IF EXISTS `ai_dialog`;
CREATE TABLE `ai_dialog` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
  `scene`       VARCHAR(100) NOT NULL                COMMENT '触发词 / 场景名',
  `reply`       VARCHAR(1000) NOT NULL               COMMENT '回复内容',
  `enabled`     TINYINT      NOT NULL DEFAULT 1      COMMENT '是否启用（1=启用）',
  `sort_order`  INT          NOT NULL DEFAULT 0      COMMENT '排序',
  `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_general_ci
  COMMENT ='AI 对话预设';

-- 钓鱼爆率配置
DROP TABLE IF EXISTS `catch_rate`;
CREATE TABLE `catch_rate` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
  `tier_code`   VARCHAR(20)  NOT NULL                COMMENT '品级编码',
  `tier_name`   VARCHAR(20)  NOT NULL                COMMENT '品级中文名',
  `base_weight` INT          NOT NULL DEFAULT 0      COMMENT '相对权重（爆率权重）',
  `enabled`     TINYINT      NOT NULL DEFAULT 1      COMMENT '是否启用',
  `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tier_code` (`tier_code`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_general_ci
  COMMENT ='钓鱼爆率配置';

-- 示例数据（密码均为 BCrypt 加密后的 123456）
-- spongebob 为体验号：20 万贝壳 + 200 金石，可直接体验巨物玩法；patrick 为纯新号
INSERT INTO `user` (`username`, `email`, `password`, `shells`, `strength`, `gold_stones`) VALUES
  ('spongebob', 'spongebob@bikini.bottom', '$2a$10$6abzJLWM0DkWMUz/U0jTLeJgDVZvWlyNv9zeGx0vqMEh6RhEaIndC', 200000, 10, 200),
  ('patrick',   'patrick@bikini.bottom',   '$2a$10$dKiaOy1ff6HO3SvKQnAlUOVK8nmrcLhYAxdzVM02MYvDL6wXAjoTy', 50, 10, 0);

-- 商店商品目录（id 固定，便于逻辑引用）
INSERT INTO `item` (`id`, `name`, `type`, `price`, `power`, `icon`, `description`, `sort`, `line_strength`, `max_catch_weight`) VALUES
  (1,  '初级钓竿',       'ROD',  0,     1, '🎣', '比奇堡标配，承重 300 斤',        10, 300,     800),
  (2,  '银质钓竿',       'ROD',  200,   2, '🎣', '钓力提升，承重 2000 斤',         20, 2000,    5000),
  (3,  '黄金钓竿',       'ROD',  800,   3, '🎣', '承重 2 万斤，传说鱼也拦不住',     30, 20000,   50000),
  (4,  '钻石钓竿',       'ROD',  3000,  4, '🎣', '深海霸主专用，承重 20 万斤',      40, 200000,  400000),
  (8,  '精钢巨物竿',     'ROD',  12000, 6, '🔱', '专为巨物而生，承重 80 万斤',      45, 800000,  1200000),
  (11, '深渊海神竿',     'ROD',  80000, 9, '🌊', '海神遗物，可钓五百万斤',          48, 3000000, 5000000),
  (5,  '普通鱼饵',       'BAIT', 10,    0, '🪱', '每次抛竿消耗 1 个',              50, 0,       0),
  (6,  '豪华鱼饵',       'BAIT', 35,    1, '🦐', '提升稀有鱼概率',                60, 0,       0),
  (10, '深海秘饵',       'BAIT', 90,    3, '🧪', '大幅提升稀有 / 神话鱼概率',      65, 0,       0),
  (7,  '幸运四叶草',     'LUCK', 500,   2, '🍀', '永久提升稀有 / 传说概率 +8%',    70, 0,       0),
  (9,  '螺纹钢航母阻拦索', 'LINE', 50000, 0, '🧵', '十万斤内绝不挣断，能钓百万斤巨鱼', 80, 100000, 1000000);

-- 示例账号初始道具：1 把初级钓竿（已装备）+ 5 个普通鱼饵
INSERT INTO `user_item` (`user_id`, `item_id`, `quantity`, `equipped`) VALUES
  (1, 1, 1, 1), (1, 5, 5, 0),
  (2, 1, 1, 1), (2, 5, 5, 0);
