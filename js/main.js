/**
 * Parallel Axes Visualizer - Main Application
 * Renders mathematical functions on parallel coordinate axes
 */

class ParallelAxesVisualizer {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('parallelCanvas');
        this.ctx = this.canvas.getContext('2d');

        // State
        this.currentFunction = 'linear';
        this.params = {};
        this.numPoints = 25;
        this.xMin = -5;
        this.xMax = 5;
        this.isAnimating = false;
        this.animationProgress = 0;
        this.animationSpeed = 5;
        this.animationId = null;

        // Visual options
        this.lineColorMode = 'gradient';
        this.showGrid = true;
        this.showPoints = true;
        this.continuousMode = false;

        // Layout
        this.padding = { top: 60, bottom: 60, left: 100, right: 100 };
        this.axisGap = 0; // Will be calculated

        // Hover state
        this.hoveredLine = null;
        this.tooltip = document.getElementById('tooltip');

        // Data points for current function
        this.dataPoints = [];

        // Initialize
        this.init();
    }

    init() {
        this.setupCanvas();
        this.bindEvents();
        this.loadFunctionParams();
        this.calculateDataPoints();
        this.render();

        // Initial resize
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = container.clientWidth * dpr;
        this.canvas.height = container.clientHeight * dpr;
        this.canvas.style.width = container.clientWidth + 'px';
        this.canvas.style.height = container.clientHeight + 'px';

        this.ctx.scale(dpr, dpr);

        this.width = container.clientWidth;
        this.height = container.clientHeight;

        // Calculate axis gap (distance between X and Y axes)
        this.axisGap = this.width - this.padding.left - this.padding.right;
    }

    handleResize() {
        this.setupCanvas();
        this.render();
    }

    bindEvents() {
        // Function selector
        document.getElementById('functionSelect').addEventListener('change', (e) => {
            this.currentFunction = e.target.value;
            this.loadFunctionParams();
            this.resetAnimation();
            this.calculateDataPoints();
            this.render();
            this.updateDescription();
        });

        // Number of points
        const numPointsSlider = document.getElementById('numPoints');
        numPointsSlider.addEventListener('input', (e) => {
            this.numPoints = parseInt(e.target.value);
            document.getElementById('numPointsValue').textContent = this.numPoints;
            this.calculateDataPoints();
            this.render();
        });

        // X range inputs
        document.getElementById('xMin').addEventListener('change', (e) => {
            this.xMin = parseFloat(e.target.value);
            this.calculateDataPoints();
            this.render();
        });

        document.getElementById('xMax').addEventListener('change', (e) => {
            this.xMax = parseFloat(e.target.value);
            this.calculateDataPoints();
            this.render();
        });

        // Animation controls
        document.getElementById('playBtn').addEventListener('click', () => this.toggleAnimation());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetAnimation());

        // Animation speed
        const speedSlider = document.getElementById('animSpeed');
        speedSlider.addEventListener('input', (e) => {
            this.animationSpeed = parseInt(e.target.value);
            document.getElementById('animSpeedValue').textContent = this.animationSpeed;
        });

        // Visual options
        document.getElementById('lineColorMode').addEventListener('change', (e) => {
            this.lineColorMode = e.target.value;
            this.render();
        });

        document.getElementById('showGrid').addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.render();
        });

        document.getElementById('showPoints').addEventListener('change', (e) => {
            this.showPoints = e.target.checked;
            this.render();
        });

        // Continuous mode checkbox
        const continuousCheckbox = document.getElementById('continuousMode');
        if (continuousCheckbox) {
            continuousCheckbox.addEventListener('change', (e) => {
                this.continuousMode = e.target.checked;
                this.calculateDataPoints();
                this.render();
            });
        }

        // Mouse events for hover
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    }

    loadFunctionParams() {
        const func = MathFunctions[this.currentFunction];
        const container = document.getElementById('parameterControls');
        container.innerHTML = '';

        this.params = {};

        if (!func.params || Object.keys(func.params).length === 0) {
            document.getElementById('parametersSection').style.display = 'none';
            return;
        }

        document.getElementById('parametersSection').style.display = 'block';

        for (const [key, config] of Object.entries(func.params)) {
            this.params[key] = config.default;

            const group = document.createElement('div');
            group.className = 'control-group';

            group.innerHTML = `
                <label for="param_${key}">${config.label}</label>
                <div class="range-wrapper">
                    <input type="range" id="param_${key}" 
                           min="${config.min}" max="${config.max}" 
                           step="${config.step}" value="${config.default}">
                    <span class="range-value" id="param_${key}_value">${config.default}</span>
                </div>
            `;

            container.appendChild(group);

            // Bind event
            document.getElementById(`param_${key}`).addEventListener('input', (e) => {
                this.params[key] = parseFloat(e.target.value);
                document.getElementById(`param_${key}_value`).textContent = this.params[key];
                this.calculateDataPoints();
                this.render();
                this.updateDescription();
            });
        }
    }

    calculateDataPoints() {
        const func = MathFunctions[this.currentFunction];
        if (!func) return;

        this.dataPoints = [];

        // For continuous mode: sample at every pixel of the axis height
        // This creates truly continuous lines with no gaps
        let actualNumPoints;
        if (this.continuousMode) {
            // Get the height of the drawable area in pixels
            const axisHeight = this.height - this.padding.top - this.padding.bottom;
            // Sample at least one point per pixel, making it truly continuous
            actualNumPoints = Math.max(axisHeight, 500);
        } else {
            actualNumPoints = this.numPoints;
        }

        const step = (this.xMax - this.xMin) / (actualNumPoints - 1);

        for (let i = 0; i < actualNumPoints; i++) {
            const x = this.xMin + i * step;
            const y = func.evaluate(x, this.params);

            if (!isNaN(y) && isFinite(y)) {
                // Check if Y is out of range
                const outOfRange = y < this.xMin || y > this.xMax;
                this.dataPoints.push({ x, y, index: i, outOfRange });
            }
        }

        // IMPORTANT: Use same range for Y as X to see true picture
        this.yMin = this.xMin;
        this.yMax = this.xMax;
    }

    // Convert data coordinates to canvas coordinates
    xToCanvas(x) {
        // X axis is on the left - INVERTED so top = positive (max), bottom = negative (min)
        const t = (x - this.xMin) / (this.xMax - this.xMin);
        return this.height - this.padding.bottom - t * (this.height - this.padding.top - this.padding.bottom);
    }

    yToCanvas(y) {
        // Y axis is on the right - SAME orientation as X axis (top = max, bottom = min)
        const t = (y - this.yMin) / (this.yMax - this.yMin);
        return this.height - this.padding.bottom - t * (this.height - this.padding.top - this.padding.bottom);
    }

    // Clamp Y to visible range for drawing
    yToCanvasClamped(y) {
        const clampedY = Math.max(this.yMin, Math.min(this.yMax, y));
        return this.yToCanvas(clampedY);
    }

    // Get X position of left axis (X-axis)
    getXAxisX() {
        return this.padding.left;
    }

    // Get X position of right axis (Y-axis)
    getYAxisX() {
        return this.width - this.padding.right;
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw grid first (behind everything)
        if (this.showGrid) {
            this.drawGrid();
        }

        // Draw axes
        this.drawAxes();

        // Draw connecting lines
        this.drawFunctionLines();

        // Draw data points on top
        if (this.showPoints) {
            this.drawDataPoints();
        }
    }

    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;

        // Horizontal grid lines
        const numHLines = 10;
        for (let i = 0; i <= numHLines; i++) {
            const y = this.padding.top + (i / numHLines) * (this.height - this.padding.top - this.padding.bottom);
            ctx.beginPath();
            ctx.moveTo(this.padding.left, y);
            ctx.lineTo(this.width - this.padding.right, y);
            ctx.stroke();
        }
    }

    drawAxes() {
        const ctx = this.ctx;
        const xAxisX = this.getXAxisX();
        const yAxisX = this.getYAxisX();
        const top = this.padding.top;
        const bottom = this.height - this.padding.bottom;

        // Create gradients for axes
        const xGrad = ctx.createLinearGradient(xAxisX, top, xAxisX, bottom);
        xGrad.addColorStop(0, '#06b6d4');
        xGrad.addColorStop(1, '#8b5cf6');

        const yGrad = ctx.createLinearGradient(yAxisX, top, yAxisX, bottom);
        yGrad.addColorStop(0, '#f472b6');
        yGrad.addColorStop(1, '#fb923c');

        // Draw X axis (left)
        ctx.strokeStyle = xGrad;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(xAxisX, top);
        ctx.lineTo(xAxisX, bottom);
        ctx.stroke();

        // Draw Y axis (right)
        ctx.strokeStyle = yGrad;
        ctx.beginPath();
        ctx.moveTo(yAxisX, top);
        ctx.lineTo(yAxisX, bottom);
        ctx.stroke();

        // Draw axis labels
        ctx.font = '600 14px Inter, sans-serif';
        ctx.textAlign = 'center';

        ctx.fillStyle = '#06b6d4';
        ctx.fillText('X', xAxisX, top - 25);

        ctx.fillStyle = '#f472b6';
        ctx.fillText('Y', yAxisX, top - 25);

        // Draw tick marks and values
        this.drawAxisTicks();
    }

    drawAxisTicks() {
        const ctx = this.ctx;
        const xAxisX = this.getXAxisX();
        const yAxisX = this.getYAxisX();
        const tickLength = 8;

        ctx.font = '400 11px JetBrains Mono, monospace';
        ctx.lineWidth = 1;

        // X-axis ticks (shows x values)
        const numXTicks = 5;
        for (let i = 0; i <= numXTicks; i++) {
            const value = this.xMin + (i / numXTicks) * (this.xMax - this.xMin);
            const y = this.xToCanvas(value);

            ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
            ctx.beginPath();
            ctx.moveTo(xAxisX - tickLength, y);
            ctx.lineTo(xAxisX, y);
            ctx.stroke();

            ctx.fillStyle = '#a0a0b0';
            ctx.textAlign = 'right';
            ctx.fillText(value.toFixed(1), xAxisX - tickLength - 5, y + 4);
        }

        // Y-axis ticks (shows y values)
        const numYTicks = 5;
        for (let i = 0; i <= numYTicks; i++) {
            const value = this.yMin + (i / numYTicks) * (this.yMax - this.yMin);
            const y = this.yToCanvas(value);

            ctx.strokeStyle = 'rgba(244, 114, 182, 0.5)';
            ctx.beginPath();
            ctx.moveTo(yAxisX, y);
            ctx.lineTo(yAxisX + tickLength, y);
            ctx.stroke();

            ctx.fillStyle = '#a0a0b0';
            ctx.textAlign = 'left';
            ctx.fillText(value.toFixed(1), yAxisX + tickLength + 5, y + 4);
        }
    }

    drawFunctionLines() {
        const ctx = this.ctx;
        const xAxisX = this.getXAxisX();
        const yAxisX = this.getYAxisX();

        // Determine how many lines to draw based on animation
        const linesToDraw = this.isAnimating
            ? Math.floor(this.animationProgress * this.dataPoints.length)
            : this.dataPoints.length;

        if (this.continuousMode && linesToDraw > 1) {
            // TRUE CONTINUOUS MODE: Draw lines at every pixel - so dense they appear solid
            this.drawContinuousLines(linesToDraw);
        } else {
            // DISCRETE MODE: Draw individual lines
            this.drawDiscreteLines(linesToDraw);
        }
    }

    drawContinuousLines(linesToDraw) {
        const ctx = this.ctx;
        const xAxisX = this.getXAxisX();
        const yAxisX = this.getYAxisX();

        // In continuous mode, we draw individual lines at every pixel
        // This creates a truly continuous appearance

        // Use thin lines with moderate opacity so overlapping creates solid look
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.5;

        for (let i = 0; i < linesToDraw; i++) {
            const point = this.dataPoints[i];
            const xCanvasY = this.xToCanvas(point.x);

            // Skip out-of-range points (draw red marker later)
            if (point.outOfRange) {
                continue;
            }

            const yCanvasY = this.yToCanvas(point.y);

            // Color based on position for gradient effect
            const t = i / (this.dataPoints.length - 1);
            ctx.strokeStyle = this.interpolateColor('#06b6d4', '#f472b6', t);

            ctx.beginPath();
            ctx.moveTo(xAxisX, xCanvasY);
            ctx.lineTo(yAxisX, yCanvasY);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;

        // Draw red markers for out-of-range points on X axis only
        ctx.fillStyle = '#ef4444';
        for (let i = 0; i < linesToDraw; i++) {
            const point = this.dataPoints[i];
            if (point.outOfRange) {
                const xCanvasY = this.xToCanvas(point.x);
                ctx.beginPath();
                ctx.arc(xAxisX, xCanvasY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawDiscreteLines(linesToDraw) {
        const ctx = this.ctx;
        const xAxisX = this.getXAxisX();
        const yAxisX = this.getYAxisX();

        for (let i = 0; i < linesToDraw; i++) {
            const point = this.dataPoints[i];
            const xCanvasY = this.xToCanvas(point.x);

            // Skip drawing line for out-of-range points (they get red marker in drawDataPoints)
            if (point.outOfRange) {
                continue;
            }

            const yCanvasY = this.yToCanvas(point.y);

            // Calculate line color based on mode
            let color;
            if (this.lineColorMode === 'gradient') {
                const t = i / (this.dataPoints.length - 1);
                color = this.interpolateColor('#06b6d4', '#f472b6', t);
            } else if (this.lineColorMode === 'slope') {
                const slope = (yCanvasY - xCanvasY) / (yAxisX - xAxisX);
                const normalizedSlope = (slope + 1) / 2;
                color = this.interpolateColor('#22c55e', '#ef4444', Math.max(0, Math.min(1, normalizedSlope)));
            } else {
                color = '#8b5cf6';
            }

            const isHovered = this.hoveredLine === i;
            const alpha = isHovered ? 1 : 0.6;
            const lineWidth = isHovered ? 2.5 : 1.5;

            ctx.strokeStyle = color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(xAxisX, xCanvasY);
            ctx.lineTo(yAxisX, yCanvasY);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    drawDataPoints() {
        const ctx = this.ctx;
        const xAxisX = this.getXAxisX();
        const yAxisX = this.getYAxisX();
        const pointRadius = 4;

        const linesToDraw = this.isAnimating
            ? Math.floor(this.animationProgress * this.dataPoints.length)
            : this.dataPoints.length;

        // Skip drawing individual points in continuous mode (red dots handled in drawFilledShape)
        if (this.continuousMode) return;

        for (let i = 0; i < linesToDraw; i++) {
            const point = this.dataPoints[i];
            const xCanvasY = this.xToCanvas(point.x);

            const isHovered = this.hoveredLine === i;
            const radius = isHovered ? pointRadius + 2 : pointRadius;

            // Point on X axis - RED if out of range
            ctx.beginPath();
            ctx.arc(xAxisX, xCanvasY, radius, 0, Math.PI * 2);
            if (point.outOfRange) {
                ctx.fillStyle = '#ef4444'; // Red for out of range
            } else {
                ctx.fillStyle = isHovered ? '#06b6d4' : 'rgba(6, 182, 212, 0.8)';
            }
            ctx.fill();

            // Point on Y axis - ONLY draw if in range
            if (!point.outOfRange) {
                const yCanvasY = this.yToCanvas(point.y);
                ctx.beginPath();
                ctx.arc(yAxisX, yCanvasY, radius, 0, Math.PI * 2);
                ctx.fillStyle = isHovered ? '#f472b6' : 'rgba(244, 114, 182, 0.8)';
                ctx.fill();
            }
        }
    }

    interpolateColor(color1, color2, t) {
        // Parse hex colors
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);

        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);

        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return `rgb(${r}, ${g}, ${b})`;
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const xAxisX = this.getXAxisX();
        const yAxisX = this.getYAxisX();

        // Find closest line
        let closestIndex = -1;
        let closestDistance = Infinity;

        for (let i = 0; i < this.dataPoints.length; i++) {
            const point = this.dataPoints[i];
            const xCanvasY = this.xToCanvas(point.x);
            const yCanvasY = this.yToCanvas(point.y);

            // Calculate distance from mouse to line
            const dist = this.pointToLineDistance(
                mouseX, mouseY,
                xAxisX, xCanvasY,
                yAxisX, yCanvasY
            );

            if (dist < closestDistance && dist < 15) {
                closestDistance = dist;
                closestIndex = i;
            }
        }

        if (closestIndex !== this.hoveredLine) {
            this.hoveredLine = closestIndex;
            this.render();

            if (closestIndex >= 0) {
                const point = this.dataPoints[closestIndex];
                this.showTooltip(e.clientX, e.clientY, point);
            } else {
                this.hideTooltip();
            }
        } else if (closestIndex >= 0) {
            // Update tooltip position
            const point = this.dataPoints[closestIndex];
            this.showTooltip(e.clientX, e.clientY, point);
        }
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let t = lenSq !== 0 ? dot / lenSq : -1;

        t = Math.max(0, Math.min(1, t));

        const xx = x1 + t * C;
        const yy = y1 + t * D;

        return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
    }

    showTooltip(x, y, point) {
        this.tooltip.innerHTML = `<strong>x:</strong> ${point.x.toFixed(2)}, <strong>y:</strong> ${point.y.toFixed(2)}`;
        this.tooltip.style.left = (x + 15) + 'px';
        this.tooltip.style.top = (y - 10) + 'px';
        this.tooltip.classList.add('visible');
    }

    hideTooltip() {
        this.tooltip.classList.remove('visible');
    }

    handleMouseLeave() {
        this.hoveredLine = null;
        this.hideTooltip();
        this.render();
    }

    toggleAnimation() {
        if (this.isAnimating) {
            this.pauseAnimation();
        } else {
            this.playAnimation();
        }
    }

    playAnimation() {
        this.isAnimating = true;
        this.updatePlayButton();

        if (this.animationProgress >= 1) {
            this.animationProgress = 0;
        }

        const animate = () => {
            if (!this.isAnimating) return;

            this.animationProgress += 0.005 * this.animationSpeed;

            if (this.animationProgress >= 1) {
                this.animationProgress = 1;
                this.pauseAnimation();
            }

            this.render();

            if (this.isAnimating) {
                this.animationId = requestAnimationFrame(animate);
            }
        };

        this.animationId = requestAnimationFrame(animate);
    }

    pauseAnimation() {
        this.isAnimating = false;
        this.updatePlayButton();

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    resetAnimation() {
        this.pauseAnimation();
        this.animationProgress = 0;
        this.render();
    }

    updatePlayButton() {
        const btn = document.getElementById('playBtn');
        const icon = document.getElementById('playIcon');
        const text = document.getElementById('playText');

        if (this.isAnimating) {
            icon.setAttribute('d', 'M5 3h3v10H5V3zm5 0h3v10h-3V3z');
            text.textContent = 'Pause';
        } else {
            icon.setAttribute('d', 'M4 2l10 6-10 6V2z');
            text.textContent = 'Play';
        }
    }

    updateDescription() {
        const func = MathFunctions[this.currentFunction];
        if (!func) return;

        const formulaEl = document.getElementById('funcFormula');
        const explanationEl = document.getElementById('funcExplanation');

        formulaEl.textContent = getFormattedFormula(this.currentFunction, this.params);
        explanationEl.textContent = func.description;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.visualizer = new ParallelAxesVisualizer();
});
