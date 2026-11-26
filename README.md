# 仙钓大陆 — 修仙主题登录 + 第一人称沉浸式钓鱼

修仙风格的全栈项目：仙山 / 明月 / 祥云 / 灵湖背景、纯 CSS 绘制的修仙者（登录页）与道童（注册页）。登入仙门后进入 **第一人称灵湖钓场**，握住鱼竿、看漂、提竿、与洪荒巨物拉扯，用「金币」升级装备、淬炼根骨，挑战 **十万斤、百万斤** 的山海异兽。

> 主题说明：全站统一为 **修仙 · 仙钓大陆** 风格——登录 / 注册页为仙门山门（叩仙门、登仙），主页为仙山灵湖钓场，并内置「钓道境界」与「钓鱼功法」系统，详见下方对应章节。

## 玩法亮点

- **第一人称沉浸式搏鱼**：满屏灵湖海景 + 前景鱼竿 + 鱼线浮漂；抛竿 → 等待 → 咬钩提竿 → 按住收线 / 松手泄力。
- **真实拉扯感**：鱼线有张力条，张力过高会「啪」地挣断鱼线；鱼每 1~2 秒挣扎一次，重量越大、品级越高，拉扯越猛。
- **暴走机制**：收线到 ~78% 时，越重越稀有的灵鱼越可能 **暴走**，暴走时张力飙升、屏幕震动，且更容易 **挣断鱼竿**（鱼竿会真的损毁）。
- **重量 & 品质**：每条灵鱼有独立重量（斤）与品级，越重越稀有价值越高；金币按「品级 × 重量」结算。
- **神话 / 山海异种**：鲲、烛龙、九尾狐、白泽、凤凰、麒麟，以及鲲鹏、饕餮、穷奇、相柳、玄武、应龙、巴蛇、陵鱼、帝江、狰。
- **根骨系统**：根骨越高，收线越稳、能抗衡的鱼越重；根骨用 **金币** 升级，钓到越稀有越重的灵鱼，金币给得越多。
- **力量成长**：力量即自身重量上限；每次**成功**钓起重量**超过当前上限 10%** 的鱼，力量按当前值 **+10%**（100 → 110 → 121……，复合增长）。
- **顶级渔具**：**螺纹钢航母阻拦索**（十万斤内绝不挣断，可钓百万斤巨物）、深渊海神竿等。
- **五大写实钓场**：灵湖 / 北原 / 极北之地 / 深渊 / 蓬莱，切换钓场整页画面随之变化，各有专属鱼与现身概率。
- **钓鱼功法阁**：顶栏「功法」进入，用金币修炼静心诀 / 观水诀 / 引灵诀等 8 部功法，被动加成真实作用于搏鱼手感与收益（在线 / 离线均生效）。
- **每日签到**：主页右下角礼物按钮，连签奖励递增，第 7 天额外 +500 金币，断签重置。
- **水族箱湖景**：钓到过的灵鱼会游进灵湖，收集越多湖里越热闹；图鉴收录 40 种（含 10 种地图专属鱼）。
- **钓道成就**：顶栏「成就」进入，14 条里程碑（图鉴 / 重量 / 功法 / 修为 / 签到 / 财富 / 徽章 / 游历），进度实时派生、荣誉值自动累计，无需领取。
- **钓鱼协会**：任务 / 100 人比赛 / 1~9 星认证徽章；**AI 仙童** 游戏内答疑。
- **移动端适配**：顶栏导航横向滚动，主界面 / 商店 / 协会 / 成就 / 签到面板均适配窄屏，手机可一起玩。

## 技术栈

| 端 | 技术 |
| --- | --- |
| 前端 | Vue 3 + Vite + Vue Router |
| 运行形态 | **在线浏览（HTTP 站点，局域网内任意设备可访问）** |
| 离线引擎 | 浏览器内本地游戏引擎（`localStorage` 存档），后端不可用时自动降级 |
| 后端 | Spring Boot 3 + MyBatis-Plus + BCrypt（绑定 `0.0.0.0:8080`，局域网可达） |
| 数据库 | MySQL 8 / H2 内存库 |
| 分发（可选） | 单文件 HTML（JS / CSS / 数据全内联，零外部请求） |

---

## 局域网地址（唯一配置点）

