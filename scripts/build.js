/*
 * This node.js build script collects the configuration files
 * of the Semantic Data Model for insurances and transforms it
 * to JSON-LD context files writing to the dist directory.
 */

const fs = require("fs").promises;
const path = require("path");

// environments
const environments = {
    PRODUCTION: "schema.b-ox.org",
    TEST: "pending.schema.b-ox.org"
};

// configuration
const fromPath = "src/";
let toPath = "dist/";
let typeIndex = {
    name: "schema.b-ox.org",
    description: "Semantic Data Model for Insurances",
    objects: 0,
    enumerations: 0,
    types: [],
};

// build schema
async function buildSchema(environment) {

    const outputDir = path.resolve(toPath, environment);

    if (Object.values(environments).includes(environments)) {
        //TODO: Throw error outside git action
    } else {
        console.log(`creating custom environment ${environment}. This can be used for testing and development purposes. The output must not be add to the repository.`);
    }

    //clean
    await fs.rmdir(outputDir, { recursive: true });

    console.log("\nCreating environment: " + environment);
    await fs.mkdir(outputDir);
    console.log('Scanning: "src"');

    // process all jsonld files
    const files = await fs.readdir(fromPath);
    // export context from src files
    for (const file of files) {
        console.log("\nFound: " + file);
        if (file.endsWith(".src.json")) {
            let data = await fs.readFile(fromPath + file, 'utf-8');

            // replace namespace to match environment
            data = data.replace(/schema.b-ox.org\//g, environment + '/');

            // parse data
            const obj = JSON.parse(data);

            // do some checks
            for (const field of ['type', 'uri', 'description', 'links', 'context']) {
                if (!obj[field]) {
                    throw new Error(`SYNTAX ERROR: No "${field}" found in ${file}.`);
                }

            }

            // do some checks
            if (!obj.type) {
                throw new Error(`SYNTAX ERROR: No "type" found in ${file}.`);
            }

            // check for parent file and attributes
            for (const parentConfig of (obj.parents || [])) {
                const parent = parentConfig["@id"];
                let objectName = "";
                let attributeName = "";

                if (parent.lastIndexOf("#") !== -1) {
                    objectName = parent.substring(
                        parent.lastIndexOf("/") + 1,
                        parent.lastIndexOf("#")
                    );
                    attributeName = parent.substr(parent.lastIndexOf("#") + 1);
                    console.log(
                        'Checking parent "' + objectName + "#" + attributeName + '".'
                    );
                } else {
                    objectName = parent.substr(parent.lastIndexOf("/") + 1);
                    console.log('Checking parent "' + objectName + '".');
                }
                try {
                    let parentFile = await fs.readFile(fromPath + objectName + ".src.json", 'utf-8');
                    parentFile = JSON.parse(parentFile);

                    if (!obj.type.startsWith("Enum")) {
                        // check parent of attribute
                        if (!parentFile.context["@context"][attributeName]) {
                            if (
                                Array.isArray(
                                    parentFile.context["@context"][objectName]["@context"]
                                )
                            ) {
                                const ok = parentFile.context["@context"][objectName][
                                    "@context"
                                ].some((extContext) => extContext.endsWith(attributeName + ".jsonld"));
                                if (!ok) {
                                    throw new Error(`SYNTAX ERROR: No attribute "${attributeName}" found in object "${objectName}".`);
                                }
                            } else {
                                throw new Error(`SYNTAX ERROR: No attribute "${attributeName}" found in object "${objectName}".`);
                            }
                        }
                    }
                } catch (error) {
                    throw new Error(`SYNTAX ERROR: source file found for object "${objectName}".`);
                }
            };

            if (!obj.type.startsWith("Enum")) {
                // check examples for objects and attributes
                if (!obj.playground) {
                    console.warn(`SYNTAX ERROR: Playground examples not found in ${file}.`);
                }
            } else {
                // check if their is a translation link
                if (obj.type.indexOf("_DE") !== -1) {
                    // check for English documentation
                    let ok = false;
                    obj.links.forEach(function (link) {
                        if (link.url.indexOf(obj.type.replace("_DE", "")) !== -1) {
                            ok = true;
                        }
                    });
                    if (!ok) {
                        throw new Error(`SYNTAX ERROR: Link to English documentation not found in "${obj.type}.src.json".`);
                    }
                } else {
                    // check for German documentation
                    let ok = false;
                    obj.links.forEach(function (link) {
                        if (link.url.indexOf(obj.type + "_DE") !== -1) {
                            ok = true;
                        }
                    });
                    if (!ok) {
                        throw new Error(`SYNTAX ERROR: Link to German documentation not found in "${obj.type}.src.json".`);
                    }
                }
            }

            // write @context to file
            await fs.writeFile(outputDir + "/" + obj.type + ".jsonld",
                JSON.stringify(obj["context"], null, 2)
            );
            console.log("JSON-LD context for " + obj.type + " exported.");

            // add to index
            if (obj.type.indexOf("Enum") !== -1) {
                typeIndex.enumerations++;
            } else {
                typeIndex.objects++;
            }
            typeIndex.types.push({
                id: obj.type,
                uri: obj.uri,
                url: obj.uri + ".jsonld",
            });
        } else {
            console.log("WARNING: Ignore file.");
        }
    };

    // write index.json file
    await fs.writeFile(outputDir + "/index.json",
        JSON.stringify(typeIndex, null, 2)
    );
    console.log(
        "\nWrite list of " +
        typeIndex.types.length +
        " types to " +
        outputDir +
        "index.json"
    );
}

(async () => {
    const environment = process.argv[2];
    if (!environment) {
        throw new Error('usage: npm run build <HostURL>');
    }
    const hostUrl = environment.replace(/^[^:/]+:\/\//, '');
    console.log("node build.js " + hostUrl);
    await buildSchema(hostUrl);
})().catch((e) => {
    console.error('build failed with error: ', e);
    process.exit(1);
});