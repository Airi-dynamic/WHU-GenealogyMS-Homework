# 项目理解指南 6 — 数据工程与 SQL 汇总 【开发者甲】

## 0. 前言

本章是最后一章，也是数据库实验报告中技术含量最高的部分。主要内容：

1. **数据生成脚本**（`scripts/seed.ts`）：如何用代码批量生成 10 万+条有意义的家族数据
2. **统计 SQL 查询**（`lib/queries/statistics.ts`）：5 个展示 SQL 聚合能力的复杂查询
3. **索引优化**：哪些字段需要索引，索引对查询速度有多大影响
4. **CSV 导入导出**：使用 PostgreSQL `COPY` 命令进行大规模数据转移

这些全部由开发者甲负责。

---

## 1. 本章目标

### 1.1 功能目标
- 能够一键生成 10 万+条测试数据（10 个族谱，30+代传承）
- 能查询指定成员的配偶和子女
- 能统计各代平均寿命
- 能找出年龄超过 50 岁且未婚的男性
- 能找出出生年份早于本代平均出生年的成员
- 能展示索引对查询速度的量化影响

### 1.2 工程目标（开发者甲）
- 编写 `scripts/seed.ts`（数据生成）
- 编写 `lib/queries/statistics.ts`（5 个统计 SQL）
- 在 `app/api/genealogies/[id]/analysis/route.ts` 暴露统计接口

---

## 2. 先运行起来

```bash
# 生成测试数据（约需 5-15 分钟）
npm run db:seed

# 运行完成后，查看 Prisma Studio 确认数据
npm run db:studio
# 在 Member 表中应能看到 10 万+条记录

# 或直接登录系统，进入任意族谱查看成员数量
npm run dev
```

---

## 3. 文件结构

```
scripts/
├── seed.ts           ← 数据生成主脚本  【甲】
└── export-branch.ts  ← 导出成员后代为 CSV  【甲】

lib/queries/
└── statistics.ts     ← 5 个统计分析 SQL  【甲】

app/api/genealogies/[id]/
└── analysis/route.ts ← 统计分析接口  【甲】

docs/
├── sql-queries.md          ← 所有 SQL 汇总
└── index-performance.md    ← 索引性能分析报告
```

---

## 4. 基础知识铺垫

### 4.1 什么是「批量插入」（Bulk Insert）

单条插入非常慢：每条 INSERT 语句都需要建立事务、执行、提交，10 万次就是 10 万次往返。

「批量插入」把多条数据合并成一条 INSERT，大幅减少数据库往返次数：

```sql
-- 慢（单条）：
INSERT INTO members VALUES (...)
INSERT INTO members VALUES (...)
...重复 10 万次

-- 快（批量）：
INSERT INTO members VALUES (...), (...), (...), ... -- 一次插入 500 条
```

Prisma 的 `createMany` 就是批量插入。本脚本每批 500 条：

```typescript
const BATCH = 500;
for (let i = 0; i < batchData.length; i += BATCH) {
  const slice = batchData.slice(i, i + BATCH);
  await prisma.member.createMany({ data: slice.map(d => d.member) });
}
```

### 4.2 什么是 SQL 聚合函数

聚合函数对一组行计算出单一值：

| 函数 | 含义 | 示例 |
|------|------|------|
| `COUNT(*)` | 计数 | `COUNT(*)` 统计总行数 |
| `AVG(col)` | 平均值 | `AVG(death_year - birth_year)` 平均寿命 |
| `MAX(col)` | 最大值 | `MAX(birth_year)` 最晚出生的 |
| `MIN(col)` | 最小值 | |
| `SUM(col)` | 求和 | |
| `ROUND(val, n)` | 四舍五入 | `ROUND(AVG(...), 1)` 保留1位小数 |

`COUNT(*) FILTER (WHERE 条件)` 是 PostgreSQL 的过滤聚合：只统计满足条件的行：