前端、后端、代理、脚本里的 IP / 端口都取自 **`src/config/lan.js`**，换 IP 只改这一个文件：

| 项 | 当前值 |
| --- | --- |
| 局域网 IP | `192.168.68.68` |
| 前端在线站点 | `http://192.168.68.68:8081` |
| 前端开发服务器 | `http://192.168.68.68:5173` |
| 后端 API | `http://192.168.68.68:8080` |
| 后端健康检查 | `http://192.168.68.68:8080/api/health` |
| H2 控制台（h2 profile） | `http://192.168.68.68:8080/h2-console` |

## 一键启动（在线浏览，局域网可访问）

**局域网内任何设备（手机 / 平板 / 其它电脑）打开同一个地址就能一起玩，数据存后端共享。**

| 系统 | 操作 |
| --- | --- |
| Windows（推荐） | 双击 `start-all.bat`：起后端 + 起网页服务 + 自检 + 打开浏览器 |
| Windows（只要前端） | 双击 `start.bat`：构建 → 起网页服务 → 打开浏览器 |
| Linux / macOS | `chmod +x start.sh` 后运行 `./start.sh` |
| 只起后端 | 双击 `start-backend.bat`（Spring Boot + H2，自带示例数据） |

启动后：

- 本机访问 `http://localhost:8081`，局域网访问 `http://192.168.68.68:8081`
- 前端的 `/api` 请求由网页服务反向代理到 `http://192.168.68.68:8080`，浏览器侧同源，**不涉及跨域**
- **后端没启动也不影响打开**：页面会先探测 `/api/health`，探测不到就自动降级到浏览器内本地引擎（`localStorage` 存档）
- 默认账号：`spongebob` / `123456`（后端 H2 与本地引擎都预置；本地引擎另有 20.02 万金币）

**连通性自检**：`npm run check`（或 `node check-lan.mjs`）会打印四项检查结果——本机是否真的持有配置里的 IP、后端 8080、前端 8081、`/api` 代理是否打通，失败时直接给出处理建议。别的设备连不上时先跑它。

**新功能验证**：`node verify-features.mjs` 会经局域网地址实测地图目录、选图持久化、协会 10 任务（含山海 / 神话）、真人在线报名与 100 人匹配赛道，共 17 项。

## 开发模式（需要 Node.js）

```bash
npm install      # 仅首次需要网络
npm run dev      # 本机 http://localhost:5173 ／ 局域网 http://192.168.68.68:5173
```

开发服务器已绑定 `0.0.0.0` 并把 `/api` 代理到 `http://192.168.68.68:8080`，所以：

- 后端在跑 → 页面走真实后端（在线）
- 后端没跑 → 自动降级到本地引擎，照样能调试
- 想强制指定模式：`?api=server` / `?api=local`（会记到 `localStorage`，`localStorage.removeItem('bikini_api_mode')` 恢复自动）

## 在线站点（构建产物 + 局域网服务）

```bash
npm run online    # 等价于 npm run build + node serve-lan.mjs
npm run serve     # 用已有 dist 直接起服务
```

- 服务监听 `0.0.0.0:8081`，局域网访问 `http://192.168.68.68:8081`
- `/api` 由该服务反向代理到 `http://192.168.68.68:8080`（同源，无需 CORS）
- 换端口：`node serve-lan.mjs --port 8082`
- 也支持 `npm run preview`（Vite 预览，`0.0.0.0:4173`，同样带 `/api` 代理）

## 后端：Spring Boot（在线模式的服务端）

后端目录 `backend/` 是完整的 Spring Boot 3 工程（Controller / Service / Mapper / DTO / H2 脚本齐全），
使用 H2 内存库，**无需安装 MySQL**，无需单独装 Maven（项目自带 `mvnw` / `mvnw.cmd` 即 Maven Wrapper，首次运行会自动下载并缓存 Maven 到 `~/.m2/wrapper/dists`）。

```bash
# Windows：双击 start-backend.bat
# 命令行：
cd backend
unset SERVER__PORT              # Windows: set SERVER__PORT=
mvnw -Dspring-boot.run.profiles=h2 spring-boot:run
```

