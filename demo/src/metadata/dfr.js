/*global d3, metadata */
"use strict";

// ---- metadata specification: DfR ----
//
// Metadata storage specialized for DfR. from_string() expects eight DfR
// metadata columns (trimmed as by dfrtopics::export_browser_data). For
// additional columns, names may be specified at construction time with
//
// metadata.dfr({ extra_fields: [ "genre", "sparkliness" ] })
//
// otherwise the default is to name them X1, X2, ...

metadata.dfr = function (spec) {
    var my = spec || { },
        that,
        from_string;

    // constructor: build from parent
    that = metadata(my);
    if (!Array.isArray(my.extra_fields)) {    // validate extra_fields
        my.extra_fields = [ ];
    }

    from_string = function (meta_s) {
        var s;
        if (typeof meta_s !== 'string') {
            return;
        }

        // strip blank "rows" at start or end
        s = meta_s.replace(/^\n*/, "")
            .replace(/\n*$/, "\n");

        // assume that there is no column header
        my.docs = d3.csv.parseRows(s, function (d, j) {
            var result;

            // assume these columns:
            // 0  1     2      3       4      5     6       7
            // id,title,author,journal,volume,issue,pubdate,pagerange

            result = {
                date: new Date(d[0].trim()), // pubdate (UTC)
                title: d[1].trim(),
                category : d[2].trim(),
                doi: d[3].trim(), // id
                //authors: d[2].trim(),
                //journal: d[3].trim(),
                //volume: d[4].trim(),
                //issue: d[5].trim(),
                
                //pagerange: d[7].trim().replace(/^p?p\. /, "").replace(/-/g, "–")
            };
            // now add extra columns
            
            return result;
        });
    };
    that.from_string = from_string;

    return that;
};
