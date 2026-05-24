/**
 * 数据生成脚本 (seed.ts)
 * 运行方式: npx tsx scripts/seed.ts
 *
 * 生成内容:
 *  - 3 个测试用户
 *  - 10 个族谱（其中 1 个含 50,000+ 成员，系统总成员 100,000+）
 *  - 每个族谱至少 30 代传承
 *  - 每个成员至少与另一个成员有亲缘关系
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { writeFileSync } from "fs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

// ──────────────────────────────────────────────────
// 辅助函数
// ──────────────────────────────────────────────────

const SURNAMES = ["张", "王", "李", "赵", "陈", "刘", "杨", "黄", "周", "吴"];
const MALE_NAMES = ["伟", "芳", "娜", "秀英", "敏", "静", "丽", "强", "磊", "军", "洋", "勇", "艳", "杰", "涛", "明", "超", "秀兰", "霞", "平"];
const FEMALE_NAMES = ["梅", "兰", "菊", "荷", "云", "雪", "月", "珍", "莹", "燕", "红", "丹", "萍", "青", "翠", "玉", "香", "芬", "凤", "英"];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randElem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genName(gender: "M" | "F", surname: string): string {
  const given = gender === "M" ? randElem(MALE_NAMES) : randElem(FEMALE_NAMES);
  return surname + given;
}

// ──────────────────────────────────────────────────
// 主体：生成单个族谱
// ──────────────────────────────────────────────────

/**
 * 生成一个族谱，包含约 targetSize 个成员，至少 minGenerations 代
 * 使用「层级扩展」算法：
 *   每代人从上一代中随机选取若干人作为父亲，配对母亲，生育子女
 */
async function seedGenealogy(
  genealogyId: string,
  surname: string,
  targetSize: number,
  minGenerations: number,
  csvRows: string[]
) {
  console.log(`  生成族谱成员（目标 ${targetSize} 人，≥${minGenerations} 代）…`);

  // 第1代：始祖夫妇
  const gen1Father = await prisma.member.create({
    data: {
      genealogyId,
      name: genName("M", surname),
      gender: "M",
      birthYear: 1000,
      deathYear: 1070,
      generation: 1,
    },
  });
  const gen1Mother = await prisma.member.create({
    data: {
      genealogyId,
      name: genName("F", surname),
      gender: "F",
      birthYear: 1005,
      deathYear: 1075,
      generation: 1,
    },
  });
  await prisma.marriage.create({
    data: { member1Id: gen1Father.id, member2Id: gen1Mother.id, marriageYear: 1020 },
  });

  csvRows.push(`${gen1Father.id},${genealogyId},${gen1Father.name},M,1000,1070,,1`);
  csvRows.push(`${gen1Mother.id},${genealogyId},${gen1Mother.name},F,1005,1075,,1`);

  let prevGenIds = [{ fatherId: gen1Father.id, motherId: gen1Mother.id }];
  let totalCreated = 2;
  let generation = 1;

  while (totalCreated < targetSize) {
    generation++;
    const newCouples: { fatherId: string; motherId: string }[] = [];

    // 每对父母生 2–5 个孩子
    const batchData: {
      member: { genealogyId: string; name: string; gender: string; birthYear: number; deathYear: number; generation: number };
      fatherId: string;
      motherId: string;
    }[] = [];

    for (const { fatherId, motherId } of prevGenIds) {
      const childCount = randInt(2, 5);
      const birthBase = 1000 + generation * 25;
      for (let i = 0; i < childCount; i++) {
        if (totalCreated + batchData.length >= targetSize) break;
        const gender: "M" | "F" = Math.random() < 0.5 ? "M" : "F";
        const birthYear = birthBase + randInt(-5, 5);
        batchData.push({
          member: {
            genealogyId,
            name: genName(gender, surname),
            gender,
            birthYear,
            deathYear: birthYear + randInt(50, 85),
            generation,
          },
          fatherId,
          motherId,
        });
      }
    }

    if (batchData.length === 0) break;

    // 批量插入（分批，每批500条）
    const BATCH = 500;
    const createdIds: string[] = [];
    for (let i = 0; i < batchData.length; i += BATCH) {
      const slice = batchData.slice(i, i + BATCH);
      await prisma.member.createMany({
        data: slice.map((d) => d.member),
        skipDuplicates: true,
      });

      // 重新查询刚插入的成员（Prisma createMany 不返回 id）
      const names = slice.map((d) => d.member.name);
      const gen = slice[0].member.generation;
      const inserted = await prisma.member.findMany({
        where: { genealogyId, generation: gen, name: { in: names } },
        select: { id: true, name: true },
        orderBy: { birthYear: "asc" },
      });

      for (let j = 0; j < Math.min(slice.length, inserted.length); j++) {
        createdIds.push(inserted[j].id);
        const d = slice[j];
        csvRows.push(`${inserted[j].id},${genealogyId},${d.member.name},${d.member.gender},${d.member.birthYear},${d.member.deathYear},,${d.member.generation}`);
      }
    }

    // 建立亲子关系
    const parentChildData = batchData.slice(0, createdIds.length).map((d, idx) => ([
      { parentId: d.fatherId, childId: createdIds[idx] },
      { parentId: d.motherId, childId: createdIds[idx] },
    ])).flat();

    await prisma.parentChild.createMany({ data: parentChildData, skipDuplicates: true });

    // 为男性成员配对婚姻（族外婚：创建新的女性成员）
    const maleIds = createdIds.filter((_, i) => batchData[i]?.member.gender === "M");
    const marriageData: { member1Id: string; member2Id: string; marriageYear: number }[] = [];
    const spouseMembers: { genealogyId: string; name: string; gender: string; birthYear: number; deathYear: number; generation: number }[] = [];

    for (const maleId of maleIds) {
      const idx = createdIds.indexOf(maleId);
      const birthYear = batchData[idx].member.birthYear;
      spouseMembers.push({
        genealogyId,
        name: genName("F", randElem(SURNAMES.filter((s) => s !== surname))),
        gender: "F",
        birthYear: birthYear + randInt(-3, 3),
        deathYear: birthYear + randInt(50, 80),
        generation,
      });
    }

    if (spouseMembers.length > 0) {
      await prisma.member.createMany({ data: spouseMembers, skipDuplicates: true });
      const spouseNames = spouseMembers.map((s) => s.name);
      const spousesInserted = await prisma.member.findMany({
        where: { genealogyId, generation, name: { in: spouseNames }, gender: "F" },
        select: { id: true },
        orderBy: { birthYear: "asc" },
      });

      for (let i = 0; i < Math.min(maleIds.length, spousesInserted.length); i++) {
        marriageData.push({
          member1Id: maleIds[i],
          member2Id: spousesInserted[i].id,
          marriageYear: batchData[createdIds.indexOf(maleIds[i])].member.birthYear + randInt(18, 25),
        });
        newCouples.push({ fatherId: maleIds[i], motherId: spousesInserted[i].id });
        totalCreated++;
      }

      await prisma.marriage.createMany({ data: marriageData, skipDuplicates: true });
    }

    totalCreated += createdIds.length;
    prevGenIds = newCouples.length > 0 ? newCouples : prevGenIds;

    if (generation % 5 === 0) {
      console.log(`    第 ${generation} 代完成，累计已创建 ${totalCreated} 人`);
    }

    // 确保至少达到最低代数
    if (totalCreated >= targetSize && generation >= minGenerations) break;
  }

  console.log(`  ✓ 族谱完成：第 ${generation} 代，共 ${totalCreated} 人`);
  return totalCreated;
}

