# Parallel Axes Visualizer

A unique mathematical visualization tool that displays functions using **parallel coordinate axes** instead of the traditional perpendicular Cartesian coordinate system.

🔗 **[Live Demo](https://[username].github.io/Cylinderical-Axes/)**

![Parallel Axes Preview](preview.png)

## 🎯 The Concept

In traditional 2D graphs, we draw X and Y axes perpendicular to each other:

```
  Y
  ↑
  │
  │
  └──────→ X
```

In **Parallel Coordinates**, both axes are parallel vertical lines:

```
  X    Y
  │    │
  │    │
  │    │
```

Each point `(x, y)` is represented by a **line** connecting the x-value on the left axis to the corresponding y-value on the right axis. This reveals fascinating patterns that are hidden in traditional graphs!

## ✨ Features

- **12+ Mathematical Functions**: Linear, quadratic, cubic, trigonometric, exponential, and more
- **Interactive Parameters**: Adjust coefficients with real-time updates
- **Animation**: Watch functions being drawn progressively
- **Hover Tooltips**: See exact (x, y) values for each line
- **Visual Customization**: Multiple color modes, grid lines, and point markers
- **Responsive Design**: Works on desktop and mobile

## 🧮 Patterns You'll Discover

| Function | Pattern Description |
|----------|---------------------|
| `y = x` | All lines are parallel - pure linearity |
| `y = x²` | Beautiful "bowtie" pattern converging at origin |
| `y = x³` | Asymmetric crossing pattern |
| `y = sin(x)` | Mesmerizing oscillating wave |
| `y = 1/x` | Hyperbolic spread with asymptote |
| `y = \|x\|` | Symmetric "V" pattern |

## 🚀 Getting Started

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/[username]/Cylinderical-Axes.git
   cd Cylinderical-Axes
   ```

2. Open `index.html` in your browser:
   ```bash
   # On Windows
   start index.html
   
   # On macOS
   open index.html
   
   # On Linux
   xdg-open index.html
   ```

No build step required! The app runs directly in the browser using vanilla HTML, CSS, and JavaScript.

### GitHub Pages Deployment

1. Push your code to GitHub
2. Go to **Settings** → **Pages**
3. Under "Source", select **Deploy from a branch**
4. Choose `main` branch and `/(root)` folder
5. Click **Save**

Your site will be live at `https://[username].github.io/Cylinderical-Axes/`

## 📁 Project Structure

```
Cylinderical-Axes/
├── index.html          # Main HTML file
├── styles.css          # Premium dark theme styles
├── js/
│   ├── main.js         # Core visualization engine
│   └── functions.js    # Mathematical function library
└── README.md           # This file
```

## 🎨 Customization

### Adding New Functions

Edit `js/functions.js` to add new functions:

```javascript
myFunction: {
    name: 'My Function',
    formula: 'y = f(x)',
    description: 'Description of the pattern',
    params: {
        a: { label: 'Parameter A', min: 0, max: 10, step: 0.1, default: 1 }
    },
    evaluate: (x, params) => /* your function */,
    getYRange: (xMin, xMax, params) => ({ yMin: 0, yMax: 10 })
}
```

## 📚 Mathematical Background

Parallel coordinates were invented by Alfred Inselberg in 1959 and are commonly used in:

- **Data Visualization**: Visualizing high-dimensional datasets
- **Pattern Recognition**: Identifying clusters and correlations
- **Multivariate Analysis**: Understanding relationships between variables

This project applies the concept specifically to mathematical functions, revealing how familiar curves appear in a completely different light.

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Add new mathematical functions
- Improve visualizations
- Enhance the UI/UX
- Fix bugs

## 📄 License

MIT License - feel free to use and modify as you wish!

---

Built with ❤️ and mathematics