```sql
COUNT(*) FILTER (WHERE gender = 'M')  -- 统计男性数量
COUNT(*) FILTER (WHERE gender = 'F')  -- 统计女性数量
```

等价于：
```sql
SUM(CASE WHEN gender = 'M' THEN 1 ELSE 0 END)
```

但 `FILTER` 更简洁易读。

### 4.3 什么是 `GROUP BY`

`GROUP BY` 按某个字段的值分组，配合聚合函数，分别对每组计算统计值。

```sql
-- 按辈分（generation）分组，计算每代的平均寿命
SELECT
  generation,
  AVG(death_year - birth_year) AS avg_lifespan
FROM members
WHERE death_year IS NOT NULL AND birth_year IS NOT NULL
GROUP BY generation
ORDER BY avg_lifespan DESC;
```

不加 `GROUP BY` 就是统计全表。加了 `GROUP BY generation` 就是「每代各自统计」。

### 4.4 什么是子查询（Subquery）

子查询就是在一个 SQL 里嵌套另一个 SQL，内层的结果供外层使用：

```sql
-- 查找没有配偶的男性
WHERE m.id NOT IN (
  SELECT member1_id FROM marriages
  UNION
  SELECT member2_id FROM marriages
)
```

`NOT IN (子查询)` 意思是「m.id 不在婚姻表的任何一边」，即没有婚姻记录。

### 4.5 什么是索引（Index）

索引是数据库维护的一种额外数据结构，就像书的目录，能让查找特定值变得非常快。

没有索引时：数据库必须扫描整张表（全表扫描），复杂度 O(n)。

有索引时：数据库通过索引树直接定位到目标行，复杂度 O(log n)。

**B-Tree 索引**（最常用）：适合精确查找、范围查找、排序。PostgreSQL 默认的索引类型。

```sql
CREATE INDEX idx_members_genealogy_id ON members (genealogy_id);
-- 让 WHERE genealogy_id = '...' 的查询极快
```

**GIN + Trigram 索引**（模糊搜索专用）：普通 B-Tree 索引不支持 `ILIKE '%关键词%'` 查询（通配符在开头时索引失效）。`pg_trgm` 扩展把字符串拆成三字符组（trigram），建 GIN（倒排索引），使模糊查询也能走索引。

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_members_name_trgm ON members USING GIN (name gin_trgm_ops);
-- 让 WHERE name ILIKE '%张%' 的查询快很多
```

### 4.6 什么是 `EXPLAIN ANALYZE`

`EXPLAIN ANALYZE` 是 PostgreSQL 的查询计划分析工具，在 SQL 前加上它，数据库会真正执行查询并返回详细的执行计划：

```sql
EXPLAIN ANALYZE SELECT * FROM members WHERE genealogy_id = 'xxx';
```

输出示例：
```
Index Scan using idx_members_genealogy_id on members  (cost=0.43..5.23 rows=20)
  -> actual time=0.012..0.456 rows=18 loops=1
Planning time: 0.213 ms
Execution time: 0.534 ms
```

关键信息：
- `Index Scan`：走了索引（好）vs `Seq Scan`：全表扫描（慢）
- `Execution time`：实际执行时间
- 有无索引的时间对比能直观展示优化效果

### 4.7 什么是 PostgreSQL `COPY` 命令

`COPY` 是 PostgreSQL 的大规模数据导入/导出命令，比 INSERT 快几十倍。

```sql
-- 从 CSV 导入（PostgreSQL 服务器端文件路径）
COPY members(id, genealogy_id, name, gender, birth_year, death_year, bio, generation)
FROM '/path/to/members.csv'
CSV HEADER;

