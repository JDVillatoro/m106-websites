// Game state
let yourTotalScore = 0;
let oppTotalScore = 0;
let gameHistory = [];
let numRows = 2; // Your strategies
let numCols = 2; // Opponent strategies
let customStrategyNames = { player1: null, player2: null }; // Custom names for themed games
let isEditMode = false; // Whether matrix is in edit mode
let payoffValues = {}; // Store payoff values

// Training mode state
let currentMode = 'play'; // 'play' or 'training'
let trainingRows = 2;
let trainingCols = 2;
let trainingPayoffs = {};
let fixedPlayer = 1;
let fixedChoiceIndex = 0;
let responsePlayer = 2;
let bestResponses = [];
let selectedResponses = new Set();
let correctCount = 0;
let incorrectCount = 0;

// Dominance mode state
let dominanceRows = 2;
let dominanceCols = 2;
let dominancePayoffs = {};
let dominanceAnswerKey = {};
let dominanceCorrectCount = 0;
let dominanceIncorrectCount = 0;

// Nash mode state
let nashRows = 2;
let nashCols = 2;
let nashPayoffs = {};
let nashEquilibria = new Set();
let nashSelected = new Set();
let nashCorrectCount = 0;
let nashIncorrectCount = 0;

// Get strategy labels (returns LaTeX formatted string WITH delimiters)
function getStrategyLabel(index, player) {
    // Check if custom names are set
    const customNames = player === 1 ? customStrategyNames.player1 : customStrategyNames.player2;
    if (customNames && customNames[index]) {
        return customNames[index];
    }
    
    // player 1 (you): A, B, C for 3 or fewer; A_1, A_2, A_3... for more than 3
    // player 2 (opponent): X, Y, Z for 3 or fewer; X_1, X_2, X_3... for more than 3
    const maxStrategies = player === 1 ? numRows : numCols;
    
    if (player === 1) {
        if (maxStrategies <= 3) {
            if (index === 0) return '\\(A\\)';
            if (index === 1) return '\\(B\\)';
            if (index === 2) return '\\(C\\)';
        }
        return `\\(A_{${index + 1}}\\)`;
    } else {
        if (maxStrategies <= 3) {
            if (index === 0) return '\\(X\\)';
            if (index === 1) return '\\(Y\\)';
            if (index === 2) return '\\(Z\\)';
        }
        return `\\(X_{${index + 1}}\\)`;
    }
}

// Wrap label in MathJax delimiters
function formatMathLabel(label) {
    // Labels already contain delimiters, return as-is
    return label;
}

// Trigger MathJax to re-render
function renderMath() {
    if (window.MathJax) {
        MathJax.typesetPromise().catch((err) => console.log('MathJax render error:', err));
    }
}

// Set custom strategy names
function setCustomNames(player1Names, player2Names) {
    customStrategyNames.player1 = player1Names;
    customStrategyNames.player2 = player2Names;
    generateMatrix();
    generateStrategyButtons();
}

// Clear custom strategy names (return to default)
function clearCustomNames() {
    customStrategyNames.player1 = null;
    customStrategyNames.player2 = null;
    generateMatrix();
    generateStrategyButtons();
}

// Toggle edit mode
function toggleEditMode() {
    isEditMode = !isEditMode;
    const button = document.getElementById('toggle-edit');
    setMatrixConfigEnabled(isEditMode);
    
    if (isEditMode) {
        button.textContent = 'Done Editing';
        button.classList.add('editing');
        // No need to save - values already in payoffValues
    } else {
        button.textContent = 'Edit Payoff Matrix';
        button.classList.remove('editing');
        // Load values from edit fields
        loadPayoffValues();
        // Update custom names from input fields
        updateCustomNamesFromInputs();
    }
    
    generateMatrix();
    generateStrategyButtons();
}

function setMatrixConfigEnabled(enabled) {
    const rowsInput = document.getElementById('matrix-rows');
    const colsInput = document.getElementById('matrix-cols');
    const updateButton = document.getElementById('update-dimensions');
    const matrixControls = document.querySelector('.matrix-controls');

    if (matrixControls) {
        matrixControls.style.display = enabled ? 'block' : 'none';
    }
    if (rowsInput) {
        rowsInput.disabled = !enabled;
    }
    if (colsInput) {
        colsInput.disabled = !enabled;
    }
    if (updateButton) {
        updateButton.disabled = !enabled;
    }
}

// Save current payoff values
function savePayoffValues() {
    payoffValues = {};
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            const youInput = document.getElementById(`cell-${i}-${j}-you`);
            const oppInput = document.getElementById(`cell-${i}-${j}-opp`);
            if (youInput && oppInput) {
                payoffValues[`${i}-${j}`] = {
                    you: youInput.value || '0',
                    opp: oppInput.value || '0'
                };
            }
        }
    }
}

// Load payoff values from edit fields
function loadPayoffValues() {
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            const key = `${i}-${j}`;
            if (payoffValues[key]) {
                const youInput = document.getElementById(`cell-${i}-${j}-you`);
                const oppInput = document.getElementById(`cell-${i}-${j}-opp`);
                if (youInput && oppInput) {
                    payoffValues[key] = {
                        you: youInput.value || '0',
                        opp: oppInput.value || '0'
                    };
                }
            }
        }
    }
}

// Update custom names from input fields
function updateCustomNamesFromInputs() {
    const hasPlayer1Custom = document.getElementById('strategy-p1-0-input');
    const hasPlayer2Custom = document.getElementById('strategy-p2-0-input');
    
    if (hasPlayer1Custom && hasPlayer2Custom) {
        const player1Names = [];
        const player2Names = [];
        
        let hasCustom = false;
        
        for (let i = 0; i < numRows; i++) {
            const input = document.getElementById(`strategy-p1-${i}-input`);
            if (input && input.value.trim()) {
                player1Names[i] = input.value.trim();
                hasCustom = true;
            }
        }
        
        for (let j = 0; j < numCols; j++) {
            const input = document.getElementById(`strategy-p2-${j}-input`);
            if (input && input.value.trim()) {
                player2Names[j] = input.value.trim();
                hasCustom = true;
            }
        }
        
        if (hasCustom) {
            customStrategyNames.player1 = player1Names.length > 0 ? player1Names : null;
            customStrategyNames.player2 = player2Names.length > 0 ? player2Names : null;
        }
    }
}

