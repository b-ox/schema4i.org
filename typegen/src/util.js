
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

module.exports = {
    formatDoc,
    joinWithLineBreaks
}