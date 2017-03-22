/*global view, VIS, utils, d3 */
"use strict";

view.topic = function (p) {
    var div = d3.select("div#topic_view");

    // heading information
    // -------------------

    div.select("#topic_header").text(p.label);

    // (later: nearby topics by J-S div or cor on log probs)
};

view.topic.remark = function (p) {
    d3.select("#topic_view #topic_remark")
        .text(VIS.percent_format(p.col_sum / p.total_tokens)
                + " of corpus");
};

//topic_correlations
view.topic.corr = function (param) {
    var svg, cloud_size, circle_radius, range_padding,
        zoom_rect,
        domain_x, domain_y, domain_pol,
        scale_x, scale_y, scale_size, scale_stroke, scale_pol,
        gs, gs_enter,
        words,
        sums = [],
        polarity = [], //polaridad por topico
        total,
        translation, zoom,
        topics = param.topics,
        n = param.topics.length,
        select = param.select,
        spec = { };

    spec.w = d3.select("#topic_correlations").node().clientWidth
        || VIS.model_view.plot.w;
    spec.w = Math.max(spec.w, VIS.model_view.plot.w); // set a min. width
    spec.h = Math.floor(spec.w / VIS.model_view.plot.aspect);
    spec.m = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
    };

    svg = view.plot_svg("#topic_plot_corr", spec);
    
    topics.forEach(function (p){
        sums.push(p.total);
        polarity.push(p.polarity);
    });
    total = d3.sum(sums);
    circle_radius = Math.floor(
        spec.w /
        (1.0 * Math.sqrt(VIS.model_view.plot.aspect * n))
    );

   /* circle_radius = d3.max(function (){
        return 1000 * d3.format(".5f")(sums[p.t] / total);        
    }); */
    cloud_size = circle_radius * 1.8; // a little less than the full diameter
    range_padding = 1.1 * circle_radius;

    // zoom-target rectangle
    zoom_rect = svg.selectAll("rect.bg")
        .data([1]);
    zoom_rect.enter().append("rect").classed("bg", true);
    zoom_rect.attr("width", spec.w);
    zoom_rect.attr("height", spec.h);

    topics.forEach(function (p, j) {
        topics[j].x = p.scaled[0];
        topics[j].y = p.scaled[1];
    });
    

    domain_x = d3.extent(topics, function (d) {  return d.x; });
    domain_y = d3.extent(topics, function (d) { return d.y; });

    //normalizar la polaridad entre 0 y 1
    domain_pol = d3.extent(topics, function (d) {  return d.polarity; });
    scale_pol = d3.scale.linear()
        .domain(domain_pol)
        .range([0,1]);

    scale_x = d3.scale.linear()
        .domain(domain_x)
        .range([range_padding, spec.w - range_padding]);

    scale_y = d3.scale.linear()
        .domain(domain_y)
        .range([spec.h - range_padding, range_padding]);

    scale_size = d3.scale.sqrt()
        .domain([0, 1])
        .range(VIS.model_view.plot.size_range);

    scale_stroke = d3.scale.linear()
        .domain([0,d3.max(topics, function (p) { return p.total; })])
        .range([0,VIS.model_view.plot.stroke_range]);

    gs = svg.selectAll("g")
        .data(topics, function (p) { return p.t; });

    gs_enter = gs.enter().append("g");
    gs.exit().remove();

    gs_enter.append("clipPath").attr("id", function (p) {
        return "clip_circ" + p.t; // we'll clip the topic words to the circles
    }).append("circle")
        .attr({
            cx: 0,
            cy: 0
        }); // radius gets set below in transitions with all the other circles

    gs_enter.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("class",function (w) {
                if (w.t == select){
                    return "topic_select";
                }
                else{
                    return "topic_corr";
                }
            }) 
            .attr("fill", function (w) {
                var p;
                p = scale_pol(w.polarity);
                if (w.t == select){
                    return "rgba(51,153,255," + p + ")";
                }
                else{
                    return "rgba(244,67,57," + p + ")";
                }
            })
            .attr("stroke-width", function (p) {
                return scale_stroke(p.total);
            });

    words = gs.selectAll("text.topic_word")
        .data(function (p) {
            var wds = [{
                size: Math.floor(scale_size(sums[p.t] / d3.max(sums))),
                t: p.t,
                text: p.label,
                y: 0
            }]
            return wds;
        });

    words.enter().append("text").classed("topic_word", true)
        .attr("clip-path", function (w) {
            return "url(#" + "clip_circ" + w.t;
        })
        .style("font-size", "1px"); // additional words start tiny then grow

    words.text(function (wd) {
            return wd.text;
        })
        .attr("x", 0)
        .attr("y", function (wd) {
            return wd.y;
        });

    gs_enter.selectAll("text.topic_name")
        .data(function (p) {
            var ws = p.label.split(" ");
            // TODO 1 label word on each "line" is a problem for "of" and "the" etc.
            return ws.map(function (w, j) {
                return {
                    w: w,
                    y: VIS.model_view.plot.name_size
                        * (j - (ws.length - 1) / 2)
                };
            });
        })
        .enter().append("text").classed("topic_name", true)
        .attr("x", 0)
        .attr("y", function (w) { return w.y; })
        .text(function (w) { return w.w })
        .style("font-size", VIS.model_view.plot.name_size + "px")
        .classed("merged_topic_sep", function (w) {
            return w.w === "or";
        });

    translation = function (p) {
        var result = "translate(" + scale_x(p.x);
        result += "," + scale_y(p.y) + ")";
        return result;
    };

    gs.transition()
        .duration(1000)
        .attr("transform", translation)
        .selectAll("circle")
        .attr("class",function (w) {
                if (w.t == select){
                    return "topic_select";
                }
                else{
                    return "topic_corr";
                }
            })
        .attr("fill", function (w) {
                var p;
                p = scale_pol(w.polarity);
                if (w.t == select){
                    return "rgba(51,153,255," + p + ")";
                }
                else{
                    return "rgba(244,67,57," + p + ")";
                }
            })
        .attr("r", function (p) {
                return 1000 * d3.format(".5f")(sums[p.t] / total);
            });  // aca cambiar el radio de los circulos

    // new nodes just appear, no gratuitous translation: interrupt the other
    gs_enter.transition()
        .duration(0)
        .attr("transform", translation)
        .selectAll("circle")
        .attr("class",function (w) {
                if (w.t == select){
                    return "topic_select";
                }
                else{
                    return "topic_corr";
                }
            })
        .attr("fill", function (w) {
                var p;
                p = scale_pol(w.polarity);
                if (w.t == select){
                    return "rgba(51,153,255," + p + ")";
                }
                else{
                    return "rgba(244,67,57," + p + ")";
                }
            })
        .attr("r", function (p) {
                return 1000 * d3.format(".5f")(sums[p.t] / total);
            });  // aca tambien cambiar radio de circulos    

    words.transition()
        .duration(1000)
        .style("font-size", function (wd) {
            return wd.size + "px";
        });

    // words on new nodes also just appear
    gs_enter.selectAll("text.topic_word")
        .transition()
        .duration(0)
        .style("font-size", function (wd) {
            return wd.size + "px";
        });

    words.exit().transition()
        .duration(1000)
        .style("font-size", "1px")
        .remove();

    // TODO zoom circle sizes and add words in, but this makes some
    // complications for the scaled view where the main use of zoom is to
    // see overlapping circles.
    // TODO and then, re-enable zoom in the grid view.

    
    zoom = d3.behavior.zoom()
        .x(scale_x)
        .y(scale_y)
        .scaleExtent([1, 10])
        .on("zoom", function () {
            if (VIS.zoom_transition) {
                gs.transition()
                    .duration(1000)
                    .attr("transform", translation);
                VIS.zoom_transition = false;
            } else {
                gs.attr("transform", translation);
            }
        });

    // zoom reset button
    d3.select("button#reset_zoom_topic")
        .on("click", function () {
            VIS.zoom_transition = true;
            zoom.translate([0, 0])
                .scale(1)
                .event(svg);
        });

    zoom(svg);
};


