# Graphics Rendering with Iframe - Usage Guide

## How It Works

The chat now supports rendering HTML graphics (charts, graphs, etc.) using iframes. When you send a code block with the language set to `html`, it will:

1. Display the HTML code in a syntax-highlighted code block
2. Render the HTML content in an iframe below the code block
3. The iframe is sandboxed for security with `allow-scripts` and `allow-same-origin` permissions

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

## Features

- ✅ Automatic HTML code detection
- ✅ Syntax highlighting for code
- ✅ Live rendering in iframe
- ✅ Optimized sizing (min: 400px, max: 800px, default: 600px)
- ✅ Security sandboxing
- ✅ Responsive design
- ✅ Works with external libraries via CDN
