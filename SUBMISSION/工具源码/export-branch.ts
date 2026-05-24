/**
 * 分支导出脚本 (export-branch.ts)
 * 将某成员的所有后代导出为 CSV 文件
 * 运行方式: npx tsx scripts/export-branch.ts <memberId>
 *
 * 演示 PostgreSQL COPY 命令的等效操作
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFileSync } from "fs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const memberId = process.argv[2];
  if (!memberId) {
    console.error("用法: npx tsx scripts/export-branch.ts <memberId>");
    process.exit(1);
  }

  console.log(`导出成员 ${memberId} 的后代分支…`);

  // 使用递归CTE查询所有后代
  const descendants = await prisma.$queryRaw<{
    id: string; name: string; gender: string;
    birth_year: number | null; death_year: number | null;
    generation: number | null; depth: number;
  }[]>`
    WITH RECURSIVE descendants AS (
      SELECT m.id, m.name, m.gender, m.birth_year, m.death_year, m.generation, 0 AS depth
      FROM members m WHERE m.id = ${memberId}

      UNION ALL

      SELECT m.id, m.name, m.gender, m.birth_year, m.death_year, m.generation, d.depth + 1
      FROM members m
      JOIN parent_child pc ON pc.child_id = m.id
      JOIN descendants d   ON pc.parent_id = d.id
    )
    SELECT * FROM descendants ORDER BY depth, generation, name
  `;

  if (!descendants.length) {
    console.log("未找到该成员");
    return;
  }

  const csvLines = [
    "id,name,gender,birth_year,death_year,generation,depth",
    ...descendants.map((d) =>
      `${d.id},${d.name},${d.gender},${d.birth_year ?? ""},${d.death_year ?? ""},${d.generation ?? ""},${d.depth}`
    ),
  ];

  const outPath = `scripts/branch_${memberId.slice(0, 8)}.csv`;
  writeFileSync(outPath, csvLines.join("\n"));
  console.log(`✓ 已导出 ${descendants.length} 条记录到 ${outPath}`);

  // 打印 PostgreSQL COPY 等效命令
  console.log("\n── 等效 PostgreSQL COPY 命令 ──");
  console.log(`-- 导出（在 psql 中执行）：`);
  console.log(`\\COPY (${getSql(memberId)}) TO '${outPath}' CSV HEADER;`);
  console.log("\n-- 批量导入（在 psql 中执行）：");
  console.log(`\\COPY members (id, genealogy_id, name, gender, birth_year, death_year, bio, generation)`);
  console.log(`FROM 'scripts/members_export.csv' CSV HEADER;`);
}

function getSql(memberId: string) {
  return `WITH RECURSIVE descendants AS (SELECT m.* FROM members m WHERE m.id = '${memberId}' UNION ALL SELECT m.* FROM members m JOIN parent_child pc ON pc.child_id = m.id JOIN descendants d ON pc.parent_id = d.id) SELECT * FROM descendants`;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