- 后端地址 `http://192.168.68.68:8080`，已绑定 `0.0.0.0`，局域网可达
- 连通性自检：浏览器打开 `http://192.168.68.68:8080/api/health`，返回 `code: 200` 即正常
- H2 控制台：`http://192.168.68.68:8080/h2-console`（已开启 `web-allow-others`，局域网可访问）
- 跨域：`CorsConfig` 用 `allowedOriginPatterns` 放行 `192.168.*.*` / `10.*.*.*` / `172.*.*.*` / `localhost` 的任意端口
- 前端连后端无需配置：开发服务器与在线站点都自带 `/api` 代理；直连后端时前端会自己拼 `http://192.168.68.68:8080`
- **MySQL 持久化模式（推荐，数据落库、多设备共享）**：
  ```bash
  # 1) 初始化一次（root/123456，只建 spongebob_db，不影响其它库）
  mysql -uroot -p123456 < sql/spongebob_db.sql
  # 2) Windows 双击 start-backend-mysql.bat；或命令行：
  cd backend && java -jar target/spongebob-backend-1.0.0.jar --server.port=8080
  ```
  默认数据源 `127.0.0.1:3306/spongebob_db`（root/123456）。若后端跑在别的机器上连本机 MySQL，
  用环境变量 `MYSQL_URL` 覆盖即可，例如 `MYSQL_URL=jdbc:mysql://192.168.68.68:3306/spongebob_db`，
  并需在 MySQL 里给 root 授权该来源 IP。
- H2 内存库模式：`start-backend.bat`（无 MySQL 时兜底，重启数据清空）
- 商店目录 / 爆率配置（`catch_rate` 表）/ AI 预设问答（`ai_dialog` 表）在 H2 与 MySQL 两套初始化脚本里都已写入
- 后端没启动时前端自动降级到本地引擎，两套模式的接口契约一致



---

## 钓鱼流程

1. **抛竿**：点击「抛竿钓鱼」，消耗 1 个鱼饵，引擎根据你的钓竿 / 鱼线承重生成一条咬钩的灵鱼。
2. **等待咬钩**：浮漂会上下浮动；出现「咬钩了！」时必须在 2.2 秒内点「提竿」，否则脱钩。
3. **搏鱼**：
   - **按住收线**：进度上升，但张力也上升；
   - **松开泄力**：张力快速回落，进度轻微回退；
   - 张力进入绿色**安全区**时收线更快；
   - 张力满 100% → 鱼线被挣断（失败）。
4. **暴走**：进度约 78% 时，越重越稀有的灵鱼越可能暴走，张力与挣扎大幅增强，此时绷断更可能 **拽断鱼竿**。
5. **结算**：成功则按「品级 × 重量」获得金币；失败则空手而归（鱼饵已消耗）。

## 灵鱼图鉴与重量

| 品级 | 重量范围 | 代表灵鱼 |
| --- | --- | --- |
| 普通 | 0.5 ~ 8 斤 | 小丑鱼、热带鱼、河豚、沙丁鱼、鲭鱼 |
| 稀有 | 15 ~ 300 斤 | 章鱼、鱿鱼、帝王蟹、巨型石斑、电鳗 |
| 传说 | 300 ~ 8000 斤 | 深海龙鱼、独角鲸、黄金海马、大王乌贼、幽灵鲨 |
| 神话 | 5000 ~ 12 万斤 | 鲲、烛龙、九尾狐、白泽、凤凰、麒麟 |
| 山海 | 2 万 ~ 100 万斤 | 鲲鹏、饕餮、穷奇、相柳、玄武、应龙、巴蛇、陵鱼、帝江、狰 |

> 能遇到多大的灵鱼，取决于你装备的 **最大可钓重量**；鱼线承重决定超过多少斤后极易被挣断。

## 经济系统

- **金币 🪙**：购买装备 / 鱼饵。钓获按 `品级系数 × (10 + 3 × 重量^0.75)` 结算。
- **金币 🪙**：唯一货币，买装备与升级根骨通用。钓获按 `品级系数 × 重量` 结算，越稀有越重给得越多。
- **根骨 💪**：初始 10，每次修炼 +5，消耗 `20 + 当前根骨 × 2` 金币；根骨越高，收线速度更快、可抗衡的鱼越重。

## 钓道境界（修仙境界系统）

主页为 **仙钓大陆** 修仙风格（仙山 / 明月 / 祥云 / 灵湖），
「根骨境界」演进为 **钓道境界**，共 10 档称号，由 `powerRealm`（1–999）映射：

