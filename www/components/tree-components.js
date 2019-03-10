AFRAME.registerComponent('meshline', {
  schema: {
    color: { default: '#000' },
    lineWidth: { default: 10 },
    lineWidthStyler: { default: '1' },
    opacity: {default: 1.0},
    transparent: {default: false},
    path: {
      default: [
        { x: -0.5, y: 0, z: 0 },
        { x: 0.5, y: 0, z: 0 }
      ],
      // Deserialize path in the form of comma-separated vec3s: `0 0 0, 1 1 1, 2 0 3`.
      parse: function (value) {
        return value.split(',').map(AFRAME.utils.coordinates.parse);
      },
      // Serialize array of vec3s in case someone does setAttribute('line', 'path', [...]).
      stringify: function (data) {
        return data.map(AFRAME.utils.coordinates.stringify).join(',');
      }
    }
  },

  init: function () {
    this.resolution = new THREE.Vector2 ( window.innerWidth, window.innerHeight ) ;

    var sceneEl = this.el.sceneEl;
    sceneEl.addEventListener( 'render-target-loaded', this.do_update.bind(this) );
    sceneEl.addEventListener( 'render-target-loaded', this.addlisteners.bind(this) );


  /*
    if (sceneEl.hasLoaded) {

      console.log('has loaded');
      this.do_update(); //never happens ?

    } else {

      sceneEl.addEventListener('render-target-loaded', this.do_update.bind(this));

      }
  */
  },

  addlisteners: function () {

    //var canvas = this.el.sceneEl.canvas;

    // canvas does not fire resize events, need window
    window.addEventListener( 'resize', this.do_update.bind (this) );

    //console.log( canvas );
    //this.do_update() ;

  },

  do_update: function () {

    var canvas = this.el.sceneEl.canvas;
    this.resolution.set( canvas.width,  canvas.height );
    //console.log( this.resolution );
    this.update();

  },

  update: function () {

    // console.log("UPDATE DE LINE");
    // //cannot use canvas here because it is not created yet at init time
    //console.log("canvas res:");
    //console.log(this.resolution);
    var material = new THREE.MeshLineMaterial({
      color: new THREE.Color(this.data.color),
      opacity: this.data.opacity,
      transparent: this.data.transparent,
      resolution: this.resolution,
      sizeAttenuation: true,
      lineWidth: this.data.lineWidth,
      //near: 0.1,
      //far: 1000
    });

    var geometry = new THREE.Geometry();

    this.data.path.forEach(function (vec3) {
      geometry.vertices.push(
        new THREE.Vector3(vec3.x, vec3.y, vec3.z)
      );
    });

    var widthFn = new Function ('p', 'return ' + this.data.lineWidthStyler);
    //? try {var w = widthFn(0);} catch(e) {warn(e);}
    var line = new THREE.MeshLine();
    line.setGeometry( geometry, widthFn );
    this.el.setObject3D('mesh', new THREE.Mesh(line.geometry, material));
  },

  remove: function () {
    this.el.removeObject3D('mesh');
  }
});
