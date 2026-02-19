let selectedWeights = {
  Time: 0.25,
  Energy: 0.25,
  Cost: 0.25,
  Load: 0.25
};

let values = [0.25, 0.25, 0.25, 0.25];

function populateBerths(berthFile) {
  Papa.parse(berthFile, {
    download: true,
    header: true,
    complete: (results) => {
      renderBerths(results.data);
    }
  });
};

function renderBerths(berths) {
  const container = document.getElementById("berths");
  container.innerHTML = ""; // καθαρισμός παλιών

  berths
    .filter(b => b.Berth && b.Length && b.Draft) // κρατάμε μόνο έγκυρα rows
    .forEach(berth => {
      const berthDiv = document.createElement("div");
      berthDiv.className = "berth";

      // εσωτερικό container για name + size
      const info = document.createElement("div");
      info.className = "berth-info";

      const name = document.createElement("div");
      name.className = "berth-name";
      name.textContent = "B-" + berth.Berth.padStart(2, "0");

      const size = document.createElement("div");
      size.className = "berth-size";
      size.textContent = `(${berth.Length} × ${berth.Draft})`;

      info.appendChild(name);
      info.appendChild(size);

      berthDiv.appendChild(info);
      container.appendChild(berthDiv);
    });
}


function populateShips(shipFile) {
  Papa.parse(shipFile, {
    download: true,
    header: true,
    complete: (results) => {
      renderShips(results.data);
    }
  });
};

function renderShips(ships) {
  const container = document.getElementById("ships");
  container.innerHTML = ""; // καθαρισμός παλιών

  ships
    .filter(
      s =>
        s.Ship &&
        s.Length &&
        s.Draft &&
        s["Arrival Time"] &&
        s["Requested Departure Time"]
    )
    .forEach(ship => {

      const shipDiv = document.createElement("div");
      shipDiv.className = "ship";
      shipDiv.id = "ship-" + ship.Ship.padStart(2, "0");

      // εσωτερικό container για name + size
      const info = document.createElement("div");
      info.className = "ship-info";

      const name = document.createElement("div");
      name.className = "ship-name";
      name.textContent = "S" + ship.Ship.padStart(2, "0");

      const size = document.createElement("div");
      size.className = "ship-size";
      size.textContent = `Length x Draft (m): ${ship.Length} x ${ship.Draft}`;

      const ETA = document.createElement("div");
      ETA.className = "ship-eta";
      ETA.textContent = `ETA (h): ${ship["Arrival Time"]}`;

      const RTD = document.createElement("div");
      RTD.className = "ship-rtd";
      RTD.textContent = `RTD (h): ${Math.round(ship["Requested Departure Time"])}`;

      info.appendChild(name);
      info.appendChild(size);
      info.appendChild(ETA);
      info.appendChild(RTD);

      shipDiv.appendChild(info);
      container.appendChild(shipDiv);
    });
}


function getDatasetPaths() {
  const dataset = getSelectedScenario();   // dataset_name
  const algorithm = getSelectedAlgorithm(); // algorithm_name

  const basePath = `data/${dataset}`;

  return {
    shipsFile: `${basePath}/vessels_info.csv`,
    berthsFile: `${basePath}/berths_info.csv`,
    algorithmFolder: `${basePath}/${algorithm}`
  };
}

async function loadSelectedSolution() {
  const dataset = getSelectedScenario();
  const algorithm = getSelectedAlgorithm();
  const { algorithmFolder } = getDatasetPaths();

  // Dynamically select the best solution based on applied weights
  console.log(selectedWeights);
  await selectAndRenderBestSolution(selectedWeights);
}