-- 导出到 CSV
COPY (SELECT * FROM members WHERE genealogy_id = 'xxx')
TO '/path/to/export.csv'
CSV HEADER;
```

本项目的 `scripts/seed.ts` 生成成员 CSV 文件，展示 `COPY` 导入的用法（实验验收用）。

---

## 5. 逐步代码讲解

### 5.1 步骤 1：`scripts/seed.ts` — 数据生成脚本 【开发者甲】

#### A. 动机

课程实验要求数据库有大量数据（10 万+）以展示查询性能。手动输入不现实，需要用脚本自动生成符合家族结构逻辑的数据：每代人从上一代中繁衍，有亲子关系，男性成员有配偶（婚姻关系）。

#### B. 核心算法：层级扩展

```
第1代：始祖夫妇（张老太爷 + 妻）
         ↓ 生育 2-5 个孩子
第2代：张二代1、张二代2、张二代3...
         ↓ 男性配偶，生育子女
第3代：张三代1、张三代2...
         ↓ ...
第N代：直到总人数 >= targetSize
```

#### C. 脚本关键代码解析

*文件 `scripts/seed.ts`（核心逻辑）：*

```typescript
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { writeFileSync } from "fs";

// 独立脚本需要自己初始化 PrismaClient（而非用 lib/db.ts 的单例）
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

// 常量：中文姓名库
const SURNAMES = ["张", "王", "李", "赵", "陈", "刘", "杨", "黄", "周", "吴"];
const MALE_NAMES = ["伟", "芳", "娜", "秀英", "敏", "静", "丽", "强", "磊", "军", ...];
const FEMALE_NAMES = ["梅", "兰", "菊", "荷", "云", "雪", "月", "珍", "莹", "燕", ...];

// 辅助函数
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function genName(gender: "M" | "F", surname: string): string {
  const given = gender === "M" ? randElem(MALE_NAMES) : randElem(FEMALE_NAMES);
  return surname + given;
}

async function seedGenealogy(genealogyId, surname, targetSize, minGenerations, csvRows) {
  // 第1代：始祖夫妇
  const gen1Father = await prisma.member.create({ data: {
    genealogyId, name: genName("M", surname),
    gender: "M", birthYear: 1000, deathYear: 1070, generation: 1,
  }});
  const gen1Mother = await prisma.member.create({ data: {
    genealogyId, name: genName("F", surname),
    gender: "F", birthYear: 1005, deathYear: 1075, generation: 1,
  }});
  await prisma.marriage.create({
    data: { member1Id: gen1Father.id, member2Id: gen1Mother.id, marriageYear: 1020 },
  });

  let prevGenIds = [{ fatherId: gen1Father.id, motherId: gen1Mother.id }];
  let totalCreated = 2;
  let generation = 1;

  while (totalCreated < targetSize) {
    generation++;
    const batchData = [];

    // 每对父母生 2-5 个孩子
    for (const { fatherId, motherId } of prevGenIds) {
      const childCount = randInt(2, 5);
      const birthBase = 1000 + generation * 25;  // 每代相差约25年
      for (let i = 0; i < childCount; i++) {
        if (totalCreated + batchData.length >= targetSize) break;
        const gender = Math.random() < 0.5 ? "M" : "F";
        const birthYear = birthBase + randInt(-5, 5);
        batchData.push({
          member: { genealogyId, name: genName(gender, surname),
                    gender, birthYear, deathYear: birthYear + randInt(50, 85), generation },
          fatherId, motherId,
        });
      }
    }

    // 批量插入（每批500条）
    const BATCH = 500;
    const createdIds = [];
    for (let i = 0; i < batchData.length; i += BATCH) {
      const slice = batchData.slice(i, i + BATCH);
      await prisma.member.createMany({ data: slice.map(d => d.member), skipDuplicates: true });
      // 批量查回插入的 ID（Prisma createMany 不返回 id）
      const inserted = await prisma.member.findMany({
        where: { genealogyId, generation, name: { in: slice.map(d => d.member.name) } },
        select: { id: true, name: true },
      });
      inserted.forEach(m => createdIds.push(m.id));
    }

    // 建立亲子关系
    await prisma.parentChild.createMany({
      data: batchData.slice(0, createdIds.length).flatMap((d, idx) => [
        { parentId: d.fatherId, childId: createdIds[idx] },
        { parentId: d.motherId, childId: createdIds[idx] },
      ]),
      skipDuplicates: true,
    });

    // 男性成员配偶（生成新的女性成员并创建婚姻关系）
    const maleIds = createdIds.filter((_, i) => batchData[i]?.member.gender === "M");
    // ... 批量创建配偶和婚姻记录 ...

    totalCreated += createdIds.length;
    if (generation % 5 === 0) {
      console.log(`  第 ${generation} 代完成，累计已创建 ${totalCreated} 人`);
    }
  }
}
```

#### D. 脚本的关键设计决策

**为什么脚本需要自己初始化 `PrismaClient`？**

```typescript
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);
```

`lib/db.ts` 里的单例是为 Next.js 服务器环境设计的（防止热重载时创建多个连接）。脚本是独立运行的 Node.js 进程，不存在热重载问题，直接 `new PrismaClient` 就行，但仍然需要提供 `adapter`（Prisma 7 的要求）。

**为什么 `createMany` 后还要 `findMany` 查回来？**

```typescript
await prisma.member.createMany({ data: slice });
// Prisma createMany 只返回 { count: 500 }，不返回插入的 id
const inserted = await prisma.member.findMany({
  where: { genealogyId, generation, name: { in: names } },
  select: { id: true },
});
```

Prisma 的 `createMany` 出于性能考虑，不返回插入的 id（因为生成 id 需要额外查询）。但建立亲子关系需要知道刚插入的成员 id，所以必须额外查一次。这是 Prisma 的一个常见限制。

**出生年份设计**：

```typescript
const birthBase = 1000 + generation * 25;  // 第1代=1025，第2代=1050...
const birthYear = birthBase + randInt(-5, 5);  // ±5年随机偏差
```

假设每代约 25 年，第 30 代约是公元 1750 年，第 40 代约是公元 2000 年，符合真实历史感。

---

### 5.2 步骤 2：`lib/queries/statistics.ts` — 5 个统计 SQL 【开发者甲】

#### A. 完整代码

*文件 `lib/queries/statistics.ts`：*

```typescript
import { prisma } from "../db";

