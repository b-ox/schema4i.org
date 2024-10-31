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

/**
 * 
 * @param {string} url 
 * @param {{ignoredHosts: RegExp[], timeout: number}} reqOptions 
 * @returns 
 */
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
                timeout: reqOptions.timeout
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
                req.destroy();
                reject('socket timeout');
            });
            req.end();
        } catch (e) {
            reject(e);
        }
    });
}

// verify links
/**
 * Checks that urls contained in the links field of all *.src.json files are reachable.
 * 
 * @param {{
 *  timeout?: number,
 *  ignoreHosts?: string[],
 *  consoleLike?: Console,
 *  }} options options for the verification
 * @param options.timeout timeout for web requests in milliseconds. Default is 10000.
 * @param options.ignoreHosts list of hosts to ignore. Default is empty.
 * @param options.consoleLike console-like object to use for logging. Default is console.
 * @returns true if all links are reachable, false otherwise
 */
async function verifyLinks(options) {
    
    let consoleLike = console;

    if (arguments.length > 1) {
        consoleLike = Object.assign({}, console, arguments[1]);
        consoleLike.warn('WARN: Passing separate arguments is deprecated. Use "verifyLinks(options)" syntax instead.');
    } else {
        consoleLike = Object.assign({}, console, options.consoleLike);
    }

    const failures = [];
    const ignoredHosts = [];

    const requestOptions = {
        ignoredHosts: (options?.ignoreHosts ?? []).map((host) => {
            return new RegExp(`^(https?:\/\/)${host.replace(/(\.|\+|\?|\*|\$|\\|\|)/g, '\\$1')}`, 'i');
        }),
        timeout: options?.timeout ?? 10000,
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