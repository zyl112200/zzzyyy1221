-- ============================================================
-- 比奇堡数据库结构（H2 内存库，MySQL 兼容模式）
-- 对应实体：User / Item / UserItem
-- NON_KEYWORDS=USER 已在 application-h2.yml 中设置，避免 user 被当保留字
-- ============================================================

-- 用户表（新增 shells 贝壳余额字段）
CREATE TABLE user (
  id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL,
  email       VARCHAR(100) NOT NULL,
  password    VARCHAR(100) NOT NULL,
  shells      INT          NOT NULL DEFAULT 50,
  strength    INT          NOT NULL DEFAULT 10,
  gold_stones INT          NOT NULL DEFAULT 0,
  power_realm INT          NOT NULL DEFAULT 1,
  create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uk_username ON user (username);
CREATE UNIQUE INDEX uk_email    ON user (email);

-- 商店商品目录
CREATE TABLE item (
  id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL,
  type        VARCHAR(10)  NOT NULL,   -- ROD 钓竿 / BAIT 鱼饵 / LUCK 幸运物
  price       INT          NOT NULL,   -- 售价（贝壳）
  power       INT          NOT NULL DEFAULT 0, -- 钓力/幸运加成
  line_strength     INT    NOT NULL DEFAULT 0, -- 鱼线承重（斤）
  max_catch_weight  INT    NOT NULL DEFAULT 0, -- 最大可钓重量（斤）
  icon        VARCHAR(10),             -- 展示用 emoji
  description VARCHAR(200),
  sort        INT          NOT NULL DEFAULT 0
);

-- 用户背包（拥有道具）
CREATE TABLE user_item (
  id        BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id   BIGINT NOT NULL,
  item_id   BIGINT NOT NULL,
  quantity  INT    NOT NULL DEFAULT 0,
  equipped  TINYINT NOT NULL DEFAULT 0  -- 仅钓竿：1=已装备
);
CREATE INDEX idx_user_item_user ON user_item (user_id);

-- 后台管理员账号
CREATE TABLE admin_account (
  id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL,
  password    VARCHAR(100) NOT NULL,
  role        VARCHAR(20)  NOT NULL DEFAULT 'ADMIN',
  create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uk_admin_username ON admin_account (username);

-- AI 对话预设（后台可维护「触发词 -> 回复」）
CREATE TABLE ai_dialog (
  id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  scene       VARCHAR(100) NOT NULL,
  reply       VARCHAR(1000) NOT NULL,
  enabled     TINYINT      NOT NULL DEFAULT 1,
  sort_order  INT          NOT NULL DEFAULT 0,
  create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 钓鱼爆率配置（各品级相对权重，后台可实时修改）
CREATE TABLE catch_rate (
  id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tier_code   VARCHAR(20)  NOT NULL,
  tier_name   VARCHAR(20)  NOT NULL,
  base_weight INT          NOT NULL DEFAULT 0,
  enabled     TINYINT      NOT NULL DEFAULT 1,
  create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uk_tier_code ON catch_rate (tier_code);
