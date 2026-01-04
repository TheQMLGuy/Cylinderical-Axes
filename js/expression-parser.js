/**
 * Expression Parser Module for Parallel Axes Visualizer
 * Handles custom function parsing, LaTeX conversion, and calculus operations
 * Uses math.js for expression evaluation and symbolic derivatives
 */

const ExpressionParser = (function () {
    // Ensure math.js is loaded
    const math = window.math;

    /**
     * Parse and validate a mathematical expression
     * @param {string} exprString - The expression to parse (e.g., "x^2 + sin(x)")
     * @returns {Object} - { valid: boolean, error?: string, latex: string, evaluate: (x) => number, node?: Object }
     */
    function parseExpression(exprString) {
        if (!exprString || exprString.trim() === '') {
            return {
                valid: false,
                error: 'Please enter an expression',
                latex: '',
                evaluate: () => NaN
            };
        }

        try {
            // Parse the expression into an AST
            const node = math.parse(exprString);

            // Check that only 'x' is used as a variable
            const symbols = new Set();
            node.traverse((n) => {
                if (n.isSymbolNode && n.name !== 'x') {
                    // Check if it's a known function or constant
                    const knownFuncs = ['sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'ln', 'exp', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'floor', 'ceil', 'round', 'sign'];
                    const knownConsts = ['pi', 'e', 'PI', 'E'];
                    if (!knownFuncs.includes(n.name) && !knownConsts.includes(n.name)) {
                        symbols.add(n.name);
                    }
                }
            });

            if (symbols.size > 0) {
                return {
                    valid: false,
                    error: `Unknown variable(s): ${[...symbols].join(', ')}. Use 'x' as the variable.`,
                    latex: '',
                    evaluate: () => NaN
                };
            }

            // Compile the expression for fast evaluation
            const compiled = node.compile();

            // Convert to LaTeX
            const latex = node.toTex({ parenthesis: 'auto' });

            // Create evaluator function
            const evaluate = (x) => {
                try {
                    const result = compiled.evaluate({ x: x });
                    return typeof result === 'number' ? result : NaN;
                } catch (e) {
                    return NaN;
                }
            };

            return {
                valid: true,
                latex: latex,
                evaluate: evaluate,
                node: node,
                expression: exprString
            };
        } catch (e) {
            return {
                valid: false,
                error: e.message || 'Invalid expression',
                latex: '',
                evaluate: () => NaN
            };
        }
    }

    /**
     * Compute the symbolic derivative of an expression
     * @param {string} exprString - The expression to differentiate
     * @returns {Object} - { valid: boolean, latex: string, evaluate: (x) => number, expression: string }
     */
    function computeDerivative(exprString) {
        if (!exprString || exprString.trim() === '') {
            return {
                valid: false,
                latex: '',
                evaluate: () => NaN,
                expression: ''
            };
        }

        try {
            // Compute symbolic derivative
            const derivative = math.derivative(exprString, 'x');

            // Simplify the result
            const simplified = math.simplify(derivative);

            // Convert to LaTeX
            const latex = simplified.toTex({ parenthesis: 'auto' });

            // Compile for evaluation
            const compiled = simplified.compile();

            const evaluate = (x) => {
                try {
                    const result = compiled.evaluate({ x: x });
                    return typeof result === 'number' ? result : NaN;
                } catch (e) {
                    return NaN;
                }
            };

            return {
                valid: true,
                latex: latex,
                evaluate: evaluate,
                expression: simplified.toString()
            };
        } catch (e) {
            // Fallback to numerical derivative if symbolic fails
            return computeNumericalDerivative(exprString);
        }
    }

    /**
     * Compute numerical derivative using central difference
     * @param {string} exprString - The expression
     * @returns {Object} - { valid: boolean, latex: string, evaluate: (x) => number }
     */
    function computeNumericalDerivative(exprString) {
        const parsed = parseExpression(exprString);
        if (!parsed.valid) {
            return {
                valid: false,
                latex: '',
                evaluate: () => NaN
            };
        }

        const h = 1e-7;
        const evaluate = (x) => {
            const fxPlusH = parsed.evaluate(x + h);
            const fxMinusH = parsed.evaluate(x - h);
            return (fxPlusH - fxMinusH) / (2 * h);
        };

        return {
            valid: true,
            latex: `\\frac{d}{dx}\\left(${parsed.latex}\\right)`,
            evaluate: evaluate,
            expression: `derivative of ${exprString}`
        };
    }

    /**
     * Compute the numerical integral (antiderivative approximation)
     * Uses cumulative trapezoidal integration from a reference point
     * @param {string} exprString - The expression to integrate
     * @param {number} xMin - Start of the domain
     * @param {number} xMax - End of the domain
     * @param {number} numPoints - Number of sample points
     * @returns {Object} - { valid: boolean, latex: string, getValues: () => [{x, y}] }
     */
    function computeIntegral(exprString, xMin, xMax, numPoints = 500) {
        const parsed = parseExpression(exprString);
        if (!parsed.valid) {
            return {
                valid: false,
                latex: '',
                getValues: () => []
            };
        }

        // Compute integral values at each point using trapezoidal rule
        // We integrate from xMin to each x, giving F(x) - F(xMin)
        const step = (xMax - xMin) / (numPoints - 1);
        const values = [];
        let integral = 0;

        for (let i = 0; i < numPoints; i++) {
            const x = xMin + i * step;
            const y = parsed.evaluate(x);

            if (i > 0) {
                const prevX = xMin + (i - 1) * step;
                const prevY = parsed.evaluate(prevX);
                // Trapezoidal rule: area = (y1 + y2) / 2 * dx
                if (!isNaN(y) && !isNaN(prevY) && isFinite(y) && isFinite(prevY)) {
                    integral += (prevY + y) / 2 * step;
                }
            }

            values.push({ x: x, y: integral });
        }

        return {
            valid: true,
            latex: `\\int ${parsed.latex}\\, dx`,
            getValues: () => values,
            expression: `integral of ${exprString}`
        };
    }

    /**
     * Create an evaluator function for the integral at any point
     * Uses precomputed values and interpolation
     * @param {string} exprString - The expression
     * @param {number} xMin - Domain start
     * @param {number} xMax - Domain end
     * @returns {Object} - { valid: boolean, latex: string, evaluate: (x) => number }
     */
    function createIntegralEvaluator(exprString, xMin, xMax) {
        const integralData = computeIntegral(exprString, xMin, xMax, 1000);
        if (!integralData.valid) {
            return {
                valid: false,
                latex: '',
                evaluate: () => NaN
            };
        }

        const values = integralData.getValues();

        // Create interpolation function
        const evaluate = (x) => {
            if (x < xMin || x > xMax) return NaN;

            // Find the two closest points
            const t = (x - xMin) / (xMax - xMin);
            const index = t * (values.length - 1);
            const lowerIndex = Math.floor(index);
            const upperIndex = Math.min(lowerIndex + 1, values.length - 1);

            if (lowerIndex < 0) return values[0].y;
            if (upperIndex >= values.length) return values[values.length - 1].y;

            // Linear interpolation
            const fraction = index - lowerIndex;
            return values[lowerIndex].y + fraction * (values[upperIndex].y - values[lowerIndex].y);
        };

        return {
            valid: true,
            latex: integralData.latex,
            evaluate: evaluate,
            expression: integralData.expression
        };
    }

    /**
     * Convert common expression syntax to math.js compatible format
     * @param {string} input - User input
     * @returns {string} - Normalized expression
     */
    function normalizeExpression(input) {
        let expr = input.trim();

        // Handle common patterns
        expr = expr.replace(/\^/g, '^');  // Keep power operator
        expr = expr.replace(/ln\(/g, 'log(');  // ln is log in math.js
        expr = expr.replace(/π/g, 'pi');
        expr = expr.replace(/∞/g, 'Infinity');

        // Handle implicit multiplication: 2x -> 2*x, x(2) -> x*(2), (x)(y) -> (x)*(y)
        expr = expr.replace(/(\d)([a-zA-Z\(])/g, '$1*$2');
        expr = expr.replace(/(\))(\()/g, '$1*$2');
        expr = expr.replace(/(\))([a-zA-Z])/g, '$1*$2');

        return expr;
    }

    /**
     * Get example expressions for the placeholder
     */
    function getExamples() {
        return [
            { expr: 'x^2', desc: 'Quadratic' },
            { expr: 'sin(x)', desc: 'Sine' },
            { expr: 'x^3 - 2*x', desc: 'Cubic' },
            { expr: 'exp(-x^2)', desc: 'Gaussian' },
            { expr: 'x * sin(x)', desc: 'Modulated sine' },
            { expr: '1/(1 + x^2)', desc: 'Lorentzian' },
            { expr: 'sqrt(abs(x))', desc: 'Square root' },
            { expr: 'sin(x) + sin(2*x)/2', desc: 'Fourier terms' }
        ];
    }

    // Public API
    return {
        parse: parseExpression,
        normalize: normalizeExpression,
        derivative: computeDerivative,
        numericalDerivative: computeNumericalDerivative,
        integral: computeIntegral,
        integralEvaluator: createIntegralEvaluator,
        getExamples: getExamples
    };
})();

// Export for use in other modules
window.ExpressionParser = ExpressionParser;