// Add change listeners to payoff inputs to detect manual edits
function addPayoffChangeListeners() {
    // Only clear custom names if we're in edit mode and actively editing
    // This prevents clearing on load
}

// Get payoff matrix values
function getPayoffMatrix() {
    const matrix = {};
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            const key = getStrategyLabel(i, 1) + getStrategyLabel(j, 2);
            
            // Get values from payoffValues storage
            const savedKey = `${i}-${j}`;
            const savedValues = payoffValues[savedKey] || { you: '0', opp: '0' };
            
            matrix[key] = {
                you: parseFloat(savedValues.you) || 0,
                opp: parseFloat(savedValues.opp) || 0
            };
        }
    }
    return matrix;
}

// Simple AI: Random choice with slight bias toward maximizing own payoff
function getOpponentChoice() {
    const matrix = getPayoffMatrix();
    
    // Calculate expected payoffs for each opponent strategy
    // Assuming player might choose any strategy with equal probability
    const expectedPayoffs = [];
    for (let j = 0; j < numCols; j++) {
        let sum = 0;
        for (let i = 0; i < numRows; i++) {
            const key = getStrategyLabel(i, 1) + getStrategyLabel(j, 2);
            sum += matrix[key].opp;
        }
        expectedPayoffs.push(sum / numRows);
    }
    
    // Add some randomness (70% exploitation, 30% exploration)
    if (Math.random() < 0.3) {
        return Math.floor(Math.random() * numCols);
    }
    
    // Choose strategy with highest expected payoff
    let maxPayoff = Math.max(...expectedPayoffs);
    let bestStrategies = [];
    for (let j = 0; j < numCols; j++) {
        if (expectedPayoffs[j] === maxPayoff) {
            bestStrategies.push(j);
        }
    }
    return bestStrategies[Math.floor(Math.random() * bestStrategies.length)];
}

// Play a round
function playRound(yourChoiceIndex) {
    const oppChoiceIndex = getOpponentChoice();
    const matrix = getPayoffMatrix();
    
    const yourChoice = getStrategyLabel(yourChoiceIndex, 1);
    const oppChoice = getStrategyLabel(oppChoiceIndex, 2);
    
    // Determine payoffs
    const outcomeKey = yourChoice + oppChoice;
    const yourPayoff = matrix[outcomeKey].you;
    const oppPayoff = matrix[outcomeKey].opp;
    
    // Highlight the chosen matrix cell
    highlightMatrixCell(yourChoiceIndex, oppChoiceIndex);
    
    // Highlight the chosen button
    highlightButton(yourChoiceIndex);
    
    // Update scores with animation
    yourTotalScore += yourPayoff;
    oppTotalScore += oppPayoff;
    
    animateScoreUpdate('your-score', yourTotalScore);
    animateScoreUpdate('opp-score', oppTotalScore);
    
    // Display result
    const resultText = document.getElementById('result-text');
    resultText.innerHTML = `
        <strong>Round Result:</strong><br>
        You chose: Strategy ${yourChoice} | Opponent chose: Strategy ${oppChoice}<br>
        Your payoff: ${yourPayoff >= 0 ? '+' : ''}${yourPayoff} | 
        Opponent payoff: ${oppPayoff >= 0 ? '+' : ''}${oppPayoff}
    `;
    
    // Render MathJax
    renderMath();
    
    // Add to history
    addToHistory(yourChoice, oppChoice, yourPayoff, oppPayoff);
}

// Highlight the matrix cell that corresponds to the choices
function highlightMatrixCell(rowIndex, colIndex) {
    // Remove previous highlights
    document.querySelectorAll('.matrix-cell-highlight').forEach(cell => {
        cell.classList.remove('matrix-cell-highlight');
    });
    
    // Get the table and highlight the specific cell
    const table = document.querySelector('#matrix-container table');
    if (table) {
        // +1 for row because of header, +1 for column because of row labels
        const row = table.rows[rowIndex + 1];
        if (row) {
            const cell = row.cells[colIndex + 1];
            if (cell) {
                cell.classList.add('matrix-cell-highlight');
                // Remove highlight after animation
                setTimeout(() => {
                    cell.classList.remove('matrix-cell-highlight');
                }, 1000);
            }
        }
    }
}

// Highlight the button that was clicked
function highlightButton(index) {
    const buttons = document.querySelectorAll('.action-btn');
    if (buttons[index]) {
        buttons[index].classList.add('btn-selected');
        setTimeout(() => {
            buttons[index].classList.remove('btn-selected');
        }, 800);
    }
}

// Animate score counter update
function animateScoreUpdate(elementId, newScore) {
    const element = document.getElementById(elementId);
    element.classList.add('score-update');
    element.textContent = newScore.toFixed(1);
    
    setTimeout(() => {
        element.classList.remove('score-update');
    }, 600);
}

// Add game to history
function addToHistory(yourChoice, oppChoice, yourPayoff, oppPayoff) {
    const historyItem = {
        round: gameHistory.length + 1,
        yourChoice,
        oppChoice,
        yourPayoff,
        oppPayoff
    };
    
    gameHistory.push(historyItem);
    displayHistory();
}

// Display history
function displayHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    // Display in reverse order (most recent first)
    for (let i = gameHistory.length - 1; i >= 0; i--) {
        const item = gameHistory[i];
        const div = document.createElement('div');
        div.className = 'history-item';
        
        // Determine outcome class
        if (item.yourPayoff > item.oppPayoff) {
            div.classList.add('win');
        } else if (item.yourPayoff < item.oppPayoff) {
            div.classList.add('lose');
        } else {
            div.classList.add('tie');
        }
        
        div.innerHTML = `
            <p><strong>Round ${item.round}:</strong> 
            You: ${item.yourChoice} vs Opponent: ${item.oppChoice}</p>
            <p>Payoffs - You: ${item.yourPayoff >= 0 ? '+' : ''}${item.yourPayoff}, 
            Opponent: ${item.oppPayoff >= 0 ? '+' : ''}${item.oppPayoff}</p>
        `;
        
        historyList.appendChild(div);
    }
    
    // Render MathJax
    renderMath();
}

