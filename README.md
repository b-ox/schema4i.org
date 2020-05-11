# Welcome to schema.b-ox.org

Inspired by the work of [JSON for Linked Data](https://json-ld.org/) and [Schema.org](https://schema.org/) [we](https:///pending.schema.b-ox.org/page/about) build a **Semantic Data Model for Insurances**. As a **shared vocabulary** [schema.b-ox.org](https://pending.schema.b-ox.org) makes it easier for API developers and website operators to get the maximum benefit from data. The data model is **open and free** for use. It might be used especially in the insurance industry or beyond. You can use it to provide APIs and websites with **insurance-related meaning** for better networking with other participants in the industry. Why? Because in the future everything's driven by [linked data](https://en.wikipedia.org/wiki/Linked_data). 

# About this repository

This is the schema.b-ox.org project repository. It contains all the schemas and JSON-LD context files used to publish on [schema.b-ox.org](https://schema.b-ox.org) (still under construction) and [pending.schema.b-ox.org](https://pending.schema.b-ox.org) (already live). While the first site hosts official releases of the Semantic Data Model, the second one is updated more frequently containing the data models waiting for official release deployment. For the sites themself, please follow the URLs instead.


# Contribution

Issues and proposals are managed here. If you are interested to participate please contact us and introduce yourself. You can fork this projekt and make pull requests to contribute. Add new objects, enumerations or attributes. 

Due to downwards compatibility don't change existing things. Do not remove objects and attributes or change their names. Please do also not change enumeration types. Please report these issues instead. If you are new to Git and GitHub, there's a useful [introduction to Github](https://www.w3.org/2006/tools/wiki/Github) in the W3C Wiki.

# Improving the Semantic Data Model

We are always interested in practical suggestions for improvements to schema.b-ox.org. 

## Priority

We try to prioritize simple fixes and improvements to our existing schemas, examples and documentation over the addition of new vocabulary, and we are most likely to add new schemas when there is evidence that some (preferably large-scale) consuming application will make use of the data. 

Consuming applications need not be search engines. Databases or application programming interfaces are all rich areas for exploration and collaboration. The important thing is that there should be some reasonable expectation of data consumers making good use of the changes. It is not sufficient to justify additions on the basis that maybe search engines generally try to use Schema. Please note: Smaller changes, and backwards-compatible changes, are easier to incorporate.

## Extensibility and practicability

Note that schema.b-ox.org does not attempt to capture the full detail of content in the web or in APIs; it is necessarily a simplification of a more complex reality. This means that there will be many cases where adding more detail to schema.b-ox.org will look possible. However, in the interests of keeping things simple and stupid for publishers, webmasters and developers, we will maybe choose not to add such detail. But: the Semantic Data Model uses the web standard JSON-LD that allows independent extensions.

We are also highly unlikely to take on large scale reorganizations of our terminology, if they are motivated solely by considerations of elegance, "proper modeling", ontological purity or conceptual unification. Although the project founders are very familiar with the traditions behind such concerns, they also we the co-founders of a standardization organisation. So they know, that this concepts will incrase complexity dramatically. Proposals for unifying, cross-domain logic-based knowledge structures may be better managed in those organizations.

When we add terms, often into the "Pending" area ([pending.schema.b-ox.org](https://pending.schema.b-ox.org)), we strongly encourage feedback that takes a global perspective: how does a new term relate to others, how could it be used alongside pre-existing patterns, etc. 

# Modeling rules

If you want to contribute data models, then fork this project and add your objects, attributes and enumerations. When modeling the Semantic Data Model, we follow the following modeling guidelines.

## Definitions and name conventions

**Objects** we call a logical unit of attributes. **Attributes** we call the properties of an object. These properties can be fields that carry values. Most of the times that values are text or date or a key of an enumeration. Attributes can also be links pointing to other objects or refer to other datasets via URL. 

The name of objects and attributes or enumerations always begins with a capital letter and ideally consists of a single word. In some cases it makes sense to use several words to define an object. In this case we use the "Upper Camel Case" notation like e.g. in the object [**P**ostal**A**ddress](https://pending.schema.b-ox.org/PostalAddress) or the attribute [**H**ouse**N**umber](https://pending.schema.b-ox.org/HouseNumber).

## Modelling objects

TODO

## Modelling attributes and data types

When defining attributes whenever possible use properties defined on schema.org as `@id` and always use a data type you can find at [schema.org/DataType](https://schema.org/DataType) as `@type`. like http://schema.org/givenName. 

## Modelling enumerations

Key value lists we call **Enumerations**. The key can be a number, a letter or one or more words written in upper camel case. Do not use spaces or any other special characters. The description of the key must be describes in English. The name of enumerations must always start with **Enum** and end with **Code** like in [**Enum**Gender**Code**](https://pending.schema.b-ox.org/EnumGenderCode).

# Notes

This documentation concerns the source files and build process for JSON-LD context files rather than schema.b-ox.org itself. However do note that labels, comments, and documentation should use international English (in the code and schemas). 