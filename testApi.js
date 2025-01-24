const http = require('http');

const baseUrl = 'http://localhost:3000';

function testEndpoint(method, endpoint, body = null, expectedStatus) {
    return new Promise((resolve, reject) => {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(`${baseUrl}${endpoint}`, options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                const status = res.statusCode;
                console.log(`${method} ${endpoint}: Status ${status}, Expected ${expectedStatus}`);
                try {
                    const jsonData = JSON.parse(data);
                    console.log(`Response:`, jsonData);
                } catch (error) {
                    console.log(`Response:`, data);
                }
                resolve();
            });
        });

        req.on('error', (error) => {
            console.error(`Error testing ${endpoint}:`, error);
            reject(error);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    // Test GET endpoints
    await testEndpoint('GET', '/', null, 200);
    await testEndpoint('GET', '/albums', null, 200);
    await testEndpoint('GET', '/artists', null, 200);
    await testEndpoint('GET', '/tracks', null, 200);
    await testEndpoint('GET', '/concerts', null, 200);

    // Test POST endpoints
    await testEndpoint('POST', '/albums', { title: 'New Album', released: '2023-01-01', numTracks: 10 }, 201);
    await testEndpoint('POST', '/artists', { name: 'New Artist', bio: 'New bio' }, 201);
    await testEndpoint('POST', '/tracks', { title: 'New Track', albumId: 1, artistId: 1, duration: 300 }, 201);
    await testEndpoint('POST', '/concerts', { title: 'New Concert', date: '2023-01-01', artistId: 1 }, 201);

    // Test PUT endpoints
    await testEndpoint('PUT', '/albums/1', { title: 'Updated Album', released: '2023-01-01', numTracks: 12 }, 200);
    await testEndpoint('PUT', '/artists/1', { name: 'Updated Artist', bio: 'Updated bio' }, 200);
    await testEndpoint('PUT', '/tracks/1', { title: 'Updated Track', albumId: 1, artistId: 1, duration: 320 }, 200);
    await testEndpoint('PUT', '/concerts/1', { title: 'Updated Concert', date: '2023-01-01', artistId: 1 }, 200);

    // Test DELETE endpoints
    await testEndpoint('DELETE', '/albums/1', null, 200);
    await testEndpoint('DELETE', '/artists/1', null, 200);
    await testEndpoint('DELETE', '/tracks/1', null, 200);
    await testEndpoint('DELETE', '/concerts/1', null, 200);
}

runTests();