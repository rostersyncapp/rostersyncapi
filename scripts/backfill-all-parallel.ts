import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const leagues = [
  'nfl',
  'la-liga',
  'premier-league',
  'serie-a',
  'bundesliga',
  'eredivisie',
  'mls',
  'liga-mx',
  'usl',
  'wnba',
  'nba',
  'nhl',
  'nwsl',
  'mlb'
];

const CONCURRENCY = 5;

async function worker(queue: string[]) {
  while (queue.length > 0) {
    const league = queue.shift();
    if (!league) break;
    console.log(`[Worker] ⏳ Starting backfill for ${league.toUpperCase()}...`);
    try {
      const { stdout } = await execAsync(`npx tsx scripts/backfill-physical-stats.ts --league ${league}`);
      console.log(`[Worker] ✅ Completed ${league.toUpperCase()}`);
    } catch (error: any) {
      console.error(`[Worker] ❌ Failed ${league.toUpperCase()}:`, error.message);
    }
  }
}

async function main() {
  console.log(`🚀 Starting parallel backfill with concurrency limit of ${CONCURRENCY}...`);
  const queue = [...leagues];
  const workers = Array.from({ length: CONCURRENCY }, () => worker(queue));
  await Promise.all(workers);
  console.log('✨ All backfills completed!');
}

main().catch(console.error);
