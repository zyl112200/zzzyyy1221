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
| 离线引擎 | 浏览器内本地游戏引擎（`localStorage` 存档），**无需任何服务端** |
| 分发 | 单文件 HTML（JS / CSS / 数据全内联，零外部请求） |
| 后端（可选） | Spring Boot 3 + MyBatis-Plus + BCrypt |
| 数据库（可选） | MySQL 8 / H2 内存库 |

---

## 一键启动（离线，推荐）

**不需要后端、不需要数据库、不需要 Java / Maven、不需要网络。**

| 系统 | 操作 |
| --- | --- |
| Windows | 双击 `start.bat`（自动用 Chrome / Edge 打开离线版） |
| Linux / macOS | `chmod +x start.sh` 后运行 `./start.sh` |
| 任意系统 | 直接用浏览器打开根目录的 `spongebob-offline.html` |

- 离线版是一个 **单文件 HTML**（约 195 KB），Vue 运行时、样式、游戏数据、本地存档引擎全部内联，**零外部请求**（无 CDN、无字体、无接口调用）。
- 默认账号：`spongebob` / `123456`（预置 20 万贝壳 + 200 金石，买得起顶级渔具直接钓巨物）；也可以直接注册新号（50 贝壳 + 5 鱼饵）。
- 存档保存在**当前浏览器**（`localStorage`），换浏览器 / 清缓存会丢失。

> 离线版如何实现？前端内置了一套浏览器端游戏引擎 `src/api/localEngine.js`，
> 按后端 `GameService` 的规则（品级权重、重量抽样、贝壳 / 金石结算、暴走与断竿、力量与境界、商店与装备）
> 完整复刻了全部接口，因此不需要任何服务端进程。

## 开发模式（需要 Node.js）

```bash
npm install      # 仅首次需要网络
npm run dev      # http://localhost:5173
```

前端默认也走本地引擎，所以**没有后端也能开发调试**。想要连真实后端时，在地址后加 `?api=server`：

```
http://localhost:5173/?api=server
```

## 重新打包离线单文件

```bash
npm run build:standalone
# 产物：dist/spongebob-standalone.html  +  根目录 spongebob-offline.html
```

---

## 可选：Spring Boot 后端（已修复，可正常编译启动）

后端目录 `backend/` 是完整的 Spring Boot 3 工程（Controller / Service / Mapper / DTO / H2 脚本齐全），
使用 H2 内存库，**无需安装 MySQL**，无需单独装 Maven（`mvnw.bat` 会自动使用 Wrapper 缓存的 Maven 发行版）。

```bash
cd backend
unset SERVER__PORT   # Windows: set SERVER__PORT=
./mvnw.bat -Dspring-boot.run.profiles=h2 -Dspring-boot.run.arguments=--server.port=8080 spring-boot:run
```

- 后端地址：http://localhost:8080 （H2 控制台：http://localhost:8080/h2-console）
- 前端连后端：开发模式 `npm run dev` 后访问 `http://localhost:5173/?api=server`，或控制台执行
  `localStorage.setItem('bikini_api_mode', 'server')`
- 商店目录 / 爆率配置（`catch_rate` 表）/ AI 预设问答（`ai_dialog` 表）都已写入 H2 初始化脚本
- 不启动后端也完全不影响游玩：前端默认走离线本地引擎，两套模式的接口契约完全一致


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

## 接口约定（本地引擎与后端同构）

前端所有 `/api/*` 请求默认由 `src/api/localEngine.js` 在浏览器内处理，**请求 / 返回结构与下表完全一致**，
所以页面代码在「离线模式」与「后端模式」之间可以无缝切换。

| 接口 | 说明 | 请求体 / 参数 |
| --- | --- | --- |
| `POST /api/auth/register` | 注册 | `{ "username", "email", "password" }` |
| `POST /api/auth/login` | 登录 | `{ "username", "password" }` |
| `GET  /api/game/me?username=` | 玩家档案（含背包、贝壳、金石、力量、装备） | query: username |
| `POST /api/game/cast` | 抛竿，生成咬钩的鱼与搏鱼参数 | `{ "username" }` |
| `POST /api/game/settle` | 搏鱼结算（成功入账 / 断线断竿） | `{ "username", "encounterId", "landed", "breakType" }` |
| `POST /api/game/train` | 金石升级力量（+5） | `{ "username" }` |
| `POST /api/game/realm-up` | 贝壳突破力量境界 | `{ "username" }` |
| `GET  /api/shop/items` | 商店目录 | — |
| `POST /api/shop/buy` | 购买道具 | `{ "username", "itemId", "quantity" }` |
| `POST /api/game/equip` | 装备钓竿 / 鱼线 | `{ "username", "userItemId" }` |
| `POST /api/game/ai-dialogs` | 助手预设问答列表 | — |
| `POST /api/game/ai-chat` | 助手问答（按触发词匹配本地预设） | `{ "username", "message" }` |

统一返回：`{ "code": 200/400, "message": "...", "data": {...} }`。
> 说明：本项目为演示用途，未引入鉴权框架，接口通过 `username` 定位玩家（前端会话存于 `localStorage`）。
> 离线版的「AI 助手」是本地预设问答（`AI_DIALOGS`），不调用任何大模型接口，无网络也能用。

---

## 初始化数据库（可选 / MySQL 模式）

```bash
mysql -uroot -p123456 < sql/spongebob_db.sql
```

脚本创建 `spongebob_db` 库、`user` / `item` / `user_item` 三张表，并写入示例账号与商店目录。

## 前端打包

```bash
npm run build              # 产物在 dist/（普通静态站点）
npm run build:standalone   # 额外生成单文件离线版，可双击直接玩
```

---

## 项目结构

```
├── index.html
├── package.json
├── vite.config.js            # Vite 配置（IIFE 打包，便于 file:// 直接打开）
├── build-standalone.mjs      # 把 dist 内联成单文件离线版
├── start.bat / start.sh      # 一键打开离线版（Windows / macOS·Linux）
├── dev.bat                   # 开发服务器（Vite，无需后端）
├── spongebob-offline.html    # ★ 构建产物：双击即玩，零外部依赖
├── sql/spongebob_db.sql      # MySQL 初始化脚本（可选）
├── src/                      # 前端源码
│   ├── main.js / App.vue
│   ├── api/
│   │   ├── {auth,game,http}.js  # 接口封装 + 本地/后端双通道
│   │   └── localEngine.js       # ★ 离线本地游戏引擎（localStorage 存档）
│   ├── data/items.js            # 商店商品目录（与 SQL 保持一致）
│   ├── store/
│   │   ├── session.js           # 登录会话
│   │   └── aiAssistant.js       # 助手状态（离线问答）
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
│       ├── AiAssistant.vue     # 海绵宝宝助手（右下角悬浮，离线可用）
│       ├── SpongeBob.vue / PatrickStar.vue
│       ├── LoginCard.vue / RegisterCard.vue
│       └── ToastMessage.vue
└── backend/                  # Spring Boot 后端（可选，可正常编译启动）
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
