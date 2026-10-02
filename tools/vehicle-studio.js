var vehicleNames = {
  truck: "Summit Trail X",
  car: "Apex GT",
  semi: "Road King 860"
};

var vehiclePrices = { truck: 42800, car: 48500, semi: 154000 };
var paintNames = {
  "#d9e0e5": "Glacier white",
  "#8f9ba5": "Silverstone",
  "#18212c": "Obsidian",
  "#215da8": "Electric blue",
  "#167653": "Racing green",
  "#bd2938": "Signal red",
  "#e9b52e": "Track yellow",
  "#cb623b": "Copper flare"
};
var materialNames = { leather: "Leather", alcantara: "Alcantara", fabric: "Woven fabric" };
var materialPrices = { leather: 0, alcantara: 1600, fabric: -500 };
var spoilerNames = { none: "No spoiler", lip: "Street lip", wing: "Track wing" };
var spoilerPrices = { none: 0, lip: 450, wing: 1800 };
var upgradeNames = {
  forged: "Forged wheel package",
  performance: "Performance package",
  lighting: "LED lighting package"
};
var upgradePrices = { forged: 3200, performance: 4800, lighting: 1100 };
var VEHICLE_BUILDS_KEY = "vehicle-studio-builds";
var buildConfig = {
  vehicle: "car",
  paint: "#215da8",
  material: "leather",
  spoiler: "none",
  upgrades: []
};
var savedBuilds = [];
var sceneState = null;

