
function urlToDomain(url) {
    return /^(?:https?:\/\/)(.*?)\/?$/.exec(url)[1];
}

/**
 * @param {string} url 
 * @param {Record<string, string>} knownPrefixes 
 */
function resolvePrefixes(url, knownPrefixes){
    if (url === '@id') {
        return { localName: '@id' };
    }
    const regexResult = /^((https?:\/\/(?<domain>[^/]+)\/)|(?<prefix>[\w]+):)(?<localName>[\w\-.]+)(#[\w\-.~%!$&'()*+,;=:@/?]*)?$/.exec(url);
    if (!regexResult) {
        throw new Error(`${url} is not a valid url`);
    }
    const {domain, prefix, localName} = regexResult.groups ?? {};
    if (prefix && !knownPrefixes[prefix]) {
        throw new Error(`${url} references unknown prefix ${prefix}`);
    }
    return {
        localName,
        domain: prefix ? knownPrefixes[prefix] : domain,
        prefix
    }
}

/**
 * @param {string} type
 * @param {any} typeObject
 * @param {string} domain
 * @param {Dependencies} dependencies
 * @param {Record<string, string>?} knownPrefixes
 * @param {boolean?} ignoreExternal
 * @returns {string}
 */
function processType(type, typeObject, domain, dependencies, knownPrefixes, ignoreExternal) {
    if (type === '@vocab' && typeObject['@context']) {
        const { localName: vocabLocalName, domain: vocabDomain } = resolvePrefixes(typeObject['@context']['@vocab'], knownPrefixes);
        if (vocabDomain === domain) {
            return vocabLocalName;
        }
        // Foreign enums are not included in the types for the schema
        return 'string';
    }
    const { localName, domain: typeDomain, prefix } = resolvePrefixes(type, knownPrefixes);
    if (localName === '@id' && !typeDomain) {
        return 'string';
    }
    if (typeDomain === domain) {
        return localName;
    }
    if (ignoreExternal) {
        return;
    }
    let dependency = dependencies.find(dep => dep.domain === typeDomain);
    if (!dependency) {
        let suggestedPrefix = prefix;
        let prefixCounter = 0;
        while (!suggestedPrefix || dependencies.some(dep => dep.prefix === suggestedPrefix)) {
            suggestedPrefix = `ns${++prefixCounter}`;
        }
        dependency = { prefix: suggestedPrefix, domain: typeDomain };
        dependencies.push(dependency);
    }
    return `${dependency.prefix}.${localName}`;
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

/**
 * @typedef {{prefix: string, domain: string}[]} Dependencies
 */

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
    
    /**
     * @param {string} domain 
     * @param {any} srcFile 
     * @param {Dependencies} dependencies
     */
    constructor(domain, srcFile, dependencies) {
        try {
            this.type = srcFile.type;
            this.description = srcFile.description;
            this.url = srcFile.uri;
            this.baseTypes = (srcFile.base || []).map(base => processType(base['@id'], base, domain, dependencies));
            if (!srcFile.context) {
                throw new Error(`type ${this.type} has no context`);
            }
            /** @type {FieldDefinition} */
            let thisDef;
            const context = srcFile.context['@context'];
            const knownPrefixes = Object.fromEntries(
                Object.entries(context).
                filter(([_, value]) => typeof value === 'string' && /^https?:\/\//.test(value)).
                map(([prefix, url]) => [prefix, urlToDomain(url)])
            );
            for (const knownPrefix of Object.keys(knownPrefixes)) {
                delete context[knownPrefix];
            }

            const fieldDefs = Object.entries(context).filter(([_, entry]) => typeof entry === 'object');

            function getEntryTypes(key, entry) {
                if (entry['@type']) {
                    return [processType(entry['@type'], entry, domain, dependencies, knownPrefixes)];
                } else if (srcFile.multipletypes[key]) {
                    return srcFile.multipletypes[key].map(t => processType(t['@id'], t, domain, dependencies));
                } else {
                    throw new Error(`Property ${key} on type ${this.type} has no type defined`);
                }
            }

            this.fields = fieldDefs.map(([key, entry]) => {
                if (processType(entry["@id"], entry, domain, dependencies, knownPrefixes, true) === this.type) {
                    thisDef = new FieldDefinition(key, this.getFieldDescription(entry), getEntryTypes(key, entry), 'singleton');
                    return;
                }
                if (key === 'URL') {
                    key = '@id';
                }
                return new FieldDefinition(key, this.getFieldDescription(entry), getEntryTypes(key, entry), entry['types-hint']);
            }).filter(v => typeof v !== 'undefined');
            if (this.baseTypes.some(t => /([/w+]\.)?Enumeration$/.test(t))) {
                const enumValues = Object.entries(context).filter(([_, entry]) => typeof entry === 'string' && resolvePrefixes(entry, knownPrefixes).domain === domain).map(([value, key]) => ({
                    key: key.split('#').pop(),
                    value
                }));
                thisDef = new FieldDefinition(this.type, '', enumValues.map(({ key }) => `'${key}'`), 'singleton');
                this.enumValues = {};
                for (const { key, value } of enumValues) {
                    this.enumValues[key] = value;
                }
            }
            if (this.fields.length === 0 && thisDef) {
                this.simpleType = thisDef;
            }
            this.examples = (srcFile.playground || []).map(pg => ({ title: pg.title, data: pg.input }));
        } catch (e) {
            const error = new Error();
            error.stack = `generating type ${this.type} failed: ${e.stack}`;
            throw error;
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