const cache = require('memory-cache');

const HttpError = require('./http-error');

function XPO(args) {
    const options = {
        url: 'https://api.ltl.xpo.com',
        ...args
    };

    /**
     * XPO LTL APIs use the OAuth 2.0 protocol for authentication and authorization using the password grant type.
     * The access token is valid for 12 hours. The refresh token is valid for 24 hours.
     * Once the access token expires, the refresh token can be used to generate a new pair of tokens.
     * @see https://www.xpo.com/help-center/integration-with-customer-systems/api/
     */
    this.getAccessToken = async (_options = {}) => {
        const accessTokenKey = `xpo_access_${options.username}`;
        const accessToken = cache.get(accessTokenKey);

        if (accessToken) {
            return accessToken;
        }

        const refreshTokenKey = `xpo_refresh_${options.username}`;
        const refreshToken = cache.get(refreshTokenKey);

        if (refreshToken) {
            return await this.refreshAccessToken(refreshToken);
        }

        const res = await fetch(`${options.url}/token`, {
            body: `grant_type=password&username=${encodeURIComponent(options.username)}&password=${encodeURIComponent(options.password)}`,
            headers: {
                'Authorization': `Basic ${options.api_key}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            method: 'POST',
            signal: AbortSignal.timeout(_options.timeout || 30000)
        });

        if (!res.ok) {
            throw await HttpError.from(res);
        }

        const json = await res.json();

        cache.put(accessTokenKey, json, Number(json.expires_in) * 1000 / 2);
        cache.put(refreshTokenKey, json.refresh_token, Number(json.expires_in) * 1000);

        return json;
    };

    /**
     * Uses a refresh token to obtain a new access token without re-sending user credentials.
     * @see https://www.xpo.com/help-center/integration-with-customer-systems/api/
     */
    this.refreshAccessToken = async (refreshToken, _options = {}) => {
        const res = await fetch(`${options.url}/token`, {
            body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
            headers: {
                'Authorization': `Basic ${options.api_key}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            method: 'POST',
            signal: AbortSignal.timeout(_options.timeout || 30000)
        });

        if (!res.ok) {
            cache.del(`xpo_access_${options.username}`);
            cache.del(`xpo_refresh_${options.username}`);

            return await this.getAccessToken();
        }

        const json = await res.json();

        const accessTokenKey = `xpo_access_${options.username}`;
        const refreshTokenKey = `xpo_refresh_${options.username}`;

        cache.put(accessTokenKey, json, Number(json.expires_in) * 1000 / 2);
        cache.put(refreshTokenKey, json.refresh_token, Number(json.expires_in) * 1000);

        return json;
    };

    /**
     * Retrieves status and basic details about a shipment that match the search criteria based on PRO number(s) and/or customer reference number(s).
     * @see https://www.xpo.com/cdn/files/s1/XPO_API_Shipment_Tracking_Guide.pdf
     */
    this.getShipmentStatus = async (referenceNumbers, _options = {}) => {
        const accessToken = await this.getAccessToken();

        if (!Array.isArray(referenceNumbers)) {
            referenceNumbers = [referenceNumbers];
        }

        const query = referenceNumbers.map(r => `referenceNumbers=${encodeURIComponent(r)}`).join('&');

        const res = await fetch(`${options.url}/tracking/1.0/shipments/shipment-status-details?${query}`, {
            headers: {
                'Authorization': `Bearer ${accessToken.access_token}`
            },
            signal: AbortSignal.timeout(_options.timeout || 30000)
        });

        if (!res.ok) {
            throw await HttpError.from(res);
        }

        return await res.json();
    };
}

module.exports = XPO;
