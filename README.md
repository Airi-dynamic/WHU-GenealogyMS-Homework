# 寻根溯源 — 族谱管理系统

数据库课程实验项目。基于 Next.js 16 + PostgreSQL 18 + Prisma 7 构建的多用户家族族谱管理系统。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Next.js 16（App Router） | 前后端一体，单服务 |
| 数据库 | PostgreSQL 18 | 递归CTE、COPY导入导出 |
| ORM | Prisma 7 + `@prisma/adapter-pg` | 基础CRUD用ORM，复杂SQL用 `$queryRaw` |
| 认证 | NextAuth.js v5 | JWT Session，注册制 |
| UI | Tailwind CSS v4 + 手写组件 | Button/Card/Modal/Badge等 |
| 可视化 | Apache ECharts | 树形图（祖先/后代）、亲缘路径图 |
| 脚本 | TypeScript + `tsx` | 数据生成、CSV导出 |

---

## 一、项目启动

### 前置要求

- Node.js >= 20
- PostgreSQL 18（已通过安装包安装，服务需运行）

### 1. 启动 PostgreSQL 服务

```bash
# 切换到 postgres 系统用户后启动（macOS 安装包方式）
su - postgres -c "/Library/PostgreSQL/18/bin/pg_ctl start -D /Library/PostgreSQL/18/data"
# 或通过系统服务/launchctl 启动：
sudo launchctl load /Library/LaunchDaemons/com.edb.launchd.postgresql-18.plist
```

### 2. 创建数据库

```bash
/Library/PostgreSQL/18/bin/psql -U postgres
# 在 psql 提示符中执行：
CREATE DATABASE genealogyms;
\q
```

### 3. 确认 `.env` 配置

```
DATABASE_URL="postgresql://postgres:你的密码@localhost:5432/genealogyms?schema=public"
AUTH_SECRET="genealogy-ms-super-secret-key-2026"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. 安装依赖 & 迁移数据库

```bash
cd /Users/arielle/Desktop/GenealogyMS
npm install
npm run db:migrate      # 创建所有数据表
```

### 5. 生成测试数据

```bash
npm run db:seed         # 约需 3–10 分钟，生成 10 万+ 成员
```

生成结果：
- 3 个测试账号：`admin` / `alice` / `bob`，密码均为 `password123`
- 10 个族谱，其中**张氏宗谱 50,000+ 成员**
- 系统总成员数 **100,000+**，每个族谱至少 **30 代**传承

### 6. 启动应用

```bash
npm run dev             # 访问 http://localhost:3000
```

---

## 二、NPM 命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式启动（http://localhost:3000） |
| `npm run build` | 生产构建 |
| `npm run db:migrate` | 执行数据库迁移（建表） |
| `npm run db:seed` | 生成10万+测试数据 |
| `npm run db:studio` | 打开 Prisma Studio（可视化数据库） |
| `npm run db:export <成员ID>` | 将某成员的后代分支导出为 CSV |

---

## 三、实验验收逐步操作指南

> **演示前提：** PostgreSQL 服务已启动，`npm run db:seed` 已完成，`npm run dev` 正在运行。

### ✅ 验收项 1：用户登录与注册

1. 访问 `http://localhost:3000`，自动跳转登录页
2. 演示**注册**：点击"立即注册"，填写用户名/邮箱/密码，注册成功后跳转登录页
3. 演示**登录**：使用 `admin` / `password123` 登录，进入 Dashboard
4. 演示**权限隔离**：切换 `alice` 账号登录，可见族谱列表与 `admin` 不同

---

### ✅ 验收项 2：Dashboard 统计看板

登录后进入 `/dashboard`，展示：
- 当前用户可访问的族谱总数
- 全部成员数、男性/女性数量
- 性别比例条形图
- 族谱概览表（含角色标记：创建者/协作者）

---

### ✅ 验收项 3：族谱管理 CRUD

进入 `/genealogies`：
1. **创建**：点击"新建族谱"，填写谱名/姓氏/修谱年份
2. **查看**：点击任意族谱卡片进入详情页
3. **删除**：鼠标悬停在卡片上，点击右上角垃圾桶图标

