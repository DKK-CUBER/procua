async function testPasteRs() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">Vanakkam. This is Sadwik calling from Procura Technologies regarding 500 units of big chairs from DKK Chairs.</Say>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="en-IN">We noted your initial quote of 7000 rupees. If we confirm all 500 units today with 30 percent advance payment, can you offer 6200 rupees per unit with door delivery to Chennai?</Say>
  <Pause length="3"/>
  <Say voice="Polly.Aditi" language="en-IN">Thank you. I have recorded your commercial quote details and will submit them to the procurement manager for final purchase order confirmation.</Say>
</Response>`;

  const res = await fetch('https://paste.rs', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: xml
  });

  const rawUrl = (await res.text()).trim();
  console.log('paste.rs URL:', rawUrl);

  const check = await fetch(rawUrl);
  console.log('Check Status:', check.status);
  console.log('Check Body:\n', await check.text());

  return rawUrl;
}

testPasteRs().catch(console.error);
