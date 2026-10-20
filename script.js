
/* Water Drop — Project 6 */

const gameContainer = document.getElementById("game-container");
const scoreDisplay = document.getElementById("score");
const timeDisplay = document.getElementById("time");
const goalDisplay = document.getElementById("goal");
const startButton = document.getElementById("start-btn");
const resetButton = document.getElementById("reset-btn");
const soundButton = document.getElementById("sound-btn");
const difficultySelect = document.getElementById("difficulty");
const messageDisplay = document.getElementById("message");

const difficultySettings = {
    easy: {
        time: 30,
        goal: 20,
        interval: 900,
        minFall: 3.5,
        fallRange: 1.25,
        dirtyChance: 0.20
    },
    normal: {
        time: 30,
        goal: 25,
        interval: 700,
        minFall: 2.5,
        fallRange: 1.25,
        dirtyChance: 0.30
    },
    hard: {
        time: 30,
        goal: 35,
        interval: 500,
        minFall: 1.5,
        fallRange: 1,
        dirtyChance: 0.40
    }
};

// LevelUp: milestone messages stored in an array.
const milestones = [
    { score: 5, message: "Nice work! You're making progress! 💧" },
    { score: 10, message: "Halfway there! Keep collecting clean water! 🌊" },
    { score: 15, message: "Amazing! You're on a roll! ⭐" },
    { score: 20, message: "Clean water champion! Incredible work! 🏆" }
];

let score = 0;
let timeLeft = 30;
let gameRunning = false;
let dropMaker = null;
let timer = null;
let activeDrops = new Set();
let celebratedMilestones = new Set();
let soundEnabled = true;
let audioContext = null;
let currentSettings = difficultySettings.normal;

startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", resetGame);
soundButton.addEventListener("click", toggleSound);

// Update the displayed goal when difficulty changes.
difficultySelect.addEventListener("change", () => {
    if (!gameRunning) {
        currentSettings = difficultySettings[difficultySelect.value];
        goalDisplay.textContent = currentSettings.goal;
        timeDisplay.textContent = currentSettings.time;
        messageDisplay.textContent =
            `Ready? Reach ${currentSettings.goal} points before time runs out!`;
    }
});

