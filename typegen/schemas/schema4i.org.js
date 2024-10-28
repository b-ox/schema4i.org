const fs = require("node:fs").promises;
const path = require("node:path");
const https = require("node:https");

const {TypeDefinition, FieldDefinition} = require('../classes/type-definition');
const schemaOrg = require('./schema.org');
const ooOrg = require('./schema.openontology.org');
const {Schema} = require("../classes/schema");

const DOMAIN = 'schema4i.org';

/**
 * @typedef {import('.').LoadSchemaConfig} LoadSchemaConfig
 */

const SCHEMAORG_TYPES_URL = 'https://schema.org/version/latest/schemaorg-current-https.jsonld';

const src = path.resolve(__dirname, '../../src');

/**
 * 
 * @param {string | { "@language": string, "@value": string } | { "@language": string, "@value": string }[]} rdfsValue 
 */
function getRdfsValue(rdfsValue) {
    if (Array.isArray(rdfsValue)) {
        rdfsValue = rdfsValue[0];
    }
    if (typeof rdfsValue === 'object' && rdfsValue !== null && typeof rdfsValue['@value'] === 'string') {
        return rdfsValue['@value'];
    }
    if (typeof rdfsValue === 'string') {
        return rdfsValue;
    }
    return '';
}

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


class S4iTypeDefinition extends TypeDefinition {
    
    static schemaOrgDefs;

    constructor(domain, srcFile, dependencies) {
        super(domain, srcFile, dependencies);
        if (this.type === 'Thing') {
            this.fields.push(new FieldDefinition('@type', '', ['string']));
            this.fields.push(new FieldDefinition('@context', '', ['Context'], 'singleton'));
        }
    }


    getFieldDescription(entry) {
        if (entry['@id'] && entry['@id'].startsWith('schema:')) {
            return getRdfsValue((S4iTypeDefinition.schemaOrgDefs['@graph'].find(sType => sType['@id'] === entry['@id']) || {})['rdfs:comment']);
        }
        return super.getFieldDescription(entry);
    }
}

/**
 * @param {Console} consoleLike 
 */
async function load(consoleLike) {

    consoleLike.log(`fetching schema.org types from ${SCHEMAORG_TYPES_URL}`);

    const schemaOrgDefs = await fetchSchemaOrg();

    S4iTypeDefinition.schemaOrgDefs = schemaOrgDefs;

    consoleLike.log('Scanning: "src"');

    /** @type {import('../classes/type-definition').Dependencies} */
    const dependencies = [];
    const files = await fs.readdir(src);
    const types = await Promise.all(files.filter(file => file.endsWith(".src.json")).map(async file => {
        const data = JSON.parse(await fs.readFile(path.resolve(src, file), 'utf-8'));
        return new S4iTypeDefinition(DOMAIN, data, dependencies);
    }));

    consoleLike.log(`Processed ${types.length} types`);

    return new Schema(DOMAIN, types, dependencies);
}


module.exports = {
    DOMAIN,
    load,
}