// Clear history
function clearHistory() {
    gameHistory = [];
    yourTotalScore = 0;
    oppTotalScore = 0;
    document.getElementById('your-score').textContent = '0';
    document.getElementById('opp-score').textContent = '0';
    document.getElementById('result-text').textContent = 'Choose a strategy to start playing!';
    displayHistory();
}

// Generate matrix table
function generateMatrix() {
    const container = document.getElementById('matrix-container');
    container.innerHTML = '';
    
    // Create wrapper for player labels and table
    const wrapper = document.createElement('div');
    wrapper.className = 'matrix-wrapper';
    
    // Player 2 label (top)
    const player2Label = document.createElement('div');
    player2Label.className = 'player-label player2-label';
    player2Label.textContent = 'Player 2 (Opponent)';
    wrapper.appendChild(player2Label);
    
    // Create container for player 1 label and table
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    
    // Player 1 label (left)
    const player1Label = document.createElement('div');
    player1Label.className = 'player-label player1-label';
    player1Label.textContent = 'Player 1 (You)';
    tableContainer.appendChild(player1Label);
    
    // Create table
    const table = document.createElement('table');
    
    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const emptyHeader = document.createElement('th');
    headerRow.appendChild(emptyHeader);
    
    for (let j = 0; j < numCols; j++) {
        const th = document.createElement('th');
        const label = getStrategyLabel(j, 2);
        
        if (isEditMode) {
            // Editable strategy name (full LaTeX with delimiters)
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'strategy-name-input';
            input.id = `strategy-p2-${j}-input`;
            input.value = label;
            input.placeholder = 'e.g., \\(X\\) or \\(\\text{Strategy}\\)';
            th.appendChild(input);
        } else {
            // Static display (label already has delimiters)
            th.innerHTML = label;
        }
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body rows
    const tbody = document.createElement('tbody');
    for (let i = 0; i < numRows; i++) {
        const row = document.createElement('tr');
        
        // Row label
        const labelCell = document.createElement('td');
        labelCell.className = 'row-label';
        const label = getStrategyLabel(i, 1);
        
        if (isEditMode) {
            // Editable strategy name (full LaTeX with delimiters)
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'strategy-name-input';
            input.id = `strategy-p1-${i}-input`;
            input.value = label;
            input.placeholder = 'e.g., \\(A\\) or \\(\\text{Strategy}\\)';
            labelCell.appendChild(input);
        } else {
            // Static display (label already has delimiters)
            labelCell.innerHTML = label;
        }
        row.appendChild(labelCell);
        
        // Payoff cells
        for (let j = 0; j < numCols; j++) {
            const cell = document.createElement('td');
            cell.className = 'matrix-cell';
            
            const key = `${i}-${j}`;
            const savedValues = payoffValues[key] || { you: '0', opp: '0' };
            
            if (isEditMode) {
                // Editable inputs
                const youInput = document.createElement('input');
                youInput.type = 'text';
                youInput.className = 'payoff-input';
                youInput.id = `cell-${i}-${j}-you`;
                youInput.value = savedValues.you;
                
                const oppInput = document.createElement('input');
                oppInput.type = 'text';
                oppInput.className = 'payoff-input';
                oppInput.id = `cell-${i}-${j}-opp`;
                oppInput.value = savedValues.opp;
                
                cell.appendChild(youInput);
                cell.appendChild(oppInput);
            } else {
                // Static display
                const youDisplay = document.createElement('span');
                youDisplay.className = 'payoff-display';
                youDisplay.textContent = savedValues.you;
                
                const oppDisplay = document.createElement('span');
                oppDisplay.className = 'payoff-display';
                oppDisplay.textContent = savedValues.opp;
                
                cell.appendChild(youDisplay);
                cell.appendChild(oppDisplay);
            }
            
            row.appendChild(cell);
        }
        
        tbody.appendChild(row);
    }
    table.appendChild(tbody);
    
    tableContainer.appendChild(table);
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);
    
    // Add change listeners to detect manual edits
    addPayoffChangeListeners();
    
    // Render MathJax
    renderMath();
}

// Generate strategy buttons
function generateStrategyButtons() {
    const container = document.getElementById('strategy-buttons');
    container.innerHTML = '';
    
    for (let i = 0; i < numRows; i++) {
        const button = document.createElement('button');
        button.className = 'action-btn';
        const label = getStrategyLabel(i, 1);
        button.innerHTML = label;
        button.addEventListener('click', () => playRound(i));
        container.appendChild(button);
    }
    
    // Render MathJax
    renderMath();
}

// Update matrix dimensions
function updateDimensions() {
    const newRows = parseInt(document.getElementById('matrix-rows').value);
    const newCols = parseInt(document.getElementById('matrix-cols').value);
    
    if (newRows >= 2 && newRows <= 5 && newCols >= 2 && newCols <= 5) {
        numRows = newRows;
        numCols = newCols;
        customStrategyNames.player1 = null;
        customStrategyNames.player2 = null;
        payoffValues = {}; // Reset payoff values
        isEditMode = false;
        document.getElementById('toggle-edit').textContent = 'Edit Payoff Matrix';
        document.getElementById('toggle-edit').classList.remove('editing');
        setMatrixConfigEnabled(false);
        generateMatrix();
        generateStrategyButtons();
        clearHistory();
    } else {
        alert('Please enter values between 2 and 5 for both dimensions.');
    }
}

// Preset: Prisoner's Dilemma
function setPrisonersDilemma() {
    document.getElementById('matrix-rows').value = '2';
    document.getElementById('matrix-cols').value = '2';
    numRows = 2;
    numCols = 2;
    
    // Set custom names (with math delimiters)
    customStrategyNames.player1 = ['\\(\\text{Loyal}\\)', '\\(\\text{Betray}\\)'];
    customStrategyNames.player2 = ['\\(\\text{Loyal}\\)', '\\(\\text{Betray}\\)'];
    
    // Set Prisoner's Dilemma values (Loyal=0, Betray=1)
    payoffValues = {
        '0-0': { you: '-1', opp: '-1' },
        '0-1': { you: '-3', opp: '0' },
        '1-0': { you: '0', opp: '-3' },
        '1-1': { you: '-2', opp: '-2' }
    };
    
    isEditMode = false;
    document.getElementById('toggle-edit').textContent = 'Edit Payoff Matrix';
    document.getElementById('toggle-edit').classList.remove('editing');
    setMatrixConfigEnabled(false);
    
    generateMatrix();
    generateStrategyButtons();
    clearHistory();
}

