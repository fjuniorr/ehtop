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
const restartGameBtn = document.getElementById('restart-game-btn');

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
const guessWaitingArea = document.getElementById('guess-waiting-area');
const guessWaitingText = document.getElementById('guess-waiting-text');
const actionButtons = document.getElementById('action-buttons');
const challengeArea = document.getElementById('challenge-area');
const challengerSelectionArea = document.getElementById('challenger-selection-area');
const challengerSelect = document.getElementById('challenger-select');
const challengerError = document.getElementById('challenger-error');
const confirmChallengerBtn = document.getElementById('confirm-challenger-btn');
const challengeBtn = document.getElementById('challenge-btn');
const acceptBtn = document.getElementById('accept-btn');
const verificationArea = document.getElementById('verification-area');
const top10Options = document.getElementById('top10-options');
const confirmVerificationBtn = document.getElementById('confirm-verification-btn');
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadGameData().then(() => {
        // Try to restore saved game state
        const stateLoaded = loadGameState();
        if (stateLoaded && gameState.players.length > 0) {
            // Resume the game
            switchScreen(setupScreen, gameScreen);
            renderPlayers();
            updateCurrentPlayerDisplay();

            // Update UI to match saved state
            const question = gameState.questions[gameState.currentQuestionIndex];
            if (question) {
                currentCategory.textContent = question.category;
                roundNumber.textContent = `Rodada ${gameState.currentRound}`;
            }

            // Restore timer display if needed
            if (gameState.turnTimerSeconds > 0) {
                turnTimerElement.classList.remove('hidden');
                turnTimerValue.textContent = `${gameState.turnTimerSeconds}s`;
            }
            if (gameState.challengeTimerSeconds > 0) {
                challengeTimerElement.classList.remove('hidden');
                challengeTimerValue.textContent = `${gameState.challengeTimerSeconds}s`;
            }

            // Show appropriate action buttons
            showActionButtons();
        }
    });
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
        return true;
    } catch (error) {
        console.error('Error loading game data:', error);
        setupError.textContent = 'Erro ao carregar dados do jogo!';
        return false;
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
    guessBtn.addEventListener('click', handleGuess);
    passBtn.addEventListener('click', handlePass);
    challengeBtn.addEventListener('click', showChallengerSelection);
    acceptBtn.addEventListener('click', handleAccept);
    confirmChallengerBtn.addEventListener('click', handleChallengerConfirm);
    confirmVerificationBtn.addEventListener('click', handleVerificationConfirm);
    continueBtn.addEventListener('click', continueGame);
    playAgainBtn.addEventListener('click', resetGame);
    restartGameBtn.addEventListener('click', handleRestartGame);
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
    saveGameState();
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
    hideGuessWaitingArea();
    hideChallengeArea();
    hideChallengerSelection();
    hideVerificationArea();
    showActionButtons();
    saveGameState();
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

// Handle guess (verbal, no input)
function handleGuess() {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    gameState.currentGuesser = currentPlayer;
    gameState.currentChallenger = null;
    gameState.lastGuessPlayerId = currentPlayer.id;

    hideActionButtons();
    showGuessWaitingArea();
    stopTurnTimer();
    showChallengeArea();
    saveGameState();
}

// Show guess waiting area
function showGuessWaitingArea() {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    guessWaitingText.textContent = `${currentPlayer.name} deu um palpite. Aguardando desafio...`;
    guessWaitingArea.classList.remove('hidden');
}

// Hide guess waiting area
function hideGuessWaitingArea() {
    guessWaitingArea.classList.add('hidden');
    guessWaitingText.textContent = '';
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
    saveGameState();
    checkRoundEnd();
}

// Show challenge area
function showChallengeArea() {
    hideActionButtons();
    challengeArea.classList.remove('hidden');
    startChallengeTimer();
}

// Hide challenge area
function hideChallengeArea() {
    challengeArea.classList.add('hidden');
    stopChallengeTimer();
}

// Show challenger selection
function showChallengerSelection() {
    populateChallengerSelect();
    hideChallengeArea();
    challengerSelectionArea.classList.remove('hidden');
}

// Hide challenger selection
function hideChallengerSelection() {
    challengerSelectionArea.classList.add('hidden');
    challengerError.classList.add('hidden');
    challengerError.textContent = '';
}

// Show verification area
function showVerificationArea() {
    const question = gameState.questions[gameState.currentQuestionIndex];
    top10Options.innerHTML = '';

    // Add radio buttons for each Top 10 item
    question.top10.forEach((item, index) => {
        const label = document.createElement('label');
        label.className = 'top10-option';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'top10-verification';
        radio.value = index;
        radio.id = `top10-item-${index}`;

        const text = document.createTextNode(` ${index + 1}. ${item}`);

        label.appendChild(radio);
        label.appendChild(text);
        top10Options.appendChild(label);
    });

    // Add "Não é Top!" option
    const notTopLabel = document.createElement('label');
    notTopLabel.className = 'top10-option not-top-option';

    const notTopRadio = document.createElement('input');
    notTopRadio.type = 'radio';
    notTopRadio.name = 'top10-verification';
    notTopRadio.value = 'not-top';
    notTopRadio.id = 'top10-not-top';

    const notTopText = document.createTextNode(' ❌ Não é Top!');

    notTopLabel.appendChild(notTopRadio);
    notTopLabel.appendChild(notTopText);
    top10Options.appendChild(notTopLabel);

    hideChallengerSelection();
    verificationArea.classList.remove('hidden');
}

// Hide verification area
function hideVerificationArea() {
    verificationArea.classList.add('hidden');
    top10Options.innerHTML = '';
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

// Handle challenger confirmation
function handleChallengerConfirm() {
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

    playChallengeSound();
    stopChallengeTimer();
    showVerificationArea();
}

// Handle verification confirmation
function handleVerificationConfirm() {
    const selectedOption = document.querySelector('input[name="top10-verification"]:checked');

    if (!selectedOption) {
        alert('Por favor, selecione uma opção antes de confirmar.');
        return;
    }

    const isCorrect = selectedOption.value !== 'not-top';

    hideVerificationArea();
    hideGuessWaitingArea();
    showRevealModal(isCorrect, true);
}

// Handle accept (no challenge)
function handleAccept() {
    stopChallengeTimer();
    hideChallengeArea();
    hideGuessWaitingArea();
    moveToNextPlayer();
    saveGameState();
    checkRoundEnd();
}

// Handle skip question
function handleSkipQuestion() {
    // Stop any running timers
    stopTurnTimer();
    stopChallengeTimer();

    // Hide any active areas
    hideGuessWaitingArea();
    hideChallengeArea();
    hideChallengerSelection();
    hideVerificationArea();

    // Skip to next round without awarding cards
    endRound(null);
}

// Show reveal modal
function showRevealModal(isCorrect, wasChallenged) {
    const question = gameState.questions[gameState.currentQuestionIndex];

    revealedGuess.textContent = gameState.currentGuesser.name;
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
    saveGameState();
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
    saveGameState();
}

// Check win condition
function checkWinCondition(player) {
    if (player.cards >= 4) {
        saveGameState();
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
        saveGameState();

        if (checkWinCondition(winner)) {
            return;
        }

        endRound(winner.id);
    } else if (activePlayers.length === 0) {
        // All players passed or eliminated, last guesser wins if available
        const lastGuesser = gameState.players.find(p => p.id === gameState.lastGuessPlayerId);
        if (lastGuesser && !lastGuesser.eliminated) {
            lastGuesser.cards++;
            saveGameState();

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

// Handle restart game with confirmation
function handleRestartGame() {
    const confirmed = confirm('Tem certeza que deseja reiniciar o jogo? Todo o progresso será perdido.');
    if (confirmed) {
        resetGame();
        switchScreen(gameScreen, setupScreen);
    }
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

    // Clear localStorage when resetting
    clearGameState();

    switchScreen(gameoverScreen, setupScreen);
}

// LocalStorage functions
function saveGameState() {
    try {
        const stateToSave = {
            players: gameState.players,
            currentPlayerIndex: gameState.currentPlayerIndex,
            currentQuestionIndex: gameState.currentQuestionIndex,
            currentRound: gameState.currentRound,
            questions: gameState.questions,
            revealedItems: gameState.revealedItems,
            currentGuess: gameState.currentGuess,
            currentGuesser: gameState.currentGuesser,
            currentChallenger: gameState.currentChallenger,
            playersInRound: gameState.playersInRound,
            lastGuessPlayerId: gameState.lastGuessPlayerId,
            guessHistory: gameState.guessHistory,
            selectedDeckIndex: gameState.selectedDeckIndex,
            turnTimerSeconds: gameState.turnTimerSeconds,
            challengeTimerSeconds: gameState.challengeTimerSeconds,
            isGameActive: gameState.players.length > 0
        };
        localStorage.setItem('etopGameState', JSON.stringify(stateToSave));
    } catch (error) {
        console.error('Error saving game state:', error);
    }
}

function loadGameState() {
    try {
        const savedState = localStorage.getItem('etopGameState');
        if (!savedState) return false;

        const state = JSON.parse(savedState);

        // Only load if there's an active game
        if (!state.isGameActive) return false;

        // Restore game state
        gameState.players = state.players || [];
        gameState.currentPlayerIndex = state.currentPlayerIndex || 0;
        gameState.currentQuestionIndex = state.currentQuestionIndex || 0;
        gameState.currentRound = state.currentRound || 1;
        gameState.questions = state.questions || [];
        gameState.revealedItems = state.revealedItems || [];
        gameState.currentGuess = state.currentGuess || null;
        gameState.currentGuesser = state.currentGuesser || null;
        gameState.currentChallenger = state.currentChallenger || null;
        gameState.playersInRound = state.playersInRound || [];
        gameState.lastGuessPlayerId = state.lastGuessPlayerId || null;
        gameState.guessHistory = state.guessHistory || [];
        gameState.selectedDeckIndex = state.selectedDeckIndex || 0;
        gameState.turnTimerSeconds = state.turnTimerSeconds || 0;
        gameState.challengeTimerSeconds = state.challengeTimerSeconds || 0;

        return true;
    } catch (error) {
        console.error('Error loading game state:', error);
        return false;
    }
}

function clearGameState() {
    try {
        localStorage.removeItem('etopGameState');
    } catch (error) {
        console.error('Error clearing game state:', error);
    }
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
