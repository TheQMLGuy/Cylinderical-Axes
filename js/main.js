/**
 * Parallel Axes Visualizer - Main Application
 * Renders mathematical functions on parallel coordinate axes
 */

class ParallelAxesVisualizer {
    constructor() {
        // Canvas setup - Parallel Axes
        this.canvas = document.getElementById('parallelCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Canvas setup - Cartesian
        this.cartesianCanvas = document.getElementById('cartesianCanvas');
        this.cartesianCtx = this.cartesianCanvas.getContext('2d');

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
        this.ySquash = 0; // 0 = Y matches X range, 100 = Y auto-fits to function range

        // Layout
        this.padding = { top: 60, bottom: 60, left: 80, right: 80 };
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
        // Setup Parallel Canvas
        const container = this.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = container.clientWidth * dpr;
        this.canvas.height = container.clientHeight * dpr;
        this.canvas.style.width = container.clientWidth + 'px';
        this.canvas.style.height = container.clientHeight + 'px';

        this.ctx.scale(dpr, dpr);

        this.width = container.clientWidth;
        this.height = container.clientHeight;

        // Setup Cartesian Canvas
        const cartContainer = this.cartesianCanvas.parentElement;
        this.cartesianCanvas.width = cartContainer.clientWidth * dpr;
        this.cartesianCanvas.height = cartContainer.clientHeight * dpr;
        this.cartesianCanvas.style.width = cartContainer.clientWidth + 'px';
        this.cartesianCanvas.style.height = cartContainer.clientHeight + 'px';

        this.cartesianCtx.scale(dpr, dpr);

        this.cartWidth = cartContainer.clientWidth;
        this.cartHeight = cartContainer.clientHeight;


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

        // Y Squash toggle button
        const ySquashBtn = document.getElementById('ySquashBtn');
        if (ySquashBtn) {
            ySquashBtn.addEventListener('click', () => {
                this.ySquash = this.ySquash === 0 ? 100 : 0;
                ySquashBtn.classList.toggle('active', this.ySquash === 100);
                ySquashBtn.innerHTML = this.ySquash === 100
                    ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg> Y Fitted'
                    : '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1v14M1 8h14M3 3l10 10M13 3L3 13"/></svg> Fit Y to All Values';
                this.calculateDataPoints();
                this.render();
            });
        }

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

        // For continuous mode: sample at MULTIPLE points per pixel for true solid appearance
        // This creates truly continuous lines with no gaps
        let actualNumPoints;
        if (this.continuousMode) {
            // Get the height of the drawable area in pixels
            const axisHeight = this.height - this.padding.top - this.padding.bottom;
            // Sample 3x points per pixel for guaranteed solid coverage
            actualNumPoints = Math.max(axisHeight * 3, 1500);
        } else {
            actualNumPoints = this.numPoints;
        }

        const step = (this.xMax - this.xMin) / (actualNumPoints - 1);

        // First pass: calculate all Y values and find actual min/max
        let actualYMin = Infinity;
        let actualYMax = -Infinity;
        const rawPoints = [];

        for (let i = 0; i < actualNumPoints; i++) {
            const x = this.xMin + i * step;
            const y = func.evaluate(x, this.params);

            if (!isNaN(y) && isFinite(y)) {
                rawPoints.push({ x, y, index: i });
                actualYMin = Math.min(actualYMin, y);
                actualYMax = Math.max(actualYMax, y);
            }
        }

        // Calculate Y range based on squash setting (0 or 100%)
        if (this.ySquash === 100) {
            // SYMMETRIC Y range: balanced around 0
            // Find the maximum absolute value needed to fit all y values
            const maxAbsY = Math.max(Math.abs(actualYMin), Math.abs(actualYMax));
            // Symmetric range from -max to +max (no padding)
            this.yMin = -maxAbsY;
            this.yMax = maxAbsY;
        } else {
            // Base range: Y matches X range (1:1 scale)
            this.yMin = this.xMin;
            this.yMax = this.xMax;
        }

        // Second pass: determine if points are out of range with the new Y limits
        for (const point of rawPoints) {
            const outOfRange = point.y < this.yMin || point.y > this.yMax;
            this.dataPoints.push({ ...point, outOfRange });
        }
    }

    // Convert data coordinates to canvas coordinates
    // HORIZONTAL LAYOUT: X axis at bottom, Y axis at top
    xToCanvas(x) {
        // X axis is at bottom - maps x value to horizontal position
        const t = (x - this.xMin) / (this.xMax - this.xMin);
        return this.padding.left + t * (this.width - this.padding.left - this.padding.right);
    }

    yToCanvas(y) {
        // Y axis is at top - maps y value to horizontal position
        const t = (y - this.yMin) / (this.yMax - this.yMin);
        return this.padding.left + t * (this.width - this.padding.left - this.padding.right);
    }

    // Clamp Y to visible range for drawing
    yToCanvasClamped(y) {
        const clampedY = Math.max(this.yMin, Math.min(this.yMax, y));
        return this.yToCanvas(clampedY);
    }

    // Get Y position of bottom axis (X-axis)
    getXAxisY() {
        return this.height - this.padding.bottom;
    }

    // Get Y position of top axis (Y-axis)
    getYAxisY() {
        return this.padding.top;
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

        // Render Cartesian view
        this.renderCartesian();
    }

    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;

        // Vertical grid lines
        const numVLines = 10;
        for (let i = 0; i <= numVLines; i++) {
            const x = this.padding.left + (i / numVLines) * (this.width - this.padding.left - this.padding.right);
            ctx.beginPath();
            ctx.moveTo(x, this.padding.top);
            ctx.lineTo(x, this.height - this.padding.bottom);
            ctx.stroke();
        }
    }

