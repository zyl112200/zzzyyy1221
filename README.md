# 比奇堡（Bikini Bottom）— 海绵宝宝主题登录 + 第一人称沉浸式钓鱼

比奇堡风格的全栈项目：海底背景、上升泡泡、纯 CSS 绘制的海绵宝宝（登录页）和派大星（注册页）。登录后进入 **第一人称钓鱼码头**，握住鱼竿、看漂、提竿、与巨物拉扯，用「贝壳」升级装备、用「金石」提升力量，挑战 **十万斤、百万斤** 的山海巨兽。

## 玩法亮点

- **第一人称沉浸式搏鱼**：满屏海景 + 前景鱼竿 + 鱼线浮漂；抛竿 → 等待 → 咬钩提竿 → 按住收线 / 松手泄力。
- **真实拉扯感**：鱼线有张力条，张力过高会「啪」地挣断鱼线；鱼每 1~2 秒挣扎一次，重量越大、品级越高，拉扯越猛。
- **暴走机制**：收线到 ~78% 时，越重越稀有的鱼越可能 **暴走**，暴走时张力飙升、屏幕震动，且更容易 **挣断鱼竿**（鱼竿会真的损毁）。
- **重量 & 品质**：每条鱼有独立重量（斤）与品级，越重越稀有价值越高；贝壳与金石按「品级 × 重量」结算。
- **神话 / 山海鱼种**：鲲、烛龙、九尾狐、白泽、凤凰、麒麟，以及鲲鹏、饕餮、穷奇、相柳、玄武、应龙、巴蛇、陵鱼、帝江、狰。
- **力量系统**：力量越高，收线越稳、能抗衡的鱼越重；力量用 **金石** 升级，钓到越稀有越重的鱼，金石给得越多。
- **顶级渔具**：**螺纹钢航母阻拦索**（十万斤内绝不挣断，可钓百万斤巨鱼）、深渊海神竿等。

## 技术栈

| 端 | 技术 |
| --- | --- |
| 前端 | Vue 3 + Vite + Vue Router |
| 后端 | Spring Boot 3 + MyBatis-Plus + BCrypt |
| 数据库 | MySQL 8（生产） / **H2 内存库（本地免装，默认）** |

---

## 一键启动（推荐）

仓库内置启动脚本，**自动并行拉起前后端**（后端使用 H2 内存库，无需安装 MySQL），并会检测 / 兜底 Java、Maven、Node 环境：

| 系统 | 操作 |
| --- | --- |
| Windows | 双击 `start.bat`，或在项目根目录执行 `start.bat` |
| Linux / macOS | 先赋予执行权限：`chmod +x start.sh`，再运行 `./start.sh` |

脚本会自动检测 `node` / `java` / `mvn` 是否就绪（缺失会给出提示）。启动完成后：

- 后端：http://localhost:8080
- 前端：http://localhost:5173 （浏览器打开即可游玩）
- 默认账号：`spongebob` / `123456`（预置 200 金石，可立刻体验力量升级）

> 说明：Windows 脚本在 `PATH` 中找不到 Maven 时会兜底尝试 WorkBuddy 隔离目录下的 Maven；找不到 JDK 时会尝试常见 Zulu / Adoptium 安装路径。标准环境下（已安装并加入 `PATH`）无需任何改动。
> 两个启动脚本都会自动清除环境中可能注入的 `SERVER__PORT` 变量，确保后端稳定监听 8080（否则部分沙箱 / 云环境会把后端端口劫持到其它端口，导致前端 `/api` 代理连不上）。

## 快速开始（本地，无需安装 MySQL）

### 1) 启动后端（端口 8080）

```bash
cd backend
# 先清空可能被环境注入的端口变量，避免后端被劫持到其它端口：
#   Windows  : set SERVER__PORT=
#   Linux/mac: unset SERVER__PORT
./mvnw -Dspring-boot.run.profiles=h2 -Dspring-boot.run.arguments=--server.port=8080 spring-boot:run
```

