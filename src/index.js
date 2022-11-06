const { shellCommand, memoize } = require('cerebro-tools');
const pluginIcon = require('./icon.png');
const DEFAULT_ICON = require('./window.png');
const getAppsList = require('./initializeAsync').getAppsList;
console.log(getAppsList)
let appsList = []
getAppsList().then(apps => {
  appsList = apps
    console.log("win manager appsList")
    console.log(appsList)
})

const MEMOIZE_OPTIONS = {
  promise: 'then',
  maxAge: 5 * 1000,
  preFetch: true
}

/**
 * Parse each line of wmctrl command
 * @param {String} line of wmctrl result
 * @return {Array} array of windowId, windowTitle
 */
function parseWmctrlResult(str) {
  let arr = str.split(/\s+/)
    let appName = arr[2]
    let winTitle = arr.slice(4)
  return [arr[0], arr[1], winTitle.join(' '), appName];
}

function getFilteredWindowsRegex() {
  words = [
    'cerebro',
    'budgie-panel',
    '@!0,0;BDHF'
  ]
  return new RegExp(`[^\/]*${words.map(item => `(${item})`).join('|')}[^\/]*$`, 'i');
}

function getIcon(winTitle,appName) {
    console.log(winTitle)
    console.log(appName)
    appName=appName.split(".")[0]
    if(appName == "google-chrome") {
        appName = "google chrome"
    }
    if(appName == "x-terminal-emulator") {
        appName = "terminator"
    }
    if(winTitle == "Remmina Remote Desktop Client") {
        appName = "Remmina"
    }
    let winapp =[]
    winapp = appsList.filter(app => app.name.toLowerCase() === appName.toLowerCase())
    if(winapp.length > 0) {
        return winapp[0].icon
    }else{
        winapp = appsList.filter(app => app.name.toLowerCase() === winTitle.toLowerCase())
        return winapp.length > 0 ? winapp[0].icon : DEFAULT_ICON;
    }
}

const findWindow = memoize((searchWindowName) => {
  const regexp = new RegExp(`[^\/]*${searchWindowName}[^\/]*$`, 'i');
  return shellCommand('wmctrl -lx').then(result => (
    result
      .split('\n')
      .slice(0,-1)
      .filter(line => (line.match(regexp) && (!line.match(getFilteredWindowsRegex())||line.match(new RegExp(`- Google Chrome$`)))))
      .map(str => {
        const [id, workspace,winTitle, appName] = parseWmctrlResult(str);
        const icon = getIcon(winTitle,appName);
        const title = appName+"  ==>  [ "+winTitle+" ]";
        return {
          id,
          title,
          subtitle: 'Workspace #' + (workspace+1),
          icon,
          onSelect: () => shellCommand(`wmctrl -ia ${id}`),
          onKeyDown: (event) => {
            if ((event.metaKey || event.ctrlKey) && event.keyCode === 68) {
              shellCommand(`wmctrl -ic ${id}`)
              event.preventDefault();
            }
          }
        };
      })
    )
  )
}, MEMOIZE_OPTIONS);

/**
 * Plugin to list open windows and raise or close them
 *
 * @param  {String} options.term
 * @param  {Function} options.display
 */
const fn = ({term, display}) => {
  const match = term.match(/^win\s(.*)/);
  var input = term
  if (match) {
    input = match[1]
      findWindow(input).then(list => {
        const results = list;
        display(results);
      });
  } 
};

module.exports = {
  name: 'Window manager',
  keyword: 'win',
  icon: pluginIcon,
  fn
};
