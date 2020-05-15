function simulateClick(element) {
    var clickEvent = document.createEvent("MouseEvents")
    clickEvent.initEvent("mousedown", true, true)
    element.dispatchEvent(clickEvent);

    clickEvent = document.createEvent("MouseEvents")
    clickEvent.initEvent("click", true, true)
    element.dispatchEvent(clickEvent);

    clickEvent = document.createEvent("MouseEvents")
    clickEvent.initEvent("mouseup", true, true)
    element.dispatchEvent(clickEvent);

    this.s = element;
    this.c = this.s.getBoundingClientRect();
    this.pX = this.c.left + window.pageXOffset + 5;
    this.pY = this.c.top + window.pageYOffset + 5;

    var e = document.createEvent('MouseEvents');
    var e2 = document.createEvent('MouseEvents');
    var e3 = document.createEvent('MouseEvents');

    e.initMouseEvent('mousedown', true, true, window, 0, 0, 0, this.pX, this.pY, false, false, false, false, 0, null);
    e2.initMouseEvent('click', true, true, window, 0, 0, 0, this.pX, this.pY, false, false, false, false, 0, null);
    e3.initMouseEvent('mouseup', true, true, window, 0, 0, 0, this.pX, this.pY, false, false, false, false, 0, null);

    var callback = function (e) {
        var target = e.target;

        setTimeout(() => {
            target.focus();
            target.removeEventListener("click", callback);
        }, 0);
    }

    this.s.addEventListener("click", callback);

    this.s.dispatchEvent(e);
    this.s.dispatchEvent(e2);
    this.s.dispatchEvent(e3);
};

const { ipcRenderer } = require('electron');
const sleep = ms => new Promise((r, j) => setTimeout(r, ms));

/*
var username = null, password = null;

ipcRenderer.on('getAccount', (event, account) => {
    username = account.email;
    password = account.password;
});
*/

window.addEventListener('load', async () => {
    if (location.href.includes('rakuten.co.jp')) {
        var item_name = document.querySelector('meta[name="description"]').getAttribute('content');
        if (item_name != null) {
            ipcRenderer.sendToHost('rakuten_item_name', item_name);
        }
    }
});
(async () => {

    return;
    // recaptcha target site
    if (location.href.indexOf('www.google.com/recaptcha/api2/demo') != -1) {
        window._temp = window.setTimeout;
        window.setTimeout = function () {
            try {

                if (arguments[1] == 4000) {
                    arguments[1] = 800;
                } else if (arguments[1] == 1500011) {
                    arguments[1] = 0;
                } else if (arguments[1] == 5000) {
                    arguments[1] = 3000;
                } else if (arguments[1] == 50) {
                    arguments[1] = 0;
                } else if (arguments[1] == 600) {
                    arguments[1] = 0;
                } else if (arguments[1] == 100) {
                    arguments[1] = 0;
                }
                var r = window._temp.apply(this, arguments);
                ipcRenderer.sendToHost('log', arguments);
                return r;
            } catch (e) {
                return null;
            }
        };
    }
    if (location.href.indexOf('https://unite.nike.com/') != -1) {
        while (true) {
            try {
                ipcRenderer.sendToHost('access_token', document.body.textContent.trim());
                break;
            } catch (ex) {

            }

            await sleep(100);
        }
    }

    if (location.href == 'https://store.nike.com/jp/ja_jp/?l=shop,login_register') {
        while (true) {
            if (document.querySelector('input[placeholder="Eメール"]') != null && username != null)
                break;

            await sleep(300);
        }

        document.querySelector('input[placeholder="Eメール"]').value = username;
        simulateClick(document.querySelector('input[placeholder="パスワード"]'));
        await sleep(300);
        document.querySelector('input[placeholder="パスワード"]').value = password;
        await sleep(200);
        simulateClick(document.querySelector('input[value="ログイン"]'));

        while (true) {
            if (document.querySelector('span[js-hook="username"]').textContent != '') {
                await sleep(20);
                location.href = 'https://unite.nike.com/auth/unite_session_cookies/v1';
                break;
            }

            await sleep(100);
        }
    }
})();