> 说明：`mvnw`（Windows 为 `mvnw.bat`）会自动在 `PATH` 与常见安装目录中查找 Maven，无需手动配置 PATH；若你已把 `mvn` 加入 `PATH`，也可直接写 `mvn`。
> 生产环境用 MySQL：直接 `./mvnw spring-boot:run`（读默认 `application.yml`）。

### 2) 启动前端（端口 5173）

```bash
npm install
npm run dev
```

浏览器打开 http://localhost:5173 ，前端通过 Vite 代理把 `/api` 转发到 8080 后端。

---

## 钓鱼流程

1. **抛竿**：点击「抛竿钓鱼」，消耗 1 个鱼饵，后端根据你的钓竿 / 鱼线承重生成一条咬钩的鱼。
2. **等待咬钩**：浮漂会上下浮动；出现「咬钩了！」时必须在 2.2 秒内点「提竿」，否则脱钩。
3. **搏鱼**：
   - **按住收线**：进度上升，但张力也上升；
   - **松开泄力**：张力快速回落，进度轻微回退；
   - 张力进入绿色**安全区**时收线更快；
   - 张力满 100% → 鱼线被挣断（失败）。
4. **暴走**：进度约 78% 时，越重越稀有的鱼越可能暴走，张力与挣扎大幅增强，此时绷断更可能 **拽断鱼竿**。
5. **结算**：成功则按「品级 × 重量」获得贝壳与金石；失败则空手而归（鱼饵已消耗）。

## 鱼种与重量

| 品级 | 重量范围 | 代表鱼 |
| --- | --- | --- |
| 普通 | 0.5 ~ 8 斤 | 小丑鱼、热带鱼、河豚、沙丁鱼、鲭鱼 |
| 稀有 | 15 ~ 300 斤 | 章鱼、鱿鱼、帝王蟹、巨型石斑、电鳗 |
| 传说 | 300 ~ 8000 斤 | 深海龙鱼、独角鲸、黄金海马、大王乌贼、幽灵鲨 |
| 神话 | 5000 ~ 12 万斤 | 鲲、烛龙、九尾狐、白泽、凤凰、麒麟 |
| 山海 | 2 万 ~ 100 万斤 | 鲲鹏、饕餮、穷奇、相柳、玄武、应龙、巴蛇、陵鱼、帝江、狰 |

> 能遇到多大的鱼，取决于你装备的 **最大可钓重量**；鱼线承重决定超过多少斤后极易被挣断。

## 经济系统

- **贝壳 🐚**：购买装备 / 鱼饵。钓获按 `品级系数 × (10 + 3 × 重量^0.75)` 结算。
- **金石 🪙**：升级力量的稀有材料。钓获按 `品级系数 × 重量^0.45` 结算，越稀有越重给得越多。
- **力量 💪**：初始 10，每次修炼 +5，消耗 `20 + 当前力量 × 2` 金石；力量越高，收线速度更快、可抗衡的鱼越重。

## 商店目录

| id | 名称 | 类型 | 价格(🐚) | 钓力 | 鱼线承重 | 最大可钓 |
| -- | ---- | ---- | ---- | ---- | ---- | ---- |
| 1 | 初级钓竿 | ROD | 0 | 1 | 300 斤 | 800 斤 |
| 2 | 银质钓竿 | ROD | 200 | 2 | 2000 斤 | 5000 斤 |
| 3 | 黄金钓竿 | ROD | 800 | 3 | 2 万斤 | 5 万斤 |
| 4 | 钻石钓竿 | ROD | 3000 | 4 | 20 万斤 | 40 万斤 |
| 8 | 精钢巨物竿 | ROD | 12000 | 6 | 80 万斤 | 120 万斤 |
| 11 | 深渊海神竿 | ROD | 80000 | 9 | 300 万斤 | 500 万斤 |
| 9 | **螺纹钢航母阻拦索** | LINE | 50000 | — | **10 万斤（内不挣断）** | **100 万斤** |
| 5 | 普通鱼饵 | BAIT | 10 | — | — | — |
| 6 | 豪华鱼饵 | BAIT | 35 | — | — | — |
| 10 | 深海秘饵 | BAIT | 90 | — | — | — |
| 7 | 幸运四叶草 | LUCK | 500 | — | — | — |

