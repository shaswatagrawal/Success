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
  let tryAgainCount = 0;
  let grandPrizeCount = 0;
  let normalPrizesCount = 0;

  for (const r of results) {
    if (r.label === 'Try Again Later') {
      tryAgainCount += r.actualCount;
    } else if (r.label === 'GRAND PRIZE') {
      grandPrizeCount += r.actualCount;
    } else {
      normalPrizesCount += r.actualCount;
    }
  }

  const tryAgainPct = (tryAgainCount / iterations) * 100;
  const grandPrizePct = (grandPrizeCount / iterations) * 100;
  const normalPrizesPct = (normalPrizesCount / iterations) * 100;

  console.log(`\n📊 VERIFICATION OF REQUIRED PROBABILITY GROUPS:`);
  console.log(`──────────────────────────────────────────────────────────────────────`);
  console.log(
    `1. Try Again Later (4 slots): Expected: 60.00% | Actual: ${tryAgainPct.toFixed(2)}% (${tryAgainCount.toLocaleString()} spins) | Variance: ${(tryAgainPct - 60).toFixed(2)}%`
  );
  console.log(
    `2. GRAND PRIZE (1 slot):      Expected:  2.50% | Actual:  ${grandPrizePct.toFixed(2)}% (${grandPrizeCount.toLocaleString()} spins) | Variance: ${(grandPrizePct - 2.5).toFixed(2)}%`
  );
  console.log(
    `3. Normal Prizes (5 slots):   Expected: 37.50% | Actual: ${normalPrizesPct.toFixed(2)}% (${normalPrizesCount.toLocaleString()} spins) | Variance: ${(normalPrizesPct - 37.5).toFixed(2)}%`
  );
  console.log(`──────────────────────────────────────────────────────────────────────`);
  console.log(`⏱️ Completed in ${durationMs}ms (${Math.round(iterations / (durationMs / 1000))} spins/sec)`);

  // Verify statistically (tolerance ±1.0% on groups for 100k samples)
  const isTryAgainValid = Math.abs(tryAgainPct - 60) < 1.0;
  const isGrandPrizeValid = Math.abs(grandPrizePct - 2.5) < 0.5;
  const isNormalPrizesValid = Math.abs(normalPrizesPct - 37.5) < 1.0;

  if (isTryAgainValid && isGrandPrizeValid && isNormalPrizesValid) {
    console.log(`\n✅ ALL PROBABILITY TARGETS VERIFIED AND ACCURATE WITHIN STATISTICAL TOLERANCE.\n`);
  } else {
    console.error(`\n❌ SIMULATION RESULT DEVIATED UNEXPECTEDLY FROM TARGETS.\n`);
    process.exit(1);
  }
}

runSimulation(100_000);
