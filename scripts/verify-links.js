/*
 * This node.js build script collects the configuration files
 * of the Semantic Data Model for insurances and transforms it
 * to JSON-LD context files writing to the dist directory.
 */

const fs = require("fs").promises;
const http = require('http');
const https = require('https');

// configuration
const fromPath = "src/";

const httpAgent = new http.Agent({
    keepAlive: true
})
const httpsAgent = new https.Agent({
    keepAlive: true
});

function getAsync(url, reqOptions) {
    if (reqOptions.ignoredHosts.some(regexp => regexp.test(url))) {
        return `IGNORED: ${url}`;
    }
    const isHttps = url.toLowerCase().startsWith('https:');
    const agent = isHttps ? httpsAgent : httpAgent;
    const method = isHttps ? https.get : http.get;
    return new Promise((resolve, reject) => {
        try {
            const req = method(url, {
                agent,
                timeout: reqOptions.timeout || 10000
            }, (res) => {
                if (res.statusCode > 299 && res.statusCode < 400) {
                    const {location} = res.headers;
                    if (location === url) {
                        reject('redirection loop');
                    } else {
                        getAsync(location, reqOptions).then(resolve, reject);
                    }
                } else {
                    resolve(res);
                }
            });
            req.on('error', (err) => {
                reject(err);
            });
            req.on('timeout', (err) => {
                req.abort();
                reject('socket timeout');
            });
            req.end();
        } catch (e) {
            reject(e);
        }
    });
}

// verify links
async function verifyLinks(options, consoleLike) {
    
    consoleLike = Object.assign({}, console, consoleLike);

    const failures = [];
    const ignoredHosts = [];

    const requestOptions = {
        ignoredHosts: [],
        timeout: options.timeout
    }

    if (options && options.ignoreHosts) {
        requestOptions.ignoredHosts.push(...options.ignoreHosts.map((host) => {
            return new RegExp(`^(https?:\/\/)${host.replace(/(\.|\+|\?|\*|\$|\\|\|)/g, '\\$1')}`, 'i');
        }));
    }

    // process all jsonld files
    const files = await fs.readdir(fromPath);
    // export context from src files
    for (const file of files) {
        consoleLike.log("\nChecking " + file);
        if (file.endsWith(".src.json")) {
            let data = await fs.readFile(fromPath + file, 'utf-8');

            // parse data
            const obj = JSON.parse(data);
            
            if (!obj.links || !Array.isArray(obj.links)) {
                consoleLike.log('WARNING: Contains no links.');
                continue;
            }
            
            for (const link of obj.links) {
                const {url} = link;
                try {
                    const res = await getAsync(url, requestOptions);
                    if (typeof res === 'string' && res.startsWith('IGNORED')) {
                        ignoredHosts.push(res);
                        continue;
                    }
                    if (!res.statusCode || res.statusCode < 200 || res.statusCode > 299) {
                        failures.push([url, `${res.statusCode}: ${res.statusMessage}`]);
                    }
                } catch (e) {
                    failures.push([url, e.toString()]);
                }
            }

        } else {
            consoleLike.log("WARNING: Ignore file.");
        }
    };

    if (ignoredHosts.length) {
        consoleLike.log("Skipped following urls:");
        ignoredHosts.forEach(url => {
            consoleLike.log(url);
        });
    }

    if (!failures.length) {
        consoleLike.log("All links checked successfully.");
        return true;
    } else {
        consoleLike.log("Following links FAILED:");
        for (const failure of failures) {
            consoleLike.log(`${failure[0]} (${failure[1]})`);
        }
        return false;
    }
}

module.exports = verifyLinks;