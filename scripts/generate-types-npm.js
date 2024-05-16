const generateTypes = require('./generate-types');
const path = require("path");
const argv = require('minimist')(process.argv.slice(2), {
    alias: {
        o: 'outputDir',
        e: 'includeExamples',
        s: 'strict',
        q: 'quiet',
        m: 'esm'
    }
});

(async() => {
    const language = argv._[0];
    if (!language || argv.help) {
        console.log('usage: npm run generate-types <Language> [-- [-o=<OutputDir>] [-e] [-s]]');
        console.log('\nLanguage: The language that the types will be generated for. Currently only "typescript" is supported.');
        console.log('-o|--outputDir (optional): The directory where the type files will be placed. Defaults to ../types.');
        console.log('-e|--includeExamples (optional): Includes example generators for the types.');
        console.log('-s|--strict (optional): Disallow fields that are not defined in the schema on the generated types.');
        console.log('-m|--esm (optional): Generates ESM module code instead of CommonJS.');
        console.log('-q|--quiet (optional): Reduce log output.');
        return;
    }
    const outputDir = argv.o || `../types`;
    const includeExamples = !!argv.e;
    const strict = !!argv.s;
    const quiet = !!argv.q;
    const esm = !!argv.m;
    const logger = quiet ? { log: () => {} } : undefined;
    await generateTypes(language, path.resolve(outputDir), includeExamples, strict, esm, logger);
})().catch((e) => {
    console.error('type generation failed with error: ', e);
    process.exit(1);
});