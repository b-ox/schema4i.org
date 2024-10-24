const fs = require("node:fs").promises;
const path = require("node:path");

const LANGUAGES = require('../typegen/lang');
const loadSchema = require("../typegen/schemas");

/**
 * 
 * Generates type definitions and example data for a given language.
 * 
 * @param {'typescript'} language The output language. Currently only 'typescript' is supported.
 * @param {string} outputDir The directory where the output files are written.
 * @param {{
 *  sourceDir?: string,
 *  includeExamples?: boolean,
 *  strict?: boolean,
 *  langConfig?: Record<string, any>,
 *  consoleLike?: Console
 * }} options Options for the generation.
 * @param options.sourceDir The directory where the source files are located. Default is 'src'.
 * @param options.includeExamples If true, includes example objects for all types based on the playground data in a separate file.
 * @param options.strict If true, emitted types only allow properties that are present in the schema. Otherwise types can contain arbitrary properties.
 * @param options.langConfig Language-specific configuration options. Refer to the documentation in typegen/lang for details.
 * @param options.consoleLike an object with a log function similar to a console.
 */
async function generateTypes(language, outputDir, options) {

    let includeExamples = false;
    let strict = false;
    let langConfig = {};
    let consoleLike = console;
    let sourceDir = 'src';

    if (typeof options === 'boolean') {
        includeExamples = options;
        strict = arguments[3];
        langConfig.esm = arguments[4];
        consoleLike = arguments[5];
        consoleLike = Object.assign({}, console, consoleLike);
        consoleLike.warn('WARN: Passing separate arguments is deprecated. Use "generateTypes(language, outputDir, options)" syntax instead.');
    } else if (options) {
        includeExamples = options.includeExamples;
        strict = options.strict;
        langConfig = Object.assign({}, langConfig, options.langConfig);
        consoleLike = Object.assign({}, console, options.consoleLike);
        sourceDir = options.sourceDir ?? sourceDir;
    }

    sourceDir = path.isAbsolute(sourceDir) ? sourceDir : path.resolve(__dirname, '..', sourceDir);

    try {
        await fs.access(outputDir);
    } catch (e) {
        consoleLike.log('Create missing output directory.');
        await fs.mkdir(outputDir, { recursive: true });
    }

    const languageProcessor = LANGUAGES[language];

    if (!languageProcessor) {
        throw new Error(`language ${language} is not supported.`);
    }
    if (includeExamples && !languageProcessor.writeExamples) {
        throw new Error(`language ${language} does not support examples.`);
    }

    const schema = await loadSchema({
        domain: 'schema4i.org',
        src: sourceDir,
        consoleLike,
    });

    consoleLike.log(`Loaded schema for ${schema.domain}`);

    const typeOutput = languageProcessor.writeTypes(schema, strict, langConfig);

    let exampleOutput = '';
    if (includeExamples) {
        exampleOutput = languageProcessor.writeExamples(schema, langConfig);
    }

    let otherOutput = '';
    if (typeof languageProcessor.writeOther === 'function') {
        otherOutput = languageProcessor.writeOther(schema, langConfig);
    }

    const typeOutputFile = path.resolve(outputDir, languageProcessor.getFileName(schema, 'types'));
    consoleLike.log(`Writing type definitions to ${typeOutputFile}`);
    await fs.writeFile(typeOutputFile, typeOutput, { encoding: 'utf-8' });

    if (otherOutput) {
        const otherOutputFile = path.resolve(outputDir, languageProcessor.getFileName(schema, 'util'));
        consoleLike.log(`Writing additional code to ${otherOutputFile}`);
        await fs.writeFile(otherOutputFile, otherOutput, { encoding: 'utf-8' });    
    }

    if (includeExamples) {
        const exampleOutputFile = path.resolve(outputDir, languageProcessor.getFileName(schema, 'examples'));
        consoleLike.log(`Writing examples to ${exampleOutputFile}`);
        await fs.writeFile(exampleOutputFile, exampleOutput, { encoding: 'utf-8' });    
    }
}

module.exports = generateTypes;