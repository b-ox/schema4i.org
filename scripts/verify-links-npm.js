const verifyLinks = require('./verify-links');
const argv = require('minimist')(process.argv.slice(2), {
    alias: {
        t: 'timeout',
        i: 'ignoreHosts'
    }
});

(async() => {
    if (argv.help) {
        console.log('usage: npm run verify-links [-- [-t=<timeout>] [-i=<host1 host2 ...>]]');
        console.log('\ntimeout: The socket timeout (default 10000 ms).');
        console.log('ignoreHosts: skip these hosts during the test');
        return;
    }
    const timeout = argv.t;
    const ignoreHosts = (argv.i || '').split(/\s+/).filter(s => s !== '');
    const ok = await verifyLinks({
        timeout,
        ignoreHosts
    });
    if (!ok) {
        process.exit(1);
    }
})().catch((e) => {
    console.error('build failed with error: ', e);
    process.exit(1);
});