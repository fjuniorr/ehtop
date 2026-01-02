// Game State
let gameState = {
    players: [],
    currentPlayerIndex: 0,
    currentQuestionIndex: 0,
    currentRound: 1,
    questions: [],
    revealedItems: [],
    currentGuess: null,
    currentGuesser: null,
    currentChallenger: null,
    playersInRound: [],
    lastGuessPlayerId: null,
    guessHistory: [],
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

function playRoundWinSound() {
    playSoundSequence([
        { frequency: 440, duration: 0.1, type: 'triangle', gain: 0.2 },
        { frequency: 554, duration: 0.12, type: 'triangle', gain: 0.2 },
        { frequency: 659, duration: 0.14, type: 'triangle', gain: 0.2 }
    ]);
}

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const revealModal = document.getElementById('reveal-modal');
const gameoverScreen = document.getElementById('gameover-screen');

// Setup elements
const playerInputsContainer = document.getElementById('player-inputs');
const addPlayerBtn = document.getElementById('add-player-btn');
const startGameBtn = document.getElementById('start-game-btn');
const setupError = document.getElementById('setup-error');
const deckSelect = document.getElementById('deck-select');

// Game elements
const currentCategory = document.getElementById('current-category');
const roundNumber = document.getElementById('round-number');
const playersArea = document.getElementById('players-area');
const currentPlayerDisplay = document.getElementById('current-player-name');
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
const guesserName = document.getElementById('guesser-name');
const currentGuessText = document.getElementById('current-guess');
const challengerSelect = document.getElementById('challenger-select');
const challengerError = document.getElementById('challenger-error');
const challengeBtn = document.getElementById('challenge-btn');
const acceptBtn = document.getElementById('accept-btn');
const skipQuestionBtn = document.getElementById('skip-question-btn');

// Reveal modal elements
const revealedGuess = document.getElementById('revealed-guess');
const revealedChallenger = document.getElementById('revealed-challenger');
const resultText = document.getElementById('result-text');
const revealList = document.getElementById('reveal-list');
const roundOutcome = document.getElementById('round-outcome');
const continueBtn = document.getElementById('continue-btn');

// Game over elements
const winnerDisplay = document.getElementById('winner-display');
const finalScoresList = document.getElementById('final-scores-list');
const playAgainBtn = document.getElementById('play-again-btn');
const guessHistoryList = document.getElementById('guess-history-list');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadGameData();
    setupEventListeners();
    initializeDragAndDrop();
});

// Initialize drag and drop for initial player inputs
function initializeDragAndDrop() {
    const initialWrappers = playerInputsContainer.querySelectorAll('.player-input-wrapper');
    initialWrappers.forEach(wrapper => {
        setupDragAndDrop(wrapper);
    });
}

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
    addPlayerBtn.addEventListener('click', addPlayerInput);
    startGameBtn.addEventListener('click', startGame);
    guessBtn.addEventListener('click', showGuessInput);
    passBtn.addEventListener('click', handlePass);
    submitGuessBtn.addEventListener('click', submitGuess);
    cancelGuessBtn.addEventListener('click', hideGuessInput);
    challengeBtn.addEventListener('click', handleChallenge);
    acceptBtn.addEventListener('click', handleAccept);
    continueBtn.addEventListener('click', continueGame);
    playAgainBtn.addEventListener('click', resetGame);
    skipQuestionBtn.addEventListener('click', handleSkipQuestion);
    challengerSelect.addEventListener('change', () => {
        if (challengerSelect.value) {
            challengerError.classList.add('hidden');
            challengerError.textContent = '';
        }
    });
}

