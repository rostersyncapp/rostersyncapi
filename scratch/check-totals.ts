import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function runCheck() {
  const { count: totalCount, error: err1 } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true });

  const { count: ncaaCount, error: err2 } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .ilike('league', '%ncaa%');

  const { count: fbCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('league', 'ncaa');

  const { count: mbbCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('league', 'ncaa-mens-basketball');

  const { count: wbbCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('league', 'ncaa-womens-basketball');

  console.log({
    totalCount,
    ncaaCount,
    fbCount,
    mbbCount,
    wbbCount,
    nonNcaaCount: (totalCount || 0) - (ncaaCount || 0)
  });
}

runCheck();
