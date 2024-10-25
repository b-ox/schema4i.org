const fs = require("node:fs").promises;
const path = require("node:path");

const {TypeDefinition} = require('../classes/type-definition');
const schemaOrg = require('./schema.org');
const schema4iOrg = require('./schema4i.org');
const ooOrg = require('./schema.openontology.org');
const {Schema} = require("../classes/schema");

const WELL_KNOWN_SCHEMAS = {
    [schemaOrg.DOMAIN]: schemaOrg.load,
    [schema4iOrg.DOMAIN]: schema4iOrg.load,
    [ooOrg.DOMAIN]: ooOrg.load,
}

/**
 * @typedef {{ domain: string, src: string?, consoleLike: Console }} LoadSchemaConfig
 */

/**
 * @param {LoadSchemaConfig} loadConfig 
 */
async function loadFromSrc(loadConfig) {

    loadConfig.consoleLike.log('Scanning: "src"');

    /** @type {import('../classes/type-definition').Dependencies} */
    const dependencies = [];
    const files = await fs.readdir(loadConfig.src);
    const types = await Promise.all(files.filter(file => file.endsWith(".src.json")).map(async file => {
        const data = JSON.parse(await fs.readFile(path.resolve(loadConfig.src, file), 'utf-8'));
        return new TypeDefinition(loadConfig.domain, data, dependencies);
    }));

    loadConfig.consoleLike.log(`Processed ${types.length} types`);

    return new Schema(loadConfig.domain, types, dependencies);
}

/**
 * @param {LoadSchemaConfig} loadConfig 
 * @returns {Promise<Schema>}
 */
async function loadSchema(loadConfig) {
    if (WELL_KNOWN_SCHEMAS[loadConfig.domain]) {
        return await WELL_KNOWN_SCHEMAS[loadConfig.domain](loadConfig);
    }
    if (loadConfig.src) {
        return await loadFromSrc(loadConfig);
    }
    throw new Error(`Unknown schema ${loadConfig.domain}. Please make sure 'src' is set.`);
}

/**
 * @param {LoadSchemaConfig} loadConfig 
 * @returns {Promise<Schema[]>}
 */
async function loadSchemaWithDependencies(loadConfig) {
    const requiredDomains = [loadConfig.domain];
    /** @type {Schema[]} */
    const schemas = [];
    while (true) {
        const missingSchemas = requiredDomains.filter(domain => !schemas.some(schema => schema.domain === domain));
        if (missingSchemas.length === 0) {
            break;
        }
        schemas.push(...await Promise.all(missingSchemas.map(domain => loadSchema({
            domain,
            src: domain === loadConfig.domain ? loadConfig.src : undefined,
            consoleLike: loadConfig.consoleLike
        }))));
        requiredDomains.push(...schemas.flatMap(schema => schema.dependsOn.map(d => d.domain)).filter(domain => !requiredDomains.includes(domain)));
    }
    return schemas;
}

module.exports = {
    loadSchema,
    loadSchemaWithDependencies,
};
