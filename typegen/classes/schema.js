
/**
 * @typedef {import('./type-definition').TypeDefinition} TypeDefinition
 * @typedef {import('../classes/type-definition').Dependencies} Dependencies
 */

class Schema {
    /** @type {string} */
    domain;
    /** @type {TypeDefinition[]} */
    types;
    /** @type {Dependencies} */
    dependsOn;

    constructor(/** @type {string} */ domain, /** @type {TypeDefinition[]} */ types, /** @type {Dependencies?} */ dependsOn) {
        this.domain = domain;
        this.types = types;
        this.dependsOn = dependsOn ?? [];
    }
}

module.exports = {
    Schema
};