function renderSolutionOverlay(solutionFile, containerId = "berths") {
  Papa.parse(solutionFile, {
    download: true,
    header: true,
    complete: (solutionResults) => {
      const ships = solutionResults.data.filter(
        s => s.Ship && s.Berth && s.MooringTime && s.HandlingTime
      );

      if (ships.length === 0) return;

      const container = document.getElementById(containerId);

      // --- CLEAR PREVIOUS SHIPS ---
      Array.from(container.children).forEach(berthDiv => {
        const track = berthDiv.querySelector(".berth-gantt-track");
        if (track) {
          track.innerHTML = ""; // remove all chips and tooltips
        }
      });

      // Determine max time across all ships
      const maxTime = Math.max(...ships.map(s => parseFloat(s.MooringTime) + parseFloat(s.HandlingTime)));

      renderTimeAxis(maxTime);

      ships.forEach(ship => {
        // Find the existing berth track
        const berthDiv = Array.from(container.children).find(
          b => b.querySelector(".berth-name")?.textContent === "B-" + ship.Berth.padStart(2, "0")
        );

        if (!berthDiv) return;

        let track = berthDiv.querySelector(".berth-gantt-track");
        if (!track) {
          track = document.createElement("div");
          track.className = "berth-gantt-track";
          berthDiv.appendChild(track);
        }


        // Create ship chip
        const chip = document.createElement("div");
        chip.className = "ship-chip-gantt";
        chip.textContent = "S" + ship.Ship.padStart(2, "0");

        const leftPercent = (parseFloat(ship.MooringTime) / maxTime) * 100;
        const widthPercent = (parseFloat(ship.HandlingTime) / maxTime) * 100;
        chip.style.left = leftPercent + "%";
        chip.style.width = widthPercent + "%";

        // Create tooltip
        const tooltip = document.createElement("div");
        tooltip.className = "ship-tooltip";
        const departure = parseFloat(ship.MooringTime) + parseFloat(ship.HandlingTime);
        tooltip.textContent = `S${ship.Ship.padStart(2, "0")}: Mooring: ${ship.MooringTime}, Handling: ${Math.round(ship.HandlingTime)}, Departure: ${departure}`;
        document.body.appendChild(tooltip);   // ✅ instead of track.appendChild

        chip.addEventListener("click", () => {
          const target = document.getElementById("ship-" + ship.Ship.padStart(2, "0"));
          if (target) {
            // Scroll στο arrival panel
            target.scrollIntoView({ behavior: "smooth", block: "center" });

            // Highlight προσωρινά για να ξεχωρίζει
            target.classList.add("highlight-ship");
            setTimeout(() => target.classList.remove("highlight-ship"), 2000);
          }
        });

        chip.addEventListener("mouseenter", () => {
          const chipRect = chip.getBoundingClientRect();
          tooltip.style.opacity = 1;
          tooltip.style.top = (window.scrollY + chipRect.top - 15) + "px";   // above chip
          tooltip.style.left = (window.scrollX + chipRect.left + chipRect.width / 2) + "px";
          tooltip.style.transform = "translateX(-50%)";
        });

        chip.addEventListener("mouseleave", () => {
          tooltip.style.opacity = 0;
        });


        track.appendChild(chip);
      });

      // const scenario = getSelectedScenario();
      // const algo = getSelectedAlgorithm();

      // console.log(getDatasetPaths());

      // Mark berths with no ships
      Array.from(container.children).forEach(berthDiv => {
        const track = berthDiv.querySelector(".berth-gantt-track");
        if (!track || track.children.length === 0) {
          berthDiv.classList.add("empty-berth");
        } else {
          berthDiv.classList.remove("empty-berth");
        }
      });

    }
  });
}


function getSelectedAlgorithm() {
  const selectElement = document.getElementById("algSelect");
  const selectedValue = selectElement.value;       // gets the value attribute of the selected option
  const selectedText = selectElement.options[selectElement.selectedIndex].text; // gets the visible text

  return selectedValue;  // or return an object {value, text} if you want both
}

function getSelectedScenario() {
  const selectElement = document.getElementById("scenarioSelect");
  const selectedValue = selectElement.value;       // gets the value attribute of the selected option
  const selectedText = selectElement.options[selectElement.selectedIndex].text; // gets the visible text

  return selectedValue;  // or return an object {value, text} if you want both
}

document.getElementById("runBtn").addEventListener("click", async () => {
  const paths = getDatasetPaths();

  populateShips(paths.shipsFile);
  populateBerths(paths.berthsFile);

  // console.log(paths);
  await loadSelectedSolution();
});



function renderTimeAxis(maxTime, ticks = 10) {
  let axis = document.getElementById("time-axis");

  // If it doesn't exist yet, create and place it in the right spot
  if (!axis) {
    axis = document.createElement("div");
    axis.id = "time-axis";

    // Find parent (port-panel) and insert before berths-wrapper
    const panel = document.querySelector(".port-panel");
    const wrapper = document.querySelector(".berths-wrapper");
    panel.insertBefore(axis, wrapper); // 👈 puts axis exactly where you had it commented
  }

  // Clear old ticks
  axis.innerHTML = "";

  const axisWidth = axis.offsetWidth;

  for (let i = 0; i <= ticks; i++) {
    const time = Math.round((i / ticks) * maxTime);
    const tick = document.createElement("div");
    tick.className = "time-tick";
    tick.style.left = `${(i / ticks) * 100}%`;
    tick.textContent = time;
    axis.appendChild(tick);
  }
}


document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("infoBtn");
  const tooltip = document.getElementById("globalInfoModal");

  if (!btn || !tooltip) {
    console.warn("Info button or tooltip not found.");
    return;
  }

  // Toggle tooltip when clicking the info button
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    tooltip.classList.toggle("visible");

    const visible = tooltip.classList.contains("visible");
    tooltip.setAttribute("aria-hidden", visible ? "false" : "true");
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!tooltip.classList.contains("visible")) return;
    if (!tooltip.contains(e.target) && e.target !== btn) {
      tooltip.classList.remove("visible");
      tooltip.setAttribute("aria-hidden", "true");
    }
  });

  // Close with Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && tooltip.classList.contains("visible")) {
      tooltip.classList.remove("visible");
      tooltip.setAttribute("aria-hidden", "true");
    }
  });
});




