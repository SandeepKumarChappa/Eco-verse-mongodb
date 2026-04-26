const fetch = require('node-fetch');

async function testEndpoint() {
  try {
    const response = await fetch('http://localhost:5000/api/admin/assignment-submissions?page=1&limit=5', {
      headers: {
        'x-username': 'admin'
      }
    });
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response size:', JSON.stringify(data).length, 'characters');
    console.log('Data structure:', {
      hasData: Array.isArray(data.data),
      dataLength: data.data?.length,
      hasTotal: typeof data.total === 'number',
      hasPage: typeof data.page === 'number',
      hasTotalPages: typeof data.totalPages === 'number'
    });
    if (data.data && data.data.length > 0) {
      console.log('Sample item:', data.data[0]);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testEndpoint();