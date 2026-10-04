import { SLOTS } from './config.js';
import { pickWinningSlot } from './services/rng.js';

interface SlotSimResult {
  slotIndex: number;
  label: string;
  expectedPct: number;
  actualCount: number;
  actualPct: number;
  diffPct: number;
}

function runSimulation(iterations = 100_000): void {
  console.log(`\n======================================================================`);
  console.log(`🎰 RUNNING MONTE CARLO SPIN SIMULATION (${iterations.toLocaleString()} iterations)`);
  console.log(`   Engine: Cryptographically Secure Hardware CSPRNG (crypto.randomInt)`);
  console.log(`======================================================================\n`);

  const counts = new Map<number, number>();
  for (let i = 0; i < SLOTS.length; i++) {
    counts.set(i, 0);
  }

  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    const winner = pickWinningSlot(SLOTS);
    counts.set(winner.index, (counts.get(winner.index) ?? 0) + 1);
  }

  const durationMs = Date.now() - startTime;

  const results: SlotSimResult[] = SLOTS.map((slot) => {
    const actualCount = counts.get(slot.index) ?? 0;
    const actualPct = (actualCount / iterations) * 100;
    const diffPct = actualPct - slot.weight;
    return {
      slotIndex: slot.index,
      label: slot.label,
      expectedPct: slot.weight,
      actualCount,
      actualPct,
      diffPct,
    };
  });

  // Print Table
  console.log(
    `┌───────┬──────────────────────┬──────────────┬──────────────┬──────────────┬───────────┐`
  );
  console.log(
    `│ Slot  │ Prize Label          │ Expected %   │ Actual Count │ Actual %     │ Variance  │`
  );
  console.log(
    `├───────┼──────────────────────┼──────────────┼──────────────┼──────────────┼───────────┤`
  );

  for (const r of results) {
    const slotStr = `#${r.slotIndex}`.padEnd(5);
    const labelStr = r.label.slice(0, 20).padEnd(20);
    const expStr = `${r.expectedPct.toFixed(2)}%`.padStart(12);
    const countStr = r.actualCount.toLocaleString().padStart(12);
    const actStr = `${r.actualPct.toFixed(2)}%`.padStart(12);
    const sign = r.diffPct >= 0 ? '+' : '';
    const diffStr = `${sign}${r.diffPct.toFixed(2)}%`.padStart(9);

    console.log(`│ ${slotStr} │ ${labelStr} │ ${expStr} │ ${countStr} │ ${actStr} │ ${diffStr} │`);
  }

  console.log(
    `└───────┴──────────────────────┴──────────────┴──────────────┴──────────────┴───────────┘`
  );

  // Aggregated Group Results
  let luckyDrawCount = 0;
  let voucher1000Count = 0;
  let voucher500Count = 0;

  for (const r of results) {
    if (r.label.toLowerCase().includes('lucky draw')) {
      luckyDrawCount += r.actualCount;
    } else if (r.label.includes('1,000') || r.label.includes('1000')) {
      voucher1000Count += r.actualCount;
    } else if (r.label.includes('500')) {
      voucher500Count += r.actualCount;
    }
  }

  const luckyDrawPct = (luckyDrawCount / iterations) * 100;
  const voucher1000Pct = (voucher1000Count / iterations) * 100;
  const voucher500Pct = (voucher500Count / iterations) * 100;

  console.log(`\n📊 VERIFICATION OF REQUIRED OUTCOME DISTRIBUTIONS (12 EQUAL SLOTS - ALL WINNING):`);
  console.log(`──────────────────────────────────────────────────────────────────────`);
  console.log(
    `1. Lucky Draw Entry × 5:       Expected: 41.67% | Actual: ${luckyDrawPct.toFixed(2)}% (${luckyDrawCount.toLocaleString()} spins) | Variance: ${(luckyDrawPct - (500/12)).toFixed(2)}%`
  );
  console.log(
    `2. Rs. 1,000 Gift Voucher × 3: Expected: 25.00% | Actual: ${voucher1000Pct.toFixed(2)}% (${voucher1000Count.toLocaleString()} spins) | Variance: ${(voucher1000Pct - 25).toFixed(2)}%`
  );
  console.log(
    `3. Rs. 500 Gift Voucher × 4:   Expected: 33.33% | Actual: ${voucher500Pct.toFixed(2)}% (${voucher500Count.toLocaleString()} spins) | Variance: ${(voucher500Pct - (400/12)).toFixed(2)}%`
  );
  console.log(`──────────────────────────────────────────────────────────────────────`);
  console.log(`⏱️ Completed in ${durationMs}ms (${Math.round(iterations / (durationMs / 1000))} spins/sec)`);

  // Verify statistically (tolerance ±1.0% on groups for 100k samples)
  const isLuckyValid = Math.abs(luckyDrawPct - (500 / 12)) < 1.0;
  const is1000Valid = Math.abs(voucher1000Pct - 25) < 1.0;
  const is500Valid = Math.abs(voucher500Pct - (400 / 12)) < 1.0;

  if (isLuckyValid && is1000Valid && is500Valid) {
    console.log(`\n✅ ALL PROBABILITY TARGETS VERIFIED AND ACCURATE WITHIN STATISTICAL TOLERANCE.\n`);
  } else {
    console.error(`\n❌ SIMULATION RESULT DEVIATED UNEXPECTEDLY FROM TARGETS.\n`);
    process.exit(1);
  }
}

runSimulation(100_000);
