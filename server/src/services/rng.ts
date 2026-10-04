import crypto from 'node:crypto';
import type { SlotConfig } from '../../../shared/types.js';

/**
 * Cryptographically secure weighted random slot selection.
 * Uses crypto.randomInt (hardware-backed OS CSPRNG) instead of Math.random.
 *
 * All weights (e.g. 15.0%, 2.5%, 7.5%) are scaled by 100 to integer basis points (10,000 total).
 */
export function pickWinningSlot(slots: readonly SlotConfig[]): SlotConfig {
  if (slots.length === 0) {
    throw new Error('Cannot pick from an empty slot list');
  }

  // Calculate cumulative integer scale (basis points: 1% = 100 bps, sum = 10,000)
  const SCALE = 100;
  const cumulativeThresholds: { slot: SlotConfig; upperLimit: number }[] = [];
  let runningTotal = 0;

  for (const slot of slots) {
    const basisPoints = Math.round(slot.weight * SCALE);
    runningTotal += basisPoints;
    cumulativeThresholds.push({
      slot,
      upperLimit: runningTotal,
    });
  }

  if (runningTotal === 0) {
    throw new Error('Total slot weights cannot be zero');
  }

  // Generate cryptographically secure random integer in [0, runningTotal - 1]
  const randomValue = crypto.randomInt(0, runningTotal);

  for (const threshold of cumulativeThresholds) {
    if (randomValue < threshold.upperLimit) {
      return threshold.slot;
    }
  }

  // Fallback to last slot if boundary edge case occurs
  const fallback = slots[slots.length - 1];
  if (!fallback) {
    throw new Error('Failed to resolve winning slot');
  }
  return fallback;
}
