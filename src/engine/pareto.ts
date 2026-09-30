/**
 * Rule 3: Cross-Channel Pareto Allocator (docs/03 §3).
 * Alokasi Global Buffer proporsional terhadap kecepatan riil tiap channel.
 */

import type { Marketplace } from "@/types/domain";

export interface ChannelAllocation {
  marketplace: Marketplace;
  velocity: number;
  ratio: number;
  allocation: number;
}

export function allocateBufferByVelocity(
  channelVelocities: Partial<Record<Marketplace, number>>,
  totalBuffer: number,
): ChannelAllocation[] {
  const entries = (
    Object.entries(channelVelocities) as [Marketplace, number | undefined][]
  ).map(([marketplace, velocity]) => ({
    marketplace,
    velocity: Math.max(0, velocity ?? 0),
  }));

  const totalVelocity = entries.reduce((sum, e) => sum + e.velocity, 0);
  if (totalVelocity <= 0) {
    return entries.map((e) => ({
      marketplace: e.marketplace,
      velocity: e.velocity,
      ratio: 0,
      allocation: 0,
    }));
  }

  return entries.map((e) => {
    const ratio = e.velocity / totalVelocity;
    return {
      marketplace: e.marketplace,
      velocity: e.velocity,
      ratio,
      allocation: Math.round(totalBuffer * ratio),
    };
  });
}
