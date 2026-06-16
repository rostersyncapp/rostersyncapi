async function testESPNHistory() {
  console.log('--- Checking ESPN NCAA Football History Limits ---');

  for (let year = 2026; year >= 1990; year--) {
    const url = `https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/${year}/teams/2/athletes?limit=1000`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        const count = data.items ? data.items.length : 0;
        console.log(`✅ Season ${year} exists: Auburn roster has ${count} athlete references`);
      } else {
        console.log(`❌ Season ${year} returned HTTP ${res.status}`);
        break;
      }
    } catch (err: any) {
      console.error(`Error checking ${year}:`, err.message);
      break;
    }
  }
}

testESPNHistory();
