import { prisma } from "../db";

export interface AncestorNode {
  id: string;
  name: string;
  gender: string;
  birthYear: number | null;
  deathYear: number | null;
  generation: number | null;
  depth: number;
  parentId: string | null;
}

/**
 * 递归祖先查询（Recursive CTE）
 * 输入成员 ID，向上追溯所有历代祖先
 */
export async function getAncestors(memberId: string): Promise<AncestorNode[]> {
  const result = await prisma.$queryRaw<AncestorNode[]>`
    WITH RECURSIVE ancestors AS (
      -- 基础情形：起始成员（depth=0）
      SELECT
        m.id,
        m.name,
        m.gender,
        m.birth_year   AS "birthYear",
        m.death_year   AS "deathYear",
        m.generation,
        0              AS depth,
        NULL::text     AS "parentId"
      FROM members m
      WHERE m.id = ${memberId}

      UNION ALL

      -- 递归步骤：向上找父母
      SELECT
        m.id,
        m.name,
        m.gender,
        m.birth_year   AS "birthYear",
        m.death_year   AS "deathYear",
        m.generation,
        a.depth + 1    AS depth,
        a.id           AS "parentId"
      FROM members m
      JOIN parent_child pc ON pc.parent_id = m.id
      JOIN ancestors a     ON pc.child_id  = a.id
    )
    SELECT * FROM ancestors ORDER BY depth, name
  `;
  return result;
}

/**
 * 递归后代查询（Recursive CTE）
 * 输入成员 ID，向下追溯所有历代后代
 */
export async function getDescendants(memberId: string): Promise<AncestorNode[]> {
  const result = await prisma.$queryRaw<AncestorNode[]>`
    WITH RECURSIVE descendants AS (
      SELECT
        m.id,
        m.name,
        m.gender,
        m.birth_year  AS "birthYear",
        m.death_year  AS "deathYear",
        m.generation,
        0             AS depth,
        NULL::text    AS "parentId"
      FROM members m
      WHERE m.id = ${memberId}

      UNION ALL

      SELECT
        m.id,
        m.name,
        m.gender,
        m.birth_year  AS "birthYear",
        m.death_year  AS "deathYear",
        m.generation,
        d.depth + 1   AS depth,
        d.id          AS "parentId"
      FROM members m
      JOIN parent_child pc  ON pc.child_id   = m.id
      JOIN descendants d    ON pc.parent_id  = d.id
    )
    SELECT * FROM descendants ORDER BY depth, name
  `;
  return result;
}