---

### ✅ 验收项 4：邀请协作者

在族谱详情页 → "邀请协作"：
1. 搜索用户名（如 `alice`），点击"邀请"
2. 切换 `alice` 账号登录，可在族谱列表看到该族谱（角色为"协作者"）

---

### ✅ 验收项 5：成员管理 CRUD + 模糊搜索

进入任意族谱 → "成员管理"：
1. **搜索**：在搜索框输入部分姓名（如"张伟"），点击搜索，演示 `ILIKE` 模糊匹配
2. **添加**：点击"添加成员"，填写姓名/性别/出生年/辈分/父母ID（可选）
3. **编辑**：点击铅笔图标修改成员信息
4. **删除**：点击垃圾桶图标删除成员
5. **获取成员ID**（演示其他功能的前提）：
   - 在成员行的 ID 列，点击 **复制图标（📋）** 直接复制完整 ID 到剪贴板
   - 或点击 **ID卡片图标（🪪）** 弹窗展示完整 ID，支持全选复制

---

### ✅ 验收项 6：树形预览

进入族谱 → "树形预览"：
1. 从成员管理页复制任意成员 ID
2. 粘贴到 ID 输入框
3. 选择方向：**向下（后代）** 或 **向上（祖先）**
4. 点击"查询"，ECharts 渲染树形层级图
5. 树图支持**鼠标缩放、拖拽、节点展开/收起**

---

### ✅ 验收项 7：人物祖先查询（递归 CTE）

进入族谱 → "人物祖先查询"：
1. 复制一个**有父母记录**的成员 ID（建议选第3代以上）
2. 粘贴 ID，点击"查询祖先"
3. 展示：
   - **ECharts 树状图**（从本人向上展开祖先树，方向 BT）
   - **缩进列表**（层级缩进文字版，含代数和出生年）
4. 对应 SQL（`WITH RECURSIVE ancestors AS...`）见 `docs/sql-queries.md` 第2节

---

### ✅ 验收项 8：亲缘关系通路查询（BFS）

进入族谱 → "亲缘通路查询"：
1. 复制**两个不同成员**的 ID，分别粘贴到 A、B 输入框
2. 点击"查询亲缘"
3. **有通路**时：展示圆形节点路径图，标注步数
4. **无通路**时：显示"两人之间不存在亲缘关系通路"

---

### ✅ 验收项 9：SQL 功能演示（数据库层验收）

以下 SQL 均可在 Prisma Studio（`npm run db:studio`）或 psql 中执行，也可通过前端触发：

| 需求 | 文件位置 | 触发方式 |
|------|---------|---------|
| 配偶及子女查询 | `lib/queries/statistics.ts` | 成员详情 API |
| 递归祖先 CTE | `lib/queries/ancestors.ts` | 祖先查询页 |
| 平均寿命最长辈分 | `lib/queries/statistics.ts` | `/api/genealogies/[id]/analysis?type=longestGeneration` |
| 50岁以上无配偶男性 | `lib/queries/statistics.ts` | `/api/genealogies/[id]/analysis?type=oldUnmarriedMales` |
| 早于辈分均值出生者 | `lib/queries/statistics.ts` | `/api/genealogies/[id]/analysis?type=earlyBirthByGeneration` |

---

### ✅ 验收项 10：数据导入导出

**导出某成员后代分支为 CSV：**
```bash
# 复制一个成员 ID 后执行：
npm run db:export <成员ID>
# 生成文件：scripts/branch_xxxxxxxx.csv
```

**PostgreSQL COPY 批量导入演示（在 psql 中执行）：**
```sql
-- seed 脚本已生成示例 CSV：scripts/members_export.csv
\COPY members (id, genealogy_id, name, gender, birth_year, death_year, bio, generation)
FROM 'scripts/members_export.csv' CSV HEADER;
```

**完整数据库备份：**
```bash
/Library/PostgreSQL/18/bin/pg_dump -U postgres genealogyms > backup_genealogyms.sql
```

---

### ✅ 验收项 11：索引与性能对比