/**
 * SQL 需求1: 给定成员 ID，查询其配偶及所有子女
 */
export async function getSpouseAndChildren(memberId: string) {
  // 查配偶：在 marriages 表里，找另一侧的成员
  const spouses = await prisma.$queryRaw`
    SELECT m.id, m.name, m.gender, m.birth_year AS "birthYear"
    FROM members m
    WHERE m.id IN (
      SELECT CASE
        WHEN member1_id = ${memberId} THEN member2_id
        ELSE member1_id
      END
      FROM marriages
      WHERE member1_id = ${memberId} OR member2_id = ${memberId}
    )
  `;

  // 查子女：在 parent_child 表里，找 parent_id = memberId 的所有 child
  const children = await prisma.$queryRaw`
    SELECT m.id, m.name, m.gender, m.birth_year AS "birthYear"
    FROM members m
    JOIN parent_child pc ON pc.child_id = m.id
    WHERE pc.parent_id = ${memberId}
    ORDER BY m.birth_year NULLS LAST
  `;

  return { spouses, children };
}

/**
 * SQL 需求3: 统计族谱中平均寿命最长的辈分
 * 仅统计有完整生卒年的成员
 */
export async function getLongestLivingGeneration(genealogyId: string) {
  return prisma.$queryRaw`
    SELECT
      generation,
      ROUND(AVG(death_year - birth_year), 1)::float AS "avgLifespan",
      COUNT(*)::int                                   AS "memberCount"
    FROM members
    WHERE genealogy_id = ${genealogyId}
      AND generation  IS NOT NULL
      AND birth_year  IS NOT NULL
      AND death_year  IS NOT NULL
    GROUP BY generation
    ORDER BY "avgLifespan" DESC
    LIMIT 10
  `;
}