    drawAxes() {
        const ctx = this.ctx;
        const xAxisY = this.getXAxisY();
        const yAxisY = this.getYAxisY();
        const left = this.padding.left;
        const right = this.width - this.padding.right;

        // Create gradients for axes (horizontal)
        const xGrad = ctx.createLinearGradient(left, xAxisY, right, xAxisY);
        xGrad.addColorStop(0, '#06b6d4');
        xGrad.addColorStop(1, '#8b5cf6');

        const yGrad = ctx.createLinearGradient(left, yAxisY, right, yAxisY);
        yGrad.addColorStop(0, '#f472b6');
        yGrad.addColorStop(1, '#fb923c');

        // Draw X axis (bottom)
        ctx.strokeStyle = xGrad;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(left, xAxisY);
        ctx.lineTo(right, xAxisY);
        ctx.stroke();

        // Draw Y axis (top)
        ctx.strokeStyle = yGrad;
        ctx.beginPath();
        ctx.moveTo(left, yAxisY);
        ctx.lineTo(right, yAxisY);
        ctx.stroke();

        // Draw axis labels
        ctx.font = '600 14px Inter, sans-serif';
        ctx.textAlign = 'left';

        ctx.fillStyle = '#06b6d4';
        ctx.fillText('X axis', left, xAxisY + 25);

        ctx.fillStyle = '#f472b6';
        ctx.fillText('Y axis', left, yAxisY - 10);

        // Draw tick marks and values
        this.drawAxisTicks();
    }

