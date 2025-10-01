const {
  Box3,
  Mesh,
  Group,
  Shape,
  Vector3,
  MeshBasicMaterial,
  ExtrudeGeometry,
} = THREE;

(() => {
  /**
 Модуль AR
 @module Site3dAR
 */

  /**
 Класс работы с AR
 @class Site3dAR
 @constructor
 */
  class Site3dAR {
    constructor() {
      this._isOn = false;

      this._aframeScene = document.createElement("a-scene");
      this._aframeScene.setAttribute("embedded", "");
      this._aframeScene.setAttribute(
        "arjs",
        "sourceType: webcam; debugUIEnabled: false"
      );
      this._aframeScene.setAttribute("vr-mode-ui", "enabled: true");

      this._aframeCamera = document.createElement("a-camera");
      this._aframeCamera.setAttribute("position", "0 0 0");
      this._aframeCamera.setAttribute("look-controls", "touchEnabled: false");
      this._aframeScene.appendChild(this._aframeCamera);

      this._aframeThreeScene = this._aframeScene.object3D;

      this._group = null;
      this._model = null;
      this._selection = null;

      this._isDragging = false;
      this._dragStart = null;
      this._moveMode = false;
      this._moveTimeout = null;
      this._pinchStartDist = null;
      this._scaleValue = 1.0;
      this._heightRange = 1.0;

      this._end = null;
    }

    /**
   Свойство возвращает истину, если AR включен
   @property isOn
   @type boolean
   */
    get isOn() {
      return this._isOn;
    }

    /**
   Метод включает AR
   @method on
   @param    {Object3D} model    Модель
   @param    {object} options    Параметры режима AR:
   - heightRange - Диапазон изменения высоты модели
   - end - Функция, запускаемая после выхода из режима AR
   */
    on(model, options) {
      if (this.isOn) {
        return;
      }

      this._model = model;

      const optionsCur = {
        heightRange: {
          min: -1,
          max: 1,
        },
        end: null,
        ...options,
      };

      this._heightRange = optionsCur.heightRange;
      this._end = optionsCur.end;

      document.body.appendChild(this._aframeScene);

      const modelPosition = model.position;
      const bbox = new Box3().setFromObject(model, true);

      const height = bbox.max.z - bbox.min.z;
      const width = bbox.max.x - bbox.min.x;
      const depth = bbox.max.y - bbox.min.y;

      this._selection = this._getSelection(width * 1.1, depth * 1.1);
      this._selection.rotateX(Math.PI / 2);
      this._selection.visible = false;
      this._selection.position.set(
        modelPosition.x,
        modelPosition.y - height / 2 - 0.01,
        modelPosition.z
      );

      this._group = new Group();
      this._group.add(model);
      this._group.add(this._selection);

      this._lookAtModel();
      this._setEventListeners();
      this._addSlider();

      this._isOn = true;
    }

    /**
   Метод выключает AR
   @method off
   */
    off() {
      if (!this.isOn) {
        return;
      }

      this._isOn = false;

      this._callEnd();
    }

    _getSelection(width, height, options = undefined) {
      const optionsCur = {
        color: "#ffb800",
        ...options,
      };

      const r = Math.min(width, height) / 20;
      const left = 0;
      const right = width;
      const top = height;
      const bottom = 0;

      const shape = new Shape();
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

      const geometry = new ExtrudeGeometry(shape, extrudeSettings);
      geometry.center();

      const material = new MeshBasicMaterial({
        color: optionsCur.color,
        transparent: true,
        opacity: 0.5,
      });

      return new Mesh(geometry, material);
    }

    _showSelection() {
      this._selection.visible = true;
    }

    _hideSelection() {
      this._selection.visible = false;
    }

    _moveXZ(event) {
      const touch = event.touches[0];
      const deltaX = touch.pageX - this._dragStart.x;
      const deltaY = touch.pageY - this._dragStart.y;
      const sensitivity = 0.01;

      const camera = this._aframeCamera.object3D;
      const normDeltaX = deltaX / window.innerWidth;
      const normDeltaY = -(deltaY / window.innerHeight);

      const move = new THREE.Vector3(normDeltaX, normDeltaY, 0);
      move.applyQuaternion(camera.quaternion);
      move.y = 0;
      move.normalize();

      this._group.position.addScaledVector(
        move,
        sensitivity * Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      );

      this._dragStart.x = touch.pageX;
      this._dragStart.y = touch.pageY;
    }

    _moveY(value) {
      const proportion = value * 0.01;
      const min = this._heightRange.min;
      const max = this._heightRange.max;
      const range = max - min;
      const current = range * proportion + min;
      const clamped = Math.max(min, Math.min(max, current));

      this._group.position.y = clamped;
    }

    _scale(event) {
      const dx = event.touches[0].pageX - event.touches[1].pageX;
      const dy = event.touches[0].pageY - event.touches[1].pageY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let factor = dist / this._pinchStartDist;
      let newScale = this._scaleValue * factor;
      newScale = Math.max(0.5, Math.min(2.0, newScale));

      this._group.scale.set(newScale, newScale, newScale);

      this._pinchStartDist = dist;
      this._scaleValue = newScale;
    }

    _rotateY(event) {
      if (this._moveTimeout) {
        clearTimeout(this._moveTimeout);
      }

      const touch = event.touches[0];
      const deltaX = touch.pageX - this._dragStart.x;
      const toRadians = Math.PI / window.innerWidth;

      this._group.rotateY(deltaX * toRadians);
      this._dragStart = {
        x: touch.pageX,
        y: touch.pageY,
      };
    }

    _lookAtModel() {
      const box = new Box3().setFromObject(this._group, true);
      const size = box.getSize(new Vector3());
      const center = box.getCenter(new Vector3());
      const distance = Math.max(size.x, size.y, size.z) * 3;
      const x = center.x;
      const y = center.y + size.y / 2;
      const z = center.z + distance;
      const cameraPosition = `${x} ${y} ${z}`;

      this._aframeCamera.setAttribute("position", cameraPosition);
    }

    _setEventListeners() {
      this._aframeScene.addEventListener("loaded", () => {
        this._aframeThreeScene.add(this._group);
      });

      this._aframeScene.addEventListener("touchstart", (event) => {
        if (event.touches.length === 1) {
          this._dragStart = {
            x: event.touches[0].pageX,
            y: event.touches[0].pageY,
          };
          this._isDragging = true;

          this._moveTimeout = setTimeout(() => {
            this._moveMode = true;
            this._showSelection();
          }, 500);
        }
        if (event.touches.length === 2) {
          clearTimeout(this._moveTimeout);
          this._isDragging = false;
          this._moveMode = false;
          this._hideSelection();

          const dx = event.touches[0].pageX - event.touches[1].pageX;
          const dy = event.touches[0].pageY - event.touches[1].pageY;
          this._pinchStartDist = Math.sqrt(dx * dx + dy * dy);
        }
      });

      this._aframeScene.addEventListener("touchmove", (event) => {
        event.preventDefault();

        if (event.touches.length === 1) {
          if (this._moveMode) {
            this._moveXZ(event);
          } else if (this._isDragging) {
            this._rotateY(event);
          }
        }

        if (event.touches.length === 2 && this._pinchStartDist !== null) {
          this._scale(event);
        }
      });

      this._aframeScene.addEventListener("touchend", (event) => {
        clearTimeout(this._moveTimeout);

        if (this._moveMode) {
          this._moveMode = false;
          this._hideSelection();
        }

        if (event.touches.length === 0) {
          this._isDragging = false;
          this._pinchStartDist = null;
        }
      });
    }

    _addSlider() {
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

      this._moveY(slider.value);

      slider.addEventListener("input", () => {
        this._moveY(slider.value);
      });
    }

    _callEnd() {
      if (this._end) {
        this._end();
        this._end = null;
      }
    }
  }

  window.Site3dAR = Site3dAR;
})();
