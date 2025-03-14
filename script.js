let audioBlob = null;
let isSpeaking = false;
let mediaRecorder = null;
let audioChunks = [];
let audioContext = null;
let voices = [];

async function loadVoices() {
  voices = window.speechSynthesis.getVoices();
  const voiceSelect = document.getElementById("voice-select");
  voiceSelect.innerHTML = voices
    .map(
      (voice, index) =>
        `<option value="${index}">${voice.name} (${voice.lang})</option>`
    )
    .join("");
}

window.speechSynthesis.onvoiceschanged = loadVoices;

async function toggleAudio() {
  if (isSpeaking) {
    stopSpeech();
  } else {
    await generateSpeech();
  }
}

async function generateSpeech() {
  const text = document.querySelector("textarea").value;
  const voiceIndex = document.getElementById("voice-select").value;

  if (!text) {
    alert("Please enter some text");
    return;
  }

  // Initialize audio context on user gesture
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    await audioContext.resume();
  }

  const progressBar = document.querySelector(".progress-bar");
  const progressContainer = document.querySelector(".progress-container");
  progressContainer.style.display = "block";
  progressBar.style.width = "0%";

  try {
    // Create audio stream destination
    const destination = audioContext.createMediaStreamDestination();
    mediaRecorder = new MediaRecorder(destination.stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      audioBlob = new Blob(audioChunks, { type: "audio/wav" });
      document.getElementById("download-btn").classList.remove("hidden");
    };

    // Create speech synthesis and connect to audio context
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices[voiceIndex];

    const source = audioContext.createMediaStreamSource(
      new MediaStream([destination.stream.getAudioTracks()[0]])
    );
    source.connect(audioContext.destination);

    // Setup audio processing
    const processor = audioContext.createScriptProcessor(2048, 1, 1);
    processor.connect(destination);

    utterance.onend = () => {
      processor.disconnect();
      mediaRecorder.stop();
      progressBar.style.width = "100%";
      setTimeout(() => (progressContainer.style.display = "none"), 1000);
      isSpeaking = false;
    };

    utterance.onboundary = (event) => {
      const progress = (event.charIndex / text.length) * 100;
      progressBar.style.width = `${Math.min(progress, 100)}%`;
    };

    mediaRecorder.start();
    window.speechSynthesis.speak(utterance);
    isSpeaking = true;
  } catch (error) {
    alert("Error generating speech: " + error.message);
  }
}

function stopSpeech() {
  window.speechSynthesis.cancel();
  if (mediaRecorder) mediaRecorder.stop();
  isSpeaking = false;
  document.querySelector(".progress-container").style.display = "none";
}

function downloadAudio() {
  if (!audioBlob) return;

  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `speech-${Date.now()}.wav`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}