import { searchMarketProducts } from '../lib/server/services/marketSearch';

async function testSerpApi() {
  console.log('🔍 Testing SerpApi Google Shopping Market Search...');
  
  process.env.SERPAPI_API_KEY = '33c49c4bd003cba7cde8717b9931cd6f35bb8ff55834f841067bf7561db91659';

  const res = await searchMarketProducts({
    query: 'plastic chairs',
    location: 'Chennai, Tamil Nadu, India'
  });

  console.log('Search Response Status:', res.success);
  console.log('Total Results Found:', res.total);
  console.log('Top 5 Count:', res.top5.length);

  if (res.results.length > 0) {
    console.log('\n--- Sample Real Result ---');
    const sample = res.results[0];
    console.log('ID:', sample.id);
    console.log('Title:', sample.title);
    console.log('Merchant:', sample.merchantName);
    console.log('Observed Price:', sample.observedPriceText);
    console.log('Rating:', sample.rating, `(${sample.reviewCount} reviews)`);
    console.log('Product URL:', sample.productUrl);
    console.log('Thumbnail:', sample.thumbnailUrl);
    console.log('Availability:', sample.availability);
    console.log('Contact Placeholder:', sample.contact);
    console.log('Source Label:', sample.sourceLabel);
    console.log('--------------------------\n');
  } else {
    console.log('Message / Error:', res.message || res.error);
  }

  if (res.success && res.results.length > 0) {
    console.log('✅ SerpApi Google Shopping market search integration working perfectly!');
  } else {
    console.error('❌ SerpApi search returned 0 results or failed.');
    process.exit(1);
  }
}

testSerpApi().catch(console.error);
