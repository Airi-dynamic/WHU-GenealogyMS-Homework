# SQL 执行结果截图操作指南

本指南说明如何逐步在 psql 中执行所有 SQL 语句并截图，用于填入实验报告第八节。

---

## 前置条件

确保以下操作已完成：
1. PostgreSQL 18 服务正在运行
2. 已执行 `npm run db:migrate`（数据库表已创建）
3. 已执行 `npm run db:seed`（100,000+ 测试数据已生成）

---

## 第一步：获取必要的 ID

在执行 SQL 截图前，需要从系统中获取两种 ID：**族谱 ID** 和 **成员 ID**。

### 1.1 获取族谱 ID（GENEALOGY_ID）

**方法 A（推荐）：从 psql 直接查询**

打开终端，执行：
```bash
psql -U postgres -d genealogyms
```

连接成功后执行：
```sql
SELECT id, name, surname FROM genealogies ORDER BY created_at LIMIT 5;
```
复制其中一个 `id` 的值，这就是你的 `GENEALOGY_ID`。

**建议选择名称含「张」的大型族谱**（seed 脚本生成了一个 50,000+ 成员的张氏族谱，统计效果最好）。

### 1.2 获取 成员 ID（TARGET_ID 和 ANCESTOR_ID）

连接好 psql 后执行（把 `'你的GENEALOGY_ID'` 替换为上一步得到的值）：

```sql
-- 查找第1代始祖（作为 ANCESTOR_ID，用于四代曾孙查询）
SELECT id, name, gender, birth_year, generation
FROM members
WHERE genealogy_id = 'cmpdy4wee00031op1tn23k2yz'
  AND generation = 1
LIMIT 5;
```

复制第1代男性始祖的 `id`，用作 `ANCESTOR_ID`。

```sql
-- 查找有子女的成员（作为 TARGET_ID，用于配偶子女查询）
SELECT DISTINCT pc.parent_id AS id, m.name, m.gender
FROM parent_child pc
JOIN members m ON m.id = pc.parent_id
WHERE m.genealogy_id = 'cmpdy4wee00031op1tn23k2yz'
LIMIT 5;
```

复制其中一个 `id`，用作 `TARGET_ID`。

**记录下这三个值备用：**

```
GENEALOGY_ID = cmpdy4wee00031op1tn23k2yz
TARGET_ID    = cmpdy4weo00091op1gmv1l4n8
ANCESTOR_ID  = cmpdy4weh00041op1x84k6s5r （第1代始祖）
```

---

## 第二步：连接 psql 并设置显示格式

每次打开新终端后，先执行：

```bash
# 连接数据库
psql -U postgres -d genealogyms
```

连接成功后，设置输出格式（让截图更好看）：
```sql
-- 对齐显示（表格对齐）
\pset format aligned

-- 设置每页显示行数（不分页，全部显示）
\pset pager off

-- 显示查询执行时间
\timing on
```

---

## 第三步：逐一执行 SQL 并截图

每执行完一个 SQL 后，对**终端窗口截全图**（包含命令和结果），按提示命名保存。

---

### 截图1：配偶查询（SQL-1a）

复制以下命令到 psql（把 `'TARGET_ID'` 替换为你的实际 ID，下同）：

```sql
SELECT m.id, m.name, m.gender, m.birth_year
FROM members m
WHERE m.id IN (
  SELECT CASE
    WHEN member1_id = 'cmpdy4weo00091op1gmv1l4n8' THEN member2_id
    ELSE member1_id
  END
  FROM marriages
  WHERE member1_id = 'cmpdy4weo00091op1gmv1l4n8' OR member2_id = 'cmpdy4weo00091op1gmv1l4n8'
);
```

**截图要点：** 结果中应有至少 1 行配偶记录（name、gender、birth_year 均可见）。

截图命名：`截图1-配偶查询.png`

---

### 截图1b：子女查询（SQL-1b）

```sql
SELECT m.id, m.name, m.gender, m.birth_year
FROM members m
JOIN parent_child pc ON pc.child_id = m.id
WHERE pc.parent_id = 'cmpdy4weo00091op1gmv1l4n8'
ORDER BY m.birth_year NULLS LAST;
```

**截图要点：** 结果中应有多个子女记录（2-5 行）。

截图命名：`截图1b-子女查询.png`

---

### 截图2：递归祖先查询（SQL-2）

