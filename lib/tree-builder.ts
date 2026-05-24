interface RawNode {
  id: string;
  name: string;
  gender: string;
  birthYear: number | null;
  deathYear: number | null;
  generation: number | null;
  depth: number;
  parentId: string | null;
}

interface TreeNode {
  name: string;
  value: string;
  children: TreeNode[];
  itemStyle?: { color: string };
}

/**
 * 将递归 CTE 返回的扁平节点列表转换为 ECharts 树形结构
 * parentId 字段指向父节点 id（而非数据库中的实际父成员）
 */
export function buildTree(nodes: RawNode[], rootId: string): TreeNode | null {
  const map = new Map<string, TreeNode & { _id: string }>();

  for (const n of nodes) {
    const lifespan = n.birthYear
      ? n.deathYear
        ? `${n.birthYear}–${n.deathYear}`
        : `${n.birthYear}–`
      : "";
    const gen = n.generation ? `第${n.generation}代` : "";

    map.set(n.id, {
      _id: n.id,
      name: n.name,
      value: [n.gender === "M" ? "♂" : "♀", lifespan, gen].filter(Boolean).join(" · "),
      children: [],
      itemStyle: { color: n.gender === "M" ? "#3b82f6" : "#ec4899" },
    });
  }

  // 建立父子关系
  for (const n of nodes) {
    if (n.parentId && map.has(n.parentId) && map.has(n.id)) {
      map.get(n.parentId)!.children.push(map.get(n.id)!);
    }
  }

  return map.get(rootId) ?? null;
}