// ──────────────────────────────────────────────────
// 入口
// ──────────────────────────────────────────────────

async function main() {
  console.log("开始生成测试数据…\n");

  // 清空旧数据（按依赖顺序）
  console.log("清空旧数据…");
  await prisma.$executeRaw`TRUNCATE TABLE marriages, parent_child, members, genealogy_collaborators, genealogies, users RESTART IDENTITY CASCADE`;

  // ── 创建用户 ──
  console.log("\n创建测试用户…");
  const hash = await bcrypt.hash("password123", 10);
  const users = await Promise.all([
    prisma.user.create({ data: { username: "admin", email: "admin@example.com", password: hash } }),
    prisma.user.create({ data: { username: "alice", email: "alice@example.com", password: hash } }),
    prisma.user.create({ data: { username: "bob", email: "bob@example.com", password: hash } }),
  ]);
  console.log("✓ 创建 3 个用户（密码均为 password123）");

  // ── 创建族谱 ──
  const genealogyConfigs = [
    { surname: "张", name: "张氏宗谱", targetSize: 52000, minGen: 30, ownerId: users[0].id },
    { surname: "王", name: "王氏族谱", targetSize: 8000,  minGen: 30, ownerId: users[0].id },
    { surname: "李", name: "李氏家谱", targetSize: 7000,  minGen: 30, ownerId: users[1].id },
    { surname: "赵", name: "赵氏宗谱", targetSize: 6000,  minGen: 30, ownerId: users[1].id },
    { surname: "陈", name: "陈氏家谱", targetSize: 5500,  minGen: 30, ownerId: users[1].id },
    { surname: "刘", name: "刘氏族志", targetSize: 5000,  minGen: 30, ownerId: users[2].id },
    { surname: "杨", name: "杨氏宗谱", targetSize: 4500,  minGen: 30, ownerId: users[2].id },
    { surname: "黄", name: "黄氏家谱", targetSize: 4000,  minGen: 30, ownerId: users[2].id },
    { surname: "周", name: "周氏世系", targetSize: 4000,  minGen: 30, ownerId: users[0].id },
    { surname: "吴", name: "吴氏宗谱", targetSize: 4000,  minGen: 30, ownerId: users[0].id },
  ];

  const csvRows: string[] = ["id,genealogy_id,name,gender,birth_year,death_year,bio,generation"];
  let grandTotal = 0;

  for (const cfg of genealogyConfigs) {
    console.log(`\n创建族谱：${cfg.name}`);
    const g = await prisma.genealogy.create({
      data: {
        name: cfg.name,
        surname: cfg.surname,
        createdYear: 2024,
        ownerId: cfg.ownerId,
      },
    });

    const count = await seedGenealogy(g.id, cfg.surname, cfg.targetSize, cfg.minGen, csvRows);
    grandTotal += count;
    console.log(`  族谱 ${cfg.name} 完成，本族 ${count} 人`);
  }

  // ── 邀请协作 ──
  const firstGenealogy = await prisma.genealogy.findFirst({ where: { ownerId: users[0].id } });
  if (firstGenealogy) {
    await prisma.genealogyCollaborator.create({
      data: { genealogyId: firstGenealogy.id, userId: users[1].id },
    });
    console.log(`\n已邀请 alice 协作编辑「${firstGenealogy.name}」`);
  }

  // ── 导出 CSV ──
  const csvPath = "scripts/members_export.csv";
  writeFileSync(csvPath, csvRows.slice(0, 5001).join("\n")); // 前5000行示例
  console.log(`\n已导出示例 CSV 到 ${csvPath}（前5000行）`);

  console.log(`\n✅ 数据生成完成！总成员数：${grandTotal.toLocaleString()}`);
  console.log("测试账号：admin / alice / bob，密码均为 password123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
