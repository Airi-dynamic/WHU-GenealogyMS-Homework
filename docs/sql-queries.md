# 核心 SQL 语句汇总

所有 SQL 均使用 PostgreSQL 16 语法，在 Prisma `$queryRaw` 中执行。

---

## 1. 给定成员 ID，查询其配偶及所有子女

```sql
-- 配偶查询
SELECT m.id, m.name, m.gender, m.birth_year
FROM members m
WHERE m.id IN (
  SELECT CASE
    WHEN member1_id = 'TARGET_ID' THEN member2_id
    ELSE member1_id
  END
  FROM marriages
  WHERE member1_id = 'TARGET_ID' OR member2_id = 'TARGET_ID'
);

-- 子女查询
SELECT m.id, m.name, m.gender, m.birth_year
FROM members m
JOIN parent_child pc ON pc.child_id = m.id
WHERE pc.parent_id = 'TARGET_ID'
ORDER BY m.birth_year NULLS LAST;
```

---

## 2. 递归祖先查询（Recursive CTE）

输入成员 A 的 ID，输出所有历代祖先：

```sql
WITH RECURSIVE ancestors AS (
  -- 基础情形：起始成员（深度0）
  SELECT
    m.id,
    m.name,
    m.gender,
    m.birth_year,
    m.death_year,
    m.generation,
    0            AS depth,
    NULL::text   AS parent_id
  FROM members m
  WHERE m.id = 'TARGET_ID'

  UNION ALL

  -- 递归：向上找父母
  SELECT
    m.id,
    m.name,
    m.gender,
    m.birth_year,
    m.death_year,
    m.generation,
    a.depth + 1  AS depth,
    a.id         AS parent_id
  FROM members m
  JOIN parent_child pc ON pc.parent_id = m.id
  JOIN ancestors a     ON pc.child_id  = a.id
)
SELECT * FROM ancestors ORDER BY depth, name;
```

---

## 3. 统计平均寿命最长的辈分

```sql
SELECT
  generation,
  ROUND(AVG(death_year - birth_year), 1) AS avg_lifespan,
  COUNT(*)                                AS member_count
FROM members
WHERE genealogy_id = 'GENEALOGY_ID'
  AND generation IS NOT NULL
  AND birth_year  IS NOT NULL
  AND death_year  IS NOT NULL
GROUP BY generation
ORDER BY avg_lifespan DESC
LIMIT 10;
```

---

## 4. 查询年龄超过50岁且无配偶的男性成员

```sql
SELECT
  m.id,
  m.name,
  m.birth_year,
  (EXTRACT(YEAR FROM CURRENT_DATE) - m.birth_year)::int AS age
FROM members m
WHERE m.genealogy_id = 'GENEALOGY_ID'
  AND m.gender       = 'M'
  AND m.birth_year   IS NOT NULL
  AND (EXTRACT(YEAR FROM CURRENT_DATE) - m.birth_year) > 50
  AND m.id NOT IN (
    SELECT member1_id FROM marriages
    UNION
    SELECT member2_id FROM marriages
  )
ORDER BY age DESC;
```

---

## 5. 找出出生年份早于辈分平均出生年份的成员

```sql
WITH gen_avg AS (
  SELECT
    generation,
    AVG(birth_year)::float AS avg_birth
  FROM members
  WHERE genealogy_id = 'GENEALOGY_ID'
    AND generation   IS NOT NULL
    AND birth_year   IS NOT NULL
  GROUP BY generation
)
SELECT
  m.id,
  m.name,
  m.generation,
  m.birth_year,
  ROUND(ga.avg_birth)::int AS generation_avg_birth
FROM members m
JOIN gen_avg ga ON ga.generation = m.generation
WHERE m.genealogy_id = 'GENEALOGY_ID'
  AND m.birth_year   IS NOT NULL
  AND m.birth_year   < ga.avg_birth
ORDER BY m.generation, m.birth_year;
```

---

## 6. 四代查询（曾祖父的所有曾孙）

用于性能测试（v0.8 索引对比）：

```sql
-- 精确四代查询（目标成员的所有曾孙）
WITH
  gen1 AS (
    SELECT child_id AS id FROM parent_child WHERE parent_id = 'ANCESTOR_ID'
  ),
  gen2 AS (
    SELECT pc.child_id AS id FROM parent_child pc JOIN gen1 ON pc.parent_id = gen1.id
  ),
  gen3 AS (
    SELECT pc.child_id AS id FROM parent_child pc JOIN gen2 ON pc.parent_id = gen2.id
  ),
  gen4 AS (
    SELECT pc.child_id AS id FROM parent_child pc JOIN gen3 ON pc.parent_id = gen3.id
  )
SELECT m.* FROM members m JOIN gen4 ON m.id = gen4.id;
```

---

## 7. 批量导入（COPY）

```sql
-- 方式1：psql 客户端命令（\COPY，适合本地文件）
\COPY members (id, genealogy_id, name, gender, birth_year, death_year, bio, generation)
FROM 'scripts/members_export.csv' CSV HEADER;

-- 方式2：服务端 COPY（需超级用户权限）
COPY members (id, genealogy_id, name, gender, birth_year, death_year, bio, generation)
FROM '/absolute/path/to/members_export.csv' CSV HEADER;
```

---

## 8. 导出某分支的备份

```sql
\COPY (
  WITH RECURSIVE descendants AS (
    SELECT m.* FROM members m WHERE m.id = 'ROOT_MEMBER_ID'
    UNION ALL
    SELECT m.* FROM members m
    JOIN parent_child pc ON pc.child_id = m.id
    JOIN descendants d   ON pc.parent_id = d.id
  )
  SELECT * FROM descendants
)
TO 'branch_backup.csv' CSV HEADER;
```

---

## 9. 索引创建语句（v0.8）

```sql
-- 姓名模糊查询：GIN + pg_trgm 扩展
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_members_name_trgm
  ON members USING GIN (name gin_trgm_ops);

-- 父节点 ID 查询子节点：B-Tree（普通索引）
CREATE INDEX idx_parent_child_parent_id
  ON parent_child (parent_id);

CREATE INDEX idx_parent_child_child_id
  ON parent_child (child_id);

-- 族谱 ID 过滤成员（已在 schema.prisma 中定义）
CREATE INDEX idx_members_genealogy_id
  ON members (genealogy_id);
```