// Preset: Chicken (Hawk-Dove)
function setChicken() {
    document.getElementById('matrix-rows').value = '2';
    document.getElementById('matrix-cols').value = '2';
    numRows = 2;
    numCols = 2;
    
    // Set custom names (with math delimiters)
    customStrategyNames.player1 = ['\\(\\text{Swerve}\\)', '\\(\\text{Straight}\\)'];
    customStrategyNames.player2 = ['\\(\\text{Swerve}\\)', '\\(\\text{Straight}\\)'];
    
    // Set Chicken values (Swerve=0, Straight=1)
    payoffValues = {
        '0-0': { you: '2', opp: '2' },
        '0-1': { you: '0', opp: '3' },
        '1-0': { you: '3', opp: '0' },
        '1-1': { you: '-10', opp: '-10' }
    };
    
    isEditMode = false;
    document.getElementById('toggle-edit').textContent = 'Edit Payoff Matrix';
    document.getElementById('toggle-edit').classList.remove('editing');
    setMatrixConfigEnabled(false);
    
    generateMatrix();
    generateStrategyButtons();
    clearHistory();
}

// Preset: Stag Hunt
function setStagHunt() {
    document.getElementById('matrix-rows').value = '2';
    document.getElementById('matrix-cols').value = '2';
    numRows = 2;
    numCols = 2;
    
    // Set custom names (with math delimiters)
    customStrategyNames.player1 = ['\\(\\text{Stag}\\)', '\\(\\text{Hare}\\)'];
    customStrategyNames.player2 = ['\\(\\text{Stag}\\)', '\\(\\text{Hare}\\)'];
    
    // Set Stag Hunt values (Stag=0, Hare=1)
    payoffValues = {
        '0-0': { you: '2', opp: '2' },
        '0-1': { you: '0', opp: '1' },
        '1-0': { you: '1', opp: '0' },
        '1-1': { you: '1', opp: '1' }
    };
    
    isEditMode = false;
    document.getElementById('toggle-edit').textContent = 'Edit Payoff Matrix';
    document.getElementById('toggle-edit').classList.remove('editing');
    setMatrixConfigEnabled(false);
    
    generateMatrix();
    generateStrategyButtons();
    clearHistory();
}

// Preset: Rock Paper Scissors
function setRockPaperScissors() {
    document.getElementById('matrix-rows').value = '3';
    document.getElementById('matrix-cols').value = '3';
    numRows = 3;
    numCols = 3;

    // Set custom names (with math delimiters)
    customStrategyNames.player1 = ['\\(\\text{Rock}\\)', '\\(\\text{Paper}\\)', '\\(\\text{Scissors}\\)'];
    customStrategyNames.player2 = ['\\(\\text{Rock}\\)', '\\(\\text{Paper}\\)', '\\(\\text{Scissors}\\)'];

    // Payoffs: +1/-1 for wins, 0/0 for ties
    payoffValues = {
        '0-0': { you: '0', opp: '0' },
        '0-1': { you: '-1', opp: '1' },
        '0-2': { you: '1', opp: '-1' },

        '1-0': { you: '1', opp: '-1' },
        '1-1': { you: '0', opp: '0' },
        '1-2': { you: '-1', opp: '1' },

        '2-0': { you: '-1', opp: '1' },
        '2-1': { you: '1', opp: '-1' },
        '2-2': { you: '0', opp: '0' }
    };

    isEditMode = false;
    document.getElementById('toggle-edit').textContent = 'Edit Payoff Matrix';
    document.getElementById('toggle-edit').classList.remove('editing');
    setMatrixConfigEnabled(false);

    generateMatrix();
    generateStrategyButtons();
    clearHistory();
}

// Event listeners
document.getElementById('update-dimensions').addEventListener('click', updateDimensions);
document.getElementById('clear-history').addEventListener('click', clearHistory);
document.getElementById('toggle-edit').addEventListener('click', toggleEditMode);
document.getElementById('preset-prisoners').addEventListener('click', setPrisonersDilemma);
document.getElementById('preset-chicken').addEventListener('click', setChicken);
document.getElementById('preset-stag-hunt').addEventListener('click', setStagHunt);
document.getElementById('preset-rps').addEventListener('click', setRockPaperScissors);

// Initialize
generateMatrix();
generateStrategyButtons();
setPrisonersDilemma(); // Start with Prisoner's Dilemma
setMatrixConfigEnabled(false);
console.log('Game Theory Player initialized!');

// Mode switching
document.getElementById('mode-play').addEventListener('click', () => switchMode('play'));
document.getElementById('mode-training').addEventListener('click', () => switchMode('training'));
document.getElementById('mode-dominance').addEventListener('click', () => switchMode('dominance'));
document.getElementById('mode-nash').addEventListener('click', () => switchMode('nash'));

function switchMode(mode) {
    currentMode = mode;
    
    // Update button states
    document.getElementById('mode-play').classList.toggle('active', mode === 'play');
    document.getElementById('mode-training').classList.toggle('active', mode === 'training');
    document.getElementById('mode-dominance').classList.toggle('active', mode === 'dominance');
    document.getElementById('mode-nash').classList.toggle('active', mode === 'nash');
    
    // Toggle sections
    const playElements = [
        document.querySelector('.matrix-controls'),
        document.querySelector('.payoff-matrix'),
        document.querySelector('.actions'),
        document.querySelector('.results'),
        document.querySelector('.history')
    ];
    
    playElements.forEach(el => {
        if (el) el.style.display = mode === 'play' ? 'block' : 'none';
    });

    if (mode === 'play') {
        setMatrixConfigEnabled(isEditMode);
    }
    
    const trainingSection = document.getElementById('training-section');
    if (trainingSection) {
        trainingSection.style.display = mode === 'training' ? 'block' : 'none';
    }

    const dominanceSection = document.getElementById('dominance-section');
    if (dominanceSection) {
        dominanceSection.style.display = mode === 'dominance' ? 'block' : 'none';
    }

    const nashSection = document.getElementById('nash-section');
    if (nashSection) {
        nashSection.style.display = mode === 'nash' ? 'block' : 'none';
    }
    
    // Update description
    const description = document.getElementById('mode-description');
    if (mode === 'training') {
        description.textContent = 'Practice identifying best responses! One player picks a strategy and the other responds.';
        generateTrainingProblem();
    } else if (mode === 'dominance') {
        description.textContent = 'Identify dominance relations between strategy pairs for both players.';
        generateDominanceProblem();
    } else if (mode === 'nash') {
        description.textContent = 'Identify all pure Nash equilibriums in the payoff matrix.';
        generateNashProblem();
    } else {
        description.textContent = 'Play against the opponent by choosing your strategy. Edit the payoff matrix to try different games!';
    }
}