// Add player input field
function addPlayerInput() {
    const playerInputs = document.querySelectorAll('.player-name-input');
    if (playerInputs.length >= 10) {
        setupError.textContent = 'Máximo de 10 jogadores!';
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'player-input-wrapper';
    wrapper.draggable = true;

    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.textContent = '☰';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'player-name-input';
    input.placeholder = `Jogador ${playerInputs.length + 1}`;
    input.maxLength = 20;

    wrapper.appendChild(dragHandle);
    wrapper.appendChild(input);
    playerInputsContainer.appendChild(wrapper);

    setupDragAndDrop(wrapper);
    setupError.textContent = '';
}

// Setup drag and drop for player inputs
function setupDragAndDrop(wrapper) {
    wrapper.addEventListener('dragstart', handleDragStart);
    wrapper.addEventListener('dragover', handleDragOver);
    wrapper.addEventListener('drop', handleDrop);
    wrapper.addEventListener('dragend', handleDragEnd);
    wrapper.addEventListener('dragenter', handleDragEnter);
    wrapper.addEventListener('dragleave', handleDragLeave);
}

let draggedElement = null;

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (this !== draggedElement) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (draggedElement !== this) {
        const allWrappers = Array.from(playerInputsContainer.querySelectorAll('.player-input-wrapper'));
        const draggedIndex = allWrappers.indexOf(draggedElement);
        const targetIndex = allWrappers.indexOf(this);

        if (draggedIndex < targetIndex) {
            this.parentNode.insertBefore(draggedElement, this.nextSibling);
        } else {
            this.parentNode.insertBefore(draggedElement, this);
        }
    }

    this.classList.remove('drag-over');
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    const allWrappers = playerInputsContainer.querySelectorAll('.player-input-wrapper');
    allWrappers.forEach(wrapper => {
        wrapper.classList.remove('drag-over');
    });
}

// Start game
function startGame() {
    const playerInputs = document.querySelectorAll('.player-name-input');
    const playerNames = Array.from(playerInputs)
        .map(input => input.value.trim())
        .filter(name => name !== '');

    if (playerNames.length < 2) {
        setupError.textContent = 'Adicione pelo menos 2 jogadores!';
        return;
    }

    gameState.selectedDeckIndex = parseInt(deckSelect.value);
    gameState.questions = shuffleArray([...gameState.gameData.decks[gameState.selectedDeckIndex].questions]);

    // Initialize players (order determined by input field order)
    const initializedPlayers = playerNames.map((name, index) => ({
        id: index,
        name: name,
        lives: 4,
        cards: 0,
        eliminated: false
    }));

    gameState.players = initializedPlayers;

    gameState.currentPlayerIndex = 0;
    gameState.currentQuestionIndex = 0;
    gameState.currentRound = 1;
    gameState.lastGuessPlayerId = null;
    gameState.guessHistory = [];

    switchScreen(setupScreen, gameScreen);
    startNewRound();
    renderGuessHistory();
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
    gameState.currentGuesser = null;
    gameState.currentChallenger = null;
    gameState.lastGuessPlayerId = null;
    gameState.guessHistory = [];
    gameState.playersInRound = gameState.players
        .filter(p => !p.eliminated)
        .map(p => ({ ...p, passed: false }));

    offerNextActivePlayer();

    currentCategory.textContent = question.category;
    roundNumber.textContent = `Rodada ${gameState.currentRound}`;

    // Stop any running timers
    stopTurnTimer();
    stopChallengeTimer();

    renderPlayers();
    updateCurrentPlayerDisplay();
    hideGuessInput();
    hideChallengeArea();
    showActionButtons();
    renderGuessHistory();
}

// Render players
function renderPlayers() {
    playersArea.innerHTML = '';

    gameState.players.forEach((player, index) => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';

        if (player.eliminated) {
            playerCard.classList.add('eliminated');
        }

        const playerInRound = gameState.playersInRound.find(p => p.id === player.id);
        if (playerInRound && playerInRound.passed) {
            playerCard.classList.add('passed');
        }

        if (index === gameState.currentPlayerIndex && !player.eliminated) {
            playerCard.classList.add('current');
        }

        // Lives (hearts)
        let livesHTML = '';
        for (let i = 0; i < 4; i++) {
            if (i < player.lives) {
                livesHTML += '<span class="heart">❤️</span>';
            } else {
                livesHTML += '<span class="heart lost">🖤</span>';
            }
        }

        // Cards (points)
        let cardsHTML = '';
        for (let i = 0; i < player.cards; i++) {
            cardsHTML += '<span class="card">🃏</span>';
        }

        playerCard.innerHTML = `
            <div class="player-name">${player.name}</div>
            <div class="player-stats">
                <div class="lives">${livesHTML}</div>
                <div class="points">${cardsHTML}</div>
            </div>
        `;

        playersArea.appendChild(playerCard);
    });
}