| powerRealm | 称号 |
| --- | --- |
| 1 | 垂钓凡夫 |
| 2 | 初窥钓道 |
| 3 | 灵饵师 |
| 4 | 御竿王 |
| 5 | 渊主 |
| 6 | 钓鱼大师 |
| 7 | 钓仙 |
| 8 | 钓鱼圣人 |
| 9 | 钓天境 |
| 10+ | 无敌之境（满级 999 重天） |

- 突破消耗金币按 `2^(境界-1)` 翻倍（最高 999 重天），每重天钓鱼收益 **+5%**。
- 修炼「无钩钓法」功法后，突破消耗 **-15%**（见下）。

## 钓鱼功法（功法阁）

顶栏「功法」入口（`/skills`）打开 **功法阁**，可用 **金币** 修炼 8 种钓鱼功法（取材自真实钓鱼口诀与「钓道修仙」类设定），
修炼后获得被动加成，真实作用于搏鱼手感与金币收益（目录定义在 `src/api/game.js` 对接的 `/api/game/skills`，
离线引擎 `localEngine.js` 与后端 `GameService` 同构生效）：

| 功法 | 消耗(金币) | 效果 |
| --- | --- | --- |
| 静心诀 | 30 | 搏鱼张力上升 -15% |
| 卸力诀 | 50 | 收线速度 +18% |
| 观水诀 | 40 | 稀有及以上灵鱼概率显著提升 |
| 四季钓经 | 35 | 咬钩等待时间 -25% |
| 引灵诀 | 80 | 钓鱼收益 +20% |
| 潮汐真诀 | 45 | 提竿命中窗口 +0.6 秒 |
| 无钩钓法 | 60 | 境界突破消耗 -15% |
| 钓道真解 | 120 | 全能小幅提升（张力 -8% / 收线 +8% / 收益 +8%） |

## 每日签到

主页右下角礼物按钮打开签到面板，每天可签一次：

- 奖励递增：第 n 天 = `100 + (n-1)×50` 金币，**第 7 天**额外 +500（里程碑）；
- 连续签到中途断签则连签天数重置为 1，累计签到天数只增不减；
- 面板展示固定 7 日奖励预览，红点提示今日未签；签到金币实时入账并刷新顶栏余额。
- 接口：`GET /api/signin/info?username=`、`POST /api/signin/do { username }`（在线 / 离线同构）。
- 回归测试：`node feature_smoke_test.mjs`（覆盖功法与签到，24 项）。

## 商店目录

| id | 名称 | 类型 | 价格(🪙) | 钓力 | 鱼线承重 | 最大可钓 |
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
| `/` | 仙门登录页（修仙主题） | 已登录则跳 `/home` |
| `/register` | 叩仙门注册页（修仙主题，无需邮箱） | 已登录则跳 `/home` |
| `/home` | 第一人称灵湖钓场 | 需登录 |
| `/assoc` | 钓鱼协会（任务 / 比赛 / 认证徽章） | 需登录 |
| `/codex` | 灵鱼图鉴（40 种，含地图专属） | 需登录 |
| `/skills` | 钓道功法阁（修炼 8 部功法） | 需登录 |
| `/achievements` | 钓道成就（14 条里程碑 / 荣誉值） | 需登录 |
| `/shop` | 渔具商店 | 需登录 |
| `/inventory` | 我的背包 | 需登录 |
| `/admin` | 后台登录页 | — |
| `/admin/home` | 后台控制台（爆率 / 货币 / 密码） | 需管理员会话 |
| `/admin/users` | 后台用户管理（查看 / 编辑 / 重置密码 / 删除 / 新建） | 需管理员会话 |

## 接口约定（后端与本地引擎同构）

前端所有 `/api/*` 请求由 `src/api/http.js` 分发：

- **在线后端**（默认）：页面经 HTTP 打开 → 先探测 `/api/health` → 通则全部请求打到后端（`http://192.168.68.68:8080`），数据落库、多设备共享
- **本地引擎**（降级）：后端探测失败，或显式 `?api=local` → 由 `src/api/localEngine.js` 在浏览器内处理，存档在 `localStorage`

