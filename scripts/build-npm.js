const buildSchema = require('./build');
const path = require("path");
const argv = require('minimist')(process.argv.slice(2), {
    alias: {
        o: 'outputDir',
        s: 'includeSource',
        q: 'quiet',
        p: 'placeholders'
    }
});

(async() => {
    const schemaUrl = argv._[0];
    if (!schemaUrl || argv.help) {
        console.log('usage: npm run build [-- [-o=<OutputDir>] [-s=<SourceDir>]] <SchemaURL>');
        console.log('\nSchemaURL: The URL that will be used to host the resulting schema.');
        console.log('-o|--outputDir (optional): The directory where the jsonld-files will be placed. Defaults to ../<SchemaURL>.');
        console.log('-s|--includeSource (optional): A directory inside the outputDir where the source-files will be copied to. Omitted if empty.');
        console.log('-p|--placeholders (optional): One or multiple comma-delimited domain names that are replaced in the schema files with the domain name of the schema URL.');
        console.log('-q|--quiet (optional): Reduce log output.');
        return;
    }
    const domain = schemaUrl.replace(/^[^:/]+:\/\//, '');
    const outputDir = argv.o || `../${domain}`;
    const placeholders = argv.p ? argv.p.split(',') : [];
    const options = {
        outputSourceDir: argv.s,
        schemaDomainPlaceholder: placeholders,
        consoleLike: !!argv.q ? { log: () => {} } : undefined
    }
    await buildSchema(domain, path.resolve(outputDir), options);
})().catch((e) => {
    console.error('build failed with error: ', e);
    process.exit(1);
});