// Update current player display
function updateCurrentPlayerDisplay() {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    currentPlayerDisplay.textContent = currentPlayer.name;
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

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    gameState.currentGuess = guess;
    gameState.currentGuesser = currentPlayer;
    gameState.currentChallenger = null;
    gameState.lastGuessPlayerId = currentPlayer.id;
    gameState.guessHistory.push({
        round: gameState.currentRound,
        playerName: currentPlayer.name,
        guess: guess
    });
    renderGuessHistory();

    hideGuessInput();
    stopTurnTimer();
    showChallengeArea();
}

// Handle pass
function handlePass() {
    stopTurnTimer();
    const playerInRound = gameState.playersInRound.find(
        p => p.id === gameState.players[gameState.currentPlayerIndex].id
    );

    if (playerInRound) {
        playerInRound.passed = true;
    }

    renderPlayers();
    checkRoundEnd();
}

// Show challenge area
function showChallengeArea() {
    guesserName.textContent = gameState.currentGuesser.name;
    currentGuessText.textContent = gameState.currentGuess;
    gameState.currentChallenger = null;
    populateChallengerSelect();

    hideActionButtons();
    challengeArea.classList.remove('hidden');
    startChallengeTimer();
}

// Hide challenge area
function hideChallengeArea() {
    challengeArea.classList.add('hidden');
    challengerError.classList.add('hidden');
    challengerError.textContent = '';
    stopChallengeTimer();
}

function populateChallengerSelect() {
    const availableChallengers = gameState.playersInRound
        .filter(player => !player.passed && player.id !== gameState.currentGuesser.id)
        .map(player => gameState.players.find(p => p.id === player.id))
        .filter(player => player && !player.eliminated);

    challengerSelect.innerHTML = '';
    challengerSelect.disabled = availableChallengers.length === 0;
    challengeBtn.disabled = availableChallengers.length === 0;
    challengerError.classList.add('hidden');
    challengerError.textContent = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = availableChallengers.length
        ? 'Selecione o desafiante'
        : 'Nenhum desafiante disponível';
    placeholder.disabled = true;
    placeholder.selected = true;
    challengerSelect.appendChild(placeholder);

    availableChallengers.forEach(player => {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = player.name;
        challengerSelect.appendChild(option);
    });
}

// Handle challenge
function handleChallenge() {
    if (challengerSelect.disabled) {
        return;
    }

    const challengerId = parseInt(challengerSelect.value, 10);
    if (Number.isNaN(challengerId)) {
        challengerError.textContent = 'Selecione quem desafiou antes de continuar.';
        challengerError.classList.remove('hidden');
        return;
    }

    gameState.currentChallenger = gameState.players.find(player => player.id === challengerId) || null;
    if (!gameState.currentChallenger) {
        challengerError.textContent = 'Desafiante inválido para esta rodada.';
        challengerError.classList.remove('hidden');
        return;
    }

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
    stopChallengeTimer();
    hideChallengeArea();
    moveToNextPlayer();
    checkRoundEnd();
}

// Handle skip question
function handleSkipQuestion() {
    // Stop any running timers
    stopTurnTimer();
    stopChallengeTimer();

    // Hide any active input areas
    hideGuessInput();
    hideChallengeArea();

    // Skip to next round without awarding cards
    endRound(null);
}