两种通道的请求 / 返回结构与下表完全一致，所以页面代码在两者之间可以无缝切换。

| 接口 | 说明 | 请求体 / 参数 |
| --- | --- | --- |
| `GET  /api/health` | 后端健康检查（前端自动模式用来判断在线/降级） | — |
| `POST /api/auth/register` | 注册（无需邮箱） | `{ "username", "password" }`（`email` 可选，留空自动按道号生成占位邮箱） |
| `POST /api/auth/login` | 登录 | `{ "username", "password" }` |
| `GET  /api/game/me?username=` | 玩家档案（含背包、金币、根骨、装备） | query: username |
| `POST /api/game/cast` | 抛竿，生成咬钩的灵鱼与搏鱼参数 | `{ "username" }` |
| `POST /api/game/settle` | 搏鱼结算（成功入账 / 断线断竿） | `{ "username", "encounterId", "landed", "breakType" }` |
| `POST /api/game/train` | 金币淬炼根骨（+5） | `{ "username" }` |
| `POST /api/game/realm-up` | 金币突破钓道境界 | `{ "username" }` |
| `GET/POST /api/game/skills` | 钓鱼功法目录（8 种，两种方法一并支持） | — |
| `POST /api/game/cultivate` | 修炼钓鱼功法（消耗金币解锁被动） | `{ "username", "skillId" }` |
| `GET  /api/signin/info` | 每日签到状态（连签 / 累计 / 7 日预览） | query: username |
| `POST /api/signin/do` | 执行每日签到（发金币，重复签到拦截） | `{ "username" }` |
| `GET  /api/shop/items` | 商店目录 | — |
| `POST /api/shop/buy` | 购买道具 | `{ "username", "itemId", "quantity" }` |
| `POST /api/game/equip` | 装备钓竿 / 鱼线 | `{ "username", "userItemId" }` |
| `POST /api/game/ai-dialogs` | 助手预设问答列表 | — |
| `POST /api/game/ai-chat` | 助手问答（按触发词匹配本地预设） | `{ "username", "message" }` |
| `GET  /api/assoc/info` | 钓鱼协会主页（任务 / 徽章 / 比赛战况） | query: username |
| `POST /api/assoc/task-claim` | 领取协会任务奖励 | `{ "username", "taskId" }` |
| `POST /api/assoc/comp-start` | 在线报名钓鱼比赛（1 分钟匹配，不足 100 人由人机补齐） | `{ "username" }` |
| `POST /api/assoc/comp-state` | 比赛实时战况（匹配到期自动开赛、1 小时到期自动结算发奖） | `{ "username" }` |
| `GET  /api/game/maps` | 地图目录（专属鱼概率 / 建议力量 / 重量系数） | — |
| `POST /api/game/set-map` | 切换当前钓场（持久化到 `current_map`） | `{ "username", "mapId" }` |
| `GET  /api/admin/users` | 后台用户列表（关键词 / 角色 / 分页） | query: keyword, permission, page, pageSize |
| `GET  /api/admin/users/detail` | 用户详情 | query: id |
| `POST /api/admin/users` | 后台新建用户 | `{ "username", "email", "password", "permission", "shells", "strength", "goldStones", "powerRealm" }` |
| `POST /api/admin/users/update` | 编辑用户（仅更新传入字段） | `{ "id", "email", "shells", "strength", "goldStones", "powerRealm", "permission" }` |
| `POST /api/admin/users/delete` | 删除用户 | `{ "id" }` |
| `POST /api/admin/users/reset-password` | 重置用户密码 | `{ "id", "newPassword" }` |