/**
 * SQL 需求4: 查询年龄超过50岁且没有配偶的男性成员
 */
export async function getOldUnmarriedMales(genealogyId: string) {
  const currentYear = new Date().getFullYear();
  return prisma.$queryRaw`
    SELECT
      m.id,
      m.name,
      m.birth_year                         AS "birthYear",
      (${currentYear} - m.birth_year)::int AS age
    FROM members m
    WHERE m.genealogy_id = ${genealogyId}
      AND m.gender       = 'M'
      AND m.birth_year   IS NOT NULL
      AND (${currentYear} - m.birth_year) > 50
      AND m.id NOT IN (
        SELECT member1_id FROM marriages
        UNION
        SELECT member2_id FROM marriages
      )
    ORDER BY age DESC
  `;
}

/**
 * SQL 需求5: 找出出生年份早于该辈分平均出生年份的所有成员
 * 技术点：CTE（公共表表达式）+ JOIN
 */
export async function getMembersEarlierThanGenerationAvg(genealogyId: string) {
  return prisma.$queryRaw`
    WITH gen_avg AS (
      SELECT
        generation,
        AVG(birth_year)::float AS avg_birth
      FROM members
      WHERE genealogy_id = ${genealogyId}
        AND generation IS NOT NULL
        AND birth_year  IS NOT NULL
      GROUP BY generation
    )
    SELECT
      m.id,
      m.name,
      m.generation,
      m.birth_year             AS "birthYear",
      ROUND(ga.avg_birth)::int AS "generationAvgBirth"
    FROM members m
    JOIN gen_avg ga ON ga.generation = m.generation
    WHERE m.genealogy_id = ${genealogyId}
      AND m.birth_year   IS NOT NULL
      AND m.birth_year   < ga.avg_birth
    ORDER BY m.generation, m.birth_year
  `;
}

/**
 * Dashboard 统计: 总人数、男女比例
 */
export async function getGenealogyStats(genealogyId: string) {
  const result = await prisma.$queryRaw<{ total: number; males: number; females: number }[]>`
    SELECT
      COUNT(*)::int                                      AS total,
      COUNT(*) FILTER (WHERE gender = 'M')::int          AS males,
      COUNT(*) FILTER (WHERE gender = 'F')::int          AS females
    FROM members
    WHERE genealogy_id = ${genealogyId}
  `;
  return result[0] ?? { total: 0, males: 0, females: 0 };
}
```

#### B. 5 个 SQL 逐一解析

**SQL 1：查配偶和子女**

配偶查询最巧妙，用了 `CASE WHEN` 表达式：

```sql
SELECT CASE
  WHEN member1_id = '我' THEN member2_id  -- 如果我是 member1，配偶是 member2
  ELSE member1_id                          -- 如果我是 member2，配偶是 member1
END
FROM marriages
WHERE member1_id = '我' OR member2_id = '我'
```

因为婚姻表存的是 `(member1_id, member2_id)`，不确定我在哪一列，所以用 `CASE` 取另一列的值。

**SQL 3：各代平均寿命**

```sql
GROUP BY generation
ORDER BY "avgLifespan" DESC
LIMIT 10
```

按辈分分组，计算平均寿命（`death_year - birth_year`），按平均寿命降序排列，取前10代。

**SQL 4：年龄超过50岁且未婚男性**

```sql
AND m.id NOT IN (
  SELECT member1_id FROM marriages
  UNION
  SELECT member2_id FROM marriages
)
```

`NOT IN` 子查询找出所有出现在婚姻表（任意一列）的成员 ID，然后排除掉它们。`UNION` 去重（而非 `UNION ALL`）。

**SQL 5：早于本代平均出生年的成员（CTE 用法）**

```sql
WITH gen_avg AS (
  SELECT generation, AVG(birth_year)::float AS avg_birth
  FROM members
  WHERE ...
  GROUP BY generation
)
SELECT m.*, ROUND(ga.avg_birth)::int AS "generationAvgBirth"
FROM members m
JOIN gen_avg ga ON ga.generation = m.generation
WHERE m.birth_year < ga.avg_birth
```

先用 CTE 计算每代的平均出生年，再 JOIN 回 members 表，筛选出「比本代平均早出生的人」。

---

### 5.3 步骤 3：索引设计与性能验证 【开发者甲】

#### A. 项目中已定义的索引（`schema.prisma`）

```prisma
model Member {
  ...
  @@index([genealogyId])   ← 按族谱查成员（最频繁的查询）
  @@index([name])          ← 按姓名查找（支持精确查找）
}

