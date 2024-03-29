const buildSchema = require('./build');
const path = require("path");
const argv = require('minimist')(process.argv.slice(2), {
    alias: {
        o: 'outputDir',
        s: 'includeSource',
        q: 'quiet'
    }
});

(async() => {
    const environment = argv._[0];
    if (!environment || argv.help) {
        console.log('usage: npm run build [-- [-o=<OutputDir>] [-s=<SourceDir>]] <HostURL>');
        console.log('\nHostURL: The URL that will be used to host the resulting schema.');
        console.log('-o|--outputDir (optional): The directory where the jsonld-files will be placed. Defaults to ../<HostURL>.');
        console.log('-s|--includeSource (optional): A directory inside the outputDir where the source-files will be copied to. Omitted if empty.');
        console.log('-q|--quiet (optional): Reduce log output.');
        return;
    }
    const hostUrl = environment.replace(/^[^:/]+:\/\//, '');
    const outputDir = argv.o || `../${hostUrl}`;
    const sourceDir = argv.s;
    const quiet = !!argv.q;
    const logger = quiet ? { log: () => {} } : undefined;
    await buildSchema(hostUrl, path.resolve(outputDir), sourceDir, logger);
})().catch((e) => {
    console.error('build failed with error: ', e);
    process.exit(1);
});