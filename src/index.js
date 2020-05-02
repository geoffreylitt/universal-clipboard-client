const { app, BrowserWindow, clipboard, Notification, ipcMain } = require('electron');
const { menubar } = require('menubar');

const fetch = require('node-fetch');
const path = require('path');

const mb = menubar({
  'dir': './src',
  'icon': './src/icons/clipboard.png',
  'browserWindow': { webPreferences: { nodeIntegration: true } }
});

mb.on('ready', () => {
  console.log('app is ready');
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

let room = 'global';

ipcMain.on('select-room', (event, selectedRoom) => {
   console.log("room switched", selectedRoom);
   room = selectedRoom;
   syncClipboard();

   // Event emitter for sending asynchronous messages
   // event.sender.send('asynchronous-reply', 'async pong')
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

let clipboardContent;
let serverContent;

// Sync clipboard with the server
async function syncClipboard() {
  let newClipboardContent = clipboard.readText();
  let response = await fetch(`https://global-copypaste-buffer--glench.repl.co/get?buffer=${room}`)
  let newServerContent = await response.text()

  // If the server has new content, download it into our local clipboard.
  // (If we recently changed our local clipboard, too bad--those changes get wiped out)
  if (newServerContent !== serverContent) {
    console.log("new server content", newServerContent)
    clipboard.writeText(newServerContent)
    if (newServerContent !== clipboardContent) {
        let notification = new Notification({title: 'New clipboard message!'})
        notification.show()
    }
    // remember what was in the server clipboard
    serverContent = newServerContent;
  } else if (newClipboardContent !== clipboardContent) {
    // If the local clipboard has new contents, we upload them to the server
    console.log("new local clipboard!", newClipboardContent)

    // remember what was in the local clipboard
    clipboardContent = newClipboardContent

    // notify the API
    await fetch('https://global-copypaste-buffer--glench.repl.co/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            buffer: room,
            value: newClipboardContent,
        })
    })
  }
}

// Every second, sync the clipboard
setInterval(syncClipboard, 1000);