// Show reveal modal
function showRevealModal(isCorrect, wasChallenged) {
    const question = gameState.questions[gameState.currentQuestionIndex];

    revealedGuess.textContent = gameState.currentGuess;
    revealedChallenger.textContent = gameState.currentChallenger
        ? gameState.currentChallenger.name
        : 'N/A';
    resultText.textContent = isCorrect ? 'É TOP!' : 'NÃO É TOP!';
    resultText.className = `result-text ${isCorrect ? 'correct' : 'incorrect'}`;

    revealList.innerHTML = '';
    if (wasChallenged) {
        question.top10.forEach((item, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${item}`;
            revealList.appendChild(li);
        });
    }

    // Determine outcome
    let outcomeHTML = '';

    if (wasChallenged) {
        const challengerName = gameState.currentChallenger
            ? gameState.currentChallenger.name
            : 'O desafiante';
        if (isCorrect) {
            // Guess was correct, challenger loses life
            outcomeHTML = `Desafio resolvido. ${challengerName} perde 1 vida.`;
        } else {
            // Guess was incorrect, guesser loses life, challenger wins card
            outcomeHTML = `Desafio resolvido. ${gameState.currentGuesser.name} perde 1 vida e ${challengerName} ganha 1 carta.`;
        }
    }

    roundOutcome.innerHTML = outcomeHTML;

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

    // Only process challenge outcomes (since handleAccept handles non-challenge cases)
    if (wasChallenged) {
        const challenger = gameState.currentChallenger;
        if (!challenger) {
            renderPlayers();
            moveToNextPlayer();
            checkRoundEnd();
            return;
        }
        if (isCorrect) {
            // Challenger loses life - we need to ask who challenged
            loseLife(challenger);

            // Remove challenger from round
            const challengerInRound = gameState.playersInRound.find(
                p => p.id === challenger.id
            );
            if (challengerInRound) {
                challengerInRound.passed = true;
            }
        } else {
            // Guesser loses life
            loseLife(gameState.currentGuesser);

            // Challenger wins card
            challenger.cards++;

            if (checkWinCondition(challenger)) {
                return;
            }

            // Remove guesser from round
            const guesserInRound = gameState.playersInRound.find(
                p => p.id === gameState.currentGuesser.id
            );
            if (guesserInRound) {
                guesserInRound.passed = true;
            }

            // End round, challenger won
            endRound(challenger.id);
            return;
        }
    }

    renderPlayers();
    moveToNextPlayer();
    checkRoundEnd();
}

// Lose life
function loseLife(player) {
    player.lives--;

    if (player.lives <= 0) {
        player.eliminated = true;

        // Check if only one player remains
        const activePlayers = gameState.players.filter(p => !p.eliminated);
        if (activePlayers.length === 1) {
            endGame(activePlayers[0]);
        }
    }
}

// Check win condition
function checkWinCondition(player) {
    if (player.cards >= 4) {
        endGame(player);
        return true;
    }
    return false;
}

// Move to next player
function moveToNextPlayer() {
    let nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    let attempts = 0;

    // Skip eliminated or passed players when possible
    while (attempts < gameState.players.length) {
        const candidate = gameState.players[nextIndex];
        const inRound = gameState.playersInRound.find(p => p.id === candidate.id);
        const isPassed = inRound ? inRound.passed : false;

        if (!candidate.eliminated && !isPassed) {
            break;
        }
        nextIndex = (nextIndex + 1) % gameState.players.length;
        attempts++;
    }

    gameState.currentPlayerIndex = nextIndex;
    updateCurrentPlayerDisplay();
    renderPlayers();
}

function offerNextActivePlayer() {
    const activePlayers = gameState.players.filter(p => !p.eliminated);
    if (!activePlayers.length) {
        return false;
    }

    let nextIndex = gameState.currentPlayerIndex % gameState.players.length;
    let attempts = 0;
    while (attempts < gameState.players.length) {
        const candidate = gameState.players[nextIndex];
        if (candidate && !candidate.eliminated) {
            gameState.currentPlayerIndex = nextIndex;
            return true;
        }
        nextIndex = (nextIndex + 1) % gameState.players.length;
        attempts++;
    }

    return false;
}

function setStarterAfterWinner(winnerId) {
    if (winnerId === null || winnerId === undefined) {
        return;
    }

    const winnerIndex = gameState.players.findIndex(p => p.id === winnerId);
    if (winnerIndex === -1) {
        return;
    }

    let nextIndex = (winnerIndex + 1) % gameState.players.length;
    let attempts = 0;
    while (attempts < gameState.players.length) {
        const candidate = gameState.players[nextIndex];
        if (candidate && !candidate.eliminated) {
            gameState.currentPlayerIndex = nextIndex;
            return;
        }
        nextIndex = (nextIndex + 1) % gameState.players.length;
        attempts++;
    }
}

// Check if round should end
function checkRoundEnd() {
    const activePlayers = gameState.playersInRound.filter(p => !p.passed && !p.eliminated);

    if (activePlayers.length === 1) {
        // Last player wins the card
        const winner = gameState.players.find(p => p.id === activePlayers[0].id);
        winner.cards++;
        playRoundWinSound();

        if (checkWinCondition(winner)) {
            return;
        }

        endRound(winner.id);
    } else if (activePlayers.length === 0) {
        // All players passed or eliminated, last guesser wins if available
        const lastGuesser = gameState.players.find(p => p.id === gameState.lastGuessPlayerId);
        if (lastGuesser && !lastGuesser.eliminated) {
            lastGuesser.cards++;

            if (checkWinCondition(lastGuesser)) {
                return;
            }

            endRound(lastGuesser.id);
        } else {
            endRound(null);
        }
    } else {
        // Continue round
        showActionButtons();
    }
}

// End round
function endRound(winnerId) {
    setStarterAfterWinner(winnerId);
    gameState.currentQuestionIndex++;
    gameState.currentRound++;

    setTimeout(() => {
        startNewRound();
    }, 500);
}

// Show/hide UI elements
function showActionButtons() {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const playerInRound = gameState.playersInRound.find(p => p.id === currentPlayer.id);

    if (playerInRound && !playerInRound.passed) {
        actionButtons.classList.remove('hidden');
        startTurnTimer();
    } else {
        actionButtons.classList.add('hidden');
        moveToNextPlayer();
        renderPlayers();
        checkRoundEnd();
    }
}

function hideActionButtons() {
    actionButtons.classList.add('hidden');
    stopTurnTimer();
}

// End game
function endGame(winner) {
    switchScreen(gameScreen, gameoverScreen);

    winnerDisplay.innerHTML = `
        <h2>🎉 Vencedor 🎉</h2>
        <div class="winner-name">${winner.name}</div>
    `;

    // Sort players by cards, then by lives
    const sortedPlayers = [...gameState.players].sort((a, b) => {
        if (b.cards !== a.cards) {
            return b.cards - a.cards;
        }
        return b.lives - a.lives;
    });

    finalScoresList.innerHTML = '';
    sortedPlayers.forEach(player => {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';

        if (player.id === winner.id) {
            scoreItem.classList.add('winner');
        }

        scoreItem.innerHTML = `
            <span>${player.name}</span>
            <span>${player.cards} cartas | ${player.lives} vidas</span>
        `;

        finalScoresList.appendChild(scoreItem);
    });
}

// Reset game
function resetGame() {
    // Stop any running timers
    stopTurnTimer();
    stopChallengeTimer();

    gameState = {
        players: [],
        currentPlayerIndex: 0,
        currentQuestionIndex: 0,
        currentRound: 1,
        questions: [],
        revealedItems: [],
        currentGuess: null,
        currentGuesser: null,
        currentChallenger: null,
        playersInRound: [],
        lastGuessPlayerId: null,
        guessHistory: [],
        gameData: gameState.gameData,
        selectedDeckIndex: 0,
        turnTimerInterval: null,
        turnTimerSeconds: 0,
        challengeTimerInterval: null,
        challengeTimerSeconds: 0
    };

    switchScreen(gameoverScreen, setupScreen);
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

function renderGuessHistory() {
    guessHistoryList.innerHTML = '';

    if (!gameState.guessHistory.length) {
        const emptyItem = document.createElement('li');
        emptyItem.textContent = 'Nenhum palpite ainda.';
        guessHistoryList.appendChild(emptyItem);
        return;
    }

    gameState.guessHistory.forEach(entry => {
        const li = document.createElement('li');
        li.textContent = `R${entry.round} · ${entry.playerName}: ${entry.guess}`;
        guessHistoryList.appendChild(li);
    });
}