详见 `docs/index-performance.md`。在 psql 中执行：

```sql
-- 1. 先安装 pg_trgm 扩展（模糊查询索引）
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_members_name_trgm ON members USING GIN (name gin_trgm_ops);
CREATE INDEX idx_parent_child_parent_id ON parent_child (parent_id);

-- 2. 对比有无索引时四代查询的执行计划
EXPLAIN ANALYZE
WITH
  gen1 AS (SELECT child_id AS id FROM parent_child WHERE parent_id = '<始祖ID>'),
  gen2 AS (SELECT pc.child_id AS id FROM parent_child pc JOIN gen1 ON pc.parent_id = gen1.id),
  gen3 AS (SELECT pc.child_id AS id FROM parent_child pc JOIN gen2 ON pc.parent_id = gen2.id),
  gen4 AS (SELECT pc.child_id AS id FROM parent_child pc JOIN gen3 ON pc.parent_id = gen3.id)
SELECT m.* FROM members m JOIN gen4 ON m.id = gen4.id;
```

---

## 四、项目文件结构

```
GenealogyMS/
├── app/
│   ├── (auth)/login、register       # 登录/注册页
│   ├── (main)/
│   │   ├── dashboard/               # 统计看板
│   │   └── genealogies/[id]/
│   │       ├── members/             # 成员管理（含ID复制功能）
│   │       ├── tree/                # 树形预览
│   │       ├── ancestor/            # 祖先查询
│   │       ├── relation/            # 亲缘通路查询
│   │       └── invite/              # 邀请协作者
│   └── api/                         # REST API（13个端点）
├── components/
│   ├── ui/                          # Button/Card/Input/Modal/Badge/Sidebar
│   ├── tree/echarts-tree.tsx        # ECharts 树形图组件
│   └── forms/member-form.tsx        # 成员添加/编辑表单
├── lib/
│   ├── db.ts                        # Prisma Client 单例
│   ├── auth.ts                      # NextAuth 配置
│   ├── tree-builder.ts              # 扁平节点→树结构转换
│   └── queries/
│       ├── ancestors.ts             # 递归CTE（WITH RECURSIVE）
│       ├── relationship.ts          # 亲缘邻接图 + BFS
│       └── statistics.ts           # 统计分析SQL（5个查询）
├── prisma/schema.prisma             # 6张表的数据模型
├── scripts/
│   ├── seed.ts                      # 数据生成（100k+成员）
│   └── export-branch.ts            # 后代分支CSV导出
└── docs/
    ├── ER-diagram.md                # ER图（Mermaid）
    ├── schema-normalization.md      # 3NF/BCNF分析
    ├── sql-queries.md               # 所有SQL语句汇总
    └── index-performance.md        # 索引性能对比说明
```

---

## 五、迁移至其他设备的完整指南

本节说明如何将项目（含数据库全部数据）完整迁移到另一台电脑上运行。

### 第一部分：在**源设备**（当前电脑）打包

#### 步骤 1：导出数据库

```bash
# 导出为 SQL 文件（包含表结构 + 全部数据）
/Library/PostgreSQL/18/bin/pg_dump -U postgres -F p -f genealogyms_backup.sql genealogyms
# 输入密码：040604
# 生成文件：genealogyms_backup.sql（可能几十到几百 MB）
```

> `-F p` 表示纯文本 SQL 格式，目标设备用 `psql` 即可还原，无需版本完全一致。

#### 步骤 2：打包项目代码

```bash
cd /Users/arielle/Desktop

# 打包项目目录（排除 node_modules 和 .next 构建缓存，体积小很多）
zip -r GenealogyMS_export.zip GenealogyMS \
  --exclude "GenealogyMS/node_modules/*" \
  --exclude "GenealogyMS/.next/*" \
  --exclude "GenealogyMS/tsconfig.tsbuildinfo"

# 将数据库备份也放进去
cp GenealogyMS/genealogyms_backup.sql GenealogyMS_export.zip  # 或单独传输
```

最终需要传输的文件：
- `GenealogyMS_export.zip`（项目代码，约几 MB）
- `genealogyms_backup.sql`（数据库，含全部数据）

