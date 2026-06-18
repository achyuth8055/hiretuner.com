# MakeMyResume Chrome Extension

An AI-powered Chrome extension that helps you optimize your resume for any job description, right from your browser.

## Features

- **ATS Score Analysis** - Analyze how well your resume matches ATS requirements
- **Resume Matching** - Compare your resume against job descriptions
- **Keyword Scanning** - Identify missing keywords from job postings
- **Bullet Point Generation** - Generate optimized resume bullet points
- **Interview Questions** - Generate likely interview questions based on the job description
- **Job Description Extraction** - Auto-extract job descriptions from LinkedIn, Indeed, Glassdoor, and more
- **Resume Storage** - Save and load your resume locally
- **Analysis History** - Track your analyses over time

## Installation

### From Source

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Open Chrome and go to `chrome://extensions/`
5. Enable **Developer mode** (top right)
6. Click **Load unpacked**
7. Select the `dist` folder from this project

### Development Mode

For development with hot reload:

```bash
npm run dev
```

This will watch for changes and rebuild automatically.

## Project Structure

```
chromeExtension/
├── src/
│   ├── background/          # Service worker (persistent)
│   ├── content/             # Content scripts (run on web pages)
│   ├── popup/               # Popup UI & logic
│   ├── options/             # Settings page
│   └── common/              # Shared types and API client
├── public/                  # Icons and assets
├── manifest.json            # Extension configuration
├── package.json
├── tsconfig.json
└── webpack.config.js
```

## Architecture

### Service Worker (`src/background/service-worker.ts`)
- Handles message passing between content scripts and popup
- Manages persistent storage (resumes, analysis history)
- Handles periodic cleanup of old data

### Content Script (`src/content/content.ts`)
- Runs on job posting websites
- Extracts job descriptions from the page
- Highlights keywords in job postings
- Communicates with service worker

### Popup UI (`src/popup/popup.ts`)
- Main user interface
- Three tabs: Analyze, Extract, History
- Communicates with API and service worker
- Displays analysis results

### API Client (`src/common/api.ts`)
- Wrapper around all MakeMyResume API endpoints
- Handles request/response formatting
- Error handling

## Usage

### Basic Workflow

1. **Input Resume**
   - Paste your resume in the "Resume Text" field, or
   - Click "Load Stored Resume" to use a previously saved resume, or
   - Click "Save Resume" to store your current resume

2. **Input Job Description**
   - Paste the job description, or
   - Click "Extract from Page" if you're on a job posting site

3. **Select Analysis Type**
   - Choose from: ATS Score, Resume Match, Keyword Scan, Generate Bullets, Interview Questions

4. **Click Analyze**
   - Results appear below
   - Copy results to clipboard with one click

5. **View History**
   - Switch to "History" tab to see previous analyses

## Configuration

Click the ⚙️ icon in the extension popup to access settings:

- **API URL**: Change if using a custom deployment (default: `http://localhost:3000`)
- **Debug Mode**: Enable verbose logging for troubleshooting
- **Max File Size**: Set maximum resume upload size in MB

## API Requirements

The extension communicates with your MakeMyResume backend API. Ensure the following endpoints are available:

- `POST /api/tools/ats-score` - Analyze ATS compatibility
- `POST /api/tools/resume-match` - Check job match
- `POST /api/tools/keyword-scan` - Scan for keywords
- `POST /api/tools/bullet-generator` - Generate bullet points
- `POST /api/tools/interview-questions` - Generate interview questions

### CORS Configuration

The main app must allow CORS requests from the extension. Update `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  headers: async () => [
    {
      source: "/api/tools/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: "*" },
        { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type" },
      ],
    },
  ],
};

export default nextConfig;
```

## Supported Job Sites

Content script automatically extracts job descriptions from:

- LinkedIn Jobs
- Indeed
- Glassdoor
- Monster
- Dice
- Google Careers
- Microsoft Careers
- Any other site (fallback extraction)

## Storage

The extension stores data locally in Chrome's storage API:

- **Local Storage**: Stored resumes, analysis history (synced per device)
- **Sync Storage**: Settings and configuration (synced across devices)

Data is automatically cleaned up after 7 days.

## Development

### Adding a New Tool

1. Add the API method to `src/common/api.ts`:
   ```typescript
   async myNewTool(resume: ResumeData, jobDescription: JobDescription): Promise<AnalysisResult> {
     return this.callAPI('/api/tools/my-tool', {...}, 'my-tool');
   }
   ```

2. Add the option to the select in `src/popup/popup.html`
3. Handle it in the analyze button click handler in `src/popup/popup.ts`

### Debugging

Enable debug mode in settings. Logs will appear in:

1. **Background script**: `chrome://extensions` → MakeMyResume → Service Worker console
2. **Content script**: Inspect the page where the content script runs
3. **Popup**: Right-click the extension icon → Inspect Popup

### Testing

Use the DevTools to:

1. Test message passing: `chrome.runtime.sendMessage({action: 'TEST'})`
2. Inspect storage: `chrome://extensions/shortcuts` → Open Extension Options
3. Monitor network requests in the Extension's background page

## Permissions

The extension requests minimal permissions:

- `storage` - To store resumes and settings
- `scripting` - To run content scripts on web pages
- `activeTab` - To access the current tab
- `tabs` - To interact with tabs
- `host_permissions` for `https://*/*` - To run on any website

## Troubleshooting

### "Could not extract job description"
- Make sure the extension has permission to run on that site
- The website structure might have changed
- Try pasting the job description manually

### API connection errors
- Check that the backend is running
- Verify the API URL in settings
- Check CORS headers are configured
- Review the service worker logs

### Resume not saving
- Check available storage quota
- Clear browser cache and try again
- Ensure sync is enabled in Chrome settings

## Future Improvements

- [ ] Support for multiple resume formats (PDF, DOCX)
- [ ] Real-time resume analysis as you type
- [ ] Integration with job application tracking
- [ ] Advanced keyword highlighting in job postings
- [ ] Export results as PDF
- [ ] Integration with LinkedIn profile data
- [ ] Batch job description analysis

## Security & Privacy

- All data is stored locally on your device
- No resumes or personal data are sent to external servers
- Communication only happens with your configured API endpoint
- Check Chrome's privacy settings for extension permissions

## License

Same as the main MakeMyResume application

## Support

For issues or feature requests, please open an issue on the main repository.

---

**Happy optimizing! 🚀**
