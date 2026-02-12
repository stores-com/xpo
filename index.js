const cache = require('memory-cache');

const HttpError = require('@stores.com/http-error');

function XPO(args) {
    const options = {
        url: 'https://api.ltl.xpo.com',
        ...args
    };

    /**
     * XPO LTL APIs use the OAuth 2.0 protocol for authentication and authorization using the password grant type.
     * @see https://www.xpo.com/help-center/integration-with-customer-systems/api/
     */
    this.getAccessToken = async (_options = {}) => {
        const key = `xpo_${options.username}`;
        const accessToken = cache.get(key);

        if (accessToken) {
            return accessToken;
        }

        const res = await fetch(`${options.url}/token`, {
            body: `grant_type=password&username=${encodeURIComponent(options.username)}&password=${encodeURIComponent(options.password)}`,
            headers: {
                Authorization: `Basic ${options.api_key}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            method: 'POST',
            signal: AbortSignal.timeout(_options.timeout || 30000)
        });

        if (!res.ok) {
            throw await HttpError.from(res);
        }

        const json = await res.json();

        cache.put(key, json, Number(json.expires_in) * 1000 / 2);

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
                Authorization: `Bearer ${accessToken.access_token}`
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
