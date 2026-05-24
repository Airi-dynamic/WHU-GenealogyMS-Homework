import { prisma } from "../db";

export interface RelationEdge {
  memberA: string;
  memberB: string;
}

/**
 * 获取族谱内全部亲缘邻接关系（亲子 + 婚姻，双向）
 * 用于在应用层做 BFS 路径查找
 */
export async function getAllRelationEdges(genealogyId: string): Promise<RelationEdge[]> {
  const result = await prisma.$queryRaw<RelationEdge[]>`
    SELECT pc.parent_id AS "memberA", pc.child_id  AS "memberB"
    FROM parent_child pc
    JOIN members m ON m.id = pc.parent_id
    WHERE m.genealogy_id = ${genealogyId}

    UNION

    SELECT pc.child_id  AS "memberA", pc.parent_id AS "memberB"
    FROM parent_child pc
    JOIN members m ON m.id = pc.child_id
    WHERE m.genealogy_id = ${genealogyId}

    UNION

    SELECT mg.member1_id AS "memberA", mg.member2_id AS "memberB"
    FROM marriages mg
    JOIN members m ON m.id = mg.member1_id
    WHERE m.genealogy_id = ${genealogyId}

    UNION

    SELECT mg.member2_id AS "memberA", mg.member1_id AS "memberB"
    FROM marriages mg
    JOIN members m ON m.id = mg.member2_id
    WHERE m.genealogy_id = ${genealogyId}
  `;
  return result;
}

/**
 * BFS 路径查找：在应用层找两人之间最短亲缘路径
 * 返回路径上的成员 ID 列表（含两端），无路径返回 null
 */
export function findRelationPath(
  edges: RelationEdge[],
  startId: string,
  endId: string
): string[] | null {
  if (startId === endId) return [startId];

  // 构建邻接表
  const adj = new Map<string, Set<string>>();
  for (const { memberA, memberB } of edges) {
    if (!adj.has(memberA)) adj.set(memberA, new Set());
    adj.get(memberA)!.add(memberB);
  }

  // BFS
  const visited = new Set<string>([startId]);
  const queue: { id: string; path: string[] }[] = [{ id: startId, path: [startId] }];

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    const neighbors = adj.get(id) ?? new Set();

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      const newPath = [...path, neighbor];
      if (neighbor === endId) return newPath;
      visited.add(neighbor);
      queue.push({ id: neighbor, path: newPath });
    }
  }

  return null;
}
