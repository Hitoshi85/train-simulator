// Render counters and the test hook object (window.__train), shared by all modules.

const stats = { catsDrawn: 0, frames: 0, trainDrawn: 0, gradePostsDrawn: 0, passDrawn: 0, insets: {}, lastInsets: [], mirrored: 0, trees: 0, birds: 0, fireflies: 0, landmarks: {}, glows: 0, precip: 0, feedbackOpened: 0, pawDrawn: 0, pawCoat: '', pawY: 0, lastFeedbackUrl: '' }; // render counters for automated tests
// The test hook (window.__train); game.js adds the rest. Tests set `paused` to drive the game by hand.
const hook = { paused: false };

export { stats, hook };