model ParentChild {
  ...
  @@index([parentId])      ← 通过父节点找所有子女（递归 CTE 每轮都要用）
  @@index([childId])       ← 通过子节点找父母
}

model Marriage {
  ...
  @@index([member1Id])     ← 按成员查婚姻记录
  @@index([member2Id])
}
```

#### B. 模糊搜索专用索引（需要手动建）

`schema.prisma` 里的普通 `@@index([name])` 对 `ILIKE '%关键词%'` 无效（通配符在开头时 B-Tree 索引失效）。需要手动建 `pg_trgm` 扩展的 GIN 索引：

```sql
-- 在 psql 或 Prisma Studio 里执行（或写在迁移文件里）
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_members_name_trgm ON members USING GIN (name gin_trgm_ops);
```

验证索引是否生效：

```sql
-- 运行 EXPLAIN ANALYZE，看是否显示 "Bitmap Index Scan" 或 "Index Scan"
EXPLAIN ANALYZE
SELECT * FROM members WHERE name ILIKE '%张%' AND genealogy_id = 'xxx';

-- 有索引时输出包含：
-- "Bitmap Index Scan on idx_members_name_trgm"
-- Execution time: ~5ms

-- 无索引时输出包含：
-- "Seq Scan on members"
-- Execution time: ~500ms（全表扫描 10 万条）
```

#### C. 性能对比实验方法

```sql
-- 方法一：删除索引，对比执行时间
DROP INDEX IF EXISTS idx_parent_child_parent_id;

EXPLAIN ANALYZE
WITH
  gen1 AS (SELECT child_id AS id FROM parent_child WHERE parent_id = '<祖先ID>'),
  gen2 AS (SELECT pc.child_id AS id FROM parent_child pc JOIN gen1 ON pc.parent_id = gen1.id),
  gen3 AS (SELECT pc.child_id AS id FROM parent_child pc JOIN gen2 ON pc.parent_id = gen2.id),
  gen4 AS (SELECT pc.child_id AS id FROM parent_child pc JOIN gen3 ON pc.parent_id = gen3.id)
SELECT m.* FROM members m JOIN gen4 ON m.id = gen4.id;
-- 无索引：Seq Scan，几百毫秒

-- 方法二：重建索引后对比
CREATE INDEX idx_parent_child_parent_id ON parent_child (parent_id);
-- 同样的查询：Index Scan，几毫秒
```

这个实验在答辩时是非常好的演示点：「加了索引，四代查询从 800ms 降到 12ms」。

---

## 6. 端到端走查：执行数据生成脚本

```
执行 npm run db:seed（即 npx tsx scripts/seed.ts）
           │
           ▼
Node.js 加载 seed.ts
  → import "dotenv/config"（读 .env）
  → 初始化 PrismaClient（带 PrismaPg 适配器）
           │
           ▼
main() 函数执行：
  1. 创建 3 个测试用户（bcrypt 哈希密码）
  2. 创建 10 个族谱（一大一小分配不同规模）
  3. 对每个族谱调用 seedGenealogy()
           │
           ▼
seedGenealogy() 循环：
  第1代：insert 始祖夫妇 + marriage
  第2代：insert 子女批量 + parentChild批量 + 配偶 + marriage批量
  第3代：...
  ...
  第N代：总数 >= targetSize 且 generation >= minGenerations，停止
           │
           ▼
