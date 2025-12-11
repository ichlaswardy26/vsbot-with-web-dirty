const fetch = require("node-fetch");

module.exports = {
    async request(url, requestData) {
        if (!url) return null;
        try {
            let res = await fetch(url, requestData);
            let buffer = await res.buffer();
            let headers = res.headers.raw();
            let data = buffer.toString();
            try {
                data = JSON.parse(data);
            } catch {
                // do nothing
            }
            return { data, buffer, headers, status: res.status };
        } catch {
            return null;
        }
    },
}