    drawAxisTicks() {
        const ctx = this.ctx;
        const xAxisY = this.getXAxisY();
        const yAxisY = this.getYAxisY();
        const tickLength = 6;

        ctx.font = '400 10px JetBrains Mono, monospace';
        ctx.lineWidth = 1;

        // X-axis ticks (bottom axis)
        const numXTicks = 5;
        for (let i = 0; i <= numXTicks; i++) {
            const value = this.xMin + (i / numXTicks) * (this.xMax - this.xMin);
            const x = this.xToCanvas(value);

            ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
            ctx.beginPath();
            ctx.moveTo(x, xAxisY);
            ctx.lineTo(x, xAxisY + tickLength);
            ctx.stroke();

            ctx.fillStyle = '#a0a0b0';
            ctx.textAlign = 'center';
            ctx.fillText(value.toFixed(1), x, xAxisY + tickLength + 12);
        }

        // Y-axis ticks (top axis)
        const numYTicks = 5;
        for (let i = 0; i <= numYTicks; i++) {
            const value = this.yMin + (i / numYTicks) * (this.yMax - this.yMin);
            const x = this.yToCanvas(value);

            ctx.strokeStyle = 'rgba(244, 114, 182, 0.5)';
            ctx.beginPath();
            ctx.moveTo(x, yAxisY);
            ctx.lineTo(x, yAxisY - tickLength);
            ctx.stroke();

            ctx.fillStyle = '#a0a0b0';
            ctx.textAlign = 'center';
            ctx.fillText(value.toFixed(1), x, yAxisY - tickLength - 5);
        }
    }

