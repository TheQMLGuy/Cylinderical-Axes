/**
 * Mathematical function definitions for Parallel Axes Visualizer
 * Each function includes: evaluate(), getDescription(), getDefaultParams()
 */

const MathFunctions = {
    // ===== Custom Function (User Input) =====
    custom: {
        name: 'Custom',
        formula: 'y = f(x)',
        description: 'Enter your own mathematical expression using x as the variable',
        params: {},
        evaluate: (x, params) => {
            // Delegate to global custom evaluator set by main.js
            if (window.customFunctionEvaluator) {
                return window.customFunctionEvaluator(x);
            }
            return x; // Default to y = x
        },
        getYRange: (xMin, xMax, params) => {
            // Will be dynamically computed based on actual function values
            return { yMin: -10, yMax: 10 };
        }
    },

    // ===== Linear Functions =====
    linear: {
        name: 'Linear',
        formula: 'y = x',
        description: 'Linear function - all connecting lines are parallel, revealing the essence of direct proportionality',
        params: {},
        evaluate: (x, params) => x,
        getYRange: (xMin, xMax, params) => ({ yMin: xMin, yMax: xMax })
    },


    linearCustom: {
        name: 'Linear (Custom)',
        formula: 'y = mx + b',
        description: 'Adjustable linear function - slope (m) controls the angle of parallel lines, intercept (b) shifts them',
        params: {
            m: { label: 'Slope (m)', min: -5, max: 5, step: 0.1, default: 1 },
            b: { label: 'Intercept (b)', min: -10, max: 10, step: 0.5, default: 0 }
        },
        evaluate: (x, params) => params.m * x + params.b,
        getYRange: (xMin, xMax, params) => {
            const y1 = params.m * xMin + params.b;
            const y2 = params.m * xMax + params.b;
            return { yMin: Math.min(y1, y2), yMax: Math.max(y1, y2) };
        }
    },

    // ===== Polynomial Functions =====
    quadratic: {
        name: 'Quadratic',
        formula: 'y = x²',
        description: 'Quadratic function - creates a beautiful "bowtie" pattern where lines converge at the origin',
        params: {},
        evaluate: (x, params) => x * x,
        getYRange: (xMin, xMax, params) => {
            const absMax = Math.max(Math.abs(xMin), Math.abs(xMax));
            return { yMin: 0, yMax: absMax * absMax };
        }
    },

    cubic: {
        name: 'Cubic',
        formula: 'y = x³',
        description: 'Cubic function - asymmetric pattern with lines crossing through the origin in an S-curve fashion',
        params: {},
        evaluate: (x, params) => x * x * x,
        getYRange: (xMin, xMax, params) => {
            const y1 = xMin * xMin * xMin;
            const y2 = xMax * xMax * xMax;
            return { yMin: Math.min(y1, y2), yMax: Math.max(y1, y2) };
        }
    },

    quadraticFull: {
        name: 'Quadratic (Full)',
        formula: 'y = ax² + bx + c',
        description: 'General quadratic - adjust coefficients to see how the parabola pattern transforms',
        params: {
            a: { label: 'Coefficient a', min: -3, max: 3, step: 0.1, default: 1 },
            b: { label: 'Coefficient b', min: -5, max: 5, step: 0.5, default: 0 },
            c: { label: 'Constant c', min: -10, max: 10, step: 0.5, default: 0 }
        },
        evaluate: (x, params) => params.a * x * x + params.b * x + params.c,
        getYRange: (xMin, xMax, params) => {
            // Sample multiple points to find range
            const samples = [];
            for (let i = 0; i <= 20; i++) {
                const x = xMin + (xMax - xMin) * i / 20;
                samples.push(params.a * x * x + params.b * x + params.c);
            }
            return { yMin: Math.min(...samples), yMax: Math.max(...samples) };
        }
    },

    // ===== Trigonometric Functions =====
    sin: {
        name: 'Sine',
        formula: 'y = sin(x)',
        description: 'Sine wave - creates mesmerizing oscillating patterns that weave between -1 and 1',
        params: {},
        evaluate: (x, params) => Math.sin(x),
        getYRange: (xMin, xMax, params) => ({ yMin: -1.2, yMax: 1.2 })
    },

    cos: {
        name: 'Cosine',
        formula: 'y = cos(x)',
        description: 'Cosine wave - similar to sine but phase-shifted, creating a different weaving pattern',
        params: {},
        evaluate: (x, params) => Math.cos(x),
        getYRange: (xMin, xMax, params) => ({ yMin: -1.2, yMax: 1.2 })
    },

    tan: {
        name: 'Tangent',
        formula: 'y = tan(x)',
        description: 'Tangent function - dramatic vertical asymptotes create striking discontinuous patterns',
        params: {},
        evaluate: (x, params) => {
            return Math.tan(x);
        },
        getYRange: (xMin, xMax, params) => ({ yMin: -10, yMax: 10 })
    },

    // ===== Other Functions =====
    sqrt: {
        name: 'Square Root',
        formula: 'y = √x',
        description: 'Square root - only defined for x ≥ 0, lines fan out from origin with decreasing slope',
        params: {},
        evaluate: (x, params) => x >= 0 ? Math.sqrt(x) : NaN,
        getYRange: (xMin, xMax, params) => {
            const effectiveMin = Math.max(0, xMin);
            return { yMin: 0, yMax: Math.sqrt(Math.max(0, xMax)) + 0.5 };
        }
    },

    abs: {
        name: 'Absolute Value',
        formula: 'y = |x|',
        description: 'Absolute value - creates a symmetric "V" pattern with lines meeting at origin',
        params: {},
        evaluate: (x, params) => Math.abs(x),
        getYRange: (xMin, xMax, params) => {
            const absMax = Math.max(Math.abs(xMin), Math.abs(xMax));
            return { yMin: 0, yMax: absMax };
        }
    },

    reciprocal: {
        name: 'Reciprocal',
        formula: 'y = 1/x',
        description: 'Reciprocal function - hyperbolic pattern with asymptote at x = 0',
        params: {},
        evaluate: (x, params) => {
            if (x === 0) return NaN;
            return 1 / x;
        },
        getYRange: (xMin, xMax, params) => ({ yMin: -10, yMax: 10 })
    },

    exp: {
        name: 'Exponential',
        formula: 'y = eˣ',
        description: 'Exponential growth - lines spread dramatically for positive x, compress for negative',
        params: {},
        evaluate: (x, params) => {
            return Math.exp(x);
        },
        getYRange: (xMin, xMax, params) => {
            return { yMin: 0, yMax: Math.exp(xMax) };
        }
    },

    log: {
        name: 'Natural Log',
        formula: 'y = ln(x)',
        description: 'Natural logarithm - only defined for x > 0, inverse of exponential',
        params: {},
        evaluate: (x, params) => x > 0 ? Math.log(x) : NaN,
        getYRange: (xMin, xMax, params) => {
            const effectiveMin = Math.max(0.01, xMin);
            return {
                yMin: Math.log(effectiveMin),
                yMax: Math.log(Math.max(0.01, xMax))
            };
        }
    }
};

// Helper to get formatted formula with current parameter values
function getFormattedFormula(funcKey, params) {
    const func = MathFunctions[funcKey];
    if (!func) return '';

    let formula = func.formula;

    // Replace parameter placeholders with actual values
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            // Handle special formatting
            if (key === 'm' && value === 1) {
                formula = formula.replace('m', '');
            } else if (key === 'm' && value === -1) {
                formula = formula.replace('m', '-');
            } else if (value < 0) {
                formula = formula.replace(`+ ${key}`, `- ${Math.abs(value)}`);
                formula = formula.replace(key, value.toString());
            } else {
                formula = formula.replace(key, value.toString());
            }
        }
    }

    return formula;
}

// Export for use in main.js
window.MathFunctions = MathFunctions;
window.getFormattedFormula = getFormattedFormula;
