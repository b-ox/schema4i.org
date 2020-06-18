/**
 * This node.js build script collects the configuration files
 * of the Semantic Data Model for insurances and transforms it
 * to JSON-LD context files writing to the dist directory.
 */

const fs = require('fs-extra');

// environments
const prod = "schema.b-ox.org";
const test = "pending.schema.b-ox.org";
const devel = "localhost:4201";

// configuration
const fromPath = "src/";
let toPath = "dist/";
let typeIndex = {
    "name": "schema.b-ox.org",
    "description": "Semantic Data Model for Insurances",
    "objects": 0,
    "enumerations": 0,
    "types": []
};

// clean
if (fs.existsSync(toPath)) {
    fs.removeSync(toPath);
}
fs.mkdirSync(toPath);

// build schema
async function buildSchema(environment) {

    let error = false;
    if (environment === 'prod' || environment === 'test' || environment === 'devel') {

        console.log('\nCreating environment: ' + environment);
        fs.mkdirSync(toPath + eval(environment));
        console.log('Scanning: "src"');
        let error = false;

        // process all jsonld files
        const files = fs.readdirSync(fromPath);
        if (!files) {
            console.log("ERROR: Could not scan directory: ", error);
            error = true;
        } else {

            // export context from src files
            files.forEach(function(file, index) {

                console.log('\nFound: ' + file);
                if (file.endsWith('.src.json')) {

                    let data = fs.readFileSync(fromPath + file);
                    if (!data) {
                        console.error("ERROR: Could not read file: ", error);
                        error = true;
                    } else {
                        try {
                            // replace namespace for testing purposes
                            if (environment === 'test' || environment === 'devel') {
                                data = data.toString();
                                data = data.replace(/schema.b-ox.org\//g, (environment === 'devel' ? devel + '/' : test + '/'));
                            }

                            // parse data
                            const obj = JSON.parse(data);

                            // do some checks
                            if (!obj.type) {
                                console.log('TEST', 'SYNTAX ERROR: No "type" found.');
                                error = true;
                            }
                            if (environment !== 'devel' && (!obj.uri || (!obj.uri.includes('http://schema.b-ox.org') && !obj.uri.includes('http://pending.schema.b-ox.org')))) {
                                console.log('TEST', 'SYNTAX ERROR: No "uri" found or uri not in namespace http://schema.b-ox.org or http://pending.schema.b-ox.org.');
                                error = true;
                            }
                            if (!obj.description || obj.description === "") {
                                console.log('TEST', 'SYNTAX ERROR: No "description" found or description is empty.');
                                error = true;
                            }
                            if (!obj.links) {
                                console.log('TEST', 'SYNTAX ERROR: No "links" array found.');
                                error = true;
                            }
                            if (!obj['context']) {
                                console.log('TEST', 'SYNTAX ERROR: No "context" found.');
                                error = true;
                            }

                            // check for parent file and attributes
                            obj.parents.forEach(function(file, index) {
                                const parent = file['@id'];
                                let objectName = '';
                                let attributeName = '';

                                if (parent.lastIndexOf('#') !== -1) {
                                    objectName = parent.substring((parent.lastIndexOf('/') + 1), parent.lastIndexOf('#'));
                                    attributeName = parent.substr((parent.lastIndexOf('#') + 1));
                                    console.log('Checking parent "' + objectName + '#' + attributeName + '".');
                                } else {
                                    objectName = parent.substr(parent.lastIndexOf('/') + 1);
                                    console.log('Checking parent "' + objectName + '".');
                                }
                                try {
                                    let parentFile = fs.readFileSync(fromPath + objectName + '.src.json');
                                    parentFile = JSON.parse(parentFile);

                                    if (!obj.type.startsWith('Enum')) {

                                        // check parent of attribute 
                                        if (!parentFile.context['@context'][attributeName]) {
                                            if (Array.isArray(parentFile.context['@context'][objectName]['@context'])) {
                                                let ok = false;
                                                parentFile.context['@context'][objectName]['@context'].forEach(function(extContext) {
                                                    if (extContext.endsWith(attributeName + '.jsonld')) {
                                                        ok = true;
                                                    }
                                                })
                                                if (!ok) {
                                                    console.log('TEST', 'SYNTAX ERROR: No attribute "' + attributeName + '" found in object "' + objectName + '".');
                                                    error = true;
                                                }
                                            } else {
                                                console.log('TEST', 'SYNTAX ERROR: No attribute "' + attributeName + '" found in object "' + objectName + '".');
                                                error = true;
                                            }
                                        }

                                    }

                                } catch (error) {
                                    console.log('TEST', 'SYNTAX ERROR: No source file found for object "' + objectName + '".');
                                    error = true;
                                }

                            });


                            if (!obj.type.startsWith('Enum')) {

                                // check examples for objects and attributes
                                if (!obj.playground) {
                                    console.log('TEST', 'SYNTAX ERROR: Playground examples not found.');
                                }

                            } else {

                                // check if their is a translation link
                                if (obj.type.indexOf('_DE') !== -1) {

                                    // check for English documentation
                                    let ok = false;
                                    obj.links.forEach(function(link) {
                                        if (link.url.indexOf(obj.type.replace('_DE', '')) !== -1) {
                                            ok = true;
                                        }
                                    });
                                    if (!ok) {
                                        console.log('TEST', 'SYNTAX ERROR: Link to English documentation not found in "' + obj.type + '".src.json.');
                                        error = true;
                                    }
                                } else {

                                    // check for German documentation
                                    let ok = false;
                                    obj.links.forEach(function(link) {
                                        if (link.url.indexOf(obj.type + '_DE') !== -1) {
                                            ok = true;
                                        }
                                    });
                                    if (!ok) {
                                        console.log('TEST', 'SYNTAX ERROR: Link to German documentation not found in "' + obj.type + '".src.json.');
                                        error = true;
                                    }
                                }

                            }

                            // stop if error
                            if (error) {
                                console.log('\nERROR\n', 'Syntax error in JSON-LD source files ' + file);
                            } else {

                                // write @context to file
                                fs.writeFileSync(toPath + eval(environment) + '/' + obj.type + '.jsonld', JSON.stringify(obj['context'], null, 2));
                                console.log('JSON-LD context for ' + obj.type + ' exported.');

                                // add to index
                                if (obj.type.indexOf('Enum') !== -1) { typeIndex.enumerations++; } else { typeIndex.objects++; }
                                typeIndex.types.push({
                                    id: obj.type,
                                    uri: obj.uri,
                                    url: obj.uri + '.jsonld'
                                });
                            }

                        } catch (exception) {
                            console.log('ERROR: ' + exception);
                        }

                    }
                } else {
                    console.log('WARNING: Ignore file.');
                }
            });

            // write index.json file
            if (!error) {
                fs.writeFileSync(toPath + eval(environment) + '/index.json', JSON.stringify(typeIndex, null, 2));
                console.log('\nWrite list of ' + typeIndex.types.length + ' types to ' + toPath + 'index.json');
            }

        }

    } else {
        error = true;
        console.log('ERROR: Missing parameter environment (prod, test, devel).');
    }

    if (error) {
        console.log('BUILD FAILED');
    } else {
        console.log('BUILD SUCCESSFUL');
    }

}

(async() => {
    try {
        const environment = process.argv[2];
        console.log('node build.js ' + environment);
        await buildSchema(environment);
    } catch (error) {
        console.log('ERROR: ' + error);
    }
})();