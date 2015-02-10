(function() {
  var BUTTON_COLOR = 0xffffff;
  var BUTTON_COLOR_PRESSED = 0xFF0000;

  var KNOB_COLOR = 0xff2222;
  var KNOB_COLOR_ACTIVE = 0x81d41d;

  var BACKGROUND_COLOR = 0x151515;

  window.LeapWidgets = function (scene) {
    self = this;
    this.scene = scene;
    this.buttons = [];
    this.switches = [];
    this.sliders = [];
    this.handMeshes = [];
    this.disabledHand = false;
  }
  LeapWidgets.prototype.initLeapHand = function(opts) {
    opts = opts || {};
    var sampleRecording = opts['sampleRecording'];
    var scale = opts['scale'] || 1;
    var baseBoneRotation = (new THREE.Quaternion).setFromEuler(
        new THREE.Euler(Math.PI / 2, 0, 0)
    );
    var boneWidthDefault = 10; // TODO not returned by recorder yet.
    Leap.loop({
      frame: function() {
        scene.simulate();
        renderer.render(scene, camera);
      },
      hand: function (hand) {
        hand.fingers.forEach(function (finger) {

          finger.data('boneMeshes').forEach(function(mesh, i){
            var bone = finger.bones[i];
            var bonePosition = new THREE.Vector3().fromArray(bone.center()).multiplyScalar(scale);
            bonePosition.y -= (opts['translateY'] || 130) * scale;
            bonePosition.x += (opts['translateX'] || 0) * scale;
            bonePosition.z += (opts['translateZ'] || 80) * scale;
            mesh.setLinearVelocity(bonePosition.sub(mesh.position).multiplyScalar(16));
            mesh.setRotationFromMatrix(new THREE.Matrix4().fromArray(bone.matrix()));
            mesh.quaternion.multiply(baseBoneRotation);
            mesh.__dirtyRotation = true;
			mesh.name = "Hand";
          });

          finger.data('jointMeshes').forEach(function(mesh, i){
            var bone = finger.bones[i];
            var jointPosition = new THREE.Vector3().fromArray(bone ? bone.prevJoint : finger.bones[i-1].nextJoint).multiplyScalar(scale);
            jointPosition.y -= 130 * scale;
            jointPosition.z += 80 * scale;
            mesh.setLinearVelocity(jointPosition.sub(mesh.position).multiplyScalar(20));
            mesh.setAngularVelocity(new THREE.Vector3());
          });

        });
    }
    })
      // these two LeapJS plugins, handHold and handEntry are available from leapjs-plugins, included above.
      // handHold provides hand.data
      // handEntry provides handFound/handLost events.
    .use('handHold')
    .use('handEntry')
    .on('handFound', function(hand){
      window.obj.keyboard = false;
      self.handMeshes = [];
      hand.fingers.forEach(function (finger, fingerIndex) {

        var boneMeshes = [];
        var jointMeshes = [];

        finger.bones.forEach(function(bone, boneIndex) {
          var boneWidth = bone.width || boneWidthDefault;
          var boneMesh = new Physijs.CylinderMesh(
              new THREE.CylinderGeometry(boneWidth/2 * scale, boneWidth/2 * scale, (bone.length - boneWidth) * scale),
              Physijs.createMaterial(new THREE.MeshPhongMaterial(), 0, 0),
              100
          );
          // TODO: why does the thumb have this extra bone? Removing it
          if (boneIndex === 0 && fingerIndex === 0) {
            boneMesh.visible = false;
            boneMesh.mass = 0;
          }
          boneMesh.castShadow = true;
          boneMesh.position.fromArray([0,10000,0]);
		      boneMesh.name = "Hand";
          self.handMeshes.push(boneMesh);
          scene.add(boneMesh);
          boneMeshes.push(boneMesh);
        });

        for (var i = 0; i < finger.bones.length + 1; i++) {
          var jointMesh = new Physijs.SphereMesh(
              new THREE.SphereGeometry(((finger.bones[i] || finger.bones[i-1]).width || boneWidthDefault)/2 * scale, 16),
              Physijs.createMaterial(new THREE.MeshPhongMaterial(), 0, 0),
              100
          );
        //  jointMesh.sticky = (finger.bones.length == i);
          jointMesh.castShadow = true;
          jointMesh.position.fromArray([0,100,0]);
          if (i === 0 && fingerIndex === 0) {
            jointMesh.visible = false;
            jointMesh.mass = 0;		
          }

          jointMesh.material.color.setHex(0x0088ce);
		  jointMesh.name = "Hand";
          self.handMeshes.push(jointMesh);
          scene.add(jointMesh);
          jointMeshes.push(jointMesh);
        }


        finger.data('boneMeshes', boneMeshes);
        finger.data('jointMeshes', jointMeshes);

      });
    })
    .on('handLost', function(hand){

      hand.fingers.forEach(function (finger) {

        var boneMeshes = finger.data('boneMeshes');
        var jointMeshes = finger.data('jointMeshes');

        boneMeshes.forEach(function(mesh){
          scene.remove(mesh);
        });

        jointMeshes.forEach(function(mesh){
          scene.remove(mesh);
        });

        finger.data({
          boneMeshes: null,
          boneMeshes: null
        });
 
      });
    })
    .use('playback', {
      // This is a compressed JSON file of preprecorded frame data
      recording: sampleRecording,
      // How long, in ms, between repeating the recording.
      timeBetweenLoops: 0,
      pauseOnHand: true
    })

    .connect();


  };

  
  LeapWidgets.prototype.createWall = function(position, dimensions) {
    var wall = new Physijs.BoxMesh(
      new THREE.BoxGeometry(dimensions.x, dimensions.y, dimensions.z),
      Physijs.createMaterial(new THREE.MeshPhongMaterial({
        color: BACKGROUND_COLOR
      }), 0, 0.9),
      0
    );
    wall.position.copy(position);
    wall.receiveShadow = true;
    this.scene.add(wall);

    return wall;
  };
  
  //--New
  LeapWidgets.prototype.createWall1 = function(position, dimensions) {
    var wall = new Physijs.BoxMesh(
      new THREE.BoxGeometry(dimensions.x, dimensions.y, dimensions.z),
      Physijs.createMaterial(new THREE.MeshPhongMaterial({
        color: 0x151515
      }), 0, 0.9),
      0
    );
    wall.position.copy(position);
    wall.receiveShadow = true;
    this.scene.add(wall);
		
    return wall;
  };
  //++new
  
  LeapWidgets.prototype.createButton = function(position, dimensions,color) {
    var button = new Physijs.BoxMesh(
      new THREE.BoxGeometry(dimensions.x, dimensions.y, dimensions.z),
      Physijs.createMaterial(new THREE.MeshPhongMaterial({
        color: color.unpressed
      }), 0, 0),
      1
    )
    button.originalposition = position;
    button.position.copy(button.originalposition);
    button.receiveShadow = true;
    button.castShadow = true;
	button.color = {}
	button.color.pressed = color.pressed;
	button.color.unpressed = color.unpressed;
	this.scene.add(button);

	button.setAngularFactor(new THREE.Vector3(1, 0, 0));
	
    button.HingeConstraint = new Physijs.HingeConstraint(
      button,
      null,
      new THREE.Vector3(position.x-15,position.y+10,position.z-50),
      new THREE.Vector3(Math.sqrt(2), 0, 0)
    );
    this.scene.addConstraint(button.HingeConstraint);
    button.HingeConstraint.setLimits(0,0.2, 1, 0);
	
	button.HingeConstraint.enableAngularMotor( -1, 1);
	button.setLinearFactor(new THREE.Vector3(0, 0, 0));
    this.buttons.push(button);
    return button;
  };


  LeapWidgets.prototype.createLabel = function(text, position, size, color, addTo) {
    var hexpadding = "#000000";
    var canvas = document.createElement("canvas");
    var widgets = this;
    var currentLabelMesh = null;
    var currentText = null;

    var label = {
        getText: function() {
            return currentText;
        },
        setText: function(text) {
            if (currentLabelMesh) {
                (addTo || widgets.scene).remove(currentLabelMesh);
            }
            currentText = text;
            var context = canvas.getContext("2d");
            context.font = size + "pt Helvetica";

            canvas.width = context.measureText(text).width;
            canvas.height = size + 8;
            context.font = size + "pt Arial";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillStyle = hexpadding.substring(0, hexpadding.length - color.toString(16).length) + color.toString(16);
            context.fillText(text, canvas.width / 2, canvas.height / 2);

            var texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;

            var material = new THREE.MeshBasicMaterial({
              map : texture,
              transparent: true
            });

            var mesh = new THREE.Mesh(new THREE.PlaneGeometry(canvas.width, canvas.height), material);
            mesh.doubleSided = true;
            mesh.position.copy(position);

            (addTo || widgets.scene).add(mesh);
            currentLabelMesh = mesh;
        }
    };
    label.setText(text);
    return label;
  }

  LeapWidgets.prototype.updateHandMesh = function(value) {
    this.disabledHand = value
    if (value){
      self.handMeshes.forEach(function(handMesh){
        this.scene.remove(handMesh);
      });
    }
    else{
      self.handMeshes.forEach(function(handMesh){
        this.scene.add(handMesh);
      });    }
  };
})();