view.topic.words = function (words, words_pol) {
    console.log(words);
    console.log(words_pol);
    var trs_w;

    if (view.updating() && !view.dirty("topic/words")) {
        return;
    }

    trs_w = d3.select("table#topic_words tbody")
        .selectAll("tr")
        .data(words);

    trs_w.enter().append("tr");
    trs_w.exit().remove();

    trs_w.on("click", function (w) {
        view.dfb().set_view("/word/" + w.word);
    });

    // clear rows
    trs_w.selectAll("td").remove();

    trs_w.append("td").append("a")
        .attr("href", function (w) {
            return "#/word/" + w.word;
        })
        .text(function (w) { return w.word; });

    view.append_weight_tds(trs_w, function (w) {
        return w.weight / words[0].weight;
    });

    view.dirty("topic/words", false);

    d3.select("button#words_polarity")
        .on("click", function () {
            console.log("holi");
            view.topic.words_pol(words, words_pol);    
            })
        .text("Polarity");
    d3.select("#top_word_table").text("Weight");
};

view.topic.words_pol = function (words, words_pol) {
    console.log("words_pol");
    console.log(words_pol);
    var lis = words_pol;
    var trs_w;
    lis.sort(function (a, b) {
        return d3.descending(a.polarity,b.polarity);
    });
    console.log("lis");
    console.log(lis);

    if (view.updating() && !view.dirty("topic/words")) {
        return;
    }

    trs_w = d3.select("table#topic_words tbody")
        .selectAll("tr")
        .data(lis);

    trs_w.enter().append("tr");
    trs_w.exit().remove();

    trs_w.on("click", function (w) {
        view.dfb().set_view("/word/" + w.word);
    });

    // clear rows
    trs_w.selectAll("td").remove();

    trs_w.append("td").append("a")
        .attr("href", function (w) {
            return "#/word/" + w.word;
        })
        .text(function (w) { return w.word; });

    view.append_weight_tds(trs_w, function (w) {
        console.log("w");
        console.log(w);
        return w.polarity / lis[0].polarity;
    });

    view.dirty("topic/words", false);
    d3.select("button#words_polarity")
        .on("click", function () {
            console.log("holi");
            view.topic.words(words, lis);    
            })
        .text("Weight");
    d3.select("#top_word_table").text("Polarity");
};