// Training mode functions
function getTrainingStrategyLabel(index, player) {
    const maxStrategies = player === 1 ? trainingRows : trainingCols;
    
    if (player === 1) {
        if (maxStrategies <= 3) {
            if (index === 0) return '\\(A\\)';
            if (index === 1) return '\\(B\\)';
            if (index === 2) return '\\(C\\)';
        }
        return `\\(A_{${index + 1}}\\)`;
    } else {
        if (maxStrategies <= 3) {
            if (index === 0) return '\\(X\\)';
            if (index === 1) return '\\(Y\\)';
            if (index === 2) return '\\(Z\\)';
        }
        return `\\(X_{${index + 1}}\\)`;
    }
}

function generateTrainingProblem() {
    trainingRows = Math.floor(Math.random() * 2) + 2;
    trainingCols = Math.floor(Math.random() * 2) + 2;
    
    // Decide if we want multiple best responses (40% chance)
    const wantMultiple = Math.random() < 0.4;
    
    // Generate random payoffs
    trainingPayoffs = GameTheory.generateRandomPayoffs(trainingRows, trainingCols);
    
    // Randomly select which player picks first
    fixedPlayer = Math.random() < 0.5 ? 1 : 2;
    responsePlayer = fixedPlayer === 1 ? 2 : 1;
    
    if (fixedPlayer === 1) {
        fixedChoiceIndex = Math.floor(Math.random() * trainingRows);
    } else {
        fixedChoiceIndex = Math.floor(Math.random() * trainingCols);
    }
    
    // Calculate best responses
    bestResponses = GameTheory.calculateBestResponses(
        trainingPayoffs,
        trainingRows,
        trainingCols,
        fixedPlayer,
        fixedChoiceIndex
    );
    
    // Regenerate if we don't have the desired number of best responses
    const hasMultiple = bestResponses.length > 1;
    if (wantMultiple !== hasMultiple) {
        // Try regenerating the matrix and fixed choice
        trainingPayoffs = GameTheory.generateRandomPayoffs(trainingRows, trainingCols);
        if (fixedPlayer === 1) {
            fixedChoiceIndex = Math.floor(Math.random() * trainingRows);
        } else {
            fixedChoiceIndex = Math.floor(Math.random() * trainingCols);
        }
        bestResponses = GameTheory.calculateBestResponses(
            trainingPayoffs,
            trainingRows,
            trainingCols,
            fixedPlayer,
            fixedChoiceIndex
        );
    }
    
    selectedResponses = new Set();
    
    // Generate matrix display
    generateTrainingMatrix();
    generateTrainingButtons();
    
    // Update prompt
    const fixedLabel = getTrainingStrategyLabel(fixedChoiceIndex, fixedPlayer);
    const fixedName = fixedPlayer === 1 ? 'Player 1' : 'Player 2';
    const responseName = responsePlayer === 1 ? 'Player 1' : 'Player 2';
    document.getElementById('training-prompt').innerHTML = `${fixedName} picks <strong>${fixedLabel}</strong>. What are ${responseName}'s best responses?`;
    
    const actionTitle = document.getElementById('training-action-title');
    if (actionTitle) {
        actionTitle.textContent = `Select ${responseName}'s Best Responses`;
    }
    
    // Hide feedback
    const feedbackContainer = document.getElementById('training-feedback');
    if (feedbackContainer) {
        feedbackContainer.style.display = 'none';
        feedbackContainer.classList.remove('correct', 'incorrect');
    }
    
    // Show submit button
    const submitButton = document.getElementById('training-submit');
    if (submitButton) {
        submitButton.style.display = 'block';
    }
    
    renderMath();
}

function generateTrainingMatrix() {
    const container = document.getElementById('training-matrix-container');
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'matrix-wrapper';
    
    // Player 2 label
    const player2Label = document.createElement('div');
    player2Label.className = 'player-label player2-label';
    player2Label.textContent = 'Player 2';
    wrapper.appendChild(player2Label);
    
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    
    // Player 1 label
    const player1Label = document.createElement('div');
    player1Label.className = 'player-label player1-label';
    player1Label.textContent = 'Player 1';
    tableContainer.appendChild(player1Label);
    
    const table = document.createElement('table');
    
    // Header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const emptyHeader = document.createElement('th');
    headerRow.appendChild(emptyHeader);
    
    for (let j = 0; j < trainingCols; j++) {
        const th = document.createElement('th');
        th.innerHTML = getTrainingStrategyLabel(j, 2);
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Body rows
    const tbody = document.createElement('tbody');
    for (let i = 0; i < trainingRows; i++) {
        const row = document.createElement('tr');
        
        const labelCell = document.createElement('td');
        labelCell.className = 'row-label';
        labelCell.innerHTML = getTrainingStrategyLabel(i, 1);
        row.appendChild(labelCell);
        
        for (let j = 0; j < trainingCols; j++) {
            const cell = document.createElement('td');
            cell.className = 'matrix-cell';
            
            const key = `${i}-${j}`;
            const values = trainingPayoffs[key];
            
            const youDisplay = document.createElement('span');
            youDisplay.className = 'payoff-display';
            youDisplay.textContent = values.p1;
            
            const oppDisplay = document.createElement('span');
            oppDisplay.className = 'payoff-display';
            oppDisplay.textContent = values.p2;
            
            cell.appendChild(youDisplay);
            cell.appendChild(oppDisplay);
            
            row.appendChild(cell);
        }
        
        tbody.appendChild(row);
    }
    table.appendChild(tbody);
    
    tableContainer.appendChild(table);
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);
}

