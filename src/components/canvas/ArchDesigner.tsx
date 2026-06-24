"use client";

import { useCallback, useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CATEGORY_COLORS } from "@/data/sample-data";
import { useApp } from "@/context/AppContext";
import type { LibraryNode } from "@/types";

function LibraryNodeCard({ data }: NodeProps) {
  const node = data as LibraryNode;
  const color = CATEGORY_COLORS[node.category] ?? CATEGORY_COLORS.other;

  return (
    <div
      className="min-w-[140px] rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 shadow-lg"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-500" />
      <p className="text-sm font-semibold text-zinc-100">{node.label}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
        {node.category}
      </p>
      <p className="mt-1.5 text-[11px] leading-snug text-zinc-400">
        {node.description}
      </p>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-zinc-500"
      />
    </div>
  );
}

const nodeTypes = { library: LibraryNodeCard };

const POSITIONS: Record<string, { x: number; y: number }> = {
  fastapi: { x: 250, y: 0 },
  redis: { x: 80, y: 200 },
  celery: { x: 420, y: 200 },
  postgres: { x: 250, y: 400 },
};

export function ArchDesigner() {
  const { nodes: libNodes, edges: libEdges } = useApp();

  const nodes: Node<LibraryNode>[] = useMemo(
    () =>
      libNodes.map((n) => ({
        id: n.id,
        type: "library",
        position: POSITIONS[n.id] ?? { x: 0, y: 0 },
        data: n,
      })),
    [libNodes]
  );

  const edges = useMemo(
    () =>
      libEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: true,
        style: { stroke: "#52525b", strokeWidth: 2 },
        labelStyle: { fill: "#a1a1aa", fontSize: 10 },
        labelBgStyle: { fill: "#18181b", fillOpacity: 0.9 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#71717a",
        },
      })),
    [libEdges]
  );

  const onInit = useCallback(() => {}, []);

  if (nodes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-zinc-950 p-8 text-center">
        <p className="text-sm text-zinc-400">No architecture yet</p>
        <p className="max-w-sm text-xs text-zinc-600">
          Add multiple resources and ask in chat to visualize how they connect
          in your stack.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={onInit}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        className="bg-zinc-950"
      >
        <Background color="#27272a" gap={20} />
        <Controls
          className="!rounded-lg !border-zinc-700 !bg-zinc-900 !shadow-lg [&>button]:!border-zinc-700 [&>button]:!bg-zinc-800 [&>button]:!text-zinc-300 [&>button:hover]:!bg-zinc-700"
        />
      </ReactFlow>
    </div>
  );
}