统一返回：`{ "code": 200/400, "message": "...", "data": {...} }`。
> 说明：本项目为演示用途，未引入鉴权框架，接口通过 `username` 定位玩家（前端会话存于 `localStorage`）。
> 「AI 助手」是预设问答（后端 `ai_dialog` 表 / 本地引擎 `AI_DIALOGS`），不调用任何大模型接口。
> 后台登录已按模式自适应：在线模式走 `/api/auth/login` 校验并判断 `permission === 0`，
> 本地模式 / 后端不可达时退回本地引擎的管理员校验（预置 `admin` / `admin123`）。
> 后台用户管理接口（`/api/admin/*`）由后台「用户管理」页面调用，两种模式契约一致。
> 后端 `user` 表新增 `permission` 字段（0=管理员，1=普通玩家）；若已有 MySQL 库，请先执行
> `ALTER TABLE user ADD COLUMN permission INT NOT NULL DEFAULT 1;` 再启动后端。
> 另新增 `skills` 字段（已修炼功法 id 列表，逗号分隔）：`ALTER TABLE user ADD COLUMN skills VARCHAR(255);`
> 钓鱼协会再新增两列（历史最重单尾 / 认证徽章星级）：
> `ALTER TABLE user ADD COLUMN max_caught_weight INT NOT NULL DEFAULT 0;`
> `ALTER TABLE user ADD COLUMN assoc_badge INT NOT NULL DEFAULT 0;`
> 每日签到新增三列：`ALTER TABLE user ADD COLUMN last_sign_date VARCHAR(10);`、
> `ALTER TABLE user ADD COLUMN sign_streak INT NOT NULL DEFAULT 0;`、
> `ALTER TABLE user ADD COLUMN sign_total INT NOT NULL DEFAULT 0;`。
> H2 内存库（`schema-h2.sql`）已同步加列，无需手动迁移；上述 MySQL 列已在本机库中执行完毕。

### 在线模式与本地引擎的已知差异

| 项 | 在线（后端） | 本地引擎 |
| --- | --- | --- |
| 数据存储 | MySQL（默认）/ H2（兜底），多设备共享 | 各浏览器自己的 `localStorage` |
| 力量与修为 | 基础力量 `strength` + 修为% ，总力量 = `strength × (1+修为%)`；钓起超上限 10% 的鱼时基础力量与修为各随机 +1~50 | 同构：基础力量 `power` + 修为%，总力量 = `power × (1+修为%)`，成长规则一致 |
| 功法 / 签到 / 选图 / 鱼饵 | 功法被动、每日签到、选图持久化、指定鱼饵（`baitId`）全部生效 | 同构：功法 / 签到 / 选图 / 指定鱼饵行为与后端一致 |
| 普通鱼抽取算法 | 先按品级权重抽品级，再按品级区间定重量（观水诀提权） | 重量围绕力量倍数分布，再由重量定品级（观水诀上浮倍数）——最终品级分布接近，但单尾结果会有差异 |
| 钓道境界 | 后端保留 999 重天境界系统（每重 +5% 收益，无钩诀 -15% 消耗） | 离线引擎无境界（成长走力量 + 修为），档案无该字段 |
| 钓鱼比赛 | 真人在线报名进入同一场匹配池，不足 100 人由人机补齐；比赛状态在后端内存中，重启重置 | 同一局里模拟报名与匹配，可完整跑完 1 分钟匹配 + 1 小时比赛（测试脚本会快进时间） |

> 说明：普通鱼抽取算法两端模型不同（品级优先 vs 重量优先），因此同一账号在线 / 离线的单尾结果不会完全一致，
> 但装备、鱼饵、地图、功法、修为等各项加成均已对齐，正常游玩体验无差异。


---

## 钓鱼协会（任务 / 比赛 / 认证徽章）

主页右下角「🏆 协会」按钮（或顶栏「协会」）进入钓鱼协会，三大玩法：

- **协会任务**：协会**不定时**发布任务，**每波一次 10 条**，其中**至少 1 条山海鱼任务、3 条神话鱼任务**，
  其余 6 条按品级权重随机（普通鱼常见、山海鱼稀有）；任务 20~40 分钟有效，两波间隔 5~15 分钟随机。
  钓起指定鱼即可领金币奖励。
- **钓鱼比赛（100 人对战）**：
  1. 报名后先进行 **1 分钟匹配**——只有**真人在线报名**才会进入对阵名单；
  2. 真人不足 100 人时，**暂时由人机补齐**，凑满 100 人后自动开赛；比赛期间再报名会登记到下一场；
  3. 正式比赛时长 **1 个小时**，期间钓起的每条鱼重量累计比总重，比赛页面每 3 秒刷新战况；
  4. **凡报名参赛都有保底奖励 100 万金币**；真人榜名次额外奖励（或对应档位奖励）：
     🥇 **1 亿** / 🥈 **5000 万** / 🥉 **1000 万**（前三名）、
     **4~10 名 500 万**、**11~30 名 300 万** 金币。