    drawFunctionLines() {
        const ctx = this.ctx;
        const xAxisY = this.getXAxisY();
        const yAxisY = this.getYAxisY();

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
        const xAxisY = this.getXAxisY();
        const yAxisY = this.getYAxisY();

        // In continuous mode, we draw individual lines at every pixel
        // This creates a truly continuous appearance

        // Use thin lines with moderate opacity so overlapping creates solid look
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.5;

        for (let i = 0; i < linesToDraw; i++) {
            const point = this.dataPoints[i];
            const xCanvasX = this.xToCanvas(point.x);

            // Skip out-of-range points (draw red marker later)
            if (point.outOfRange) {
                continue;
            }

            const yCanvasX = this.yToCanvas(point.y);

            // Color based on position for gradient effect
            const t = i / (this.dataPoints.length - 1);
            ctx.strokeStyle = this.interpolateColor('#06b6d4', '#f472b6', t);

            // Draw vertical line from X axis (bottom) to Y axis (top)
            ctx.beginPath();
            ctx.moveTo(xCanvasX, xAxisY);
            ctx.lineTo(yCanvasX, yAxisY);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;

        // Draw red markers for out-of-range points on X axis only
        ctx.fillStyle = '#ef4444';
        for (let i = 0; i < linesToDraw; i++) {
            const point = this.dataPoints[i];
            if (point.outOfRange) {
                const xCanvasX = this.xToCanvas(point.x);
                ctx.beginPath();
                ctx.arc(xCanvasX, xAxisY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawDiscreteLines(linesToDraw) {
        const ctx = this.ctx;
        const xAxisY = this.getXAxisY();
        const yAxisY = this.getYAxisY();

        for (let i = 0; i < linesToDraw; i++) {
            const point = this.dataPoints[i];
            const xCanvasX = this.xToCanvas(point.x);

            // Skip drawing line for out-of-range points (they get red marker in drawDataPoints)
            if (point.outOfRange) {
                continue;
            }

            const yCanvasX = this.yToCanvas(point.y);

            // Calculate line color based on mode
            let color;
            if (this.lineColorMode === 'gradient') {
                const t = i / (this.dataPoints.length - 1);
                color = this.interpolateColor('#06b6d4', '#f472b6', t);
            } else if (this.lineColorMode === 'slope') {
                const slope = (yCanvasX - xCanvasX) / (yAxisY - xAxisY);
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

            // Draw vertical line from X axis (bottom) to Y axis (top)
            ctx.beginPath();
            ctx.moveTo(xCanvasX, xAxisY);
            ctx.lineTo(yCanvasX, yAxisY);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    drawDataPoints() {
        const ctx = this.ctx;
        const xAxisY = this.getXAxisY();
        const yAxisY = this.getYAxisY();
        const pointRadius = 4;

        const linesToDraw = this.isAnimating
            ? Math.floor(this.animationProgress * this.dataPoints.length)
            : this.dataPoints.length;

        // Skip drawing individual points in continuous mode (too many)
        if (this.continuousMode) return;

        for (let i = 0; i < linesToDraw; i++) {
            const point = this.dataPoints[i];
            const xCanvasX = this.xToCanvas(point.x);

            const isHovered = this.hoveredLine === i;
            const radius = isHovered ? pointRadius + 2 : pointRadius;

            // Point on X axis (bottom) - RED if out of range
            ctx.beginPath();
            ctx.arc(xCanvasX, xAxisY, radius, 0, Math.PI * 2);
            if (point.outOfRange) {
                ctx.fillStyle = '#ef4444'; // Red for out of range
            } else {
                ctx.fillStyle = isHovered ? '#06b6d4' : 'rgba(6, 182, 212, 0.8)';
            }
            ctx.fill();

            // Point on Y axis (top) - ONLY draw if in range
            if (!point.outOfRange) {
                const yCanvasX = this.yToCanvas(point.y);
                ctx.beginPath();
                ctx.arc(yCanvasX, yAxisY, radius, 0, Math.PI * 2);
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

        const xAxisY = this.getXAxisY();
        const yAxisY = this.getYAxisY();

        // Find closest line
        let closestIndex = -1;
        let closestDistance = Infinity;

        for (let i = 0; i < this.dataPoints.length; i++) {
            const point = this.dataPoints[i];
            const xCanvasX = this.xToCanvas(point.x);
            const yCanvasX = this.yToCanvas(point.y);

            // Calculate distance from mouse to line (vertical line from bottom to top)
            const dist = this.pointToLineDistance(
                mouseX, mouseY,
                xCanvasX, xAxisY,
                yCanvasX, yAxisY
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

    // Draw density indicators on Y axis - red for high density, green for low density
    drawDensityIndicators() {
        if (this.dataPoints.length < 2) return;

        const ctx = this.ctx;
        const yAxisX = this.getYAxisX();

        // Calculate density: how many Y values fall into each bucket
        const numBuckets = 50;
        const buckets = new Array(numBuckets).fill(0);
        const yRange = this.yMax - this.yMin;

        // Count points in each bucket
        for (const point of this.dataPoints) {
            if (!point.outOfRange) {
                const bucketIndex = Math.floor(((point.y - this.yMin) / yRange) * (numBuckets - 1));
                const clampedIndex = Math.max(0, Math.min(numBuckets - 1, bucketIndex));
                buckets[clampedIndex]++;
            }
        }

        // Find max density for normalization
        const maxDensity = Math.max(...buckets, 1);

        // Draw density bars on Y axis
        const bucketHeight = (this.height - this.padding.top - this.padding.bottom) / numBuckets;

        for (let i = 0; i < numBuckets; i++) {
            const density = buckets[i] / maxDensity;
            const y = this.height - this.padding.bottom - (i + 0.5) * bucketHeight;

            // Color: red for high density (low slope), green for low density (high slope)
            const r = Math.floor(255 * density);
            const g = Math.floor(255 * (1 - density));
            const color = `rgba(${r}, ${g}, 50, 0.8)`;

            // Draw density indicator bar
            const barWidth = 8 + density * 12; // Variable width based on density
            ctx.fillStyle = color;
            ctx.fillRect(yAxisX + 5, y - bucketHeight / 2, barWidth, bucketHeight - 1);
        }

        // Add legend
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'left';
        ctx.fillText('■ High density (low slope)', yAxisX + 25, this.padding.top + 15);
        ctx.fillStyle = '#22c55e';
        ctx.fillText('■ Low density (high slope)', yAxisX + 25, this.padding.top + 30);
    }

    // Render Cartesian (orthogonal) coordinate system
    renderCartesian() {
        const ctx = this.cartesianCtx;
        const w = this.cartWidth;
        const h = this.cartHeight;
        const padding = { top: 40, bottom: 50, left: 60, right: 30 };

        ctx.clearRect(0, 0, w, h);

        // Draw background
        ctx.fillStyle = 'rgba(18, 18, 26, 1)';
        ctx.fillRect(0, 0, w, h);

        const plotWidth = w - padding.left - padding.right;
        const plotHeight = h - padding.top - padding.bottom;

        // Convert data coords to Cartesian canvas coords
        const xToCart = (x) => padding.left + ((x - this.xMin) / (this.xMax - this.xMin)) * plotWidth;
        const yToCart = (y) => h - padding.bottom - ((y - this.yMin) / (this.yMax - this.yMin)) * plotHeight;

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // Vertical grid lines
        const numVLines = 10;
        for (let i = 0; i <= numVLines; i++) {
            const x = padding.left + (i / numVLines) * plotWidth;
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, h - padding.bottom);
            ctx.stroke();
        }

        // Horizontal grid lines
        const numHLines = 10;
        for (let i = 0; i <= numHLines; i++) {
            const y = padding.top + (i / numHLines) * plotHeight;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();
        }

        // Draw axes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;

        // X axis (at y = 0 if in range)
        if (this.yMin <= 0 && this.yMax >= 0) {
            const axisY = yToCart(0);
            ctx.beginPath();
            ctx.moveTo(padding.left, axisY);
            ctx.lineTo(w - padding.right, axisY);
            ctx.stroke();
        }

        // Y axis (at x = 0 if in range)
        if (this.xMin <= 0 && this.xMax >= 0) {
            const axisX = xToCart(0);
            ctx.beginPath();
            ctx.moveTo(axisX, padding.top);
            ctx.lineTo(axisX, h - padding.bottom);
            ctx.stroke();
        }

        // Draw axis labels
        ctx.fillStyle = '#a0a0b0';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';

        // X axis labels
        for (let i = 0; i <= 4; i++) {
            const val = this.xMin + (i / 4) * (this.xMax - this.xMin);
            const x = xToCart(val);
            ctx.fillText(val.toFixed(1), x, h - padding.bottom + 20);
        }

        // Y axis labels
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const val = this.yMin + (i / 4) * (this.yMax - this.yMin);
            const y = yToCart(val);
            ctx.fillText(val.toFixed(1), padding.left - 10, y + 4);
        }

        // Axis titles
        ctx.fillStyle = '#06b6d4';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('X', w / 2, h - 10);

        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#f472b6';
        ctx.fillText('Y', 0, 0);
        ctx.restore();

        // Draw function curve with gradient coloring
        if (this.dataPoints.length > 1) {
            const validPoints = this.dataPoints.filter(p => !p.outOfRange);

            if (validPoints.length > 1) {
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Draw with gradient coloring
                for (let i = 1; i < validPoints.length; i++) {
                    const p1 = validPoints[i - 1];
                    const p2 = validPoints[i];

                    const t = i / validPoints.length;
                    ctx.strokeStyle = this.interpolateColor('#06b6d4', '#f472b6', t);

                    ctx.beginPath();
                    ctx.moveTo(xToCart(p1.x), yToCart(p1.y));
                    ctx.lineTo(xToCart(p2.x), yToCart(p2.y));
                    ctx.stroke();
                }
            }
        }

        // Highlight hovered point from parallel axes
        if (this.hoveredLine !== null && this.dataPoints[this.hoveredLine]) {
            const point = this.dataPoints[this.hoveredLine];
            const px = xToCart(point.x);
            const py = yToCart(point.y);

            // Draw crosshairs
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);

            // Vertical line from point to X axis
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px, h - padding.bottom);
            ctx.stroke();

            // Horizontal line from point to Y axis
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(padding.left, py);
            ctx.stroke();

            ctx.setLineDash([]);

            // Draw the point
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#f472b6';
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();

            // Label the point
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`, px + 10, py - 10);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.visualizer = new ParallelAxesVisualizer();
});
