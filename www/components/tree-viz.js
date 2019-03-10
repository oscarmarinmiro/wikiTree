import * as d3 from "d3"

AFRAME.registerComponent('tree-viz', {

      schema: {
          data: {type: 'string', default: ""},
          radius: {type: 'number', default: 10},
          max_depth: {type: 'number', default: 2},
          bottom_radius: {type: 'number', default: 1},
          num_points: {type: 'int', default: 100},
          transition: {type: 'int', default: 1000},
          text_color: {type: 'string', default: "white"},
          branch_color: {type: 'string', default: "#345678"},
          frame_text_color: {type: 'string', default:"black"},
          frame_background_color: {type: 'string', default:"white"},

      },

      init: function () {

          var self = this;

      },

      prune_tree_by_depth: function(tree, max_depth, last_expanded) {

          var self = this;

          var traverse_tree = function(node, depth) {

              if(depth === max_depth){
                  if('children' in node){

                      // Instead of delete, just empty the list
                      // So we can mark if this node can be expanded later

                      node.children = [];

                  }
              }
              else {
                  if('children' in node){
                      node.children.forEach(function(element){

                          traverse_tree(element, depth+1);

                      });
                  }
              }
          };

          traverse_tree(tree, 0);


          if(last_expanded !== "") {

              var lonely_child = null;

              // Remove siblings of last expanded

              tree.children.forEach(function (node) {

                  if(node.name === last_expanded){
                      lonely_child = node;
                  }

              });

              if(lonely_child!== null) {
                  tree.children = [lonely_child];
              }

          }




      },

      move_element_near_camera(element, camera, distance, longitude){

          var self = this;

          var camera_position = camera.getAttribute("position");

          var node_position = self.convert(0, longitude, self.data.radius - distance);

          var element_position = element.getAttribute("position");

          var final_position = {x: camera_position.x - node_position.x, y: 0, z: camera_position.z - node_position.z};

          var animation = document.createElement("a-animation");

          var final_distance = new THREE.Vector3(element_position.x, 0, element_position.z).distanceTo(new THREE.Vector3(final_position.x, 0, final_position.z));

          animation.setAttribute("attribute", "position");
          animation.setAttribute("dur", 500*final_distance);
          animation.setAttribute("easing", "linear");
          animation.setAttribute("to", final_position.x + " " + final_position.y + " " + final_position.z);

          element.appendChild(animation);

      },

      convert: function(lat, long, radius){

              cosPhi = Math.cos(lat/180 * Math.PI);

              return {
                  x: radius * cosPhi * Math.cos(long/180 * Math.PI),
                  y: radius * Math.sin(lat/180 * Math.PI),
                  z: radius * cosPhi * Math.sin(long/180 * Math.PI),
              }

      },

      insert_bottom_menu: function(){


            var self = this;

             // Build the bottom menu

            self.bottom_menu = document.createElement("a-entity");

            self.bottom_menu.setAttribute("id", "bottom_menu");

            // Insert button + text for each 'first level' children

            console.log("BOTTOM MENU ", self.root);

            self.root.children.forEach(function(el){

                var element = document.createElement("a-entity");

                var element_longitude = self.long_scale(el.x);

                element.setAttribute("position", self.convert(0, element_longitude, self.data.bottom_radius));

                var text_string = el.data.name;

                var text = document.createElement("a-text");

                text.setAttribute("font", "offline/Roboto-msdf.json");

                 text.setAttribute("rotation", "-90 " + (-self.long_scale(el.x)) + " 0");
                 text.setAttribute("value", text_string);
                 text.setAttribute("align", "left");
                 text.setAttribute("wrap-count", text_string.length);
                 text.setAttribute("width", 0.1 * text_string.length);

                 element.appendChild(text);


                 // Insert button

                var icon = document.createElement("a-entity");

                icon.setAttribute("position", self.convert(0, self.long_scale(el.x), -0.1*1.5));
                icon.setAttribute("rotation", "-90 " + (-self.long_scale(el.x)) + " 0");

                icon.setAttribute("uipack-button", {'theme': 'light', icon_name : AFRAME_UIPACK.UIPACK_CONSTANTS.play_icon, radius: 0.1});

                element.appendChild(icon);

                icon.addEventListener("clicked", function(){

                    self.move_element_near_camera(self.el, self.el.sceneEl.camera.el, 5.0, element_longitude);

                });


                self.bottom_menu.appendChild(element);

            });

            // insert menu ring

            var menu_ring = document.createElement("a-ring");

            menu_ring.setAttribute("color", "#55B");

            menu_ring.setAttribute("rotation", "-90 0 0");

            menu_ring.setAttribute("radius-outer", self.data.bottom_radius - 0.1*3);
            menu_ring.setAttribute("radius-inner", (self.data.bottom_radius - 0.1*3)-0.1);


            self.bottom_menu.append(menu_ring);

            // Insert move-with-camera component

            self.bottom_menu.setAttribute("uipack-follow-camera","y_diff:-1.6");

            // Add to scene

            self.el.sceneEl.appendChild(self.bottom_menu);

      },

      launch_info: function(leaf){

          var self = this;

          var info_width = 2;
          var info_ar = 4/3;
          var info_distance = 3.0;
          var wrap_count = 40;
          var max_length = (40*15);

          // 15 lineas

          // Delete old panels

          d3.selectAll(".info_container").remove();

          // https://en.wikipedia.org/api/rest_v1/page/summary/President_of_the_United_States

          var link = leaf.data.link.replace("/wiki/", "");

          var longitude = leaf.data.longitude;

          console.log("LAUNCHING INFO FOR", leaf, link);

          var url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + link;

          d3.json(url, function (error, wiki_data) {

              if (error) throw error;

              console.log("DEVUELVE", wiki_data);

              // Draw a plane

              var container = document.createElement("a-entity");

              container.classList.add("info_container");

              var camera_pos = self.el.sceneEl.camera.getWorldPosition().clone();

              var icon_pos = new THREE.Vector3(leaf.data.icon_pos.x, leaf.data.icon_pos.y, leaf.data.icon_pos.z).clone();

              var panel_dir = icon_pos.clone().sub(camera_pos).projectOnPlane(new THREE.Vector3(0,1,0)).normalize().setLength(info_distance);

              var panel_y_rotation = (Math.atan2(panel_dir.x,panel_dir.z) * 180) / Math.PI;

              var container_position = panel_dir.clone().add(camera_pos);

              container_position.y+=0.5;

              container.setAttribute("position", container_position);
              container.setAttribute("rotation", {x: 0 , y:  panel_y_rotation + 180, z:0});

              var frame = document.createElement("a-plane");

              frame.setAttribute("width", info_width);
              frame.setAttribute("height", (info_width/info_ar));
              frame.setAttribute("material", {color: self.data.frame_background_color, shader: "flat"});


              var text_frame = document.createElement("a-entity");

              text_frame.setAttribute("geometry", {primitive: "plane", width: info_width*0.90, height: (info_width/info_ar)*0.90});
              text_frame.setAttribute("material", {color: self.data.frame_background_color, shader: "flat", visible: false});
              text_frame.setAttribute("text", {value: wiki_data.extract.length > max_length ? wiki_data.extract.substring(0, max_length) + "..." : wiki_data.extract, color: self.data.frame_text_color, wrapCount: wrap_count, font: "offline/Roboto-msdf.json"});
              container.appendChild(text_frame);
              container.appendChild(frame);

              var icon_displacement = 0;

              // Thumbnail (if exists)

              if("thumbnail" in wiki_data){

                  // if 'horizontal', add above frame

                  if(wiki_data.thumbnail.width > wiki_data.thumbnail.height){

                      var image = document.createElement("a-image");
                      image.setAttribute("src", wiki_data.thumbnail.source);
                      image.setAttribute("width", info_width);
                      image.setAttribute("height", info_width * (wiki_data.thumbnail.height/wiki_data.thumbnail.width));

                      image.setAttribute("position", {x:0, y: (info_width/info_ar)/2 + (info_width * (wiki_data.thumbnail.height/wiki_data.thumbnail.width))/2 , z:0});

                      container.appendChild(image);

                  }

                  // Vertical...

                  else {
                      var image = document.createElement("a-image");
                      image.setAttribute("src", wiki_data.thumbnail.source);
                      image.setAttribute("width", (info_width/info_ar) * (wiki_data.thumbnail.width/wiki_data.thumbnail.height));
                      image.setAttribute("height", (info_width/info_ar));

                      var displacement = (info_width/info_ar) * (wiki_data.thumbnail.width/wiki_data.thumbnail.height)/2;

                      image.setAttribute("position", {x:(info_width/2 + ((info_width/info_ar) * (wiki_data.thumbnail.width/wiki_data.thumbnail.height))/2) - displacement, y: 0, z:0});

                      frame.setAttribute("position", {x: - displacement, y:0, z:0});

                      text_frame.setAttribute("position", {x: - displacement, y:0, z:0});

                      container.appendChild(image);

                  }
              }

              // Add close button


              var icon = document.createElement("a-entity");


              icon.setAttribute("position", {x:icon_displacement, y: -(info_width/info_ar)/2, z:0.01});

              icon.setAttribute("uipack-button", {
                  icon_name: "icons/times.png",
                  radius: 0.1
              });

              container.appendChild(icon);

              icon.addEventListener("clicked", function () {
                  // Delete old panels

                  d3.selectAll(".info_container").remove();

              });


              self.el.appendChild(container);
          });

      },

      find_node: function(node_array, tree_data){

          node_array.forEach(function(descendant){

              tree_data.children.forEach(function(candidate){
                  if(candidate.name === descendant){
                      tree_data = candidate;
                  }
              })

          });

          return tree_data;

      },
      draw_tree: function() {

          var self = this;


          // Delete old panels

          d3.selectAll(".info_container").remove();

          // Regenerate tree from selected_node to botton. We need to regenerate since layout is going to begin
          // at the selected_node and latitude+longitude + rest of params are going to be different

          self.selected_tree = self.find_node(self.selected_node, JSON.parse(JSON.stringify(self.tree_data)));

          // Prune to max_depth, expanding only children of 'self.last_expanded'

          self.prune_tree_by_depth(self.selected_tree, self.data.max_depth, self.last_expanded);

          // Hierarchy on tree + d3.tree

          self.hierarchy = d3.hierarchy(self.selected_tree);

          self.root = d3.tree()
              .size([1, 1])
              (self.hierarchy);

          // Is a root tree ? (neither expanded nor contracted)

          self.is_root = self.selected_node.length === 0;

          // We could choose here the root_tree_entity or just go with tree_entity when depth > 1 [based on self.is_root]

          var tree_entity = self.is_root ? self.root_tree_entity: self.tree_entity;

          // If not root or root but first draw

          if(!(self.is_root) || (d3.select(tree_entity).selectAll("*").size() === 0)) {

              // Before drawing, remove all rubbish if not root (and hide root tree)

              if(!(self.is_root)) {

                  d3.select(tree_entity).selectAll("*").remove();

                  d3.select(self.root_tree_entity).attr("visible", false);
                  d3.select(self.tree_entity).attr("visible", true);

                  // Remove interactive elements from root tree (raycaster do not omit non visible objects)

                  d3.select(self.root_tree_entity).selectAll(".tree_button").classed("uipack", false);
                  d3.select(self.tree_entity).selectAll(".tree_button").classed("uipack", true);


                  // console.log("EX BUTTONS", d3.select(self.root_tree_entity).selectAll(".tree_button").size()).classed("uipack", false);

              }
              else {

                  // Add interactive elements from root tree (raycaster do not omit non visible objects)

                  d3.select(self.root_tree_entity).selectAll(".tree_button").classed("uipack", true);
                  d3.select(self.tree_entity).selectAll(".tree_button").classed("uipack", false);


              }

              // X ==> depth, Y ==> BREADTH

              // depth (y coordinate) goes to latitude, breadth into longitude (x coordinate)

              self.lat_scale = d3.scaleLinear().domain([0, 1]).range([90, 0]);

              // Long scale is 'normal' on root tree, centered on 'expanded node' on non-root trees

              self.long_scale = self.last_expanded !== "" ? d3.scaleLinear().domain([0, 1]).range([self.expanded_longitude - 90, self.expanded_longitude + 90]) : d3.scaleLinear().domain([0, 1]).range([0, 360]);

              // Constant scale at the moment for all legends (this is the 'width' of each 'character' based on depth)

              self.legend_width_scale = d3.scaleSqrt().domain([0, self.data.max_depth]).range([0.2, 0.2]);

              // Prepare link and node data

              self.node_data = self.root.descendants();
              self.link_data = self.root.links();

              // Insert root 'link' to itself (only to be used for drawing the label) into link_data

              self.link_data.push({source: self.node_data[0], target: self.node_data[0]});

              console.log("LINK DATA --> ", self.link_data, self.node_data);

              // Make groups, one for each link (TODO: Identity function comtemplating all the path up for both target and source)

              var group_join = d3.select(tree_entity).selectAll(".tree_group").data(self.link_data, function (d, i) {
                  return d.source.data.name + "--->" + d.target.data.name
              });

              var group_elements_enter = group_join.enter().append("a-entity")
                  .classed("tree_groups", true);

              // Draw all the links

              group_elements_enter.append("a-entity").classed("tree_line", true).attr("meshline", function (link, j) {

                  var source_s = [self.lat_scale(link.source.y), self.long_scale(link.source.x)];
                  var target_s = [self.lat_scale(link.target.y), self.long_scale(link.target.x)];

                  var source_point = self.convert(source_s[0], source_s[1], self.data.radius);
                  var target_point = self.convert(target_s[0], target_s[1], self.data.radius);

                  // Annotate longitude in target and source

                  link.source.data.longitude = source_s[1];

                  link.target.data.longitude = target_s[1];

                  var path = [];

                  var points = self.data.num_points;

                  for (var i = 0; i < points; i++) {
                      var point_s = [(source_s[0] + (target_s[0] - source_s[0]) * (i / points)), (source_s[1] + (target_s[1] - source_s[1]) * (i / points))];
                      var point_coords = self.convert(point_s[0], point_s[1], self.data.radius);
                      path.push(point_coords);
                  }

                  path.push(target_point);

                  return {
                      lineWidth: 0.025,
                      color: self.data.branch_color,
                      // path: initpath.map(AFRAME.utils.coordinates.stringify).join(",")
                      path: path.map(AFRAME.utils.coordinates.stringify).join(",")
                  };

              });

              // Draw all texts (more performant to change all attributes at once, since mainly all attributes have a depth condition)

              if(self.last_root_node!==null){
                  console.log("LAST ROOT NODE", self.last_root_node);
              }


              group_elements_enter.append("a-text").classed("tree_text", true).each(function (d, i) {

                  var target_s = [self.lat_scale(d.target.y), self.long_scale(d.target.x)];


                  // Deepest nodes

                  if (d.target.depth === self.data.max_depth) {

                      var text_target_point = self.convert(target_s[0] - 3.5, target_s[1], self.data.radius);

                      var text = d3.select(this);

                      // Rotate towards center and z-rotate to put text in vertical format

                      text.attr("rotation", target_s[0] + " " + ((-(target_s[1])) - 90) + " 90");
                      text.attr("value", d.target.data.name);
                      text.attr("font", "offline/Roboto-msdf.json");
                      text.attr("position", text_target_point);
                      text.attr("color", self.data.text_color);

                      // Align to the end of the text

                      text.attr("align", "right");

                      // Adjunst wrap-count to length of text to avoid wrapping

                      text.attr("wrap-count", d.target.data.name.length + 1);
                      text.attr("z-offset", 0.01);
                      text.attr("width", self.legend_width_scale(d.target.depth) * d.target.data.name.length);


                  }
                  else {

                      // Intermediate nodes

                      // If on root tree... move 'down' the label, else move 'up'

                      var text_target_point = self.selected_node.length !== 0 ? self.convert(target_s[0] + 3.5, target_s[1], self.data.radius) : self.convert(target_s[0] - 3.5, target_s[1], self.data.radius);

                      var text = d3.select(this);

                      // Rotate towards center, horizontal plain text

                      text.attr("rotation", target_s[0] + " " + ((-(target_s[1])) - 90) + " 0");
                      text.attr("value", d.target.data.name === "root"? "" : d.target.data.name);
                      text.attr("color", self.data.text_color);


                      text.attr("align", "center");

                      // Adjust wrap count to fixed number, for wrapping (at this latitude, collisions can happen on horizontal texts)

                      text.attr("wrap-count", 20);
                      text.attr("z-offset", 0.05);
                      text.attr("font", "offline/Roboto-msdf.json");
                      text.attr("width", self.legend_width_scale(d.target.depth) * 20);

                      if(self.last_root_node!== null) {
                          if(d.source.data.name === self.last_root_node.d.source.data.name && d.target.data.name === self.last_root_node.d.target.data.name) {

                              // console.log("HA COLADO ESTE ", d, self.last_root_node);
                              // text.attr("position", self.last_root_node.position);

                              var old_position = self.last_root_node.position;

                              d.old_position = self.last_root_node.position;
                              d.new_position = text_target_point;

                              d3.select(this).transition().duration(self.data.transition).attrTween("position", function(d,i){

                                  // console.log("INTERPOLANDO ENTRE", old_position, text_target_point);

                                  return function(t) {
                                      // console.log("POSITION", d3.interpolate(old_position, text_target_point)(t));
                                      return d3.interpolate(old_position, text_target_point)(t);
                                  }

                              });
                          }
                          else {
                            text.attr("position", text_target_point);
                          }

                      }
                      else {

                          text.attr("position", text_target_point);

                      }


                  }
              });
              //     .filter(function(d,i){
              //     return 'old_position' in d;
              // }).transition().duration(self.data.transition).attrTween("position", function(d){
              //
              //     console.log("INTERPOLANDO ENTRE", d.old_position, d.new_position);
              //
              //     return function(t) {
              //         console.log("POSITION", d3.interpolate(d.old_position, d.new_position)(t));
              //         return d3.interpolate(d.old_position, d.new_position)(t);
              //     }
              //
              // });

              if(self.last_root_node!==null){
                  self.last_root_node = null;
              }



              // Draw all the buttons (more performant to change all attributes at once, since mainly all attributes have a depth condition)

              group_elements_enter.append("a-entity").classed("tree_button", true).each(function (d, i) {

                  // Spherical coordinates of target node

                  var target_s = [self.lat_scale(d.target.y), self.long_scale(d.target.x)];

                  // Deepest nodes: '+' or 'i' button

                  if (d.target.depth === self.data.max_depth) {

                      // '+' button

                      if ('children' in d.target || 'children' in d.target.data) {

                          // Target 'below' point

                          var icon_target_point = self.convert(target_s[0] - 2.0, target_s[1], self.data.radius);

                          var icon = d3.select(this);

                          // Rotate towards camera and rotate 90 degrees

                          icon.attr("position", icon_target_point);
                          icon.attr("rotation", target_s[0] + " " + ((-(target_s[1])) - 90) + " 0");

                          icon.attr("uipack-button", {
                              icon_name: "icons/plus.png",
                              radius: 0.2
                          });

                          icon.on("clicked", function () {

                              self.selected_node.push(d.target.parent.data.name);
                              self.last_expanded = d.target.data.name;
                              self.expanded_longitude = d.target.parent.data.longitude;

                              self.last_clicked_position = icon_target_point;

                              if(self.is_root){
                                  self.last_root_node = {'d': d, 'position': icon_target_point};
                              }

                              self.draw_tree();

                          });

                      }
                      // leaf node ('i' button)

                      else {

                          var leaf = d.target;

                          if ('link' in leaf.data) {

                              // A little 'below'

                              var icon_target_point = self.convert(target_s[0] - 2.0, target_s[1], self.data.radius);

                              var icon = d3.select(this);

                              // Look towards center

                              icon.attr("position", icon_target_point);
                              icon.attr("rotation", target_s[0] + " " + ((-(target_s[1])) - 90) + " 0");

                              icon.attr("uipack-button", {
                                  icon_name: "icons/info.png",
                                  radius: 0.2
                              });

                              leaf.data.icon_pos = icon_target_point;


                              icon.on("clicked", function () {

                                  self.launch_info(leaf);

                              });

                          }

                      }

                  }
                  else {

                      // If intermediate node and tree is expanded ---> '-' icon

                      if ((d.target.depth === (self.data.max_depth - 1)) && (self.selected_node.length !== 0)) {


                          var icon_target_point = self.convert(target_s[0], target_s[1], self.data.radius - 0.1);

                          var icon = d3.select(this);


                          // Look towards center, at target position

                          icon.attr("position", icon_target_point);
                          icon.attr("rotation", target_s[0] + " " + ((-(target_s[1])) - 90) + " 0");

                          icon.attr("uipack-button", {
                              icon_name: "icons/minus.png",
                              radius: 0.2
                          });

                          icon.on("clicked", function () {

                              // if clicked: remove a node from the 'selected_node' stack

                              self.selected_node.pop();

                              // last expanded (for pruning tree on next screen) is by definition, the button parent

                              self.last_expanded = self.selected_node.length === 0 ? "" : d.target.parent.data.name;

                              // expanded longitude annotation for drawing partial trees centered on this very last interaction

                              self.expanded_longitude = d.target.data.longitude;

                              self.last_clicked_position = icon_target_point;

                              if((!self.is_root) && self.selected_node.length === 0) {

                                  self.last_non_root_node = {'d': d, 'position': icon_target_point};
                              }


                              // console.log("SELECTED NODE", self.selected_node);
                              self.draw_tree();

                          });
                      }

                  }
              });
          }
          // not first drawing of root tree... hide non-root-tree and show root-tree
          else {

                  d3.select(self.root_tree_entity).attr("visible", true);
                  d3.select(self.tree_entity).attr("visible", false);

                  // Add interactive elements from root tree (raycaster do not omit non visible objects)

                  d3.select(self.root_tree_entity).selectAll(".tree_button").classed("uipack", true);
                  d3.select(self.tree_entity).selectAll(".tree_button").classed("uipack", false);

                  // Transition the link text that corresponds with self.last_non_root_node

                  console.log("LAST NON ROOT", self.last_non_root_node);

                  d3.select(self.root_tree_entity).selectAll(".tree_text").each(function(d,i){

                          if(d.source.data.name === self.last_non_root_node.d.source.data.name && d.target.data.name === self.last_non_root_node.d.target.data.name) {

                              // d3.select(this).attr("position", self.last_non_root_node.position);

                                var final_position = {x: d3.select(this).attr("position").x, y: d3.select(this).attr("position").y, z: d3.select(this).attr("position").z};

                                var init_position = {x: self.last_non_root_node.position.x, y:self.last_non_root_node.position.y, z: self.last_non_root_node.position.z};

                                d3.select(this).transition().duration(self.data.transition).attrTween("position", function(d,i){

                                  return function(t) {
                                      return d3.interpolate(init_position, final_position)(t);
                                  }

                              });
                          }
                  });

          }


          // Implement transitions w/ d3 help


          // d3.selectAll(".tree_lines").transition().duration(500).ease(d3.easeLinear).attrTween("meshline", function(d,i){
          //
          //     var node = this;
          //         // line.setAttribute("meshline", {
          //         //     lineWidth: 0.05,
          //         //     color: "#55B",
          //         //     path: path.map(AFRAME.utils.coordinates.stringify).join(",")
          //         // });
          //
          //     var path_string = d.path_string;
          //     var init_path_string = d.init_path_string;
          //
          //
          //     return function(t){
          //         return {
          //             opacity: d3.interpolate(0,1)(t),
          //             transparent:(t === 1) ? false : true,
          //             lineWidth: 0.03,
          //             // color: d3.interpolateRgb("#55B", "#B55")(t),
          //             color: "#345678",
          //             path: d3.interpolateString(init_path_string, path_string)(t)
          //
          //         }
          //         //
          //         // return d3.interpolate({lineWidth: 0.05, color: "#55B", path: init_path_string}, {lineWidth: 0.05, color: "#B55", path: path_string})(t);
          //     }
          // });


      },
      update: function (oldData) {

        var self = this;

        // Load new data

        d3.json(self.data.data, function (error, tree_data) {

            if (error) throw error;

            self.tree_data = tree_data;

            self.tree_entity = document.createElement("a-entity");

            self.tree_entity.setAttribute("id", "tree-entity");

            self.el.appendChild(self.tree_entity);

            self.root_tree_entity = document.createElement("a-entity");
            self.root_tree_entity.setAttribute("id", "root-tree-entity");
            self.el.appendChild(self.root_tree_entity);


            console.log("DATA ", self.tree_data);

            // self.selected_node = ["People", "Visual artists"];
            self.selected_node = [];

            self.last_expanded = "";

            self.last_clicked_position = null;

            self.last_root_node = null;
            self.last_non_root_node = null;

            self.draw_tree();

            // self.insert_bottom_menu();

            // Set cursor

            AFRAME_UIPACK.utils.set_cursor(self.el.sceneEl, 'light');

        });

      },

      remove: function () { },

      tick: function (t) { },

      pause: function () { },

      play: function () { }

});

