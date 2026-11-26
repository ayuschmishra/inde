// inde (GitHub Pages / static version)
// Flow: consent -> camera permission -> auto-capture once -> review -> send to Firebase Storage.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getStorage, ref, uploadBytes,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { firebaseConfig, PHOTO_FOLDER } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const $ = (id) => document.getElementById(id);
const steps = ["step-consent", "step-camera", "step-review", "step-done"];

const video = $("video");
const canvas = $("canvas");
const preview = $("preview");
const statusEl = $("status");

let stream = null;
const facingMode = "user"; // front camera
let photoBlob = null;

function show(stepId) { steps.forEach((s) => ($(s).hidden = s !== stepId)); }
function setStatus(msg, isError = false) {
  statusEl.textContent = msg || "";
  statusEl.classList.toggle("error", isError);
}

function stopCamera() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  video.srcObject = null;
}

async function startCamera() {
  setStatus("");
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("Camera isn't available here. Use a modern browser over HTTPS.", true);
    return;
  }
  stopCamera();
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    video.srcObject = stream;
    video.classList.add("mirror");
    show("step-camera");
    // Auto-capture once the camera has a real frame (plus a beat for exposure).
    video.onloadedmetadata = () => setTimeout(capture, 800);
  } catch (err) {
    const reasons = {
      NotAllowedError: "Camera permission was denied. Allow it in your browser's site settings and try again.",
      NotFoundError: "No camera was found on this device.",
      NotReadableError: "The camera is being used by another app.",
    };
    setStatus(reasons[err.name] || `Could not start camera: ${err.message}`, true);
    show("step-consent");
  }
}

function capture() {
  const w = video.videoWidth, h = video.videoHeight;
  if (!w || !h) { setStatus("Camera still starting, hold on…", true); return; }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.translate(w, 0);
  ctx.scale(-1, 1); // match the mirrored preview
  ctx.drawImage(video, 0, 0, w, h);
  canvas.toBlob((blob) => {
    photoBlob = blob;
    preview.src = URL.createObjectURL(blob);
    stopCamera();
    show("step-review");
  }, "image/jpeg", 0.85);
}

async function send() {
  if (!photoBlob) return;
  const btn = $("btn-send");
  btn.disabled = true;
  setStatus("Sending…");
  try {
    const name = ($("name").value || "anonymous").trim().replace(/[^\w -]/g, "").slice(0, 60) || "anonymous";
    const id = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const fileRef = ref(storage, `${PHOTO_FOLDER}/${id}.jpg`);
    await uploadBytes(fileRef, photoBlob, {
      contentType: "image/jpeg",
      customMetadata: { name, sentAt: new Date().toISOString() },
    });
    photoBlob = null;
    setStatus("");
    show("step-done");
  } catch (err) {
    setStatus(`Upload failed: ${err.code || err.message}`, true);
    btn.disabled = false;
  }
}

$("consent").addEventListener("change", (e) => ($("btn-start").disabled = !e.target.checked));
$("btn-start").addEventListener("click", startCamera);
$("btn-retake").addEventListener("click", startCamera);
$("btn-send").addEventListener("click", send);
$("btn-again").addEventListener("click", () => { $("btn-send").disabled = false; startCamera(); });
window.addEventListener("pagehide", stopCamera);
