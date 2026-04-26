const { MongoClient } = require('mongodb');

async function checkSchools() {
  const client = new MongoClient('mongodb://localhost:27017/ecoverse');
  await client.connect();
  const db = client.db('ecoverse');

  const schools = await db.collection('schools').find({}).toArray();
  console.log('Schools in database:');
  schools.forEach(s => console.log(`  ${s.id} -> ${s.name}`));

  await client.close();
}

checkSchools().catch(console.error);