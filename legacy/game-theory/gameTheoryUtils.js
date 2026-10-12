const GameTheory = (() => {
    function generateRandomPayoffs(rows, cols, min = -5, max = 5) {
        const payoffs = {};
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                payoffs[`${i}-${j}`] = {
                    p1: Math.floor(Math.random() * (max - min + 1)) + min,
                    p2: Math.floor(Math.random() * (max - min + 1)) + min
                };
            }
        }
        return payoffs;
    }

    function calculateBestResponses(payoffs, rows, cols, fixedPlayerId, fixedIndex) {
        const responses = [];

        if (fixedPlayerId === 1) {
            // Player 1 picked a row; Player 2 responds with a column.
            let maxPayoff = payoffs[`${fixedIndex}-0`].p2;
            for (let j = 1; j < cols; j++) {
                const payoff = payoffs[`${fixedIndex}-${j}`].p2;
                if (payoff > maxPayoff) {
                    maxPayoff = payoff;
                }
            }
            for (let j = 0; j < cols; j++) {
                const payoff = payoffs[`${fixedIndex}-${j}`].p2;
                if (payoff === maxPayoff) {
                    responses.push(j);
                }
            }
            return responses;
        }

        // Player 2 picked a column; Player 1 responds with a row.
        let maxPayoff = payoffs[`0-${fixedIndex}`].p1;
        for (let i = 1; i < rows; i++) {
            const payoff = payoffs[`${i}-${fixedIndex}`].p1;
            if (payoff > maxPayoff) {
                maxPayoff = payoff;
            }
        }
        for (let i = 0; i < rows; i++) {
            const payoff = payoffs[`${i}-${fixedIndex}`].p1;
            if (payoff === maxPayoff) {
                responses.push(i);
            }
        }

        return responses;
    }

    function getDominanceCompare(payoffs, rows, cols, playerId, indexA, indexB) {
        let aWeak = true;
        let bWeak = true;
        let aStrictEvery = true;
        let bStrictEvery = true;
        let aStrictSome = false;
        let bStrictSome = false;

        if (playerId === 1) {
            for (let j = 0; j < cols; j++) {
                const payoffA = payoffs[`${indexA}-${j}`].p1;
                const payoffB = payoffs[`${indexB}-${j}`].p1;

                if (payoffA < payoffB) {
                    aWeak = false;
                    aStrictEvery = false;
                } else if (payoffA === payoffB) {
                    aStrictEvery = false;
                } else {
                    aStrictSome = true;
                }

                if (payoffB < payoffA) {
                    bWeak = false;
                    bStrictEvery = false;
                } else if (payoffB === payoffA) {
                    bStrictEvery = false;
                } else {
                    bStrictSome = true;
                }
            }
        } else {
            for (let i = 0; i < rows; i++) {
                const payoffA = payoffs[`${i}-${indexA}`].p2;
                const payoffB = payoffs[`${i}-${indexB}`].p2;

                if (payoffA < payoffB) {
                    aWeak = false;
                    aStrictEvery = false;
                } else if (payoffA === payoffB) {
                    aStrictEvery = false;
                } else {
                    aStrictSome = true;
                }

                if (payoffB < payoffA) {
                    bWeak = false;
                    bStrictEvery = false;
                } else if (payoffB === payoffA) {
                    bStrictEvery = false;
                } else {
                    bStrictSome = true;
                }
            }
        }

        const aStrict = aStrictEvery && aStrictSome;
        const bStrict = bStrictEvery && bStrictSome;
        const aWeakOnly = aWeak && aStrictSome && !aStrict;
        const bWeakOnly = bWeak && bStrictSome && !bStrict;

        return {
            aStrict,
            bStrict,
            aWeak: aWeakOnly,
            bWeak: bWeakOnly
        };
    }

    function getDominanceRelation(payoffs, rows, cols, playerId, indexA, indexB) {
        const compare = getDominanceCompare(payoffs, rows, cols, playerId, indexA, indexB);
        if (compare.aStrict) {
            return 'A-strict';
        }
        if (compare.bStrict) {
            return 'B-strict';
        }
        if (compare.aWeak) {
            return 'A-weak';
        }
        if (compare.bWeak) {
            return 'B-weak';
        }
        return 'none';
    }

    function hasStrictDominance(payoffs, rows, cols) {
        for (let i = 0; i < rows; i++) {
            for (let j = i + 1; j < rows; j++) {
                const compare = getDominanceCompare(payoffs, rows, cols, 1, i, j);
                if (compare.aStrict || compare.bStrict) {
                    return true;
                }
            }
        }

        for (let i = 0; i < cols; i++) {
            for (let j = i + 1; j < cols; j++) {
                const compare = getDominanceCompare(payoffs, rows, cols, 2, i, j);
                if (compare.aStrict || compare.bStrict) {
                    return true;
                }
            }
        }

        return false;
    }

    function calculateNashEquilibria(payoffs, rows, cols) {
        const equilibria = new Set();
        const bestRowsForCol = Array.from({ length: cols }, () => []);
        const bestColsForRow = Array.from({ length: rows }, () => []);

        for (let j = 0; j < cols; j++) {
            let maxP1 = payoffs[`0-${j}`].p1;
            for (let i = 1; i < rows; i++) {
                const payoff = payoffs[`${i}-${j}`].p1;
                if (payoff > maxP1) {
                    maxP1 = payoff;
                }
            }
            for (let i = 0; i < rows; i++) {
                if (payoffs[`${i}-${j}`].p1 === maxP1) {
                    bestRowsForCol[j].push(i);
                }
            }
        }

        for (let i = 0; i < rows; i++) {
            let maxP2 = payoffs[`${i}-0`].p2;
            for (let j = 1; j < cols; j++) {
                const payoff = payoffs[`${i}-${j}`].p2;
                if (payoff > maxP2) {
                    maxP2 = payoff;
                }
            }
            for (let j = 0; j < cols; j++) {
                if (payoffs[`${i}-${j}`].p2 === maxP2) {
                    bestColsForRow[i].push(j);
                }
            }
        }

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (bestRowsForCol[j].includes(i) && bestColsForRow[i].includes(j)) {
                    equilibria.add(`${i}-${j}`);
                }
            }
        }

        return equilibria;
    }

    function generateMixedStrategy(numStrategies) {
        // Generate a mixed strategy with probabilities in multiples of 10%
        // that sum to 100%
        const probabilities = [];
        let remaining = 10; // We work in tenths (10 = 100%)
        
        for (let i = 0; i < numStrategies - 1; i++) {
            if (remaining === 0) {
                probabilities.push(0);
            } else {
                // Random number of tenths, but leave at least one for remaining strategies
                const maxAllocation = remaining - (numStrategies - i - 1);
                const allocation = Math.floor(Math.random() * (maxAllocation + 1));
                probabilities.push(allocation / 10);
                remaining -= allocation;
            }
        }
        
        // Last strategy gets the remainder
        probabilities.push(remaining / 10);
        
        return probabilities;
    }

    function calculateExpectedValue(payoffs, rows, cols, playerId, strategyIndex, mixedStrategy) {
        // Calculate expected value for a player's pure strategy against opponent's mixed strategy
        let expectedValue = 0;
        
        if (playerId === 1) {
            // Player 1's strategy (row) against Player 2's mixed strategy (columns)
            for (let j = 0; j < cols; j++) {
                const payoff = payoffs[`${strategyIndex}-${j}`].p1;
                expectedValue += payoff * mixedStrategy[j];
            }
        } else {
            // Player 2's strategy (column) against Player 1's mixed strategy (rows)
            for (let i = 0; i < rows; i++) {
                const payoff = payoffs[`${i}-${strategyIndex}`].p2;
                expectedValue += payoff * mixedStrategy[i];
            }
        }
        
        return expectedValue;
    }

    function calculateIndifferenceProbability(payoffs, mixingPlayer) {
        // For a 2x2 game, calculate the probability p such that the opponent is indifferent
        // mixingPlayer = 1: Player 1 mixes between rows (A, B) with probability (p, 1-p)
        //                   Makes Player 2 indifferent between columns (X, Y)
        // mixingPlayer = 2: Player 2 mixes between columns (X, Y) with probability (q, 1-q)
        //                   Makes Player 1 indifferent between rows (A, B)
        
        if (mixingPlayer === 1) {
            // Player 1 plays (p, 1-p), making Player 2 indifferent
            // EV for P2 playing X: p * payoffs['0-0'].p2 + (1-p) * payoffs['1-0'].p2
            // EV for P2 playing Y: p * payoffs['0-1'].p2 + (1-p) * payoffs['1-1'].p2
            // Set them equal and solve for p:
            // p * payoffs['0-0'].p2 + (1-p) * payoffs['1-0'].p2 = p * payoffs['0-1'].p2 + (1-p) * payoffs['1-1'].p2
            // p * (payoffs['0-0'].p2 - payoffs['1-0'].p2 - payoffs['0-1'].p2 + payoffs['1-1'].p2) = payoffs['1-1'].p2 - payoffs['1-0'].p2
            
            const a = payoffs['0-0'].p2;
            const b = payoffs['1-0'].p2;
            const c = payoffs['0-1'].p2;
            const d = payoffs['1-1'].p2;
            
            const denominator = a - b - c + d;
            if (Math.abs(denominator) < 0.0001) {
                return null; // No unique solution
            }
            
            const p = (d - b) / denominator;
            return p;
        } else {
            // Player 2 plays (q, 1-q), making Player 1 indifferent
            // EV for P1 playing A: q * payoffs['0-0'].p1 + (1-q) * payoffs['0-1'].p1
            // EV for P1 playing B: q * payoffs['1-0'].p1 + (1-q) * payoffs['1-1'].p1
            // Set them equal and solve for q:
            
            const a = payoffs['0-0'].p1;
            const b = payoffs['0-1'].p1;
            const c = payoffs['1-0'].p1;
            const d = payoffs['1-1'].p1;
            
            const denominator = a - b - c + d;
            if (Math.abs(denominator) < 0.0001) {
                return null; // No unique solution
            }
            
            const q = (d - b) / denominator;
            return q;
        }
    }

    function generate2x2WithoutPureNash() {
        // Generate a 2x2 matrix with no pure Nash equilibria
        let payoffs;
        let equilibria;
        let attempts = 0;
        const maxAttempts = 100;
        
        do {
            payoffs = generateRandomPayoffs(2, 2, -5, 5);
            equilibria = calculateNashEquilibria(payoffs, 2, 2);
            attempts++;
        } while (equilibria.size > 0 && attempts < maxAttempts);
        
        if (equilibria.size > 0) {
            // Fallback: manually create a game with no pure Nash equilibrium
            // A simple matching pennies-like game
            payoffs = {
                '0-0': { p1: 1, p2: -1 },
                '0-1': { p1: -1, p2: 1 },
                '1-0': { p1: -1, p2: 1 },
                '1-1': { p1: 1, p2: -1 }
            };
        }
        
        return payoffs;
    }

    return {
        generateRandomPayoffs,
        calculateBestResponses,
        getDominanceCompare,
        getDominanceRelation,
        hasStrictDominance,
        calculateNashEquilibria,
        generateMixedStrategy,
        calculateExpectedValue,
        calculateIndifferenceProbability,
        generate2x2WithoutPureNash
    };
})();
