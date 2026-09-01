async function testHttpBin() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">Vanakkam. This is Sadwik calling from Procura Technologies regarding 500 units of big chairs from DKK Chairs. We noted your initial quote of 7000 rupees. If we confirm 500 units today with prompt payment, can you offer 6200 with door delivery to Chennai?</Say>
  <Pause length="3"/>
  <Say voice="Polly.Aditi" language="en-IN">Thank you. I have recorded your quote and will review it with the buyer for purchase order confirmation.</Say>
</Response>`;

  const base64 = Buffer.from(xml).toString('base64');
  const url = `https://httpbin.org/base64/${base64}`;

  const res = await fetch(url);
  const text = await res.text();
  console.log('HTTP Status:', res.status);
  console.log('Returned Content-Type:', res.headers.get('content-type'));
  console.log('Returned Body:', text);
}

testHttpBin().catch(console.error);
