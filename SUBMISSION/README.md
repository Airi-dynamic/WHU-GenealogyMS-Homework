# 提交材料清单

本文件夹包含「寻根溯源族谱管理系统」课程实验的全部提交内容。

---

## 文件清单

| 文件 | 说明 | 状态 |
|------|------|------|
| `实验报告.md` | 主实验报告（含 ER图、关系模型、3NF分析、索引约束、数据生成方法、RDBMS说明、全部SQL语句） | 已完成，**需补充截图** |
| `SQL截图操作指南.md` | 逐步说明如何在 psql 中执行 SQL 并截图 | 已完成，按步骤执行 |
| `数据库导出指南.md` | 逐步说明如何用 pg_dump 导出数据库 | 已完成，按步骤执行 |
| `工具源码/seed.ts` | 数据生成工具源码（生成10万+测试数据） | 已完成 |
| `工具源码/export-branch.ts` | CSV 导出工具源码（递归导出成员后代） | 已完成 |
| `genealogyms_backup.dump` | 数据库导出文件 | **需按指南操作生成** |

---

## 需要你完成的步骤（按顺序）

### 第一步：确认数据已生成
```bash
# 在项目根目录执行
npm run db:seed
```
等待约 5-15 分钟，直到看到「数据生成完成」的输出。

### 第二步：在 psql 中执行 SQL 并截图
阅读 `SQL截图操作指南.md`，按步骤操作，将截图插入 `实验报告.md` 对应位置。

### 第三步：导出数据库
阅读 `数据库导出指南.md`，执行 pg_dump 命令，将生成的 `genealogyms_backup.dump` 文件放入本文件夹。

### 第四步：整理提交
将本文件夹（SUBMISSION/）打包，连同实验报告一起提交。

---

## 分工说明（用于报告「个人所做工作」部分）

**开发者甲（数据库与后端）的工作：**
- 数据库建模（ER图设计、schema.prisma 6张表设计）
- 数据库迁移与索引设计
- 所有 API 接口（app/api/ 下全部 route.ts）
- NextAuth 认证系统（lib/auth.ts、proxy.ts）
- 复杂 SQL 查询（lib/queries/ 下全部文件）
- 数据生成脚本（scripts/seed.ts、export-branch.ts）

**开发者乙（前端与可视化）的工作：**
- 所有用户界面（app/(main)/、app/(auth)/ 下全部页面）
- UI 组件库（components/ui/ 下全部组件）
- 侧边栏导航（components/ui/sidebar.tsx）
- 成员表单（components/forms/member-form.tsx）
- ECharts 树形图可视化（components/tree/echarts-tree.tsx）
- 亲缘路径可视化（relation/page.tsx）
