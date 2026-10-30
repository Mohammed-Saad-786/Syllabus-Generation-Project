document.addEventListener("DOMContentLoaded", () => {
  const textElement = document.getElementById("intro-text");

  if (!textElement || textElement.dataset.started) return;

  textElement.dataset.started = "true";

  const message =
    "This is an AI-powered Syllabus Generation application. I'll help you draft a complete, editable course syllabus in seconds.";

  let index = 0;

  function typeWriter() {
    if (index < message.length) {
      textElement.textContent += message.charAt(index);
      index++;
      setTimeout(typeWriter, 35);
    }
  }

  typeWriter();
});