//Disable runBtn on page load. Can be clicked only when an algorithm and a scenario have been chosen.
document.addEventListener("DOMContentLoaded", () => {
  const runBtn = document.getElementById("runBtn");
  const algSelect = document.getElementById("algSelect");
  const scenarioSelect = document.getElementById("scenarioSelect");

  runBtn.disabled = true;

  function updateRunBtnAndState() {
    const algoSelected = algSelect.selectedIndex > 0;
    const scenarioSelected = scenarioSelect.selectedIndex > 0;
    runBtn.disabled = !(algoSelected && scenarioSelected);
  }
  algSelect.addEventListener("change", updateRunBtnAndState);
});



function initRadarUI() {
  const radarPanel = document.getElementById("radarpanel");
  const arrivalsPanel = document.querySelector(".arrivals-panel");
  const weightsBtn = document.getElementById("weightsBtn");
  const applyBtn = document.getElementById("applyBtn");

  if (!radarPanel || !arrivalsPanel || !weightsBtn || !applyBtn) {
    console.warn("Radar UI elements not found", {
      radarPanel,
      arrivalsPanel,
      weightsBtn,
      applyBtn
    });
    return;
  }

  // hide radar initially
  radarPanel.style.display = "none";

  weightsBtn.addEventListener("click", () => {
    radarPanel.style.display = "block";
    arrivalsPanel.classList.add("hidden");
    weightsBtn.classList.add("hidden");
  });

  applyBtn.addEventListener("click", () => {
    radarPanel.style.display = "none";
    arrivalsPanel.classList.remove("hidden");
    weightsBtn.classList.remove("hidden");

    clearSolutionOverlay();

    // Store the current weights globally
    selectedWeights = getRadarWeights();
    console.log("Weights applied:", selectedWeights);
  });
}

document.addEventListener("DOMContentLoaded", initRadarUI);

