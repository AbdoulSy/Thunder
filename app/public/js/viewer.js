(function($) {
  RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
  RDF_PLAIN_LITERAL = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral';
  RDF_TYPED_LITERAL = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#TypedLiteral';
  RDF_XML_LITERAL = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral';
  RDF_OBJECT = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object';

  // create the viewer instance if it doesn't already exist
  window.viewer = window.viewer || {};
  var viewer = window.viewer;

    viewer.init = function() {
}

  // known prefixes used to shorten IRIs during the TURTLE transformation
viewer.knownPrefixes = {
   // w3c
    'grddl': 'http://www.w3.org/2003/g/data-view#',
    'ma': 'http://www.w3.org/ns/ma-ont#',
    'owl': 'http://www.w3.org/2002/07/owl#',
    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'rdfa': 'http://www.w3.org/ns/rdfa#',
    'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
    'rif': 'http://www.w3.org/2007/rif#',
    'skos': 'http://www.w3.org/2004/02/skos/core#',
    'skosxl': 'http://www.w3.org/2008/05/skos-xl#',
    'wdr': 'http://www.w3.org/2007/05/powder#',
    'void': 'http://rdfs.org/ns/void#',
    'wdrs': 'http://www.w3.org/2007/05/powder-s#',
    'xhv': 'http://www.w3.org/1999/xhtml/vocab#',
    'xml': 'http://www.w3.org/XML/1998/namespace',
    'xsd': 'http://www.w3.org/2001/XMLSchema#',
    // non-rec w3c
    'sd': 'http://www.w3.org/ns/sparql-service-description#',
    'org': 'http://www.w3.org/ns/org#',
    'gldp': 'http://www.w3.org/ns/people#',
    'cnt': 'http://www.w3.org/2008/content#',
    'dcat': 'http://www.w3.org/ns/dcat#',
    'earl': 'http://www.w3.org/ns/earl#',
    'ht': 'http://www.w3.org/2006/http#',
    'ptr': 'http://www.w3.org/2009/pointers#',
    // widely used
    'cc': 'http://creativecommons.org/ns#',
    'ctag': 'http://commontag.org/ns#',
    'dc': 'http://purl.org/dc/terms/',
    'dcterms': 'http://purl.org/dc/terms/',
    'foaf': 'http://xmlns.com/foaf/0.1/',
    'gr': 'http://purl.org/goodrelations/v1#',
    'ical': 'http://www.w3.org/2002/12/cal/icaltzd#',
    'og': 'http://ogp.me/ns#',
    'rev': 'http://purl.org/stuff/rev#',
    'sioc': 'http://rdfs.org/sioc/ns#',
    'v': 'http://rdf.data-vocabulary.org/#',
    'vcard': 'http://www.w3.org/2006/vcard/ns#',
    'schema': 'http://schema.org/',
	'c': 'http://smartlogic.com/classification/'
  }

  
  /**
  * Converts the triple data to a D3 tree graph for visualization.
  *
  * @param data the reference to the RDFa DataDocument API.
  */
viewer.toD3TreeGraph = function(data) {
    var bnodeNames = {};
    var bnodeCount = 1;
    var rval = {
      'name': 'Response',
      'children': []
    };

	var subjects=[]
     for (var s in data.subjects) {
         subjects.push(s);
      }

    var embedded = {};

    var createNode = function(s, p, data, rval, ancestors) {
      var triples = data.subjects[s] ? data.subjects[s] : null;
      var predicates = triples === null ? [] : triples.predicates;
      var name = '';
      var node = {
        'name': '',
        'children': []
      };
      
      // calculate the short name of the node
      // prepend the predicate name if there is one
      if(p !== undefined) {
        name = viewer.getIriShortName(p) + ': ';
      }

      // keep track of subjects that we're branching from
      // to avoid recursing into them again.
      if (ancestors === undefined) {
        ancestors = [];
      }
      ancestors = ancestors.concat(s);
      if(s.charAt(0) == '_') {
        name += 'Item ' + bnodeNames[s];
      }
      else if(p == RDF_TYPE) {
        name += viewer.getIriShortName(s);
      }
      else {
        name += viewer.getIriShortName(s, true);
      }
      node.name = name;
      
      // create nodes for all predicates and objects
      for(p in predicates)
      {
        // do not include which vocabulary was used in the visualization
        if(p == "http://www.w3.org/ns/rdfa#usesVocabulary") {
          continue;
        }
      
        var objects = triples.predicates[p].objects;
        for(oi in objects) {
          var value = '';
          var o = objects[oi];

          if(o.type == RDF_OBJECT && ancestors.indexOf(o.value) == -1) {
            // recurse to create a node for the object if it's an object
            // and is not referring to itself
            createNode(o.value, p, data, node, ancestors);
            embedded[o.value] = true;
          }
          else {
            // generate the leaf node
            var name = '';
            if(o.type == RDF_XML_LITERAL) {
              // if the property is an XMLLiteral, serialise it
              name = viewer.nodelistToXMLLiteral(o.value);
            }
            else if (o.type == RDF_OBJECT) {
              // shorten any IRIs (if the property is referring to the
              // object itself)
              name = viewer.getIriShortName(o.value, true);
            }
            else {
              name = o.value;
            }

            var child = {
               'name': viewer.getIriShortName(p) + ': ' + name
            };
            node.children.push(child);
          }
        }        
      }

      // remove the children property if there are no children
      if(node.children.length === 0) {
        node.children = undefined;
      }
      // collapse children of nodes that have already been embedded
      if(embedded[s] !== undefined && node.children !== undefined) {
        node._children = node.children;
        node.children = undefined;
      }
      
      rval.children.push(node);
    };
    
    // Pre-generate names for all bnodes in the graph
    for(si in subjects) {
      var s = subjects[si];
      // calculate the short name of the node
      if(s.charAt(0) == '_' && !(s in bnodeNames)) {
        bnodeNames[s] = bnodeCount;
        bnodeCount += 1;
      }
    }
    
    // Generate the D3 tree graph
    for(si in subjects) {
      var s = subjects[si];
      createNode(s, undefined, data, rval);
    }
    
    // clean up any top-level children with no data
    var cleaned = [];
    for(c in rval.children)
    {
      var child = rval.children[c];
      if(child.children !== undefined)
      {
        cleaned.push(child);
      }
    }
    rval.children = cleaned;

    return rval;
  };
  
  /**
   * Attempts to retrieve the short name of an IRI based on the fragment
   * identifier or last item in the path.
   *
   * @param iri the IRI to process
   * @param hashify if true, pre-pend a hash character if the shortening results
   *                in a fragment identifier.
   * @returns a short name or the original IRI if a short name couldn't be
   *          generated.
   */
  viewer.getIriShortName = function(iri, hashify) {
    var rval = iri;
    
    // find the last occurence of # or / - short name is everything after it
    if(iri.indexOf('#') >= 0) {
      if(hashify) {
        rval = '#' + iri.split('#').pop();
      }
      else {
        rval = iri.split('#').pop();
      }
    }
    else if(iri.indexOf('/') >= 0) {
      rval = iri.split('/').pop();
    }
    
    // don't allow the entire IRI to be optimized away
    if(rval.length < 1) {
      rval = iri;
    }
    
    return rval;
  };
  
  
    /**
   * Converts a NodeList into an rdf:XMLLiteral string.
   *
   * @param nodelist the nodelist.
   */
  viewer.nodelistToXMLLiteral = function(nodelist) {
    var str = '';
    for(var i = 0; i < nodelist.length; i++) {
      var n = nodelist[i];
      str += n.outerHTML || n.nodeValue;
    }
    return str;
  };

  // initialize the viewer
  viewer.init();
})(jQuery);
