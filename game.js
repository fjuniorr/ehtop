// Game State
let gameState = {
    currentQuestionIndex: 0,
    currentRound: 1,
    questions: [],
    revealedItems: [],
    currentGuess: null,
    gameData: null,
    selectedDeckIndex: 0,
    turnTimerInterval: null,
    turnTimerSeconds: 0,
    challengeTimerInterval: null,
    challengeTimerSeconds: 0
};

// Audio helpers
let audioContext = null;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function playSoundSequence(sequence) {
    const context = getAudioContext();
    if (context.state === 'suspended') {
        context.resume();
    }

    let startTime = context.currentTime;
    sequence.forEach(({ frequency, duration, type = 'sine', gain = 0.2, gap = 0.02 }) => {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gainNode.gain.value = gain;

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);

        startTime += duration + gap;
    });
}

function playChallengeSound() {
    playSoundSequence([
        { frequency: 392, duration: 0.08, type: 'square', gain: 0.18 },
        { frequency: 523, duration: 0.1, type: 'square', gain: 0.18 }
    ]);
}

function playCorrectChallengeSound() {
    playSoundSequence([
        { frequency: 523, duration: 0.12, type: 'triangle', gain: 0.2 },
        { frequency: 659, duration: 0.12, type: 'triangle', gain: 0.2 },
        { frequency: 784, duration: 0.14, type: 'triangle', gain: 0.2 }
    ]);
}

function playIncorrectChallengeSound() {
    playSoundSequence([
        { frequency: 220, duration: 0.14, type: 'sawtooth', gain: 0.22 },
        { frequency: 196, duration: 0.16, type: 'sawtooth', gain: 0.22 }
    ]);
}

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const revealModal = document.getElementById('reveal-modal');

// Setup elements
const startGameBtn = document.getElementById('start-game-btn');
const setupError = document.getElementById('setup-error');
const deckSelect = document.getElementById('deck-select');

// Game elements
const currentCategory = document.getElementById('current-category');
const roundNumber = document.getElementById('round-number');
const top10List = document.getElementById('top10-list');
const turnTimerElement = document.getElementById('turn-timer');
const turnTimerValue = document.getElementById('turn-timer-value');
const challengeTimerElement = document.getElementById('challenge-timer');
const challengeTimerValue = document.getElementById('challenge-timer-value');
const guessBtn = document.getElementById('guess-btn');
const passBtn = document.getElementById('pass-btn');
const guessInputArea = document.getElementById('guess-input-area');
const guessInput = document.getElementById('guess-input');
const guessError = document.getElementById('guess-error');
const submitGuessBtn = document.getElementById('submit-guess-btn');
const cancelGuessBtn = document.getElementById('cancel-guess-btn');
const actionButtons = document.getElementById('action-buttons');
const challengeArea = document.getElementById('challenge-area');
const currentGuessText = document.getElementById('current-guess');
const challengeBtn = document.getElementById('challenge-btn');
const acceptBtn = document.getElementById('accept-btn');

// Reveal modal elements
const revealedGuess = document.getElementById('revealed-guess');
const resultText = document.getElementById('result-text');
const revealList = document.getElementById('reveal-list');
const roundOutcome = document.getElementById('round-outcome');
const continueBtn = document.getElementById('continue-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadGameData();
    setupEventListeners();
});

// Load game data from JSON
async function loadGameData() {
    try {
        const response = await fetch('questions.json');
        gameState.gameData = await response.json();
        populateDeckSelect();
    } catch (error) {
        console.error('Error loading game data:', error);
        setupError.textContent = 'Erro ao carregar dados do jogo!';
    }
}

// Populate deck selection
function populateDeckSelect() {
    deckSelect.innerHTML = '';
    gameState.gameData.decks.forEach((deck, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = deck.theme;
        deckSelect.appendChild(option);
    });
}

// Setup Event Listeners
function setupEventListeners() {
    startGameBtn.addEventListener('click', startGame);
    guessBtn.addEventListener('click', showGuessInput);
    passBtn.addEventListener('click', handlePass);
    submitGuessBtn.addEventListener('click', submitGuess);
    cancelGuessBtn.addEventListener('click', hideGuessInput);
    challengeBtn.addEventListener('click', handleChallenge);
    acceptBtn.addEventListener('click', handleAccept);
    continueBtn.addEventListener('click', continueGame);
}