```sql
WITH RECURSIVE ancestors AS (
  SELECT
    m.id, m.name, m.gender, m.birth_year, m.generation,
    0          AS depth,
    NULL::text AS parent_id_in_result
  FROM members m
  WHERE m.id = 'cmpdy4weo00091op1gmv1l4n8'
  UNION ALL
  SELECT
    m.id, m.name, m.gender, m.birth_year, m.generation,
    a.depth + 1,
    a.id
  FROM members m
  JOIN parent_child pc ON pc.parent_id = m.id
  JOIN ancestors a     ON pc.child_id  = a.id
)
SELECT depth, name, gender, birth_year, generation
FROM ancestors
ORDER BY depth, name;
```

**截图要点：** 结果中有不同 `depth` 值（0=本人，1=父母，2=祖父母...），层数越多越好。

截图命名：`截图2-递归祖先查询.png`

---

### 截图3：各辈分平均寿命（SQL-3）

```sql
SELECT
  generation,
  ROUND(AVG(death_year - birth_year), 1) AS avg_lifespan,
  COUNT(*) AS member_count
FROM members
WHERE genealogy_id = 'cmpdy4wee00031op1tn23k2yz'
  AND generation IS NOT NULL
  AND birth_year  IS NOT NULL
  AND death_year  IS NOT NULL
GROUP BY generation
ORDER BY avg_lifespan DESC
LIMIT 10;
```

**截图要点：** 结果为多行，每行一个辈分，显示平均寿命和人数。

截图命名：`截图3-辈分平均寿命.png`

---

### 截图4：相对年龄超50且无配偶男性（SQL-4）

> **注意：** 数据库成员出生年份从公元 1000 年起计（历史数据），直接用 `EXTRACT(YEAR FROM CURRENT_DATE)` 计算会得到 1000+ 年的荒谬年龄。正确做法是以**族谱内最大出生年份**作为参考基准年，计算相对年龄差。

**先确认族谱的出生年份范围（了解数据分布）：**

```sql
SELECT MAX(birth_year) AS latest_birth, MIN(birth_year) AS earliest_birth
FROM members
WHERE genealogy_id = 'cmpdy4wee00031op1tn23k2yz';
```

**再执行主查询（CTE 封装参考年，避免子查询重复计算）：**

```sql
WITH ref AS (
  SELECT MAX(birth_year) AS ref_year
  FROM members
  WHERE genealogy_id = 'cmpdy4wee00031op1tn23k2yz'
    AND birth_year IS NOT NULL
)
SELECT
  m.id,
  m.name,
  m.birth_year,
  m.death_year,
  (ref.ref_year - m.birth_year)::int AS age
FROM members m, ref
WHERE m.genealogy_id = 'cmpdy4wee00031op1tn23k2yz'
  AND m.gender       = 'M'
  AND m.birth_year   IS NOT NULL
  AND (ref.ref_year - m.birth_year) > 50

  AND (m.death_year IS NULL OR m.death_year >= ref.ref_year)
  AND m.id NOT IN (
    SELECT member1_id FROM marriages
    UNION
    SELECT member2_id FROM marriages
  )
ORDER BY age DESC
LIMIT 10;
```

**截图要点：** 结果显示未婚男性，age 字段值 50～约 200 之间（合理的代际差），`death_year` 字段为 NULL 或 ≥ 1458（参考年）。

截图命名：`截图4-未婚男性.png`

---

### 截图5：早于本代平均出生年的成员（SQL-5）

```sql
WITH gen_avg AS (
  SELECT
    generation,
    AVG(birth_year)::float AS avg_birth
  FROM members
  WHERE genealogy_id = 'cmpdy4wee00031op1tn23k2yz'
    AND generation IS NOT NULL
    AND birth_year  IS NOT NULL
  GROUP BY generation
)
SELECT
  m.name,
  m.generation,
  m.birth_year,
  ROUND(ga.avg_birth)::int AS generation_avg_birth
FROM members m
JOIN gen_avg ga ON ga.generation = m.generation
WHERE m.genealogy_id = 'cmpdy4wee00031op1tn23k2yz'
  AND m.birth_year   IS NOT NULL
  AND m.birth_year   < ga.avg_birth
ORDER BY m.generation, m.birth_year
LIMIT 10;
```

**截图要点：** 结果中每行的 `birth_year` 均小于 `generation_avg_birth`。

截图命名：`截图5-早于本代均值.png`

---

### 截图6a：无索引时的 EXPLAIN ANALYZE

