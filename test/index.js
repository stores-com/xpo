const assert = require('node:assert');
const test = require('node:test');

const XPO = require('../index');

test('getAccessToken', { concurrency: true }, async (t) => {
    t.test('should return an error for invalid url', async () => {
        const xpo = new XPO({
            url: 'invalid'
        });

        await assert.rejects(xpo.getAccessToken(), { message: 'Failed to parse URL from invalid/token' });
    });

    t.test('should return an error for non 200 status code', async () => {
        const xpo = new XPO({
            url: 'https://httpbingo.org/status/500#'
        });

        await assert.rejects(xpo.getAccessToken(), (err) => {
            assert.strictEqual(err.name, 'HttpError');
            assert.match(err.message, /^500/);
            return true;
        });
    });

    t.test('should return a valid access token', async () => {
        const xpo = new XPO({
            api_key: process.env.XPO_API_KEY,
            password: process.env.XPO_PASSWORD,
            username: process.env.XPO_USERNAME
        });

        const accessToken = await xpo.getAccessToken();

        assert(accessToken);
        assert(accessToken.access_token);
        assert(accessToken.expires_in);
        assert(accessToken.refresh_token);
        assert.strictEqual(accessToken.token_type, 'Bearer');
    });

    t.test('should return the same access token on subsequent calls', async () => {
        const xpo = new XPO({
            api_key: process.env.XPO_API_KEY,
            password: process.env.XPO_PASSWORD,
            username: process.env.XPO_USERNAME
        });

        const accessToken1 = await xpo.getAccessToken();
        const accessToken2 = await xpo.getAccessToken();

        assert.deepStrictEqual(accessToken2, accessToken1);
    });
});

// Not concurrent: two of these tests mock the global fetch
test('getShipmentStatus', async (t) => {
    // Mocked: XPO ages PRO numbers out and then answers 404, as it did for 235825413 by October 2026.
    // The username keeps the mocked token out of the live tests' memory-cache entry (`xpo_${username}`)
    await t.test('should return shipment status for a valid PRO number', async (t) => {
        const fetch = t.mock.method(globalThis, 'fetch', (url) => {
            if (url.endsWith('/token')) {
                return Promise.resolve(Response.json({ access_token: 'mock-token', expires_in: '3600', token_type: 'Bearer' }));
            }

            return Promise.resolve(Response.json({
                code: '200',
                data: {
                    shipmentStatusDtls: [{
                        proNbr: '235825413',
                        shipmentStatus: {
                            reason: 'Delivered',
                            statusCd: '23'
                        }
                    }]
                }
            }));
        });

        const xpo = new XPO({
            api_key: 'test-api-key',
            password: 'test-password',
            username: 'test-username-mocked'
        });

        const status = await xpo.getShipmentStatus('235825413');

        assert.strictEqual(fetch.mock.calls.at(-1).arguments[0], 'https://api.ltl.xpo.com/tracking/1.0/shipments/shipment-status-details?referenceNumbers=235825413');
        assert.strictEqual(fetch.mock.calls.at(-1).arguments[1].headers.Authorization, 'Bearer mock-token');
        assert(status);
        assert.strictEqual(status.code, '200');
        assert(status.data);
        assert(status.data.shipmentStatusDtls);
        assert(status.data.shipmentStatusDtls.length > 0);
        assert.strictEqual(status.data.shipmentStatusDtls[0].proNbr, '235825413');
    });

    // Mocked for the same reason; 282872811 is the PRO number in XPO's Shipment Tracking guide
    await t.test('should return shipment status for multiple PRO numbers', async (t) => {
        const fetch = t.mock.method(globalThis, 'fetch', (url) => {
            if (url.endsWith('/token')) {
                return Promise.resolve(Response.json({ access_token: 'mock-token', expires_in: '3600', token_type: 'Bearer' }));
            }

            return Promise.resolve(Response.json({
                code: '200',
                data: {
                    shipmentStatusDtls: [
                        { proNbr: '235825413' },
                        { proNbr: '282872811' }
                    ]
                }
            }));
        });

        const xpo = new XPO({
            api_key: 'test-api-key',
            password: 'test-password',
            username: 'test-username-mocked'
        });

        const status = await xpo.getShipmentStatus(['235825413', '282872811']);

        assert.strictEqual(fetch.mock.calls.at(-1).arguments[0], 'https://api.ltl.xpo.com/tracking/1.0/shipments/shipment-status-details?referenceNumbers=235825413&referenceNumbers=282872811');
        assert(status);
        assert.strictEqual(status.code, '200');
        assert(status.data.shipmentStatusDtls.length > 0);
    });

    await t.test('should return an error for unknown PRO number', async () => {
        const xpo = new XPO({
            api_key: process.env.XPO_API_KEY,
            password: process.env.XPO_PASSWORD,
            username: process.env.XPO_USERNAME
        });

        await assert.rejects(xpo.getShipmentStatus('000000000'), (err) => {
            assert.strictEqual(err.name, 'HttpError');
            assert.match(err.message, /^404/);
            return true;
        });
    });
});