function generateTrainingButtons() {
    const container = document.getElementById('training-buttons');
    container.innerHTML = '';
    
    const total = responsePlayer === 1 ? trainingRows : trainingCols;
    for (let i = 0; i < total; i++) {
        const button = document.createElement('button');
        button.className = 'action-btn';
        button.innerHTML = getTrainingStrategyLabel(i, responsePlayer);
        button.addEventListener('click', () => toggleTrainingSelection(i, button));
        container.appendChild(button);
    }
}

function toggleTrainingSelection(index, button) {
    if (selectedResponses.has(index)) {
        selectedResponses.delete(index);
        button.classList.remove('selected');
    } else {
        selectedResponses.add(index);
        button.classList.add('selected');
    }
}

function submitTrainingAnswer() {
    const feedbackEl = document.getElementById('feedback-text');
    const feedbackContainer = document.getElementById('training-feedback');
    const submitButton = document.getElementById('training-submit');
    const responseName = responsePlayer === 1 ? 'Player 1' : 'Player 2';
    
    // Show feedback box
    if (feedbackContainer) {
        feedbackContainer.style.display = 'block';
    }
    
    if (selectedResponses.size === 0) {
        feedbackEl.textContent = 'Please select at least one strategy before submitting.';
        feedbackContainer.classList.remove('correct', 'incorrect');
        return;
    }
    
    // Hide submit button after submitting
    if (submitButton) {
        submitButton.style.display = 'none';
    }
    
    const selectedArray = Array.from(selectedResponses).sort();
    const bestArray = [...bestResponses].sort();
    const isCorrect = selectedArray.length === bestArray.length
        && selectedArray.every((value, index) => value === bestArray[index]);
    
    if (isCorrect) {
        correctCount++;
        feedbackEl.innerHTML = `<strong style="color: #27ae60;">✓ Correct!</strong>`;
        feedbackContainer.classList.add('correct');
        feedbackContainer.classList.remove('incorrect');
    } else {
        incorrectCount++;
        const bestLabels = bestResponses.map(index => getTrainingStrategyLabel(index, responsePlayer));
        const bestPayoffs = bestResponses.map(index => {
            return responsePlayer === 1
                ? trainingPayoffs[`${index}-${fixedChoiceIndex}`].p1
                : trainingPayoffs[`${fixedChoiceIndex}-${index}`].p2;
        });
        
        // Use proper grammar based on number of best responses
        const verb = bestResponses.length === 1 ? 'is' : 'are';
        const responseWord = bestResponses.length === 1 ? 'response' : 'responses';
        
        feedbackEl.innerHTML = `<strong style="color: #e74c3c;">✗ Incorrect.</strong> ${responseName}'s best ${responseWord} ${verb} ${bestLabels.join(', ')}.`;
        feedbackContainer.classList.add('incorrect');
        feedbackContainer.classList.remove('correct');
        
        // Highlight the best responses in the table
        highlightBestResponses();
    }
    
    updateStats();
    renderMath();
}

function highlightBestResponses() {
    const table = document.querySelector('#training-matrix-container table');
    if (!table) {
        return;
    }
    
    if (responsePlayer === 1) {
        bestResponses.forEach((rowIndex) => {
            const row = table.rows[rowIndex + 1];
            if (row) {
                row.classList.add('best-response-row');
                setTimeout(() => {
                    row.classList.remove('best-response-row');
                }, 3000);
            }
        });
    } else {
        bestResponses.forEach((colIndex) => {
            for (let i = 0; i < table.rows.length; i++) {
                const cell = table.rows[i].cells[colIndex + 1];
                if (cell) {
                    cell.classList.add('best-response-col');
                    setTimeout(() => {
                        cell.classList.remove('best-response-col');
                    }, 3000);
                }
            }
        });
    }
}

function updateStats() {
    document.getElementById('correct-count').textContent = correctCount;
    document.getElementById('incorrect-count').textContent = incorrectCount;
    
    const total = correctCount + incorrectCount;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    document.getElementById('accuracy').textContent = accuracy + '%';
}

function resetTrainingSession() {
    correctCount = 0;
    incorrectCount = 0;
    updateStats();
    generateTrainingProblem();
}

document.getElementById('training-next').addEventListener('click', generateTrainingProblem);
document.getElementById('training-reset').addEventListener('click', resetTrainingSession);
document.getElementById('training-submit').addEventListener('click', submitTrainingAnswer);

// Dominance mode functions
function generateDominanceProblem() {
    dominanceRows = Math.floor(Math.random() * 2) + 2;
    dominanceCols = Math.floor(Math.random() * 2) + 2;
    dominancePayoffs = GameTheory.generateRandomPayoffs(dominanceRows, dominanceCols);

    // 40% reroll chance when there is no strict dominance
    if (!GameTheory.hasStrictDominance(dominancePayoffs, dominanceRows, dominanceCols)
        && Math.random() < 0.4) {
        dominancePayoffs = GameTheory.generateRandomPayoffs(dominanceRows, dominanceCols);
    }
    dominanceAnswerKey = {};

    generateDominanceMatrix();
    generateDominanceQuestions();

    // Hide feedback
    const feedback = document.getElementById('dominance-feedback');
    if (feedback) {
        feedback.style.display = 'none';
        feedback.classList.remove('correct', 'incorrect');
    }

    // Show submit button for new matrix
    const submitButton = document.getElementById('dominance-check');
    if (submitButton) {
        submitButton.style.display = 'inline-block';
    }

    updateDominanceStats();

    renderMath();
}

function generateDominanceMatrix() {
    const container = document.getElementById('dominance-matrix-container');
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'matrix-wrapper';

    const player2Label = document.createElement('div');
    player2Label.className = 'player-label player2-label';
    player2Label.textContent = 'Player 2';
    wrapper.appendChild(player2Label);

    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';

    const player1Label = document.createElement('div');
    player1Label.className = 'player-label player1-label';
    player1Label.textContent = 'Player 1';
    tableContainer.appendChild(player1Label);

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const emptyHeader = document.createElement('th');
    headerRow.appendChild(emptyHeader);

    for (let j = 0; j < dominanceCols; j++) {
        const th = document.createElement('th');
        th.innerHTML = getTrainingStrategyLabel(j, 2);
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let i = 0; i < dominanceRows; i++) {
        const row = document.createElement('tr');
        const labelCell = document.createElement('td');
        labelCell.className = 'row-label';
        labelCell.innerHTML = getTrainingStrategyLabel(i, 1);
        row.appendChild(labelCell);

        for (let j = 0; j < dominanceCols; j++) {
            const cell = document.createElement('td');
            cell.className = 'matrix-cell';

            const values = dominancePayoffs[`${i}-${j}`];
            const p1Display = document.createElement('span');
            p1Display.className = 'payoff-display';
            p1Display.textContent = values.p1;

            const p2Display = document.createElement('span');
            p2Display.className = 'payoff-display';
            p2Display.textContent = values.p2;

            cell.appendChild(p1Display);
            cell.appendChild(p2Display);
            row.appendChild(cell);
        }

        tbody.appendChild(row);
    }
    table.appendChild(tbody);

    tableContainer.appendChild(table);
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);
}

