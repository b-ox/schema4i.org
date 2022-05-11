
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

const DEFAULT_I18N_SUFFIX = 'EN';

const I18N_SUFFIXES = [DEFAULT_I18N_SUFFIX, 'DE'];

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
    '@vocab': 'string' // enums not in the s4i schema
}

function processType(/** @type {string}*/ type, typeObject, ignoreMissing) {
    const prefixedType = type.replace('http://schema.org/', 'schema:').replace('https://schema.openontology.org/', 'oo:');
    if (type === '@vocab' && typeObject['@context'] && (typeObject['@context']['@vocab'].startsWith('s4i:') || typeObject['@context']['@vocab'].startsWith('http://schema.org/'))) {
        type = typeObject['@context']['@vocab'].replace('#', '');
    } else if (PRIMITIVE_TYPE_MAPPINGS[prefixedType]) {
        return PRIMITIVE_TYPE_MAPPINGS[prefixedType];
    }
    if (type.startsWith('s4i:') || type.startsWith('http://schema4i.org/')) {
        return type.replace('s4i:', '').replace('http://schema4i.org/', '');
    } else if (!ignoreMissing) {
        throw new Error(`Unknown type ${type}`);
    }
}

function formatDoc(doc, indentation = 0) {
    let description = (doc || '').replace(/\n|\r|\t|\\[nrt]/g, '');
    const descriptionParts = [];
    while (description.length > 0) {
        const currentSlice = Math.min(130, description.length);
        const currentPart = description.slice(0, currentSlice).trim();
        if (currentPart.length > 0) {
            descriptionParts.push(`${' '.repeat(indentation)} * ${currentPart}`);
        }
        description = description.slice(currentSlice);
    }
    return descriptionParts.join('\n') || `${' '.repeat(indentation)} *`;
}

function joinWithLineBreaks(values, joiner, lbJoiner, maxLength = 80) {
    const lineParts = [];
    let currentPart = [];
    for (const value of values) {
        if (currentPart.reduce((sum, p) => sum + p.length, 0) + value.length <= maxLength) {
            currentPart.push(value);
        } else {
            lineParts.push(currentPart.join(joiner));
            currentPart = [value];
        }
    }
    if (currentPart.length > 0) {
        lineParts.push(currentPart.join(joiner));
    }
    return lineParts.join(lbJoiner);
}

class FieldDefinition {
    name;
    description;
    types;
    cardinality;
    required;

