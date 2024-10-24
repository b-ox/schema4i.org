
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
    'schema:OfferItemCondition': 'string',
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

/**
 * @param {string} type
 * @param {any} typeObject
 * @param {boolean} ignoreMissing
 * @returns {string}
 */
function processType(type, typeObject, ignoreMissing) {
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

class FieldDefinition {
    /** @type {string} */
    name;
    /** @type {string} */
    description;
    /** @type {string[]} */
    types;
    /** @type {'one'|'many'|'any'} */
    cardinality;
    /** @type {boolean} */
    required;

    /**
     * @param {string} name 
     * @param {string} description 
     * @param {string[]} types 
     * @param {string} typesHint 
     */
    constructor(name, description, types, typesHint = '') {
        this.name = name;
        this.description = description;
        this.types = types;
        this.required = typesHint.includes('required');
        this.cardinality = typesHint.includes('singleton') ? 'one' : (typesHint.includes('multiple') ? 'many' : 'any');
    }
}

class TypeDefinition {
    /** @type {string} */
    type;
    /** @type {string?} */
    description;
    /** @type {string[]} */
    baseTypes = [];
    /** @type {string?} */
    url;
    /** @type {FieldDefinition[]} */
    fields = [];
    /** @type {FieldDefinition?} */
    simpleType;
    /** @type {{title: string, data: string}[]} */
    examples = [];
    /** @type {Record<string, string>?} */
    enumValues;
    
    constructor(srcFile) {
        try {
            this.type = srcFile.type;
            this.description = srcFile.description;
            this.url = srcFile.uri;
            this.baseTypes = (srcFile.base || []).map(base => processType(base['@id'], base));
            if (!srcFile.context) {
                throw new Error(`type ${this.type} has no context`);
            }
            /** @type {FieldDefinition} */
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

            this.fields = fieldDefs.map(([key, entry]) => {
                if (processType(entry["@id"], entry, true) === this.type) {
                    thisDef = new FieldDefinition(key, this.getFieldDescription(entry), getEntryTypes(key, entry), 'singleton');
                    return;
                }
                if (key === 'URL') {
                    key = '@id';
                }
                return new FieldDefinition(key, this.getFieldDescription(entry), getEntryTypes(key, entry), entry['types-hint']);
            }).filter(v => typeof v !== 'undefined');
            if (this.type.indexOf('Enumeration') === -1 && this.type.startsWith('Enum') && this.fields.length === 0) {
                const enumValues = Object.entries(context).filter(([_, entry]) => typeof entry === 'string' && entry.indexOf('s4i:Enumeration') === -1 && entry.startsWith('s4i:Enum')).map(([value, key]) => ({
                    key: key.split('#').pop(),
                    value
                }));
                thisDef = new FieldDefinition(this.type, '', enumValues.map(({ key }) => `'${key}'`), 'singleton');
                this.enumValues = {};
                for (const { key, value }
                    of enumValues) {
                    this.enumValues[key] = value;
                }
            }
            if (this.fields.length === 0 && thisDef) {
                this.simpleType = thisDef;
            }
            this.examples = (srcFile.playground || []).map(pg => ({ title: pg.title, data: pg.input }));
        } catch (e) {
            throw new Error(`generating type ${this.type} failed: ${e.message}`);
        }
    }

    listAncestors( /** @type {TypeDefinition[]}*/ typeDefinitions) {
        const directAncestors = typeDefinitions.filter(t => this.baseTypes.includes(t.type));
        /** @type {TypeDefinition[]}*/
        const allAncestors = [];
        let nextGenAncestors = directAncestors;
        do {
            allAncestors.push(...nextGenAncestors);
            nextGenAncestors = typeDefinitions.filter(t => !allAncestors.includes(t) && nextGenAncestors.some(a => a.baseTypes.includes(t.type)));
        } while (nextGenAncestors.length > 0);
        return allAncestors;
    }

    listDescendants( /** @type {TypeDefinition[]}*/ typeDefinitions) {
        const directDescendants = typeDefinitions.filter(t => t.baseTypes.includes(this.type));
        /** @type {TypeDefinition[]}*/
        const allDescendants = [];
        let nextGenDescendants = directDescendants;
        do {
            allDescendants.push(...nextGenDescendants);
            nextGenDescendants = typeDefinitions.filter(t => !allDescendants.includes(t) && nextGenDescendants.some(a => t.baseTypes.includes(a.type)));
        } while (nextGenDescendants.length > 0);
        return allDescendants;
    }

    getFieldDescription(entry) {
        // TODO: Would be nice to read the description from the type definition. But at this point there is no way
        // to guarantee that the type definition is already loaded. It would take a second round of processing for the fields.
        return '';
    }
}

module.exports = {
    TypeDefinition,
    FieldDefinition,
};