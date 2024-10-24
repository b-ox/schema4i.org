
/**
 * @typedef {import('./type-definition').TypeDefinition} TypeDefinition
 */

class Schema {
    /** @type {string} */
    domain;
    /** @type {TypeDefinition[]} */
    types;
    /** @type {string[]} */
    dependsOn;

    constructor(/** @type {string} */ domain, /** @type {TypeDefinition[]} */ types, /** @type {string[]?} */ dependsOn) {
        this.domain = domain;
        this.types = types;
        this.dependsOn = dependsOn ?? [];
    }
}

module.exports = {
    Schema
};