function generateDominanceQuestions() {
    const container = document.getElementById('dominance-questions-container');
    container.innerHTML = '';

    container.appendChild(createDominanceGroup(1, dominanceRows));
    container.appendChild(createDominanceGroup(2, dominanceCols));
}

function createDominanceGroup(playerId, count) {
    const group = document.createElement('div');
    group.className = 'dominance-group';

    const title = document.createElement('h3');
    title.textContent = `Player ${playerId}`;
    group.appendChild(title);

    for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
            const pairKey = `p${playerId}-${i}-${j}`;
            const labelA = getTrainingStrategyLabel(i, playerId);
            const labelB = getTrainingStrategyLabel(j, playerId);
            const relation = GameTheory.getDominanceRelation(
                dominancePayoffs,
                dominanceRows,
                dominanceCols,
                playerId,
                i,
                j
            );
            dominanceAnswerKey[pairKey] = relation;

            const pair = document.createElement('div');
            pair.className = 'dominance-pair';

            const pairLabel = document.createElement('label');
            pairLabel.innerHTML = `${labelA} vs ${labelB}`;
            pair.appendChild(pairLabel);

            const select = document.createElement('select');
            select.className = 'dominance-select';
            select.dataset.answer = relation;

            const options = [
                { value: '', text: 'Select a relation' },
                { value: 'A-weak', text: `${stripMath(labelA)} weakly dominates ${stripMath(labelB)}` },
                { value: 'A-strict', text: `${stripMath(labelA)} strictly dominates ${stripMath(labelB)}` },
                { value: 'B-weak', text: `${stripMath(labelB)} weakly dominates ${stripMath(labelA)}` },
                { value: 'B-strict', text: `${stripMath(labelB)} strictly dominates ${stripMath(labelA)}` },
                { value: 'none', text: 'No dominance relation' }
            ];

            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                select.appendChild(option);
            });

            pair.appendChild(select);
            group.appendChild(pair);
        }
    }

    return group;
}

function stripMath(label) {
    return label.replace(/^\\\(|\\\)$/g, '');
}

function checkDominanceAnswers() {
    const selects = document.querySelectorAll('.dominance-select');
    let correct = 0;
    let total = 0;
    const results = [];

    selects.forEach(select => {
        const answer = select.dataset.answer;
        const chosen = select.value;
        total++;
        select.classList.remove('correct', 'incorrect');

        if (chosen && chosen === answer) {
            correct++;
        }

        results.push({ select, answer, isCorrect: chosen && chosen === answer });
    });

    const feedback = document.getElementById('dominance-feedback');
    const feedbackText = document.getElementById('dominance-feedback-text');
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Show feedback box
    if (feedback) {
        feedback.style.display = 'block';
    }

    // Hide submit button after submitting
    const submitButton = document.getElementById('dominance-check');
    if (submitButton) {
        submitButton.style.display = 'none';
    }

    if (feedback && feedbackText) {
        if (correct === total && total > 0) {
            dominanceCorrectCount++;
            feedback.classList.add('correct');
            feedback.classList.remove('incorrect');
            feedbackText.textContent = `Correct! ${correct}/${total} (${accuracy}%).`;

            updateDominanceStats();
        } else {
            dominanceIncorrectCount++;
            feedback.classList.add('incorrect');
            feedback.classList.remove('correct');
            feedbackText.textContent = `You got ${correct}/${total} (${accuracy}%).`;

            updateDominanceStats();
        }
    }

    // Reveal correct answers: green for correct, red for revealed incorrect
    results.forEach(({ select, answer, isCorrect }) => {
        select.value = answer;
        if (isCorrect) {
            select.classList.add('correct');
            select.classList.remove('incorrect');
        } else {
            select.classList.add('incorrect');
            select.classList.remove('correct');
        }
    });
}

function updateDominanceStats() {
    const correctEl = document.getElementById('dominance-correct');
    const incorrectEl = document.getElementById('dominance-incorrect');
    const accuracyEl = document.getElementById('dominance-accuracy');

    if (!correctEl || !incorrectEl || !accuracyEl) {
        return;
    }

    correctEl.textContent = dominanceCorrectCount;
    incorrectEl.textContent = dominanceIncorrectCount;

    const total = dominanceCorrectCount + dominanceIncorrectCount;
    const accuracy = total > 0 ? Math.round((dominanceCorrectCount / total) * 100) : 0;
    accuracyEl.textContent = `${accuracy}%`;
}

function resetDominanceSession() {
    dominanceCorrectCount = 0;
    dominanceIncorrectCount = 0;
    updateDominanceStats();
    generateDominanceProblem();
}

document.getElementById('dominance-next').addEventListener('click', generateDominanceProblem);
document.getElementById('dominance-reset').addEventListener('click', resetDominanceSession);
document.getElementById('dominance-check').addEventListener('click', checkDominanceAnswers);

// Nash mode functions
function generateNashProblem() {
    nashRows = Math.floor(Math.random() * 2) + 2;
    nashCols = Math.floor(Math.random() * 2) + 2;
    nashPayoffs = GameTheory.generateRandomPayoffs(nashRows, nashCols);
    nashEquilibria = GameTheory.calculateNashEquilibria(nashPayoffs, nashRows, nashCols);
    nashSelected = new Set();

    generateNashMatrix();
    
    // Hide feedback
    const feedbackBox = document.getElementById('nash-feedback');
    if (feedbackBox) {
        feedbackBox.style.display = 'none';
        feedbackBox.classList.remove('correct', 'incorrect');
    }
    
    renderMath();
}

