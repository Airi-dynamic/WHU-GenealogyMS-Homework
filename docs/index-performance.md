# 索引设计与性能分析（v0.8）

## 索引策略

### 1. 姓名模糊查询索引

**需求：** `WHERE name ILIKE '%张%'` 类型查询

**方案：** PostgreSQL `pg_trgm` 扩展 + GIN 索引

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_members_name_trgm ON members USING GIN (name gin_trgm_ops);
```

**原理：** Trigram 将字符串拆分为三字符组，GIN 索引对这些组建立倒排索引，使 ILIKE 模糊查询能走索引而非全表扫描。

---

### 2. 父节点查询子节点索引

**需求：** `WHERE parent_id = 'xxx'` 查找所有子女

**方案：** B-Tree 索引（`parent_child.parent_id`）

```sql
CREATE INDEX idx_parent_child_parent_id ON parent_child (parent_id);
CREATE INDEX idx_parent_child_child_id  ON parent_child (child_id);
```

---

### 3. 族谱成员过滤索引

```sql
CREATE INDEX idx_members_genealogy_id ON members (genealogy_id);
```

---

## 四代查询性能对比实验

### 实验方法

在含 50,000+ 成员的张氏宗谱上，选取第1代始祖（generation=1）作为根节点，执行四代曾孙查询，分别在有/无索引情况下记录执行计划。

### 无索引时的 EXPLAIN ANALYZE

```sql
-- 删除索引
DROP INDEX IF EXISTS idx_parent_child_parent_id;

EXPLAIN ANALYZE
WITH
  gen1 AS (SELECT child_id AS id FROM parent_child WHERE parent_id = '<ancestor_id>'),
  gen2 AS (SELECT pc.child_id AS id FROM parent_child pc JOIN gen1 ON pc.parent_id = gen1.id),
  gen3 AS (SELECT pc.child_id AS id FROM parent_child pc JOIN gen2 ON pc.parent_id = gen2.id),
  gen4 AS (SELECT pc.child_id AS id FROM parent_child pc JOIN gen3 ON pc.parent_id = gen3.id)
SELECT m.* FROM members m JOIN gen4 ON m.id = gen4.id;
```

**预期结果（无索引）：**
- 每层扫描策略：Seq Scan on parent_child
- 预计执行时间：> 2000ms（50k成员规模）

### 有索引时的 EXPLAIN ANALYZE

```sql
-- 重建索引
CREATE INDEX idx_parent_child_parent_id ON parent_child (parent_id);

EXPLAIN ANALYZE
WITH
  gen1 AS (SELECT child_id AS id FROM parent_child WHERE parent_id = '<ancestor_id>'),
  gen2 AS (SELECT pc.child_id AS id FROM parent_child pc JOIN gen1 ON pc.parent_id = gen1.id),
  gen3 AS (SELECT pc.child_id AS id FROM parent_child pc JOIN gen2 ON pc.parent_id = gen2.id),
  gen4 AS (SELECT pc.child_id AS id FROM parent_child pc JOIN gen3 ON pc.parent_id = gen3.id)
SELECT m.* FROM members m JOIN gen4 ON m.id = gen4.id;
```

**预期结果（有索引）：**
- 每层扫描策略：Index Scan using idx_parent_child_parent_id
- 预计执行时间：< 50ms

### 性能差异说明

| 场景 | 扫描方式 | 时间（约） |
|------|----------|-----------|
| 无索引 | Seq Scan（全表顺序扫描） | >2s |
| 有索引 | Index Scan（B-Tree索引查找） | <50ms |
| 加速比 | — | ~40x |

> 实际数据请在运行 `npm run db:seed` 填充数据后，在 PostgreSQL 中执行上述 EXPLAIN ANALYZE 命令并截图。

---

## 索引对 ILIKE 查询的效果

```sql
-- 无 pg_trgm 索引
EXPLAIN ANALYZE SELECT * FROM members WHERE name ILIKE '%张%';
-- → Seq Scan，Filter: (name ~~* '%张%')

-- 有 pg_trgm 索引
EXPLAIN ANALYZE SELECT * FROM members WHERE name ILIKE '%张%';
-- → Bitmap Index Scan on idx_members_name_trgm
```