// Start game
function startGame() {
    setupError.textContent = '';
    gameState.selectedDeckIndex = parseInt(deckSelect.value);
    gameState.questions = shuffleArray([...gameState.gameData.decks[gameState.selectedDeckIndex].questions]);
    gameState.currentQuestionIndex = 0;
    gameState.currentRound = 1;

    switchScreen(setupScreen, gameScreen);
    startNewRound();
}

// Start new round
function startNewRound() {
    if (gameState.currentQuestionIndex >= gameState.questions.length) {
        // Shuffle and reuse questions if we run out
        gameState.questions = shuffleArray([...gameState.gameData.decks[gameState.selectedDeckIndex].questions]);
        gameState.currentQuestionIndex = 0;
    }

    const question = gameState.questions[gameState.currentQuestionIndex];
    gameState.revealedItems = [];
    gameState.currentGuess = null;

    currentCategory.textContent = question.category;
    roundNumber.textContent = `Rodada ${gameState.currentRound}`;

    // Stop any running timers
    stopTurnTimer();
    stopChallengeTimer();

    renderTop10List();
    hideGuessInput();
    hideChallengeArea();
    showActionButtons();
}

// Render Top 10 list
function renderTop10List() {
    const items = top10List.querySelectorAll('.top10-item');
    items.forEach((item, index) => {
        const textSpan = item.querySelector('.item-text');

        if (gameState.revealedItems.includes(index)) {
            const question = gameState.questions[gameState.currentQuestionIndex];
            textSpan.textContent = question.top10[index];
            item.classList.add('revealed');
            item.classList.remove('hidden');
        } else {
            textSpan.textContent = '???';
            item.classList.remove('revealed');
            item.classList.add('hidden');
        }
    });
}

// Timer functions
function startTurnTimer() {
    stopTurnTimer();
    gameState.turnTimerSeconds = 0;
    turnTimerElement.classList.remove('hidden');
    turnTimerValue.textContent = '0s';

    gameState.turnTimerInterval = setInterval(() => {
        gameState.turnTimerSeconds++;
        turnTimerValue.textContent = `${gameState.turnTimerSeconds}s`;
    }, 1000);
}

function stopTurnTimer() {
    if (gameState.turnTimerInterval) {
        clearInterval(gameState.turnTimerInterval);
        gameState.turnTimerInterval = null;
    }
    turnTimerElement.classList.add('hidden');
    gameState.turnTimerSeconds = 0;
}

function startChallengeTimer() {
    stopChallengeTimer();
    gameState.challengeTimerSeconds = 0;
    challengeTimerElement.classList.remove('hidden');
    challengeTimerValue.textContent = '0s';

    gameState.challengeTimerInterval = setInterval(() => {
        gameState.challengeTimerSeconds++;
        challengeTimerValue.textContent = `${gameState.challengeTimerSeconds}s`;
    }, 1000);
}

function stopChallengeTimer() {
    if (gameState.challengeTimerInterval) {
        clearInterval(gameState.challengeTimerInterval);
        gameState.challengeTimerInterval = null;
    }
    challengeTimerElement.classList.add('hidden');
    gameState.challengeTimerSeconds = 0;
}

// Show guess input
function showGuessInput() {
    hideActionButtons();
    guessInputArea.classList.remove('hidden');
    guessInput.value = '';
    guessError.classList.add('hidden');
    guessError.textContent = '';
    guessInput.focus();
    // Timer continues while typing
}

// Hide guess input
function hideGuessInput() {
    guessInputArea.classList.add('hidden');
    guessError.classList.add('hidden');
    guessError.textContent = '';
    showActionButtons();
}

// Submit guess
function submitGuess() {
    const guess = guessInput.value.trim();

    if (!guess) {
        return;
    }

    gameState.currentGuess = guess;

    hideGuessInput();
    stopTurnTimer();
    showChallengeArea();
}

// Handle pass
function handlePass() {
    stopTurnTimer();
    endRound();
}

// Show challenge area
function showChallengeArea() {
    currentGuessText.textContent = gameState.currentGuess;

    hideActionButtons();
    challengeArea.classList.remove('hidden');
    startChallengeTimer();
}

// Hide challenge area
function hideChallengeArea() {
    challengeArea.classList.add('hidden');
    stopChallengeTimer();
}

