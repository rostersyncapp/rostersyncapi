async function testUrl() {
  const url = 'https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/2026/teams/2/athletes?limit=1000';
  console.log('Testing URL:', url);
  try {
    const res = await fetch(url);
    console.log(`HTTP Status: ${res.status}`);
    if (res.ok) {
      const data: any = await res.json();
      console.log('Sample athlete count:', data.items?.length);
    } else {
      const text = await res.text();
      console.log('Response body:', text);
    }
  } catch (err: any) {
    console.error(err);
  }
}

testUrl();