    constructor(name, description, types, typesHint = '') {
        this.name = name;
        this.description = description;
        this.types = types;
        this.required = typesHint.includes('required');
        this.cardinality = typesHint.includes('singleton') ? 'one' : (typesHint.includes('multiple') ? 'many' : 'any');
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
    enumValues;
    constructor(srcFile, schemaOrgDefs) {
        try {
            this.type = srcFile.type;
            this.description = srcFile.description;
            this.url = srcFile.uri;
            this.baseTypes = (srcFile.base || []).map(base => processType(base['@id'], base));
            if (!srcFile.context) {
                throw new Error(`type ${this.type} has no context`);
            }
            let thisDef;
            const context = srcFile.context['@context'];
            const fieldDefs = Object.entries(context).filter(([_, entry]) => typeof entry === 'object');
            function getEntryTypes(key, entry) {
                if (entry['@type']) {
                    return [processType(entry['@type'], entry)];
                } else if (srcFile.multipletypes[key]) {
                    return srcFile.multipletypes[key].map(t => processType(t['@id'], t));
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
                if (processType(entry["@id"], entry, true) === this.type) {
                    thisDef = new FieldDefinition(key, getDescription(entry), getEntryTypes(key, entry), 'singleton');
                    return;
                }
                if (key === 'URL') {
                    key = '@id';
                }
                return new FieldDefinition(key, getDescription(entry), getEntryTypes(key, entry), entry['types-hint']);
            }).filter(v => typeof v !== 'undefined');
            if (this.type.startsWith('Enum') && this.fields.length === 0) {
                const enumValues = Object.entries(context).filter(([_, entry]) => typeof entry === 'string' && entry.startsWith('s4i:Enum')).map(([value, key]) => ({
                    key: key.split('#').pop(),
                    value
                }));
                thisDef = new FieldDefinition(this.type, '', enumValues.map(({key}) => `'${key}'`), 'singleton');
                this.enumValues = {};
                for (const {key, value} of enumValues) {
                    this.enumValues[key] = value;
                }
            }
            if (this.fields.length === 0 && thisDef) {
                this.simpleType = thisDef;
            }
            if (this.type === 'Thing') {
                this.fields.push(new FieldDefinition('@type', '', ['string']));
                this.fields.push(new FieldDefinition('@context', '', ['Context'], 'singleton'));
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
        writeTypes: (/** @type {TypeDefinition[]}*/ typeDefinitions, /** @type {boolean}*/ strict) => {
            let output = `
// tslint:disable: no-empty-interface

export type OneOrMany<T> = T | T[];
export type Context = OneOrMany<string | Record<string, any>>;
${Object.entries(PRIMITIVE_TYPES).map(([key, value]) => `export type ${key} = ${value.join('|')};`).join('\n')}
`;
            for (const typeDefinition of typeDefinitions) {
                const generics = typeDefinition.fields.filter(f => f.types.includes('Thing')).map(f => `T_${f.name}`);
                function getFieldTypes(field) {
                    const typeArray = (generics.includes(`T_${field.name}`) ?  [`T_${field.name}`, ...field.types.filter(t => t !== 'Thing')] : field.types);
                    const types = joinWithLineBreaks(typeArray, '|', '|\n    ');
                    return field.cardinality === 'one' ? types : (field.cardinality === 'many' ? `(${types})[]` : `OneOrMany<${types}>`);
                }
                const genericDeclaration = generics.length > 0 ? `<${generics.map(g => `${g} extends Thing = Thing`).join(', ')}>` : '';
                const doc = `/**
 * ${typeDefinition.type}
 *
${formatDoc(typeDefinition.description)}
 * ${typeDefinition.url ? `@see ${typeDefinition.url}` : ''}
 */`;
                if (typeDefinition.simpleType) {
                    const simpleTypes = getFieldTypes(typeDefinition.simpleType);
                    output += `
${doc}
export type ${typeDefinition.type} = ${simpleTypes};
`;
                } else {
                    output += `
${doc}
export interface ${typeDefinition.type}${genericDeclaration}${typeDefinition.baseTypes.length ? ` extends ${typeDefinition.baseTypes.join(', ')}` : ''} {
${typeDefinition.fields.map(field => `
    /**
${formatDoc(field.description, 4)}
     */
    '${field.name}'${field.required ? '' : '?'}: ${getFieldTypes(field)};`).join('\n')}
${!strict && typeDefinition.type === 'Thing' ? '\n    [key: string]: any;\n' : ''}
}
`;
                }
            }
            return output;
        },
        otherFile: 'schema4i-util.ts',
        writeOther: (/** @type {TypeDefinition[]}*/ typeDefinitions) => {
            let output = `
import * as s4i from './schema4i';

const ENUMS = new Map<string, Map<string, string>>();

function isType(obj: any, type: string) {
    return typeof obj === 'object' && (Array.isArray(obj["@type"]) ? obj["@type"].indexOf(type) > -1 : obj["@type"] === type);
}

`;
            for (const typeDefinition of typeDefinitions) {
                if (!typeDefinition.simpleType) {
                    const childTypes = typeDefinitions.filter(td => td.baseTypes.includes(typeDefinition.type));
                    output += `
/**
 * Checks if the given object is an instance of ${typeDefinition.type}.
 */
export function is${typeDefinition.type}(obj: any): obj is s4i.${typeDefinition.type} {
    return isType(obj, '${typeDefinition.type}')${ childTypes.length > 0 ? ' || ' + joinWithLineBreaks(childTypes.map(ct => `is${ct.type}(obj)`), ' || ', ` ||\n    `) : '' };
}

`;
                }
            }
            output += `

`;
            const enumDefinitions = typeDefinitions.filter(td => td.enumValues);
            let enumCount = 0;
            for (const enumDefinition of enumDefinitions) {
                const count = enumCount++;
                output += `
const E${count} = new Map();
ENUMS.set('${enumDefinition.type}', E${count});
${Object.entries(enumDefinition.enumValues).map(([key, value]) => `E${count}.set('${key}', '${value.replace(/'/g, `\\'`)}');`).join('\n')}
`;
            }
            const enumTypes = enumDefinitions.filter(td => !I18N_SUFFIXES.some(suffix => td.type.endsWith(suffix))).map(td => td.type);
            const joinedEnumTypes = joinWithLineBreaks(enumTypes, `'|'`, `'|\n    '`);
            output += `
export type EnumTypes = '${joinedEnumTypes}';

export function mapEnum(type: EnumTypes, value: string, lang: '${I18N_SUFFIXES.join(`'|'`)}' = '${DEFAULT_I18N_SUFFIX}'): string {
    const enumName = lang !== '${DEFAULT_I18N_SUFFIX}' ? type + '_' + lang : type;
    return ENUMS.get(enumName)?.get(value);
}

export function listEnumKeys(type: EnumTypes, lang: '${I18N_SUFFIXES.join(`'|'`)}' = '${DEFAULT_I18N_SUFFIX}'): string[] {
    const enumName = lang !== '${DEFAULT_I18N_SUFFIX}' ? type + '_' + lang : type;
    const enumDef = ENUMS.get(enumName);
    return enumDef ? [...enumDef.keys()] : undefined;
}

export function listEnumValues(type: EnumTypes, lang: '${I18N_SUFFIXES.join(`'|'`)}' = '${DEFAULT_I18N_SUFFIX}'): string[] {
    const enumName = lang !== '${DEFAULT_I18N_SUFFIX}' ? type + '_' + lang : type;
    const enumDef = ENUMS.get(enumName);
    return enumDef ? [...enumDef.values()] : undefined;
}

`;
            return output;
        },
        exampleFile: 'schema4i-examples.ts',
        writeExamples: (typeDefinitions) => {
            const exampleTypes = typeDefinitions.filter(t => !t.simpleType && t.examples.length > 0);
            let output = `
import * as s4i from './schema4i';

const EXAMPLES = new Map<string, s4i.Thing[]>();
`;
            for (const typeDefinition of exampleTypes) {
                output += `
const examples${typeDefinition.type}: s4i.Thing[] = [${
    typeDefinition.examples.map(example => JSON.stringify(example.data, undefined, 2)).join(',\n')
}];
EXAMPLES.set('${typeDefinition.type}', examples${typeDefinition.type});
`
            }
            output += '\n';
            for (const typeDefinition of exampleTypes) {
                output += `export function getExampleGenerator(type: '${typeDefinition.type}'): Generator<s4i.${typeDefinition.type}>;\n`;
            }
            output += `export function* getExampleGenerator<R extends s4i.Thing = s4i.Thing>(type: string): Generator<R> {
    const examples = EXAMPLES.get(type);
    if (!examples) {
        return;
    }
    for (const example of examples) {
        if (example['@type'] !== type) {
            continue;
        }
        yield example as R;
    }
}
`
        return output;
        }
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
    if (includeExamples && !languageProcessor.writeExamples) {
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

    const typeOutput = languageProcessor.writeTypes(types, strict);

    let exampleOutput = '';
    if (includeExamples) {
        exampleOutput = languageProcessor.writeExamples(types);
    }

    let otherOutput = '';
    if (typeof languageProcessor.writeOther === 'function') {
        otherOutput = languageProcessor.writeOther(types);
    }

    const typeOutputFile = path.resolve(outputDir, languageProcessor.typeFile);
    consoleLike.log(`Writing type definitions to ${typeOutputFile}`);
    await fs.writeFile(typeOutputFile, typeOutput, { encoding: 'utf-8' });

    if (otherOutput) {
        const otherOutputFile = path.resolve(outputDir, languageProcessor.otherFile);
        consoleLike.log(`Writing additional code to ${otherOutputFile}`);
        await fs.writeFile(otherOutputFile, otherOutput, { encoding: 'utf-8' });    
    }

    if (includeExamples) {
        const exampleOutputFile = path.resolve(outputDir, languageProcessor.exampleFile);
        consoleLike.log(`Writing examples to ${exampleOutputFile}`);
        await fs.writeFile(exampleOutputFile, exampleOutput, { encoding: 'utf-8' });    
    }
}

module.exports = generateTypes;