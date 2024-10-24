/*
 * This node.js build script collects the configuration files
 * of the Semantic Data Model for insurances and transforms it
 * to JSON-LD context files writing to the dist directory.
 */

const fs = require("fs").promises;
const path = require("path");

// configuration
let typeIndex = {
    name: "Schema4i.org",
    description: "Schema for insurances (S4i)",
    release: 0.93,
    modified: new Date(),
    objects: 0,
    enumerations: 0,
    types: [],
};

/**
 * Emties a directory or creates it if it does not exist.
 * 
 * @param {string} dir 
 * @param {string[]?} suffixes 
 * @param {Console?} consoleLike 
 */
async function cleanDir(dir, suffixes, consoleLike) {
    try {
        await fs.access(dir);
        consoleLike.log("\nCleaning directory: " + dir);
        const files = await fs.readdir(dir);
        await Promise.all(files.filter(file => !suffixes || suffixes.some(suffix => file.endsWith(suffix))).map(file => {
            return fs.unlink(path.resolve(dir, file));
        }));
    } catch (e) {
        consoleLike.log("\nCreating directory: " + dir);
        await fs.mkdir(dir, { recursive: true });
    }
}

/**
 * 
 * Build the JSON-LD schema files from the source.
 * 
 * @param {string} domain The domain name of the target schema.
 * @param {string} outputDir The directory where the output files are written.
 * @param {{
 *  sourceDir?: string,
 *  outputSourceDir?: string,
 *  clean?: boolean,
 *  consoleLike?: Console
 * }} options Options for the generation.
 * @param options.sourceDir The path to the directory containing the JSON source files. Default is the `src` directory of this project.
 * @param options.outputSourceDir The path to the directory where the JSON source files should be copied to. If this is a relative path, it is resolved relative to the output directory.
 * @param options.clean If true, the output directory is cleaned before the generation. Default is true.
 * @param options.consoleLike an object with a log function similar to a console.
 */
