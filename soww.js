
// Word scramble game
const scrambleElement = document.querySelector('#scramble');
const guessInput = document.querySelector('#guess');
const guessForm = document.querySelector('#guess-form');
const submitButton = document.querySelector('#submit-button');
const hintButton = document.querySelector('#hint-button');
const skipButton = document.querySelector('#skip-button');
const feedback = document.querySelector('#feedback');
const helper = document.querySelector('#helper');
const scoreElement = document.querySelector('#score');
const streakElement = document.querySelector('#streak');
const bestElement = document.querySelector('#best');
const gameLevel = document.querySelector('#game-level');
const game = {
    current: null,
    score: 0,
    streak: 0,
    best: 0,
    level: gameLevel.value,
    solved: false,
    hintUsed: false,
    lastWord: '',
    requestId: 0
};
gameLevel.addEventListener('change', () => {
    setGameLevel(gameLevel.value);
    startRound();
});
guessForm.addEventListener('submit', checkAnswer);
hintButton.addEventListener('click', showHint);
skipButton.addEventListener('click', skipWord);
startRound();
function setGameLevel(level) {
    if (level === 'easy') {
        game.level = 'easy';
    } else if (level === 'medium') {
        game.level = 'medium';
    } else if (level === 'hard') {
        game.level = 'hard';
    }
}
function checkAnswer(event) {
    event.preventDefault();
    if (game.solved || !game.current) {
        startRound();
        return;
    }

    const guess = guessInput.value.trim().toLowerCase();
    if (!guess) {
        setFeedback('Type a guess first.', 'error');
        guessInput.focus();
        return;
    }

    if (guess === game.current) {
        game.solved = true;
        game.streak += 1;
        game.score += game.hintUsed ? 5 : 10;
        game.best = Math.max(game.best, game.streak);
        updateStats();
        setFeedback(`That's right! The word was ${game.current}.`, 'success');
        helper.textContent = game.hintUsed ? '+5 points · Hint used' : '+10 points · Streak continued!';
        submitButton.textContent = 'Next word';
        guessInput.disabled = true;
        submitButton.focus();
        return;
    }

    game.streak = 0;
    updateStats();
    setFeedback('Not quite — give it another try!', 'error');
    helper.textContent = 'Your streak resets after an incorrect guess.';
    guessInput.select();
}

function showHint() {
    if (game.solved || game.hintUsed || !game.current) return;
    game.hintUsed = true;
    const word = game.current;
    setFeedback('Finding a hint…');
    for (let i = 0; i < word.length; i += 1) {
        if (i === 0 || i === word.length - 1) continue;
        const hintChar = word[i];
        const hintIndex = Math.floor(Math.random() * (word.length - 2)) + 1;
    }
    helper.textContent = 'A hint reduces this word to 5 points.';
    hintButton.disabled = true;
    getDefinition(word).then((definition) => {
        if (game.current !== word || !game.hintUsed) return;
        if (definition) {
            setFeedback(definition);
        } else {
            setFeedback(`No definition found. The word starts with "${word[0]}".`);
        }
    }).catch(() => {
        if (game.current === word && game.hintUsed) {
            setFeedback(`Could not load a definition. The word starts with "${word[0]}".`);
        }
    });
}

function skipWord() {
    if (!game.solved && game.current) {
        game.streak = 0;
        updateStats();
    }
    startRound();
}

async function startRound() {
    const requestId = ++game.requestId;
    game.current = null;
    game.solved = false;
    game.hintUsed = false;
    guessInput.value = '';
    guessInput.disabled = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Check answer';
    hintButton.disabled = true;
    skipButton.textContent = 'Try another word';
    scrambleElement.textContent = '···';
    setFeedback('Finding a random word…');
    helper.textContent = 'Connecting to the word service.';

    try {
        const word = await getRandomWord();
        if (requestId !== game.requestId) return;

        game.current = word;
        scrambleElement.textContent = scramble(word);
        scrambleElement.style.animation = 'none';
        void scrambleElement.offsetWidth;
        scrambleElement.style.animation = '';
        guessInput.disabled = false;
        submitButton.disabled = false;
        hintButton.disabled = false;
        skipButton.textContent = 'Skip word';
        setFeedback('Type your guess below to play.');
        helper.textContent = 'Words are fetched online · Press Enter to submit.';
        guessInput.focus();
    } catch (error) {
        if (requestId !== game.requestId) return;
        scrambleElement.textContent = '???';
        submitButton.disabled = false;
        submitButton.textContent = 'Try again';
        setFeedback('Could not fetch a random word. Check your internet connection.', 'error');
        helper.textContent = error.message;
    }
}

function updateStats() {
    scoreElement.textContent = game.score;
    streakElement.textContent = game.streak;
    bestElement.textContent = game.best;
}

function setFeedback(message, state) {
    feedback.textContent = message;
    feedback.className = state || '';
}

async function getRandomWord() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const lengths = {
            easy: [3, 5],
            medium: [6, 8],
            hard: [9, 12]
        };
        const [minLength, maxLength] = lengths[game.level];
        const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
        const response = await fetch(`https://random-word-api.herokuapp.com/word?number=1&length=${length}`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Random word service returned ${response.status}.`);
        }

        const result = await response.json();
        const word = Array.isArray(result) && typeof result[0] === 'string'
            ? result[0].toLowerCase()
            : '';
        if (/^[a-z]{3,12}$/.test(word) && word !== game.lastWord) {
            game.lastWord = word;
            return word;
        }
    }
    throw new Error('Random word service did not return a new usable word.');
}

async function getDefinition(word) {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!response.ok) return '';

    const entries = await response.json();
    if (!Array.isArray(entries)) return '';
    for (const entry of entries) {
        for (const meaning of entry.meanings || []) {
            const definition = meaning.definitions && meaning.definitions[0];
            if (definition && definition.definition) return definition.definition;
        }
    }
    return '';
}

function scramble(word) {
    const letters = word.split('');
    let mixed;
    do {
        for (let index = letters.length - 1; index > 0; index -= 1) {
            const otherIndex = Math.floor(Math.random() * (index + 1));
            [letters[index], letters[otherIndex]] = [letters[otherIndex], letters[index]];
        }
        mixed = letters.join('');
    } while (mixed === word);
    return mixed;
}

