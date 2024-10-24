const {Schema} = require('../classes/schema');
const {TypeDefinition, FieldDefinition} = require('../classes/type-definition');

const DOMAIN = 'schema.org';

const PRIMITIVE_TYPES = {
    'URL': 'string',
    'Text': 'string',
    'Boolean': 'boolean',
    'Date': 'string',
    'DateTime': 'string',
    'Time': 'string',
    'Duration': 'string',
    'Integer': 'number',
    'Number': 'number',
    'PaymentMethod': 'string',
    'paymentStatusType': 'string',
    'ItemListOrderType': 'string',
    'OfferItemCondition': 'string',
    'BusinessFunction': 'string',
    'DeliveryMethod': 'string',
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
