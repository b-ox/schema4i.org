On this page we explain the background and basic principles of our Semantic Data Model. You learn how to link data using the [schema.b-ox.org](/) vocabulary. This page is not about the documentation of the Semantic Data Model itself, but you can find it [here](/docs). The documentation of the modeling rules your can find in our [GitHub Repository](https://github.com/schemaorg/schemaorg).

    NOTE: This page is still under construction

# Table of Contents

### **Introduction**
- [The future Web is made for Machines and not Humans](docs#1)
- [What is Linked Data?](docs#2)
- [It's all about Meaning](docs#3)
- [JSON-LD and Schema.org](docs#4)

### **Usage in APIs**
- [How does it work?](docs#5)

### **Usage in Websites**
- [How to add meaning](docs#6)
- [Example](docs#7)

# Introduction

<a name="1"></a>

## The future Web is made for Machines and not Humans

Today's Internet mainly consists of linked websites. It was made for humans. **The future web is about linked data.** It is made for machines. Just as unstructured and human-readable information in the classical web is linked to one another via hyperlinks, structured data records will more and more be linked to one another also using hyperlinks. So in future we have a web of linked data. In addition, data will be enriched with meaning, so that it is easier for machines to better understand it.

That means: On the one hand, it is a matter of no longer only writing unstructured information in natural language and making it available by HTML for humans using browsers. Rather, it is about describing content in the form of structured data serialized as JSON so that machines can use it. This structured data can easily be embedded in a website (invisible for people) or accessed via an independent URL. In this case we no longer call it a website, but an application programming interface, also known as API.

But most of the times data follows the syntax and grammar of their providers. This is a problem that we all tried to solve in history by building standard data models. We wanted to fix the name of objects and fields and the data types we use. Then everybody had to transform his own data and interfaces to be conform to the standard. In case of changes everyone has to change the interface implementation. However, this didn't work well in the past because it was a lot of work for everyone and the quality of the data exchange suffers due to misinterpretation. Instead, it is besser to leave things as they are and simply accept heterogeneity rather making things equal. Instead we have to manage the difference and thats why there comes semantic meaning into play. As a result, we have structured, semantic data.

<a name="2"></a>

## What is Linked Data?

<img align="right" src="/assets/img/docs_linkeddata.png" width="40%" />
To get deeper insights let us talk about the graphic shown: The classic Internet consists of websites that are linked to each other via hyperlinks. In fact, we are talking about a graph because there is no beginning nor end and no hierarchy. Each website represents a node of a graph that is connected to other nodes via edges. So the <strong>Web of Data</strong> is about a graph where the nodes are datasets instead of or embedded in a website. One node is usually connected to one or more other nodes via edges.

Let the red circle be a node that is accessible by URL so you can load it via HTTP. The node itself is a JSON object containing attributes. The object could e.g. be a person and the attributes could be the first name, the last name, gender and the date of birth. These are the little red dots sticking out of the node you can see in the graphic. The node itself is in turn connected to a blue node via the red edge. This is a link. This link could mean that the person knows another person. So the blue node could be another person who also has attributes.

But if the red circle represents a person in the form of data, but also the blue circle, why do they have different colors? Is their a difference between the red person and the blue one? The answer is: yes. Both nodes can be reached via a different URL and are initially different in this regard. They are not the same persons. Then the data record behind each URL will have a different structure and the names of the attributes will be different because each of the two providers uses its own data record structure, field names and data types or value lists. That is actually a problem, because a machine can follow the links in the data like a human can follow the links on a website. But what does it help if it leads me from a website written in English to a Japanese website? I dont understand the language. And that's exactly how a machine works with data records. It cannot understand the data out of the box. This is where the meaning comes into play.

<a name="3"></a>

## It's all about Meaning

What do you do when you are dealing with different languages you don't understand? Right, you will learn to understand and speak the language or get a translator. Technically speaking, you start reading documentation about the foreign data model and teaching your computer program the syntax, grammar and meaning. You start mapping. This technical networking is not only stimulating once, but is subject to permanent maintenance in case of changes to the interface. The data is not loosely coupled. That's really bad. What do we learn?

The actual problem of networking is the interface. But how can we solve this problem? This is where semantics come into play, because it's different if the provider annotated his data with a clear meaning. In this case, your own program can automatically understand this data. Of cause your programm needs to know the meaning. But in a figurative sense, you no longer agree on the words (names of objects or attributes) that you speak or the nesting of sentences (hierarchies), but only on what the meaning is. Imagine you have an API maintained by the backend team. You are in the frontend team responsible for the user interface and want to use the data from the backend via the API. In the frontend you will use a different data model for the GUI than the guys from the backend team do in the API. You have to map and rebuild your mapping every time the interface changes. But if it's a semantic API and a semantic UI, then you have achieved a loose coupling, because everything is only processed based on the meaning of the data. If the meaning does not change you don't have to rebuild anything, because now you are loosly coupled.

Due to semantic annotations machines can use different types of data from different providers with different syntax and no longer have to concentrate on this syntax and grammar, but can only work with the meaning of data. That is a very big advantage. It means that the provider of the data you want to use can change his interface and data model without notice and you don't have to always rebuild your software. But if he changes the meaning then of cause you have to take a look at it.

To add meaning to a data model, you need a definition of meanings. In human language dictionaries are used for this. And that is exactly the technical approach to solve the problem. We need vocabularies. The probably best known vocabulary is [Schema.org](https://schema.org). It is now largely supported by all major search engines worldwide like Google, Bing, Yahoo or Yandex and is also used in the [Google Knowledge Graph](https://en.wikipedia.org/wiki/Knowledge_Graph). Schema.org supports various forms of encodings including RDFa, Microdata and [JSON-LD](https://jsonld-org) to serialize data of a graph. But JSON-LD is the most recent format and, due to the high level of acceptance of JSON worldwide, is very popular in comparison. It is now the recommended encoding. Of cause there are a lot of other specialized dictionaries that are more of less relevant. Our Semantic Data Model under schema.b-ox.org is based on Schema.org and is a specialized vocabulary for the insurance industry.

<a name="4"></a>

## JSON-LD and Schema.org

The **Semantic Data Model for Insurances** from schema.b-ox.org was inspired by Schema.org and JSON-LD. Thanks for the great work guys! As a shared and open vocabulary our data model defines object, attributes and data types to enrich application programming interfaces (APIs) and website contents with insurance-related meaning. This will help you to make your data more easily available to others or to use data from others more easily.

JSON-LD (acronym for "JSON-based serialization for linked data") refers to recommendations of the W3C to embed linked data worldwide in the slim JSON format instead of e. g. RDF. Thanks a lot to Markus Lanthaler and friends for their work! This enables web services and web applications that prefer to exchange their data in JSON to easily connect to the <a href="https://en.wikipedia.org/wiki/Semantic_Web">Semantic Web</a> and work together more smoothly by using globally unique terms. One advantage is that you don't actually have to think in graphs, but can continue to use the object-oriented way of working that has been established over decades. Another advantage is that JSON-LD is not only a textually described standard, but also the algorithms for the corresponding processors are standardized and there are standardized processors for almost all conceivable programming languages that can be used free of charge. More information you can find at [www.w3.org/TR/json-ld](https://www.w3.org/TR/json-ld) and [json-ld.org](https://json-ld.org).

JSON-LD is designed around the concept of a **context** to provide meaning to a JSON document. So the context links object properties in the JSON document to concepts in an ontology. A context can be embedded directly in a JSON-LD document or put into a separate file and referenced from different documents e. g. via an HTTP Link header. Doing like this, you can add a context without having to change the original data source. Our Semantic Data Model define business entities and provide JSON-LD context files you can use in your data processing. To describe the meaning of business entities we use JSON-LD's brand new version 1.1 and the vocabulary of Schema.org.

Schema.org is a collaborative community activity with a mission to create, maintain, and promote schemas for structured data on the Internet, on web pages, in email messages and beyond. Webmasters use this shared vocabulary to structure metadata on their websites and to help search engines understand the published content, a technique known as search engine optimization. In the last years Schema.org is more and more used in open linked data databases that publish their data over application programming interfaces (APIs). So if you want to provider your data to others add a context to it. Do you want to use JSON-LD data from others? Then take a JSON-LD processor, add the original JSON-LD data and your own context to it and transform the data like you want them.

Wherever possible, the Semantic Data Model for Insurances uses the vocabulary defined on [schema.org](https://schema.org). For this we use the namespace `http://schema.org/` with the prefix `schema`. It is possible that the types defined at schema.org do not exactly correspond to our desired meaning. In other cases, the type we want doesn't exist there. In these cases we define our own data type for a type available on schema.org or define a completely new type. We define our own data types in the namespace `http://schema.b-ox.org/` with the prefix `box`. Be aware of the trailing slash. Although our model is hosted under https and http protocol the identifier for the meaning within the data context has to be http instead of https. If you use https instead its NOT exactly the same meaning and others cannot understand the data. But you can load our contexts files into your JSON-LD processors using both protocols.

# Usage in APIs

<a name="5"></a>

## How does it work?

In our Semantic Data Model we speak about **objects**, **attributes** and **datatypes**. Objects are the nodes of a graph and a group of attributes (the little red dots sticking out of the node in the graphic above) that are logically related. Some of the attributes can be links to other objects (the edges between the circles in the graphic above). In other vocabularies objects are also called types.

Usually the attributes of an object are individual fields that have a name and a value. The value in turn corresponds to a data type. This can be a date format or a value of a value list or just a text value. But in case of a text value most of the times there are no further restrictions like min or max length definitions. That's because meaning is worth more than format. It is therefore more important to understand the meaning of data than to stick to very different restrictive data types. This also means that - when you program the meaning into your application - you have to expect that a character string is empty, contains only spaces or can theoretically have an unlimited length. In case of values of a value list you have to handle keys you don't understand. Sometimes a field can have more than one data type. Then you have to decide if you want to understand all of them or - if you don't want to implement them all - you maybe cannot understand the data.

Let's take an example from the data. A natural person e. g. is modeled as an object and can have the GivenName and FamilyName attributes. Both fields are based on the Text data type. The object itself can in turn be part of an object hierarchy such as a child element of Policyholder.

### **Example Policyholder**
```json
{
    "Policyholder": {
      "Person": {
        "GivenName": "Markus",
        "FamilyName": "Heussen",
        "GenderCode": "1"
      }
  }
}
```

As a human you can read and understand that. But a machine cannot do that easily. So if you receive this data record as a response from an API or find it in the source code of a website when crawling, your program usually cannot easily "understand" it.

So what do you do? Of course: You read through a documentation of the interface or the data model and start programming. The documentation of the object **Policyholder** you can find under [http://schema.b-ox.org/Policyholder](/Policyholder). There you can see that there is an object "Person". Navigating through it you can see that the attributes "GivenName" and "FamilyName" are part of the Person. So the documentation is only confirmation of what you as a human beeing understood from naming the objects and attributes. Now you know that it is a customer with an insurance contract and that the customer is a natural person.

Next you look at your own data model and try to understand how the above data set has to be transformed so that your own application understands it. You start mapping to your own data model which maybe looks like that one here:

### **Example Policyholder (German)**

```json
{
    "Versicherungsnehmer": {
      "Vorname": "Markus",
      "Name": "Heussen",
      "Geschlecht": "M"
    }
}
```

If you build a data model for your application, you - if possible - will do it in your own language. Often, however, you will come into contact with interfaces whose data are not modelled in your language. When it comes to English-language data models, this is often less problematic because most of the people more or less understand English. But what if you don't understand? Right, then there is great potential for misunderstandings.

Now we recognize a fundamental problem with different data models. Data can not only be modeled in different natural languages, but can also contain different field names and data types and data structures. Even as a human beeing, it is not always easy to determine the meaning of data. A machine cannot do that at all. So you have to understand the meaning of the data and then map it technically. In JavaScript this could look something like this:

### **Example Mapping Function**

```javascript
function map(PolicyHolder) {
  var Versicherungsnehmer = {};
  Versicherungsnehmer.Vorname = PolicyHolder.Person.GivenName;
  Versicherungsnehmer.Name = PolicyHolder.Person.FamilyName;
  if (PolicyHolder.GenderCode) {
    switch (PolicyHolder.GenderCode) {
      case '1': Versicherungsnehmer.Geschlecht = 'M'; break;
      case '2': Versicherungsnehmer.Geschlecht = 'F'; break;
      case '3': Versicherungsnehmer.Geschlecht = 'D'; break;
    }
  }
  return Versicherungsnehmer;
}
```

This is actually a simple mapping, but a lot of source code that has to be written for it, isn't it? That is the reason why networking systems is so complex. Because the interface itself is the problem of networking. This problem is now to be solved using semantic annotation. It is about teaching your computer program just a meaning instead of data structures, field names and data types. After doing this you can just annotate existing data from different sources with different data structures, fields and types with the meaning without having to adapt a data source. Doesn't that sound good? If that works, using third-party data suddenly becomes child's play compared to the status quo in software development

# Usage on Websites 

<a name="6"></a>

## How to add meaning 

With the support of schema.b-ox.org by search engines, there is an interesting way to prepare data only "visible" for crawlers who index the content of your website. This is done by introducing structured data into the HTML code of the website in order to give its content meaning that can be interpreted by computer programs.

On a product information page of an online shop you can e.g. put some semantic data to the page pointing out the name, price and description of the product, so that search engines like Google not only see a "text desert", but can really understand what the individual content of the page means. By the way: all of the world's leading search engines now support large parts of e.g. the schema.org vocabulary which is also the base for schema.b-ox.org. That means that parts of our Semantic Data Model can already be understood by the leading search engines.

<a name="7"></a>

## Example

So much for the theory - a practical example follows. If you offer your visitors information about an insurance product on a page of your website, you can add structured, semantic data between the **<head></head>** **</head>** HTML elements of your page as follows:

### **Example Inline JSON-LD Object**

```html
<script type="application/ld+json">
  {
    "@context": "http://schema.b-ox.org/Product.jsonld",
    "Product": {
      "ID": "1047.IUL.Selbststaendige",
      "Name": "Rente für Selbstständige",
      "Description": "IDEAL UniversalLife - Hohe Sicherheit bei 3,3% Verzinsung",
      "CategoryCode": "RENTE",
      "Highlights": [
        { "Description": "Variable Sparfunktion ohne festen Ansparplan" },
        { "Description": "100% digitales Produkt mit Online-Kontoführung" },
        { "Description": "Monatliche Zinsbuchung und Treue-Bonus" },
        { "Description": "Einzahlungen, Auszahlungen, Beiträge und Versicherungsschutz jederzeit anpassbar" },
        { "Description": "Hohe Sicherheit durch eine klassische Anlagestrategie" }
      ],
      "Tags": "Selbstständig, Freiberuflich, Kleingewerbe, Unternehmer, Versicherungskonto, Zinsen, Flexibel, Rücklagen, Universal, Life",
      "ProductProvider": {
        "Organization": {
          "ID": "1047",
          "Name": "IDEAL"
        }
      }
    }
  }
</script>
```

Doing like this e.g. the search engine **[Snoopr](https://www.snoopr.de)**, which specializes in insurance, now "understands" your content when its crawling your website. Because Snoopr supports schema.b-ox.org, the search engine can now properly index, search and display your content in a structured manner. The output of your product data will look like this:

<img src="/assets/img/docs_product.png" width="100%" />

The data is enclosed by **<script></script>**. The type **application/ld+json** is necessary so that the format of the data can also be recognized as JSON-LD. In addition, it must be made clear that this is the data for a product. This is done by the second line, in which a **@context** is referred that contains the actual meaning of the data record. A machine can load this context and interpret the meaning. There are defined vocabularies with meaning for different types of structured data, which are defined by schema.org or schema.b-ox.org. After the context is defined you can find the data of the product such as the name and description and so on. For more information take a look at the documentation under [http://schema.b-ox.org/Product](/Product).
