var url = location.href;

const { ipcRenderer } = require('electron');
const sleep = ms => new Promise((r, j) => setTimeout(r, ms));

var ck = {
    init: function (c) {
        this.c = c;
    },
    getAll: function () {
        return this.c;
    },
    get: function (key) {
        return ((this.c + ';').match('\\b' + key + '=([^;]*)') || [])[1];
    },
    set: function (key, value) {
        if (value == 'deleted') {
            var v = ((this.c + ';').match('\\b' + key + '=([^;]*)') || [])[1];
            var str = this.c.substr(this.c.indexOf(key + '=' + v) + (key.length + 1 + v.length), 1);
            if (str == ';')
                this.c = this.c.replace(k + '=' + v + '; ', '');
            else if (str == '')
                this.c = this.c.replace(k + '=' + v, '');

            return;
        }

        this.c = this.c.replace(key + '=' + ((this.c + ';').match('\\b' + key + '=([^;]*)') || [])[1], key + '=' + value);
    },
    add: function (key, value) {
        if (value == 'deleted') {
            return;
        }

        var ps = '; ';
        if (this.c.length == 0)
            ps = '';
        this.c += ps + key + '=' + value;
    },
};
if (url.indexOf('/auth/member.php') > -1) {
    ck.init(document.cookie);
    ipcRenderer.send('prkermgen834ifalewfw', [0, 0, ck.get('p@/z@')])
}