> **已完成。** 实际操作：`members` 表上存在 Prisma 自动创建的 `members_name_idx` 索引，需先临时删除才能得到无索引状态。

**执行步骤：**

```sql
-- 临时删除已有 name 索引
DROP INDEX members_name_idx;

-- 截图6a：应出现 Index Scan using members_genealogy_id_idx（回退到另一索引逐行过滤）
EXPLAIN ANALYZE
SELECT id, name, generation, birth_year
FROM members
WHERE name = '张勇'
  AND genealogy_id = 'cmpdy4wee00031op1tn23k2yz';
```

**实测结果：** `Index Scan using members_genealogy_id_idx`，`Rows Removed by Filter: 54775`，`Execution Time: 13.148 ms`

截图命名：`截图6a-无索引EXPLAIN.png`

---

### 截图6b：有索引时的 EXPLAIN ANALYZE

> **已完成。** 重建 `members_name_idx` 后执行同一查询，优化器改用 Bitmap Index Scan。

**执行步骤：**

```sql
-- 重建索引（与原索引同名）
CREATE INDEX members_name_idx ON members (name);

-- 截图6b：应出现 Bitmap Index Scan on members_name_idx
EXPLAIN ANALYZE
SELECT id, name, generation, birth_year
FROM members
WHERE name = '张勇'
  AND genealogy_id = 'cmpdy4wee00031op1tn23k2yz';
```

**实测结果：** `Bitmap Index Scan on members_name_idx`，`Execution Time: 0.691 ms`，**较无索引时提速约 19 倍**

截图命名：`截图6b-有索引EXPLAIN.png`

---

### 截图7：数据库总规模验证

```sql
SELECT COUNT(*) AS total_members FROM members;
```

**截图要点：** 结果 ≥ 100000。

另外执行：
```sql
SELECT COUNT(*) AS total_genealogies FROM genealogies;
SELECT COUNT(*) AS total_users FROM users;
SELECT COUNT(*) AS total_parent_child_relations FROM parent_child;
SELECT COUNT(*) AS total_marriages FROM marriages;
```

截图命名：`截图7-数据规模统计.png`

---

### 截图8（可选）：COPY 导入演示

首先确认 `scripts/members_export.csv` 文件存在（运行 seed 后自动生成）：

```bash
# 退出 psql，在普通终端执行
ls -lh /Users/arielle/Desktop/GenealogyMS/scripts/members_export.csv
```

然后重新进入 psql 演示 COPY 导入（以一个小测试族谱为例演示导入命令，不需要真正导入）：

```sql
-- 查看 COPY 命令语法，截图即可（不必真正执行导入）
\h COPY
```

或者展示文件内容的前几行：

```bash
# 在终端（非 psql）执行
head -5 /Users/arielle/Desktop/GenealogyMS/scripts/members_export.csv
```

截图命名：`截图8-COPY命令演示.png`

---

## 第四步：整理截图

将所有截图文件放入 `SUBMISSION/` 文件夹，命名规则如上。

然后打开 `SUBMISSION/实验报告.md`，找到第八节「SQL 执行结果截图」，用 Markdown 图片语法将截图插入对应位置：

```markdown
### 截图1：SQL-1 配偶和子女查询结果

![配偶查询结果](截图1-配偶查询.png)
![子女查询结果](截图1b-子女查询.png)
```

---

## 常见问题

**Q：psql 连不上，提示 "connection refused"？**
```bash
# 检查 PostgreSQL 是否运行
pg_ctl status -D /Library/PostgreSQL/18/data
# 如果没运行，切换到 postgres 用户启动（不要用 sudo）
su - postgres -c "pg_ctl start -D /Library/PostgreSQL/18/data"
```

**Q：提示 "database genealogyms does not exist"？**
```bash
psql -U postgres -c "CREATE DATABASE genealogyms;"
# 然后重新执行迁移
npm run db:migrate
npm run db:seed
```

**Q：没有有子女的成员，TARGET_ID 查不到数据？**
- 确认 `npm run db:seed` 已成功完成（不是中途退出）
- 运行 `SELECT COUNT(*) FROM parent_child;` 确认有数据

**Q：EXPLAIN ANALYZE 执行时间很短，6a 和 6b 差距不明显？**
- 确认使用的是大型族谱（50,000+ 成员那个）
- 如果 parent_child 记录不够多，差距可能不明显，属正常
- 可以用 `SELECT COUNT(*) FROM parent_child;` 确认有足够数据
