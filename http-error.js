class HttpError extends Error {
    constructor(response) {
        super(`${response.status} ${response.statusText}`, { cause: response });
        this.name = 'HttpError';
    }

    static async from(response) {
        const err = new HttpError(response);
        err.text = await response.clone().text().catch(() => {});

        if (err.text) {
            try {
                err.json = JSON.parse(err.text);
            } catch {
                // Response body is not JSON
            }
        }

        return err;
    }
}

module.exports = HttpError;
