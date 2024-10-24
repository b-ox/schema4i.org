const fs = require("node:fs").promises;
const path = require("node:path");
const https = require("node:https");

const {TypeDefinition} = require('../classes/type-definition');
const schemaOrg = require('./schema.org');
const {Schema} = require("../classes/schema");

const WELL_KNOWN_SCHEMAS = {
    [schemaOrg.DOMAIN]: () => schemaOrg.load()
}

const SCHEMAORG_TYPES_URL = 'https://schema.org/version/latest/schemaorg-current-https.jsonld';

async function fetchSchemaOrg() {

    return await new Promise((resolve, reject) => {
        https.get(SCHEMAORG_TYPES_URL, resp => {

            let error;

            const statusCode = resp.statusCode;
            const contentType = resp.headers['content-type'];

            if (statusCode !== 200) {
                error = new Error(`Status Code: ${statusCode}`);
            } else if (!/^application\/ld\+json/i.test(contentType)) {
                error = new Error(`Invalid Content Type: ${contentType}`);
            }

            if (error) {
                resp.resume();
                reject(error);
                return;
            }

            resp.setEncoding('utf-8');
            const chunks = [];
            resp.on('data', (chunk) => chunks.push(chunk));
            resp.on('end', () => {
                try {
                    const body = chunks.join('');
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });
    });
}

/**
 * @typedef {{ domain: string, src: string?, consoleLike: Console }} LoadSchemaConfig
 */

/**
 * @param {LoadSchemaConfig} loadConfig 
 */
async function loadFromSrc(loadConfig) {

    loadConfig.consoleLike.log(`fetching schema.org types from ${SCHEMAORG_TYPES_URL}`);

    const schemaOrg = await fetchSchemaOrg();

    loadConfig.consoleLike.log('Scanning: "src"');

    const files = await fs.readdir(loadConfig.src);
    const types = await Promise.all(files.filter(file => file.endsWith(".src.json")).map(async file => {
        const data = JSON.parse(await fs.readFile(path.resolve(loadConfig.src, file), 'utf-8'));
        return new TypeDefinition(data, schemaOrg);
    }));

    loadConfig.consoleLike.log(`Processed ${types.length} types`);

    const schema = new Schema(loadConfig.domain);
    schema.types = types;
    schema.dependsOn = [schemaOrg.DOMAIN];

    return schema;
}

/**
 * 
 * @param {LoadSchemaConfig} loadConfig 
 * @returns {Promise<Schema>}
 */
async function loadSchema(loadConfig) {
    if (WELL_KNOWN_SCHEMAS[loadConfig.domain]) {
        return await WELL_KNOWN_SCHEMAS[loadConfig.domain]();
    }
    if (loadConfig.src) {
        return await loadFromSrc(loadConfig);
    }
    throw new Error(`Unknown schema ${loadConfig.domain}. Please make sure 'src' is set.`);
}

module.exports = loadSchema;
