const http = require('http');

const baseUrl = 'http://localhost:3000';

/**
 * Below is a description of the data that is needed for each API endpoint
 * 
 * GET /artists/by-id/:id -
 *  URL Parameter: id (required, number)
 * GET /artists - 
 *  No body required
 * POST /artists -
 *  Body:
 *      name (required, string)
 *      bio (required, string)
 *      socials (required, array of strings, can have 0 elements)
 * PATCH /artists/by-id/:id -
 *  URL Parameter: 
 *      id (required, number)
 *  Body: 
 *      name? (string)
 *      bio?: (string)
 *      socials?: (object)
 * 
 * GET /albums - 
 *      No body required
 * GET /albums/by-id/:id
 *     URL Parameter: id (required, number)
 * GET /albums/by-title/:title
 *    URL Parameter: title (required, string)
 * POST /albums
 *   Body:
 *      title (required, string)
 *      genre (required, string)
 *      releaseYear (required, number)
 * DELETE /albums/by-id/:id -
 *   URL Parameter: id (required, number)
 * 
 * GET /tracks/by-album/:albumID
 *  URL Parameter: albumID (required, number)
 * GET /tracks/by-id/:id
 *   URL Parameter: id (required, number)
 * POST /tracks - Body: { pos: number, title: string, duration: number, albumID?: number, artistID: number }
 * 
 * GET /concerts/by-date/:startDate/:endDate
 *   URL Parameter: startDate (required, string), endDate (required, string)
 * PATCH /concerts/by-id/:id
 *   Body: 
 *      name?: string, startDate?: string, durationMinutes?: number }
 */

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
    // Artists
    await testEndpoint('POST', '/artists', { name: 'Artist Name', bio: 'Artist Bio', socials: ['http://social1.com', 'http://social2.com'] }, 201);
    await testEndpoint('GET', '/artists', null, 200);
    await testEndpoint('GET', '/artists/by-id/1', null, 200);
    await testEndpoint('PATCH', '/artists/by-id/1', { name: 'Updated Artist Name' }, 200);

    // Albums
    await testEndpoint('POST', '/albums', { title: 'Album Title', genre: 'Genre', releaseYear: 2021 }, 201);
    await testEndpoint('GET', '/albums', null, 200);
    await testEndpoint('GET', '/albums/by-id/1', null, 200);
    await testEndpoint('GET', `/albums/by-title/${encodeURIComponent('Album Title')}`, null, 200);
    await testEndpoint('DELETE', '/albums/by-id/1', null, 204);

    // Tracks
    await testEndpoint('POST', '/tracks', { pos: 1, title: 'Track Title', duration: 300, artistID: 1, albumID: 1 }, 201);
    await testEndpoint('GET', '/tracks/by-album/1', null, 200);
    await testEndpoint('GET', '/tracks/by-id/1', null, 200);

    // Concerts
    await testEndpoint('GET', '/concerts/by-date/2023-01-01/2023-12-31', null, 200);
    await testEndpoint('PATCH', '/concerts/by-id/1', { name: 'Updated Concert Name', startDate: '2023-01-01', durationMinutes: 120 }, 200);
}

runTests();