view.topic.docs = function (p) {
    var header_text, trs_d,
        docs = p.docs;

    if (p.condition !== undefined) {
        header_text = ": ";
        if (p.type !== "time") {
            header_text += p.condition_name + " ";
        }
        header_text += p.key.display(p.condition);

        // the clear-selected-condition button
        d3.select("#topic_condition_clear")
            .classed("disabled", false)
            .on("click", function () {
                d3.select(".selected_condition")
                    .classed("selected_condition", false);
                view.updating(true);
                view.dfb().set_view(view.topic.hash(p.t));
            })
            .classed("hidden", false);

    } else {
        header_text = "";
        d3.select("#topic_condition_clear")
            .classed("disabled", true);
    }


    d3.selectAll("#topic_docs span.topic_condition")
        .text(header_text);

    if (docs === undefined || docs.length === 0) {
        d3.selectAll("#topic_docs .none")
            .classed("hidden", false);
        d3.select("#topic_docs table")
            .classed("hidden", true);
        return true;
    }
    d3.selectAll("#topic_docs .none")
        .classed("hidden", true);
    d3.select("#topic_docs table")
        .classed("hidden", false);

    trs_d = d3.select("#topic_docs tbody")
        .selectAll("tr")
        .data(docs);

    trs_d.enter().append("tr");
    trs_d.exit().remove();

    // clear rows
    trs_d.selectAll("td").remove();

    trs_d
        .append("td")
        .append("a")
        .html(function (d, j) {
            return p.citations[j];
        });

    trs_d.on("click", function (d) {
        view.dfb().set_view("/doc/" + d.doc);
    });

    view.append_weight_tds(trs_d, function (d) { return d.frac; });

    trs_d.append("td")
        .classed("td-right", true)
        .text(function (d) {
            return VIS.percent_format(d.frac);
        });

    trs_d.append("td")
        .classed("td-right", true)
        .text(function (d) {
            return d.weight;
        });

    view.dirty("topic/docs", false);
};

view.topic.conditional = function (p) {
    var spec = utils.clone(VIS.topic_view);
    spec.w = d3.select("#topic_conditional").node().clientWidth || spec.w;
    spec.w = Math.max(spec.w, VIS.topic_view.w); // set a min. width
    spec.w -= spec.m.left + spec.m.right;
    spec.h = Math.floor(spec.w / VIS.topic_view.aspect)
        - spec.m.top - spec.m.bottom;

    // copy over conditional variable information to bar-step spec
    spec.time.step = VIS.condition.spec;
    p.svg = view.plot_svg("div#topic_plot", spec);
    p.axes = true;
    p.clickable = true;
    p.dirty = view.dirty("topic/conditional");
    p.spec = spec;
    view.topic.conditional_barplot(p);
    view.dirty("topic/conditional", false);
};

