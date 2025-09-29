(function (h, c) {
  typeof exports == "object" && typeof module < "u"
    ? c(exports, require("three"))
    : typeof define == "function" && define.amd
    ? define(["exports", "three"], c)
    : ((h = typeof globalThis < "u" ? globalThis : h || self),
      c((h.locar = {}), THREE));
})(this, function (h, c) {
  "use strict";
  function b(m) {
    const t = Object.create(null, {
      [Symbol.toStringTag]: { value: "Module" },
    });
    if (m) {
      for (const i in m)
        if (i !== "default") {
          const e = Object.getOwnPropertyDescriptor(m, i);
          Object.defineProperty(
            t,
            i,
            e.get ? e : { enumerable: !0, get: () => m[i] }
          );
        }
    }
    return (t.default = m), Object.freeze(t);
  }
  const p = b(c);
  class A {
    constructor() {
      (this.EARTH = 4007501668e-2), (this.HALF_EARTH = 2003750834e-2);
    }
    project(t, i) {
      return [this.#t(t), this.#l(i)];
    }
    unproject(t) {
      return [this.#e(t[0]), this.#s(t[1])];
    }
    #t(t) {
      return (t / 180) * this.HALF_EARTH;
    }
    #l(t) {
      var i = Math.log(Math.tan(((90 + t) * Math.PI) / 360)) / (Math.PI / 180);
      return (i * this.HALF_EARTH) / 180;
    }
    #e(t) {
      return (t / this.HALF_EARTH) * 180;
    }
    #s(t) {
      var i = (t / this.HALF_EARTH) * 180;
      return (
        (i =
          (180 / Math.PI) *
          (2 * Math.atan(Math.exp((i * Math.PI) / 180)) - Math.PI / 2)),
        i
      );
    }
    getID() {
      return "epsg:3857";
    }
  }
  class M {
    constructor() {
      this.eventHandlers = {};
    }
    on(t, i) {
      this.eventHandlers[t] = i;
    }
    emit(t, ...i) {
      this.eventHandlers[t]?.call(this, ...i);
    }
  }
  class w extends M {
    #t;
    #l;
    #e;
    #s;
    #c;
    #o;
    #i;
    #r;
    #a;
    #n;
    constructor(t, i, e = {}, l = null) {
      super(),
        (this.scene = t),
        (this.camera = i),
        (this.#t = new A()),
        (this.#e = null),
        (this.#s = 0),
        (this.#c = 100),
        (this.#o = null),
        this.setGpsOptions(e),
        (this.#i = null),
        (this.#r = 0),
        (this.#a = 0),
        (this.#n = l);
    }
    setProjection(t) {
      this.#t = t;
    }
    setGpsOptions(t = {}) {
      t.gpsMinDistance !== void 0 && (this.#s = t.gpsMinDistance),
        t.gpsMinAccuracy !== void 0 && (this.#c = t.gpsMinAccuracy);
    }
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
            (t) => {
              this.#h(t);
            },
            (t) => {
              this.emit("gpserror", t);
            },
            { enableHighAccuracy: !0 }
          )),
          !0)
        : !1;
    }
    stopGps() {
      return this.#o !== null
        ? (navigator.geolocation.clearWatch(this.#o), (this.#o = null), !0)
        : !1;
    }
    fakeGps(t, i, e = null, l = 0) {
      e !== null && this.setElevation(e),
        this.#h({ coords: { longitude: t, latitude: i, accuracy: l } });
    }
    lonLatToWorldCoords(t, i) {
      const e = this.#t.project(t, i);
      if (this.#i) (e[0] -= this.#i[0]), (e[1] -= this.#i[1]);
      else throw "No initial position determined";
      return [e[0], -e[1]];
    }
    add(t, i, e, l, g = {}) {
      (t.properties = g),
        this.#d(t, i, e, l),
        this.scene.add(t),
        this.#n?.sendData("/object/new", {
          position: t.position,
          x: t.position.x,
          z: t.position.z,
          session: this.#a,
          properties: g,
        });
    }
    #d(t, i, e, l) {
      const g = this.lonLatToWorldCoords(i, e);
      l !== void 0 && (t.position.y = l), ([t.position.x, t.position.z] = g);
    }
    setElevation(t) {
      this.camera.position.y = t;
    }
    #u(t, i) {
      this.#i = this.#t.project(t, i);
    }
    #h(t) {
      let i = Number.MAX_VALUE;
      this.#r++,
        this.#n?.sendData("/gps/new", {
          gpsCount: this.#r,
          lat: t.coords.latitude,
          lon: t.coords.longitude,
          acc: t.coords.accuracy,
          session: this.#a,
        }),
        t.coords.accuracy <= this.#c &&
          (this.#e === null
            ? (this.#e = {
                latitude: t.coords.latitude,
                longitude: t.coords.longitude,
              })
            : (i = this.#m(this.#e, t.coords)),
          i >= this.#s &&
            ((this.#e.longitude = t.coords.longitude),
            (this.#e.latitude = t.coords.latitude),
            this.#i ||
              (this.#u(t.coords.longitude, t.coords.latitude),
              this.#n?.sendData("/worldorigin/new", {
                gpsCount: this.#r,
                lat: t.coords.latitude,
                lon: t.coords.longitude,
                session: this.#a,
                initialPosition: this.#i,
              })),
            this.#d(this.camera, t.coords.longitude, t.coords.latitude),
            this.#n?.sendData("/gps/accepted", {
              gpsCount: this.#r,
              cameraX: this.camera.position.x,
              cameraZ: this.camera.position.z,
              session: this.#a,
              distMoved: i,
            }),
            this.emit("gpsupdate", { position: t, distMoved: i })));
    }
    #m(t, i) {
      const e = p.MathUtils.degToRad(i.longitude - t.longitude),
        l = p.MathUtils.degToRad(i.latitude - t.latitude),
        g =
          Math.sin(l / 2) * Math.sin(l / 2) +
          Math.cos(p.MathUtils.degToRad(t.latitude)) *
            Math.cos(p.MathUtils.degToRad(i.latitude)) *
            (Math.sin(e / 2) * Math.sin(e / 2));
      return 2 * Math.atan2(Math.sqrt(g), Math.sqrt(1 - g)) * 6371e3;
    }
  }
  class D extends M {
    #t;
    constructor(t = { video: { facingMode: "environment" } }, i) {
      super(),
        (this.sceneWebcam = new p.Scene()),
        i
          ? (this.#t = document.querySelector(i))
          : ((this.#t = document.createElement("video")),
            this.#t.setAttribute("autoplay", !0),
            this.#t.setAttribute("playsinline", !0),
            (this.#t.style.display = "none"),
            document.body.appendChild(this.#t)),
        (this.texture = new p.VideoTexture(this.#t)),
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia
          ? navigator.mediaDevices
              .getUserMedia(t)
              .then((e) => {
                this.#t.addEventListener("loadedmetadata", () => {
                  this.#t.setAttribute("width", this.#t.videoWidth),
                    this.#t.setAttribute("height", this.#t.videoHeight),
                    this.#t.play(),
                    this.emit("webcamstarted", { texture: this.texture });
                }),
                  (this.#t.srcObject = e);
              })
              .catch((e) => {
                this.emit("webcamerror", { code: e.name, message: e.message });
              })
          : this.emit("webcamerror", {
              code: "LOCAR_NO_MEDIA_DEVICES_API",
              message: "Media devices API not supported",
            });
    }
    dispose() {
      this.texture.dispose();
    }
  }
  const S = "locar-device-orientation-permission-modal",
    T = "locar-device-orientation-permission-button",
    N = "locar-device-orientation-permission-message",
    R = "locar-device-orientation-permission-inner",
    L = "locar-device-orientation-permission-button-inner",
    P = "This immersive website requires access to your device motion sensors.",
    I =
      navigator.userAgent.match(/iPhone|iPad|iPod/i) ||
      (/Macintosh/i.test(navigator.userAgent) &&
        navigator.maxTouchPoints != null &&
        navigator.maxTouchPoints > 1),
    x = new c.Vector3(0, 0, 1),
    _ = new c.Euler(),
    F = new c.Quaternion(),
    U = new c.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
  class j extends c.EventDispatcher {
    constructor(t, i = {}) {
      super(), (this.eventEmitter = new M());
      const e = this;
      (this.object = t),
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
      const l = function ({
          alpha: n,
          beta: s,
          gamma: a,
          webkitCompassHeading: r,
        }) {
          if (I) {
            const o = 360 - r;
            (e.alphaOffset = c.MathUtils.degToRad(o - n)),
              (e.deviceOrientation = {
                alpha: n,
                beta: s,
                gamma: a,
                webkitCompassHeading: r,
              });
          } else
            n < 0 && (n += 360),
              (e.deviceOrientation = { alpha: n, beta: s, gamma: a });
          window.dispatchEvent(
            new CustomEvent("camera-rotation-change", {
              detail: { cameraRotation: t.rotation },
            })
          );
        },
        g = function () {
          (e.screenOrientation = window.orientation || 0),
            I &&
              (e.screenOrientation === 90
                ? (e.orientationOffset = -e.HALF_PI)
                : e.screenOrientation === -90
                ? (e.orientationOffset = e.HALF_PI)
                : (e.orientationOffset = 0));
        },
        E = function (n, s, a, r, o) {
          _.set(a, s, -r, "YXZ"),
            n.setFromEuler(_),
            n.multiply(U),
            n.multiply(F.setFromAxisAngle(x, -o));
        };
      (this.connect = function () {
        g(),
          window.addEventListener("orientationchange", g),
          window.addEventListener(e.orientationChangeEventName, l),
          (e.enabled = !0);
      }),
        (this.disconnect = function () {
          window.removeEventListener("orientationchange", g),
            window.removeEventListener(e.orientationChangeEventName, l),
            (e.enabled = !1),
            (e.initialOffset = !1),
            (e.deviceOrientation = null);
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
          if (e.enabled === !1) return;
          const s = e.deviceOrientation;
          if (s) {
            let a = s.alpha ? c.MathUtils.degToRad(s.alpha) + e.alphaOffset : 0,
              r = s.beta ? c.MathUtils.degToRad(s.beta) : 0,
              o = s.gamma ? c.MathUtils.degToRad(s.gamma) : 0;
            const v = e.screenOrientation
              ? c.MathUtils.degToRad(e.screenOrientation)
              : 0;
            if (e.smoothingFactor < 1) {
              if (e.lastOrientation) {
                const u = e.smoothingFactor;
                (a = e._getSmoothedAngle(a, e.lastOrientation.alpha, u)),
                  (r = e._getSmoothedAngle(
                    r + Math.PI,
                    e.lastOrientation.beta,
                    u
                  )),
                  (o = e._getSmoothedAngle(
                    o + e.HALF_PI,
                    e.lastOrientation.gamma,
                    u,
                    Math.PI
                  ));
              } else (r += Math.PI), (o += e.HALF_PI);
              e.lastOrientation = { alpha: a, beta: r, gamma: o };
            }
            if (I) {
              const u = new c.Quaternion();
              E(
                u,
                a,
                e.smoothingFactor < 1 ? r - Math.PI : r,
                e.smoothingFactor < 1 ? o - Math.PI / 2 : o,
                v
              );
              const f = new c.Euler().setFromQuaternion(u, "YXZ");
              let O = c.MathUtils.degToRad(360 - s.webkitCompassHeading);
              e.smoothingFactor < 1 &&
                e.lastCompassY !== void 0 &&
                (O = e._getSmoothedAngle(O, e.lastCompassY, e.smoothingFactor)),
                (e.lastCompassY = O),
                (f.y = O + (e.orientationOffset || 0)),
                u.setFromEuler(f),
                e.object.quaternion.copy(u);
            } else
              E(
                e.object.quaternion,
                I ? a + e.alphaOffset : a,
                e.smoothingFactor < 1 ? r - Math.PI : r,
                e.smoothingFactor < 1 ? o - Math.PI / 2 : o,
                v
              );
          }
        }),
        (this.getCorrectedHeading = function () {
          const { deviceOrientation: n } = e;
          if (!n) return 0;
          let s = 0;
          return (
            I
              ? ((s = 360 - n.webkitCompassHeading),
                e.orientationOffset &&
                  ((s += e.orientationOffset * (180 / Math.PI)),
                  (s = (s + 360) % 360)))
              : (n.absolute === !0 || e.orientationChangeEventName,
                (s = n.alpha ? n.alpha : 0),
                (s = (360 - s) % 360),
                s < 0 && (s += 360)),
            s
          );
        }),
        (this._orderAngle = function (n, s, a = e.TWO_PI) {
          return (s > n && Math.abs(s - n) < a / 2) ||
            (n > s && Math.abs(s - n) > a / 2)
            ? { left: n, right: s }
            : { left: s, right: n };
        }),
        (this._getSmoothedAngle = function (n, s, a, r = e.TWO_PI) {
          const o = e._orderAngle(n, s, r),
            v = o.left,
            u = o.right;
          (o.left = 0), (o.right -= v), o.right < 0 && (o.right += r);
          let f =
            u == s
              ? (1 - a) * o.right + a * o.left
              : a * o.right + (1 - a) * o.left;
          return (f += v), f >= r && (f -= r), f;
        }),
        (this.updateAlphaOffset = function () {
          e.initialOffset = !1;
        }),
        (this.dispose = function () {
          e.disconnect();
        }),
        (this.getAlpha = function () {
          const { deviceOrientation: n } = e;
          return n && n.alpha
            ? c.MathUtils.degToRad(n.alpha) + e.alphaOffset
            : 0;
        }),
        (this.getBeta = function () {
          const { deviceOrientation: n } = e;
          return n && n.beta ? c.MathUtils.degToRad(n.beta) : 0;
        }),
        (this.getGamma = function () {
          const { deviceOrientation: n } = e;
          return n && n.gamma ? c.MathUtils.degToRad(n.gamma) : 0;
        }),
        (this.createObtainPermissionGestureDialog = function () {
          const n = document.createElement("div");
          n.classList.add(S);
          const s = document.createElement("div");
          s.classList.add(R);
          const a = document.createElement("div");
          a.classList.add(N);
          const r = document.createElement("div");
          r.classList.add(L);
          const o = document.createElement("button");
          if (
            (o.classList.add(T),
            document.body.appendChild(n),
            this.enableInlineStyling === !0)
          ) {
            const u = {
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
              f = {
                backgroundColor: "rgba(220, 220, 220, 0.85)",
                padding: "6px 0",
                borderRadius: "10px",
                width: "100%",
                maxWidth: "400px",
              },
              O = {
                padding: "10px 12px",
                textAlign: "center",
                fontWeight: 400,
                fontSize: "13px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              },
              y = {
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                borderTop: "rgb(180,180,180) solid 1px",
              },
              C = {
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
            for (let d in u) n.style[d] = u[d];
            for (let d in f) s.style[d] = f[d];
            for (let d in O) a.style[d] = O[d];
            for (let d in y) r.style[d] = y[d];
            for (let d in C) o.style[d] = C[d];
          }
          n.appendChild(s),
            s.appendChild(a),
            s.appendChild(r),
            a.appendChild(document.createTextNode(P));
          const v = () => {
            this.requestOrientationPermissions(), (n.style.display = "none");
          };
          o.addEventListener("click", v),
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
    on(t, i) {
      this.eventEmitter.on(t, i);
    }
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
        : typeof window.DeviceOrientationEvent.requestPermission ==
            "function" && this.enablePermissionDialog
        ? this.obtainPermissionGesture()
        : this.eventEmitter.emit("deviceorientationgranted", { target: this });
    }
  }
  class q {
    constructor(t) {
      (this.raycaster = new p.Raycaster()),
        (this.normalisedMousePosition = new p.Vector2(null, null)),
        t.domElement.addEventListener("click", (i) => {
          this.normalisedMousePosition.set(
            (i.clientX / t.domElement.clientWidth) * 2 - 1,
            -((i.clientY / t.domElement.clientHeight) * 2) + 1
          );
        });
    }
    raycast(t, i) {
      if (
        this.normalisedMousePosition.x !== null &&
        this.normalisedMousePosition.y !== null
      ) {
        this.raycaster.setFromCamera(this.normalisedMousePosition, t);
        const e = this.raycaster.intersectObjects(i.children, !1);
        return this.normalisedMousePosition.set(null, null), e;
      }
      return [];
    }
  }
  const k = "0.1.0";
  (h.ClickHandler = q),
    (h.DeviceOrientationControls = j),
    (h.EventEmitter = M),
    (h.LocationBased = w),
    (h.SphMercProjection = A),
    (h.Webcam = D),
    (h.version = k),
    Object.defineProperty(h, Symbol.toStringTag, { value: "Module" });
});
