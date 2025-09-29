const R = THREE.Vector3;
const C = THREE.Euler;
const I = THREE.Quaternion;
const T = THREE.EventDispatcher;
const m = THREE.MathUtils;

class w {
  /**
   * Create a SphMercProjection.
   */
  constructor() {
    (this.EARTH = 4007501668e-2), (this.HALF_EARTH = 2003750834e-2);
  }
  /**
   * Project a longitude and latitude into Spherical Mercator.
   * @param {number} lon - the longitude.
   * @param {number} lat - the latitude.
   * @return {Array} Two-member array containing easting and northing.
   */
  project(e, i) {
    return [this.#t(e), this.#l(i)];
  }
  /**
   * Unproject a Spherical Mercator easting and northing.
   * @param {Array} projected - Two-member array containing easting and northing
   * @return {Array} Two-member array containing longitude and latitude
   */
  unproject(e) {
    return [this.#e(e[0]), this.#s(e[1])];
  }
  #t(e) {
    return (e / 180) * this.HALF_EARTH;
  }
  #l(e) {
    var i = Math.log(Math.tan(((90 + e) * Math.PI) / 360)) / (Math.PI / 180);
    return (i * this.HALF_EARTH) / 180;
  }
  #e(e) {
    return (e / this.HALF_EARTH) * 180;
  }
  #s(e) {
    var i = (e / this.HALF_EARTH) * 180;
    return (
      (i =
        (180 / Math.PI) *
        (2 * Math.atan(Math.exp((i * Math.PI) / 180)) - Math.PI / 2)),
      i
    );
  }
  /**
   * Return the projection's ID.
   * @return {string} The value "epsg:3857".
   */
  getID() {
    return "epsg:3857";
  }
}
class A {
  constructor() {
    this.eventHandlers = {};
  }
  /**
   * Add an event handler.
   * @param {string} eventName - the event to handle.
   * @param {Function} eventHandler - the event handler function.
   */
  on(e, i) {
    this.eventHandlers[e] = i;
  }
  /**
   * Emit an event.
   * @param {string} eventName - the event to emit.
   * @param ...params - parameters to pass to the event handler.
   */
  emit(e, ...i) {
    this.eventHandlers[e]?.call(this, ...i);
  }
}
class k extends A {
  #t;
  // eslint-disable-next-line no-unused-private-class-members
  #l;
  #e;
  #s;
  #c;
  #o;
  #i;
  #r;
  #a;
  #n;
  /**
   * @param {THREE.Scene} scene - The Three.js scene to use.
   * @param {THREE.Camera} camera - The Three.js camera to use. Should usually
   * be a THREE.PerspectiveCamera.
   * @param {Object} options - Initialisation options for the GPS; see
   * setGpsOptions() below.
   * @param {Object} serverLogger - an object which can optionally log GPS position to a server for debugging. null by default, so no logging will be done. This object should implement a sendData() method to send data (2nd arg) to a given endpoint (1st arg). Please see source code for details. Ensure you comply with privacy laws (GDPR or equivalent) if implementing this.
   */
  constructor(e, i, t = {}, c = null) {
    super(),
      (this.scene = e),
      (this.camera = i),
      (this.#t = new w()),
      (this.#e = null),
      (this.#s = 0),
      (this.#c = 100),
      (this.#o = null),
      this.setGpsOptions(t),
      (this.#i = null),
      (this.#r = 0),
      (this.#a = 0),
      (this.#n = c);
  }
  /**
   * Set the projection to use.
   * @param {Object} any object which includes a project() method
   * taking longitude and latitude as arguments and returning an array
   * containing easting and northing.
   */
  setProjection(e) {
    this.#t = e;
  }
  /**
   * Set the GPS options.
   * @param {Object} object containing gpsMinDistance and/or gpsMinAccuracy
   * properties. The former specifies the number of metres which the device
   * must move to process a new GPS reading, and the latter specifies the
   * minimum accuracy, in metres, for a GPS reading to be counted.
   */
  setGpsOptions(e = {}) {
    e.gpsMinDistance !== void 0 && (this.#s = e.gpsMinDistance),
      e.gpsMinAccuracy !== void 0 && (this.#c = e.gpsMinAccuracy);
  }
  /**
   * Start the GPS on a real device
   * @return {boolean} code indicating whether the GPS was started successfully.
   * GPS errors can be handled by handling the gpserror event.
   */
  async startGps() {
    if (this.#n) {
      const i = await (
        await this.#n.sendData("/gps/start", {
          gpsMinDistance: this.#s,
          gpsMinAccuracy: this.#c,
        })
      ).json();
      this.#a = i.session;
    }
    return this.#o === null
      ? ((this.#o = navigator.geolocation.watchPosition(
          (e) => {
            this.#h(e);
          },
          (e) => {
            this.emit("gpserror", e);
          },
          {
            enableHighAccuracy: !0,
          }
        )),
        !0)
      : !1;
  }
  /**
   * Stop the GPS on a real device
   * @return {boolean} true if the GPS was stopped, false if it could not be
   * stopped (i.e. it was never started).
   */
  stopGps() {
    return this.#o !== null
      ? (navigator.geolocation.clearWatch(this.#o), (this.#o = null), !0)
      : !1;
  }
  /**
   * Send a fake GPS signal. Useful for testing on a desktop or laptop.
   * @param {number} lon - The longitude.
   * @param {number} lat - The latitude.
   * @param {number} elev - The elevation in metres. (optional, set to null
   * for no elevation).
   * @param {number} acc - The accuracy of the GPS reading in metres. May be
   * ignored if lower than the specified minimum accuracy.
   */
  fakeGps(e, i, t = null, c = 0) {
    t !== null && this.setElevation(t),
      this.#h({
        coords: {
          longitude: e,
          latitude: i,
          accuracy: c,
        },
      });
  }
  /**
   * Convert longitude and latitude to three.js/WebGL world coordinates.
   * Uses the specified projection, and negates the northing (in typical
   * projections, northings increase northwards, but in the WebGL coordinate
   * system, we face negative z if the camera is at the origin with default
   * rotation).
   * Must not be called until an initial position is determined.
   * @param {number} lon - The longitude.
   * @param {number} lat - The latitude.
   * @return {Array} a two member array containing the WebGL x and z coordinates
   */
  lonLatToWorldCoords(e, i) {
    const t = this.#t.project(e, i);
    if (this.#i) (t[0] -= this.#i[0]), (t[1] -= this.#i[1]);
    else throw "No initial position determined";
    return [t[0], -t[1]];
  }
  /**
   * Add a new AR object at a given latitude, longitude and elevation.
   * @param {THREE.Mesh} object the object
   * @param {number} lon - the longitude.
   * @param {number} lat - the latitude.
   * @param {number} elev - the elevation in metres
   * (if not specified, 0 is assigned)
   * @param {Object} properties - properties describing the object (for example,
   * the contents of the GeoJSON properties field).
   */
  add(e, i, t, c, h = {}) {
    (e.properties = h),
      this.#d(e, i, t, c),
      this.scene.add(e),
      this.#n?.sendData("/object/new", {
        position: e.position,
        x: e.position.x,
        z: e.position.z,
        session: this.#a,
        properties: h,
      });
  }
  #d(e, i, t, c) {
    const h = this.lonLatToWorldCoords(i, t);
    c !== void 0 && (e.position.y = c), ([e.position.x, e.position.z] = h);
  }
  /**
   * Set the elevation (y coordinate) of the camera.
   * @param {number} elev - the elevation in metres.
   */
  setElevation(e) {
    this.camera.position.y = e;
  }
  #u(e, i) {
    this.#i = this.#t.project(e, i);
  }
  #h(e) {
    let i = Number.MAX_VALUE;
    this.#r++,
      this.#n?.sendData("/gps/new", {
        gpsCount: this.#r,
        lat: e.coords.latitude,
        lon: e.coords.longitude,
        acc: e.coords.accuracy,
        session: this.#a,
      }),
      e.coords.accuracy <= this.#c &&
        (this.#e === null
          ? (this.#e = {
              latitude: e.coords.latitude,
              longitude: e.coords.longitude,
            })
          : (i = this.#m(this.#e, e.coords)),
        i >= this.#s &&
          ((this.#e.longitude = e.coords.longitude),
          (this.#e.latitude = e.coords.latitude),
          this.#i ||
            (this.#u(e.coords.longitude, e.coords.latitude),
            this.#n?.sendData("/worldorigin/new", {
              gpsCount: this.#r,
              lat: e.coords.latitude,
              lon: e.coords.longitude,
              session: this.#a,
              initialPosition: this.#i,
            })),
          this.#d(this.camera, e.coords.longitude, e.coords.latitude),
          this.#n?.sendData("/gps/accepted", {
            gpsCount: this.#r,
            cameraX: this.camera.position.x,
            cameraZ: this.camera.position.z,
            session: this.#a,
            distMoved: i,
          }),
          this.emit("gpsupdate", { position: e, distMoved: i })));
  }
  /**
   * Calculate haversine distance between two lat/lon pairs.
   *
   * Taken from original A-Frame AR.js location-based components
   */
  #m(e, i) {
    const t = g.MathUtils.degToRad(i.longitude - e.longitude),
      c = g.MathUtils.degToRad(i.latitude - e.latitude),
      h =
        Math.sin(c / 2) * Math.sin(c / 2) +
        Math.cos(g.MathUtils.degToRad(e.latitude)) *
          Math.cos(g.MathUtils.degToRad(i.latitude)) *
          (Math.sin(t / 2) * Math.sin(t / 2));
    return 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 6371e3;
  }
}
class W extends A {
  #t;
  /**
   * Create a Webcam.
   * @param constraints {Object} - options to use for initialising the camera.
   * This is the same constraints object as used by standard MediaDevices API.
   * @param {string} videoElementSelector - selector to obtain the HTML video
   * element to render the webcam feed. If a falsy value (e.g. null or
   * undefined), a video element will be created.
   */
  constructor(e = { video: { facingMode: "environment" } }, i) {
    super(),
      (this.sceneWebcam = new g.Scene()),
      i
        ? (this.#t = document.querySelector(i))
        : ((this.#t = document.createElement("video")),
          this.#t.setAttribute("autoplay", !0),
          this.#t.setAttribute("playsinline", !0),
          (this.#t.style.display = "none"),
          document.body.appendChild(this.#t)),
      (this.texture = new g.VideoTexture(this.#t)),
      navigator.mediaDevices && navigator.mediaDevices.getUserMedia
        ? navigator.mediaDevices
            .getUserMedia(e)
            .then((t) => {
              this.#t.addEventListener("loadedmetadata", () => {
                this.#t.setAttribute("width", this.#t.videoWidth),
                  this.#t.setAttribute("height", this.#t.videoHeight),
                  this.#t.play(),
                  this.emit("webcamstarted", { texture: this.texture });
              }),
                (this.#t.srcObject = t);
            })
            .catch((t) => {
              this.emit("webcamerror", {
                code: t.name,
                message: t.message,
              });
            })
        : this.emit("webcamerror", {
            code: "LOCAR_NO_MEDIA_DEVICES_API",
            message: "Media devices API not supported",
          });
  }
  /**
   * Free up the memory associated with the webcam.
   * Should be called when your application closes.
   */
  dispose() {
    this.texture.dispose();
  }
}
const b = "locar-device-orientation-permission-modal",
  D = "locar-device-orientation-permission-button",
  S = "locar-device-orientation-permission-message",
  N = "locar-device-orientation-permission-inner",
  L = "locar-device-orientation-permission-button-inner",
  P = "This immersive website requires access to your device motion sensors.",
  O =
    navigator.userAgent.match(/iPhone|iPad|iPod/i) ||
    (/Macintosh/i.test(navigator.userAgent) &&
      navigator.maxTouchPoints != null &&
      navigator.maxTouchPoints > 1),
  x = new R(0, 0, 1),
  y = new C(),
  H = new I(),
  F = new I(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
class V extends T {
  /**
   * Create an instance of DeviceOrientationControls.
   * @param {Object} object - the object to attach the controls to
   * (usually your Three.js camera)
   * @param {Object} options - options for DeviceOrientationControls: currently accepts smoothingFactor, enablePermissionDialog
   */
  constructor(e, i = {}) {
    super(), (this.eventEmitter = new A());
    const t = this;
    (this.object = e),
      this.object.rotation.reorder("YXZ"),
      (this.enabled = !0),
      (this.deviceOrientation = null),
      (this.screenOrientation = 0),
      (this.alphaOffset = 0),
      (this.orientationOffset = 0),
      (this.initialOffset = null),
      (this.lastCompassY = void 0),
      (this.lastOrientation = null),
      (this.TWO_PI = 2 * Math.PI),
      (this.HALF_PI = 0.5 * Math.PI),
      (this.orientationChangeEventName =
        "ondeviceorientationabsolute" in window
          ? "deviceorientationabsolute"
          : "deviceorientation"),
      (this.smoothingFactor = i.smoothingFactor || 1),
      (this.enablePermissionDialog = i.enablePermissionDialog ?? !0),
      (this.enableInlineStyling = i.enableStyling ?? !0),
      (this.preferConfirmDialog = i.preferConfirmDialog ?? !1);
    const c = function ({
        alpha: n,
        beta: s,
        gamma: a,
        webkitCompassHeading: r,
      }) {
        if (O) {
          const o = 360 - r;
          (t.alphaOffset = m.degToRad(o - n)),
            (t.deviceOrientation = {
              alpha: n,
              beta: s,
              gamma: a,
              webkitCompassHeading: r,
            });
        } else
          n < 0 && (n += 360),
            (t.deviceOrientation = { alpha: n, beta: s, gamma: a });
        window.dispatchEvent(
          new CustomEvent("camera-rotation-change", {
            detail: { cameraRotation: e.rotation },
          })
        );
      },
      h = function () {
        (t.screenOrientation = window.orientation || 0),
          O &&
            (t.screenOrientation === 90
              ? (t.orientationOffset = -t.HALF_PI)
              : t.screenOrientation === -90
              ? (t.orientationOffset = t.HALF_PI)
              : (t.orientationOffset = 0));
      },
      E = function (n, s, a, r, o) {
        y.set(a, s, -r, "YXZ"),
          n.setFromEuler(y),
          n.multiply(F),
          n.multiply(H.setFromAxisAngle(x, -o));
      };
    (this.connect = function () {
      h(),
        window.addEventListener("orientationchange", h),
        window.addEventListener(t.orientationChangeEventName, c),
        (t.enabled = !0);
    }),
      (this.disconnect = function () {
        window.removeEventListener("orientationchange", h),
          window.removeEventListener(t.orientationChangeEventName, c),
          (t.enabled = !1),
          (t.initialOffset = !1),
          (t.deviceOrientation = null);
      }),
      (this.requestOrientationPermissions = function () {
        window.DeviceOrientationEvent !== void 0 &&
        typeof window.DeviceOrientationEvent.requestPermission == "function"
          ? window.DeviceOrientationEvent.requestPermission()
              .then((n) => {
                n === "granted"
                  ? this.eventEmitter.emit("deviceorientationgranted", {
                      target: this,
                    })
                  : this.eventEmitter.emit("deviceorientationerror", {
                      code: "LOCAR_DEVICE_ORIENTATION_PERMISSION_DENIED",
                      message:
                        "Permission for device orientation denied - AR will not work correctly",
                    });
              })
              .catch(function (n) {
                this.eventEmitter.emit("deviceorientationerror", {
                  code: "LOCAR_DEVICE_ORIENTATION_PERMISSION_FAILED",
                  message:
                    "Permission request for device orientation failed - AR will not work correctly",
                  error: JSON.stringify(n, null, 2),
                });
              })
          : this.eventEmitter.emit("deviceorientationerror", {
              code: "LOCAR_DEVICE_ORIENTATION_INTERNAL_ERROR",
              message:
                "Internal error: no requestPermission() found although requestOrientationPermissions() was called - please raise an issue on GitHub",
            });
      }),
      (this.update = function ({ theta: n = 0 } = { theta: 0 }) {
        if (t.enabled === !1) return;
        const s = t.deviceOrientation;
        if (s) {
          let a = s.alpha ? m.degToRad(s.alpha) + t.alphaOffset : 0,
            r = s.beta ? m.degToRad(s.beta) : 0,
            o = s.gamma ? m.degToRad(s.gamma) : 0;
          const f = t.screenOrientation ? m.degToRad(t.screenOrientation) : 0;
          if (t.smoothingFactor < 1) {
            if (t.lastOrientation) {
              const d = t.smoothingFactor;
              (a = t._getSmoothedAngle(a, t.lastOrientation.alpha, d)),
                (r = t._getSmoothedAngle(
                  r + Math.PI,
                  t.lastOrientation.beta,
                  d
                )),
                (o = t._getSmoothedAngle(
                  o + t.HALF_PI,
                  t.lastOrientation.gamma,
                  d,
                  Math.PI
                ));
            } else (r += Math.PI), (o += t.HALF_PI);
            t.lastOrientation = {
              alpha: a,
              beta: r,
              gamma: o,
            };
          }
          if (O) {
            const d = new I();
            E(
              d,
              a,
              t.smoothingFactor < 1 ? r - Math.PI : r,
              t.smoothingFactor < 1 ? o - Math.PI / 2 : o,
              f
            );
            const u = new C().setFromQuaternion(d, "YXZ");
            let p = m.degToRad(360 - s.webkitCompassHeading);
            t.smoothingFactor < 1 &&
              t.lastCompassY !== void 0 &&
              (p = t._getSmoothedAngle(p, t.lastCompassY, t.smoothingFactor)),
              (t.lastCompassY = p),
              (u.y = p + (t.orientationOffset || 0)),
              d.setFromEuler(u),
              t.object.quaternion.copy(d);
          } else
            E(
              t.object.quaternion,
              O ? a + t.alphaOffset : a,
              t.smoothingFactor < 1 ? r - Math.PI : r,
              t.smoothingFactor < 1 ? o - Math.PI / 2 : o,
              f
            );
        }
      }),
      (this.getCorrectedHeading = function () {
        const { deviceOrientation: n } = t;
        if (!n) return 0;
        let s = 0;
        return (
          O
            ? ((s = 360 - n.webkitCompassHeading),
              t.orientationOffset &&
                ((s += t.orientationOffset * (180 / Math.PI)),
                (s = (s + 360) % 360)))
            : (n.absolute === !0 || t.orientationChangeEventName,
              (s = n.alpha ? n.alpha : 0),
              (s = (360 - s) % 360),
              s < 0 && (s += 360)),
          s
        );
      }),
      (this._orderAngle = function (n, s, a = t.TWO_PI) {
        return (s > n && Math.abs(s - n) < a / 2) ||
          (n > s && Math.abs(s - n) > a / 2)
          ? { left: n, right: s }
          : { left: s, right: n };
      }),
      (this._getSmoothedAngle = function (n, s, a, r = t.TWO_PI) {
        const o = t._orderAngle(n, s, r),
          f = o.left,
          d = o.right;
        (o.left = 0), (o.right -= f), o.right < 0 && (o.right += r);
        let u =
          d == s
            ? (1 - a) * o.right + a * o.left
            : a * o.right + (1 - a) * o.left;
        return (u += f), u >= r && (u -= r), u;
      }),
      (this.updateAlphaOffset = function () {
        t.initialOffset = !1;
      }),
      (this.dispose = function () {
        t.disconnect();
      }),
      (this.getAlpha = function () {
        const { deviceOrientation: n } = t;
        return n && n.alpha ? m.degToRad(n.alpha) + t.alphaOffset : 0;
      }),
      (this.getBeta = function () {
        const { deviceOrientation: n } = t;
        return n && n.beta ? m.degToRad(n.beta) : 0;
      }),
      (this.getGamma = function () {
        const { deviceOrientation: n } = t;
        return n && n.gamma ? m.degToRad(n.gamma) : 0;
      }),
      (this.createObtainPermissionGestureDialog = function () {
        const n = document.createElement("div");
        n.classList.add(b);
        const s = document.createElement("div");
        s.classList.add(N);
        const a = document.createElement("div");
        a.classList.add(S);
        const r = document.createElement("div");
        r.classList.add(L);
        const o = document.createElement("button");
        if (
          (o.classList.add(D),
          document.body.appendChild(n),
          this.enableInlineStyling === !0)
        ) {
          const d = {
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
              display: "flex",
              position: "fixed",
              zIndex: 1e5,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.2)",
              inset: 0,
              padding: "20px",
            },
            u = {
              backgroundColor: "rgba(220, 220, 220, 0.85)",
              padding: "6px 0",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "400px",
            },
            p = {
              padding: "10px 12px",
              textAlign: "center",
              fontWeight: 400,
              fontSize: "13px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            },
            M = {
              display: "block",
              textAlign: "center",
              textDecoration: "none",
              borderTop: "rgb(180,180,180) solid 1px",
            },
            _ = {
              display: "block",
              width: "100%",
              textAlign: "center",
              appearance: "none",
              background: "none",
              border: "none",
              outline: "none",
              padding: "10px",
              fontWeight: 400,
              fontSize: "16px",
              color: "#2e7cf1",
              cursor: "pointer",
            };
          for (let l in d) n.style[l] = d[l];
          for (let l in u) s.style[l] = u[l];
          for (let l in p) a.style[l] = p[l];
          for (let l in M) r.style[l] = M[l];
          for (let l in _) o.style[l] = _[l];
        }
        n.appendChild(s),
          s.appendChild(a),
          s.appendChild(r),
          a.appendChild(document.createTextNode(P));
        const f = () => {
          this.requestOrientationPermissions(), (n.style.display = "none");
        };
        o.addEventListener("click", f),
          o.appendChild(document.createTextNode("OK")),
          r.appendChild(o),
          document.body.appendChild(n);
      }),
      (this.obtainPermissionGesture = function () {
        this.preferConfirmDialog === !0
          ? window.confirm(P) && this.requestOrientationPermissions()
          : this.createObtainPermissionGestureDialog();
      });
  }
  on(e, i) {
    this.eventEmitter.on(e, i);
  }
  /**
   * Initialise device orientation controls.
   * Should be called after you have created the DeviceOrientationControls
   * object and set up the deviceorientationgranted and deviceorientationerror
   * event handlers.
   */
  init() {
    window.DeviceOrientationEvent === void 0
      ? this.eventEmitter.emit("deviceorientationerror", {
          code: "LOCAR_DEVICE_ORIENTATION_NOT_SUPPORTED",
          message: "Device orientation API not supported",
        })
      : window.isSecureContext === !1
      ? this.eventEmitter.emit("deviceorientationerror", {
          code: "LOCAR_DEVICE_ORIENTATION_NO_HTTPS",
          message:
            "DeviceOrientationEvent is only available in secure contexts (https)",
        })
      : typeof window.DeviceOrientationEvent.requestPermission == "function" &&
        this.enablePermissionDialog
      ? this.obtainPermissionGesture()
      : this.eventEmitter.emit("deviceorientationgranted", { target: this });
  }
}
class j {
  /**
   * Create a ClickHandler.
   * @param {THREE.WebGLRenderer} - The Three.js renderer on which the click
   * events will be handled.
   */
  constructor(e) {
    (this.raycaster = new g.Raycaster()),
      (this.normalisedMousePosition = new g.Vector2(null, null)),
      e.domElement.addEventListener("click", (i) => {
        this.normalisedMousePosition.set(
          (i.clientX / e.domElement.clientWidth) * 2 - 1,
          -((i.clientY / e.domElement.clientHeight) * 2) + 1
        );
      });
  }
  /**
   * Cast a ray into the scene to detect objects.
   * @param {THREE.Camera} - The active Three.js camera, from which the ray
   * will be cast.
   * @param {THREE.Scene} - The active Three.js scene, which the ray will be
   * cast into.
   * @return {Array} - array of all intersected objects.
   */
  raycast(e, i) {
    if (
      this.normalisedMousePosition.x !== null &&
      this.normalisedMousePosition.y !== null
    ) {
      this.raycaster.setFromCamera(this.normalisedMousePosition, e);
      const t = this.raycaster.intersectObjects(i.children, !1);
      return this.normalisedMousePosition.set(null, null), t;
    }
    return [];
  }
}
const U = "0.1.0";
export {
  j as ClickHandler,
  V as DeviceOrientationControls,
  A as EventEmitter,
  k as LocationBased,
  w as SphMercProjection,
  W as Webcam,
  U as version,
};
