
const fs = require("fs").promises;
const path = require("path");
const request = require('request');

// configuration
const FROM_PATH = "src/";

const SCHEMAORG_TYPES_URL = 'https://schema.org/version/latest/schemaorg-current-https.jsonld';

const PRIMITIVE_TYPES = {
    'URL': ['string'],
    'ISODateString': ['string']
}

const PRIMITIVE_TYPE_MAPPINGS = {
    '@id': 'URL',
    '@context': 'Context',
    'schema:URL': 'URL',
    'schema:Text': 'string',
    'schema:Boolean': 'boolean',
    'schema:Date': 'ISODateString',
    'schema:DateTime': 'ISODateString',
    'schema:Time': 'string',
    'schema:Duration': 'string',
    'schema:Integer': 'number',
    'schema:Number': 'number',
    'schema:PaymentMethod': 'string',
    'schema:paymentStatusType': 'string',
    'schema:ItemListOrderType': 'string',
    'schema:BusinessFunction': 'string',
    'schema:DeliveryMethod': 'string',
    'oo:definitions/string': 'string',
    'oo:definitions/boolean': 'boolean',
    'oo:definitions/money': 'number',
    'oo:definitions/date': 'ISODateString',
    'oo:definitions/temporal-interval': 'number',
    'oo:definitions/nonnegative-integer': 'number',
    'oo:definitions/salutation': 'number',
    '@vocab': 'string' // TODO: map enums
}

function processType(type, ignoreMissing) {
    const prefixedType = type.replace('http://schema.org/', 'schema:').replace('https://schema.openontology.org/', 'oo:');
    if (PRIMITIVE_TYPE_MAPPINGS[prefixedType]) {
        return PRIMITIVE_TYPE_MAPPINGS[prefixedType];
    } else if (type.startsWith('s4i:') || type.startsWith('http://schema4i.org/')) {
        return type.replace('s4i:', '').replace('http://schema4i.org/', '');
    } else if (!ignoreMissing) {
        throw new Error(`Unknown type ${type}`);
    }
}

class FieldDefinition {
    name;
    description;
    types;
    onlyOne;

    constructor(name, description, types) {
        this.name = name;
        this.description = description;
        this.types = types;
        this.onlyOne = name === 'URL' || name === '@id' || name === '@context';
    }
}

class TypeDefinition {
    context;
    type;
    description;
    baseTypes = [];
    url;
    fields = [];
    simpleType;
    examples = [];
    constructor(srcFile, schemaOrgDefs) {
        try {
            this.type = srcFile.type;
            this.description = srcFile.description;
            this.url = srcFile.uri;
            this.baseTypes = (srcFile.base || []).map(base => processType(base['@id']));
            if (!srcFile.context) {
                throw new Error(`type ${this.type} has no context`);
            }
            let thisDef;
            const fieldDefs = Object.entries(srcFile.context['@context']).filter(([_, entry]) => typeof entry === 'object');
            function getEntryTypes(key, entry) {
                if (entry['@type']) {
                    return [processType(entry['@type'])];
                } else if (srcFile.multipletypes[key]) {
                    return srcFile.multipletypes[key].map(t => processType(t['@id']));
                } else {
                    throw new Error(`Property ${key} on type ${this.type} has no type defined`);
                }
            }
            function getDescription(entry) {
                if (entry['@id'] && entry['@id'].startsWith('schema:')) {
                    return (schemaOrgDefs['@graph'].find(sType => sType['@id'] === entry['@id']) || {})['rdfs:comment'] || '';
                }
                return '';
            }
            this.fields = fieldDefs.map(([key, entry]) => {
                if (processType(entry["@id"], true) === this.type) {
                    thisDef = new FieldDefinition(key, getDescription(entry), getEntryTypes(key, entry));
                    thisDef.onlyOne = true;
                    return;
                }
                if (key === 'URL') {
                    key = '@id';
                }
                return new FieldDefinition(key, getDescription(entry), getEntryTypes(key, entry));
            }).filter(v => typeof v !== 'undefined');
            if (this.type.startsWith('Enum') && this.fields.length === 0) {
                // TODO: map enums properly
                thisDef = new FieldDefinition(this.type, '', ['string']);
                thisDef.onlyOne = true;
            }
            if (this.fields.length === 0 && thisDef) {
                this.simpleType = thisDef;
            }
            if (this.type === 'Thing') {
                this.fields.push(new FieldDefinition('@type', '', ['string']));
                this.fields.push(new FieldDefinition('@context', '', ['Context']));
            }
            this.examples = (srcFile.playground || []).map(pg => ({title: pg.title, data: pg.input}));
        } catch (e) {
            throw new Error(`generating type ${this.type} failed: ${e.message}`);
        }
    }
}