function getNashStrategyLabel(index, player) {
    const maxStrategies = player === 1 ? nashRows : nashCols;
    if (player === 1) {
        if (maxStrategies <= 3) {
            if (index === 0) return '\\(A\\)';
            if (index === 1) return '\\(B\\)';
            if (index === 2) return '\\(C\\)';
        }
        return `\\(A_{${index + 1}}\\)`;
    }
    if (maxStrategies <= 3) {
        if (index === 0) return '\\(X\\)';
        if (index === 1) return '\\(Y\\)';
        if (index === 2) return '\\(Z\\)';
    }
    return `\\(X_{${index + 1}}\\)`;
}

function generateNashMatrix() {
    const container = document.getElementById('nash-matrix-container');
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'matrix-wrapper';

    const player2Label = document.createElement('div');
    player2Label.className = 'player-label player2-label';
    player2Label.textContent = 'Player 2';
    wrapper.appendChild(player2Label);

    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';

    const player1Label = document.createElement('div');
    player1Label.className = 'player-label player1-label';
    player1Label.textContent = 'Player 1';
    tableContainer.appendChild(player1Label);

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const emptyHeader = document.createElement('th');
    headerRow.appendChild(emptyHeader);

    for (let j = 0; j < nashCols; j++) {
        const th = document.createElement('th');
        th.innerHTML = getNashStrategyLabel(j, 2);
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let i = 0; i < nashRows; i++) {
        const row = document.createElement('tr');

        const labelCell = document.createElement('td');
        labelCell.className = 'row-label';
        labelCell.innerHTML = getNashStrategyLabel(i, 1);
        row.appendChild(labelCell);

        for (let j = 0; j < nashCols; j++) {
            const cell = document.createElement('td');
            cell.className = 'matrix-cell nash-cell';
            cell.dataset.key = `${i}-${j}`;

            const values = nashPayoffs[`${i}-${j}`];
            const p1Display = document.createElement('span');
            p1Display.className = 'payoff-display';
            p1Display.textContent = values.p1;

            const p2Display = document.createElement('span');
            p2Display.className = 'payoff-display';
            p2Display.textContent = values.p2;

            cell.appendChild(p1Display);
            cell.appendChild(p2Display);

            cell.addEventListener('click', () => toggleNashSelection(cell));
            row.appendChild(cell);
        }

        tbody.appendChild(row);
    }
    table.appendChild(tbody);

    tableContainer.appendChild(table);
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);
}

function toggleNashSelection(cell) {
    const key = cell.dataset.key;
    if (!key) {
        return;
    }

    if (nashSelected.has(key)) {
        nashSelected.delete(key);
        cell.classList.remove('selected');
    } else {
        nashSelected.add(key);
        cell.classList.add('selected');
    }
}

function submitNashAnswer() {
    const feedbackText = document.getElementById('nash-feedback-text');
    const feedbackBox = document.getElementById('nash-feedback');
    const hasEquilibria = nashEquilibria.size > 0;

    // Show feedback box
    if (feedbackBox) {
        feedbackBox.style.display = 'block';
    }

    document.querySelectorAll('.nash-cell').forEach(cell => {
        cell.classList.remove('correct', 'incorrect');
    });

    let isCorrect = false;
    const selectedArray = Array.from(nashSelected).sort();
    const equilibriaArray = Array.from(nashEquilibria).sort();
    isCorrect = selectedArray.length === equilibriaArray.length
        && selectedArray.every((value, index) => value === equilibriaArray[index]);

    if (feedbackText && feedbackBox) {
        if (isCorrect) {
            nashCorrectCount++;
            feedbackBox.classList.add('correct');
            feedbackBox.classList.remove('incorrect');
            feedbackText.textContent = 'Correct! Use "Generate New Matrix" to continue.';
        } else {
            nashIncorrectCount++;
            feedbackBox.classList.add('incorrect');
            feedbackBox.classList.remove('correct');
            feedbackText.textContent = hasEquilibria
                ? 'Not quite. Highlighted cells show the correct equilibriums.'
                : 'Not quite. There are no pure Nash equilibriums.';
        }
    }

    if (!isCorrect) {
        // Highlight missed equilibriums (correct but not selected)
        nashEquilibria.forEach(key => {
            if (!nashSelected.has(key)) {
                const cell = document.querySelector(`.nash-cell[data-key="${key}"]`);
                if (cell) {
                    cell.classList.add('missed');
                }
            }
        });
        
        // Cross out incorrectly selected cells (selected but not equilibriums)
        nashSelected.forEach(key => {
            if (!nashEquilibria.has(key)) {
                const cell = document.querySelector(`.nash-cell[data-key="${key}"]`);
                if (cell) {
                    cell.classList.add('crossed-out');
                }
            }
        });
    }

    updateNashStats();
}

function updateNashFeedback(message, isCorrect) {
    const feedbackText = document.getElementById('nash-feedback-text');
    const feedbackBox = document.getElementById('nash-feedback');
    if (!feedbackText || !feedbackBox) {
        return;
    }

    feedbackText.textContent = message;
    feedbackBox.classList.remove('correct', 'incorrect');
    if (isCorrect === true) {
        feedbackBox.classList.add('correct');
    } else if (isCorrect === false) {
        feedbackBox.classList.add('incorrect');
    }
}

function updateNashStats() {
    const correctEl = document.getElementById('nash-correct');
    const incorrectEl = document.getElementById('nash-incorrect');
    const accuracyEl = document.getElementById('nash-accuracy');

    if (!correctEl || !incorrectEl || !accuracyEl) {
        return;
    }

    correctEl.textContent = nashCorrectCount;
    incorrectEl.textContent = nashIncorrectCount;

    const total = nashCorrectCount + nashIncorrectCount;
    const accuracy = total > 0 ? Math.round((nashCorrectCount / total) * 100) : 0;
    accuracyEl.textContent = `${accuracy}%`;
}

function resetNashSession() {
    nashCorrectCount = 0;
    nashIncorrectCount = 0;
    updateNashStats();
    generateNashProblem();
}

document.getElementById('nash-reset').addEventListener('click', resetNashSession);
document.getElementById('nash-next').addEventListener('click', generateNashProblem);
document.getElementById('nash-submit').addEventListener('click', submitNashAnswer);
