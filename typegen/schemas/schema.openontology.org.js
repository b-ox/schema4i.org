const {Schema} = require('../classes/schema');
const {TypeDefinition, FieldDefinition} = require('../classes/type-definition');

const DOMAIN = 'schema.openontology.org';

const PRIMITIVE_TYPES = {
    'definitions/string': 'string',
    'definitions/boolean': 'boolean',
    'definitions/money': 'number',
    'definitions/date': 'string',
    'definitions/temporal-interval': 'number',
    'definitions/nonnegative-integer': 'number',
    'definitions/salutation': 'number',
}

/** @type {Promise<Schema>} */
let schema;

/**
 * @returns {Promise<Schema>}
 */
function load() {
    schema ??= (async () => {
        const types = [];
        for (const [type, primitive] of Object.entries(PRIMITIVE_TYPES)) {
            const typeDef = new TypeDefinition({type, context: { '@context': [] }});
            typeDef.simpleType = new FieldDefinition(type, '', [primitive], 'singleton');
            types.push(typeDef);
        }
        return new Schema(DOMAIN, types);
    })();
    return schema;
}

module.exports = {
    DOMAIN,
    load,
}