脚本结束前：
  writeFileSync("members_export.csv", csvRows.join("\n"))
  输出 COPY 命令提示
           │
           ▼
数据库中：约 10 万+ 条成员记录，正确的亲子和婚姻关系网络
```

---

## 7. 所有 SQL 技术点汇总

用于答辩时的完整 SQL 能力清单：

| 技术点 | 对应功能 | 所在文件 |
|--------|---------|---------|
| `WITH RECURSIVE` 递归 CTE | 祖先查询、后代查询 | `lib/queries/ancestors.ts` |
| `UNION`（多表合并） | 亲缘关系邻接图 | `lib/queries/relationship.ts` |
| `GROUP BY` + `AVG` | 各代平均寿命统计 | `lib/queries/statistics.ts` |
| `COUNT(*) FILTER (WHERE ...)` | 男女数量统计 | `lib/queries/statistics.ts` |
| `CASE WHEN ... THEN ... END` | 配偶查询（双向婚姻表） | `lib/queries/statistics.ts` |
| `NOT IN (子查询)` | 未婚男性查询 | `lib/queries/statistics.ts` |
| `WITH` 普通 CTE + `JOIN` | 早于本代平均出生年 | `lib/queries/statistics.ts` |
| `ILIKE '%关键词%'` | 姓名模糊搜索 | `app/api/members/route.ts` |
| `LIMIT` + `OFFSET` | 分页查询 | `app/api/members/route.ts` |
| `CREATE INDEX` B-Tree | 外键字段快速查找 | `schema.prisma` 中 `@@index` |
| `CREATE INDEX` GIN+trgm | 模糊搜索索引 | `docs/index-performance.md` |
| `EXPLAIN ANALYZE` | 查询计划分析 | `docs/index-performance.md` |
| `COPY` 命令 | 大规模数据导入导出 | `scripts/seed.ts` / `docs/` |
| `INSERT ... createMany` | 批量插入（10万条） | `scripts/seed.ts` |

---

## 8. 本章小结

| 概念 | 一句话记忆 |
|------|-----------|
| `createMany` | Prisma 批量插入，比单条快很多 |
| `GROUP BY` + `AVG` | 分组统计，每组各自计算平均值 |
| `FILTER (WHERE ...)` | PostgreSQL 过滤聚合，只统计满足条件的行 |
| `NOT IN (子查询)` | 排除某个集合中的值 |
| CTE `WITH gen_avg AS (...)` | 先计算中间结果，再在主查询中使用 |
| B-Tree 索引 | 精确查找、范围查找加速（外键字段） |
| GIN+Trigram 索引 | 模糊搜索（`ILIKE '%关键词%'`）加速 |
| `EXPLAIN ANALYZE` | 查看查询是否走了索引，测量执行时间 |
| `COPY` 命令 | 大规模数据的快速导入导出 |

---

## 附：项目运行命令速查

| 命令 | 作用 |
|------|------|
| `npm run dev` | 启动开发服务器（localhost:3000） |
| `npm run db:migrate` | 执行数据库迁移（创建/更新表结构） |
| `npm run db:generate` | 重新生成 Prisma 客户端类型 |
| `npm run db:studio` | 打开 Prisma Studio 图形化数据库管理界面 |
| `npm run db:seed` | 运行数据生成脚本（生成 10 万+测试数据） |
| `npm run db:export` | 运行导出脚本（生成 CSV 文件） |
| `npm run build` | 构建生产版本 |

---

至此，「寻根溯源族谱管理系统」的 6 份项目理解指南全部完成。你已经从整体架构（指南1）→ 数据库设计（指南2）→ 用户认证（指南3）→ 族谱成员管理（指南4）→ 树形可视化与查询算法（指南5）→ 数据工程与 SQL 汇总（指南6），完整地理解了这个系统的每一个角落。