async function buildSchema(domain, outputDir, options) {

    let sourceDir = 'src/';
    let outputSourceDir;
    let clean = true;
    let consoleLike = console;

    if (typeof options === 'string') {
        outputSourceDir = options;
        consoleLike = arguments[3];
        consoleLike = Object.assign({}, console, consoleLike);
        consoleLike.warn('WARN: Passing separate arguments is deprecated. Use "buildSchema(environment, outputDir, options)" syntax instead.');
    } else if (options) {
        sourceDir = options.sourceDir ?? sourceDir;
        outputSourceDir = options.outputSourceDir;
        clean = options.clean !== false;
        consoleLike = Object.assign({}, console, options.consoleLike);
    }

    if (clean) {
        await cleanDir(outputDir, ['.jsonld', 'index.json', '.md'], consoleLike);
    } else {
        await fs.mkdir(outputDir, { recursive: true });
    }

    consoleLike.log('Scanning: "src"');

    if (outputSourceDir) {
        outputSourceDir = path.isAbsolute(outputSourceDir) ? outputSourceDir : path.resolve(outputDir, outputSourceDir);
        if (clean) {
            await cleanDir(outputSourceDir, ['.src.json', '.md'], consoleLike);
        } else {
            await fs.mkdir(outputSourceDir, { recursive: true });
        }
    }
    sourceDir = path.isAbsolute(sourceDir) ? sourceDir : path.resolve(__dirname, '..', sourceDir);

    // process all jsonld files
    const files = await fs.readdir(sourceDir);
    // export context from src files
    for (const file of files) {
        consoleLike.log("\nFound: " + file);
        if (file.endsWith(".src.json")) {
            let data = await fs.readFile(path.resolve(sourceDir, file), 'utf-8');

            // replace namespace to match environment
            data = data.replace(/pending.schema4i.org\//g, domain + '/');
            data = data.replace(/schema4i.org\//g, domain + '/');

            // parse data
            const obj = JSON.parse(data);

            // do some requiredd field checks
            consoleLike.log('Checking required attributes: type, uri, description, links, base, multipletypes, context.');
            for (const field of ['type', 'uri', 'description', 'links', 'context', 'base', 'multipletypes', 'context']) {
                if (!obj[field]) {
                    throw new Error(`No attribute "${field}" found in ${file}.`);
                }

            }

            // prepare dependencies 
            consoleLike.log('Preparing dependencies (base, parents, multipletypes, @context)');
            const dependencies = obj.parents.concat(obj.base);
            for (const key in obj.multipletypes) {
                for (const object of obj.multipletypes[key]) {
                    if (!object['@id'].startsWith('http://schema.org') && !object['@id'].startsWith('https://schema.openontology.org'))
                        dependencies.push(object);
                    else
                        consoleLike.log('Skip native schema type.')
                }
            }
            for (const key in obj.context['@context']) {
                if (typeof obj.context['@context'][key] === 'object') {
                    // remove internal field for type generator, jsonld processor does not like this
                    delete obj.context['@context'][key]['types-hint'];
                    if (obj.context['@context'][key]['@type']) {
                        if (obj.context['@context'][key]['@type'].startsWith('s4i:')) {
                            dependencies.push({
                                "@id": "http://" + domain + "/" + obj.context['@context'][key]['@type'].substring(obj.context['@context'][key]['@type'].indexOf(':') + 1)
                            })
                        } else if (obj.context['@context'][key]['@type'] === '@vocab') {
                            const vocab = obj.context['@context'][key]['@context']['@vocab'];
                            if (!vocab.startsWith('schema')) {
                                dependencies.push({
                                    "@id": "http://" + domain + "/" + vocab.substring(vocab.indexOf(':') + 1, vocab.indexOf('#'))
                                });
                                dependencies.push({
                                    "@id": "http://" + domain + "/" + vocab.substring(vocab.indexOf(':') + 1, vocab.indexOf('#')) + "_DE"
                                });
                            }
                        }
                    }
                }
            }
            // console.log(dependencies);

            // check dependencies
            for (const parentConfig of (dependencies || [])) {
                // for (const parentConfig of(obj.parents || [])) {
                const parent = parentConfig["@id"];
                let objectName = "";
                let attributeName = "";

                if (parent.lastIndexOf("#") !== -1) {
                    objectName = parent.substring(
                        parent.lastIndexOf("/") + 1,
                        parent.lastIndexOf("#")
                    );
                    attributeName = parent.substr(parent.lastIndexOf("#") + 1);
                    consoleLike.log(
                        'Checking dependency "' + objectName + "#" + attributeName + '".'
                    );
                } else {
                    objectName = parent.substr(parent.lastIndexOf("/") + 1);
                    consoleLike.log('Checking dependency "' + objectName + '".');
                }
                let parentFile = await fs.readFile(path.resolve(sourceDir, objectName + ".src.json"), 'utf-8');
                parentFile = JSON.parse(parentFile);

                if (obj.type.indexOf("Enumeration") === -1 && !obj.type.startsWith("Enum") && attributeName !== '') {
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
                                throw new Error(`No attribute "${attributeName}" found in object "${objectName}".`);
                            }
                        } else {
                            throw new Error(`No attribute "${attributeName}" found in object "${objectName}".`);
                        }
                    }
                }
            };

            if (obj.type.indexOf("Enumeration") === -1 && !obj.type.startsWith("Enum")) {
                // check examples for objects
                if (!obj.playground) {
                    consoleLike.warn(`Playground examples not found in ${file}.`);
                }
            } else {
                // check if their is a translation link
                if (obj.type.indexOf("_DE") !== -1) {
                    // check for English documentation
                    let ok = false;
                    obj.links.forEach(function(link) {
                        if (link.url.indexOf(obj.type.replace("_DE", "")) !== -1) {
                            ok = true;
                        }
                    });
                    if (!ok) {
                        throw new Error(`Link to English documentation not found in "${obj.type}.src.json".`);
                    }
                } else if (obj.type.indexOf("Enumeration") === -1) {
                    // check for German documentation
                    let ok = false;
                    obj.links.forEach(function(link) {
                        if (link.url.indexOf(obj.type + "_DE") !== -1) {
                            ok = true;
                        }
                    });
                    if (!ok) {
                        throw new Error(`Link to German documentation not found in "${obj.type}.src.json".`);
                    }
                }
            }

            // write @context to file
            await fs.writeFile(outputDir + "/" + obj.type + ".jsonld",
                JSON.stringify(obj["context"], null, 2)
            );
            consoleLike.log("JSON-LD context for " + obj.type + " exported.");

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

            if (outputSourceDir) {
                // write source file 
                await fs.writeFile(path.resolve(outputSourceDir, obj.type + ".src.json"),
                    JSON.stringify(obj, null, 2)
                );
                // copy readme source file
                // if (outputSourceDir) {
                //     fs.copyFile(path.resolve(outputSourceDir, 'README.md'), path.resolve(outputSourceDir, 'README.md'));
                // }
            }

        } else {
            consoleLike.log("WARNING: Ignore file.");
        }
    };

    // write index.json file
    await fs.writeFile(outputDir + "/index.json",
        JSON.stringify(typeIndex, null, 2)
    );
    consoleLike.log("Write list of " + typeIndex.types.length + " types to " + outputDir + "/index.json");

    // write sitemap file
    let sitemap = 'https://' + domain + '\n';
    sitemap += 'https://' + domain + '/documentation\n';
    sitemap += 'https://' + domain + '/samples\n';
    sitemap += 'https://' + domain + '/models\n';
    sitemap += 'https://' + domain + '/about\n';
    for (const type of typeIndex.types) {
        sitemap += type.uri.replace('http', 'https') + '\n';
    }
    await fs.writeFile(outputDir + "/sitemap.txt", sitemap);
    consoleLike.log("Write sitemap.txt to " + outputDir + "/sitemap.txt");

    let robots = 'Sitemap: https://' + domain + '/sitemap.txt';
    await fs.writeFile(outputDir + "/robots.txt", robots);
    consoleLike.log("Write robots.txt to " + outputDir + "/robots.txt");

}

module.exports = buildSchema;