const LANGUAGES = {
    'typescript': {
        typeFile: `schema4i.d.ts`,
        openTypes: () => `
export declare type OneOrMany<T> = T | T[];
export declare type Context = OneOrMany<string | Record<string, any>>;
${Object.entries(PRIMITIVE_TYPES).map(([key, value]) => `export declare type ${key} = ${value.join('|')};`).join('\n')}`,
        typeMapper: (typeDefinition, strict) => {
            const generics = typeDefinition.fields.filter(f => f.types.includes('Thing')).map(f => `T_${f.name}`);
            function getFieldTypes(field) {
                const types = generics.includes(`T_${field.name}`) ?  [`T_${field.name}`, ...field.types.filter(t => t !== 'Thing')] : field.types;
                return field.onlyOne ? `${types.join('|')}` : `OneOrMany<${types.join('|')}>`;
            }
            const genericDeclaration = generics.length > 0 ? `<${generics.map(g => `${g} extends Thing = Thing`).join(', ')}>` : '';
            const doc = `/**
* ${typeDefinition.type}
* 
* ${typeDefinition.description}
* ${typeDefinition.url ? `@see ${typeDefinition.url}` : ''}
*/`;
            if (typeDefinition.simpleType) {
                const simpleTypes = getFieldTypes(typeDefinition.simpleType);
                return `${doc}
export type ${typeDefinition.type} = ${simpleTypes}
`;
            } else {
                return `${doc}
export interface ${typeDefinition.type}${genericDeclaration}${typeDefinition.baseTypes.length ? ` extends ${typeDefinition.baseTypes.join(', ')}` : ''} {
${typeDefinition.fields.map(field => `
    /** ${field.description} */
    '${field.name}'?: ${getFieldTypes(field)}`).join(';\n')}
    ${!strict && typeDefinition.type === 'Thing' ? '\n    [key: string]: any;\n' : ''}
}
`;
            }
        },
        exampleFile: 'schema4i-examples.ts',
        openExamples: () => `
import s4i from './schema4i.d';

const EXAMPLES = new Map<string, s4i.Thing[]>();
`,
        exampleMapper: (typeDefinition) => `
const examples${typeDefinition.type}: s4i.${typeDefinition.type}[] = [${
    typeDefinition.examples.map(example => JSON.stringify(example.data, undefined, 2)).join(',\n')
}];
EXAMPLES.set('${typeDefinition.type}', examples${typeDefinition.type});
`,
        closeExamples: (typeDefinitions) => `
${typeDefinitions.map(type => `export function getExampleGenerator(type: '${type.type}', host?: string): Generator<s4i.${type.type}>;`).join('\n')}
export function* getExampleGenerator<R extends s4i.Thing = s4i.Thing>(type: string, host?: string): Generator<R> {
    const examples = EXAMPLES.get(type);
    if (!examples) {
        return;
    }
    for (const example of examples) {
        if (!host) {
            yield example as R;
        } else {
            const clone = {...example};
            const context = Array.isArray(clone["@context"]) ? clone["@context"] : [clone["@context"]].filter(v => typeof v !== 'undefined');
            // TODO: map object context
            clone["@context"] = context.map(url => typeof url === 'string' ? url.replace(/https?:\\/\\/schema4i\.org/, host) : url);
            yield clone as R;
        }
    }
}
`
    }
};

async function generateTypes(language, outputDir, includeExamples, strict, consoleLike) {

    consoleLike = Object.assign({}, console, consoleLike);

    try {
        await fs.access(outputDir);
    } catch (e) {
        consoleLike.log('Create missing output directory.');
        await fs.mkdir(outputDir);
    }

    const languageProcessor = LANGUAGES[language];

    if (!languageProcessor) {
        throw new Error(`language ${language} is not supported.`);
    }
    if (includeExamples && !languageProcessor.exampleMapper) {
        throw new Error(`language ${language} does not support examples.`);
    }

    consoleLike.log(`fetching schema.org types from ${SCHEMAORG_TYPES_URL}`);

    const schemaOrgDefs = await new Promise((resolve, reject) => {
        request.get(SCHEMAORG_TYPES_URL, {encoding: 'utf-8'}, (err, resp) => {
            if (err || resp.statusCode !== 200) {
                reject(err);
            } else {
                resolve(JSON.parse(resp.body));
            }
        });
    });

    consoleLike.log('Scanning: "src"');

    const files = await fs.readdir(FROM_PATH);
    const types = await Promise.all(files.filter(file => file.endsWith(".src.json")).map(async file => {
        const data = JSON.parse(await fs.readFile(FROM_PATH + file, 'utf-8'));
        return new TypeDefinition(data, schemaOrgDefs);
    }));

    consoleLike.log(`Processed ${types.length} types`);

    const typeOutputs = [
        languageProcessor.openTypes ? languageProcessor.openTypes() : undefined,
        ...types.map(t => languageProcessor.typeMapper(t, strict)),
        languageProcessor.closeTypes ? languageProcessor.closeTypes() : undefined,
    ].filter(line => typeof line !== 'undefined');

    let exampleOutputs = [];
    if (includeExamples) {
        const exampleTypes = types.filter(t => !t.simpleType && t.examples.length > 0);
        exampleOutputs = [
            languageProcessor.openExamples ? languageProcessor.openExamples() : undefined,
            ...exampleTypes.map(t => languageProcessor.exampleMapper(t)),
            languageProcessor.closeExamples ? languageProcessor.closeExamples(exampleTypes) : undefined,
        ].filter(line => typeof line !== 'undefined');
    }

    const typeOutputFile = path.resolve(outputDir, languageProcessor.typeFile);
    consoleLike.log(`Writing type definitions to ${typeOutputFile}`);
    await fs.writeFile(typeOutputFile, typeOutputs.join('\n'), { encoding: 'utf-8' });

    if (includeExamples) {
        const exampleOutputFile = path.resolve(outputDir, languageProcessor.exampleFile);
        consoleLike.log(`Writing examples to ${exampleOutputFile}`);
        await fs.writeFile(exampleOutputFile, exampleOutputs.join('\n'), { encoding: 'utf-8' });    
    }
}

module.exports = generateTypes;