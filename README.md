# Welcome to [Schema4i.org](https://schema4i.org)

Inspired by the work of [JSON for Linked Data](https://json-ld.org/) and [Schema.org](https://schema.org/) [we](https:///schema4i.org/page/about) build a **Schema for insurances** (also called **Schema4i** or **S4i**). Schema4i.org is the first and worldwide only **Semantic Data Model for Insurances** and its **open and free** for use. As a **shared vocabulary** [Schema4i.org](https://schema4i.org) makes it easier for API developers and website operators to get the maximum benefit from data.  It was created with a clear focus on linking data, integrates other standards and it might be used especially in the insurance industry or beyond. You can use it to provide APIs and websites with **insurance-related meaning** for better networking with other participants in the industry. Why? Because in the future everything's driven by [linked data](https://en.wikipedia.org/wiki/Linked_data). 

## About this repository

This is the [Schema4i.org](https://schema4i.org) project repository. It contains all the types (objects, attributes and enumerations) and the JSON-LD context files used to publish on [Schema4i.org](https://schema4i.org) and [Pending.Schema4i.org](https://pending.schema4i.org). While the first site hosts official releases of Schema4i, the second one is updated more frequently containing the data models waiting for official release deployment. Follow the URLs to open the sites.

**If you just want to learn more about how to use Schema for insurances, this repo is not the right place for you. Please visit [Schema4i.org](https://schema4i.org) instead for documentation and samples.**

### Installation

Fork or check out this project and navigate to the projects root directory on your local machine then type `npm install`. You need a [Node.js](https://nodejs.org/en/) environment (version >= 12.10) installed on your machine. Afterwards you can find a directory `node_modules` with some libraries used by the build process.

### Build

All our types (objects, attribute, enumerations) are desccribed in JSON files with the suffix **.src.json**. The graphical user interface of our sites works on these files because - besides the included JSON-LD context - they contain the human-readable documentation of the type, links to web ressources and examples you can use in a JSON-LD Playground.

The `npm run build <HostURL>` command will scan these files, extract the JSON-LD context and write it to an output directory. The `HostURL` ist the URL of the page the output will be hosted on. During the build all Context-URLs referencing [schema4i.org](schema4i.org) will be rewritten to be relative to the `HostURL`. The build also writes the file `index.json`, `sitemap.txt` and `robots.txt` that contains a list of all types and the number of objects / attribute and enumerations.

For more info on how to use the `build` command please call `npm run build -- --help`.

The two officially maintained Hosts are [schema4i.org](schema4i.org) and [pending.schema4i.org](pending.schema4i.org). You are free to use a different `HostURL` for local builds to match your requirements during development and testing.

### More documentation

Please also check out the [Schema4i.org Wiki](https://github.com/b-ox/schema4i.org/wiki) here on Github. There you will find some hints for modeling S4i.

## Basic principle

We use things that are already defined elsewhere to prevent reinventing the wheel. Our base vocabulary is [Schema.org](https://schema.org). We always search there for objects (types) like [schema.org/Person](https://schema.org/Person), attributes (properties) like [schema.org/givenName](https://schema.org/givenName)) or data types like [schema.org/Text](https://schema.org/Text)) before we add new things into our vocabulary. We also refer to parts of the [OpenOntology](https://openontology.org).

Only those objects, attributes oder data types are "part of the Schema for insurances" that have been declared in our JSON-LD context files. Of cause you can use everything else in your data exchange by just adding an additional context to the JSON-LD document.

## Improving the Schema4i

We are always interested in practical suggestions for improvements to [Schema4i.org](https://pending.schema4i.org). But we have given us some rules you should know and accept.

### Contribution

 Issues and proposals are managed in this repository. If you want to join our work please contact us and introduce yourself. You can fork this projekt and make pull requests to add new objects, attribute and enumerations.

Due to downwards compatibility don't change existing things. Do not remove objects and attributes or change their names nor meanings. Please do also not change enumeration types. Please report these issues instead. If you are new to Git and GitHub, there's a useful [introduction to Github](https://www.w3.org/2006/tools/wiki/Github) in the W3C Wiki.

### Priority

We try to prioritize simple fixes and improvements to our existing schemas, examples and documentation over the addition of new vocabulary, and we are most likely to add new schemas when there is evidence that some (preferably large-scale) consuming application will make use of the data. So we do not add things when they are probably not used immediately.

Consuming applications need not be search engines. Databases, broker and insurer systems or service providers with application programming interfaces are all rich areas for exploration and collaboration. The important thing is that there should be some reasonable expectation of data consumers making good use of the changes. It is not sufficient to justify additions on the basis that maybe search engines or other applications generally try to use the vocabulary. Please note: Smaller changes, and backwards-compatible changes, are easier to incorporate.

### Extensibility and practicability

Note that [Schema4i.org](https://pending.schema4i.org) does not attempt to capture the full detail of content in the web or in APIs; it is necessarily a simplification of a more complex reality. This means that there will be many cases where adding more detail to [Schema4i.org](https://pending.schema4i.org) will look possible. However, in the interests of keeping things simple for publishers, webmasters and developers, we will maybe choose not to add such detail. That's one of the reasons also to avoid complex object hierarchies in business entities. We allow only the use of one object level beneath an object. The good news: Schema4i uses the web standard JSON-LD that allows independent extensions.

We are also highly unlikely to take on large scale reorganizations of our terminology, if they are motivated solely by considerations of elegance, "proper modeling", ontological purity or conceptual unification. Although the project founders are very familiar with the traditions behind such concerns and were co-founders of a nameful standardization organisation in Germany. But therefore they know, that this concepts will increase complexity dramatically. Proposals for unifying, cross-domain logic-based knowledge structures may be better managed in those organizations. The approach of Schema4i is more pragmatic.

When we add terms, often into the "Pending" area ([pending.schema4i.org](https://pending.schema4i.org)), we strongly encourage feedback that takes a global perspective: how does a new term relate to others, how could it be used alongside pre-existing patterns, etc.

## Modeling rules

If you want to contribute, **fork this project**, add your objects, attributes and enumerations and send pull requests. Maybe then there will be a short discussion, but afterwards we publish your requests into the pending area so that **you and others can use it very fast**. When modeling the Semantic Data Model, we follow some guidelines. See also the [Wiki of Schema4i.org](https://github.com/b-ox/schema4i.org/wiki).

### Definitions and name conventions

 **Objects** we call a logical unit of attributes. It's a little bit similar to a field group containing field. **Attributes** are the properties of an object. These properties can be fields that have values. Most of the times the values are text values, date formats or keys of an enumeration. Attributes can also be links pointing to other objects or refer to other datasets via URL.

The names of objects and attributes or enumerations always start with a capital letter and ideally consists of a single word. In some cases it makes sense to use several words to define an object to get better meaning. In this case we use the "PascalCase" notation like e.g. in the object [**P**ostal**A**ddress](http://schema4i.org/PostalAddress).

### Modelling objects

Each object has a name that is defined by the `type` property in the JSON configuration file. The unqiue identifier is defined in the `uri` and is always a merge of `http://schema4i.org` and the name of the object like [http://schema4i.org/Person](http://schema4i.org/Person).

The human-readable meaning of the type is defined in `description`. If there are some web ressources that helps describing the meaning place it in the `links` array. It expects one or more JSON objects with the properties `url` and `description`.

The `parent` property references one or more objects and attribute that uses this type. It expects a JSON object with the only property `@id` to reference the object (and maybe the attribute in it) of the parent while both are separated by a hashtag (#). This URL ist later accessible so that you can directly navigate to the right position.

The `context` contains the actual JSON-LD context that will be exported as dedicated file while building. This files you can load from our site into your processor later. Within the `@context` there must be the `@version` property with the fixed value `1.1` followed by the prefix declaration `"s4i": "http://schema4i.org/"` and `"schema": "http://schema.org/"` (note the trailing slashes). When you reuse OpenOntology that `"oo" : "https://schema.openontology.org/"` is the namespace. The name of the object has to be declared and mapped to the desired meaning. Whenever possible use the meaning defined at Schema.org for the values of `@id` and `@type`. Doing like this JSON-LD consumers that can understand the meaning of Schema.org will understand this object automatically.

After this you have to put additional attributes to the context and define their meanings. You must always define both, the `@id` and `@type`. The type is important, because sometimes there is more than one type choosable. Rather, most of the times we choose the <http://schema.org/Text> data type if possible. If there is not data type available that fits your meaning, then you can e.g. use `"@type": "@vocab"` and define an enumeration with keys and values.

#### Example object source file

    {
        "type": "PostalAddress",
        "uri": "http://schema4i.org/PostalAddress",
        "description": "The mailing address.",
        "links": [{
            "url": "http://schema.org/PostalAddress",
            "description": "Original Schema.org type"
        }],
        "parents": [
            { "@id": "http://schema4i.org/Person#Address" },
            { "@id": "http://schema4i.org/Organization#Address" }
        ],
        "base": [
            { "@id": "http://schema4i.org/ContactPoint" }
        ],
        "multipletypes": {},
        "context": {
            "@context": {
                "@version": 1.1,
                "s4i": "http://schema4i.org/",
                "schema": "http://schema.org/",
                "PostalAddress": "schema:PostalAddress",
                "AddressCountry": {
                    "@id": "schema:addressCountry",
                    "@type": "@vocab",
                    "@context": {
                        "@vocab": "box:EnumCountryCode#"
                    }
                },
                "AddressLocality": {
                    "@id": "schema:addressLocality",
                    "@type": "schema:Text"
                },
                "AddressRegion": {
                    "@id": "schema:addressRegion",
                    "@type": "schema:Text"
                },
                "PostOfficeBoxNumber": {
                    "@id": "schema:postOfficeBoxNumber",
                    "@type": "schema:Text"
                },
                "PostalCode": {
                    "@id": "schema:postalCode",
                    "@type": "schema:Text"
                },
                "StreetAddress": {
                    "@id": "schema:streetAddress",
                    "@type": "schema:Text"
                }
            }
        },
        "playground": [{
            "title": "A maximum PostalAddress",
            "tab": "tab-expanded",
            "input": {
                "@context": {},
                "@type": "PostalAddress",
                "AddressCountry": "D",
                "AddressLocality": "Düsseldorf",
                "AddressRegion": "NRW",
                "PostOfficeBoxNumber": "Postfach 4711",
                "PostalCode": "40233",
                "StreetAddress": "Düsseldorf"
            },
            "context": {}
        }]
    }

At the end there must be always a property named `playground` with at least one example showing the full object in action. Use the `title` to put a short meaning of the example in there. In `tab` you decide, which function the JSON-LD processor will process when accessing the [JSON-LD Playground](https://json-ld.org/playground/). The first example must use the value `tab-expanded`. The property `@context` will be replaced with the context definition you wrote before while building the sources. The optional property `context` is used if you want to use the `tab-compacted` or `tab-framed` tabs of the processor / playground.

### Modelling attributes

Modelling attributes follow the nearly the same rules like shown above when modelling objects. But there are no attributes defined. In the `description` of the attribute you have to make an example that corresponds to the chosen data type.

#### Example attribute source file

    {
        "type": "AdditionalName",
        "uri": "http://schema4i.org/AdditionalName",
        "description": "An additional name for an Organization. In Schema.org the additional name is only supported for a Person where it might be used for a middle name. For a company sometimes its important to have more than just one legal name and one name attribute. Especially in the Germasn GDV standard there are three fields for it.",
        "links": [{
            "url": "http://schema.org/additionalName",
            "description": "Original Schema.org type"
        }],
        "parents": [
            { "@id": "http://schema4i.org/Organization#AdditionalName" }
        ],
        "base": [],
        "multipletypes": {},
        "context": {
            "@context": {
                "@version": 1.1,
                "box": "http://schema4i.org/",
                "schema": "http://schema.org/",
                "AdditionalName": {
                    "@id": "box:AdditionalName",
                    "@type": "schema:Text"
                }
            }
        },
        "playground": [{
            "title": "A maximum AdditionalName",
            "tab": "tab-expanded",
            "input": {
                "@context": {},
                "AdditionalName": "c/o b-tix GmbH"
            },
            "context": {}
        }, {
            "title": "Array of AdditionalName",
            "tab": "tab-expanded",
            "input": {
                "@context": {},
                "AdditionalName": ["c/o b-tix GmbH", "4. Etage"]
            },
            "context": {}
        }]
    }

If the attribute defines a key / value list as data type (`@vocab`) that it's strongly recommended to add an example showing a translation of the key to its human-readable value.

### Modelling enumerations

If you want to define a list of keys and value for use in attributes you basically follow the same rules above. But the name and `type` of the enumeration must start with `Enum` and have to end with `Code`. This is a name convention to put even more semantics to the data record and is e.g. used to differ things.

In the `@context` you do not have to define the name of the type and there is not prefix `schema` or `oo` to declare. Just start listing the value and the keys describing the meaning. It's important that the key contains only numbers or text without spaces or special characters. You must use the prefix `s4i` as prefix followed by the name of the enumeration type followed by a hashtag (#) followed by the actual key. The meaning / description of that key you have to describe as text value. As special characters you are allowed to use only the dash `-`.

#### Example enumeration source file

    {
        "type": "EnumGenderCode",
        "uri": "http://schema4i.org/EnumGenderCode",
        "description": "A code that represents the gender of a natural person or animal according to the German GDV standard with release date 01.07.2018 added by a code 3 = diverse, e.g. 1 = male.",
        "links": [{
            "url": "http://schema4i.org/EnumGenderCode_DE",
            "description": "German keys documentation"
        }, {
            "url": "http://schema4i.org/EnumGenderCode_DE.jsonld",
            "description": "German key translation of EnumGenderCode"
        }, {
            "url": "http://www.gdv-online.de/vuvm/bestand/rel2018/ds0100.htm",
            "description": "GDV general data - part address, field 25"
        }],
        "parents": [
            { "@id": "http://schema4i.org/Person#Gender" }
        ],
        "base": [],
        "multipletypes": {},
        "context": {
            "@context": {
                "@version": 1.1,
                "s4i": "http://schema4i.org/",
                "male": "s4i:EnumGenderCode#1",
                "female": "s4i:EnumGenderCode#2",
                "diverse": "s4i:EnumGenderCode#3"
            }
        }
    }

In the source file of an enumeration type you must not use the playground property. The examples should be placed in the parent attribute using the type.

## Notes

This documentation concerns the source files and build process for JSON-LD context files rather than Schema4i.org itself. However do note that labels, comments, and documentation should use international English (in the code and schemas).
