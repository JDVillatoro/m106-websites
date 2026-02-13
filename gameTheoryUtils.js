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

    return {
        generateRandomPayoffs,
        calculateBestResponses,
        getDominanceCompare,
        getDominanceRelation,
        hasStrictDominance,
        calculateNashEquilibria
    };
})();
