import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function createQAStudent() {
  try {
    console.log('Creating QA student account...');
    const response = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'qa_student',
        password: 'password123',
        role: 'student',
        name: 'QA Student',
        email: 'qa_student@example.com',
        schoolName: 'Test School',
        className: '10A',
        section: 'A'
      })
    });

    if (response.ok) {
      console.log('QA student created successfully');
    } else {
      const error = await response.text();
      console.log(`QA student creation failed: ${error}`);
    }
  } catch (err) {
    console.error('Error creating QA student:', err);
  }
}

async function createQATeacher() {
  try {
    console.log('Creating QA teacher account...');
    const response = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'qa_teacher',
        password: 'password123',
        role: 'teacher',
        name: 'QA Teacher',
        email: 'qa_teacher@example.com',
        schoolName: 'Test School',
        subject: 'Computer Science'
      })
    });

    if (response.ok) {
      console.log('QA teacher created successfully');
    } else {
      const error = await response.text();
      console.log(`QA teacher creation failed: ${error}`);
    }
  } catch (err) {
    console.error('Error creating QA teacher:', err);
  }
}

async function main() {
  await createQAStudent();
  await createQATeacher();
  console.log('Done creating QA accounts');
}

main();