- **认证徽章**：协会专属徽章共 **1~9 星**，「单独钓起一只」≥ 门槛重量的灵鱼即可认证：

| 星级 | 门槛（单尾） | 星级 | 门槛（单尾） |
| --- | --- | --- | --- |
| 1 星 | 1,000 斤 | 6 星 | 100 万斤 |
| 2 星 | 5,000 斤 | 7 星 | 200 万斤 |
| 3 星 | 20,000 斤 | 8 星 | 500 万斤 |
| 4 星 | 100,000 斤 | 9 星 | 1,000 万斤 |
| 5 星 | 500,000 斤 | — | — |

> 徽章依据「历史最重单尾钓获」评定，钓起更重的鱼自动升级；离线与后端模式规则一致。
>
> 协会功能回归测试：`node assoc_smoke_test.mjs`（Node 直跑本地引擎，覆盖 10 任务发布、1 分钟匹配 → 100 人 → 1 小时结算保底、徽章全流程）。
> 引擎全链路回归测试：`node engine_smoke_test.mjs`（注册登录、抛竿结算、力量成长、地图、商店背包、后台用户管理、AI 助手）。
> 经济回归测试：`node coin_smoke_test.mjs`（单一货币 / 旧存档迁移）；爆率回归：`node odds_smoke_test.mjs`。
> 新系统回归测试：`node feature_smoke_test.mjs`（功法阁 + 每日签到，24 项）、`node achievement_smoke_test.mjs`（成就，18 项）。
> 新功能端到端验证：`node verify-features.mjs`（经 `192.168.68.68:8081` 代理实测后端地图、选图持久化、10 任务、真人报名匹配）。

---

## 初始化数据库（可选 / MySQL 模式）

```bash
mysql -uroot -p123456 < sql/spongebob_db.sql
```

脚本创建 `spongebob_db` 库、`user` / `item` / `user_item` 三张表，并写入示例账号与商店目录。

## 前端打包 / 在线部署

```bash
npm run build              # 产物在 dist/（普通静态站点，配合 npm run serve 对外提供）
npm run online             # 构建 + 起局域网服务（推荐）
```

## 局域网常见问题

| 现象 | 处理 |
| --- | --- |
| 其它设备打不开 `http://192.168.68.68:8081` | Windows 防火墙放行 Node / 8081、8080 端口（首次运行会弹窗，选「允许专用网络」） |
| 页面能开但一直提示连不上后端 | 确认后端在跑：浏览器打开 `http://192.168.68.68:8080/api/health` 应返回 200 |
| 后端在跑，前端却进了本地存档 | 浏览器里可能留了 `bikini_api_mode=local`，执行 `localStorage.removeItem('bikini_api_mode')` 后刷新 |
| 端口被占用 | 网页服务：`node serve-lan.mjs --port 8082`；后端：`application.yml` 里改 `server.port` |
| 本机 IP 变了（换 WiFi / DHCP） | 只改 `src/config/lan.js` 的 `LAN_IP`，然后重启服务与后端、重新 `npm run build` |

---

## 项目结构