function money(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function selectedBuildPrice() {
  return vehiclePrices[buildConfig.vehicle]
    + materialPrices[buildConfig.material]
    + spoilerPrices[buildConfig.spoiler]
    + buildConfig.upgrades.reduce(function (total, upgrade) { return total + upgradePrices[upgrade]; }, 0);
}

function buildSpecification() {
  var options = [
    ["Paint", paintNames[buildConfig.paint]],
    ["Interior", materialNames[buildConfig.material]],
    [buildConfig.vehicle === "semi" ? "Cab deflector" : "Spoiler", spoilerNames[buildConfig.spoiler]]
  ];
  buildConfig.upgrades.forEach(function (upgrade) { options.push(["Package", upgradeNames[upgrade]]); });
  return options;
}

function vehicleElement(tag, className, text) {
  var element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function updateVehicleControls() {
  document.querySelectorAll("[data-vehicle]").forEach(function (button) {
    button.setAttribute("aria-pressed", String(button.dataset.vehicle === buildConfig.vehicle));
  });
  document.querySelectorAll("[data-paint]").forEach(function (button) {
    button.setAttribute("aria-pressed", String(button.dataset.paint === buildConfig.paint));
  });
  document.querySelectorAll("[data-material]").forEach(function (button) {
    button.setAttribute("aria-pressed", String(button.dataset.material === buildConfig.material));
  });
  document.getElementById("spoiler-choice").value = buildConfig.spoiler;
  document.querySelectorAll(".upgrade-option input").forEach(function (input) {
    input.checked = buildConfig.upgrades.includes(input.value);
  });
  document.getElementById("preview-model-name").textContent = vehicleNames[buildConfig.vehicle];
  document.getElementById("paint-name").textContent = paintNames[buildConfig.paint];
  document.getElementById("spoiler-label").textContent = buildConfig.vehicle === "semi" ? "Cab deflector" : "Rear spoiler";
  updateBuildSummary();
  if (sceneState) sceneState.update(buildConfig);
}

function updateBuildSummary() {
  var specs = document.getElementById("build-specs");
  specs.replaceChildren();
  var base = vehicleElement("li", "");
  base.append(vehicleElement("span", "", vehicleNames[buildConfig.vehicle]), vehicleElement("strong", "", money(vehiclePrices[buildConfig.vehicle])));
  specs.appendChild(base);
  buildSpecification().forEach(function (item) {
    var row = vehicleElement("li", "");
    row.append(vehicleElement("span", "", item[0]), vehicleElement("strong", "", item[1]));
    specs.appendChild(row);
  });
  document.getElementById("build-price").textContent = money(selectedBuildPrice());
}

function readSavedBuilds() {
  try {
    var data = JSON.parse(localStorage.getItem(VEHICLE_BUILDS_KEY) || "[]");
    savedBuilds = Array.isArray(data) ? data : [];
  } catch (_) {
    savedBuilds = [];
    document.getElementById("vehicle-status").textContent = "Saved builds could not be read in this browser.";
  }
}

function saveBuilds() {
  try {
    localStorage.setItem(VEHICLE_BUILDS_KEY, JSON.stringify(savedBuilds));
    document.getElementById("vehicle-status").textContent = "Build saved in this browser.";
  } catch (_) {
    document.getElementById("vehicle-status").textContent = "Browser storage is unavailable; this build was not saved.";
  }
}

function renderSavedBuilds() {
  var list = document.getElementById("saved-builds");
  list.replaceChildren();
  if (!savedBuilds.length) {
    list.appendChild(vehicleElement("p", "saved-builds-empty", "Your saved builds will show up here."));
    return;
  }
  savedBuilds.forEach(function (build, index) {
    var card = vehicleElement("article", "saved-build-card");
    var details = document.createElement("div");
    details.appendChild(vehicleElement("strong", "", build.name || vehicleNames[build.vehicle]));
    details.appendChild(vehicleElement("small", "", vehicleNames[build.vehicle] + " · " + money(build.price)));
    var actions = vehicleElement("div", "saved-build-actions");
    var load = vehicleElement("button", "", "Load");
    load.type = "button";
    load.dataset.buildAction = "load";
    load.dataset.index = String(index);
    var remove = vehicleElement("button", "", "Remove");
    remove.type = "button";
    remove.dataset.buildAction = "remove";
    remove.dataset.index = String(index);
    actions.append(load, remove);
    card.append(details, actions);
    list.appendChild(card);
  });
}

function saveCurrentBuild() {
  var build = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: document.getElementById("build-name").value.trim(),
    vehicle: buildConfig.vehicle,
    paint: buildConfig.paint,
    material: buildConfig.material,
    spoiler: buildConfig.spoiler,
    upgrades: buildConfig.upgrades.slice(),
    price: selectedBuildPrice()
  };
  savedBuilds.unshift(build);
  saveBuilds();
  renderSavedBuilds();
  document.getElementById("build-name").value = "";
}

function loadBuild(build) {
  if (!build || !vehicleNames[build.vehicle] || !paintNames[build.paint]) return;
  buildConfig = {
    vehicle: build.vehicle,
    paint: build.paint,
    material: materialNames[build.material] ? build.material : "leather",
    spoiler: spoilerNames[build.spoiler] ? build.spoiler : "none",
    upgrades: Array.isArray(build.upgrades) ? build.upgrades.filter(function (item) { return upgradeNames[item]; }) : []
  };
  updateVehicleControls();
  document.getElementById("vehicle-status").textContent = "Build loaded into the studio.";
}

document.querySelectorAll("[data-vehicle]").forEach(function (button) {
  button.addEventListener("click", function () {
    buildConfig.vehicle = button.dataset.vehicle;
    updateVehicleControls();
  });
});

document.querySelectorAll("[data-paint]").forEach(function (button) {
  button.addEventListener("click", function () {
    buildConfig.paint = button.dataset.paint;
    updateVehicleControls();
  });
});

document.querySelectorAll("[data-material]").forEach(function (button) {
  button.addEventListener("click", function () {
    buildConfig.material = button.dataset.material;
    updateVehicleControls();
  });
});

document.getElementById("spoiler-choice").addEventListener("change", function (event) {
  buildConfig.spoiler = event.target.value;
  updateVehicleControls();
});

document.querySelectorAll(".upgrade-option input").forEach(function (input) {
  input.addEventListener("change", function () {
    buildConfig.upgrades = Array.from(document.querySelectorAll(".upgrade-option input:checked"))
      .map(function (selected) { return selected.value; });
    updateVehicleControls();
  });
});

document.getElementById("save-build").addEventListener("click", saveCurrentBuild);
document.getElementById("saved-builds").addEventListener("click", function (event) {
  var button = event.target.closest("[data-build-action]");
  if (!button) return;
  var index = Number(button.dataset.index);
  if (button.dataset.buildAction === "load") {
    loadBuild(savedBuilds[index]);
  } else if (button.dataset.buildAction === "remove") {
    savedBuilds.splice(index, 1);
    saveBuilds();
    renderSavedBuilds();
  }
});

document.getElementById("copy-build").addEventListener("click", function () {
  var lines = [vehicleNames[buildConfig.vehicle], "Estimated build: " + money(selectedBuildPrice())];
  buildSpecification().forEach(function (item) { lines.push(item[0] + ": " + item[1]); });
  if (navigator.clipboard) {
    navigator.clipboard.writeText(lines.join("\n")).then(function () {
      document.getElementById("vehicle-status").textContent = "Build specification copied.";
    }).catch(function () {
      document.getElementById("vehicle-status").textContent = "Clipboard access is unavailable.";
    });
  } else {
    document.getElementById("vehicle-status").textContent = "Clipboard access is unavailable.";
  }
});

readSavedBuilds();
renderSavedBuilds();
updateVehicleControls();

function startVehiclePreview(THREE) {
  var canvas = document.getElementById("vehicle-canvas");
  var stage = document.getElementById("vehicle-stage");
  var message = document.getElementById("vehicle-stage-status");
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (_) {
    message.textContent = "A WebGL-capable browser is needed for the 3D preview. The configurator still works.";
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(34, 1, .1, 80);
  camera.position.set(7.5, 4.4, 8.2);
  camera.lookAt(0, 1, 0);

  scene.add(new THREE.HemisphereLight(0xd8edff, 0x171d24, 2.1));
  var keyLight = new THREE.DirectionalLight(0xfff1da, 3.5);
  keyLight.position.set(-4, 8, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);
  var rimLight = new THREE.DirectionalLight(0x72dbe7, 2.2);
  rimLight.position.set(4, 4, -6);
  scene.add(rimLight);

  var floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x10181d, roughness: .8, metalness: .15 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.16;
  floor.receiveShadow = true;
  scene.add(floor);

  var platform = new THREE.Mesh(
    new THREE.CylinderGeometry(4.5, 4.5, .18, 96),
    new THREE.MeshStandardMaterial({ color: 0x202c32, roughness: .42, metalness: .5 })
  );
  platform.position.y = -.1;
  platform.receiveShadow = true;
  scene.add(platform);
  var platformRing = new THREE.Mesh(
    new THREE.TorusGeometry(4.28, .018, 8, 128),
    new THREE.MeshBasicMaterial({ color: 0x72e6ed, transparent: true, opacity: .52 })
  );
  platformRing.rotation.x = Math.PI / 2;
  platformRing.position.y = .002;
  scene.add(platformRing);

  var vehicleRoot = new THREE.Group();
  scene.add(vehicleRoot);
  var paintMaterials = [];
  var interiorMaterials = [];
  var rimMaterials = [];
  var lightMaterials = [];
  var dynamicParts = new THREE.Group();
  vehicleRoot.add(dynamicParts);
  var pointerDown = false;
  var previousX = 0;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function standard(color, roughness, metalness, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: roughness, metalness: metalness }, extra || {}));
  }

  function addBox(parent, size, position, material, target) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (target) target.push(material);
    return mesh;
  }

  function addWheel(parent, x, z, radius, forged) {
    var tire = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, .34, 32),
      standard(0x121619, .8, .05)
    );
    tire.rotation.z = Math.PI / 2;
    tire.position.set(x, radius, z);
    tire.castShadow = true;
    tire.receiveShadow = true;
    parent.add(tire);

    var rimMaterial = standard(forged ? 0xb8c5ca : 0x687983, .27, .82);
    var rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * .53, radius * .53, .36, 24), rimMaterial);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, radius, z);
    rim.castShadow = true;
    parent.add(rim);
    rimMaterials.push(rimMaterial);

    var hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * .13, radius * .13, .38, 16), standard(0x253038, .24, .8));
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x, radius, z);
    parent.add(hub);

    if (forged) {
      var spokes = new THREE.Group();
      for (var spoke = 0; spoke < 8; spoke++) {
        var bar = new THREE.Mesh(new THREE.BoxGeometry(.38, .045, .065), rimMaterial);
        bar.position.set(x + (x < 0 ? -.02 : .02), radius, z);
        bar.rotation.x = spoke * Math.PI / 4;
        bar.castShadow = true;
        spokes.add(bar);
      }
      parent.add(spokes);
    }
  }

  function addHeadlights(parent, frontZ, width) {
    var lens = standard(0xfff1cb, .18, .18, { emissive: 0x211b0b, emissiveIntensity: .35 });
    lightMaterials.push(lens);
    [-1, 1].forEach(function (side) {
      addBox(parent, [.3, .12, .06], [side * width * .36, .91, frontZ], lens);
    });
  }

  function addCabinGlass(parent, width, z, depth, seatMaterial) {
    var glass = standard(0x172c37, .16, .32, { transparent: true, opacity: .72 });
    addBox(parent, [.035, .34, depth * .7], [-width * .49, 1.47, z], glass);
    addBox(parent, [.035, .34, depth * .7], [width * .49, 1.47, z], glass);
    var seatBack = addBox(parent, [.43, .49, .13], [-.4, 1.23, z - .08], seatMaterial);
    var seatBase = addBox(parent, [.45, .13, .38], [-.4, 1.04, z + .12], seatMaterial);
    var passengerBack = addBox(parent, [.43, .49, .13], [.4, 1.23, z - .08], seatMaterial);
    var passengerBase = addBox(parent, [.45, .13, .38], [.4, 1.04, z + .12], seatMaterial);
    interiorMaterials.push(seatBack.material, seatBase.material, passengerBack.material, passengerBase.material);
  }

  function buildVehicle(config) {
    vehicleRoot.clear();
    paintMaterials = [];
    interiorMaterials = [];
    rimMaterials = [];
    lightMaterials = [];
    dynamicParts = new THREE.Group();
    vehicleRoot.add(dynamicParts);

    var paint = standard(config.paint, .24, .62, { clearcoat: .8, clearcoatRoughness: .2 });
    var glass = standard(0x142833, .17, .35, { transparent: true, opacity: .78 });
    var trim = standard(0x171c20, .36, .38);
    var chrome = standard(0x89979d, .22, .85);
    var seatColor = config.material === "leather" ? 0x6b3529 : config.material === "alcantara" ? 0x354149 : 0x777168;
    var seat = standard(seatColor, config.material === "leather" ? .34 : .76, .02);
    var lengthScale = config.vehicle === "semi" ? .67 : config.vehicle === "truck" ? .88 : 1;
    vehicleRoot.scale.setScalar(lengthScale);

    if (config.vehicle === "car") {
      addBox(vehicleRoot, [1.96, .55, 4.55], [0, .82, 0], paint, paintMaterials);
      addBox(vehicleRoot, [1.91, .32, 1.35], [0, 1.12, 1.32], paint, paintMaterials);
      addBox(vehicleRoot, [1.78, .28, .82], [0, 1.08, -1.78], paint, paintMaterials);
      addBox(vehicleRoot, [1.58, .65, 1.86], [0, 1.43, -.18], paint, paintMaterials);
      addBox(vehicleRoot, [1.47, .13, 1.25], [0, 1.82, -.22], paint, paintMaterials);
      addBox(vehicleRoot, [1.42, .36, .035], [0, 1.48, .78], glass);
      addBox(vehicleRoot, [1.35, .32, .035], [0, 1.48, -1.11], glass);
      addCabinGlass(vehicleRoot, 1.58, -.18, 1.86, seat);
      [-1, 1].forEach(function (side) {
        addWheel(vehicleRoot, side * 1.02, 1.4, .43, config.upgrades.includes("forged"));
        addWheel(vehicleRoot, side * 1.02, -1.42, .43, config.upgrades.includes("forged"));
      });
      addHeadlights(vehicleRoot, 2.02, 1.96);
      addBox(vehicleRoot, [1.72, .1, .08], [0, .67, -2.28], trim);
      addBox(vehicleRoot, [1.7, .12, .06], [0, .72, 2.3], chrome);
    } else if (config.vehicle === "truck") {
      addBox(vehicleRoot, [2.12, .64, 5.15], [0, .83, 0], paint, paintMaterials);
      addBox(vehicleRoot, [2.06, .38, 1.55], [0, 1.2, 1.55], paint, paintMaterials);
      addBox(vehicleRoot, [1.82, .78, 1.7], [0, 1.57, .25], paint, paintMaterials);
      addBox(vehicleRoot, [1.72, .14, 1.25], [0, 2.03, .22], paint, paintMaterials);
      addBox(vehicleRoot, [1.62, .38, .04], [0, 1.68, 1.12], glass);
      addCabinGlass(vehicleRoot, 1.82, .24, 1.7, seat);
      addBox(vehicleRoot, [1.8, .12, 1.55], [0, 1.32, -1.66], trim);
      [-1, 1].forEach(function (side) {
        addBox(vehicleRoot, [.11, .36, 1.55], [side * .94, 1.44, -1.66], paint, paintMaterials);
        addWheel(vehicleRoot, side * 1.09, 1.52, .5, config.upgrades.includes("forged"));
        addWheel(vehicleRoot, side * 1.09, -1.72, .5, config.upgrades.includes("forged"));
      });
      addHeadlights(vehicleRoot, 2.38, 2.12);
      addBox(vehicleRoot, [2.02, .17, .16], [0, .58, 2.59], chrome);
      addBox(vehicleRoot, [1.95, .11, .06], [0, .7, -2.58], trim);
    } else {
      addBox(vehicleRoot, [2.5, .2, 5.8], [0, .64, -2.65], paint, paintMaterials);
      addBox(vehicleRoot, [2.45, 2.62, 5.65], [0, 2.02, -2.68], paint, paintMaterials);
      addBox(vehicleRoot, [2.25, .12, 5.2], [0, 3.38, -2.68], trim);
      addBox(vehicleRoot, [2.18, .17, .18], [0, 1.1, .65], trim);
      addBox(vehicleRoot, [2.16, 1.58, 1.72], [0, 1.92, 1.16], paint, paintMaterials);
      addBox(vehicleRoot, [2.06, .14, 1.53], [0, 2.8, 1.12], paint, paintMaterials);
      addBox(vehicleRoot, [1.72, .78, .04], [0, 2.04, 2.05], glass);
      addBox(vehicleRoot, [.035, .66, 1.36], [-1.04, 2.03, 1.14], glass);
      addBox(vehicleRoot, [.035, .66, 1.36], [1.04, 2.03, 1.14], glass);
      addCabinGlass(vehicleRoot, 2.08, 1.13, 1.7, seat);
      addHeadlights(vehicleRoot, 2.05, 2.16);
      [-1, 1].forEach(function (side) {
        addWheel(vehicleRoot, side * 1.3, 1.48, .53, config.upgrades.includes("forged"));
        [-4.55, -3.85, -3.15].forEach(function (z) {
          addWheel(vehicleRoot, side * 1.3, z, .51, config.upgrades.includes("forged"));
        });
      });
      addBox(vehicleRoot, [2.25, .19, .22], [0, .57, 2.2], chrome);
      addBox(vehicleRoot, [2.05, .1, .16], [0, 3.01, 1.12], chrome);
    }

    dynamicParts.position.y = 0;
    if (config.spoiler !== "none") {
      var spoilerZ = config.vehicle === "semi" ? .05 : config.vehicle === "truck" ? -2.5 : -2.25;
      var spoilerY = config.vehicle === "semi" ? 3.35 : config.vehicle === "truck" ? 2.08 : 1.82;
      var spoilerMaterial = standard(0x182126, .28, .55);
      var wingWidth = config.spoiler === "wing" ? 2.1 : 1.76;
      var wingDepth = config.spoiler === "wing" ? .31 : .2;
      if (config.spoiler === "wing") {
        [-.66, .66].forEach(function (x) { addBox(dynamicParts, [.08, .38, .08], [x, spoilerY - .18, spoilerZ], spoilerMaterial); });
      }
      addBox(dynamicParts, [wingWidth, .1, wingDepth], [0, spoilerY, spoilerZ], spoilerMaterial);
    }

    if (config.upgrades.includes("performance")) {
      var front = config.vehicle === "semi" ? 2.36 : config.vehicle === "truck" ? 2.58 : 2.28;
      addBox(dynamicParts, [config.vehicle === "semi" ? 2.3 : 1.78, .13, .24], [0, .51, front], standard(0x29383d, .35, .7));
      if (config.vehicle === "semi") {
        [-1, 1].forEach(function (side) {
          addBox(dynamicParts, [.09, .77, .09], [side * 1.02, .84, 2.28], chrome);
        });
      }
    }

    if (config.upgrades.includes("lighting") && config.vehicle === "semi") {
      [-.8, -.4, 0, .4, .8].forEach(function (x) {
        addBox(dynamicParts, [.12, .09, .08], [x, 3.5, 1.12], standard(0xffd873, .2, .15, { emissive: 0x7a4a05, emissiveIntensity: 1.3 }));
      });
    }

    lightMaterials.forEach(function (material) {
      material.emissive.setHex(config.upgrades.includes("lighting") ? 0xf1c45e : 0x211b0b);
      material.emissiveIntensity = config.upgrades.includes("lighting") ? 1.2 : .35;
    });
    if (config.upgrades.includes("forged")) {
      rimMaterials.forEach(function (material) { material.color.setHex(0xd5e0e2); });
    }
  }

  function resize() {
    var width = Math.max(1, stage.clientWidth);
    var height = Math.max(1, stage.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = buildConfig.vehicle === "semi" ? 11.7 : buildConfig.vehicle === "truck" ? 9.4 : 8.2;
    camera.position.x = buildConfig.vehicle === "semi" ? 8.5 : 7.5;
    camera.lookAt(0, buildConfig.vehicle === "semi" ? 1.35 : 1, 0);
    camera.updateProjectionMatrix();
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!pointerDown && !reducedMotion) vehicleRoot.rotation.y += .0014;
    renderer.render(scene, camera);
  }

  canvas.addEventListener("pointerdown", function (event) {
    pointerDown = true;
    previousX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", function (event) {
    if (!pointerDown) return;
    vehicleRoot.rotation.y += (event.clientX - previousX) * .009;
    previousX = event.clientX;
  });
  canvas.addEventListener("pointerup", function () { pointerDown = false; });
  canvas.addEventListener("pointercancel", function () { pointerDown = false; });
  canvas.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      vehicleRoot.rotation.y += event.key === "ArrowLeft" ? -.16 : .16;
    }
  });

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize);
  sceneState = { update: buildVehicle };
  buildVehicle(buildConfig);
  resize();
  message.hidden = true;
  animate();
}

import("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js")
  .then(startVehiclePreview)
  .catch(function () {
    document.getElementById("vehicle-stage-status").textContent = "The 3D preview could not load. The configuration controls are still available.";
  });