// Handle challenge
function handleChallenge() {
    const question = gameState.questions[gameState.currentQuestionIndex];
    const normalizedGuess = normalizeString(gameState.currentGuess);
    const isCorrect = question.top10.some(item => normalizeString(item) === normalizedGuess);

    playChallengeSound();
    stopChallengeTimer();
    hideChallengeArea();
    showRevealModal(isCorrect, true);
}

// Handle accept (no challenge)
function handleAccept() {
    const question = gameState.questions[gameState.currentQuestionIndex];
    const normalizedGuess = normalizeString(gameState.currentGuess);
    const isCorrect = question.top10.some(item => normalizeString(item) === normalizedGuess);

    stopChallengeTimer();
    hideChallengeArea();

    if (isCorrect) {
        // Reveal the item
        const index = question.top10.findIndex(item => normalizeString(item) === normalizedGuess);
        if (index !== -1 && !gameState.revealedItems.includes(index)) {
            gameState.revealedItems.push(index);
            renderTop10List();
        }
    }

    checkRoundEnd();
}

// Show reveal modal
function showRevealModal(isCorrect, wasChallenged) {
    const question = gameState.questions[gameState.currentQuestionIndex];

    revealedGuess.textContent = gameState.currentGuess;

    if (isCorrect) {
        resultText.textContent = 'É TOP! ✅';
        resultText.className = 'result-text correct';
    } else {
        resultText.textContent = 'NÃO É TOP! ❌';
        resultText.className = 'result-text incorrect';
    }

    if (wasChallenged) {
        if (isCorrect) {
            playCorrectChallengeSound();
        } else {
            playIncorrectChallengeSound();
        }
    }

    // Show full top 10 list
    revealList.innerHTML = '';
    const normalizedGuess = normalizeString(gameState.currentGuess);
    question.top10.forEach((item, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${item}`;

        // Highlight the guessed item if it matches
        if (normalizeString(item) === normalizedGuess) {
            li.style.fontWeight = 'bold';
            li.style.background = '#ffd700';
            li.style.padding = '5px';
            li.style.borderRadius = '3px';
        }

        revealList.appendChild(li);
    });

    // Determine outcome
    let outcomeHTML = '';

    if (wasChallenged) {
        outcomeHTML = 'Registre vidas e pontos offline conforme o resultado.';
    }

    if (outcomeHTML) {
        roundOutcome.innerHTML = outcomeHTML;
        roundOutcome.classList.remove('hidden');
    } else {
        roundOutcome.innerHTML = '';
        roundOutcome.classList.add('hidden');
    }

    // Store outcome data for processing
    revealModal.dataset.isCorrect = isCorrect;
    revealModal.dataset.wasChallenged = wasChallenged;

    revealModal.classList.add('active');
}

// Continue game after reveal
function continueGame() {
    const isCorrect = revealModal.dataset.isCorrect === 'true';
    const wasChallenged = revealModal.dataset.wasChallenged === 'true';
    const question = gameState.questions[gameState.currentQuestionIndex];

    revealModal.classList.remove('active');

    if (wasChallenged) {
        if (isCorrect) {
            // Reveal the correct item
            const index = question.top10.findIndex(item =>
                normalizeString(item) === normalizeString(gameState.currentGuess)
            );
            if (index !== -1 && !gameState.revealedItems.includes(index)) {
                gameState.revealedItems.push(index);
            }
        }
    }

    renderTop10List();
    checkRoundEnd();
}

// Check if round should end
function checkRoundEnd() {
    const question = gameState.questions[gameState.currentQuestionIndex];
    if (gameState.revealedItems.length >= question.top10.length) {
        endRound();
        return;
    }

    showActionButtons();
}

// End round
function endRound() {
    gameState.currentQuestionIndex++;
    gameState.currentRound++;

    setTimeout(() => {
        startNewRound();
    }, 500);
}

// Show/hide UI elements
function showActionButtons() {
    actionButtons.classList.remove('hidden');
    startTurnTimer();
}

function hideActionButtons() {
    actionButtons.classList.add('hidden');
    stopTurnTimer();
}

// Utility functions
function switchScreen(from, to) {
    from.classList.remove('active');
    to.classList.add('active');
}

function normalizeString(str) {
    return str.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}