> 鱼线与钓竿同时装备时，`承重 / 最大可钓` 取两者最大值。

---

## 页面路由

| 路径 | 页面 | 守卫 |
| --- | --- | --- |
| `/` | 登录页（海绵宝宝） | 已登录则跳 `/home` |
| `/register` | 注册页（派大星） | 已登录则跳 `/home` |
| `/home` | 第一人称钓鱼码头 | 需登录 |
| `/shop` | 渔具商店 | 需登录 |
| `/inventory` | 我的背包 | 需登录 |

## 后端接口

| 接口 | 说明 | 请求体 / 参数 |
| --- | --- | --- |
| `POST /api/auth/register` | 注册 | `{ "username", "email", "password" }` |
| `POST /api/auth/login` | 登录 | `{ "username", "password" }` |
| `GET  /api/game/me?username=` | 玩家档案（含背包、贝壳、金石、力量、装备） | query: username |
| `POST /api/game/cast` | 抛竿，生成咬钩的鱼与搏鱼参数 | `{ "username" }` |
| `POST /api/game/settle` | 搏鱼结算（成功入账 / 断线断竿） | `{ "username", "encounterId", "landed", "breakType" }` |
| `POST /api/game/train` | 金石升级力量（+5） | `{ "username" }` |
| `GET  /api/shop/items` | 商店目录 | — |
| `POST /api/shop/buy` | 购买道具 | `{ "username", "itemId", "quantity" }` |
| `POST /api/game/equip` | 装备钓竿 / 鱼线 | `{ "username", "userItemId" }` |

统一返回：`{ "code": 200/400, "message": "...", "data": {...} }`，密码 BCrypt 加密存储。
> 说明：本项目为演示用途，未引入鉴权框架，接口通过 `username` 定位玩家（前端会话存于 `localStorage`）。

---

## 初始化数据库（生产 / MySQL 模式）

```bash
mysql -uroot -p123456 < sql/spongebob_db.sql
```

脚本创建 `spongebob_db` 库、`user` / `item` / `user_item` 三张表，并写入示例账号与商店目录。

## 前端打包

```bash
npm run build     # 产物在 dist/
```

---

## 项目结构

```
├── index.html
├── package.json
├── vite.config.js            # Vite 配置（/api 代理到 8080）
├── sql/spongebob_db.sql      # MySQL 初始化脚本
├── src/                      # 前端源码
│   ├── main.js / App.vue
│   ├── api/{auth,game,http}.js
│   ├── store/session.js
│   ├── router/index.js
│   ├── assets/main.css
│   ├── views/
│   │   ├── LoginView.vue / RegisterView.vue
│   │   ├── HomeView.vue        # 第一人称沉浸式钓鱼（张力 / 暴走 / 断线断竿）
│   │   ├── ShopView.vue        # 商店（钓竿 / 鱼线 / 鱼饵 / 幸运物）
│   │   └── InventoryView.vue   # 背包（装备钓竿与鱼线）
│   └── components/
│       ├── OceanBackground.vue
│       ├── TopBar.vue          # 顶栏（贝壳 / 金石 / 力量）
│       ├── SpongeBob.vue / PatrickStar.vue
│       ├── LoginCard.vue / RegisterCard.vue
│       └── ToastMessage.vue
└── backend/                  # Spring Boot 后端
    ├── pom.xml
    ├── mvnw / mvnw.bat       # 轻量 Maven 启动器
    └── src/main/
        ├── resources/
        │   ├── application.yml        # 默认 MySQL 数据源
        │   ├── application-h2.yml     # h2 profile：H2 内存库
        │   ├── schema-h2.sql / data-h2.sql
        └── java/com/bikinibottom/
            ├── controller/{Auth,Game,Shop}Controller.java
            ├── service/{User,Game}Service.java   # 鱼池 / 搏鱼 / 金石 / 力量
            ├── mapper/ · entity/ · dto/ · config/ · common/
```
