# CSV Mapper

A client-side tool that uses AI to intelligently map columns from a source CSV to a target template CSV.

## Features

- **Upload any target template** — the tool reads your template CSV headers
- **Upload source CSV** — data to be mapped
- **AI-powered column matching** — uses Claude Haiku to semantically match columns, including smart splits (e.g., "Full Name" → "Given Names" + "Family Name")
- **Manual override** — adjust any mapping via dropdowns
- **Type coercion** — normalizes dates, numbers, booleans, emails in the output
- **Data cleaning** — trims whitespace, removes trailing commas (output only, source stays untouched)
- **Summary** — shows matched/unmatched counts and type validation warnings
- **Download** — exports the mapped CSV after approval

## Setup

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

```bash
npm run build
# Upload the `dist/` folder to GitHub Pages, or use gh-pages:
npx gh-pages -d dist
```

## How It Works

1. Upload your **target template CSV** (just headers, or headers + sample data)
2. Upload your **source CSV** with actual data
3. Enter your **Anthropic API key** (stored in browser localStorage only)
4. Click **"Map Columns with AI"** — Claude Haiku analyzes the columns and suggests mappings
5. Review and adjust mappings manually if needed
6. Check the **summary** for match counts and type warnings
7. **Approve & Download** the mapped CSV

All processing happens in your browser. No data is sent to any server except column names and a few sample rows to the Anthropic API for matching.