---

### 第二部分：在**目标设备**还原运行

#### 步骤 1：安装前置依赖

| 依赖 | 版本要求 | 下载地址 |
|------|---------|---------|
| Node.js | >= 20 | https://nodejs.org |
| PostgreSQL | 建议 16 或 18 | https://www.postgresql.org/download/ |

安装 PostgreSQL 时记住设置的 `postgres` 用户密码。

#### 步骤 2：解压项目

```bash
unzip GenealogyMS_export.zip -d ~/Desktop/
cd ~/Desktop/GenealogyMS
```

#### 步骤 3：创建数据库并还原数据

```bash
# 先创建空数据库
psql -U postgres -c "CREATE DATABASE genealogyms;"
# 还原全部数据（表结构 + 数据一步完成，无需再跑 migrate）
psql -U postgres genealogyms < genealogyms_backup.sql
# 输入密码，等待完成（数据量大时需几分钟）
```

> 如果目标设备 psql 不在 PATH，使用完整路径：
> - macOS 安装包：`/Library/PostgreSQL/18/bin/psql`
> - Homebrew：`/opt/homebrew/bin/psql`
> - Windows：`"C:\Program Files\PostgreSQL\18\bin\psql.exe"`

#### 步骤 4：修改 `.env` 为目标设备的数据库密码

打开 `GenealogyMS/.env`，将密码改为目标设备 PostgreSQL 的密码：

```
DATABASE_URL="postgresql://postgres:目标设备的密码@localhost:5432/genealogyms?schema=public"
AUTH_SECRET="genealogy-ms-super-secret-key-2026"
NEXTAUTH_URL="http://localhost:3000"
```

#### 步骤 5：安装依赖并生成 Prisma 客户端

```bash
cd ~/Desktop/GenealogyMS
npm install
npx prisma generate     # 重新生成 Prisma Client（适配当前平台）
```

> **不需要**再执行 `npm run db:migrate` 或 `npm run db:seed`——数据库已通过 SQL 还原完整。

#### 步骤 6：启动应用

```bash
npm run dev
# 访问 http://localhost:3000
# 使用账号 admin / password123 登录
```

---

### 常见问题

**Q：目标设备 PostgreSQL 版本不同（如 16 vs 18）会有问题吗？**
只要目标版本 >= 12（支持递归 CTE），通常没有问题。pg_dump 的纯文本格式向前兼容。

**Q：还原时报 `role "postgres" does not exist`？**
目标设备的超级用户名可能不是 `postgres`（Homebrew 安装默认用系统用户名）。两种解决方式：
```bash
# 方式A：创建 postgres 角色
psql -U 你的用户名 -c "CREATE ROLE postgres SUPERUSER LOGIN PASSWORD '新密码';"

# 方式B：还原时替换用户名
sed 's/Owner: postgres/Owner: 你的用户名/g' genealogyms_backup.sql | psql -U 你的用户名 genealogyms
```

**Q：`npm run dev` 报 `Cannot find module` 错误？**
```bash
rm -rf node_modules .next
npm install
npm run dev
```

**Q：Windows 系统如何操作？**
将所有 shell 命令中的路径改为 Windows 格式，在 PowerShell 或 CMD 中执行：
```powershell
# 导出（源设备）
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -F p -f genealogyms_backup.sql genealogyms

# 还原（目标设备）
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE genealogyms;"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres genealogyms < genealogyms_backup.sql
```

---

## 六、验收材料清单

| 材料 | 位置/方式 |
|------|---------|
| ER 图 | `docs/ER-diagram.md` |
| 关系模式 + 3NF 分析 | `docs/schema-normalization.md` |
| 全部 SQL 语句 | `docs/sql-queries.md` |
| 索引说明 + EXPLAIN | `docs/index-performance.md` |
| 数据生成脚本源码 | `scripts/seed.ts` |
| 数据库导出文件 | `pg_dump -U postgres genealogyms > backup.sql` |
| RDBMS 名称版本 | PostgreSQL 18.4 |
| 图形界面演示 | `npm run dev` → `http://localhost:3000` |
