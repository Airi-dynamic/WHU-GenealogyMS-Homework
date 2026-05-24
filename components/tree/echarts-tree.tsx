"use client";
import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface TreeNode {
  name: string;
  value?: string;
  children?: TreeNode[];
  itemStyle?: object;
}

interface EChartsTreeProps {
  data: TreeNode;
  height?: number;
  orient?: "LR" | "TB" | "RL" | "BT";
}

export function EChartsTree({ data, height = 500, orient = "TB" }: EChartsTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current);
    }

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const d = params.data;
          return `<b>${d.name}</b>${d.value ? `<br/>${d.value}` : ""}`;
        },
      },
      series: [
        {
          type: "tree",
          data: [data],
          orient,
          symbol: "circle",
          symbolSize: 10,
          roam: true,
          initialTreeDepth: 4,
          label: {
            position: orient === "LR" || orient === "RL" ? "left" : "top",
            verticalAlign: "middle",
            fontSize: 12,
            color: "#374151",
          },
          leaves: {
            label: {
              position: orient === "LR" || orient === "RL" ? "right" : "bottom",
            },
          },
          lineStyle: { color: "#d1d5db", width: 1.5 },
          itemStyle: { color: "#10b981", borderColor: "#059669", borderWidth: 2 },
          emphasis: {
            focus: "descendant",
            itemStyle: { color: "#059669" },
          },
          expandAndCollapse: true,
          animationDuration: 300,
        },
      ],
    };

    chartRef.current.setOption(option);

    const handleResize = () => chartRef.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [data, orient]);

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}