view.topic.conditional_barplot = function (param) {
    var series,
        step, w, w_click,
        bar_offset, bar_offset_click,
        scale_x,
        scale_y,
        bars, bars_enter,
        bars_click,
        axes, ax_label, tick_padding,
        tip_text,
        tx_duration = param.dirty ? param.spec.tx_duration : 0,
        svg = param.svg,
        spec = param.spec;

    series = param.data.keys().sort().map(function (y) {
        return {
            key: y,
            x: param.key.invert(y),
            y: param.data.get(y)
        };
    });

    // roll-your-own rangeBands for time and continuous variables
    if (param.type === "continuous") {
        // find minimum-width step in domain series
        series[0].w = Infinity;
        step = series.reduce(function (acc, d) {
            return {
                x: d.x,
                w: Math.min(d.x - acc.x, acc.w)
            };
        }).w;
        delete series[0].w;

        scale_x = d3.scale.linear()
            .domain([series[0].x,
                series[series.length - 1].x + step * spec.continuous.bar.w])
            .range([0, spec.w]);
        // .nice();

        w = scale_x(series[0].x + step * spec.continuous.bar.w)
            - scale_x(series[0].x);
        bar_offset = -w / 2;
        w_click = scale_x(series[0].x + step) - scale_x(series[0].x);
        bar_offset_click = -w_click / 2;
        tick_padding = w_click / 2;
    } else if (param.type === "time") {
        scale_x = d3.time.scale.utc()
            .domain([series[0].x,
                d3.time[spec.time.bar.unit].utc.offset(
                    series[series.length - 1].x, spec.time.bar.w)
            ])
            .range([0, spec.w]);
        //.nice();

        w = scale_x(d3.time[spec.time.bar.unit].utc.offset(
                    series[0].x, spec.time.bar.w))
            - scale_x(series[0].x);
        bar_offset = -w / 2;
        w_click = scale_x(
                d3.time[spec.time.step.unit].utc.offset(
                    series[0].x, spec.time.step.n))
            - scale_x(series[0].x);
        bar_offset_click = -w_click / 2;
        tick_padding = w_click / 2;
    } else {
        // assume ordinal
        scale_x = d3.scale.ordinal()
            .domain(series.map(function (d) { return d.x; }))
            .rangeRoundBands([0, spec.w], spec.ordinal.bar.w,
                    spec.ordinal.bar.w);
        w = scale_x.rangeBand();
        bar_offset = 0;
        w_click = scale_x(series[1].x) - scale_x(series[0].x);
        bar_offset_click = (w - w_click) / 2;
        tick_padding = 3; // the d3 default
    }

    scale_y = d3.scale.linear()
        .domain([0, d3.max(series, function (d) {
            return d.y;
        })])
        .range([spec.h, 0])
        .nice();

    // axes
    // ----

    if (param.axes) {
        axes = svg.selectAll("g.axis")
            .data(["x", "y"]);

        axes.enter().append("g").classed("axis", true)
            .classed("x", function (v) {
                return v === "x";
            })
            .classed("y", function (v) {
                return v === "y";
            })
            .attr("transform", function (v) {
                return v === "x" ? "translate(0," + spec.h + ")"
                    : "translate(-5, 0)";
            });

        axes.transition()
            .duration(tx_duration)
            .attr("transform", function (v) {
                return v === "x" ? "translate(0," + spec.h + ")"
                    : undefined;
            })
            .each(function (v) {
                var sel = d3.select(this),
                    ax = d3.svg.axis()
                        .scale(v === "x" ? scale_x : scale_y)
                        .orient(v === "x" ? "bottom" : "left");

                if (v === "x") { // x axis
                    if (param.type === "time") {
                        if (spec.time.ticks.unit) {
                            ax.ticks(d3.time[spec.time.ticks.unit].utc,
                                    spec.time.ticks.n);
                        } else if (typeof spec.time.ticks === "number") {
                            ax.ticks(spec.time.ticks);
                        }
                    } else {
                        ax.ticks(spec[param.type].ticks);
                    }
                } else { // y axis
                    ax.tickSize(-spec.w)
                        .outerTickSize(0)
                        .tickFormat(VIS.percent_format)
                        .tickPadding(tick_padding)
                        .ticks(spec.ticks_y);
                }

                // redraw axis
                sel.call(ax);

                // set all y gridlines to minor except baseline
                if (v === "y") {
                    sel.selectAll("g")
                        .filter(function (d) { return d > 0; })
                        .classed("minor", true);
                }

            });
        ax_label = svg.selectAll("text.axis_label")
            .data([1]);
        ax_label.enter().append("text");
        ax_label.classed("axis_label", true)
            .attr("x", spec.w / 2)
            .attr("y", spec.h + spec.m.bottom)
            .attr("text-anchor", "middle")
            .text(param.condition_name);
    }

    // bars
    // ----

    bars = svg.selectAll("g.topic_proportion")
        .data(series, function (s) { return s.key; }); // keyed for txns

    // for each x value, we will have two rects in a g: one showing the topic
    // proportion and an invisible one for mouse interaction,
    // following the example of http://bl.ocks.org/milroc/9842512
    bars_enter = bars.enter().append("g")
        .classed("topic_proportion", true)
        .attr("transform", function (d) {
            // new bars shouldn't transition out from the left,
            // so preempt that
            return "translate(" + scale_x(d.x) + ",0)";
        });

    bars.exit().remove(); // also removes child display and interact rects

    if (param.clickable) {
        // add the clickable bars, which are as high as the plot
        // and a full step wide
        bars_enter.append("rect").classed("interact", true);

        bars_click = bars.select("rect.interact");

        bars_click.transition()
            .duration(tx_duration)
            .attr("x", bar_offset_click)
            .attr("y", 0)
            .attr("width", w_click)
            .attr("height", spec.h);
    }

    // set a selected bar if any
    bars.classed("selected_condition", function (d) {
        return d.key === param.condition;
    });

    // add the visible bars
    bars_enter.append("rect").classed("display", true)
        .style("fill", param.color)
        .style("stroke", param.color);

    // the g sets the x position of each pair of bars
    bars.transition()
        .duration(tx_duration)
        .attr("transform", function (d) {
            return "translate(" + scale_x(d.x) + ",0)";
        })
        .select("rect.display")
        .attr("x", bar_offset)
        .attr("y", function (d) {
            return scale_y(d.y);
        })
        .attr("width", w)
        .attr("height", function (d) {
            return spec.h - scale_y(d.y);
        });

    if (param.clickable) {
        bars.on("mouseover", function (d) {
                d3.select(this).classed("hover", true);
            })
            .on("mouseout", function (d) {
                d3.select(this).classed("hover", false);
            });

        // interactivity for the bars

        // tooltip text
        tip_text = function (d) { return param.key.display(d.key); };

        // now set mouse event handlers

        bars_click.on("mouseover", function (d) {
                var g = d3.select(this.parentNode);
                g.select(".display").classed("hover", true); // display bar
                view.tooltip().text(tip_text(d));
                view.tooltip().update_pos();
                view.tooltip().show();
            })
            .on("mousemove", function (d) {
                view.tooltip().update_pos();
            })
            .on("mouseout", function (d) {
                d3.select(this.parentNode).select(".display") // display bar
                    .classed("hover", false);
                view.tooltip().hide();
            })
            .on("click", function (d) {
                if(d3.select(this.parentNode).classed("selected_condition")) {
                    d3.select(this.parentNode)
                        .classed("selected_condition", false);
                    view.tooltip().text(tip_text(d));
                    view.updating(true);
                    view.dfb().set_view(view.topic.hash(param.t));
                } else {
                    // TODO selection of multiple conditions
                    // should use a brush http://bl.ocks.org/mbostock/6232537
                    d3.selectAll(".selected_condition")
                        .classed("selected_condition", false);
                    d3.select(this.parentNode)
                        .classed("selected_condition", true);
                    view.tooltip().text(tip_text(d));
                    view.updating(true);
                    view.dfb().set_view(
                        view.topic.hash(param.t) + "/" + d.key
                    );
                }
            });
    }

};

