const {Schema} = require('../classes/schema');
const { FieldDefinition } = require('../classes/type-definition');

const DEFAULT_I18N_SUFFIX = 'EN';

const I18N_SUFFIXES = [DEFAULT_I18N_SUFFIX, 'DE'];

const SKIP_TYPEOF_CHECKER = [
    /([/w+]\.)?Property$/,
    /([/w+]\.)?Enumeration$/,
]

/**
 * @typedef {{esm?: boolean}} LangConfig
 * @property {boolean} esm If true, the output is an ESM-compliant typescript code.
 */

const EXTENSIONS = {
    types: '.d.ts',
    util: '-util.ts',
    examples: '-examples.ts',
}

/**
 * @param {string} doc 
 * @param {number} indentation 
 * @returns {string}
 */
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

/**
 * 
 * @param {string[]} values 
 * @param {string} joiner 
 * @param {string} lbJoiner 
 * @param {number} maxLength 
 * @returns {string}
 */
function joinWithLineBreaks(values, joiner, lbJoiner, maxLength = 80) {
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

function getFilenameComponent(/** @type {{domain: string}}*/ schema) {
    return schema.domain.replace(/\.org$/, ''); // maintain compatibility to the old name schema4i
}

/**
 * @param {string} identifier 
 */
function escape(identifier) {
    return identifier.replaceAll(/[^a-zA-Z0-9_\.'"]/g, '_');
}

const LANGUAGE = {
        getFileName: (/** @type {Schema}*/ schema, /** @type {'types'|'util'|'examples'} */ purpose) => {
            return `${getFilenameComponent(schema)}${EXTENSIONS[purpose]}`;
        },
        writeTypes: ( /** @type {Schema}*/ schema, /** @type {boolean}*/ strict, /** @type {LangConfig} */ langConfig) => {
            const typeDefinitions = schema.types;
            let output = `
`;
            for (const dependency of schema.dependsOn) {
                output += `import * as ${dependency.prefix} from './${getFilenameComponent(dependency)}${langConfig.esm ? '.js' : ''}';
`;
            }
            output += `

export type OneOrMany<T> = T | T[];
export type Context = OneOrMany<string | Record<string, any>>;
`;
        for (const typeDefinition of typeDefinitions) {
            const generics = typeDefinition.fields.filter(f => f.types.includes('Thing')).map(f => `T_${f.name}`);
            /** @param {FieldDefinition} field */
            function getFieldTypes(field) {
                const typeArray = (generics.includes(`T_${field.name}`) ?  [`T_${field.name}`, ...field.types.filter(t => t !== 'Thing')] : field.types);
                const types = joinWithLineBreaks(typeArray.map(escape), '|', '|\n    ');
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
export type ${escape(typeDefinition.type)} = ${simpleTypes};
`;
            } else {
                output += `
${doc}
export interface ${escape(typeDefinition.type)}${genericDeclaration}${typeDefinition.baseTypes.length ? ` extends ${typeDefinition.baseTypes.map(escape).join(', ')}` : ''} {
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
    writeOther: (/** @type {Schema}*/ schema, /** @type {LangConfig} */ langConfig) => {
        const typeDefinitions = schema.types;
        const enumDefinitions = typeDefinitions.filter(td => td.enumValues);
        const complexTypeDefinitions = typeDefinitions.filter(td => !td.simpleType);
        let output = `
import * as s4i from './${getFilenameComponent(schema)}${langConfig.esm ? '.js' : ''}';

const ENUMS = new Map<string, Map<string, string>>();

const ANCESTORS = new Map<string, string[]>();

const DESCENDANTS = new Map<string, string[]>();

function isType(obj: any, type: string) {
return typeof obj === 'object' && obj !== null && (Array.isArray(obj["@type"]) ? obj["@type"].indexOf(type) > -1 : obj["@type"] === type);
}

`;
        for (const typeDefinition of complexTypeDefinitions) {
            const escaped = escape(typeDefinition.type);
            const childTypes = typeDefinitions.filter(td => td.baseTypes.includes(typeDefinition.type) && !SKIP_TYPEOF_CHECKER.some(c => c.test(td.type)));
            const ancestors = typeDefinition.listAncestors(typeDefinitions);
            const descendants = typeDefinition.listDescendants(typeDefinitions);

            if (!SKIP_TYPEOF_CHECKER.some(t => t.test(typeDefinition.type))) {
                output += `
/**
* Checks if the given object is an instance of ${typeDefinition.type}.
*/
export function is${escaped}(obj: any): obj is s4i.${escaped} {
return isType(obj, '${typeDefinition.type}')${ childTypes.length > 0 ? ' || ' + joinWithLineBreaks(childTypes.map(ct => `is${escape(ct.type)}(obj)`), ' || ', ` ||\n    `) : '' };
}

`;
            }

            if (ancestors.length > 0) {

                output += `
ANCESTORS.set('${typeDefinition.type}', ['${ joinWithLineBreaks(ancestors.map(a => a.type), `', '`, `',\n    '`) }']);
`;

            }
            if (descendants.length > 0) {

                output += `
DESCENDANTS.set('${typeDefinition.type}', ['${ joinWithLineBreaks(descendants.map(a => a.type), `', '`, `',\n    '`) }']);
`;

            }
        }
        output += `

`;
        let enumCount = 0;
        for (const enumDefinition of enumDefinitions) {
            const count = enumCount++;
            output += `
const E${count} = new Map();
ENUMS.set('${enumDefinition.type}', E${count});
${Object.entries(enumDefinition.enumValues).map(([key, value]) => `E${count}.set('${key}', '${value.replace(/'/g, `\\'`)}');`).join('\n')}
`;
        }
        const enumTypes = enumDefinitions.filter(td => !I18N_SUFFIXES.some(suffix => td.type.endsWith(suffix))).map(td => escape(td.type));
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

export function getAncestors(type: string): string[] {
return ANCESTORS.get(type)?.slice() ?? [];
}

export function getDescendants(type: string): string[] {
return DESCENDANTS.get(type)?.slice() ?? [];
}

export function listEnum(type: EnumTypes, lang: '${I18N_SUFFIXES.join(`'|'`)}' = '${DEFAULT_I18N_SUFFIX}'): Record<string, any> {
    const enumName = lang !== '${DEFAULT_I18N_SUFFIX}' ? type + '_' + lang : type;
    const enumDef = ENUMS.get(enumName);
    return enumDef ? Object.fromEntries(enumDef) : undefined;
}

`;
        return output;
    },
    writeExamples: (/** @type {Schema}*/ schema, /** @type {LangConfig} */ langConfig) => {
        const typeDefinitions = schema.types;
        const exampleTypes = typeDefinitions.filter(t => !t.simpleType && t.examples.length > 0);
        if (exampleTypes.length === 0 || !typeDefinitions.some(t => t.type === 'Thing')) {
            return null;
        }
        let output = `
import * as s4i from './${getFilenameComponent(schema)}${langConfig.esm ? '.js' : ''}';

interface Example<T extends s4i.Thing> {
    title: string;
    body: T;
}

const EXAMPLES = new Map<string, Example<s4i.Thing>[]>();
`;
        const processedTypes = [];
        for (const typeDefinition of exampleTypes) {
            if (processedTypes.includes(typeDefinition.type)) {
                throw new Error(`duplicate examples for ${typeDefinition.type}`);
            }
            processedTypes.push(typeDefinition.type);
            output += `
const examples${escape(typeDefinition.type)} = [${
typeDefinition.examples.map(example => `{title: "${example.title}", body: ${JSON.stringify(example.data)}}`).join(', \n')
}];
EXAMPLES.set('${typeDefinition.type}', examples${escape(typeDefinition.type)});
`
        }
        output += '\n';
        for (const typeDefinition of exampleTypes) {
            output += `export function getExampleGenerator(type: '${typeDefinition.type}'): Generator<Example<s4i.${escape(typeDefinition.type)}>>;\n`;
        }
        output += `export function* getExampleGenerator<R extends s4i.Thing = s4i.Thing>(type: string): Generator<Example<R>> {
const examples = EXAMPLES.get(type);
if (!examples) {
    return;
}
for (const example of examples) {
    if (example.body['@type'] !== type) {
        continue;
    }
    yield example as Example<R>;
}
}
`
    return output;
    }
};

module.exports = LANGUAGE;
