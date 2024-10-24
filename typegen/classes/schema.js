
/**
 * @typedef {import('./type-definition').TypeDefinition} TypeDefinition
 */

class Schema {
    /** @type {string} */
    domain;
    /** @type {TypeDefinition[]} */
    types = [];
    /** @type {string[]} */
    dependsOn = [];

    constructor(/** @type {string} */ domain) {
        this.domain = domain;
    }
}

module.exports = {
    Schema
};
