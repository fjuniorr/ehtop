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
    playersInRound: [],
    guesses: [], // Track all guesses in the round: { playerId, playerName, guess, isCorrect }
    gameData: null,
    selectedDeckIndex: 0,
    turnTimerInterval: null,
    turnTimerSeconds: 0,
    challengeTimerInterval: null,
    challengeTimerSeconds: 0
};

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
const top10List = document.getElementById('top10-list');
const guessesList = document.getElementById('guesses-list');
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
const challengeBtn = document.getElementById('challenge-btn');
const acceptBtn = document.getElementById('accept-btn');

// Reveal modal elements
const revealedGuess = document.getElementById('revealed-guess');
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
}

// Add player input field
function addPlayerInput() {
    const playerInputs = document.querySelectorAll('.player-name-input');
    if (playerInputs.length >= 10) {
        setupError.textContent = 'Máximo de 10 jogadores!';
        return;
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'player-name-input';
    input.placeholder = `Jogador ${playerInputs.length + 1}`;
    input.maxLength = 20;
    playerInputsContainer.appendChild(input);
    setupError.textContent = '';
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

    // Initialize players
    gameState.players = playerNames.map((name, index) => ({
        id: index,
        name: name,
        lives: 4,
        cards: 0,
        eliminated: false
    }));

    gameState.currentPlayerIndex = 0;
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
    gameState.currentGuesser = null;
    gameState.guesses = []; // Clear guesses for new round
    gameState.playersInRound = gameState.players
        .filter(p => !p.eliminated)
        .map(p => ({ ...p, passed: false }));

    currentCategory.textContent = question.category;
    roundNumber.textContent = `Rodada ${gameState.currentRound}`;

    // Stop any running timers
    stopTurnTimer();
    stopChallengeTimer();

    renderTop10List();
    renderPlayers();
    renderGuesses();
    updateCurrentPlayerDisplay();
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

// Render guesses history
function renderGuesses() {
    guessesList.innerHTML = '';

    if (gameState.guesses.length === 0) {
        guessesList.innerHTML = '<p class="no-guesses">Nenhum palpite ainda</p>';
        return;
    }

    gameState.guesses.forEach(guess => {
        const guessItem = document.createElement('div');
        guessItem.className = 'guess-item';

        guessItem.innerHTML = `
            <span class="guess-player">${guess.playerName}:</span>
            <span class="guess-text">${guess.guess}</span>
        `;

        guessesList.appendChild(guessItem);
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

    const normalizedGuess = normalizeString(guess);

    // Check if this guess has already been made
    const isDuplicate = gameState.guesses.some(g => normalizeString(g.guess) === normalizedGuess);

    if (isDuplicate) {
        guessError.textContent = 'Este palpite já foi dado! Escolha outro.';
        guessError.classList.remove('hidden');
        return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    gameState.currentGuess = guess;
    gameState.currentGuesser = currentPlayer;

    // Check if guess is correct
    const question = gameState.questions[gameState.currentQuestionIndex];
    const isCorrect = question.top10.some(item => normalizeString(item) === normalizedGuess);

    // Store guess with player info
    gameState.guesses.push({
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        guess: guess,
        isCorrect: isCorrect
    });

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

    // Continue to next player regardless of whether guess was correct or not
    // No penalty when there's no challenge, even if guess was wrong
    renderGuesses();
    moveToNextPlayer();
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
        if (isCorrect) {
            // Guess was correct, challenger loses life
            outcomeHTML = `<strong>${gameState.currentGuesser.name}</strong> estava certo! O desafiante perde 1 vida.`;
        } else {
            // Guess was incorrect, guesser loses life, challenger wins card
            outcomeHTML = `<strong>${gameState.currentGuesser.name}</strong> estava errado! Perde 1 vida e o desafiante ganha 1 carta!`;
        }
    }
    // Note: No outcome message when not challenged - this should not happen now
    // as handleAccept() no longer calls showRevealModal for incorrect guesses

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
        if (isCorrect) {
            // Challenger loses life - we need to ask who challenged
            // For simplicity, we'll assume the next active player challenged
            const challengerIndex = getNextActivePlayerIndex();
            if (challengerIndex !== -1) {
                loseLife(gameState.players[challengerIndex]);

                // Reveal the correct item
                const index = question.top10.findIndex(item =>
                    normalizeString(item) === normalizeString(gameState.currentGuess)
                );
                if (index !== -1 && !gameState.revealedItems.includes(index)) {
                    gameState.revealedItems.push(index);
                }

                // Remove challenger from round
                const challengerInRound = gameState.playersInRound.find(
                    p => p.id === gameState.players[challengerIndex].id
                );
                if (challengerInRound) {
                    challengerInRound.passed = true;
                }
            }
        } else {
            // Guesser loses life
            loseLife(gameState.currentGuesser);

            // Challenger wins card - assume next active player
            const challengerIndex = getNextActivePlayerIndex();
            if (challengerIndex !== -1) {
                gameState.players[challengerIndex].cards++;

                if (checkWinCondition(gameState.players[challengerIndex])) {
                    return;
                }
            }

            // Remove guesser from round
            const guesserInRound = gameState.playersInRound.find(
                p => p.id === gameState.currentGuesser.id
            );
            if (guesserInRound) {
                guesserInRound.passed = true;
            }

            // End round, challenger won
            endRound(challengerIndex);
            return;
        }
    }

    renderTop10List();
    renderPlayers();
    renderGuesses();
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

    // Skip eliminated players
    while (gameState.players[nextIndex].eliminated &&
           nextIndex !== gameState.currentPlayerIndex) {
        nextIndex = (nextIndex + 1) % gameState.players.length;
    }

    gameState.currentPlayerIndex = nextIndex;
    updateCurrentPlayerDisplay();
}

// Get next active player index (for challenger)
function getNextActivePlayerIndex() {
    let nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;

    while (gameState.players[nextIndex].eliminated &&
           nextIndex !== gameState.currentPlayerIndex) {
        nextIndex = (nextIndex + 1) % gameState.players.length;
    }

    if (gameState.players[nextIndex].eliminated) {
        return -1;
    }

    return nextIndex;
}

// Check if round should end
function checkRoundEnd() {
    const activePlayers = gameState.playersInRound.filter(p => !p.passed && !p.eliminated);

    if (activePlayers.length === 1) {
        // Last player wins the card
        const winner = gameState.players.find(p => p.id === activePlayers[0].id);
        winner.cards++;

        if (checkWinCondition(winner)) {
            return;
        }

        endRound(winner.id);
    } else if (activePlayers.length === 0) {
        // All players passed or eliminated, no winner
        endRound(null);
    } else {
        // Continue round
        showActionButtons();
    }
}

// End round
function endRound(winnerId) {
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
        playersInRound: [],
        guesses: [],
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