```
├── index.html
├── package.json
├── vite.config.js            # Vite 配置（0.0.0.0 监听 + /api 代理到局域网后端）
├── serve-lan.mjs             # ★ 在线浏览：零依赖静态服务 + /api 反向代理（0.0.0.0:8081）
├── check-lan.mjs             # ★ 局域网连通性自检（npm run check）
├── verify-features.mjs       # ★ 新功能端到端验证（地图 / 10 任务 / 100 人比赛报名）
├── feature_smoke_test.mjs    # ★ 新系统回归（功法阁 + 每日签到）
├── achievement_smoke_test.mjs # ★ 成就系统回归
├── start-all.bat             # 一键：后端 + 前端 + 自检 + 打开浏览器
├── start.bat / start.sh      # 一键构建并启动在线站点（局域网可访问）
├── start-backend.bat         # 一键启动 Spring Boot 后端（H2 profile，0.0.0.0:8080）
├── dev.bat                   # 开发服务器（Vite HMR，局域网可访问）
├── .env.example              # 可选：直连后端时使用 VITE_API_BASE
├── sql/spongebob_db.sql      # MySQL 初始化脚本（可选）
├── src/                      # 前端源码
│   ├── main.js / App.vue
│   ├── config/lan.js            # ★ 局域网 IP / 端口唯一配置点
│   ├── api/
│   │   ├── {auth,game,http}.js  # 接口封装 + 在线后端 / 本地引擎双通道（自动探测降级）
│   │   └── localEngine.js       # 离线本地游戏引擎（localStorage 存档）
│   ├── data/items.js            # 商店商品目录（与 SQL 保持一致）
│   ├── data/sky.js              # ★ 天时灵汐：十二时辰 × 五天象（确定性天气与倍率）
│   ├── data/fortune.js          # ★ 仙缘奇遇：抛竿约 22% 触发的临时机缘
│   ├── data/feature.js          # ★ 洞天福地：灵池 / 悬赏令 / 本命法宝状态与加成
│   ├── api/featureApi.js        # ★ 洞天状态存取（/api/feature/*）
│   ├── store/
│   │   ├── session.js           # 登录会话
│   │   └── aiAssistant.js       # 助手状态（离线问答）
│   ├── router/index.js
│   ├── assets/main.css
│   ├── views/
│   │   ├── LoginView.vue / RegisterView.vue   # 仙门山门（修仙主题背景）
│   │   ├── HomeView.vue        # 第一人称沉浸式钓鱼（张力 / 暴走 / 断线断竿）
│   │   ├── ShopView.vue        # 商店（钓竿 / 鱼线 / 鱼饵 / 幸运物）
│   │   ├── InventoryView.vue   # 背包（装备钓竿与鱼线）
│   │   ├── SkillsView.vue      # ★ 钓道功法阁（8 部功法）
│   │   ├── AchievementsView.vue# ★ 钓道成就（14 条里程碑 / 荣誉值）
│   │   ├── LeaderboardView.vue # ★ 仙钓天榜（财富 / 巨物 / 图鉴 / 综合 / 勤修）
│   │   ├── PondView.vue        # ★ 洞天福地（本命法宝淬炼 / 灵池 / 战绩）
│   │   └── QuestsView.vue      # ★ 每日悬赏令
│   └── components/
│       ├── ImmortalBackground.vue  # 修仙主题背景（仙山 / 明月 / 祥云 / 灵湖）
│       ├── OceanBackground.vue
│       ├── TopBar.vue          # 顶栏（金币 / 根骨 / 九宫格导航）
│       ├── Cultivator.vue      # 纯 CSS 绘制的修仙者 / 道童
│       ├── AiAssistant.vue     # 钓鱼助手（右下角悬浮，离线可用）
│       ├── SignInDialog.vue    # ★ 每日签到面板（右下角礼物按钮）
│       ├── LoginCard.vue / RegisterCard.vue
│       └── ToastMessage.vue
└── backend/                  # Spring Boot 后端（绑定 0.0.0.0:8080，局域网可达）
    ├── pom.xml
    ├── mvnw / mvnw.cmd       # Maven Wrapper（首次运行自动下载 Maven）
    └── src/main/
        ├── resources/
        │   ├── application.yml        # 默认 MySQL 数据源
        │   ├── application-h2.yml     # h2 profile：H2 内存库
        │   ├── schema-h2.sql / data-h2.sql
        └── java/com/bikinibottom/
            ├── controller/{Auth,Game,Shop,Feature}Controller.java
            ├── service/{User,Game,Feature}Service.java   # 灵鱼池 / 搏鱼 / 金币 / 洞天
            ├── config/GameMaps.java      # ★ 钓场地图目录（后端同构）
            ├── util/{SkyUtil,FortuneUtil}.java  # ★ 天时 / 奇遇（与前端同构）
            └── mapper/ · entity/ · dto/ · config/ · common/
```

> **补全说明**：早期提交只更新了 `HomeView.vue` / `localEngine.js` / `router` 等调用方，却漏提交了它们依赖的
> 「天时灵汐 / 仙缘奇遇 / 洞天福地」模块与页面文件，导致前端无法编译、后端缺 `GameMaps` 类。
> 本次已补齐上述全部文件，并完成在线 / 离线双通道的同构实现；`assoc_smoke_test.mjs` 的硬编码
> `D:/workSpace` 路径也已改为相对路径。数据库新增 `user.feature` 列（见 `sql/migrate_feature.sql`，
> H2 脚本已内置）。
