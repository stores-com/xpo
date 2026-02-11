const assert = require('node:assert');
const test = require('node:test');

const cache = require('memory-cache');

const XPO = require('../index');

test('getAccessToken', { concurrency: true }, async (t) => {
    t.afterEach(() => {
        cache.clear();
    });

    t.test('should return an error for invalid url', async () => {
        const xpo = new XPO({
            url: 'invalid'
        });

        await assert.rejects(xpo.getAccessToken(), { message: 'Failed to parse URL from invalid/token' });
    });

    t.test('should return an error for non 200 status code', async () => {
        const xpo = new XPO({
            url: 'https://httpbin.org/status/500#'
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

    t.test('should use refresh token when access token is expired', async () => {
        const xpo = new XPO({
            api_key: process.env.XPO_API_KEY,
            password: process.env.XPO_PASSWORD,
            username: process.env.XPO_USERNAME
        });

        const accessToken1 = await xpo.getAccessToken();

        cache.del(`xpo_access_${process.env.XPO_USERNAME}`);

        const accessToken2 = await xpo.getAccessToken();

        assert(accessToken2);
        assert(accessToken2.access_token);
        assert.notStrictEqual(accessToken2.access_token, accessToken1.access_token);
    });
});

test('refreshAccessToken', { concurrency: true }, async (t) => {
    t.afterEach(() => {
        cache.clear();
    });

    t.test('should fall back to password grant when refresh token is invalid', async () => {
        const xpo = new XPO({
            api_key: process.env.XPO_API_KEY,
            password: process.env.XPO_PASSWORD,
            username: process.env.XPO_USERNAME
        });

        const accessToken = await xpo.refreshAccessToken('invalid_refresh_token');

        assert(accessToken);
        assert(accessToken.access_token);
        assert(accessToken.refresh_token);
    });
});

test('getShipmentStatus', { concurrency: true }, async (t) => {
    t.afterEach(() => {
        cache.clear();
    });

    t.test('should return shipment status for a valid PRO number', async () => {
        const xpo = new XPO({
            api_key: process.env.XPO_API_KEY,
            password: process.env.XPO_PASSWORD,
            username: process.env.XPO_USERNAME
        });

        const status = await xpo.getShipmentStatus('235825413');

        assert(status);
        assert.strictEqual(status.code, '200');
        assert(status.data);
        assert(status.data.shipmentStatusDtls);
        assert(status.data.shipmentStatusDtls.length > 0);
        assert.strictEqual(status.data.shipmentStatusDtls[0].proNbr, '235825413');
    });

    t.test('should return shipment status for multiple PRO numbers', async () => {
        const xpo = new XPO({
            api_key: process.env.XPO_API_KEY,
            password: process.env.XPO_PASSWORD,
            username: process.env.XPO_USERNAME
        });

        const status = await xpo.getShipmentStatus(['235825413']);

        assert(status);
        assert.strictEqual(status.code, '200');
        assert(status.data.shipmentStatusDtls.length > 0);
    });

    t.test('should return an error for unknown PRO number', async () => {
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
