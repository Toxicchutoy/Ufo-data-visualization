// ===== VARIABLES =====

// Table to hold CSV data of UFO sightings
let table;

// Array to store processed UFO sightings data for display
let sightings = [];

// Controls animation frames
let frame = 0;

// Flag to toggle animation play/pause
let playing = false;

// Radar sweep properties
let sweep_angle = 0; // Current rotation angle of the radar sweep
let sweep_speed = 0.02; // Speed of the radar sweep rotation
let sweep_width = 0.2; // Width of the radar sweep (how wide the radar "beam" is)
let radar_radius; // Radius of the radar display

// Controls how many UFOs can be revealed per sweep rotation
let max_reveal_per_sweep = 100;

// Tracks how many UFOs have been revealed in the current sweep
let revealed = 0;

// ===== PRELOAD CSV =====
function preload() {
  // Load CSV file with UFO sightings, including header row
  table = loadTable("ufo_sightings_scrubbed.csv", "csv", "header");
}

// ===== SETUP =====
function setup() {
  createCanvas(windowWidth, windowHeight); // Create a full-window canvas
  noStroke();
  fill(0, 255, 180, 180); // Default fill color for UFO dots
  radar_radius = min(width, height) * 0.45; // Radar takes up ~90% of smaller canvas dimension

  // Process CSV data and map latitude/longitude to radar coordinates
  for (let i = 0; i < table.getRowCount(); i++) {
    let lat = parseFloat(table.getString(i, "latitude"));
    let lon = parseFloat(table.getString(i, "longitude"));
    let city = table.getString(i, "city");
    let shape = table.getString(i, "shape");
    let duration_seconds = table.getString(i, "duration (seconds)");
    let duration_hours_min = table.getString(i, "duration (hours/min)");
    let date_posted = table.getString(i, "date posted");
    let state = table.getString(i, "state");
    let comments = table.getString(i, "comments");

    // Map longitude/latitude to screen coordinates inside radar
    let x = map(
      lon,
      -180,
      180,
      width / 2 - radar_radius,
      width / 2 + radar_radius
    );
    let y = map(
      lat,
      -90,
      90,
      height / 2 + radar_radius,
      height / 2 - radar_radius
    );

    // Only include points that are within the radar circle
    if (dist(x, y, width / 2, height / 2) <= radar_radius) {
      sightings.push({
        x,
        y,
        visible: false, // Whether the UFO is currently visible on radar
        fade: 0, // Used for fading in/out effect
        city,
        state,
        shape,
        date_posted,
        comments,
        duration_seconds,
        duration_hours_min,
      });
    }
  }

  // ===== BUTTONS =====
  // Set up button listeners for controlling animation and settings
  document.getElementById("play-btn").addEventListener("click", toggle_play);
  document.getElementById("reset-btn").addEventListener("click", reset_map);

  // Set max UFOs revealed per sweep from user input
  document.getElementById("set-reveal-btn").addEventListener("click", () => {
    let userValue = parseInt(document.getElementById("reveal-input").value);

    // Input validation: must be a positive number
    if (!isNaN(userValue) && userValue > 0) {
      max_reveal_per_sweep = userValue;
      revealed = 0;
      reset_map(); // Reset radar and UFO visibility
    }
  });
}

// ===== DRAW LOOP =====
function draw() {
  background(0); // Black background for radar

  // Draw title
  fill(180);
  textAlign(CENTER);
  text("UFO Sightings Map", width / 2, height - 20);

  // Draw radar circle
  push();
  translate(width / 2, height / 2);
  noFill();
  stroke(0, 255, 150, 100);
  ellipse(0, 0, radar_radius * 2);
  pop();

  // Rotate radar sweep if animation is playing
  if (playing) {
    sweep_angle += sweep_speed; // Increment radar sweep
    if (sweep_angle > TWO_PI) {
      sweep_angle = 0; // Reset after full rotation
      revealed = 0; // Reset revealed count for new sweep
    }
  }

  // Draw radar sweep line
  push();
  translate(width / 2, height / 2);
  stroke(0, 255, 0, 180);
  strokeWeight(2);
  let x = cos(sweep_angle) * radar_radius;
  let y = sin(sweep_angle) * radar_radius;
  line(0, 0, x, y);
  pop();

  // ===== DRAW UFO DOTS =====
  let revealed_this_frame = 0;
  for (let s of sightings) {
    // Angle of UFO relative to radar center
    let angle = atan2(s.y - height / 2, s.x - width / 2);
    if (angle < 0) angle += TWO_PI;

    let angle_diff = abs(angle - sweep_angle);

    // Make UFO dot visible when radar sweeps over it
    if (
      playing &&
      angle_diff < sweep_width &&
      revealed_this_frame < max_reveal_per_sweep
    ) {
      s.visible = true;
      s.fade = 255;
      revealed_this_frame++;
    }

    // Draw visible UFO dots with fade effect
    if (s.visible) {
      fill(0, 255, 100, s.fade);
      ellipse(s.x, s.y, 6, 6);

      // Slowly fade out if playing
      if (playing) {
        s.fade = max(0, s.fade - 2);
        if (s.fade === 0) {
          s.visible = false;
        }
      }
    }
  }

  // ===== HOVER EFFECT TO SHOW INFO =====
  for (let s of sightings) {
    if (s.visible && dist(mouseX, mouseY, s.x, s.y) < 6) {
      let padding = 10;
      textSize(12);
      textAlign(LEFT, TOP);

      let lines = [
        `City: ${s.city}`,
        `State: ${s.state}`,
        `Shape: ${s.shape}`,
        `Date: ${s.date_posted}`,
        `Duration: ${s.duration_hours_min || s.duration_seconds + " sec"}`,
      ];

      if (s.comments) {
        lines.push(`Comments: ${s.comments}`);
      }

      let lineHeight = 16;
      let rectHeight = lines.length * lineHeight + padding * 2;
      let rectWidth = 220;

      fill(255, 240);
      rect(mouseX + 10, mouseY - 25, rectWidth, rectHeight);

      fill(0);
      let yOffset = padding;
      for (let line of lines) {
        text(line, mouseX + 15, mouseY - 25 + yOffset, rectWidth - padding * 2);
        yOffset += lineHeight;
      }
    }
  }
}

// ===== HELPER FUNCTIONS =====

// Validate that latitude and longitude are numbers within valid ranges
function is_valid_coordinate(lat, lon) {
  return (
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    Number.isFinite(lon) &&
    lon >= -180 &&
    lon <= 180
  );
}

// Toggle play/pause state of radar animation
function toggle_play() {
  playing = !playing;
  document.getElementById("play-btn").innerText = playing ? "Pause" : "Play";
}

// Reset radar and UFO visibility
function reset_map() {
  for (let s of sightings) {
    s.visible = false;
    s.fade = 0;
  }
  revealed = 0;
  sweep_angle = 0;
  playing = false;
  document.getElementById("play-btn").innerText = "Play";
}