// Topic sorting rule: explicit labels over default "Topic NNN"
// achieved by ugly kludge
view.topic.sort_name = function (label) {
    var nn = label.match(/^Topic\s(\d+)$/);
    if (nn) {
        return "zzz" + d3.format("05d")(+(nn[1]));
    }

    return label.replace(/^(the|a|an) /i, "").toLowerCase();
};

view.topic.dropdown = function (topics) {
    var lis;
    // Set up topic menu: remove loading message
    d3.select("ul#topic_dropdown").selectAll("li.loading_message").remove();

    // Add menu items
    lis = d3.select("ul#topic_dropdown")
        .selectAll("li")
        .data(topics, function (t) {
            return t.topic;
        });

    lis.enter().append("li").append("a")
        .text(function (t) {
            var words = t.words
                .slice(0, VIS.overview_words)
                .map(function (w) { return w.word; })
                .join(" ");
            return t.label + ": " + words;
        })
        .attr("href", function (t) {
            return view.topic.link(t.topic);
        });
    lis.sort(function (a, b) {
        return d3.ascending(view.topic.sort_name(a.label),
            view.topic.sort_name(b.label));
    });

    lis.classed("hidden_topic", function (t) {
        return t.hidden;
    });
};

// Here we encode the fact that user-facing topic-view links use the 1-based
// topic index. dfb().topic_view() also expects the 1-based index.
view.topic.link = function (t) {
    return "#" + view.topic.hash(t);
};

view.topic.hash = function (t) {
    return "/topic/" + String(t + 1);
};

