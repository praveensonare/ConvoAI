# Full-Width Visual Content Rendering - Usage Guide

## How It Works

The chat now supports full-width rendering of all visual content (graphics, charts, images, documents) for optimal space usage. Visual content is displayed at full width outside of chat bubbles while maintaining its position in the timeline.

### Visual Content Types Supported:

1. **HTML Graphics (Charts, Graphs, etc.)**
   - Extract HTML code from message
   - Render in secure sandboxed iframe at full width
   - HTML code is not shown - only the rendered output
   - Text before/after HTML displays naturally in chat bubbles

2. **Images**
   - Full-width display with zoom, fullscreen, and download controls
   - Interactive controls: zoom in/out (50%-300%), fullscreen mode
   - Production-grade image viewer with smooth transitions

3. **PDF Documents**
   - Full-width display with page navigation
   - Zoom controls and download functionality
   - Multi-page support with Previous/Next navigation
   - Production-grade document viewer

4. **User Attachments**
   - User-uploaded images and PDFs stay within chat bubbles
   - Assistant-generated visuals render at full width

## Layout Structure

```
┌─────────────────────────────────────────┐
│  Chat Timeline                          │
│                                         │
│  [User Text Bubble] ────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Full-Width Assistant Image      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ├──────────── [Assistant Text Bubble] │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Full-Width Chart/Graph          │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Note:** Visual content is responsive and adapts to all screen sizes while maintaining optimal aspect ratios.

## Example Usage

Simply send a message containing an HTML code block like this:

\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <canvas id="chart"></canvas>
  <script>
    new Chart(document.getElementById('chart'), {
      type: 'bar',
      data: {
        labels: ['India', 'China', 'USA'],
        datasets: [{
          label: 'Population (millions)',
          data: [1440, 1425, 340],
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  </script>
</body>
</html>
\`\`\`

## Test the Feature

To test this feature, you can ask the AI:

- "Create a bar chart showing population of India, China, and USA"
- "Generate an HTML page with a pie chart showing market share data"
- "Show me a line chart with sample data using Chart.js"

The AI should respond with HTML code, which will automatically be rendered in an iframe below the code.

## Supported Libraries

You can use any JavaScript charting library that works via CDN:

- **Chart.js**: `https://cdn.jsdelivr.net/npm/chart.js`
- **D3.js**: `https://d3js.org/d3.v7.min.js`
- **Plotly**: `https://cdn.plot.ly/plotly-latest.min.js`
- **Google Charts**: `https://www.gstatic.com/charts/loader.js`
- And many more!

## Production-Grade Features

### Security
- ✅ Sandboxed iframes with `allow-scripts` and `allow-same-origin` permissions
- ✅ Secure content rendering isolated from main application
- ✅ XSS protection through iframe sandboxing

### Interactivity
- ✅ Image zoom controls (50% - 300%)
- ✅ Fullscreen viewing mode for images
- ✅ PDF page navigation with Previous/Next buttons
- ✅ Download functionality for images and PDFs
- ✅ Smooth transitions and animations

### Layout & Responsiveness
- ✅ Full-width visual content (100% of chat area)
- ✅ Responsive design adapts to all screen sizes
- ✅ Optimized sizing (min: 400px, max: 800px for iframes)
- ✅ Production-grade UI with gradients and shadows
- ✅ Maintains timeline sequence and context

### Content Handling
- ✅ Automatic HTML code detection and extraction
- ✅ Multi-page PDF support
- ✅ External library support via CDN (Chart.js, D3.js, Plotly, etc.)
- ✅ Handles images, PDFs, and HTML graphics seamlessly
- ✅ User vs Assistant content differentiation
