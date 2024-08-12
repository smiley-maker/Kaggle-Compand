const vscode = require('vscode');
const child_process = require('child_process');
const path = require('path');

function storeApiKey(apiKey) {
  vscode.workspace.getConfiguration().update('kaggle.apiKey', apiKey, vscode.ConfigurationTarget.Global);
}

function getApiKey() {
  const config = vscode.workspace.getConfiguration().inspect('kaggle.apiKey');
  if (config && config.globalValue) {
    return config.globalValue;
  } else {
    // Handle API key not found or invalid
    console.error('API key not found');
    return;
  }
}

function listCompetitions(apiKey) {
  const scriptPath = path.join(__dirname, 'python-scripts', 'kaggle_api.py');
  return new Promise((resolve, reject) => {
    const python_path = "/Users/jordan/miniconda3/envs/kagglemanager/bin/python"; // Replace with your Python path
    const python = child_process.spawn(python_path, [scriptPath, apiKey]);

    python.stdout.on('data', (data) => {
      resolve(data.toString());
    });

    python.stderr.on('data', (data) => {
      reject(data.toString());
    });
  });
}

function createCompetitionCard(competition) {
  const card = document.createElement('div');
  card.classList.add('competition-card');

  const image = document.createElement('img');
  image.classList.add('competition-image');
  image.src = competition.imageUrl || 'placeholder.png'; // Use placeholder if image URL is missing
  image.alt = competition.title;

  const info = document.createElement('div');
  info.classList.add('competition-info');

  const title = document.createElement('h3');
  title.classList.add('competition-title');
  title.textContent = competition.title;

  const details = document.createElement('p');
  details.classList.add('competition-details');
  details.textContent = competition.description || ''; // Handle missing description

  info.appendChild(title);
  info.appendChild(details);
  card.appendChild(image);
  card.appendChild(info);

  return card;
}

function getWebviewContent(webview, extensionPath) {
  // Create HTML content with CSS and JavaScript references
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kaggle Competitions</title>

    <style>
      .competition-card {
        display: flex;
        align-items: center;
        padding: 10px;
        border-bottom: 1px solid #ccc;
      }

      .competition-image {
        width: 50px;
        height: 50px;
        object-fit: cover;
        margin-right: 10px;
      }

      .competition-info {
        flex-grow: 1;
      }

      .competition-title {
        margin: 0;
      }

      .competition-details {
        font-size: 0.9em;
        color: #888;
      }
    </style>
  </head>
  <body>
    <div id="competition-list"></div>
    <script>
      window.addEventListener('message', (event) => {
        const message = event.data;
        if (message.command === 'updateCompetitions') {
          const competitions = message.data;

          // Create competition cards based on competitions data
          competitions.forEach(competition => {
            const card = createCompetitionCard(competition);
            document.getElementById('competition-list').appendChild(card);
          });
        }
      });
    </script>
  </body>
  </html>`;
}

function activate(context) {
  let panel = undefined;

  // Create webview panel
  const createWebview = () => {
    panel = vscode.window.createWebviewPanel(
      'kaggleCompetitions', // Identifies the type of panel
      'Kaggle Competitions', // Title of the panel
      vscode.ViewColumn.Explorer, // Place the webview in the Explorer sidebar
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
      }
    );

    // Set webview content
    panel.webview.html = getWebviewContent(panel.webview, context.extensionPath);

    // Handle panel events
    panel.onDidDispose(() => {
      panel = undefined;
    });
  };

  let showSidebarCommand = vscode.commands.registerCommand('kaggle-extension.showSidebar', () => {
    if (!panel) {
      createWebview();
    } else {
      panel.reveal();
    }
  });

  context.subscriptions.push(showSidebarCommand);

  // Automatically show the sidebar when the extension is activated
  createWebview();

  async function fetchCompetitions() {
    let apiKey = getApiKey();

    if (!apiKey) {
      const options = {
        prompt: 'Please enter your Kaggle API key:',
        placeHolder: 'Enter API key',
        value: '',
        password: true // Optional: Hide the input for security
      };

      const result = await vscode.window.showInputBox(options);
      if (result) {
        storeApiKey(result);
        apiKey = result;
      } else {
        console.error('API key not provided');
        return;
      }
    }

    try {
      console.log("In fetch comps");
      const competitionsData = await listCompetitions(apiKey);
      console.log(competitionsData);
      panel.webview.postMessage({ command: 'updateCompetitions', data: competitionsData });
      console.log(panel);
    } catch (error) {
      console.error('Error fetching competitions:', error);
    }
  }

  fetchCompetitions();
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate
};