document.addEventListener("DOMContentLoaded", () => {

  const radarpanel = document.getElementById("radarpanel");
  const weightsBtn = document.getElementById("weightsBtn");
  const applyBtn = document.getElementById("applyBtn");
  const arrivalsPane = document.querySelector(".arrivals-panel");

  weightsBtn.addEventListener("click", () => {
    radarpanel.classList.add("visible");
    arrivalsPane.classList.add("hidden");
    weightsBtn.classList.add("hidden");
  });
  const resetBtn = document.getElementById("resetBtn");

  resetBtn.addEventListener("click", () => {
    values = [0.25, 0.25, 0.25, 0.25];  // επαναφορά
    drawRadar();                        // ξανασχεδιάζουμε το radar
  });

  const canvas = document.getElementById("radarCanvas");
  const ctx = canvas.getContext("2d");

  const center = { x: 265, y: 250 };
  const radius = 180;

  const labels = ["Time", "Energy", "Cost", "Load"];
  const MIN = 0.05;
  const MAX = 0.85;

  // initial equal weights
  // let values = [0.25, 0.25, 0.25, 0.25];
  let draggingIndex = null;

  // Convert weight to canvas point
  function getPoint(index, value) {
    const angle = (Math.PI * 2 / labels.length) * index - Math.PI / 2;
    const r = (value / MAX) * radius;  // scale value ως προς MAX
    return {
      x: center.x + Math.cos(angle) * r,
      y: center.y + Math.sin(angle) * r
    };
  }

  // Draw radar
  function drawRadar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = "#ddd";
    for (let i = 1; i <= 6; i++) {
      ctx.beginPath();
      const r = (radius / 5) * i;             // απλώς κλίμακα 1-5
      const scaledR = r * (MAX / 1);          // scale μέχρι 0.85
      ctx.arc(center.x, center.y, scaledR, 0, Math.PI * 2);
    }

    // Axes
    ctx.strokeStyle = "#0dada9";
    labels.forEach((label, i) => {
      const angle = (Math.PI * 2 / labels.length) * i - Math.PI / 2;
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;

      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    });

    // Polygon
    ctx.beginPath();
    values.forEach((v, i) => {
      const p = getPoint(i, v);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(13,173,169,0.3)";
    ctx.fill();
    ctx.strokeStyle = "#0dada9";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Labels
    ctx.font = "bold 16px Comfortaa";
    ctx.fillStyle = "#ddd";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    labels.forEach((label, i) => {
      const angle = (Math.PI * 2 / labels.length) * i - Math.PI / 2;
      const dist = radius + 45; // λίγο έξω από το κύκλο
      const x = center.x + Math.cos(angle) * dist;
      const y = center.y + Math.sin(angle) * dist;

      const percent = Math.round(values[i] * 100) + "%";

      // Draw label + percentage in two lines
      ctx.fillText(label, x, y - 10); // πάνω γραμμή
      ctx.fillText(percent, x, y + 10); // κάτω γραμμή
    });

    // Drag points
    values.forEach((v, i) => {
      const p = getPoint(i, v);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#0dada9";
      ctx.fill();
    });
  }

  // Redistribute remaining weight proportionally
  function redistribute(index, newValue) {
    // Περιορισμός στο range MIN-MAX
    newValue = Math.max(MIN, Math.min(MAX, newValue));

    const others = values
      .map((v, i) => ({ v, i }))
      .filter(o => o.i !== index);

    const remaining = 1 - newValue;
    const currentSum = others.reduce((s, o) => s + o.v, 0);

    // Αν τα υπόλοιπα θα πέσουν κάτω από MIN, ακυρώνουμε την αλλαγή
    if (remaining < others.length * MIN) return;

    others.forEach(o => {
      let scaled = (o.v / currentSum) * remaining;
      o.v = Math.max(MIN, Math.min(MAX, scaled)); // δεν αφήνουμε αρνητικά
    });

    // Διορθώνουμε μικρές αποκλίσεις
    let total = newValue + others.reduce((s, o) => s + o.v, 0);
    let diff = 1 - total;
    if (Math.abs(diff) > 1e-6) {
      others[0].v = Math.max(MIN, Math.min(MAX, others[0].v + diff));
    }

    values[index] = newValue;
    others.forEach(o => values[o.i] = o.v);
  }

  // Mouse events
  canvas.addEventListener("mousedown", e => {
    const rect = canvas.getBoundingClientRect();

    // Adjust mouse coordinates to canvas internal size
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    values.forEach((v, i) => {
      const p = getPoint(i, v);
      if (Math.hypot(mx - p.x, my - p.y) < 10) draggingIndex = i;
    });
  });

  canvas.addEventListener("mousemove", e => {
    if (draggingIndex === null) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const dx = mx - center.x;
    const dy = my - center.y;
    const dist = Math.min(Math.hypot(dx, dy), radius);

    const newValue = dist / radius;
    redistribute(draggingIndex, newValue);
    drawRadar();
  });

  canvas.addEventListener("mouseup", () => draggingIndex = null);
  canvas.addEventListener("mouseleave", () => draggingIndex = null);

  document.fonts.load("18px Comfortaa").then(() => {
    drawRadar();
  });

});


async function selectAndRenderBestSolution(weights) {
  const { algorithmFolder } = getDatasetPaths();

  let i = 1;
  let minSum = Infinity;
  let bestSolFile = null;

  while (true) {
    const objPath = `${algorithmFolder}/sol${i}_obj.csv`;

    // Stop when file does not exist
    if (!(await fileExists(objPath))) {
      console.log(`Stopped at sol${i}_obj.csv (not found)`);
      break;
    }

    const results = await new Promise((resolve) => {
      Papa.parse(objPath, {
        download: true,
        header: true,
        complete: resolve,
        error: () => resolve(null)
      });
    });

    if (!results || !results.data || !results.data.length) {
      i++;
      continue;
    }

    const obj = results.data[0];

    const sum =
      parseFloat(obj.Time)   * weights.Time +
      parseFloat(obj.Energy) * weights.Energy +
      parseFloat(obj.Cost)   * weights.Cost +
      parseFloat(obj.Load)   * weights.Load;

    if (sum < minSum) {
      minSum = sum;
      bestSolFile = `${algorithmFolder}/sol${i}.csv`;
    }

    i++;
  }

  if (bestSolFile) {
    console.log("Best solution selected:", bestSolFile);
    renderSolutionOverlay(bestSolFile);
  } else {
    console.warn("No valid solution found!");
  }
}


function getRadarWeights() {
  // values array is [Time, Energy, Cost, Load]
  return {
    Time: values[0],
    Energy: values[1],
    Cost: values[2],
    Load: values[3]
  };
}

async function fileExists(path) {
  try {
    const res = await fetch(path, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

function clearSolutionOverlay(containerId = "berths") {
  const container = document.getElementById(containerId);
  if (!container) return;

  Array.from(container.children).forEach(berthDiv => {
    const track = berthDiv.querySelector(".berth-gantt-track");
    if (track) {
      track.innerHTML = ""; // remove ship chips
    }
    berthDiv.classList.remove("empty-berth");
  });

  // Optional: remove orphan tooltips
  document.querySelectorAll(".ship-tooltip").forEach(t => t.remove());
}