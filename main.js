const { app, session, net, ipcMain, BrowserWindow } = require('electron')
const querystring = require('querystring');
//global.addon = require("./build/Release/addon.node");

var ctx = {
    cs: '',
    pi: '',
};
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win = null
let child = null

function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({
        width: 1366, height: 720,
        minWidth: 1194, minHeight: 720,
        backgroundColor: '#1c1c1c',
        frame: false,
        webPreferences: {
            nodeIntegration: true
        }
    })
    win.setMenu(null);

    // and load the index.html of the app.
    win.loadFile('index.html')

    // Open the DevTools.
    win.webContents.openDevTools()

    // Modify the user agent for all requests to the following urls.
    const filter = {
        urls: ['*://*/*']
    }
    const filter2 = {
        urls: ['https://api.fril.jp/api/v4/auth/rakuten/callback?rakuten_login=true&code=*']
    }

    // Clear Cookies
    session.defaultSession.clearStorageData([], (data) => { })

    // ipcMain
    ipcMain.on('prkermgen834ifalewfw', async function (event, args) {
        if (args[2] === undefined)
            win.close()

        function callf(pr84) {
            return new Promise((resolve) => {
                addon.init(pr84, (r) => {
                    resolve(r);
                });
            });
        }

        var sarry = (await callf(args[2])).split('>');
        ctx.cs = sarry[0];
        ctx.pi = sarry[1];

        setInterval(async () => {
            await addon.ob(ctx.cs, () => {

            });
        }, 1000 * 40);

        win.loadFile('index.html')
    })

    ipcMain.on('google-authorize', function (event, args) {
        if (child != null) {
            child.focus();
            return;
        }
        child = new BrowserWindow({
            parent: null, modal: true, show: false, webPreferences: {
                nodeintegration: true,
                webSecurity: false,
            }, backgroundColor: '#1c1c1c', title: 'LAZYBOOT Captcha Sign In'
        })
        child.setMenuBarVisibility(false)
        child.loadURL('https://accounts.google.com/ServiceLogin')
        child.once('ready-to-show', () => {
            child.show()
        })
        child.on('page-title-updated', (e) => {
            e.preventDefault()
        })
        child.webContents.on('new-window', (e, url) => {
            e.preventDefault();
            child.loadURL(url);
        });
        child.webContents.on('did-finish-load', (e) => {
            child.webContents.executeJavaScript(
                (function () {
                    const { ipcRenderer } = require('electron');
                    const sleep = ms => new Promise((r, j) => setTimeout(r, ms));

                    if (location.href == 'https://www.supremenewyork.com/?blaaahh.haha') {
                        function loadScript(src, callback) {
                            var head = document.getElementsByTagName('head')[0];
                            var script = document.createElement('script');
                            script.src = src;
                            head.appendChild(script);

                            callback();
                        }

                        window.stop();
                        document.write('<head></head><body>aaaaaa</body>')
                        fixed();

                        // hooks
                        {
                            const randRange = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

                        }

                        // hooks
                        //navigator.__defineGetter__('userAgent', () => { return 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_2_5 like Mac OS X) AppleWebKit/604.5.2 (KHTML, like Gecko) Version/11.0 Mobile/15D5046b Safari/604.1' });


                        loadScript("http://localhost/recaptcha/api.js", async () => {
                            console.log('script loaded');

                            window.onSubmit = function (token) {
                                alert(1);
                            }

                            document.body.innerHTML += '<form><button id="ex1" class="g-recaptcha" data-sitekey="6LeWwRkUAAAAAOBsau7KpuC9AV-6J8mhw4AjC3Xz" data-callback="onSubmit" data-size="invisible">送信</button></form><br>';

                            var verifyCallback = function (response) {
                                ipcRenderer.send('recaptcha-verified', response);
                            };



                            var widgetId = grecaptcha.render(document.getElementById('ex1'), {
                                'sitekey': '6LeWwRkUAAAAAOBsau7KpuC9AV-6J8mhw4AjC3Xz',
                                'callback': verifyCallback,
                            });
                        });

                        (async () => {

                            var bdoc = null
                            while (true) {
                                var ifrs = document.querySelectorAll('iframe');
                                if (ifrs.length == 2) {
                                    for (var i = 0; i < 2; i++) {
                                        if (ifrs[i].contentWindow.location.href.indexOf('/bframe') != -1) {
                                            bdoc = ifrs[i].contentWindow.document;
                                            break;
                                        }
                                    }

                                    if (bdoc != null)
                                        break;
                                }

                                await sleep(10);
                            }

                            var script = bdoc.createElement('script');
                            var style = bdoc.createElement('style');
                            style.type = 'text/css';
                            style.appendChild(bdoc.createTextNode(`
                  .rc-imageselect-tile {
                    transition: opacity 0s ease 0s !important;
                  }
                    `));

                            if (1 == 2) {
                                bdoc.getElementsByTagName('head')[0].appendChild(style);

                                var script = bdoc.createElement('script');
                                script.innerText = `
                            const randRange = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

        window._temp = window.setTimeout;        
        window.setTimeout = function () {
          try {
         

            if (arguments[1] == 4000) {
              arguments[1] = 2700;
            } else if (arguments[1] == 1500011) {
             arguments[1] = 0;
            }  else if (arguments[1] == 5000111) {
             arguments[1] = 1000;
            } else if (arguments[1] == 50111) {
             arguments[1] = -1;
            } else if (arguments[1] == 600111) {
              arguments[1] = 0;
            } else if (arguments[1] == 100111) {
              arguments[1] = 0;
            }
            var r = window._temp.apply(this, arguments);
           
            return r;
          } catch (e) {
            return null;
          }
        };`;

                                bdoc.body.appendChild(script);
                            }
                        })();
                    } else
                        fixed();

                    function fixed() {
                        var style = document.createElement('style');
                        style.type = 'text/css';
                        style.appendChild(document.createTextNode(`
                    .wrapper_j893fkiefhih784fkhauw {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 483957395
}
.btn-square-shadow {
  display: inline-block;
  padding: 0.5em 1em;
  text-decoration: none;
  background: #668ad8;
  color: #FFF;
  border-bottom: solid 4px #627295;
  border-radius: 3px;
}
.btn-square-shadow:active {
  -webkit-transform: translateY(4px);
  transform: translateY(4px);
  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.2);
  border-bottom: none;
}
                    `));

                        function createElementFromHTML(html) {
                            const tempEl = document.createElement('div');
                            tempEl.innerHTML = html;
                            return tempEl.firstElementChild;
                        }


                        document.getElementsByTagName('head')[0].appendChild(style);
                        var elem = createElementFromHTML(`
                      <div class="wrapper_j893fkiefhih784fkhauw">
   <a href="https://www.youtube.com/" class="btn-square-shadow" style="">Youtube</a>
   <a href="https://mail.google.com/" class="btn-square-shadow" style="margin-left: 30px">Gmail</a>
   <a href="https://www.supremenewyork.com/?blaaahh.haha" class="btn-square-shadow" style="margin-left: 30px">Recaptcha</a>
  </div>
                    `);
                        document.body.appendChild(elem);
                    }


                }).toString_()
            );
        })
        child.on('closed', () => {
            child = null;
        })
    })
    ipcMain.on('pi', function (event, args) {
        win.webContents.send('pi_cb', ctx.pi);
    })
    ipcMain.on('window-close', function (event, args) {
        win.close();
    })
    ipcMain.on('window-maximize', function (event, args) {
        if (win.isMaximized())
            win.restore()
        else
            win.maximize()
    })
    ipcMain.on('window-minimize', function (event, args) {
        win.minimize();
    })
    ipcMain.on('recaptcha-verified', (event, args) => {
        win.webContents.send('recaptcha-token', args);
    });
    ipcMain.on('opendev', (event, args) => {
        win.webContents.openDevTools();
    });



    ipcMain.on('request', (event, args) => {
        const request = net.request({
            method: args.method,
            protocol: args.protocol,
            hostname: args.hostname,
            port: args.port,
            path: args.path
        })
        if (args.hasOwnProperty('headers')) {
            Object.keys(args.headers).forEach((key) => {
                request.setHeader(key, args.headers[key])
            })
        } else {
            request.setHeader('Accept', '*/*')
            request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko')
            request.setHeader('Accept-Language', 'ja;q=1, en-US;q=0.9')
            request.setHeader('Accept-Encoding', 'gzip, deflate')
        }

        let bd = '';
        request.on('response', (response) => {
            response.on('data', (chunk) => {
                bd += chunk.toString();
            })
            response.on('end', (chunk) => {
                win.webContents.send('response', { id: args.id, headers: response.headers, body: bd });
            })
        })

        request.write(args.data)
        request.end()

        return;
    })

    function now() { var d_ = new Date(); var dst_ = d_.toLocaleString('ja') + ':' + ('000' + d_.getMilliseconds()).slice(-3); return dst_; };
    function fn(details, callback) {
        //wv001.removeEventListener('did-start-loading', loadstart);

        //console.log(details.resourceType);
        //console.log(details.requestHeaders.Referer);

        if ((details.requestHeaders.Referer !== undefined && details.requestHeaders.Referer.indexOf('/?blaaahh.haha') == -1) && (details.url.indexOf('https://assets.supremenewyork.com/') != -1 || details.requestHeaders.Referer.indexOf('https://www.supremenewyork.com/') != -1)) {
            var cancel = false;

            if ((details.resourceType === 'stylesheet' || details.resourceType === 'image') || (details.resourceType === 'script' && details.url.indexOf('https://www.gstatic.com') != -1 || details.url.indexOf('https://connect.facebook.net') != -1
                || details.url.indexOf('https://ssl.google-analytics.com/') != -1 || details.url.indexOf('https://cdn.mxpnl.com') != -1 || details.url.indexOf('https://www.google.com') != -1)) {
                cancel = true;
            }

            if (cancel) {
                callback({ cancel: true });
                return;
            }
        }

        for (var i = 0; i < details.requestHeaders.length; ++i) {
            if (details.url.indexOf('https://www.google.com/recaptcha/a') != -1) {
                if (details.requestHeaders[i].name === 'User-Agent') {

                    const randRange = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
                    var userAgents = [
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 11_2_5 like Mac OS X) AppleWebKit/604.5.2 (KHTML, like Gecko) Version/11.0 Mobile/15D5046b Safari/604.1',
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_3 like Mac OS X) AppleWebKit/603.3.8 (KHTML, like Gecko) Mobile/14G60 YJApp-IOS jp.co.yahoo.ipn.appli/4.8.11',
                        'Mozilla/5.0 (iPad; CPU OS 11_2_1 like Mac OS X) AppleWebKit/604.4.7 (KHTML, like Gecko) Mobile/15C153 YJApp-IOS jp.co.yahoo.ipn.appli/4.8.11',
                        'Mozilla/5.0 (iPad; CPU OS 10_0_2 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Mobile/14A456 Safari/602.1.50 Sleipnir/4.3.1m',
                    ]
                    var pk = userAgents[randRange(0, 3)];

                    details.requestHeaders[i].value = pk;
                    break;
                }
            }
        }
        for (var i = 0; i < details.requestHeaders.length; ++i) {
            if (details.url.indexOf('https://www.google.com/recaptcha/a') != -1) {
                if (details.requestHeaders[i].name === 'X-Client-Data') {
                    // details.requestHeaders.splice(i, 1);
                    details.requestHeaders[i].value = 'CIi2yQEIo7bJAQjBtskBCKmdygEIqKPKAQixp8oBCOKoygEI8KnKAQ==';
                    break;
                }
            }
        }

        callback({ cancel: false, requestHeaders: details.requestHeaders });
    }
    function fn2(details, callback) {
        if (details.url.includes('v1552285980763/recaptcha__en.js')) {
            callback({ redirectURL: 'http://localhost/recaptcha/recaptcha__en.js' });
            return;
        }

        callback({ cancel: false });
    }

    session.defaultSession.webRequest.onBeforeSendHeaders(filter, fn);
    session.defaultSession.webRequest.onBeforeRequest(filter, fn2);

    /*
    session.defaultSession.webRequest.onHeadersReceived(filter2, (details, callback) => {
        var part = 'fril://auth?auth_token=';
        var location = details.responseHeaders['location'][0];
        win.webContents.send('debug', location);
        if (location.indexOf(part) != -1) {
            var auth_token = location.substr(part.length)

            win.webContents.send('rakuten', auth_token)
            session.defaultSession.clearStorageData({ storages: ["cookies"] }, (callback) => { })
        } else {
            win.webContents.send('rakuten', 'fail')
            session.defaultSession.clearStorageData({ storages: ["cookies"] }, (callback) => { })
        }
        callback({ cancel: true })
    })*/

    //runProxy();
    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null
        if (child != null)
            child.close();
    })
}
// Initialize
{
    Function.prototype.toString_ = function () {
        return "(" + this.toString() + ")();";
    };
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.