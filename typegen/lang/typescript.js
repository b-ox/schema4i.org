const {Schema} = require('../classes/schema');
const { joinWithLineBreaks, formatDoc } = require('../util');

const PRIMITIVE_TYPES = {
    'URL': ['string'],
    'ISODateString': ['string']
}

const DEFAULT_I18N_SUFFIX = 'EN';

const I18N_SUFFIXES = [DEFAULT_I18N_SUFFIX, 'DE'];

const SKIP_TYPEOF_CHECKER = [
    'Property',
    'Enumeration'
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

function getFilenameComponent(/** @type {Schema}*/ schema) {
    return schema.domain.replace(/\.org$/, '');
}

const LANGUAGE = {
        getFileName: (/** @type {Schema}*/ schema, /** @type {'types'|'util'|'examples'} */ purpose) => {
            return `${getFilenameComponent(schema)}${EXTENSIONS[purpose]}`;
        },
        writeTypes: ( /** @type {Schema}*/ schema, /** @type {Schema[]}*/ dependencies, /** @type {boolean}*/ strict, /** @type {LangConfig} */ langConfig) => {
            const typeDefinitions = schema.types;
            let output = `

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
    writeOther: (/** @type {Schema}*/ schema, /** @type {Schema[]}*/ dependencies, /** @type {LangConfig} */ langConfig) => {
        const typeDefinitions = schema.types;
        let output = `
import * as s4i from './${getFilenameComponent(schema)}${langConfig.esm ? '.js' : ''}';

const ENUMS = new Map<string, Map<string, string>>();

const ANCESTORS = new Map<string, string[]>();

const DESCENDANTS = new Map<string, string[]>();

function isType(obj: any, type: string) {
return typeof obj === 'object' && obj !== null && (Array.isArray(obj["@type"]) ? obj["@type"].indexOf(type) > -1 : obj["@type"] === type);
}

`;
        for (const typeDefinition of typeDefinitions) {
            if (!typeDefinition.simpleType) {
                const childTypes = typeDefinitions.filter(td => td.baseTypes.includes(typeDefinition.type) && !SKIP_TYPEOF_CHECKER.includes(td.type));
                const ancestors = typeDefinition.listAncestors(typeDefinitions);
                const descendants = typeDefinition.listDescendants(typeDefinitions);

                if (!SKIP_TYPEOF_CHECKER.includes(typeDefinition.type)) {
                    output += `
/**
* Checks if the given object is an instance of ${typeDefinition.type}.
*/
export function is${typeDefinition.type}(obj: any): obj is s4i.${typeDefinition.type} {
return isType(obj, '${typeDefinition.type}')${ childTypes.length > 0 ? ' || ' + joinWithLineBreaks(childTypes.map(ct => `is${ct.type}(obj)`), ' || ', ` ||\n    `) : '' };
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

export function getAncestors(type: string): string[] {
return ANCESTORS.get(type)?.slice() ?? [];
}

export function getDescendants(type: string): string[] {
return DESCENDANTS.get(type)?.slice() ?? [];
}

`;
        return output;
    },
    writeExamples: (/** @type {Schema}*/ schema, /** @type {Schema[]}*/ dependencies, /** @type {LangConfig} */ langConfig) => {
        const typeDefinitions = schema.types;
        const exampleTypes = typeDefinitions.filter(t => !t.simpleType && t.examples.length > 0);
        if (exampleTypes.length === 0) {
            return null;
        }
        let output = `
import * as s4i from './${getFilenameComponent(schema)}${langConfig.esm ? '.js' : ''}';

const EXAMPLES = new Map<string, s4i.Thing[]>();
`;
        const processedTypes = [];
        for (const typeDefinition of exampleTypes) {
            if (processedTypes.includes(typeDefinition.type)) {
                throw new Error(`duplicate examples for ${typeDefinition.type}`);
            }
            processedTypes.push(typeDefinition.type);
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
};

module.exports = LANGUAGE;
