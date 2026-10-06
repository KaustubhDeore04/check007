/* Home page only: ties the hero video's playhead directly to scroll
   position across the pinned (sticky) hero section. The video never
   plays on its own — scrolling is the only thing that moves it. */
(function () {
  const video = document.getElementById('hero-video');
  const pin = document.querySelector('.hero-pin');
  if (!video || !pin || !window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  let ready = false;

  function setup() {
    if (ready || !video.duration) return;
    ready = true;

    video.pause();
    video.currentTime = 0;

    ScrollTrigger.create({
      trigger: pin,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.4,
      onUpdate(self) {
        const target = self.progress * (video.duration - 0.05);
        // Guard against redundant seeks so scrubbing stays smooth on
        // lower-powered devices.
        if (Math.abs(video.currentTime - target) > 0.02) {
          video.currentTime = target;
        }
      },
    });
  }

  // Unlock frame seeking on mobile browsers, then hand control to scroll.
  // Some browsers auto-play a muted/playsinline video the moment it's
  // visible, which is exactly what we don't want here — the video should
  // only ever move because of scroll. Force it back to paused any time
  // anything (browser heuristics included) tries to play it.
  function forcePause() {
    if (!video.paused) video.pause();
  }
  video.addEventListener('play', forcePause);
  video.addEventListener('playing', forcePause);

  video.autoplay = false;
  video.removeAttribute('autoplay');
  video.loop = false;
  video.muted = true;
  video.playsInline = true;

  const playAttempt = video.play();
  if (playAttempt && playAttempt.then) {
    playAttempt.then(() => video.pause()).catch(() => {});
  } else {
    video.pause();
  }

  if (video.readyState >= 1) {
    setup();
  } else {
    video.addEventListener('loadedmetadata', setup, { once: true });
  }
})();
