# 关系模式与范式分析

## 关系模式定义

```
users(id, username, email, password, created_at)
  PK: id
  UK: username, email

genealogies(id, name, surname, created_year, owner_id, created_at)
  PK: id
  FK: owner_id → users(id)

genealogy_collaborators(genealogy_id, user_id, invited_at)
  PK: (genealogy_id, user_id)
  FK: genealogy_id → genealogies(id)
  FK: user_id → users(id)

members(id, genealogy_id, name, gender, birth_year, death_year, bio, generation)
  PK: id
  FK: genealogy_id → genealogies(id)
  CHECK: gender IN ('M', 'F')
  CHECK: death_year IS NULL OR death_year > birth_year

parent_child(parent_id, child_id)
  PK: (parent_id, child_id)
  FK: parent_id → members(id)
  FK: child_id → members(id)

marriages(id, member1_id, member2_id, marriage_year, divorce_year)
  PK: id
  FK: member1_id → members(id)
  FK: member2_id → members(id)
  CHECK: divorce_year IS NULL OR divorce_year >= marriage_year
```

---

## 范式分析

### 第一范式（1NF）✅

**要求：** 所有属性都是原子值，没有重复组或数组类型属性。

**分析：**
- 每个表的每一列都存储单一值（字符串、整数、日期等基本类型）
- 多值关系（亲子、婚姻、协作者）均通过独立关联表拆分，不在主表中使用数组列
- 所有表满足 1NF

---

### 第二范式（2NF）✅

**要求：** 满足 1NF，且每个非主属性完全函数依赖于主键（消除部分依赖，仅对复合主键有意义）。

**分析：**

`genealogy_collaborators(genealogy_id, user_id, invited_at)`:
- PK = `(genealogy_id, user_id)`
- `invited_at` 依赖于整个复合主键（表示这对关系的邀请时间），不存在对部分主键的依赖
- ✅ 满足 2NF

`parent_child(parent_id, child_id)`:
- PK = `(parent_id, child_id)`，无非主属性
- ✅ 满足 2NF（平凡满足）

其余表均为单列主键，不存在部分依赖问题，自动满足 2NF。

---

### 第三范式（3NF）✅

**要求：** 满足 2NF，且每个非主属性直接依赖于主键，不存在传递依赖（A → B → C，其中 A 是主键，B 是非主属性）。

**逐表分析：**

**`users`:**
- `id → username, email, password, created_at`
- 所有属性直接依赖 `id`，无传递依赖 ✅

**`genealogies`:**
- `id → name, surname, created_year, owner_id, created_at`
- 无传递依赖（`owner_id` 是外键引用，但 `name`/`surname` 等属性均直接依赖 `id`，不通过 `owner_id` 推导）✅

**`members`:**
- `id → genealogy_id, name, gender, birth_year, death_year, bio, generation`
- 关键验证：`generation` 是否依赖 `genealogy_id`？
  - 不是。`generation` 描述的是**该成员在其所属族谱中的辈分**，直接由成员 ID 确定
  - 若设计为"辈分由族谱确定"，则应单独建表；但本设计中 `generation` 是成员的内在属性
- 所有属性直接依赖 `id` ✅

**`parent_child`、`marriages`:**
- 关联表，非主属性很少（仅 `invited_at`、`marriage_year` 等），均直接依赖主键 ✅

**结论：所有关系模式均满足 3NF。**

---

### BCNF 分析

**要求（更严格）：** 对于每个函数依赖 X → Y，X 必须是超键（包含候选键）。

**潜在问题：**

`genealogy_collaborators` 中，`(genealogy_id, user_id)` 是唯一候选键，`invited_at` 只依赖完整主键，满足 BCNF。

`members` 中若存在依赖 `name → generation`（同名不同辈分时），会破坏 BCNF。但本设计中允许同名同姓不同辈分（任务书明确指出此情况），`name` 不是候选键，故不产生违反 BCNF 的函数依赖。

**结论：所有关系模式均满足 BCNF。**

---

## 完整性约束

| 表 | 约束类型 | 约束内容 |
|---|---|---|
| `users` | UNIQUE | `username`, `email` |
| `genealogies` | FK + CASCADE | `owner_id → users.id` |
| `members` | CHECK | `gender IN ('M','F')` |
| `members` | CHECK | `death_year IS NULL OR death_year > birth_year` |
| `parent_child` | FK + CASCADE | `parent_id, child_id → members.id` |
| `marriages` | FK + CASCADE | `member1_id, member2_id → members.id` |
| `marriages` | CHECK | `divorce_year IS NULL OR divorce_year >= marriage_year` |

> 父母出生年份早于子女的约束在应用层（API Route）验证，避免递归查询开销。
