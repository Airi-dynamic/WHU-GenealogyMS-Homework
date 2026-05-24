import { prisma } from "../db";

export interface GenerationStats {
  generation: number | null;
  avgLifespan: number;
  memberCount: number;
}

export interface SpouseAndChildren {
  spouses: { id: string; name: string; gender: string; birthYear: number | null }[];
  children: { id: string; name: string; gender: string; birthYear: number | null }[];
}

/**
 * SQL 需求1: 给定成员 ID，查询其配偶及所有子女
 */
export async function getSpouseAndChildren(memberId: string): Promise<SpouseAndChildren> {
  const spouses = await prisma.$queryRaw<{ id: string; name: string; gender: string; birthYear: number | null }[]>`
    SELECT m.id, m.name, m.gender, m.birth_year AS "birthYear"
    FROM members m
    WHERE m.id IN (
      SELECT CASE WHEN member1_id = ${memberId} THEN member2_id ELSE member1_id END
      FROM marriages
      WHERE member1_id = ${memberId} OR member2_id = ${memberId}
    )
  `;

  const children = await prisma.$queryRaw<{ id: string; name: string; gender: string; birthYear: number | null }[]>`
    SELECT m.id, m.name, m.gender, m.birth_year AS "birthYear"
    FROM members m
    JOIN parent_child pc ON pc.child_id = m.id
    WHERE pc.parent_id = ${memberId}
    ORDER BY m.birth_year NULLS LAST
  `;

  return { spouses, children };
}

/**
 * SQL 需求3: 统计族谱中平均寿命最长的辈分（generation）
 * 仅统计有完整生卒年的成员
 */
export async function getLongestLivingGeneration(genealogyId: string): Promise<GenerationStats[]> {
  return prisma.$queryRaw<GenerationStats[]>`
    SELECT
      generation,
      ROUND(AVG(death_year - birth_year), 1)::float AS "avgLifespan",
      COUNT(*)::int                                   AS "memberCount"
    FROM members
    WHERE genealogy_id = ${genealogyId}
      AND generation IS NOT NULL
      AND birth_year  IS NOT NULL
      AND death_year  IS NOT NULL
    GROUP BY generation
    ORDER BY "avgLifespan" DESC
    LIMIT 10
  `;
}

/**
 * SQL 需求4: 查询相对年龄超过50岁且没有配偶的男性成员
 * 以族谱内最大出生年份作为参考年，避免历史数据用公元纪年计算出荒谬的年龄值
 */
export async function getOldUnmarriedMales(genealogyId: string): Promise<{ id: string; name: string; birthYear: number | null; age: number }[]> {
  return prisma.$queryRaw`
    WITH ref AS (
      SELECT MAX(birth_year) AS ref_year
      FROM members
      WHERE genealogy_id = ${genealogyId}
        AND birth_year IS NOT NULL
    )
    SELECT
      m.id,
      m.name,
      m.birth_year                           AS "birthYear",
      m.death_year                           AS "deathYear",
      (ref.ref_year - m.birth_year)::int     AS age
    FROM members m, ref
    WHERE m.genealogy_id = ${genealogyId}
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
  `;
}

/**
 * SQL 需求5: 找出出生年份早于该辈分平均出生年份的所有成员
 */
export async function getMembersEarlierThanGenerationAvg(genealogyId: string): Promise<{
  id: string; name: string; generation: number | null; birthYear: number | null; generationAvgBirth: number;
}[]> {
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
      m.birth_year                AS "birthYear",
      ROUND(ga.avg_birth)::int    AS "generationAvgBirth"
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