// Create short sound effects with the browser's Web Audio API.
function playTone(frequency, duration = 0.12, type = "sine") {
    if (!soundEnabled) return;

    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        if (!audioContext) {
            audioContext = new AudioContextClass();
        }

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(0.12, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + duration
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
        // The game should still work if audio is unavailable.
        console.warn("Sound is unavailable in this browser.", error);
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    soundButton.textContent = soundEnabled ? "Sound: On" : "Sound: Off";
    soundButton.setAttribute("aria-pressed", String(soundEnabled));
    soundButton.setAttribute(
        "aria-label",
        soundEnabled ? "Turn sound off" : "Turn sound on"
    );

    if (soundEnabled) {
        playTone(520);
    }
}

function startGame() {
    clearInterval(dropMaker);
    clearInterval(timer);
    removeAllDrops();

    gameContainer.innerHTML = "";
    score = 0;
    currentSettings = difficultySettings[difficultySelect.value];
    timeLeft = currentSettings.time;
    gameRunning = true;
    celebratedMilestones.clear();

    scoreDisplay.textContent = score;
    timeDisplay.textContent = timeLeft;
    goalDisplay.textContent = currentSettings.goal;
    messageDisplay.textContent = "Catch the clean drops!";
    startButton.textContent = "Restart Game";

    playTone(520, 0.12);

    // Start creating drops.
    createDrop();
    dropMaker = setInterval(createDrop, currentSettings.interval);

    // Countdown timer.
    timer = setInterval(() => {
        timeLeft--;
        timeDisplay.textContent = timeLeft;

        if (timeLeft <= 0) {
            endGame(score >= currentSettings.goal);
        }
    }, 1000);
}

function resetGame() {
    clearInterval(dropMaker);
    clearInterval(timer);
    dropMaker = null;
    timer = null;
    gameRunning = false;
    removeAllDrops();

    currentSettings = difficultySettings[difficultySelect.value];
    score = 0;
    timeLeft = currentSettings.time;
    celebratedMilestones.clear();

    scoreDisplay.textContent = score;
    timeDisplay.textContent = timeLeft;
    goalDisplay.textContent = currentSettings.goal;
    messageDisplay.textContent =
        `Ready? Reach ${currentSettings.goal} points before time runs out!`;
    startButton.textContent = "Start Game";
    gameContainer.innerHTML = `
        <div id="start-message">
            <div class="start-drop" aria-hidden="true">💧</div>
            <h2>Ready to make a splash?</h2>
            <p>Catch blue drops for points. Avoid dirty drops!</p>
            <p class="start-hint">Choose your difficulty, then start playing.</p>
        </div>
    `;
}

function createDrop() {
    if (!gameRunning) return;

    const drop = document.createElement("button");
    const isDirty = Math.random() < currentSettings.dirtyChance;

    drop.type = "button";
    drop.className = isDirty
        ? "water-drop dirty-drop"
        : "water-drop clean-drop";

    drop.setAttribute(
        "aria-label",
        isDirty
            ? "Dirty water. Click to lose 2 points."
            : "Clean water. Click to earn 1 point."
    );

    const size = 40 + Math.random() * 18;
    drop.style.width = `${size}px`;
    drop.style.height = `${size}px`;

    const maxLeft = Math.max(0, gameContainer.clientWidth - size);
    drop.style.left = `${Math.random() * maxLeft}px`;

    const fallDuration =
        currentSettings.minFall + Math.random() * currentSettings.fallRange;

    drop.style.animationDuration = `${fallDuration}s`;

    activeDrops.add(drop);
    gameContainer.appendChild(drop);

    // Remove the drop and update the score when clicked.
    drop.addEventListener("click", () => {
        if (!gameRunning || !activeDrops.has(drop)) return;

        if (isDirty) {
            score = Math.max(0, score - 2);
            messageDisplay.textContent = "Oops! Dirty water! −2 points.";
            playTone(180, 0.2, "square");
        } else {
            score++;
            messageDisplay.textContent = "Great catch! +1 point!";
            playTone(660, 0.1);
        }

        scoreDisplay.textContent = score;
        removeDrop(drop);

        if (score > 0) {
            checkMilestones();
        }

        if (score >= currentSettings.goal) {
            endGame(true);
        }
    });

    // Remove drops that reach the bottom without being clicked.
    drop.addEventListener("animationend", () => {
        removeDrop(drop);
    });
}

function removeDrop(drop) {
    activeDrops.delete(drop);
    drop.remove();
}

function removeAllDrops() {
    activeDrops.forEach(drop => drop.remove());
    activeDrops.clear();
}

function checkMilestones() {
    for (const milestone of milestones) {
        if (
            score >= milestone.score &&
            milestone.score <= currentSettings.goal &&
            !celebratedMilestones.has(milestone.score)
        ) {
            celebratedMilestones.add(milestone.score);
            messageDisplay.textContent = milestone.message;
            playTone(880, 0.18);
        }
    }
}

function endGame(won) {
    if (!gameRunning) return;

    gameRunning = false;
    clearInterval(dropMaker);
    clearInterval(timer);
    removeAllDrops();

    if (won) {
        messageDisplay.textContent =
            "You won! You collected enough clean water! 🎉";
        playTone(660, 0.2);
        setTimeout(() => playTone(880, 0.25), 180);
        celebrateWin();
    } else {
        messageDisplay.textContent =
            `Time's up! Your final score is ${score}. Try again!`;
        playTone(220, 0.3, "triangle");
    }

    startButton.textContent = "Play Again";
}

function celebrateWin() {
    const symbols = ["🎉", "💧", "✨", "⭐"];

    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement("span");
        confetti.className = "confetti";
        confetti.textContent =
            symbols[Math.floor(Math.random() * symbols.length)];

        confetti.style.left = `${Math.random() * 95}%`;
        confetti.style.top = `${Math.random() * 65}%`;
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;

        gameContainer.appendChild(confetti);

        // Clean up the celebration elements after their animation.
        confetti.addEventListener("animationend", () => confetti.remove());
    }
}