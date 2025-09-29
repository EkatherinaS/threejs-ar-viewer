(() => {
  class ARViewer {
    constructor() {
      this.scene = document.createElement("a-scene");
      this.scene.setAttribute("embedded", "");
      this.scene.setAttribute(
        "arjs",
        "sourceType: webcam; debugUIEnabled: false"
      );
      this.scene.setAttribute("vr-mode-ui", "enabled: true");

      this.camera = document.createElement("a-camera");
      this.camera.setAttribute("position", "0 0 0");
      this.camera.setAttribute("look-controls", "touchEnabled: false");
      this.scene.appendChild(this.camera);

      this.threeScene = this.scene.object3D;

      this.isDragging = false;
      this.dragStart = null;
      this.moveMode = false;
      this.moveTimeout = null;
      this.pinchStartDist = null;
      this.scale = 1.0;
    }

    view(model, options = undefined) {
      this.heightRange = options?.heightRange
        ? options?.heightRange
        : { min: -1, max: 1 };
      document.body.appendChild(this.scene);

      const bbox = new THREE.Box3().setFromObject(model, true);

      const height = bbox.max.z - bbox.min.z;
      const width = bbox.max.x - bbox.min.x;
      const depth = bbox.max.y - bbox.min.y;

      this.panel = this.getPanel(width * 1.1, depth * 1.1);
      this.panel.rotateX(Math.PI / 2);
      this.panel.visible = false;
      this.panel.position.set(
        model.position.x,
        model.position.y - height / 2 - 0.01,
        model.position.z
      );

      this.group = new THREE.Group();
      this.group.add(model);
      this.group.add(this.panel);

      this.lookAtModel();
      this.setEventListeners();
      this.addSlider();
    }

    lookAtModel() {
      const box = new THREE.Box3().setFromObject(this.group, true);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const distance = Math.max(size.x, size.y, size.z) * 3;
      const x = center.x;
      const y = center.y + size.y / 2;
      const z = center.z + distance;
      const cameraPosition = `${x} ${y} ${z}`;
      this.camera.setAttribute("position", cameraPosition);
    }

    getPanel(width, height, color = 0xf9f7b6) {
      const r = Math.min(width, height) / 20;
      const left = 0;
      const right = width;
      const top = height;
      const bottom = 0;

      const shape = new THREE.Shape();
      shape.moveTo(left + r, top);
      shape.lineTo(right - r, top);
      shape.quadraticCurveTo(right, top, right, top - r);
      shape.lineTo(right, bottom + r);
      shape.quadraticCurveTo(right, bottom, right - r, bottom);
      shape.lineTo(left + r, bottom);
      shape.quadraticCurveTo(left, bottom, left, bottom + r);
      shape.lineTo(left, top - r);
      shape.quadraticCurveTo(left, top, left + r, top);
      shape.closePath();

      const extrudeSettings = {
        steps: 1,
        depth: 0.01,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.01,
        bevelOffset: 0,
        bevelSegments: 1,
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.center();

      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.5,
      });

      return new THREE.Mesh(geometry, material);
    }

    rotateY(event) {
      if (this.moveTimeout) clearTimeout(this.moveTimeout);
      const touch = event.touches[0];
      const deltaX = touch.pageX - this.dragStart.x;
      const toRadians = Math.PI / window.innerWidth;

      this.group.rotateY(deltaX * toRadians);
      this.dragStart = { x: touch.pageX, y: touch.pageY };
    }

    moveY(value) {
      const proportion = value * 0.01;
      const min = this.heightRange.min;
      const max = this.heightRange.max;
      const range = max - min;
      const current = range * proportion + min;
      const clamped = Math.max(min, Math.min(max, current));
      this.group.position.y = clamped;
    }

    moveXZ(event) {
      const touch = event.touches[0];
      const deltaX = touch.pageX - this.dragStart.x;
      const deltaY = touch.pageY - this.dragStart.y;
      const sensitivity = 0.01;

      this.group.position.x += deltaX * sensitivity;
      this.group.position.z += deltaY * sensitivity;

      this.dragStart.x = touch.pageX;
      this.dragStart.y = touch.pageY;
    }

    scaleModel(event) {
      const dx = event.touches[0].pageX - event.touches[1].pageX;
      const dy = event.touches[0].pageY - event.touches[1].pageY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let factor = dist / this.pinchStartDist;
      let newScale = this.scale * factor;
      newScale = Math.max(0.5, Math.min(2.0, newScale));

      this.group.scale.set(newScale, newScale, newScale);

      this.pinchStartDist = dist;
      this.scale = newScale;
    }

    addPanel() {
      this.panel.visible = true;
    }

    removePanel() {
      this.panel.visible = false;
    }

    addSlider() {
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = 0;
      slider.max = 100;
      slider.value = 50;
      slider.style.transform = "rotate(270deg)";
      slider.style.transformOrigin = "left bottom";
      slider.style.width = "60vh";
      slider.style.height = "30px";
      slider.style.position = "absolute";
      slider.style.left = "95%";
      slider.style.bottom = "50%";
      slider.style.transform += " translateX(-50%)";

      document.body.appendChild(slider);

      [
        "touchstart",
        "touchmove",
        "touchend",
        "pointerdown",
        "pointermove",
      ].forEach((evt) => {
        slider.addEventListener(evt, (e) => {
          e.stopPropagation();
        });
      });

      this.moveY(slider.value);

      slider.addEventListener("input", () => {
        this.moveY(slider.value);
      });
    }

    setEventListeners() {
      this.scene.addEventListener("loaded", () => {
        this.threeScene.add(this.group);
      });

      this.scene.addEventListener("touchstart", (event) => {
        if (event.touches.length === 1) {
          this.dragStart = {
            x: event.touches[0].pageX,
            y: event.touches[0].pageY,
          };
          this.isDragging = true;

          this.moveTimeout = setTimeout(() => {
            this.moveMode = true;
            this.addPanel();
          }, 500);
        }
        if (event.touches.length === 2) {
          clearTimeout(this.moveTimeout);
          this.isDragging = false;
          this.moveMode = false;
          this.removePanel();

          const dx = event.touches[0].pageX - event.touches[1].pageX;
          const dy = event.touches[0].pageY - event.touches[1].pageY;
          this.pinchStartDist = Math.sqrt(dx * dx + dy * dy);
        }
      });

      this.scene.addEventListener("touchmove", (event) => {
        event.preventDefault();
        if (event.touches.length === 1) {
          if (this.moveMode) this.moveXZ(event);
          else if (this.isDragging) this.rotateY(event);
        }
        if (event.touches.length === 2 && this.pinchStartDist !== null)
          this.scaleModel(event);
      });

      this.scene.addEventListener("touchend", (event) => {
        clearTimeout(this.moveTimeout);
        if (this.moveMode) {
          this.moveMode = false;
          this.removePanel();
        }
        if (event.touches.length === 0) {
          this.isDragging = false;
          this.pinchStartDist = null;
        }
      });
    }
  }

  window.ARViewer = ARViewer;
})();
