(function() {
    window.auth = {
        rakuma: {
            users: []
        },
        rakuten: {
            users: []
        },
    }
    window.pics = [];
})();

const {
    ipcRenderer
} = require('electron');
const {
    net
} = require('electron').remote;
const http = require('http'),
    https = require('https'),
    iconv = require('iconv-lite'),
    zlib = require('zlib');
const sleep = ms => new Promise((r, j) => setTimeout(r, ms));
const randRange = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
const str2doc = str => {
    let parser = new DOMParser();
    return parser.parseFromString(str, "text/html");
};
const str2xml = str => {
    let parser = new DOMParser();
    return parser.parseFromString(str, "application/xml");
};
const toInt = str => {
    return parseInt(str, 10);
};
Node.prototype.prependChild = function(e) {
    this.insertBefore(e, this.firstChild);
}

function now() {
    var d_ = new Date();
    var dst_ = d_.toLocaleString('ja') + ':' + ('000' + d_.getMilliseconds()).slice(-3);
    return dst_;
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

var log_e = $('#LogBox');

function Log(str, color) {
    if (color !== undefined) {
        var p = '<p class="log-color-' + color + '">' + str + '</p>';
        log_e.append(p);
    } else
        log_e.append("<p>" + str + "</p>");
}


function createCookieStore() {
    var ck = {
        init: function(c) {
            this.c = c;
        },
        getAll: function() {
            return this.c;
        },
        get: function(key) {
            return ((this.c + ';').match('\\b' + key + '=([^;]*)') || [])[1];
        },
        set: function(key, value) {
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
        add: function(key, value) {
            if (value == 'deleted') {
                return;
            }

            var ps = '; ';
            if (this.c.length == 0)
                ps = '';
            this.c += ps + key + '=' + value;
        },
    };

    return ck;
}

function updateCookieStore(ck, cookie, res) {
    try {
        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) === undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) !== undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
        }
    } catch (ex) {

    }

    return ck;
}

var ciphers = ['TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
    'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
    'TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA384',
    'TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA',
    'TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256',
    'TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA',
    'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
    'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
    'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384',
    'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256',
    'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA'
].join(':');

function request(args, charset) {
    return new Promise((resolve, reject) => {
        var chunks = [];
        var URL_ = new URL(args.url);

        //if (args.method === 'POST')
        //  args.headers['Content-Length'] = args.data.length;

        if (URL_.protocol == 'http:') {
            var options = {};
            if (args.proxy === undefined || args.proxy === '') {
                options = {
                    method: args.method,
                    host: URL_.hostname,
                    port: 80,
                    path: URL_.pathname + URL_.search,
                    headers: args.headers,
                    encoding: null,
                };
            } else {
                var parr = args.proxy.split(':');
                var host = null,
                    port = null,
                    username = null,
                    password = null;

                if (parr.length == 2) {
                    host = parr[0];
                    port = parr[1];

                } else if (parr.length == 4) {
                    username = parr[2];
                    password = parr[3];

                    var auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
                    args.headers['Proxy-Authorization'] = auth;
                } else {
                    // error
                    resolve('invalid proxy params');
                }

                args.headers['Host'] = URL_.hostname;
                options = {
                    method: args.method,
                    host: host,
                    port: port,
                    path: URL_.href,
                    headers: args.headers,
                    encoding: null,
                };
            }

            let req = http.request(options, (res) => {
                //res.setEncoding('utf8');
                var zres;
                if (res.headers['content-encoding'] == 'gzip') {
                    var gzip = zlib.createGunzip();
                    res.pipe(gzip);
                    zres = gzip;
                } else {
                    zres = res;
                }

                zres.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                zres.on('end', () => {
                    var body = null;
                    if (res.headers.hasOwnProperty('content-type')) {
                        var content_type = res.headers['content-type'].toLocaleLowerCase();
                        if (content_type.includes('charset=utf-8')) {
                            body = Buffer.concat(chunks).toString();
                        } else if (content_type.includes('charset=')) {
                            var charset = content_type.substr(content_type.lastIndexOf('charset=') + 'charset='.length);
                            body = iconv.decode(Buffer.concat(chunks), charset);
                        } else {
                            body = Buffer.concat(chunks).toString();
                        }
                    } else {
                        if (charset != undefined && charset == 'shift_jis') {
                            body = iconv.decode(Buffer.concat(chunks), 'shift_jis');
                        } else if (charset != undefined && charset == 'euc-jp') {
                            body = iconv.decode(Buffer.concat(chunks), 'euc-jp');
                        } else if (charset == undefined) {
                            body = Buffer.concat(chunks).toString();
                        } else {
                            body = Buffer.concat(chunks).toString();
                        }
                    }
                    resolve({
                        headers: res.headers,
                        body: body
                    });

                });
            });
            req.on('error', (e) => {
                console.log('problem with request: ' + e.message);
                resolve({
                    headers: {},
                    body: ''
                });
            });
            req.write(args.data);
            req.end();
        } else if (URL_.protocol == 'https:') {
            if (args.proxy === undefined || args.proxy === '') {
                let req = https.request({
                    method: args.method,
                    host: URL_.hostname,
                    port: URL_.protocol == 'https:' ? 443 : 80,
                    path: URL_.pathname + URL_.search,
                    headers: args.headers,
                    rejectUnauthorized: false,
                    ciphers: ciphers,
                    encoding: null,
                }, (res) => {
                    //res.setEncoding('utf8');
                    var zres;
                    if (res.headers['content-encoding'] == 'gzip') {
                        var gzip = zlib.createGunzip();
                        res.pipe(gzip);
                        zres = gzip;
                    } else {
                        zres = res;
                    }

                    zres.on('data', (chunk) => {
                        chunks.push(chunk);
                    });
                    zres.on('end', () => {
                        var body = null;
                        if (res.headers.hasOwnProperty('content-type')) {
                            var content_type = res.headers['content-type'].toLocaleLowerCase();
                            if (content_type.includes('charset=utf-8')) {
                                body = Buffer.concat(chunks).toString();
                            } else if (content_type.includes('charset=')) {
                                var charset = content_type.substr(content_type.lastIndexOf('charset=') + 'charset='.length);
                                body = iconv.decode(Buffer.concat(chunks), charset);
                            } else {
                                body = Buffer.concat(chunks).toString();
                            }
                        } else {
                            if (charset != undefined && charset == 'shift_jis') {
                                body = iconv.decode(Buffer.concat(chunks), 'shift_jis');
                            } else if (charset != undefined && charset == 'euc-jp') {
                                body = iconv.decode(Buffer.concat(chunks), 'euc-jp');
                            } else if (charset == undefined) {
                                body = Buffer.concat(chunks).toString();
                            } else {
                                body = Buffer.concat(chunks).toString();
                            }
                        }
                        resolve({
                            headers: res.headers,
                            body: body
                        });

                    });
                });
                req.on('error', (e) => {
                    console.log('problem with request: ' + e.message);
                    resolve({
                        headers: {},
                        body: ''
                    });
                });

                req.write(args.data);
                req.end();
            } else {
                var parr = args.proxy.split(':');
                var host = null,
                    port = null,
                    username = null,
                    password = null;

                var headers = {};

                if (parr.length == 2) {
                    host = parr[0];
                    port = parr[1];

                } else if (parr.length == 4) {
                    username = parr[2];
                    password = parr[3];

                    var auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
                    headers['Proxy-Authorization'] = auth;
                } else {
                    // error
                    resolve('invalid proxy params');
                }

                headers['Host'] = URL_.hostname;
                headers['Proxy-Connection'] = 'Keep-Alive';

                var options = {
                    method: 'CONNECT',
                    host: host,
                    port: port,
                    path: URL_.hostname + ':' + (URL_.protocol == 'https:' ? 443 : 80),
                    headers: headers
                };

                let req_p = http.request(options).on('connect', (_res, socket) => {
                    //res.setEncoding('utf8');
                    let req = https.request({
                        method: args.method,
                        host: URL_.hostname,
                        port: URL_.protocol == 'https:' ? 443 : 80,
                        path: URL_.pathname + URL_.search,
                        headers: args.headers,
                        socket: socket, // using a tunnel
                        rejectUnauthorized: false,
                        agent: false, // cannot use a default agent
                        ciphers: ciphers,
                        encoding: null,
                    }, (res) => {
                        var zres;
                        if (res.headers['content-encoding'] == 'gzip') {
                            var gzip = zlib.createGunzip();
                            res.pipe(gzip);
                            zres = gzip;
                        } else {
                            zres = res;
                        }

                        zres.on('data', (chunk) => {
                            chunks.push(chunk);
                        });
                        zres.on('end', () => {
                            var body = null;
                            if (res.headers.hasOwnProperty('content-type')) {
                                var content_type = res.headers['content-type'].toLocaleLowerCase();
                                if (content_type.includes('charset=utf-8')) {
                                    body = Buffer.concat(chunks).toString();
                                } else if (content_type.includes('charset=')) {
                                    var charset = content_type.substr(content_type.lastIndexOf('charset=') + 'charset='.length);
                                    body = iconv.decode(Buffer.concat(chunks), charset);
                                } else {
                                    body = Buffer.concat(chunks).toString();
                                }
                            } else {
                                if (charset != undefined && charset == 'shift_jis') {
                                    body = iconv.decode(Buffer.concat(chunks), 'shift_jis');
                                } else if (charset != undefined && charset == 'euc-jp') {
                                    body = iconv.decode(Buffer.concat(chunks), 'euc-jp');
                                } else if (charset == undefined) {
                                    body = Buffer.concat(chunks).toString();
                                } else {
                                    body = Buffer.concat(chunks).toString();
                                }
                            }

                            resolve({
                                headers: res.headers,
                                body: body
                            });
                        });
                    });

                    req.on('error', (e) => {
                        resolve({
                            headers: {},
                            body: '',
                            error: e.message
                        });
                        return;
                    });
                    req.write(args.data);
                    req.end();
                }).end();

                req_p.on('error', (e) => {
                    console.log(e.message);
                    resolve({
                        headers: {},
                        body: '',
                        error: e.message
                    });
                    return;

                    /* the proxy server is not working(unable to connect) */
                    // socket hang up
                    // read ECONNRESET
                });
            }
        }
    });
}

function prequest(args, charset, phost, pport) {
    return new Promise(resolve => {
        var chunks = [];
        var URL_ = new URL(args.url);
        args.headers['Host'] = URL_.hostname;

        if (URL_.protocol == 'http:') {
            //res.setEncoding('utf8');
            let req = http.request({
                method: args.method,
                host: phost,
                port: pport,
                path: URL_.href,
                headers: args.headers,
                encoding: null,
            }, (res) => {
                var zres;
                if (res.headers['content-encoding'] == 'gzip') {
                    var gzip = zlib.createGunzip();
                    res.pipe(gzip);
                    zres = gzip;
                } else {
                    zres = res;
                }

                zres.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                zres.on('end', () => {
                    var body = null;
                    if (charset != undefined && charset == 'shift_jis') {
                        body = iconv.decode(Buffer.concat(chunks), 'shift_jis');
                    } else if (charset != undefined && charset == 'euc-jp') {
                        body = iconv.decode(Buffer.concat(chunks), 'euc-jp');
                    } else if (charset == undefined) {
                        body = Buffer.concat(chunks).toString();
                    } else {
                        body = Buffer.concat(chunks).toString();
                    }
                    resolve({
                        headers: res.headers,
                        body: body
                    });

                });
            });

            req.on('error', (e) => {
                console.log('problem with request: ' + e.message);
                resolve(null);
            });
            req.write(args.data);
            req.end();
        } else if (URL_.protocol == 'https:') {
            http.request({
                method: 'CONNECT',
                host: phost,
                port: pport,
                path: args.hostname + ':' + args.port,
            }).on('connect', (_res, socket) => {
                //res.setEncoding('utf8');
                let req = https.request({
                    method: args.method,
                    host: URL_.hostname,
                    port: URL_.protocol == 'https:' ? 443 : 80,
                    path: URL_.pathname + URL_.search,
                    headers: args.headers,
                    socket: socket, // using a tunnel
                    rejectUnauthorized: false,
                    agent: false, // cannot use a default agent
                    encoding: null,
                }, (res) => {
                    var zres;
                    if (res.headers['content-encoding'] == 'gzip') {
                        var gzip = zlib.createGunzip();
                        res.pipe(gzip);
                        zres = gzip;
                    } else {
                        zres = res;
                    }

                    zres.on('data', (chunk) => {
                        chunks.push(chunk);
                    });
                    zres.on('end', () => {
                        var body = null;
                        if (charset != undefined && charset == 'shift_jis') {
                            body = iconv.decode(Buffer.concat(chunks), 'shift_jis');
                        } else if (charset != undefined && charset == 'euc-jp') {
                            body = iconv.decode(Buffer.concat(chunks), 'euc-jp');
                        } else if (charset == undefined) {
                            body = Buffer.concat(chunks).toString();
                        } else {
                            body = Buffer.concat(chunks).toString();
                        }
                        resolve({
                            headers: res.headers,
                            body: body
                        });

                    });
                });

                req.on('error', (e) => {
                    console.log('problem with request: ' + e.message);
                    resolve(null);
                });
                req.write(args.data);
                req.end();
            }).end();
        }
    });
}

async function supyo(args, token) {
    var task = args[0],
        account = args[1],
        proxy = args[2],
        billing = args[3];
    var task_idx = findTaskIndex(task.id);
    var csrf = '';
    var cookie = '';
    var doc = null;

    var p1 = new URLSearchParams(decodeURI('utf8=%E2%9C%93&style=20213&size=56934&commit=%E3%82%AB%E3%83%BC%E3%83%88%E3%81%AB%E5%85%A5%E3%82%8C%E3%82%8B'));
    var p2 = new URLSearchParams(decodeURI('utf8=%E2%9C%93&authenticity_token=LJbm1Uz1VHQqPYMVfi2DtTVV5dms9aC0d%2F4maTGn%2FC0SD0MwHILz0JYeeIUbWo%2BIt%2BrcErJa%2BlJSucKtZp1KCg%3D%3D&order%5Bbilling_name%5D=%E3%81%94%E3%82%81%E3%82%93%E3%81%AA%E3%81%95%E3%81%84%E3%80%80aff%E4%BA%A4&order%5Bemail%5D=33632%40gmail.com&order%5Btel%5D=0803114222&order%5Bbilling_zip%5D=2234772&order%5Bbilling_state%5D=f%E8%BF%94FROMf&order%5Bbilling_city%5D=af&order%5Bbilling_address%5D=33334&same_as_billing_address=1&credit_card%5Btype%5D=cod&credit_card%5Bcnb%5D=&credit_card%5Bmonth%5D=01&credit_card%5Byear%5D=2019&credit_card%5Bvval%5D=&order%5Bterms%5D=1&hpcvv=&g-recaptcha-response=03AO9ZY1BszagL0F_NxnMg1iaFZmdX9n2V9q8s5sepgtJ4T5FuSUAcFU_CjpJCbRuv5aiD-izxvEeXu1E3SE0hwVdgvWMABdP7PQT35PKSUvfgG1JZzoEUL7CoNi8VVbiti3bMpuFjJRgLn4nXYapFJJEHi_EFEE2CGvjaWW2_qTq_TVeBvMGKdsAuNv4AMTtDCy-AFQf3xyBWrGgitKaXbvk5IgRFgJgkjTPQLMhqI1DpxwKB2rhd9LBDB49f__KROxLje9IV9xhvvbIFOrt7rFuMCE40XCoR1icroQ75dGfMCo3QPZQ180OaAR86ZpBPWnTlTj-qZQD_VRxrwq5jHdzZSlg4KvNFUA'));
    //var token = '03AO9ZY1CBkZTmiRdSb0-VaJHMGS4TDtOpYAucSKQMGb5-g_uNNwzA7qDMMBt8Fw_sGQM2QN1P8fWpZkeNcCEfmye8xf-XH45jMe8mTDCXZSknmxnXImZaiN6MRJHAPrREF9nCkKtey4UyhdxD1vgDqA3pInqpmIPqe0iCusu6a0aq9ieu2RpMtpcFFUO_5NU2rqygqg21DdRyQMx3aLe84k4kVkSrIVqsz35LKwIUW4Gsy4S1vKGeav3nyQGRyR9TLEPil9FNJPuAtaecIk3nIuEAkz5OdEsNs1SN-8GFpsXc_SQ1ltucBt0116o5llSxhrDy6_rqVI6eUdDyf_nMx_i2cieQ_xkKyQ';
    const snf0 = '<meta name="csrf-token" content="';

    var ck = createCookieStore();

    {
        // 説明
        // モバイルバージョンで監視を行う(商品名がわかるため)
        // モバイルバージョンはユーザーエージェントとパラメータ(from_mobileなど)で指定できる
        // モバイルバージョンで名前がキーワードとマッチした場合に、デスクトップ指定ならデスクトップ版のカテゴリ一覧で画像の切れ端を取得し、デスクトップ版の商品URLを特定する
    }
    // variables
    let keyWord = task.keywords; //'+Spitfire,+Wheels';  // +box,+logo,-bear
    let categories = ["Jackets", "Coats", "Shirts", "Tops/Sweaters", "Sweatshirts", "Pants", "Shorts", "T-Shirts", "Hats", "Bags", "Accessories", "Shoes", "Skate"]
        // 0 -> "Jackets", 1 -> "Coats", 2-> "Shirts", 3 -> "Tops/Sweaters", 4 ->"Sweatshirts", 5->"Pants", 6->"Shorts", 7->"T-Shirts",
        // 8-> "Hats", 9->"Bags", 10->"Accessories", 11->"Shoes", 12->"Skate"
    let category = categories[task.js_category]; //categories[10];
    let preferredSize = task.size; //'+53mm';
    let preferredStyle = task.style; //'+white';
    let autoCheckout = false;
    let obs_interval = 10;
    let chekcin_delay = 100;
    let checkout_delay = 100;

    let mb_category_url = 'https://www.supremenewyork.com/mobile/#categories/';
    let mb_product_url = 'https://www.supremenewyork.com/mobile/#products/';
    let pc_category_url = 'https://www.supremenewyork.com/shop/all/';

    let mobile_stock_url = 'https://www.supremenewyork.com/mobile_stock.json';
    let mobile_shop_url = 'https://www.supremenewyork.com/shop/';
    var mb_item_url, pc_item_url;
    var product_name = '';

    var s = new Date().getTime();

    function matchKeyWord(itemName, keyWords) {
        let name = itemName.toLowerCase().trim();
        let keyWordsList = keyWords.toLowerCase().split(",");
        for (let i = 0; i < keyWordsList.length; i++) {
            let word = keyWordsList[i].trim();
            if (keyWordsList.length == 1) {
                if ((word.includes('+') && name != word.substr(1)) ||
                    (word.includes('-') && name == word.substr(1))) {
                    return false;
                }
            }
            if ((word.includes('+') && !name.includes(word.substr(1))) ||
                (word.includes('-') && name.includes(word.substr(1)))) {
                return false;
            }
        }
        return true;
    };

    {

        // get csrf token for Desktop
        var headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Cookie': '',
        };

        var res = await request({
            method: 'GET',
            url: pc_category_url,
            headers: headers,
            data: '',
        });

        doc = str2doc(res.body);
        csrf = doc.querySelector('[name="csrf-token"]').getAttribute('content');

        lazyb.tasks[task_idx]['matched'] = null;

        if (lazyb.tasks[task_idx]['matched'] === null) {
            while (true) {
                if (lazyb.tasks[task_idx]['matched'] !== null)
                    break;

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Cookie': '',
                };

                var res = await request({
                    method: 'GET',
                    url: mobile_stock_url,
                    headers: headers,
                    data: '',
                });

                var json = JSON.parse(res.body);
                var jcate = json['products_and_categories'][category];

                jcate.forEach((ele) => {
                    if (matchKeyWord(ele.name, keyWord)) {
                        lazyb.tasks[task_idx]['matched'] = ele;
                        return true;
                    }
                });

                if (lazyb.tasks[task_idx]['matched'] !== null)
                    break;

                await sleep(5);
            }

            // waiting for lazyb.tasks[task_idx]['matched'] 
        }

        var matched = lazyb.tasks[task_idx]['matched'];
        if (matched !== null) {
            product_name = matched['name'];
            var mb_url = mb_product_url + matched['id'];
            var pc_url = '';
            mb_item_url = mb_url;
            //console.log('mobile_url: ' + mb_product_url + matched['id']);

            var img_url = matched['image_url_hi'];
            var pos, pos2;
            pos = img_url.lastIndexOf('/') + 1;
            img_url = img_url.substr(pos);
            pos2 = img_url.indexOf('.');
            img_url = img_url.substr(0, pos2);

            var snippet = img_url;

            if (1 == 2) { // if (!task.options.use_mobile) {
                try {
                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Encoding': 'gzip, deflate',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Cookie': '',
                    };

                    var res = await request({
                        method: 'GET',
                        url: pc_category_url + category.toLowerCase(),
                        headers: headers,
                        data: '',
                    });

                    doc = str2doc(res.body);

                    var articles = $(doc).find('article > div.inner-article');
                    articles.each((idx, elem) => {
                        var anchor = elem.querySelector('a');
                        var img_src = anchor.querySelector('img').src;
                        if (img_src.indexOf('/' + snippet) != -1) {
                            pc_url = anchor.href.replace('/shop/', 'https://www.supremenewyork.com/shop/');
                            pc_url = pc_url.substr(pc_url.indexOf('https://www.supremenewyork.com/shop/'));
                        }
                    });

                    pc_item_url = pc_url;

                    console.log('mb_item_url: ' + mb_item_url);
                    console.log('pc_item_url: ' + pc_item_url);
                } catch (exx) {

                }
            }

            console.log('finished finding: ' + (new Date().getTime() - s));
        }
    }

    {
        var item_id = mb_item_url.substr(mb_item_url.lastIndexOf('/') + 1);
        var item_url = mobile_shop_url + item_id + '.json';
        var item_add_url = mobile_shop_url + item_id + '/add.json';
        var pc_item_add_url = mobile_shop_url + item_id + '/add'

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Cookie': '',
            'Connection': 'close',
        };
        var res = await request({
            method: 'GET',
            url: item_url,
            headers: headers,
            data: '',
        });

        var j = JSON.parse(res.body);

        var matched_style = null;
        var matched_size = null;
        var styles = j['styles'];

        styles.forEach((ele) => {
            if (matchKeyWord(ele.name, preferredStyle)) {
                if (matched_style != null)
                    return;

                matched_style = ele;
                matched_style['sizes'].forEach((ele2) => {
                    if (matched_size != null)
                        return;
                    if (matchKeyWord(ele2.name, preferredSize)) {
                        matched_size = ele2;
                        return;
                    }
                });

            }
        });

        if (matched_style == null || matched_size == null)
            return;

        console.log(matched_style);

        // Desktop
        if (!task.options.use_mobile) {
            // use browser
            if (1 == 1) {
                // find a webview element which included the current task_id in the element's task_id attribute.

                var currentIndex = 0;
                var webview_elements = $('webview');

                webview_elements.each((idx, element) => {
                    if ($(element).attr('task_id') == task.id.toString()) {
                        currentIndex = $(element).attr('index').toInt();
                        return true;
                    }
                });

                wvContainer[currentIndex].contentWindow.postMessage({
                    name: 'pc_item_add_url',
                    data: pc_item_add_url
                }, '*');
                wvContainer[currentIndex].contentWindow.postMessage({
                    name: 'matched_size',
                    data: matched_size
                }, '*');
                wvContainer[currentIndex].contentWindow.postMessage({
                    name: 'matched_style',
                    data: matched_style
                }, '*');

                await sleep(20); // 20 ~ 60

                wvContainer[currentIndex].executeJavaScript(
                    (async function() {
                        window.String.prototype.decode = function() {
                            return decodeURI(this);
                        };

                        function addCart() {
                            return new Promise((resolve) => {
                                var hostUrl = window.pc_item_add_url;
                                var utf8 = '%E2%9C%93';
                                var style = window.matched_style.id;
                                var size = window.matched_size.id;
                                console.log(style, size);
                                var commit = '%E3%82%AB%E3%83%BC%E3%83%88%E3%81%AB%E5%85%A5%E3%82%8C%E3%82%8B';
                                $.ajax({
                                    url: hostUrl,
                                    type: 'POST',
                                    dataType: 'json',
                                    data: {
                                        utf8: utf8.decode(),
                                        style: style,
                                        size: size,
                                        commit: commit.decode()
                                    },
                                    timeout: 3000,
                                }).done(function(data) {
                                    resolve('okay');
                                }).fail(function(XMLHttpRequest, textStatus, errorThrown) {
                                    resolve("error");
                                });
                            });
                        }

                        var resss = await addCart();
                        console.log(resss);
                        location.href = 'https://www.supremenewyork.com/checkout';
                    }).toString_()
                );

                lazyb_captcha['tokens2'].push({
                    response: token,
                    expire: new Date().getTime() + 50 * 1000
                });

                console.log(now() + ' task[' + task.id + '] スタートしたよ');
                wvContainer[currentIndex].billing = billing;
                return;
            }
            var p1 = new URLSearchParams('utf8=%E2%9C%93&style=21962&size=62308&commit=%E3%82%AB%E3%83%BC%E3%83%88%E3%81%AB%E5%85%A5%E3%82%8C%E3%82%8B');

            p1.set('size', matched_size.id);
            p1.set('style', matched_style.id);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36',
                'Accept': '*/*;q=0.5, text/javascript, application/javascript, application/ecmascript, application/x-ecmascript',
                'Origin': 'https://www.supremenewyork.com',
                'X-CSRF-Token': csrf,
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://www.supremenewyork.com/shop/',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Cookie': '',
                'Connection': 'close',
            };
            var res = await request({
                method: 'POST',
                url: pc_item_add_url,
                headers: headers,
                data: p1.toString(),
            });
            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();


            var p2 = new URLSearchParams(decodeURIComponent('utf8=%E2%9C%93&authenticity_token=turPR56Qjp3zhGi5nV4W1wMcnabtkiE456cozP%2F%2BZ50%2FYsu3YRExpksaY70oucGJ0QtlaN8ofLLmNN9C%2BP4A8Q%3D%3D&order%5Bbilling_name%5D=%E3%81%8A%E8%8F%93%E5%AD%90%E5%B1%B1+%E6%AD%A6%E9%83%8E&order%5Bemail%5D=ehehe32%40gmail.com&order%5Btel%5D=07011551133&order%5Bbilling_zip%5D=1001000&order%5Bbilling_state%5D=+%E6%9D%B1%E4%BA%AC%E9%83%BD&order%5Bbilling_city%5D=%E5%8D%83%E4%BB%A3%E7%94%B0%E5%8C%BA&order%5Bbilling_address%5D=%E3%81%93%E3%81%93%E3%82%89%E5%85%9A&same_as_billing_address=1&credit_card%5Btype%5D=cod&credit_card%5Bcnb%5D=&credit_card%5Bmonth%5D=03&credit_card%5Byear%5D=2019&credit_card%5Bvval%5D=&order%5Bterms%5D=0&order%5Bterms%5D=1&g-recaptcha-response=03AOLTBLQ8hRnggLnzIGnHchTny34s9aEFBfTndmr_p-6UABuSB7bv7AUVqW9TM76SlE3etPhAjz7IjM8g4I29PpyWyAiSkVQhRxS1P6AAQ1N1cbXGvWATVyQIlrG8JH0JdNHuwcnPu3yW2xEFaLVDmwhVKGQrpomodNo2-3TjsItf4Dr-6NsBOuDUdMP4tk-LtJQEEU-bU8HiGduBOe0b1BGQ23PBiBPx7r9xK2EIpcc2KYm8K3Y4fXFMXNhnPnFzeG8Qwk7SiIpGXr2ydMrPXl77Zh0vwFFg7VcBL6YBodjas5nXv_oH3WJWrQZ5hYAZ1IOq1ArbHY9Qrkax6qe93Qyl6ytiAOsy5Q&hpcvv='));

            p2.set('authenticity_token', csrf);
            p2.set('order[billing_name]', billing.shippingAddress.lastName + ' ' + billing.shippingAddress.firstName);
            p2.set('order[email]', billing.shippingAddress.email);
            p2.set('order[tel]', billing.shippingAddress.phone);
            p2.set('order[billing_zip]', billing.shippingAddress.postalCode);
            p2.set('order[billing_state]', ' ' + billing.shippingAddress.state);
            p2.set('order[billing_city]', billing.shippingAddress.city);
            p2.set('order[billing_address]', billing.shippingAddress.address1);
            p2.set('same_as_billing_address', '1');
            p2.set('credit_card[type]', billing.payment.cardType);
            p2.set('credit_card[cnb]', billing.payment.cardNumber.substring(0, 4) + ' ' + billing.payment.cardNumber.substring(4, 8) + ' ' + billing.payment.cardNumber.substring(8, 12) + ' ' + billing.payment.cardNumber.substring(12, 16));
            p2.set('credit_card[month]', billing.payment.expiration.split('/')[0]);
            p2.set('credit_card[year]', '20' + billing.payment.expiration.split('/')[1]);
            p2.set('credit_card[vval]', billing.payment.cvv);
            p2.set('order[terms]', '1');
            p2.set('g-recaptcha-response', token);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36',
                'Accept': '*/*',
                'Origin': 'https://www.supremenewyork.com',
                'X-CSRF-Token': csrf,
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://www.supremenewyork.com/checkout',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Cookie': cookie,
                'Connection': 'close',
            };
            var res = await request({
                method: 'POST',
                url: 'https://www.supremenewyork.com/checkout.json',
                headers: headers,
                data: p2.toString(),
            });
            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var j = res.body;
            if (j.includes('status":"paid')) {
                Log(now() + ' task[' + task.id + ']' + ' -> { ' + product_name + ' } 購入成功。', 'success');
                console.log(now() + '');
            } else {
                Log(now() + ' task[' + task.id + ']' + ' -> { ' + product_name + ' } 購入失敗。', 'danger');
                console.log(now() + 'fucked up');
            }
            console.log(now() + j);

        } else {
            var p1 = new URLSearchParams('size=&style=&qty=1');

            p1.set('size', matched_size.id);
            p1.set('style', matched_style.id);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
                'Accept': 'application/json',
                'Origin': 'https://www.supremenewyork.com',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://www.supremenewyork.com/mobile/',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Cookie': '',
                'Connection': 'close',
            };
            var res = await request({
                method: 'POST',
                url: item_add_url,
                headers: headers,
                data: p1.toString(),
            });
            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var p2 = new URLSearchParams(decodeURIComponent('store_credit_id=&from_mobile=1&cookie-sub=%257B%252262306%2522%253A1%257D&same_as_billing_address=1&order%5Bbilling_name%5D=%E5%BC%A5%E6%98%A5+%E5%B0%8F%E6%AC%A1%E9%83%8E&order%5Bemail%5D=yaya8484%40gmail.com&order%5Btel%5D=08081238443&order%5Bbilling_zip%5D=1000000&order%5Bbilling_state%5D=+%E6%9D%B1%E4%BA%AC%E9%83%BD&order%5Bbilling_city%5D=%E5%8D%83%E4%BB%A3%E7%94%B0%E5%8C%BA&order%5Bbilling_address%5D=%E5%84%84&credit_card%5Btype%5D=cod&credit_card%5Bcnb%5D=&credit_card%5Bmonth%5D=01&credit_card%5Byear%5D=2019&credit_card%5Bvval%5D=&order%5Bterms%5D=0&order%5Bterms%5D=1&g-recaptcha-response=03AOLTBLQpJqIwWK3ging9682Tl0zv_wdcg81Jntf_QRPaDcSZr0GK3J81rBb4CIbW3DCaBWtxadVcJrmaw1URDvmUUGq7MFkkoXpor0xqznmSMSQM7VNGYJesfuxnVf1g72R1dg7aGnDkUx99DAZYs6PZ_AyS0Zze_bdwoo2olahD9buNBHUuQc1S64z8hhl7jKV-qFWw9rws-al9Pny62hzETF9yrrFOXncu0nKISyz3LLIFqaHI1fKRDiYeUSZmwctwuF8dMSXEpvXysoqu53TkdrXUfjvaUupVJIgAT7qAKM5wQtpfa_OWrecKFEb9ugVEaP3z7_lYPHcI3qLJJY2HacO3dE5JVA'));

            p2.set('cookie-sub', ck.get('pure_cart'));
            p2.set('order[billing_name]', billing.shippingAddress.lastName + ' ' + billing.shippingAddress.firstName);
            p2.set('order[email]', billing.shippingAddress.email);
            p2.set('order[tel]', billing.shippingAddress.phone);
            p2.set('order[billing_zip]', billing.shippingAddress.postalCode);
            p2.set('order[billing_state]', ' ' + billing.shippingAddress.state);
            p2.set('order[billing_city]', billing.shippingAddress.city);
            p2.set('order[billing_address]', billing.shippingAddress.address1);
            p2.set('same_as_billing_address', '1');
            p2.set('credit_card[type]', billing.payment.cardType);
            //p2.set('credit_card[type]', 'cod'); // 要注意
            p2.set('credit_card[cnb]', billing.payment.cardNumber.substring(0, 4) + ' ' + billing.payment.cardNumber.substring(4, 8) + ' ' + billing.payment.cardNumber.substring(8, 12) + ' ' + billing.payment.cardNumber.substring(12, 16));
            p2.set('credit_card[month]', billing.payment.expiration.split('/')[0]);
            p2.set('credit_card[year]', '20' + billing.payment.expiration.split('/')[1]);
            p2.set('credit_card[vval]', billing.payment.cvv);
            p2.set('order[terms]', '1');
            p2.set('g-recaptcha-response', token);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
                'Accept': 'application/json',
                'Origin': 'https://www.supremenewyork.com',
                'Referer': 'https://www.supremenewyork.com/mobile/',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Cookie': cookie,
                'Connection': 'close',
            };
            var res = await request({
                method: 'POST',
                url: 'https://www.supremenewyork.com/checkout.json',
                headers: headers,
                data: p2.toString(),
            });
            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var j = res.body;
            if (j.includes('status":"paid')) {
                Log(now() + ' task[' + task.id + ']' + ' -> { ' + product_name + ' } 購入成功。', 'success');
                console.log(now() + '');
            } else {
                Log(now() + ' task[' + task.id + ']' + ' -> { ' + product_name + ' } 購入失敗。', 'danger');
                console.log(now() + 'fucked up');
            }
            console.log(now() + j);

            console.log(new Date().getTime() - s);
        }
    }
}
window.test = false;
async function spf0() {
    var csrf = '';
    var cookie = '';
    var doc = null;
    var idoc = document.querySelector('#ifr').contentDocument;
    var ldoc = null;

    var items = [];
    var p1 = new URLSearchParams(decodeURI('utf8=%E2%9C%93&style=20213&size=56934&commit=%E3%82%AB%E3%83%BC%E3%83%88%E3%81%AB%E5%85%A5%E3%82%8C%E3%82%8B'));
    var p2 = new URLSearchParams(decodeURI('utf8=%E2%9C%93&authenticity_token=LJbm1Uz1VHQqPYMVfi2DtTVV5dms9aC0d%2F4maTGn%2FC0SD0MwHILz0JYeeIUbWo%2BIt%2BrcErJa%2BlJSucKtZp1KCg%3D%3D&order%5Bbilling_name%5D=%E3%81%94%E3%82%81%E3%82%93%E3%81%AA%E3%81%95%E3%81%84%E3%80%80aff%E4%BA%A4&order%5Bemail%5D=33632%40gmail.com&order%5Btel%5D=0803114222&order%5Bbilling_zip%5D=2234772&order%5Bbilling_state%5D=f%E8%BF%94FROMf&order%5Bbilling_city%5D=af&order%5Bbilling_address%5D=33334&same_as_billing_address=1&credit_card%5Btype%5D=cod&credit_card%5Bcnb%5D=&credit_card%5Bmonth%5D=01&credit_card%5Byear%5D=2019&credit_card%5Bvval%5D=&order%5Bterms%5D=1&hpcvv=&g-recaptcha-response=03AO9ZY1BszagL0F_NxnMg1iaFZmdX9n2V9q8s5sepgtJ4T5FuSUAcFU_CjpJCbRuv5aiD-izxvEeXu1E3SE0hwVdgvWMABdP7PQT35PKSUvfgG1JZzoEUL7CoNi8VVbiti3bMpuFjJRgLn4nXYapFJJEHi_EFEE2CGvjaWW2_qTq_TVeBvMGKdsAuNv4AMTtDCy-AFQf3xyBWrGgitKaXbvk5IgRFgJgkjTPQLMhqI1DpxwKB2rhd9LBDB49f__KROxLje9IV9xhvvbIFOrt7rFuMCE40XCoR1icroQ75dGfMCo3QPZQ180OaAR86ZpBPWnTlTj-qZQD_VRxrwq5jHdzZSlg4KvNFUA'));
    var token = '03AO9ZY1CBkZTmiRdSb0-VaJHMGS4TDtOpYAucSKQMGb5-g_uNNwzA7qDMMBt8Fw_sGQM2QN1P8fWpZkeNcCEfmye8xf-XH45jMe8mTDCXZSknmxnXImZaiN6MRJHAPrREF9nCkKtey4UyhdxD1vgDqA3pInqpmIPqe0iCusu6a0aq9ieu2RpMtpcFFUO_5NU2rqygqg21DdRyQMx3aLe84k4kVkSrIVqsz35LKwIUW4Gsy4S1vKGeav3nyQGRyR9TLEPil9FNJPuAtaecIk3nIuEAkz5OdEsNs1SN-8GFpsXc_SQ1ltucBt0116o5llSxhrDy6_rqVI6eUdDyf_nMx_i2cieQ_xkKyQ';

    const snf0 = '<meta name="csrf-token" content="';

    var ck = createCookieStore();
    let d = new Date();
    window.test = false;

    {
        var headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Cookie': '',
        };

        var res = await request({
            method: 'GET',
            protocol: 'https:',
            hostname: 'www.supremenewyork.com',
            port: 443,
            path: '/shop/all',
            headers: headers,
            data: '',
        });

        console.log(res);
        csrf = res.body.substring(res.body.indexOf(snf0) + snf0.length);
        csrf = csrf.substring(0, csrf.indexOf('"'));

        doc = str2doc(res.body);

        if (idoc.body.className == "") {
            var wrap = doc.querySelector('#wrap').cloneNode(false);
            var container = doc.querySelector('#wrap > #container').cloneNode(false);
            var articles = doc.querySelectorAll('#wrap > #container > article');

            for (var i = 0; i < articles.length; i++) {
                var article = articles[i].cloneNode(true);
                var img = article.querySelector('a > img');
                img.src = img.src.replace('file://', 'https://');

                container.appendChild(article);
            }

            wrap.appendChild(container);
            wrap.style = 'padding: 0';

            idoc.body.className = 'products view-all';
            idoc.body.style = 'padding: 0';
            idoc.body.appendChild(wrap);
        } else {
            if (1 == 2) {
                window.test = true;
                var fk = doc.querySelectorAll('#wrap > #container > article')[0].cloneNode(true);
                fk.querySelector('div > a').href = doc.querySelectorAll('#wrap > #container > article > div > a')[1].href + new Date();

                var fk2 = doc.querySelectorAll('#wrap > #container > article')[1].cloneNode(true);
                fk2.querySelector('div > a').href = +new Date() + "aa";

                doc.querySelector('#wrap > #container').replaceChild(fk, doc.querySelector('#wrap > #container > article'));
                for (var i = 0; i < 3; i++) {
                    fk2.querySelector('div > a').href = +'' + i;
                    fk2.querySelector('div > a > img').src = 'https://assets.supremenewyork.com/158506/vi/PxUju_-_pBA.jpg';
                    doc.querySelector('#wrap > #container').replaceChild(fk2.cloneNode(true), doc.querySelectorAll('#wrap > #container > article')[i])
                }
                /*
                doc.body.querySelector('#wrap > #container').prependChild(fk);
                */

                console.log(1);
            }

            var articles = doc.querySelectorAll('#wrap > #container > article');
            var anc = doc.querySelectorAll('#wrap > #container > article > div > a');
            var ianc = idoc.querySelectorAll('#wrap > #container > article > div > a');

            if (anc[0].href != ianc[0].href) {
                var diff = 0;
                for (var i = 0; i < ianc.length; i++) {
                    for (var j = 0; j < articles.length; j++) {
                        if (ianc[i].href == anc[j].href) {
                            diff = j;
                            break;
                        }
                        if (diff != 0)
                            break;
                    }
                }

                //console.log(diff);

                for (var i = 0; i < diff; i++) {
                    var iart = ianc[i].parentElement.parentElement;
                    var article = anc[i].parentElement.parentElement;
                    var img = article.querySelector('a > img');
                    img.src = img.src.replace('file://', 'https://');

                    idoc.querySelector('#wrap > #container').replaceChild(article.cloneNode(true), iart);
                }
            }
        }

        doc = null;

        await sleep(2000);
    }

    console.log('run\n\n');
    d = new Date();

    var items_url = ['https://www.supremenewyork.com/shop/accessories/odhr3izkb/pigaw4ucd', 'https://www.supremenewyork.com/shop/accessories/fclrmad09/llwxa82jg', 'https://www.supremenewyork.com/shop/accessories/dtmonw6ai/jbnrlcxj1', 'https://www.supremenewyork.com/shop/pants/xpj6lrd1z/j08br7249', 'https://www.supremenewyork.com/shop/accessories/mchdm29fr/r385speih']
    var item_url = idoc.querySelectorAll('#wrap > #container > article > div > a')[70].href.replace('file://', ''); {
        var tasks = new Array(items_url.length);
        tasks.fill(0);

        await Promise.all(tasks.map(async(n, i) => {
            {
                var headers = {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Cookie': '',
                };
                var res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: 'www.supremenewyork.com',
                    port: 443,
                    path: items_url[i].replace('https://www.supremenewyork.com', ''),
                    headers: headers,
                    data: '',
                });

                ldoc = str2doc(res.body);

                // exception: sold out
                // ldoc.querySelector('#size') == null
                var itmi = ldoc.forms[0].action.match('\/shop\/([^\/]*)\/add$' || [])[1];
                var tci = ldoc.querySelector('#size');
                var spr = ldoc.querySelector('span[itemprop="price"]').textContent;
                var ipr = toInt(spr.replace(/[^0-9\.]/g, ''));
                var itmn = ldoc.querySelector('h1[itemprop="name"]').textContent;
                var styi = ldoc.querySelector('#style').value;


                // need to code exception logic
                var sizes = [];
                var styles = [];
                var prices = [];

                prices.push({
                    name: itmn,
                    value: spr
                });
                styles.push({
                    name: itmn,
                    value: styi
                });
                if (tci.children.length != 0) {
                    tci = tci.children;
                    // choose the index and selected size
                    for (var j = 0; j < 1; j++) {
                        sizes.push({
                            id: tci[j].value,
                            name: tci[j].textContent
                        });
                    }
                } else {
                    sizes.push({
                        id: tci.value,
                        name: 'unselectable'
                    });
                }

                items.push({
                    id: itmi,
                    style: {
                        id: styi,
                        name: itmn
                    },
                    sizes: sizes,
                    prices: prices
                });
            }

            await sleep(0);
        }));
    }

    {
        for (var i = 0; i < items.length; i++) {
            p1.set('style', items[i].style.id);
            p1.set('size', items[i].sizes[0].id);

            var headers = {
                'Accept': '*/*;q=0.5, text/javascript, application/javascript, application/ecmascript, application/x-ecmascript',
                'Origin': 'https://www.supremenewyork.com',
                'X-CSRF-Token': csrf,
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Referer': items_url[i],
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'POST',
                protocol: 'https:',
                hostname: 'www.supremenewyork.com',
                port: 443,
                path: '/shop/' + items[i].id + '/add',
                headers: headers,
                data: decodeURI(p1.toString()),
            });

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                if (cookie == '') {
                    for (var j = 0; j < c.length; j++) {
                        cookie += c[j].substring(0, c[j].indexOf(';') + 1) + ' ';
                    }

                    /*
                    var h = { 'cookie': '1 item--' + tci[i].value + ',' + amt };
                    h[tci[i].value] = 1;
                    h['total'] = spr.slice(0, 1) + ipr;
     
                    cookie += 'pure_cart=' + encodeURI(JSON.stringify(h)) + '; ';
                    */
                    cookie = cookie.substring(0, cookie.length - 2);
                } else {
                    ck.init(cookie);
                    for (var j = 0; j < c.length; j++) {
                        var base = c[j].substring(0, c[j].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }
            }
        }

        await sleep(0);
    }

    {
        var headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'GET',
            protocol: 'https:',
            hostname: 'www.supremenewyork.com',
            port: 443,
            path: '/checkout',
            headers: headers,
            data: '',
        });

        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var j = 0; j < c.length; j++) {
                var base = c[j].substring(0, c[j].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
        }

        csrf = res.body.substring(res.body.indexOf(snf0) + snf0.length);
        csrf = csrf.substring(0, csrf.indexOf('"'));
    } {
        p2.set('order[billing_name]', 'ifau aka2fn癌3esu');
        p2.set('order[email]', '43a22e3@gmail.com');
        p2.set('order[tel]', '0801134412');
        p2.set('order[billing_zip]', '2243472');
        p2.set('order[billing_state]', 'faa3');
        p2.set('order[billing_city]', 'af');
        p2.set('order[billing_address]', '13224');
        p2.set('same_as_billing_address', '1');
        p2.set('credit_card[type]', 'cod');
        p2.set('credit_card[cnb]', '');
        p2.set('credit_card[month]', '01');
        p2.set('credit_card[year]', '2019');
        p2.set('credit_card[vval]', '');
        p2.set('order[terms]', '1');
        p2.set('g-recaptcha-response', token);

        var headers = {
            'Accept': '*/*;q=0.5, text/javascript, application/javascript, application/ecmascript, application/x-ecmascript',
            'Origin': 'https://www.supremenewyork.com',
            'X-CSRF-Token': csrf,
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Referer': 'https://www.supremenewyork.com/checkout',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'POST',
            protocol: 'https:',
            hostname: 'www.supremenewyork.com',
            port: 443,
            path: '/checkout.json',
            headers: headers,
            data: decodeURI(p2.toString()),
        });

        if (items.length != 0) {
            for (var i = 0; i < items.length; i++) {
                if (res.body.indexOf('status":"paid') != -1)
                    console.log('\n購入しました: ' + items[i].style.name + ' サイズ[' + items[i].sizes[0].name + ']');
                else
                    console.log('\nfail: ' + items[i].style.name + ' サイズ[' + items[i].sizes[0].name + ']');
            }
        }

        console.dir(JSON.parse(res.body));
        console.log('\n\ntime: ' + (new Date() - d));
        //console.log('dump:\n' + cookie.substring(0, 100) + '...');
        //console.log(decodeURI(cookie));
        console.log('\n\n%c#Su%cpr%ceme', 'color: red; font-size: 33px', 'color: green; font-size: 33px', 'color: blue; font-size: 33px');
        //console.log(cookie);
    }
    return; {
        var item_url = idoc.querySelectorAll('#wrap > #container > article > div > a')[70].href.replace('file://', '');
        console.log(item_url);
        headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Cookie': '',
        };
        res = await request({
            method: 'GET',
            protocol: 'https:',
            hostname: 'www.supremenewyork.com',
            port: 443,
            path: item_url,
            headers: headers,
            data: '',
        });

        ldoc = str2doc(res.body);

        // exception: sold out
        // ldoc.querySelector('#size') == null
        var amt = ldoc.forms[0].action.match('\/shop\/([^\/]*)\/add$' || [])[1];
        var tci = ldoc.querySelector('#size').children;
        var spr = ldoc.querySelector('span[itemprop="price"]').textContent;
        var ipr = toInt(spr.replace(/[^0-9\.]/g, ''));
        var itmn = ldoc.head.querySelector('title').textContent;

        // need to code exception logic
        prices.push({
            name: itmn,
            value: spr
        });
        styles.push({
            name: itmn,
            value: amt
        });
        for (var i = 0; i < tci.length; i++) {
            sizes.push({
                name: tci[i].textContent,
                value: tci[i].value
            });
        }


        for (var i = 0; i < tci.length; i++) {
            p1.set('style', amt);
            p1.set('size', tci[i].value);

            headers = {
                'Accept': '*/*;q=0.5, text/javascript, application/javascript, application/ecmascript, application/x-ecmascript',
                'Origin': 'https://www.supremenewyork.com',
                'X-CSRF-Token': csrf,
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Referer': 'https://www.supremenewyork.com/shop/accessories/odhr3izkb/pigaw4ucd',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': '',
            };
            res = await request({
                method: 'POST',
                protocol: 'https:',
                hostname: 'www.supremenewyork.com',
                port: 443,
                path: '/shop/' + amt + '/add',
                headers: headers,
                data: decodeURI(p1.toString()),
            });

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                if (cookie == '') {
                    for (var j = 0; j < c.length; j++) {
                        cookie += c[j].substring(0, c[j].indexOf(';') + 1) + ' ';
                    }

                    /*
                    var h = { 'cookie': '1 item--' + tci[i].value + ',' + amt };
                    h[tci[i].value] = 1;
                    h['total'] = spr.slice(0, 1) + ipr;
     
                    cookie += 'pure_cart=' + encodeURI(JSON.stringify(h)) + '; ';
                    */
                    cookie = cookie.substring(0, cookie.length - 2);
                } else {
                    ck.init(cookie);
                    for (var j = 0; j < c.length; j++) {
                        var base = c[j].substring(0, c[j].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }
            }
        } {
            headers = {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            res = await request({
                method: 'GET',
                protocol: 'https:',
                hostname: 'www.supremenewyork.com',
                port: 443,
                path: '/checkout',
                headers: headers,
                data: '',
            });

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var j = 0; j < c.length; j++) {
                    var base = c[j].substring(0, c[j].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            csrf = res.body.substring(res.body.indexOf(snf0) + snf0.length);
            csrf = csrf.substring(0, csrf.indexOf('"'));
        } {
            p2.set('order[billing_name]', 'ia癌3u ka2n癌esu');
            p2.set('order[email]', '33624fb57f43@gmail.com');
            p2.set('order[tel]', '0801311130');
            p2.set('order[billing_zip]', '2136472');
            p2.set('order[billing_state]', 'faF3533');
            p2.set('order[billing_city]', 'af');
            p2.set('order[billing_address]', '51224');
            p2.set('same_as_billing_address', '1');
            p2.set('credit_card[type]', 'cod');
            p2.set('credit_card[cnb]', '');
            p2.set('credit_card[month]', '01');
            p2.set('credit_card[year]', '2019');
            p2.set('credit_card[vval]', '');
            p2.set('order[terms]', '1');
            p2.set('g-recaptcha-response', token);

            headers = {
                'Accept': '*/*;q=0.5, text/javascript, application/javascript, application/ecmascript, application/x-ecmascript',
                'Origin': 'https://www.supremenewyork.com',
                'X-CSRF-Token': csrf,
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Referer': 'https://www.supremenewyork.com/checkout',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            res = await request({
                method: 'POST',
                protocol: 'https:',
                hostname: 'www.supremenewyork.com',
                port: 443,
                path: '/checkout.json',
                headers: headers,
                data: decodeURI(p2.toString()),
            });

            for (var i = 0; i < tci.length; i++) {
                if (res.body.indexOf('status":"paid') != -1)
                    console.log('\npaid: ' + itmn + ' [' + tci[i].textContent + ']');
                else
                    console.log('\nfail: ' + itmn + ' [' + tci[i].textContent + ']');
            }

            console.log('\n\n%c#Su%cpr%ceme', 'color: red; font-size: 33px', 'color: green; font-size: 33px', 'color: blue; font-size: 33px');
        }
        //console.log(cookie);
    }

    return;

    //console.log(cookie);
    {
        headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Cookie': cookie,
        };
        res = await request({
            method: 'GET',
            protocol: 'https:',
            hostname: 'www.supremenewyork.com',
            port: 443,
            path: '/checkout',
            headers: headers,
            data: '',
        });

        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }

            //console.log(cookie);
        }


        csrf = res.body.substring(res.body.indexOf(snf0) + snf0.length);
        csrf = csrf.substring(0, csrf.indexOf('"'));

        //console.log(csrf);
    } {
        p2.set('order[billing_name]', 'in3u ka2nfaekodesu');
        p2.set('order[email]', '33633f45743@gmail.com');
        p2.set('order[tel]', '0803315130');
        p2.set('order[billing_zip]', '2136172');
        p2.set('order[billing_state]', 'f返F3533');
        p2.set('order[billing_city]', 'af');
        p2.set('order[billing_address]', '31224');
        p2.set('same_as_billing_address', '1');
        p2.set('credit_card[type]', 'cod');
        p2.set('credit_card[cnb]', '');
        p2.set('credit_card[month]', '01');
        p2.set('credit_card[year]', '2019');
        p2.set('credit_card[vval]', '');
        p2.set('order[terms]', '1');
        p2.set('g-recaptcha-response', token);

        headers = {
            'Accept': '*/*;q=0.5, text/javascript, application/javascript, application/ecmascript, application/x-ecmascript',
            'Origin': 'https://www.supremenewyork.com',
            'X-CSRF-Token': csrf,
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Referer': 'https://www.supremenewyork.com/checkout',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Cookie': cookie,
        };
        res = await request({
            method: 'POST',
            protocol: 'https:',
            hostname: 'www.supremenewyork.com',
            port: 443,
            path: '/checkout.json',
            headers: headers,
            data: decodeURI(p2.toString()),
        });

        if (res.body.indexOf('status":"paid') != -1)
            console.log('\nend: ' + (new Date() - d));
    }
};

ipcRenderer.on('debug', (event, args) => {
    console.log(args);
});


function splitUrl(url) {
    var protocol, hostname, path, data;
    var cur = 0;

    protocol = url.substr(0, url.indexOf('://') + 1);
    cur = url.indexOf('://') + 3;

    hostname = url.substr(cur, url.substr(cur).indexOf('/'));
    cur = url.substr(cur).indexOf('/') + cur;

    path = url.substr(cur, url.substr(cur).lastIndexOf('/') + 1);
    cur = url.substr(cur).lastIndexOf('/') + 1 + cur;

    data = url.substr(cur + url.substr(cur).indexOf('?') + 1);
    cur = url.substr(cur).indexOf('?') + 1 + cur;

    return {
        protocol: protocol,
        hostname: hostname,
        path: path,
        data: data
    }
}

function getFormElements(form) {
    function parentChecks(elem) {
        var enabled = true;
        var prevParent = elem.parentElement;
        for (;;) {
            if (prevParent.nodeName == form.nodeName && prevParent.id == form.id) {
                if (prevParent.style.display == 'none')
                    enabled = false;
                break;
            }

            if (prevParent.style.display == 'none') {
                enabled = false;
                break;
            }
            prevParent = prevParent.parentElement;
        }

        return enabled;
    }

    var ee = form.elements;
    var fes = [];
    for (var i = 0; i < ee.length; i++) {
        elem = ee[i];
        if (elem.disabled == false && elem.getAttribute('name') != null && elem.type != 'radio') {
            var checks = 0;
            for (var j = 0; j < fes.length; j++) {
                fe = fes[j];
                if (fe.getAttribute('name') == elem.getAttribute('name')) {
                    checks++;
                }
            }

            if (checks == 0)
                fes.push(elem);
        }
    }

    return fes;
}

var addon = require('electron').remote.getGlobal('addon');

function request_texstx(args, encoding) {
    return new Promise((resolve) => {
        addon.request(args, (res) => {
            try {
                if (res.headers.hasOwnProperty('content-type')) {
                    var content_type = res.headers['content-type'].toLocaleLowerCase();
                    if (content_type.includes('charset=utf-8')) {
                        res.body = Buffer.from(res.body).toString();
                    } else if (content_type.includes('charset=')) {
                        var charset = content_type.substr(content_type.lastIndexOf('charset=') + 'charset='.length);
                        res.body = iconv.decode(Buffer.from(res.body), charset);
                    } else {
                        res.body = Buffer.from(res.body).toString();
                    }
                } else {
                    if (encoding != undefined && encoding == 'shift_jis') {
                        res.body = iconv.decode(Buffer.from(res.body), 'shift_jis');
                    } else if (encoding != undefined && encoding == 'euc-jp') {
                        res.body = iconv.decode(Buffer.from(res.body), 'euc-jp');
                    } else if (encoding == undefined) {
                        res.body = Buffer.from(res.body).toString();
                    } else {
                        res.body = Buffer.from(res.body).toString();
                    }
                }
                resolve(res);
            } catch (ex) {
                resolve({
                    body: '',
                    headers: {},
                    status: ''
                });
            }
        });
    });
}

async function getShippingAddresses(args) {
    var account = args[0];
    var account_idx = findAccountIndex(account.id);

    var ck = createCookieStore();
    var cookie = '';
    var doc = null;


    function rnd(len) {
        var letters = 'abcdef';
        var numbers = '0123456789';
        var str = letters + letters.toLocaleLowerCase() + numbers;

        var ret = '';

        for (var i = 0; i < len; i++) {
            ret += str.charAt(Math.floor(Math.random() * str.length));
        }
        return ret;
    }

    // first login
    var p1 = new URLSearchParams('service_id=top&u=a%40g.cc&p=manko123&submit=Login&pp_version=20170213&device_fp=' + rnd(32) + '&time_zone=-540&os_info=Win32');
    p1.set('u', account.email);
    p1.set('p', account.password);

    var headers = {
        'Origin': 'https://grp01.id.rakuten.co.jp',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ja;q=1, en-US;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Referer': 'https://grp01.id.rakuten.co.jp/rms/nid/vc?__event=login&service_id=top',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookie,
    };
    var res = await request({
        method: 'POST',
        url: 'https://grp01.id.rakuten.co.jp/rms/nid/logini',
        headers: headers,
        data: p1.toString(),
    }, 'euc-jp');
    ck = updateCookieStore(ck, cookie, res);
    cookie = ck.getAll();

    if (1 == 1) {
        var item_url_t = 'https://item.rakuten.co.jp/rakuten24/c001222600001/';
        var shop_id_t = null;
        var item_key_t = null;

        // access a temporary item page
        {
            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'GET',
                url: item_url_t,
                headers: headers,
                data: '',
            }, 'euc-jp');
            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            doc = str2doc(res.body);
        }

        // add temporary item
        {
            var form = doc.querySelector('form#purchaseForm');
            var action = form.action;
            //console.log(action);

            var params = new URLSearchParams('');

            // params
            var sizes = doc.querySelectorAll('span.inventory_choice_name');
            var inventories = doc.querySelectorAll('input[name="inventory_id"]');
            var units = doc.querySelector('[name="units"]').value;
            units = "1";
            var event = doc.querySelector('input[name="__event"]').value;
            var shop_bid = doc.querySelector('input[name="shop_bid"]').value;
            var item_id = doc.querySelector('input[name="item_id"]').value;
            var inventory_flag = doc.querySelector('input[name="inventory_flag"]').value;

            if (inventories.length != 0) {
                var choice = ((doc.querySelector('select[name="choice"] > option').value));
                params.append("inventory_id", inventories[0].value);
                params.append("choice", choice);
            }

            params.append("units", units);
            params.append("__event", event);
            params.append("shop_bid", shop_bid);
            params.append("item_id", item_id);
            params.append("inventory_flag", inventory_flag);


            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'POST',
                url: 'https://t.basket.step.rakuten.co.jp/rms/mall/bs/cartadd/set?l2-id=item_PC_AddCart_fix',
                headers: headers,
                data: params.toString(),
            }, 'euc-jp');

            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var redir = res.headers.location;
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            res = await request({
                method: 'GET',
                url: redir,
                headers: headers,
                data: '',
            }, 'euc-jp');

            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();


            doc = str2doc(res.body);
            //console.log(res);
        } {
            var doc_t = null;
            var form = doc.forms[0];
            var fd = new FormData(form);
            var action = form.action;
            var elements = getFormElements(form);

            var params = new URLSearchParams('check_item%5B0%5D=true&item_key%5B0%5D=8ffe7efc31a77b5d02fd471f09eefc8f&units%5B0%5D=1&shop_bid=357621&short_flag=1&quickNormalize_flag=true&quickNormalizeUnification_flag=true&ssl=on');

            params.forEach((v, k) => {
                params.set(k, fd.get(k));
                if (k == 'shop_bid')
                    shop_id_t = params.get(k);
                else if (k.indexOf('item_key') != -1)
                    item_key_t = params.get(k);
            });

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Origin': 'https://basket.step.rakuten.co.jp',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'POST',
                url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cart/set/?l2-id=step0_pc_purchase_top_1',
                headers: headers,
                data: params.toString(),
            }, 'euc-jp');

            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var redir = res.headers.location;
            //console.log(redir);

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            res = await request({
                method: 'GET',
                url: redir,
                headers: headers,
                data: '',
            }, 'euc-jp');

            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var redir = res.headers.location;
            if (redir === undefined) {
                // second login
                doc = str2doc(res.body);
                var form = doc.forms[0];
                var fd = new FormData(form);

                p1 = new URLSearchParams('pp_version=20170213&tokenSeed=f2551f9db5fcef8621f5d259a2bcf387&u=a%40g.cc&p=manko123&__event=ID01_001_001&login_submit=replaceme1&service_id=s227&return_url=%2Fmorderfromquick%2Fset&sbId=1');
                p1.set('u', account.email);
                p1.set('p', account.password);
                p1.set('pp_version', fd.get('pp_version'));
                p1.set('tokenSeed', fd.get('tokenSeed'));

                var headers = {
                    'Origin': 'https://grp01.id.rakuten.co.jp',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Referer': 'https://grp01.id.rakuten.co.jp/rms/nid/vc?__event=login&service_id=top',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://grp01.id.rakuten.co.jp/rms/nid/vc?l2-id=step1_pc_next_top',
                    headers: headers,
                    data: p1.toString().replace('replaceme1', '%A1%A1%A1%A1%BC%A1%A4%D8%A1%A1%A1%A1'),
                }, 'euc-jp');
                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;
                //console.log(redir);
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;
                //console.log(redir);
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                doc_t = str2doc(res.body);
            } else {
                doc_t = str2doc(res.body);
            }

            if (doc_t !== null) {
                window.rara = doc_t;
                var addrs_e = doc_t.querySelectorAll('div.sender-address[data-last-name]');
                var addrs = {};

                addrs_e.forEach((elem, idx) => {
                    addrs[idx + 1] = {
                        data: elem.querySelector('.sender-info-address').textContent
                    };
                });

                addrs['size'] = addrs_e.length;
                lazyb.accounts[account_idx].temporary.addresses = addrs;
            }
        }

        // delete temporary item
        {
            p1 = new URLSearchParams('command=delete&shop_id=357621&current_shop_id=357621&item_key=f9cc2a1d95a681875373c87c7d743978&later_item_keys=');

            p1.set('shop_id', shop_id_t);
            p1.set('current_shop_id', shop_id_t);
            p1.set('item_key', item_key_t);
            //p1.set('tokenSeed', fd.get('tokenSeed'));

            var headers = {
                'Origin': 'https://basket.step.rakuten.co.jp',
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Referer': 'https://basket.step.rakuten.co.jp/',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'POST',
                url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cartchangeajax/',
                headers: headers,
                data: p1.toString()
            }, 'euc-jp');
            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();
        }
    }
}

async function rakutenLogin(args) {
    var task = args[0],
        account = args[1],
        proxy = args[2],
        billing = args[3];
    var task_idx = findTaskIndex(task.id),
        account_idx = findAccountIndex(account.id);

    var pdata = '';
    if (proxy != null) {
        if (proxy.user == null)
            pdata = proxy.host + ':' + proxy.port;
        else
            pdata = proxy.host + ':' + proxy.port + ':' + proxy.user + ':' + proxy.password;
    }
    console.log(pdata);

    var cookie = '';
    var doc = null;

    var ck = createCookieStore();
    ck.init(cookie);

    function rnd(len) {
        var letters = 'abcdef';
        var numbers = '0123456789';
        var str = letters + letters.toLocaleLowerCase() + numbers;

        var ret = '';

        for (var i = 0; i < len; i++) {
            ret += str.charAt(Math.floor(Math.random() * str.length));
        }
        return ret;
    }

    // Login
    // get cookie
    {
        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'GET',
            url: 'https://grp01.id.rakuten.co.jp/rms/nid/vc?__event=login&service_id=top',
            headers: headers,
            data: '',
        }, 'euc-jp');
        ck = updateCookieStore(ck, cookie, res);
        cookie = ck.getAll();

    }

    // first login
    var p1 = new URLSearchParams('service_id=top&u=a%40g.cc&p=manko123&submit=Login&pp_version=20170213&device_fp=' + rnd(32) + '&time_zone=-540&os_info=Win32');
    p1.set('u', account.email);
    p1.set('p', account.password);

    var headers = {
        'Origin': 'https://grp01.id.rakuten.co.jp',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ja;q=1, en-US;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Referer': 'https://grp01.id.rakuten.co.jp/rms/nid/vc?__event=login&service_id=top',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookie,
    };
    var res = '';
    if (pdata != '') {
        res = await request({
            method: 'POST',
            url: 'https://grp01.id.rakuten.co.jp/rms/nid/logini',
            headers: headers,
            data: p1.toString(),
            proxy: pdata,
        }, 'euc-jp');

    } else {
        res = await request({
            method: 'POST',
            url: 'https://grp01.id.rakuten.co.jp/rms/nid/logini',
            headers: headers,
            data: p1.toString(),
        }, 'euc-jp');
    }
    console.log(ck, cookie, res);
    ck = updateCookieStore(ck, cookie, res);
    cookie = ck.getAll();

    //console.log(cookie);


    var shop_id_t = null;
    var item_key_t = null;
    var race = false;

    // access a temporary item page
    {
        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Cookie': cookie,
        };
        var res;
        if (pdata != '') {
            res = await request({
                method: 'GET',
                url: 'https://item.rakuten.co.jp/rakuten24/c001222600001/',
                headers: headers,
                data: '',
                proxy: pdata
            }, 'euc-jp');
        } else {
            res = await request({
                method: 'GET',
                url: 'https://item.rakuten.co.jp/rakuten24/c001222600001/',
                headers: headers,
                data: '',
            }, 'euc-jp');
        }
        console.log(ck, cookie, res);
        ck = updateCookieStore(ck, cookie, res);
        cookie = ck.getAll();

        doc = str2doc(res.body);
    }

    // add temporary item
    {
        window.dodo = doc;
        var form = doc.querySelector('form#purchaseForm');
        var action = form.action;
        //console.log(action);

        var params = new URLSearchParams('');

        // params
        var sizes = doc.querySelectorAll('span.inventory_choice_name');
        var inventories = doc.querySelectorAll('input[name="inventory_id"]');
        var units = doc.querySelector('[name="units"]').value;
        units = "1";
        var event = doc.querySelector('input[name="__event"]').value;
        var shop_bid = doc.querySelector('input[name="shop_bid"]').value;
        var item_id = doc.querySelector('input[name="item_id"]').value;
        var inventory_flag = doc.querySelector('input[name="inventory_flag"]').value;

        if (inventories.length != 0) {
            var choice = ((doc.querySelector('select[name="choice"] > option').value));
            params.append("inventory_id", inventories[0].value);
            params.append("choice", choice);
        }

        params.append("units", units);
        params.append("__event", event);
        params.append("shop_bid", shop_bid);
        params.append("item_id", item_id);
        params.append("inventory_flag", inventory_flag);


        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        };
        var res;
        if (pdata != '') {
            res = await request({
                method: 'POST',
                url: 'https://t.basket.step.rakuten.co.jp/rms/mall/bs/cartadd/set?l2-id=item_PC_AddCart_fix',
                headers: headers,
                data: params.toString(),
                proxy: pdata
            }, 'euc-jp');
        } else {
            res = await request({
                method: 'POST',
                url: 'https://t.basket.step.rakuten.co.jp/rms/mall/bs/cartadd/set?l2-id=item_PC_AddCart_fix',
                headers: headers,
                data: params.toString(),
            }, 'euc-jp');
        }

        ck = updateCookieStore(ck, cookie, res);
        cookie = ck.getAll();

        var redir = res.headers.location;
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Cookie': cookie,
        };
        var res;
        if (pdata != '') {
            res = await request({
                method: 'GET',
                url: redir,
                headers: headers,
                data: '',
                proxy: pdata,
            }, 'euc-jp');
        } else {
            res = await request({
                method: 'GET',
                url: redir,
                headers: headers,
                data: '',
            }, 'euc-jp');
        }

        console.log(ck, cookie, res);

        ck = updateCookieStore(ck, cookie, res);
        cookie = ck.getAll();


        doc = str2doc(res.body);
        //console.log(res);
    } {
        var form = doc.forms[0];
        var fd = new FormData(form);
        var action = form.action;
        var elements = getFormElements(form);

        var params = new URLSearchParams('check_item%5B0%5D=true&item_key%5B0%5D=8ffe7efc31a77b5d02fd471f09eefc8f&units%5B0%5D=1&shop_bid=357621&short_flag=1&quickNormalize_flag=true&quickNormalizeUnification_flag=true&ssl=on');

        params.forEach((v, k) => {
            params.set(k, fd.get(k));
            if (k == 'shop_bid')
                shop_id_t = params.get(k);
            else if (k.indexOf('item_key') != -1)
                item_key_t = params.get(k);
        });

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Origin': 'https://basket.step.rakuten.co.jp',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        };
        var res;
        if (pdata != '') {
            res = await request({
                method: 'POST',
                url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cart/set/?l2-id=step0_pc_purchase_top_1',
                headers: headers,
                data: params.toString(),
                proxy: pdata
            }, 'euc-jp');
        } else {
            res = await request({
                method: 'POST',
                url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cart/set/?l2-id=step0_pc_purchase_top_1',
                headers: headers,
                data: params.toString(),
            }, 'euc-jp');
        }

        ck = updateCookieStore(ck, cookie, res);
        cookie = ck.getAll();

        var redir = res.headers.location;
        if (redir === undefined)
            race = true;
        else {
            //console.log(redir);

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res;
            if (pdata != '') {
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                    proxy: pdata
                }, 'euc-jp');
            } else {
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');
            }

            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var redir = res.headers.location;
            if (redir === undefined) {
                // second login
                doc = str2doc(res.body);
                var form = doc.forms[0];
                var fd = new FormData(form);

                p1 = new URLSearchParams('pp_version=20170213&tokenSeed=f2551f9db5fcef8621f5d259a2bcf387&u=a%40g.cc&p=manko123&__event=ID01_001_001&login_submit=replaceme1&service_id=s227&return_url=%2Fmorderfromquick%2Fset&sbId=1');
                p1.set('u', account.email);
                p1.set('p', account.password);
                p1.set('pp_version', fd.get('pp_version'));
                p1.set('tokenSeed', fd.get('tokenSeed'));

                var headers = {
                    'Origin': 'https://grp01.id.rakuten.co.jp',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Referer': 'https://grp01.id.rakuten.co.jp/rms/nid/vc?__event=login&service_id=top',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res;
                if (pdata != '') {
                    res = await request({
                        method: 'POST',
                        url: 'https://grp01.id.rakuten.co.jp/rms/nid/vc?l2-id=step1_pc_next_top',
                        headers: headers,
                        data: p1.toString().replace('replaceme1', '%A1%A1%A1%A1%BC%A1%A4%D8%A1%A1%A1%A1'),
                        proxy: pdata
                    }, 'euc-jp');
                } else {
                    res = await request({
                        method: 'POST',
                        url: 'https://grp01.id.rakuten.co.jp/rms/nid/vc?l2-id=step1_pc_next_top',
                        headers: headers,
                        data: p1.toString().replace('replaceme1', '%A1%A1%A1%A1%BC%A1%A4%D8%A1%A1%A1%A1'),
                    }, 'euc-jp');
                }
                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;
                //console.log(redir);
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res;
                if (pdata != '') {
                    res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                        proxy: pdata,
                    }, 'euc-jp');
                } else {
                    res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');
                }

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                //console.log(p1.toString().replace('replaceme1', '%A1%A1%A1%A1%BC%A1%A4%D8%A1%A1%A1%A1'));
            }
        }
    }

    // delete temporary item
    if (!race) {
        p1 = new URLSearchParams('command=delete&shop_id=357621&current_shop_id=357621&item_key=f9cc2a1d95a681875373c87c7d743978&later_item_keys=');

        p1.set('shop_id', shop_id_t);
        p1.set('current_shop_id', shop_id_t);
        p1.set('item_key', item_key_t);
        //p1.set('tokenSeed', fd.get('tokenSeed'));

        var headers = {
            'Origin': 'https://basket.step.rakuten.co.jp',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Referer': 'https://basket.step.rakuten.co.jp/',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        };
        var res;
        if (pdata != '') {
            res = await request({
                method: 'POST',
                url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cartchangeajax/',
                headers: headers,
                data: p1.toString(),
                proxy: pdata
            }, 'euc-jp');
        } else {
            res = await request({
                method: 'POST',
                url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cartchangeajax/',
                headers: headers,
                data: p1.toString()
            }, 'euc-jp');
        }
        ck = updateCookieStore(ck, cookie, res);
        cookie = ck.getAll();
    }

    lazyb.accounts[account_idx]['temporary'].cookie = cookie;
}

async function rakutenCartIn(args) {
    var task = args[0],
        account = args[1],
        proxy = args[2],
        billing = args[3];
    var task_idx = findTaskIndex(task.id),
        account_idx = findAccountIndex(account.id);
    var cookie = lazyb.accounts[account_idx]['temporary']['cookie'];
    var doc = null;

    var pdata = '';
    if (proxy != null) {
        if (proxy.user == null)
            pdata = proxy.host + ':' + proxy.port;
        else
            pdata = proxy.host + ':' + proxy.port + ':' + proxy.user + ':' + proxy.password;
    }

    var ck = createCookieStore();
    ck.init(cookie);

    function rnd(len) {
        var letters = 'abcdef';
        var numbers = '0123456789';
        var str = letters + letters.toLocaleLowerCase() + numbers;

        var ret = '';

        for (var i = 0; i < len; i++) {
            ret += str.charAt(Math.floor(Math.random() * str.length));
        }
        return ret;
    }

    try {
        var item_url = task.urls;

        var doc_t = null;
        var sold_out = false;

        // restock
        if (task.options.restock) {
            while (true) {
                if (!lazyb.tasks[task_idx].running) {
                    // raise exception
                    var exaf = {};
                    exaf.haha.cancelled[0];
                }
                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': '',
                };
                var res;
                if (pdata != '') {
                    res = await request({
                        method: 'GET',
                        url: item_url,
                        headers: headers,
                        data: '',
                        proxy: pdata
                    }, 'euc-jp');
                } else {
                    res = await request({
                        method: 'GET',
                        url: item_url,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');
                }

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                doc_t = str2doc(res.body);

                // wait in a queue
                while (true) {
                    var wait = false;
                    lazyb.queues.types['1'].forEach((v, idx) => {
                        if (lazyb.queues.types['1'][idx].retailer_id == 203) {
                            wait = true;
                        }
                    });
                    if (!wait)
                        break;
                    await sleep(1);
                }
                while (true) {
                    var wait = false;
                    lazyb.queues.types['2'].forEach((v, idx) => {
                        if (lazyb.queues.types['2'][idx].retailer_id == 203) {
                            wait = true;
                        }
                    });
                    if (!wait)
                        break;
                    await sleep(1);
                }

                /*
                var matched = false;
                var elements = doc_t.querySelector('form[id=purchaseForm]').elements;
                for (var i = 0; i < elements.length; i++) {
                    elements[i].classList.forEach((n, idx) => {
                        if (n.includes('add-cart') || n.includes('checkout')) {
                            matched = true;
                        }
                    });
                }
                if (matched)
                    sold_out = false;
                else
                    sold_out = true;
                    */

                var spans = $(doc_t).find('span');
                spans.each((i, elem) => {
                    if ($(elem).text().indexOf('売り切れ') > -1) {
                        sold_out = true;
                        return true;
                    }
                });

                if (sold_out) {
                    // console.log('売り切れ', item_url);
                } else {
                    var queue_id = lazyb.queues.types['2'].length;
                    lazyb.queues.types['1'].push({
                        task_id: task.id,
                        retailer_id: 203,
                    });
                    lazyb.queues.types['2'].push({
                        task_id: task.id,
                        retailer_id: 203,
                    });

                    Log(now() + ' task[' + task.id + '] -> 在庫あり: ' + item_url);
                    lazyb.tasks.forEach((o, idx) => {
                        if (o.options.restock && o.urls == task.urls) {
                            lazyb.tasks[idx].temporary = {
                                doc: doc_t
                            };
                        }
                    });
                    break;
                }
                /*

                同じURLのタスクを探し出し、全部に共有
                */
                await sleep(100);
            }
        } else {
            // 時間指定
            if (lazyb.tasks[task_idx].temporary.doc == null) {
                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': '',
                };
                var res;
                if (pdata != '') {
                    res = await request({
                        method: 'GET',
                        url: item_url,
                        headers: headers,
                        data: '',
                        proxy: pdata
                    }, 'euc-jp');
                } else {
                    res = await request({
                        method: 'GET',
                        url: item_url,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');
                }

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                doc_t = str2doc(res.body);

                while (true) {
                    var wait = false;
                    lazyb.queues.types['1'].forEach((v, idx) => {
                        if (lazyb.queues.types['1'][idx].retailer_id == 203) {
                            wait = true;
                        }
                    });
                    if (!wait)
                        break;
                    await sleep(1);
                }
                while (true) {
                    var wait = false;
                    lazyb.queues.types['2'].forEach((v, idx) => {
                        if (lazyb.queues.types['2'][idx].retailer_id == 203) {
                            wait = true;
                        }
                    });
                    if (!wait)
                        break;
                    await sleep(1);
                }

                /*
                                    var matched = false;
                                    var elements = doc_t.querySelector('form[id=purchaseForm]').elements;
                                    for (var i = 0; i < elements.length; i++) {
                                        elements[i].classList.forEach((n, idx) => {
                                            if (n.includes('add-cart') || n.includes('checkout')) {
                                                matched = true;
                                            }
                                        });
                                    }
                                    if (matched)
                                        sold_out = false;
                                    else
                                        sold_out = true;
                */

                var spans = $(doc_t).find('span');
                spans.each((i, elem) => {
                    if ($(elem).text().indexOf('売り切れ') > -1) {
                        sold_out = true;
                        return true;
                    }
                });

                if (sold_out) {
                    Log(now() + ' task[' + task.id + '] -> 売り切れ: ' + item_url);
                    // raise exception
                    var exaf = {};
                    exaf.haha.cancelled[0];
                } else {
                    Log(now() + ' task[' + task.id + '] -> 在庫あり: ' + item_url);

                    lazyb.queues.types['1'].push({
                        task_id: task.id,
                        retailer_id: 203,
                    });
                    lazyb.queues.types['2'].push({
                        task_id: task.id,
                        retailer_id: 203,
                    });
                    lazyb.tasks.forEach((o, idx) => {
                        if (o.urls == task.urls) {
                            lazyb.tasks[idx].temporary = {
                                doc: doc_t
                            };
                        }
                    });
                }
            } else {
                doc_t = lazyb.tasks[task_idx].temporary.doc;
                console.log('task[%s] received doc!', task.id);
            }
        }

        {
            window.dodo = doc_t;
            var form = doc_t.querySelector('form#purchaseForm');
            var action = form.action;
            //console.log(action);

            var params = new URLSearchParams('');

            // params
            var sizes = doc_t.querySelectorAll('span.inventory_choice_name');
            var inventories = doc_t.querySelectorAll('input[name="inventory_id"]');
            var units = doc_t.querySelector('[name="units"]').value;
            units = "1";
            var event = doc_t.querySelector('input[name="__event"]').value;
            var shop_bid = doc_t.querySelector('input[name="shop_bid"]').value;
            var item_id = doc_t.querySelector('input[name="item_id"]').value;
            var inventory_flag = doc_t.querySelector('input[name="inventory_flag"]').value;

            if (inventories.length != 0) {
                var choice = ((doc_t.querySelector('select[name="choice"] > option').value));
                params.set("inventory_id", inventories[0].value);
                params.set("choice", choice);
            }

            params.set("units", units);
            params.set("__event", event);
            params.set("shop_bid", shop_bid);
            params.set("item_id", item_id);
            params.set("inventory_flag", inventory_flag);


            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res;
            if (pdata != '') {
                res = await request({
                    method: 'POST',
                    url: 'https://t.basket.step.rakuten.co.jp/rms/mall/bs/cartadd/set?l2-id=item_PC_AddCart_fix',
                    headers: headers,
                    data: params.toString(),
                    proxy: pdata
                }, 'euc-jp');
            } else {
                res = await request({
                    method: 'POST',
                    url: 'https://t.basket.step.rakuten.co.jp/rms/mall/bs/cartadd/set?l2-id=item_PC_AddCart_fix',
                    headers: headers,
                    data: params.toString(),
                }, 'euc-jp');
            }

            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();
        }
        Log(now() + ' task[' + task.id + '] -> カートに追加: ' + item_url);
    } catch (ex) {
        Log(now() + ' task[' + task.id + '] unexpected -> ' + ex.message);
        Log(now() + ' task[' + task.id + '] stacktrace -> ' + ex.stack);
    }

    //window['temporary_']['cookie'] = cookie;

    return doc;
}

async function rakutenCheckOut(args) {
    var task = args[0],
        account = args[1],
        proxy = args[2],
        billing = args[3];
    var task_idx = findTaskIndex(task.id),
        account_idx = findAccountIndex(account.id);
    var cookie = lazyb.accounts[account_idx]['temporary']['cookie'];
    var doc = null;

    var pdata = '';
    if (proxy != null) {
        if (proxy.user == null)
            pdata = proxy.host + ':' + proxy.port;
        else
            pdata = proxy.host + ':' + proxy.port + ':' + proxy.user + ':' + proxy.password;
    }

    var ck = createCookieStore();
    ck.init(cookie);

    function rnd(len) {
        var letters = 'abcdef';
        var numbers = '0123456789';
        var str = letters + letters.toLocaleLowerCase() + numbers;

        var ret = '';

        for (var i = 0; i < len; i++) {
            ret += str.charAt(Math.floor(Math.random() * str.length));
        }
        return ret;
    }

    async function setShippingAddress(doc, cookie, task) {
        // get list
        //document.querySelectorAll('div.sender-address')

        stime = new Date().getTime();
        var skipLogin = false;

        {

            var form = doc.forms[0];
            var fd = new FormData(form);
            var action = form.action;
            var elements = getFormElements(form);

            var params = new URLSearchParams('process_type=&address_list_id=2&sendto=&address_list_id=');
            window.hhh = doc;
            fd.forEach((v, k) => {
                if (params.get(k) == null)
                    params.append(k, v);
            });

            params.set('address_list_id', task.js_billing_id);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Origin': 'https://basket.step.rakuten.co.jp',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res;
            if (pdata != '') {
                res = await request({
                    method: 'POST',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/set',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                    proxy: pdata
                }, 'euc-jp');
            } else {
                res = await request({
                    method: 'POST',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/set',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                }, 'euc-jp');
            }

            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var redir = res.headers.location;

            window.hahaha = str2doc(res.body);
            console.log(redir);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res;
            if (pdata != '') {
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                    proxy: pdata
                }, 'euc-jp');
            } else {
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');
            }


            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();



            var redir = res.headers.location;
            if (redir !== undefined) {

                console.log(redir);

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res;
                if (pdata != '') {
                    res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                        proxy: pdata
                    }, 'euc-jp');
                } else {
                    res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');
                }


                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();
            } else {
                skipLogin = true;

                doc = str2doc(res.body);
            }
        }

        if (!skipLogin) {

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res;
            if (pdata != '') {
                res = await request({
                    method: 'GET',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/?l2-id=step0_pc_purchase_top_1',
                    headers: headers,
                    data: '',
                    proxy: pdata
                }, 'euc-jp');
            } else {
                res = await request({
                    method: 'GET',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/?l2-id=step0_pc_purchase_top_1',
                    headers: headers,
                    data: '',
                }, 'euc-jp');
            }


            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var redir = res.headers.location;

            console.log(redir);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res;
            if (pdata != '') {
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                    proxy: pdata
                }, 'euc-jp');
            } else {
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');
            }


            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();
        }
        // #2 swtich(change) to a new address. send_to is a new address number.

        // Login for Confirm and update the address. will be redirected to the setting page again.
        if (!skipLogin) {
            var form = doc.forms[0];
            var fd = new FormData(form);
            var action = form.action;
            var elements = getFormElements(form);

            var params = new URLSearchParams('__event=ID01_001_001&service_id=s227&return_url=%2Fmrelogin%2Fset&update=&tokenSeed=8a95d8b3f86a287a53c56d72465ebe0e&u=a%40g.cc&p=manko123&submit=%BC%A1%A4%D8');

            params.forEach((v, k) => {
                if (k == 'dlvPaySubmit') {

                } else if (k.indexOf('select_card_installment_ma') != -1) {

                } else if (k.indexOf('fastest_my_delivery_date_ma') != -1) {

                } else if (k.indexOf('select_delivery_map') != -1) {
                    params.set(k, '102');
                } else if (k.indexOf('select_payment_map') != -1) {
                    params.set(k, '20000');
                } else if (k.indexOf('dlv_day_type_map') != -1) {
                    params.set(k, 'day');
                } else if (k.indexOf('deliveryTimeListMap') != -1) {
                    params.set(k, '1');
                } else {
                    if (fd.get(k) != null)
                        params.set(k, fd.get(k));
                    else
                        params.set(k, "undefined");
                }
            });

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Origin': 'https://basket.step.rakuten.co.jp',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res;
            if (pdata != '') {
                res = await request({
                    method: 'POST',
                    url: 'https://grp01.id.rakuten.co.jp/rms/nid/vc',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                    proxy: pdata
                }, 'euc-jp');
            } else {
                res = await request({
                    method: 'POST',
                    url: 'https://grp01.id.rakuten.co.jp/rms/nid/vc',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                }, 'euc-jp');
            }

            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var redir = res.headers.location;

            console.log(redir);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res;
            if (pdata != '') {
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                    proxy: pdata
                }, 'euc-jp');
            } else {
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');
            }


            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var redir = res.headers.location;

            console.log(redir);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res;
            if (pdata != '') {
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                    proxy: pdata
                }, 'euc-jp');
            } else {
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');
            }


            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            //console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));
            //console.log(res);
            doc = str2doc(res.body);
        }

        Log(now() + ' task[' + task.id + ']-> 配送先を変更しました。');

        return doc;
    }

    try {

        // cart page
        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Cookie': cookie,
        };
        var res;
        if (pdata != '') {
            res = await request({
                method: 'GET',
                url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cartall/',
                headers: headers,
                data: '',
                proxy: pdata
            }, 'euc-jp');
        } else {
            res = await request({
                method: 'GET',
                url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cartall/',
                headers: headers,
                data: '',
            }, 'euc-jp');
        }
        ck = updateCookieStore(ck, cookie, res);
        cookie = ck.getAll();

        doc = str2doc(res.body);


        var form = doc.forms[0];
        var fd = new FormData(form);
        var action = form.action;
        var elements = getFormElements(form);

        var params = new URLSearchParams('check_item%5B0%5D=true&item_key%5B0%5D=8ffe7efc31a77b5d02fd471f09eefc8f&units%5B0%5D=1&shop_bid=357621&short_flag=1&quickNormalize_flag=true&quickNormalizeUnification_flag=true&ssl=on');

        fd.forEach((v, k) => {
            params.set(k, v);
        });

        //console.log(params.toString());

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Origin': 'https://basket.step.rakuten.co.jp',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        };
        var res;
        if (pdata != '') {
            res = await request({
                method: 'POST',
                url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cart/set/?l2-id=step0_pc_purchase_top_1',
                headers: headers,
                data: params.toString(),
                proxy: pdata
            }, 'euc-jp');
        } else {
            res = await request({
                method: 'POST',
                url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cart/set/?l2-id=step0_pc_purchase_top_1',
                headers: headers,
                data: params.toString(),
            }, 'euc-jp');
        }

        ck = updateCookieStore(ck, cookie, res);
        cookie = ck.getAll();

        {
            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res;
            if (pdata != '') {
                res = await request({
                    method: 'GET',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/morderfromquick/set?l2-id=step0_pc_purchase_top_1',
                    headers: headers,
                    data: '',
                    proxy: pdata
                }, 'euc-jp');
            } else {
                res = await request({
                    method: 'GET',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/morderfromquick/set?l2-id=step0_pc_purchase_top_1',
                    headers: headers,
                    data: '',
                }, 'euc-jp');
            }
            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res;
            if (pdata != '') {
                res = await request({
                    method: 'GET',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/?l2-id=step0_pc_purchase_top_1',
                    headers: headers,
                    data: '',
                    proxy: pdata
                }, 'euc-jp');
            } else {
                res = await request({
                    method: 'GET',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/?l2-id=step0_pc_purchase_top_1',
                    headers: headers,
                    data: '',
                }, 'euc-jp');
            }
            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            doc = str2doc(res.body);

            // set shipping address
            if (task.js_billing_id != 0)
                doc = (await setShippingAddress(doc, cookie, task));

            window.dd3 = doc;
            window.redirects = 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/?l2-id=step0_pc_purchase_top_1';
        }

        // not registered cc yet.
        var redir = window.redirects; // task['temporary']['redirects']
        //console.log('redirects: ' + redir);
        window.redirects = null;
        if (redir.indexOf('mconfirmorderquicknormalize/?l2-id=step0_pc_purchase_top_1') != -1) {

        } else if (redir.indexOf('mconfirmorderquicknormalize/?l2-id=step1_pc_next_top') == -1) {
            {
                //ありえんほぼ

                var json = null;
                var p1 = '{"fullCardDetails":{"cardNumber":"4737030024566712","expirationYear":"2020","expirationMonth":"04"},"serviceId":"jp-pc-basket","timestamp":"2019-03-10 16:13:15.294"}';

                var headers = {
                    'Origin': 'https://payvault.global.rakuten.com',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'application/json',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Referer': 'https://payvault.global.rakuten.com/static/payvault/V2/gateway.html',
                    'Content-Type': 'application/json',
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://payvault.global.rakuten.com/api/pv/Card/V2/Add',
                    headers: headers,
                    data: p1,
                }, 'utf8');

                json = JSON.parse(res.body);
                console.log(json);



                var form = doc.forms[0];
                var fd = new FormData(form);
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('tokenSeed=165cf15ca545a864660221aa38c6826a&add_card_shop=357621&success_regist_card=false&select_card_method_map%28357621%29=1_0&select_payment_map%28357621%29=10000&card_isform=true&card_brand=1&card_owner=626&select_card_installment_map%28357621%29=1&selectedShopId=357621&select_delivery_map%28357621%29=102&appdlvMap%28357621%29=true&dlv_day_type_map%28357621%29=none&freetextMap%28357621%29=&cardToken=19031007001TWiDCcwT3gk1j9O266712&keyVersion=1&expirationYear=2020&timestamp=2019-03-10+07%3A13%3A15.446&expirationMonth=04&signature=7595accc1582ca6f2d975d7f6a9dc13c3cd5b538a5d13b3151d5209837dd81d2&iin=473703&brandCode=Visa&last4digits=6712');

                var carr = Object.getOwnPropertyNames(json);
                carr.forEach((k) => {

                    if (k == 'maskedCardDetails') {
                        Object.getOwnPropertyNames(json[k]).forEach((k2) => {
                            params.set(k2, json[k][k2]);
                            console.log(k2, json[k][k2]);
                        });
                    } else
                        params.set(k, json[k]);
                });

                params.forEach((v, k) => {
                    if (k == 'dlvPaySubmit') {

                    } else if (k.indexOf('select_card_installment_ma') != -1) {

                    } else if (k.indexOf('fastest_my_delivery_date_ma') != -1) {

                    } else if (k.indexOf('select_delivery_map') != -1) {
                        params.set(k, '102');
                    } else if (k.indexOf('select_payment_map') != -1) {
                        params.set(k, '20000');
                    } else if (k.indexOf('dlv_day_type_map') != -1) {
                        params.set(k, 'day');
                    } else if (k.indexOf('deliveryTimeListMap') != -1) {
                        params.set(k, '1');
                    } else {
                        if (fd.get(k) != null)
                            params.set(k, fd.get(k));
                        else
                            params.set(k, "");
                    }
                });

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mdlvpay/set',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));
                console.log(res);
                doc = str2doc(res.body);

                window.dodo = doc;
            } {
                var form = doc.forms[0];
                var fd = new FormData(form);
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('tokenSeed=a74394034ec7e1778afcae7e1a2b2523&add_card_shop=&success_regist_card=false&dlvPaySubmit=%BC%A1%A4%D8&select_card_method_map%28357621%29=1_0&select_payment_map%28357621%29=10000&select_card_installment_map%28357621%29=1&selectedShopId=357621&select_delivery_map%28357621%29=102&appdlvMap%28357621%29=true&dlv_day_type_map%28357621%29=none&freetextMap%28357621%29=');

                params.forEach((v, k) => {
                    if (k == 'dlvPaySubmit') {

                    } else if (k.indexOf('select_card_installment_ma') != -1) {

                    } else if (k.indexOf('fastest_my_delivery_date_ma') != -1) {

                    } else if (k.indexOf('select_delivery_map') != -1) {
                        params.set(k, '102');
                    } else if (k.indexOf('select_payment_map') != -1) {
                        params.set(k, '20000');
                    } else if (k.indexOf('dlv_day_type_map') != -1) {
                        params.set(k, 'day');
                    } else if (k.indexOf('deliveryTimeListMap') != -1) {
                        params.set(k, '1');
                    } else {
                        if (fd.get(k) != null)
                            params.set(k, fd.get(k));
                        else
                            params.set(k, "");
                    }
                });

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res;
                if (pdata != '') {
                    res = await request({
                        method: 'POST',
                        url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mdlvpay/set?l2-id=step3_pc_next',
                        headers: headers,
                        data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                        proxy: pdata
                    }, 'euc-jp');
                } else {
                    res = await request({
                        method: 'POST',
                        url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mdlvpay/set?l2-id=step3_pc_next',
                        headers: headers,
                        data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                    }, 'euc-jp');
                }

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));
                console.log(res);
                doc = str2doc(res.body);

                var redir = res.headers.location;
                console.log(redir);
                if (redir !== undefined) {
                    var uparam = splitUrl(redir);

                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    var res;
                    if (pdata != '') {
                        res = await request({
                            method: 'GET',
                            url: redir,
                            headers: headers,
                            data: '',
                            proxy: pdata
                        }, 'euc-jp');
                    } else {
                        res = await request({
                            method: 'GET',
                            url: redir,
                            headers: headers,
                            data: '',
                        }, 'euc-jp');
                    }

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    console.log(res);
                    doc = str2doc(res.body);
                }
            }
        }


        {
            //doc = await addShippingAddress(doc, cookie);
        }
        // appendは同じキーが存在しても追記する、setは値を書き換える
        {
            // stop spamming
            if (1 == 2) {
                console.log('DONE(not purchased): ' + ((new Date().getTime() - st) + 200));
                return;
            }

            var form = doc.forms[0];
            var fd = new FormData(form);
            var action = form.action;
            var elements = getFormElements(form);

            var params = new URLSearchParams('commit=replaceme_');

            fd.forEach((v, k) => {
                if (k != 'commit')
                    params.set(k, v);
            });

            if (!task.options['subscribe'])
                params.delete('rmail_check');
            if (!task.options['review'])
                params.delete('shop_rating_check');
            if (!task.options['addfavorite'])
                params.delete('bookmarkShopIdList');

            //console.log(decodeURIComponent(params.toString().replace('replaceme_', '%C3%ED%CA%B8%A4%F2%B3%CE%C4%EA%A4%B9%A4%EB')));

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Origin': 'https://basket.step.rakuten.co.jp',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res;
            if (pdata != '') {
                res = await request({
                    method: 'POST',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/set?l2-id=step4_pc_purchase',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%C3%ED%CA%B8%A4%F2%B3%CE%C4%EA%A4%B9%A4%EB'),
                    proxy: pdata
                }, 'euc-jp');
            } else {
                res = await request({
                    method: 'POST',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/set?l2-id=step4_pc_purchase',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%C3%ED%CA%B8%A4%F2%B3%CE%C4%EA%A4%B9%A4%EB'),
                }, 'euc-jp');
            }

            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            //console.log(res);
            doc = str2doc(res.body);

            //window.doo = doc;

            if (res.headers.location.indexOf('/rms/mall/bs/commit/?l2-id=step4_pc_purchase') != -1) {
                Log(now() + ' task[' + task.id + '] -> 購入しました。');
            }
        }

        lazyb.accounts[account_idx]['temporary']['cookie'] = cookie;
    } catch (ex) {
        Log(now() + ' task[' + task.id + '] unexpected -> ' + ex.message);
        Log(now() + ' task[' + task.id + '] stacktrace -> ' + ex.stack);
    }
}
async function rakuten4popi(args) {
    /*
    var task = args[0];
    var account = args[1];
    var proxy = args[2];
    */
    var cookie = lazyb.accounts[0].temporary.cookie;
    var doc = null;

    var ck = createCookieStore();

    function rnd(len) {
        var letters = 'abcdef';
        var numbers = '0123456789';
        var str = letters + letters.toLocaleLowerCase() + numbers;

        var ret = '';

        for (var i = 0; i < len; i++) {
            ret += str.charAt(Math.floor(Math.random() * str.length));
        }
        return ret;
    }

    // #https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/?l2-id=step0_pc_purchase_top_1　の後の処理
    /*
  下のパラメータを消せば、解除される
 
    
    ショップからのお知らせを受け取る
    rmail_check
    
    このお買い物へのレビュー(評価)
    shop_rating_check
    
    お気に入りに追加するかどうか
    bookmarkShopIdList
    */
    {
        //await getShippingAddresses(null);
        //return;
    }

    async function getShippingAddresses(args_) {
        // first login
        var p1 = new URLSearchParams('service_id=top&u=a%40g.cc&p=manko123&submit=Login&pp_version=20170213&device_fp=' + rnd(32) + '&time_zone=-540&os_info=Win32');
        p1.set('u', 'a@g.cc');
        p1.set('p', 'manko123');

        var headers = {
            'Origin': 'https://grp01.id.rakuten.co.jp',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Referer': 'https://grp01.id.rakuten.co.jp/rms/nid/vc?__event=login&service_id=top',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'POST',
            url: 'https://grp01.id.rakuten.co.jp/rms/nid/logini',
            headers: headers,
            data: p1.toString(),
        }, 'euc-jp');
        ck = updateCookieStore(ck, cookie, res);
        cookie = ck.getAll();

        if (1 == 1) {
            var item_url_t = 'https://item.rakuten.co.jp/yamada-denki/2814296013/';
            var shop_id_t = null;
            var item_key_t = null;

            // access a temporary item page
            {
                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'GET',
                    url: item_url_t,
                    headers: headers,
                    data: '',
                }, 'euc-jp');
                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                doc = str2doc(res.body);
            }

            // add temporary item
            {
                var form = doc.querySelector('form#purchaseForm');
                var action = form.action;
                //console.log(action);

                var params = new URLSearchParams('');

                // params
                var sizes = doc.querySelectorAll('span.inventory_choice_name');
                var inventories = doc.querySelectorAll('input[name="inventory_id"]');
                var units = doc.querySelector('input[name="units"]').value;
                units = "1";
                var event = doc.querySelector('input[name="__event"]').value;
                var shop_bid = doc.querySelector('input[name="shop_bid"]').value;
                var item_id = doc.querySelector('input[name="item_id"]').value;
                var inventory_flag = doc.querySelector('input[name="inventory_flag"]').value;

                if (inventories.length != 0) {
                    var choice = ((doc.querySelector('select[name="choice"] > option').value));
                    params.append("inventory_id", inventories[0].value);
                    params.append("choice", choice);
                }

                params.append("units", units);
                params.append("__event", event);
                params.append("shop_bid", shop_bid);
                params.append("item_id", item_id);
                params.append("inventory_flag", inventory_flag);


                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://t.basket.step.rakuten.co.jp/rms/mall/bs/cartadd/set?l2-id=item_PC_AddCart_fix',
                    headers: headers,
                    data: params.toString(),
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();


                doc = str2doc(res.body);
                //console.log(res);
            } {
                var doc_t = null;
                var form = doc.forms[0];
                var fd = new FormData(form);
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('check_item%5B0%5D=true&item_key%5B0%5D=8ffe7efc31a77b5d02fd471f09eefc8f&units%5B0%5D=1&shop_bid=357621&short_flag=1&quickNormalize_flag=true&quickNormalizeUnification_flag=true&ssl=on');

                params.forEach((v, k) => {
                    params.set(k, fd.get(k));
                    if (k == 'shop_bid')
                        shop_id_t = params.get(k);
                    else if (k.indexOf('item_key') != -1)
                        item_key_t = params.get(k);
                });

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cart/set/?l2-id=step0_pc_purchase_top_1',
                    headers: headers,
                    data: params.toString(),
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;
                //console.log(redir);

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;
                if (redir === undefined) {
                    // second login
                    doc = str2doc(res.body);
                    var form = doc.forms[0];
                    var fd = new FormData(form);

                    p1 = new URLSearchParams('pp_version=20170213&tokenSeed=f2551f9db5fcef8621f5d259a2bcf387&u=a%40g.cc&p=manko123&__event=ID01_001_001&login_submit=replaceme1&service_id=s227&return_url=%2Fmorderfromquick%2Fset&sbId=1');
                    p1.set('u', 'a@g.cc');
                    p1.set('p', 'manko123');
                    p1.set('pp_version', fd.get('pp_version'));
                    p1.set('tokenSeed', fd.get('tokenSeed'));

                    var headers = {
                        'Origin': 'https://grp01.id.rakuten.co.jp',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Referer': 'https://grp01.id.rakuten.co.jp/rms/nid/vc?__event=login&service_id=top',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'POST',
                        url: 'https://grp01.id.rakuten.co.jp/rms/nid/vc?l2-id=step1_pc_next_top',
                        headers: headers,
                        data: p1.toString().replace('replaceme1', '%A1%A1%A1%A1%BC%A1%A4%D8%A1%A1%A1%A1'),
                    }, 'euc-jp');
                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    var redir = res.headers.location;
                    //console.log(redir);
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    var redir = res.headers.location;
                    //console.log(redir);
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    doc_t = str2doc(res.body);
                } else {
                    doc_t = str2doc(res.body);
                }

                if (doc_t !== null) {
                    console.log(doc_t);
                    window.rara = doc_t;
                    var addrs_e = doc_t.querySelectorAll('div.sender-address[data-last-name]');
                    var addrs = {};

                    addrs_e.forEach((elem, idx) => {
                        var attr_map = {};
                        var attrs = elem.attributes;

                        for (var i = 0; i < attrs.length; i++)
                            if (attrs[i].nodeName.includes('data-')) attr_map[attrs[i].nodeName] = attrs[i].nodeValue;

                        addrs[idx + 1] = attr_map;
                        attr_map = {};
                    });

                    addrs['size'] = addrs_e.length;

                    if (window['temporary_'] === undefined) {
                        var email = 'a@g.cc';

                        var rakuten = {
                            accounts: [{
                                email: 'a@g.cc',
                                addresses: addrs
                            }]
                        }
                        window.temporary_ = {
                            rakuten: rakuten
                        };
                    } else {
                        /*
                        indow['temporary_']['rakuten']['accounts'].push({
                            email: 'hoohooo'
                        });
                        */
                    }
                }
            }

            // delete temporary item
            {
                p1 = new URLSearchParams('command=delete&shop_id=357621&current_shop_id=357621&item_key=f9cc2a1d95a681875373c87c7d743978&later_item_keys=');

                p1.set('shop_id', shop_id_t);
                p1.set('current_shop_id', shop_id_t);
                p1.set('item_key', item_key_t);
                //p1.set('tokenSeed', fd.get('tokenSeed'));

                var headers = {
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Referer': 'https://basket.step.rakuten.co.jp/',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cartchangeajax/',
                    headers: headers,
                    data: p1.toString()
                }, 'euc-jp');
                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                console.log(p1.toString());
            }
        }
    }

    async function setShippingAddress(doc, cookie) {
        // get list
        //document.querySelectorAll('div.sender-address')

        stime = new Date().getTime();
        var skipLogin = false;

        {

            var form = doc.forms[0];
            var fd = new FormData(form);
            var action = form.action;
            var elements = getFormElements(form);

            var params = new URLSearchParams('process_type=&address_list_id=2&sendto=&address_list_id=');
            window.hhh = doc;
            fd.forEach((v, k) => {
                if (params.get(k) == null)
                    params.append(k, v);
            });

            params.set('address_list_id', '2');

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Origin': 'https://basket.step.rakuten.co.jp',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'POST',
                url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/set',
                headers: headers,
                data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
            }, 'euc-jp');

            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var redir = res.headers.location;
            console.log(redir);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'GET',
                url: redir,
                headers: headers,
                data: '',
            }, 'euc-jp');


            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();



            var redir = res.headers.location;
            if (redir !== undefined) {

                console.log(redir);

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');


                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();
            } else {
                skipLogin = true;

                doc = str2doc(res.body);
            }
        }

        if (!skipLogin) {

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'GET',
                url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/?l2-id=step0_pc_purchase_top_1',
                headers: headers,
                data: '',
            }, 'euc-jp');


            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var redir = res.headers.location;

            console.log(redir);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'GET',
                url: redir,
                headers: headers,
                data: '',
            }, 'euc-jp');


            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();
        }
        // #2 swtich(change) to a new address. send_to is a new address number.
        if (1 == 2) {
            {
                window.hhh2 = doc;
                return;
                var form = doc.forms[0];
                var fd = new FormData(form);
                var action = form.action;
                var elements = getFormElements(form);

                window.hhh2 = doc;

                var params = new URLSearchParams('');

                fd.forEach((v, k) => {
                    if (k.indexOf('tokenSeed') != -1 ||
                        k.indexOf('process_type') != -1 ||
                        k.indexOf('address_list_id') != -1 ||
                        k.indexOf('units') != -1 ||
                        k.indexOf('send_to') != -1 ||
                        k.indexOf('store_Receive') != -1
                    )
                        params.append(k, v);
                });

                var units = doc.querySelectorAll('div.sender-info-footer-select-wrapper > select');
                units.forEach((elem, idx) => {
                    params.set('units(' + idx + ')', elem.selectedIndex + 1);
                });

                params.set('process_type', 'multi_select');
                params.set('send_to', '2'); // sender

                console.log(params.toString());


                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/msendtochange/set?l2-id=step2_pc_next',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;

                console.log(redir);

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');


                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;
                if (redir !== undefined) {
                    //console.log(redir);

                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');


                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    //console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));
                    // console.log(res);
                    doc = str2doc(res.body);

                    console.log('continue to login');
                } else {
                    console.log('skipLogin');
                    skipLogin = true;

                    doc = str2doc(res.body);
                }
            }
        }
        // Login for Confirm and update the address. will be redirected to the setting page again.
        if (!skipLogin) {
            var form = doc.forms[0];
            var fd = new FormData(form);
            var action = form.action;
            var elements = getFormElements(form);

            var params = new URLSearchParams('__event=ID01_001_001&service_id=s227&return_url=%2Fmrelogin%2Fset&update=&tokenSeed=8a95d8b3f86a287a53c56d72465ebe0e&u=a%40g.cc&p=manko123&submit=%BC%A1%A4%D8');

            params.forEach((v, k) => {
                if (k == 'dlvPaySubmit') {

                } else if (k.indexOf('select_card_installment_ma') != -1) {

                } else if (k.indexOf('fastest_my_delivery_date_ma') != -1) {

                } else if (k.indexOf('select_delivery_map') != -1) {
                    params.set(k, '102');
                } else if (k.indexOf('select_payment_map') != -1) {
                    params.set(k, '20000');
                } else if (k.indexOf('dlv_day_type_map') != -1) {
                    params.set(k, 'day');
                } else if (k.indexOf('deliveryTimeListMap') != -1) {
                    params.set(k, '1');
                } else {
                    if (fd.get(k) != null)
                        params.set(k, fd.get(k));
                    else
                        params.set(k, "undefined");
                }
            });

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Origin': 'https://basket.step.rakuten.co.jp',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'POST',
                url: 'https://grp01.id.rakuten.co.jp/rms/nid/vc',
                headers: headers,
                data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
            }, 'euc-jp');

            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var redir = res.headers.location;

            console.log(redir);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'GET',
                url: redir,
                headers: headers,
                data: '',
            }, 'euc-jp');


            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var redir = res.headers.location;

            console.log(redir);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'GET',
                url: redir,
                headers: headers,
                data: '',
            }, 'euc-jp');


            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            //console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));
            //console.log(res);
            doc = str2doc(res.body);
        }

        console.log(now() + ' -> configured shipping Address');

        return doc;
    }
    async function addShippingAddress(doc, cookie) {

        if (1 == 1) {
            var login = false; {

                var form = doc.forms[0];
                var fd = new FormData(form);
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('updateByAjax=&displayOldCommit=&tokenSeed=8c009d69e1fda851b8fe206fe189d78d&cardMethodMap(357621)=1_162172591&cardInstallmentSelectMap(357621)=1&units(8ffe7efc31a77b5d02fd471f09eefc8f)=1&rmail_check=357621&shop_rating_check=357621&bookmarkShopIdList=357621&giftUsageMap(357621)=00000&birth_year=0&birth_month=0&birth_day=0&ac=&sendto=&address_list_id=2&edit_contact_id=');

                params.forEach((v, k) => {
                    if (k == 'dlvPaySubmit') {

                    } else if (k.indexOf('address_list_id') != -1) {
                        params.set(k, '1');
                    } else if (k.indexOf('fastest_my_delivery_date_ma') != -1) {

                    } else if (k.indexOf('select_delivery_map') != -1) {
                        params.set(k, '102');
                    } else if (k.indexOf('select_payment_map') != -1) {
                        params.set(k, '20000');
                    } else if (k.indexOf('dlv_day_type_map') != -1) {
                        params.set(k, 'day');
                    } else if (k.indexOf('deliveryTimeListMap') != -1) {
                        params.set(k, '1');
                    } else {
                        if (fd.get(k) != null)
                            params.set(k, fd.get(k));
                        else
                            params.set(k, "");
                    }
                });

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/set',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;

                console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');


                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();


                var redir = res.headers.location;
                if (redir !== undefined) {
                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');


                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    login = true;

                    console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));
                    console.log(res);
                    doc = str2doc(res.body);
                } else {
                    console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));
                    console.log(res);
                    doc = str2doc(res.body);
                }
            }
            if (!login) {
                {

                    var form = doc.forms[0];
                    var fd = new FormData(form);
                    var action = form.action;
                    var elements = getFormElements(form);

                    var params = new URLSearchParams('displayOldCommit=&tokenSeed=00eb9951d6359e663c431f8c627e60d6&cardMethodMap%28357621%29=1_162172591&cardInstallmentSelectMap%28357621%29=1&units%288ffe7efc31a77b5d02fd471f09eefc8f%29=1&rmail_check=357621&shop_rating_check=357621&bookmarkShopIdList=357621&giftUsageMap%28357621%29=00000&birth_year=0&birth_month=0&birth_day=0&ac=&sendto_multi=undefined');

                    params.forEach((v, k) => {
                        if (k == 'dlvPaySubmit') {

                        } else if (k.indexOf('select_card_installment_ma') != -1) {

                        } else if (k.indexOf('fastest_my_delivery_date_ma') != -1) {

                        } else if (k.indexOf('select_delivery_map') != -1) {
                            params.set(k, '102');
                        } else if (k.indexOf('select_payment_map') != -1) {
                            params.set(k, '20000');
                        } else if (k.indexOf('dlv_day_type_map') != -1) {
                            params.set(k, 'day');
                        } else if (k.indexOf('deliveryTimeListMap') != -1) {
                            params.set(k, '1');
                        } else {
                            if (fd.get(k) != null)
                                params.set(k, fd.get(k));
                            else
                                params.set(k, "");
                        }
                    });

                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Origin': 'https://basket.step.rakuten.co.jp',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'POST',
                        url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/set?l-id=step4_pc_multiple_send',
                        headers: headers,
                        data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    var redir = res.headers.location;

                    console.log(redir);

                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');


                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));
                    console.log(res);
                    doc = str2doc(res.body);
                }

                // #2 swtich(change) to a new address. send_to is a new address number.
                {
                    var form = doc.forms[0];
                    var fd = new FormData(form);
                    var action = form.action;
                    var elements = getFormElements(form);

                    var params = new URLSearchParams('tokenSeed=9ba1ec6ebc2b73e43c1a7d4cee647efd&process_type=multi_select&address_list_id=&units%281%29=1&send_to=2&units%282%29=1&current_noshi_id=&store_Receive=false');

                    params.forEach((v, k) => {
                        if (k == 'process_type') {
                            params.set(k, 'multi_select');
                        } else if (k.indexOf('select_card_installment_ma') != -1) {

                        } else if (k.indexOf('fastest_my_delivery_date_ma') != -1) {

                        } else if (k.indexOf('select_delivery_map') != -1) {
                            params.set(k, '102');
                        } else if (k.indexOf('select_payment_map') != -1) {
                            params.set(k, '20000');
                        } else if (k.indexOf('dlv_day_type_map') != -1) {
                            params.set(k, 'day');
                        } else if (k.indexOf('deliveryTimeListMap') != -1) {
                            params.set(k, '1');
                        } else {
                            if (fd.get(k) != null)
                                params.set(k, fd.get(k));
                            else
                                params.set(k, "");
                        }
                    });

                    params.set('send_to', '2');

                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Origin': 'https://basket.step.rakuten.co.jp',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'POST',
                        url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/msendtochange/set?l2-id=step2_pc_next',
                        headers: headers,
                        data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    var redir = res.headers.location;

                    console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));

                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');


                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    doc = str2doc(res.body);
                }
            }
            if (login) {
                {
                    var form = doc.forms[0];
                    var fd = new FormData(form);
                    var action = form.action;
                    var elements = getFormElements(form);

                    var params = new URLSearchParams('check_item%5B0%5D=true&item_key%5B0%5D=8ffe7efc31a77b5d02fd471f09eefc8f&units%5B0%5D=1&shop_bid=357621&short_flag=1&quickNormalize_flag=true&quickNormalizeUnification_flag=true&ssl=on');

                    params.forEach((v, k) => {
                        console.log(k, fd.get(k));
                        if (k.indexOf('short_flag') == -1 || k.indexOf('quickNormalize_flag') == -1 || k.indexOf('quickNormalizeUnification_flag') == -1 || k.indexOf('ssl') == -1)
                            params.set(k, fd.get(k));
                    });

                    console.log('param check', params.toString());
                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Origin': 'https://basket.step.rakuten.co.jp',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'POST',
                        url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cart/set/?l2-id=step0_pc_purchase_top_1',
                        headers: headers,
                        data: params.toString(),
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    console.log(res);
                    var redir = res.headers.location;
                    console.log(redir);
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    console.log(res);
                    doc = str2doc(res.body);

                    window.dd3 = doc;
                }
                if (1 == 1) {
                    var form = doc.forms[0];
                    var action = form.action;
                    var elements = getFormElements(form);

                    var params = new URLSearchParams('');

                    elements.forEach(elem => {
                        if (elem.name != 'isNewUi' && (elem.nodeName == 'INPUT' || elem.nodeName == 'SELECT')) {
                            if (elem.name == 'return_url') {
                                params.append(elem.name, '/morderfromquick/set');
                            } else if (elem.name == 'login_submit') {
                                params.append(elem.name, 'replaceme_');
                            } else
                                params.append(elem.name, elem.value);
                        }
                    });

                    /*
                    params.set('u', account.email);
                    params.set('p', account.password);
                    */
                    params.set('u', 'a@g.cc');
                    params.set('p', 'manko123');

                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Origin': 'https://grp01.id.rakuten.co.jp',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'POST',
                        url: 'https://grp01.id.rakuten.co.jp/rms/nid/vc?l2-id=step1_pc_next_top',
                        headers: headers,
                        data: params.toString().replace('replaceme_', '%A1%A1%A1%A1%BC%A1%A4%D8%A1%A1%A1%A1'),
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    console.log(res);
                    var redir = res.headers.location;

                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    redir = res.headers.location;

                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    console.log(res);
                    doc = str2doc(res.body);

                    window.dd3 = doc;

                    console.log(redir);

                    window.redirects = redir;
                }
            }
            return doc; {

                var form = doc.forms[0];
                var fd = new FormData(form);
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('updateByAjax=&displayOldCommit=&tokenSeed=8c009d69e1fda851b8fe206fe189d78d&cardMethodMap(357621)=1_162172591&cardInstallmentSelectMap(357621)=1&units(8ffe7efc31a77b5d02fd471f09eefc8f)=1&rmail_check=357621&shop_rating_check=357621&bookmarkShopIdList=357621&giftUsageMap(357621)=00000&birth_year=0&birth_month=0&birth_day=0&ac=&sendto=&address_list_id=2&edit_contact_id=');

                params.forEach((v, k) => {
                    if (k == 'dlvPaySubmit') {

                    } else if (k.indexOf('select_card_installment_ma') != -1) {

                    } else if (k.indexOf('fastest_my_delivery_date_ma') != -1) {

                    } else if (k.indexOf('select_delivery_map') != -1) {
                        params.set(k, '102');
                    } else if (k.indexOf('select_payment_map') != -1) {
                        params.set(k, '20000');
                    } else if (k.indexOf('dlv_day_type_map') != -1) {
                        params.set(k, 'day');
                    } else if (k.indexOf('deliveryTimeListMap') != -1) {
                        params.set(k, '1');
                    } else {
                        if (fd.get(k) != null)
                            params.set(k, fd.get(k));
                        else
                            params.set(k, "undefined");
                    }
                });

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/set',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;

                console.log(redir);

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');


                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));
                console.log(res);
                doc = str2doc(res.body);
            }
        }
        // a case of adding a new address
        if (1 == 2) {
            // redirect to the setting page.
            {

                var form = doc.forms[0];
                var fd = new FormData(form);
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('displayOldCommit=&tokenSeed=005e2ca4945dd1f53c9db8a76cd218c8&cardMethodMap%28357621%29=1_162172591&cardInstallmentSelectMap%28357621%29=1&units%288ffe7efc31a77b5d02fd471f09eefc8f%29=1&rmail_check=357621&shop_rating_check=357621&bookmarkShopIdList=357621&giftUsageMap%28357621%29=00000&birth_year=0&birth_month=0&birth_day=0&ac=&sendto_multi=undefined');

                params.forEach((v, k) => {
                    if (k == 'dlvPaySubmit') {

                    } else if (k.indexOf('select_card_installment_ma') != -1) {

                    } else if (k.indexOf('fastest_my_delivery_date_ma') != -1) {

                    } else if (k.indexOf('select_delivery_map') != -1) {
                        params.set(k, '102');
                    } else if (k.indexOf('select_payment_map') != -1) {
                        params.set(k, '20000');
                    } else if (k.indexOf('dlv_day_type_map') != -1) {
                        params.set(k, 'day');
                    } else if (k.indexOf('deliveryTimeListMap') != -1) {
                        params.set(k, '1');
                    } else {
                        if (fd.get(k) != null)
                            params.set(k, fd.get(k));
                        else
                            params.set(k, "undefined");
                    }
                });

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/set?l-id=step4_pc_multiple_send',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;

                console.log(redir);

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');


                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));
                console.log(res);
                doc = str2doc(res.body);
            }

            // add address. if don't need it then skip this process and analyze the html of the previous process when finished it, enumrate address list and select arbitary list. to #2
            {
                var form = doc.forms[0];
                var fd = new FormData(form);
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('tokenSeed=919e86886db4ce72451cd5adeb7d0a0b&process_type=add_address&address_list_id=&add_address_list=1&send_to=1&units%281%29=1&lname=KOKO&fname=DESU&lname_kana=%A5%B3%A5%B3&fname_kana=%A5%C7%A5%B9&zip1=100&zip2=0000&prefecture=13&city=%C0%E9%C2%E5%C5%C4%B6%E8&cityInput_select=&street=f&tel1=080&tel2=8888&tel3=8888&current_noshi_id=&store_Receive=false');

                params.forEach((v, k) => {
                    if (k == 'dlvPaySubmit') {

                    } else if (k.indexOf('select_card_installment_ma') != -1) {

                    } else if (k.indexOf('fastest_my_delivery_date_ma') != -1) {

                    } else if (k.indexOf('select_delivery_map') != -1) {
                        params.set(k, '102');
                    } else if (k.indexOf('select_payment_map') != -1) {
                        params.set(k, '20000');
                    } else if (k.indexOf('dlv_day_type_map') != -1) {
                        params.set(k, 'day');
                    } else if (k.indexOf('deliveryTimeListMap') != -1) {
                        params.set(k, '1');
                    } else {
                        if (fd.get(k) != null)
                            params.set(k, fd.get(k));
                        else
                            params.set(k, "undefined");
                    }
                });

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/msendtochange/set?l2-id=step2_pc_update',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;

                console.log(redir);

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');


                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));
                console.log(res);
                doc = str2doc(res.body);
            }

            // #2 swtich(change) to a new address. send_to is a new address number.
            {
                var form = doc.forms[0];
                var fd = new FormData(form);
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('tokenSeed=ada817536643742f0d2d6d7a3619903f&process_type=multi_select&address_list_id=&units%281%29=1&send_to=2&units%282%29=1&current_noshi_id=&store_Receive=false');

                params.forEach((v, k) => {
                    if (k == 'dlvPaySubmit') {

                    } else if (k.indexOf('select_card_installment_ma') != -1) {

                    } else if (k.indexOf('fastest_my_delivery_date_ma') != -1) {

                    } else if (k.indexOf('select_delivery_map') != -1) {
                        params.set(k, '102');
                    } else if (k.indexOf('select_payment_map') != -1) {
                        params.set(k, '20000');
                    } else if (k.indexOf('dlv_day_type_map') != -1) {
                        params.set(k, 'day');
                    } else if (k.indexOf('deliveryTimeListMap') != -1) {
                        params.set(k, '1');
                    } else {
                        if (fd.get(k) != null)
                            params.set(k, fd.get(k));
                        else
                            params.set(k, "undefined");
                    }
                });

                params.set('send_to', '1');

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/msendtochange/set?l2-id=step2_pc_next',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;

                console.log(redir);

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');


                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;

                console.log(redir);

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');


                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));
                console.log(res);
                doc = str2doc(res.body);
            }
            // Login for Confirm and update the address. will be redirected to the setting page again.
            {
                var form = doc.forms[0];
                var fd = new FormData(form);
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('__event=ID01_001_001&service_id=s227&return_url=%2Fmrelogin%2Fset&update=&tokenSeed=8a95d8b3f86a287a53c56d72465ebe0e&u=a%40g.cc&p=manko123&submit=%BC%A1%A4%D8');

                params.forEach((v, k) => {
                    if (k == 'dlvPaySubmit') {

                    } else if (k.indexOf('select_card_installment_ma') != -1) {

                    } else if (k.indexOf('fastest_my_delivery_date_ma') != -1) {

                    } else if (k.indexOf('select_delivery_map') != -1) {
                        params.set(k, '102');
                    } else if (k.indexOf('select_payment_map') != -1) {
                        params.set(k, '20000');
                    } else if (k.indexOf('dlv_day_type_map') != -1) {
                        params.set(k, 'day');
                    } else if (k.indexOf('deliveryTimeListMap') != -1) {
                        params.set(k, '1');
                    } else {
                        if (fd.get(k) != null)
                            params.set(k, fd.get(k));
                        else
                            params.set(k, "undefined");
                    }
                });

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://grp01.id.rakuten.co.jp/rms/nid/vc',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;

                console.log(redir);

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');


                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;

                console.log(redir);

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');


                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));
                console.log(res);
                doc = str2doc(res.body);
            }
        }

        return doc;
    }

    for (;;) {
        try {
            var req_urls = ['https://grp01.id.rakuten.co.jp/rms/nid/logini'];

            // test
            if (1 == 2) {

                var p12 = '{"fullCardDetails":{"cardNumber":"4737030024566712","expirationYear":"2020","expirationMonth":"04"},"serviceId":"jp-pc-basket","timestamp":"2019-03-10 16:13:15.294"}';

                var headers = {
                    'Origin': 'https://payvault.global.rakuten.com',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'application/json',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Referer': 'https://payvault.global.rakuten.com/static/payvault/V2/gateway.html',
                    'Content-Type': 'application/json',
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://payvault.global.rakuten.com/api/pv/Card/V2/Add',
                    headers: headers,
                    data: p12,
                }, 'utf8');

                var json = JSON.parse(res.body);

                console.log(json);
                return;
            }


            // Login
            if (1 == 2) {

                // get cookie
                if (1 == 2) {
                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'GET',
                        url: 'https://grp01.id.rakuten.co.jp/rms/nid/vc?__event=login&service_id=top',
                        headers: headers,
                        data: '',
                    }, 'euc-jp');
                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                }

                // first login
                var p1 = new URLSearchParams('service_id=top&u=a%40g.cc&p=manko123&submit=Login&pp_version=20170213&device_fp=' + rnd(32) + '&time_zone=-540&os_info=Win32');
                p1.set('u', 'a@g.cc');
                p1.set('p', 'manko123');

                var headers = {
                    'Origin': 'https://grp01.id.rakuten.co.jp',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Referer': 'https://grp01.id.rakuten.co.jp/rms/nid/vc?__event=login&service_id=top',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://grp01.id.rakuten.co.jp/rms/nid/logini',
                    headers: headers,
                    data: p1.toString(),
                }, 'euc-jp');
                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                //console.log(cookie);

                if (1 == 1) {
                    var shop_id_t = null;
                    var item_key_t = null;
                    var race = false;

                    // access a temporary item page
                    {
                        var headers = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                            'Accept-Language': 'ja;q=1, en-US;q=0.9',
                            'Accept-Encoding': 'gzip, deflate',
                            'Cookie': cookie,
                        };
                        var res = await request({
                            method: 'GET',
                            url: 'https://item.rakuten.co.jp/yamada-denki/2814296013/',
                            headers: headers,
                            data: '',
                        }, 'euc-jp');
                        ck = updateCookieStore(ck, cookie, res);
                        cookie = ck.getAll();

                        doc = str2doc(res.body);
                    }

                    // add temporary item
                    {
                        var form = doc.querySelector('form#purchaseForm');
                        var action = form.action;
                        //console.log(action);

                        var params = new URLSearchParams('');

                        // params
                        var sizes = doc.querySelectorAll('span.inventory_choice_name');
                        var inventories = doc.querySelectorAll('input[name="inventory_id"]');
                        var units = doc.querySelector('input[name="units"]').value;
                        units = "1";
                        var event = doc.querySelector('input[name="__event"]').value;
                        var shop_bid = doc.querySelector('input[name="shop_bid"]').value;
                        var item_id = doc.querySelector('input[name="item_id"]').value;
                        var inventory_flag = doc.querySelector('input[name="inventory_flag"]').value;

                        if (inventories.length != 0) {
                            var choice = ((doc.querySelector('select[name="choice"] > option').value));
                            params.append("inventory_id", inventories[0].value);
                            params.append("choice", choice);
                        }

                        params.append("units", units);
                        params.append("__event", event);
                        params.append("shop_bid", shop_bid);
                        params.append("item_id", item_id);
                        params.append("inventory_flag", inventory_flag);


                        var headers = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                            'Accept-Language': 'ja;q=1, en-US;q=0.9',
                            'Accept-Encoding': 'gzip, deflate',
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Cookie': cookie,
                        };
                        var res = await request({
                            method: 'POST',
                            url: 'https://t.basket.step.rakuten.co.jp/rms/mall/bs/cartadd/set?l2-id=item_PC_AddCart_fix',
                            headers: headers,
                            data: params.toString(),
                        }, 'euc-jp');

                        ck = updateCookieStore(ck, cookie, res);
                        cookie = ck.getAll();

                        var redir = res.headers.location;
                        headers = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                            'Accept-Language': 'ja;q=1, en-US;q=0.9',
                            'Accept-Encoding': 'gzip, deflate',
                            'Cookie': cookie,
                        };
                        res = await request({
                            method: 'GET',
                            url: redir,
                            headers: headers,
                            data: '',
                        }, 'euc-jp');

                        ck = updateCookieStore(ck, cookie, res);
                        cookie = ck.getAll();


                        doc = str2doc(res.body);
                        //console.log(res);
                    } {
                        var form = doc.forms[0];
                        var fd = new FormData(form);
                        var action = form.action;
                        var elements = getFormElements(form);

                        var params = new URLSearchParams('check_item%5B0%5D=true&item_key%5B0%5D=8ffe7efc31a77b5d02fd471f09eefc8f&units%5B0%5D=1&shop_bid=357621&short_flag=1&quickNormalize_flag=true&quickNormalizeUnification_flag=true&ssl=on');

                        params.forEach((v, k) => {
                            params.set(k, fd.get(k));
                            if (k == 'shop_bid')
                                shop_id_t = params.get(k);
                            else if (k.indexOf('item_key') != -1)
                                item_key_t = params.get(k);
                        });

                        var headers = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                            'Accept-Language': 'ja;q=1, en-US;q=0.9',
                            'Accept-Encoding': 'gzip, deflate',
                            'Origin': 'https://basket.step.rakuten.co.jp',
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Cookie': cookie,
                        };
                        var res = await request({
                            method: 'POST',
                            url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cart/set/?l2-id=step0_pc_purchase_top_1',
                            headers: headers,
                            data: params.toString(),
                        }, 'euc-jp');

                        ck = updateCookieStore(ck, cookie, res);
                        cookie = ck.getAll();

                        var redir = res.headers.location;
                        if (redir === undefined)
                            race = true;
                        else {
                            //console.log(redir);

                            headers = {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                                'Accept-Encoding': 'gzip, deflate',
                                'Cookie': cookie,
                            };
                            res = await request({
                                method: 'GET',
                                url: redir,
                                headers: headers,
                                data: '',
                            }, 'euc-jp');

                            ck = updateCookieStore(ck, cookie, res);
                            cookie = ck.getAll();

                            var redir = res.headers.location;
                            if (redir === undefined) {
                                // second login
                                doc = str2doc(res.body);
                                var form = doc.forms[0];
                                var fd = new FormData(form);

                                p1 = new URLSearchParams('pp_version=20170213&tokenSeed=f2551f9db5fcef8621f5d259a2bcf387&u=a%40g.cc&p=manko123&__event=ID01_001_001&login_submit=replaceme1&service_id=s227&return_url=%2Fmorderfromquick%2Fset&sbId=1');
                                p1.set('u', 'a@g.cc');
                                p1.set('p', 'manko123');
                                p1.set('pp_version', fd.get('pp_version'));
                                p1.set('tokenSeed', fd.get('tokenSeed'));

                                var headers = {
                                    'Origin': 'https://grp01.id.rakuten.co.jp',
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                                    'Accept-Encoding': 'gzip, deflate',
                                    'Referer': 'https://grp01.id.rakuten.co.jp/rms/nid/vc?__event=login&service_id=top',
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'Cookie': cookie,
                                };
                                var res = await request({
                                    method: 'POST',
                                    url: 'https://grp01.id.rakuten.co.jp/rms/nid/vc?l2-id=step1_pc_next_top',
                                    headers: headers,
                                    data: p1.toString().replace('replaceme1', '%A1%A1%A1%A1%BC%A1%A4%D8%A1%A1%A1%A1'),
                                }, 'euc-jp');
                                ck = updateCookieStore(ck, cookie, res);
                                cookie = ck.getAll();

                                var redir = res.headers.location;
                                //console.log(redir);
                                headers = {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                                    'Accept-Encoding': 'gzip, deflate',
                                    'Cookie': cookie,
                                };
                                res = await request({
                                    method: 'GET',
                                    url: redir,
                                    headers: headers,
                                    data: '',
                                }, 'euc-jp');

                                ck = updateCookieStore(ck, cookie, res);
                                cookie = ck.getAll();

                                //console.log(p1.toString().replace('replaceme1', '%A1%A1%A1%A1%BC%A1%A4%D8%A1%A1%A1%A1'));
                            }
                        }
                    }

                    // delete temporary item
                    if (!race) {
                        p1 = new URLSearchParams('command=delete&shop_id=357621&current_shop_id=357621&item_key=f9cc2a1d95a681875373c87c7d743978&later_item_keys=');

                        p1.set('shop_id', shop_id_t);
                        p1.set('current_shop_id', shop_id_t);
                        p1.set('item_key', item_key_t);
                        //p1.set('tokenSeed', fd.get('tokenSeed'));

                        var headers = {
                            'Origin': 'https://basket.step.rakuten.co.jp',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                            'Accept-Language': 'ja;q=1, en-US;q=0.9',
                            'Accept-Encoding': 'gzip, deflate',
                            'Referer': 'https://basket.step.rakuten.co.jp/',
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Cookie': cookie,
                        };
                        var res = await request({
                            method: 'POST',
                            url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cartchangeajax/',
                            headers: headers,
                            data: p1.toString()
                        }, 'euc-jp');
                        ck = updateCookieStore(ck, cookie, res);
                        cookie = ck.getAll();

                        console.log(p1.toString());
                    }
                }
                if (1 == 2) {
                    // add temporary cart
                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'GET',
                        url: 'https://direct.step.rakuten.co.jp/rms/mall/cartAdd/?callback=jQuery112200038683009740247964_1552539644219&shopid=357621&itemid=10173399&units=1&device=pc&userid=itempage&_=1552539644222',
                        headers: headers,
                        data: '',
                    }, 'euc-jp');
                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    // load the login page once for avoid to be required login again.
                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'GET',
                        url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/morderfrom/?l2-id=step0_pc_purchase_top_1',
                        headers: headers,
                        data: '',
                    }, 'euc-jp');
                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    doc = str2doc(res.body);

                    // second login
                    var form = doc.forms[0];
                    var fd = new FormData(form);

                    p1 = new URLSearchParams('pp_version=20170213&tokenSeed=f2551f9db5fcef8621f5d259a2bcf387&u=a%40g.cc&p=manko123&__event=ID01_001_001&login_submit=replaceme1&service_id=s227&return_url=%2Fmorderfromquick%2Fset&sbId=1');
                    p1.set('u', 'a@g.cc');
                    p1.set('p', 'manko123');
                    p1.set('pp_version', fd.get('pp_version'));
                    p1.set('tokenSeed', fd.get('tokenSeed'));

                    var headers = {
                        'Origin': 'https://grp01.id.rakuten.co.jp',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Referer': 'https://grp01.id.rakuten.co.jp/rms/nid/vc?__event=login&service_id=top',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'POST',
                        url: 'https://grp01.id.rakuten.co.jp/rms/nid/vc?l2-id=step1_pc_next_top',
                        headers: headers,
                        data: p1.toString().replace('replaceme1', '%A1%A1%A1%A1%BC%A1%A4%D8%A1%A1%A1%A1'),
                    }, 'euc-jp');
                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    var redir = res.headers.location;
                    console.log(redir);
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    var redir = res.headers.location;
                    console.log(redir);
                    console.log(p1.toString().replace('replaceme1', '%A1%A1%A1%A1%BC%A1%A4%D8%A1%A1%A1%A1'));
                    return;
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();


                    // delete temporary cart
                    p1 = new URLSearchParams('command=delete&shop_id=357621&current_shop_id=357621&item_key=f9cc2a1d95a681875373c87c7d743978&later_item_keys=');
                    /*
                    p1.set('u', 'a@g.cc');
                    p1.set('p', 'manko123');
                    p1.set('pp_version', fd.get('pp_version'));
                    p1.set('tokenSeed', fd.get('tokenSeed'));
                    */
                    var headers = {
                        'Origin': 'https://basket.step.rakuten.co.jp',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Referer': 'https://basket.step.rakuten.co.jp/',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'POST',
                        url: 'https://grp01.id.rakuten.co.jp/rms/nid/vc?l2-id=step1_pc_next_top',
                        headers: headers,
                        data: p1.toString().replace('replaceme1', '%A1%A1%A1%A1%BC%A1%A4%D8%A1%A1%A1%A1'),
                    }, 'euc-jp');

                    console.log(res.body);
                }

                //return;
                // return;
            }

            var arrr = ['https://item.rakuten.co.jp/yamada-denki/1177992013/', 'https://item.rakuten.co.jp/yamada-denki/428301017/', 'https://item.rakuten.co.jp/yamada-denki/2815499017/']

            //var arrr = ['https://item.rakuten.co.jp/yamada-denki/2815499017/', 'https://item.rakuten.co.jp/yamada-denki/2815499017/', 'https://item.rakuten.co.jp/yamada-denki/2815499017/'];
            window.st = new Date().getTime();
            console.log('START: ' + now());
            await Promise.all(new Array(1).fill(args).map(async(val, idx) => {
                var item_url = arrr[val];
                //arrr.pop();

                var doc_t = null; {
                    var sold_out = false;
                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };

                    var res = await request({
                        method: 'GET',
                        url: item_url,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    doc_t = str2doc(res.body);

                    var spans = $(doc_t).find('span');
                    spans.each((i, elem) => {
                        if ($(elem).text().indexOf('売り切れ') > -1) {
                            sold_out = true;
                            return false;
                        }
                    });

                    if (sold_out)
                        console.log('売り切れ', item_url);
                    else
                        console.log('在庫あり', item_url);
                }

                window.st = new Date().getTime();

                {
                    var form = doc_t.querySelector('form#purchaseForm');
                    var action = form.action;
                    //console.log(action);

                    var params = new URLSearchParams('');

                    // params
                    var sizes = doc_t.querySelectorAll('span.inventory_choice_name');
                    var inventories = doc_t.querySelectorAll('input[name="inventory_id"]');
                    var units = doc_t.querySelector('input[name="units"]').value;
                    units = "1";
                    var event = doc_t.querySelector('input[name="__event"]').value;
                    var shop_bid = doc_t.querySelector('input[name="shop_bid"]').value;
                    var item_id = doc_t.querySelector('input[name="item_id"]').value;
                    var inventory_flag = doc_t.querySelector('input[name="inventory_flag"]').value;

                    if (inventories.length != 0) {
                        var choice = ((doc_t.querySelector('select[name="choice"] > option').value));
                        params.set("inventory_id", inventories[0].value);
                        params.set("choice", choice);
                    }

                    params.set("units", units);
                    params.set("__event", event);
                    params.set("shop_bid", shop_bid);
                    params.set("item_id", item_id);
                    params.set("inventory_flag", inventory_flag);


                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'POST',
                        url: 'https://t.basket.step.rakuten.co.jp/rms/mall/bs/cartadd/set?l2-id=item_PC_AddCart_fix',
                        headers: headers,
                        data: params.toString(),
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    var redir = res.headers.location;
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    });

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();


                    doc_t = str2doc(res.body);
                    //console.log(res);
                }

                doc = doc_t;

                console.log(now() + ' -> カートに追加: ' + item_url);
            }));

            // end cart adding

            if (1 == 2) {
                var form = doc.querySelector('form#purchaseForm');
                var action = form.action;
                console.log(action);

                var params = new URLSearchParams('');

                // params
                var sizes = doc.querySelectorAll('span.inventory_choice_name');
                var inventories = doc.querySelectorAll('input[name="inventory_id"]');
                var units = doc.querySelector('input[name="units"]').value;
                units = "1";
                var event = doc.querySelector('input[name="__event"]').value;
                var shop_bid = doc.querySelector('input[name="shop_bid"]').value;
                var item_id = doc.querySelector('input[name="item_id"]').value;
                var inventory_flag = doc.querySelector('input[name="inventory_flag"]').value;

                if (inventories.length != 0) {
                    var choice = ((doc.querySelector('select[name="choice"] > option').value));
                    params.append("inventory_id", inventories[0].value);
                    params.append("choice", choice);
                }

                params.append("units", units);
                params.append("__event", event);
                params.append("shop_bid", shop_bid);
                params.append("item_id", item_id);
                params.append("inventory_flag", inventory_flag);


                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://t.basket.step.rakuten.co.jp/rms/mall/bs/cartadd/set?l2-id=item_PC_AddCart_fix',
                    headers: headers,
                    data: params.toString(),
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                var redir = res.headers.location;
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();


                doc = str2doc(res.body);
                console.log(res);
            }
            if (1 == 1) {
                var form = doc.forms[0];
                var fd = new FormData(form);
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('check_item%5B0%5D=true&item_key%5B0%5D=8ffe7efc31a77b5d02fd471f09eefc8f&units%5B0%5D=1&shop_bid=357621&short_flag=1&quickNormalize_flag=true&quickNormalizeUnification_flag=true&ssl=on');

                fd.forEach((v, k) => {
                    params.set(k, v);
                });

                //console.log(params.toString());

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cart/set/?l2-id=step0_pc_purchase_top_1',
                    headers: headers,
                    data: params.toString(),
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                if (1 == 2) {
                    var redir = res.headers.location;
                    console.log(redir);

                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    var redir = res.headers.location;
                    console.log(redir);
                    console.log(cookie);

                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();


                    var redir = res.headers.location;
                    console.log(str2doc(res.body).body);
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    res = await request({
                        method: 'GET',
                        url: redir,
                        headers: headers,
                        data: '',
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    doc = str2doc(res.body);
                    window.dd3 = doc;
                    window.redirects = redir;
                }

                if (1 == 1) {
                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'GET',
                        url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/morderfromquick/set?l2-id=step0_pc_purchase_top_1',
                        headers: headers,
                        data: '',
                    }, 'euc-jp');
                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'GET',
                        url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/?l2-id=step0_pc_purchase_top_1',
                        headers: headers,
                        data: '',
                    }, 'euc-jp');
                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    doc = str2doc(res.body);

                    // set shipping address
                    doc = (await setShippingAddress(doc, cookie));

                    window.dd3 = doc;
                    window.redirects = 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/?l2-id=step0_pc_purchase_top_1';
                }
            }
            if (1 == 2) {
                var form = doc.forms[0];
                var fd = new FormData(form);
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('check_item%5B0%5D=true&item_key%5B0%5D=8ffe7efc31a77b5d02fd471f09eefc8f&units%5B0%5D=1&shop_bid=357621&short_flag=1&quickNormalize_flag=true&quickNormalizeUnification_flag=true&ssl=on');

                params.forEach((v, k) => {
                    console.log(k, fd.get(k));
                    if (k.indexOf('short_flag') == -1 || k.indexOf('quickNormalize_flag') == -1 || k.indexOf('quickNormalizeUnification_flag') == -1 || k.indexOf('ssl') == -1)
                        params.set(k, fd.get(k));
                });

                console.log('param check', params.toString());
                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/cart/set/?l2-id=step0_pc_purchase_top_1',
                    headers: headers,
                    data: params.toString(),
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                console.log(res);
                var redir = res.headers.location;
                console.log(redir);
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                console.log(res);
                doc = str2doc(res.body);

                window.dd3 = doc;

                window.redirects = redir;
            }
            if (1 == 2) {
                var form = doc.forms[0];
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('');

                elements.forEach(elem => {
                    if (elem.name != 'isNewUi' && (elem.nodeName == 'INPUT' || elem.nodeName == 'SELECT')) {
                        if (elem.name == 'return_url') {
                            params.append(elem.name, '/morderfromquick/set');
                        } else if (elem.name == 'login_submit') {
                            params.append(elem.name, 'replaceme_');
                        } else
                            params.append(elem.name, elem.value);
                    }
                });

                /*
                params.set('u', account.email);
                params.set('p', account.password);
                */
                params.set('u', 'a@g.cc');
                params.set('p', 'manko123');

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://grp01.id.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://grp01.id.rakuten.co.jp/rms/nid/vc?l2-id=step1_pc_next_top',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%A1%A1%A1%A1%BC%A1%A4%D8%A1%A1%A1%A1'),
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                console.log(res);
                var redir = res.headers.location;

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                redir = res.headers.location;

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                console.log(res);
                doc = str2doc(res.body);

                window.dd3 = doc;

                console.log('AAAAAAAAAAAAAAAAAA');
                console.log(redir);
                console.log('AAAAAAAAAAAAAAAAAA');

                window.redirects = redir;
            }
            if (1 == 2) {
                redir = 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/?l2-id=step1_pc_next_top';

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                res = await request({
                    method: 'GET',
                    url: redir,
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                console.log(res);
                doc = str2doc(res.body);

                window.dd3 = doc;

                console.log('AAAAAAAAAAAAAAAAAA');
                console.log(redir);
                console.log('AAAAAAAAAAAAAAAAAA');

                window.redirects = redir;
            }

            // not registered cc yet.
            var redir = window.redirects; // task['temporary']['redirects']
            //console.log('redirects: ' + redir);
            window.redirects = null;
            if (redir.indexOf('mconfirmorderquicknormalize/?l2-id=step0_pc_purchase_top_1') != -1) {
                //console.log('YEAFUAIHFUAGGGGGGGGGGGGGGGGGG');
            } else if (redir.indexOf('mconfirmorderquicknormalize/?l2-id=step1_pc_next_top') == -1) {
                {

                    var json = null;
                    var p1 = '{"fullCardDetails":{"cardNumber":"4737030024566712","expirationYear":"2020","expirationMonth":"04"},"serviceId":"jp-pc-basket","timestamp":"2019-03-10 16:13:15.294"}';

                    var headers = {
                        'Origin': 'https://payvault.global.rakuten.com',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'application/json',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Referer': 'https://payvault.global.rakuten.com/static/payvault/V2/gateway.html',
                        'Content-Type': 'application/json',
                    };
                    var res = await request({
                        method: 'POST',
                        url: 'https://payvault.global.rakuten.com/api/pv/Card/V2/Add',
                        headers: headers,
                        data: p1,
                    }, 'utf8');

                    json = JSON.parse(res.body);
                    console.log(json);



                    var form = doc.forms[0];
                    var fd = new FormData(form);
                    var action = form.action;
                    var elements = getFormElements(form);

                    var params = new URLSearchParams('tokenSeed=165cf15ca545a864660221aa38c6826a&add_card_shop=357621&success_regist_card=false&select_card_method_map%28357621%29=1_0&select_payment_map%28357621%29=10000&card_isform=true&card_brand=1&card_owner=626&select_card_installment_map%28357621%29=1&selectedShopId=357621&select_delivery_map%28357621%29=102&appdlvMap%28357621%29=true&dlv_day_type_map%28357621%29=none&freetextMap%28357621%29=&cardToken=19031007001TWiDCcwT3gk1j9O266712&keyVersion=1&expirationYear=2020&timestamp=2019-03-10+07%3A13%3A15.446&expirationMonth=04&signature=7595accc1582ca6f2d975d7f6a9dc13c3cd5b538a5d13b3151d5209837dd81d2&iin=473703&brandCode=Visa&last4digits=6712');

                    var carr = Object.getOwnPropertyNames(json);
                    carr.forEach((k) => {

                        if (k == 'maskedCardDetails') {
                            Object.getOwnPropertyNames(json[k]).forEach((k2) => {
                                params.set(k2, json[k][k2]);
                                console.log(k2, json[k][k2]);
                            });
                        } else
                            params.set(k, json[k]);
                    });

                    params.forEach((v, k) => {
                        if (k == 'dlvPaySubmit') {

                        } else if (k.indexOf('select_card_installment_ma') != -1) {

                        } else if (k.indexOf('fastest_my_delivery_date_ma') != -1) {

                        } else if (k.indexOf('select_delivery_map') != -1) {
                            params.set(k, '102');
                        } else if (k.indexOf('select_payment_map') != -1) {
                            params.set(k, '20000');
                        } else if (k.indexOf('dlv_day_type_map') != -1) {
                            params.set(k, 'day');
                        } else if (k.indexOf('deliveryTimeListMap') != -1) {
                            params.set(k, '1');
                        } else {
                            if (fd.get(k) != null)
                                params.set(k, fd.get(k));
                            else
                                params.set(k, "");
                        }
                    });

                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Origin': 'https://basket.step.rakuten.co.jp',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'POST',
                        url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mdlvpay/set',
                        headers: headers,
                        data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));
                    console.log(res);
                    doc = str2doc(res.body);

                    window.dodo = doc;
                } {
                    var form = doc.forms[0];
                    var fd = new FormData(form);
                    var action = form.action;
                    var elements = getFormElements(form);

                    var params = new URLSearchParams('tokenSeed=a74394034ec7e1778afcae7e1a2b2523&add_card_shop=&success_regist_card=false&dlvPaySubmit=%BC%A1%A4%D8&select_card_method_map%28357621%29=1_0&select_payment_map%28357621%29=10000&select_card_installment_map%28357621%29=1&selectedShopId=357621&select_delivery_map%28357621%29=102&appdlvMap%28357621%29=true&dlv_day_type_map%28357621%29=none&freetextMap%28357621%29=');

                    params.forEach((v, k) => {
                        if (k == 'dlvPaySubmit') {

                        } else if (k.indexOf('select_card_installment_ma') != -1) {

                        } else if (k.indexOf('fastest_my_delivery_date_ma') != -1) {

                        } else if (k.indexOf('select_delivery_map') != -1) {
                            params.set(k, '102');
                        } else if (k.indexOf('select_payment_map') != -1) {
                            params.set(k, '20000');
                        } else if (k.indexOf('dlv_day_type_map') != -1) {
                            params.set(k, 'day');
                        } else if (k.indexOf('deliveryTimeListMap') != -1) {
                            params.set(k, '1');
                        } else {
                            if (fd.get(k) != null)
                                params.set(k, fd.get(k));
                            else
                                params.set(k, "");
                        }
                    });

                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Origin': 'https://basket.step.rakuten.co.jp',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie,
                    };
                    var res = await request({
                        method: 'POST',
                        url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mdlvpay/set?l2-id=step3_pc_next',
                        headers: headers,
                        data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                    }, 'euc-jp');

                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));
                    console.log(res);
                    doc = str2doc(res.body);

                    var redir = res.headers.location;
                    console.log(redir);
                    if (redir !== undefined) {
                        var uparam = splitUrl(redir);

                        headers = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                            'Accept-Language': 'ja;q=1, en-US;q=0.9',
                            'Accept-Encoding': 'gzip, deflate',
                            'Cookie': cookie,
                        };
                        res = await request({
                            method: 'GET',
                            url: redir,
                            headers: headers,
                            data: '',
                        }, 'euc-jp');

                        ck = updateCookieStore(ck, cookie, res);
                        cookie = ck.getAll();

                        console.log(res);
                        doc = str2doc(res.body);
                    }
                }
            }

            {
                //doc = await addShippingAddress(doc, cookie);
            }
            // appendは同じキーが存在しても追記する、setは値を書き換える
            {
                // stop spamming
                if (1 == 1) {
                    console.log('DONE(not purchased): ' + ((new Date().getTime() - st) + 200));
                    return;
                }

                var form = doc.forms[0];
                var fd = new FormData(form);
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('commit=replaceme_');

                fd.forEach((v, k) => {
                    if (k != 'commit')
                        params.set(k, v);
                });

                //console.log(decodeURIComponent(params.toString().replace('replaceme_', '%C3%ED%CA%B8%A4%F2%B3%CE%C4%EA%A4%B9%A4%EB')));

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    url: 'https://basket.step.rakuten.co.jp/rms/mall/bs/mconfirmorderquicknormalize/set?l2-id=step4_pc_purchase',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%C3%ED%CA%B8%A4%F2%B3%CE%C4%EA%A4%B9%A4%EB'),
                }, 'euc-jp');

                ck = updateCookieStore(ck, cookie, res);
                cookie = ck.getAll();

                //console.log(res);
                doc = str2doc(res.body);

                window.doo = doc;

                if (res.headers.location.indexOf('/rms/mall/bs/commit/?l2-id=step4_pc_purchase') != -1) {
                    console.log('DONE: ' + (new Date().getTime() - st));
                    console.log(now() + ' -> purchased');

                    //注文ID : <span data-qa="order-number">357621-20190317-04583811</span>
                    break;
                }
            }
            //console.log('DONE: ' + (new Date()));

            break;
        } catch (e) {
            console.log(e);
            break;
        }
    }
}

async function spf1(args) {
    var task = args[0];
    var account = args[1];
    var proxy = args[2];

    var csrf = '';
    var cookie = '';
    var doc = null;
    var ldoc = null;

    var items = [];

    const snf0 = '<meta name="csrf-token" content="';

    var ck = createCookieStore();
    let d = new Date();

    await sleep(300);

    for (;;) {
        try {
            var req_urls = ['https://grp01.id.rakuten.co.jp/rms/nid/logini'];
            var p1 = new URLSearchParams('service_id=s227&u=a%40g.cc&p=manko123&submit=Login&pp_version=20170213&auto_logout=true&device_fp=&time_zone=-540&os_info=Win32&tokenSeed=6d1171c4d866f0b1e20c52a8476fd0e5&login_submit=%E3%80%80%E3%80%80%E6%AC%A1%E3%81%B8%E3%80%80%E3%80%80&return_url=%2Fmorderfromquick%2Fset&l2-id=step1_pc_next_top&sbId=1');

            if (1 == 2) {
                var headers = {
                    'Origin': 'https://grp01.id.rakuten.co.jp',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Referer': 'https://grp01.id.rakuten.co.jp/rms/nid/vc?__event=login&service_id=top',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: 'grp01.id.rakuten.co.jp',
                    port: 443,
                    path: '/rms/nid/logini',
                    headers: headers,
                    data: p1.toString(),
                });

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                console.log(res);
                var redir = res.headers.location;
                var uparam = splitUrl(redir);

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: uparam.hostname,
                    port: 443,
                    path: redir.replace('https://' + uparam.hostname, ''),
                    headers: headers,
                    data: '',
                });

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }
                console.log(res);
                return;
            } {
                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: 'www.rakuten.ne.jp',
                    port: 443,
                    path: '/gold/mitasneakers/', // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }
            }
            //item link
            {
                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: 'item.rakuten.co.jp',
                    port: 443,
                    path: '/project1-6/4530956576312/', // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }
                doc = str2doc(res.body);
                console.log(res);
            }
            console.log('START: ' + (new Date())); {
                var form = doc.querySelector('form#purchaseForm');
                var action = form.action;
                console.log(action);

                var params = new URLSearchParams('');

                // params
                var sizes = doc.querySelectorAll('span.inventory_choice_name');
                var inventories = doc.querySelectorAll('input[name="inventory_id"]');
                var units = doc.querySelector('input[name="units"]').value;
                units = "1";
                var event = doc.querySelector('input[name="__event"]').value;
                var shop_bid = doc.querySelector('input[name="shop_bid"]').value;
                var item_id = doc.querySelector('input[name="item_id"]').value;
                var inventory_flag = doc.querySelector('input[name="inventory_flag"]').value;

                if (inventories.length != 0) {
                    var choice = ((doc.querySelector('select[name="choice"] > option').value));
                    params.append("inventory_id", inventories[0].value);
                    params.append("choice", choice);
                }

                params.append("units", units);
                params.append("__event", event);
                params.append("shop_bid", shop_bid);
                params.append("item_id", item_id);
                params.append("inventory_flag", inventory_flag);


                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: 'basket.step.rakuten.co.jp',
                    port: 443,
                    path: '/rms/mall/bs/cartadd/set?l2-id=item_PC_AddCart_fix',
                    headers: headers,
                    data: params.toString(),
                }, 'euc-jp');

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                var redir = res.headers.location;
                console.log(res);

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: 'basket.step.rakuten.co.jp',
                    port: 443,
                    path: redir.replace('https://basket.step.rakuten.co.jp', ''),
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }
                doc = str2doc(res.body);
                console.log(res);
            } {
                var form = doc.forms[0];
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('');

                elements.forEach(elem => {
                    if (elem.name != 'isNewUi' && (elem.nodeName == 'INPUT' || elem.nodeName == 'SELECT'))
                        params.append(elem.name, elem.value);
                });

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: 'basket.step.rakuten.co.jp',
                    port: 443,
                    path: '/rms/mall/bs/cart/set/?l2-id=step0_pc_purchase_top_1',
                    headers: headers,
                    data: params.toString(),
                }, 'euc-jp');

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }
                console.log(res);
                var redir = res.headers.location;
                var uparam = splitUrl(redir);


                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                res = await request({
                    method: 'GET',
                    protocol: uparam.protocol,
                    hostname: uparam.hostname,
                    port: 443,
                    path: redir.replace('https://' + uparam.hostname, ''),
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                console.log(res);
                doc = str2doc(res.body);
            } {
                var form = doc.forms[0];
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('');

                elements.forEach(elem => {
                    if (elem.name != 'isNewUi' && (elem.nodeName == 'INPUT' || elem.nodeName == 'SELECT')) {
                        if (elem.name == 'return_url') {
                            params.append(elem.name, '/morderfromquick/set');
                        } else if (elem.name == 'login_submit') {
                            params.append(elem.name, 'replaceme_');
                        } else
                            params.append(elem.name, elem.value);
                    }
                });

                params.set('u', account.email);
                params.set('p', account.password);

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://grp01.id.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: 'grp01.id.rakuten.co.jp',
                    port: 443,
                    path: '/rms/nid/vc?l2-id=step1_pc_next_top',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%A1%A1%A1%A1%BC%A1%A4%D8%A1%A1%A1%A1'),
                }, 'euc-jp');

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                console.log(res);
                var redir = res.headers.location;
                var uparam = splitUrl(redir);


                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                res = await request({
                    method: 'GET',
                    protocol: uparam.protocol,
                    hostname: uparam.hostname,
                    port: 443,
                    path: redir.replace('https://' + uparam.hostname, ''),
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                redir = res.headers.location;
                uparam = splitUrl(redir);


                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                res = await request({
                    method: 'GET',
                    protocol: uparam.protocol,
                    hostname: uparam.hostname,
                    port: 443,
                    path: redir.replace('https://' + uparam.hostname, ''),
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }


                console.log(res);
                doc = str2doc(res.body);
            } {
                var form = doc.forms[0];
                var fd = new FormData(form);
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('tokenSeed=84298cae301219ede7505f0a7f1e85a5&add_card_shop=&success_regist_card=false&dlvPaySubmit=%BC%A1%A4%D8&card_brand_id=&select_payment_map%28241867%29=20000&selectedShopId=241867&select_delivery_map%28241867%29=102&appdlvMap%28241867%29=true&dlv_day_type_map%28241867%29=day&deliveryTimeListMap%28241867%29=1&isNewUi=true');

                params.forEach((v, k) => {
                    if (k == 'dlvPaySubmit') {

                    } else if (k.indexOf('select_card_installment_ma') != -1) {

                    } else if (k.indexOf('fastest_my_delivery_date_ma') != -1) {

                    } else if (k.indexOf('select_delivery_map') != -1) {
                        params.set(k, '102');
                    } else if (k.indexOf('select_payment_map') != -1) {
                        params.set(k, '20000');
                    } else if (k.indexOf('dlv_day_type_map') != -1) {
                        params.set(k, 'day');
                    } else if (k.indexOf('deliveryTimeListMap') != -1) {
                        params.set(k, '1');
                    } else {
                        params.set(k, fd.get(k));
                    }
                });

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: 'basket.step.rakuten.co.jp',
                    port: 443,
                    path: '/rms/mall/bs/mdlvpay/set?l2-id=step3_pc_next',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%BC%A1%A4%D8'),
                }, 'euc-jp');

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                console.log(params.toString().replace('replaceme_', '%BC%A1%A4%D8'));
                console.log(res);
                doc = str2doc(res.body);

                var redir = res.headers.location;
                if (redir !== undefined) {
                    var uparam = splitUrl(redir);

                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    res = await request({
                        method: 'GET',
                        protocol: uparam.protocol,
                        hostname: uparam.hostname,
                        port: 443,
                        path: redir.replace('https://' + uparam.hostname, ''),
                        headers: headers,
                        data: '',
                    }, 'euc-jp');

                    if (res.headers.hasOwnProperty('set-cookie')) {
                        var c = res.headers['set-cookie'];
                        ck.init(cookie);
                        for (var i = 0; i < c.length; i++) {
                            var base = c[i].substring(0, c[i].indexOf(';'))
                            var key = base.substring(0, base.indexOf('='));
                            var value = base.substring(base.indexOf('=') + 1);

                            if (ck.get(key) == undefined) {
                                ck.add(key, value);
                            } else if (ck.get(key) != undefined && ck.get(key) != value) {
                                ck.set(key, value);
                            }

                            cookie = ck.getAll();
                        }
                    }

                    console.log(res);
                    doc = str2doc(res.body);
                }
            } {
                var form = doc.forms[0];
                var fd = new FormData(form);
                var action = form.action;
                var elements = getFormElements(form);

                var params = new URLSearchParams('commit=replaceme_');

                fd.forEach((v, k) => {
                    params.set(k, v);
                });

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://basket.step.rakuten.co.jp',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: 'basket.step.rakuten.co.jp',
                    port: 443,
                    path: '/rms/mall/bs/mconfirmorderquicknormalize/set?l2-id=step4_pc_purchase',
                    headers: headers,
                    data: params.toString().replace('replaceme_', '%C3%ED%CA%B8%A4%F2%B3%CE%C4%EA%A4%B9%A4%EB'),
                }, 'euc-jp');

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                console.log(res);
                doc = str2doc(res.body);

                if (res.headers.location.indexOf('/rms/mall/bs/commit/?l2-id=step4_pc_purchase') != -1) {
                    console.log('\npurchased\n');
                    break;
                }
            }
            console.log('DONE: ' + (new Date()));
        } catch (ex) {

        }

        await sleep(500);
    }
}

async function ug_shaft() {
    var cookie = '';
    var doc = null;

    var ck = createCookieStore();

    var site = 'http://www.ug-shaft.jp/';
    // functions
    {
        function matchKeyWord(itemName, keywords) {
            var r = '(' + keywords.join('|').toLowerCase() + ')';
            var ar = itemName.toLowerCase().match(new RegExp(r, 'gm'));

            if (ar === null || ar.length != keywords.length)
                return false;
            return true;
        }
    }
    // login
    {
        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Referer': 'https://',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        };

        var email = 'c@suddenattack.ga',
            password = 'manko123';
        var p = new URLSearchParams('user_hash=&members_hash=&shop_id=PA01025132&members_id=&back_url=http%3A%2F%2Fwww.ug-shaft.jp%2F&login_email=c%40suddenattack.ga&login_password=manko123');

        p.set('login_email', email);
        p.set('login_password', password);
        p = p.toString();

        var res = await request({
            method: 'POST',
            headers: headers,
            url: 'https://members.shop-pro.jp/?mode=members_login',
            data: p
        });

        if (res.headers.location === undefined)
            return 1;
    }

    // main stuff
    {
        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Referer': 'https://',
            'Cookie': cookie,
        };

        var res = await request({
            method: 'GET',
            headers: headers,
            url: 'http://www.ug-shaft.jp/?mode=srh&cid=161578%2C0&keyword=&sort=n',
            data: ''
        });

        doc = str2doc(res.body);

        var prodcutNames = $(doc).find('span.prd-lst-name > a');
        prodcutNames.each(async(idx, elem) => {
            var itemName = $(elem).text().trim();

            var keyWords = ['chris', 'walken'];
            var style = ['black'],
                size = ['s'];
            if (matchKeyWord(itemName, keyWords)) {
                var itemPage = 'http://www.ug-shaft.jp/?pid=140511717'; //site + $(elem).attr('href');
                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Referer': 'https://',
                    'Cookie': cookie,
                };

                var res = await request({
                    method: 'GET',
                    headers: headers,
                    url: itemPage,
                    data: ''
                });

                doc = str2doc(res.body);

                var selects = $(doc).find('table.product-spec-table').find('select');
                var sizeColumn = selects.eq(0);
                var styleColumn = selects.eq(1);

                var mstyle = false,
                    msize = false;
                var ostyle = '',
                    osize = '';

                sizeColumn.find('option').each((idx, elem2) => {
                    if (matchKeyWord($(elem2).text().trim(), size)) {
                        osize = $(elem2).val();
                        msize = true;
                        return true;
                    }
                });
                styleColumn.find('option').each((idx, elem2) => {
                    if (matchKeyWord($(elem2).text().trim(), style)) {
                        ostyle = $(elem2).val();
                        mstyle = true;
                        return true;
                    }
                });

                if (!(mstyle && msize)) {

                }
            }
        });
    }

}
async function spf2() {
    var csrf = '';
    var cookie = '';
    var doc = null;
    var ldoc = null;

    var items = [];

    const snf0 = '<meta name="csrf-token" content="';

    var ck = createCookieStore();
    let d = new Date();

    var login_urls = ['https://members.shop-pro.jp/?mode=members&shop_id=PA01025132', 'https://members.shop-pro.jp/?mode=members_login'];
    var ref_url = '';

    {
        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'GET',
            protocol: 'https:',
            hostname: 'members.shop-pro.jp',
            port: 443,
            path: login_urls[0].replace('https://members.shop-pro.jp', ''), // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
            headers: headers,
            data: '',
        });

        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
        }

        ref_url = login_urls[0];

        doc = str2doc(res.body);

        var form = doc.forms[0];
        var fd = new FormData(form);
        var action = form.action;
        console.log(action);

        var params = new URLSearchParams('user_hash=&members_hash=&shop_id=PA01025132&members_id=&back_url=http%3A%2F%2Fwww.ug-shaft.jp%2F&login_email=nubotay%40utoo.email&login_password=manko123');

        // option1 = size, option2 = color

        // params
        params.forEach((v, k) => {
            if (k == 'login_email') {
                params.set(k, 'nubotay@utoo.email');
            } else if (k == 'login_password') {
                params.set(k, 'manko123');
            } else if (fd.get(k) == null) {
                //params.delete(k);
            } else
                params.set(k, fd.get(k));
        });

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Origin': 'https://members.shop-pro.jp',
            'Referer': ref_url,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'POST',
            protocol: 'https:',
            hostname: 'members.shop-pro.jp',
            port: 443,
            path: login_urls[1].replace('https://members.shop-pro.jp', ''),
            headers: headers,
            data: params.toString(),
        });

        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
        }

        ref_url = login_urls[1];


        var redir = res.headers.location;
        var uparam = splitUrl(redir);

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Referer': ref_url,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Cookie': cookie,
        };
        res = await request({
            method: 'GET',
            protocol: 'http:',
            hostname: uparam.hostname,
            port: 80,
            path: redir.replace('https://' + uparam.hostname, ''),
            headers: headers,
            data: '',
        });
        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
        }
    }

    return; {
        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'GET',
            protocol: 'http:',
            hostname: 'www.ug-shaft.jp',
            port: 80,
            path: '/?pid=138704243', // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
            headers: headers,
            data: '',
        });

        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
        }

        ref_url = 'http://www.ug-shaft.jp/?pid=138704243';

        console.log(cookie);
        console.log(str2doc(res.body));
        doc = str2doc(res.body);
    }

    {
        var form = doc.forms[0];
        var fd = new FormData(form);
        var action = form.action;
        console.log(action);

        var params = new URLSearchParams(decodeURIComponent('option1=69878866%2C0&option2=69878867%2C1&product_num=1&user_hash=98d6755ffac43854b154d7730de68e9d&regi_hash=bfccedffb36051d3f7ff97d7e95859&members_hash=98d6755ffac43854b154d7730de68e9d&shop_id=PA01025132&product_id=136643336&members_id=68520849&back_url=http%3A%2F%2Fwww.ug-shaft.jp%2F%3Fpid%3D136643336&reference_token=4dc9d91f7d594c328a69f6091427065f&jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzaG9wLXByby5qcCIsInN1YiI6IjY4NTIwODQ5IiwiYXVkIjoiYXBpLnNob3AtcHJvLmpwIiwiZXhwIjoxNTQ4MDY5NjE2LCJpYXQiOjE1NDc5ODMyMTZ9.ja5Hg2iLLRBbCz0wX12Kgx6nLsUOZE3NV80GYqdpP8Q'));

        // option1 = size, option2 = color

        // params
        params.forEach((v, k) => {
            if (k == 'option1') {
                params.set(k, '70379441,2');
            } else if (k == 'option2') {
                params.set(k, '70379442,0');
            } else if (fd.get(k) == null) {
                //params.delete(k);
            } else
                params.set(k, fd.get(k));
        });

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Origin': 'https://secure.shop-pro.jp',
            'Referer': ref_url,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'POST',
            protocol: 'https:',
            hostname: 'secure.shop-pro.jp',
            port: 443,
            path: '/?mode=cart_inn',
            headers: headers,
            data: params.toString(),
        });

        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
        }

        ref_url = 'https://secure.shop-pro.jp/?mode=cart_inn';

        doc = str2doc(res.body);
        console.log(params.toString());

        form = doc.forms[0];
        fd = new FormData(form);

        params = new URLSearchParams(decodeURIComponent('user_hash=98d6755ffac43854b154d7730de68e9d&shop_id=PA01025132&members_id=68520849&back_url=http%3A%2F%2Fwww.ug-shaft.jp%2F%3Fpid%3D136643336&shopcoupon_code=&del_seq_num=&seq_num%5B%5D=1&product_num%5B%5D=1'));
        // params
        params.forEach((v, k) => {
            if (fd.get(k) == null) {
                //params.delete(k);
            } else
                params.set(k, fd.get(k));
        });

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Origin': 'https://secure.shop-pro.jp',
            'Referer': ref_url,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'POST',
            protocol: 'https:',
            hostname: 'secure.shop-pro.jp',
            port: 443,
            path: '/?mode=regi_bgn',
            headers: headers,
            data: params.toString(),
        });

        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
        }

        ref_url = 'https://secure.shop-pro.jp/?mode=regi_bgn';

        doc = str2doc(res.body);
        console.log(params.toString());

        form = doc.forms[0];
        fd = new FormData(form);

        params = new URLSearchParams('user_hash=98d6755ffac43854b154d7730de68e9d&shop_id=PA01025132&members_id=68520849&back_url=http%3A%2F%2Fwww.ug-shaft.jp%2F&shopcoupon_code=&csrf_token=9ab623838b30718103c70248bccdf8c04ec6e4bb9be63ceba1768b4ab56f4c692905b456892beea5efd5f4072b7db5f9f5b018a56ec8340a9bc9c36705ba8500&login_priority=shop&customer_id=68520849&name=%B2%AC%CB%DC+%BD%C5%BF%AE&furigana=%A5%AA%A5%AB%A5%E2%A5%C8+%A5%B7%A5%B2%A5%CE%A5%D6&postal=0020861&pref_id=1&address1=%BB%A5%CB%DA%BB%D4%CB%CC%B6%E8%C6%D6%C5%C4%BD%BD%B0%EC%BE%F2444&address2=&tel=03-0000-1111&mo_tel=&merumaga=0&stock_point=0&delivery_kbn=1');
        // params
        params.forEach((v, k) => {
            if (k == 'login_priority')
                return;

            if (k == 'customer_id') {
                // params.set(k, fd.get(''));
            }

            if (fd.get(k) == null) {
                //params.delete(k);
            } else
                params.set(k, fd.get(k));
        });

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Origin': 'https://secure.shop-pro.jp',
            'Referer': ref_url,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'POST',
            protocol: 'https:',
            hostname: 'secure.shop-pro.jp',
            port: 443,
            path: '/?mode=cust_input_end',
            headers: headers,
            data: params.toString(),
        });

        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
        }

        ref_url = 'https://secure.shop-pro.jp/?mode=cust_input_end';

        doc = str2doc(res.body);
        console.log(params.toString());

        form = doc.forms[0];
        fd = new FormData(form);

        params = new URLSearchParams('user_hash=98d6755ffac43854b154d7730de68e9d&shop_id=PA01025132&members_id=68520849&back_url=http%3A%2F%2Fwww.ug-shaft.jp%2F&shopcoupon_code=&csrf_token=9ab623838b30718103c70248bccdf8c04ec6e4bb9be63ceba1768b4ab56f4c692905b456892beea5efd5f4072b7db5f9f5b018a56ec8340a9bc9c36705ba8500&delivery_id=29855&name=%B2%AC%CB%DC+%BD%C5%BF%AE&furigana=%A5%AA%A5%AB%A5%E2%A5%C8+%A5%B7%A5%B2%A5%CE%A5%D6&postal=0020861&pref_id=1&address1=%BB%A5%CB%DA%BB%D4%CB%CC%B6%E8%C6%D6%C5%C4%BD%BD%B0%EC%BE%F2444&address2=&tel=03-0000-1111&send_wish_date=&send_wish_time_sel=&other=&senduser_flg=1&senduser_seq_num=');
        // params
        params.forEach((v, k) => {
            if (fd.get(k) == null) {
                //params.delete(k);
            } else
                params.set(k, fd.get(k));
        });

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Origin': 'https://secure.shop-pro.jp',
            'Referer': ref_url,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'POST',
            protocol: 'https:',
            hostname: 'secure.shop-pro.jp',
            port: 443,
            path: '/?mode=delivery_input_end',
            headers: headers,
            data: params.toString(),
        });

        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
        }

        ref_url = 'https://secure.shop-pro.jp/?mode=delivery_input_end';

        doc = str2doc(res.body);
        console.log(params.toString());


        form = doc.forms[0];
        fd = new FormData(form);

        params = new URLSearchParams('user_hash=98d6755ffac43854b154d7730de68e9d&shop_id=PA01025132&members_id=68520849&back_url=http%3A%2F%2Fwww.ug-shaft.jp%2F&shopcoupon_code=&csrf_token=9ab623838b30718103c70248bccdf8c04ec6e4bb9be63ceba1768b4ab56f4c692905b456892beea5efd5f4072b7db5f9f5b018a56ec8340a9bc9c36705ba8500&customer_id=68520849&login_priority=shop&use_point=0&stock_point=0&shopcoupon_code=&payment_id=163752');
        // params
        params.forEach((v, k) => {
            if (fd.get(k) == null) {
                //params.delete(k);
            } else
                params.set(k, fd.get(k));
        });

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Origin': 'https://secure.shop-pro.jp',
            'Referer': ref_url,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'POST',
            protocol: 'https:',
            hostname: 'secure.shop-pro.jp',
            port: 443,
            path: '/?mode=payment_input_end',
            headers: headers,
            data: params.toString(),
        });

        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
        }

        ref_url = 'https://secure.shop-pro.jp/?mode=payment_input_end';

        doc = str2doc(res.body);
        console.log(params.toString());

        form = doc.forms[0];
        fd = new FormData(form);

        params = new URLSearchParams('user_hash=98d6755ffac43854b154d7730de68e9d&shop_id=PA01025132&members_id=68520849&back_url=http%3A%2F%2Fwww.ug-shaft.jp%2F&shopcoupon_code=&csrf_token=9ab623838b30718103c70248bccdf8c04ec6e4bb9be63ceba1768b4ab56f4c692905b456892beea5efd5f4072b7db5f9f5b018a56ec8340a9bc9c36705ba8500&payment_id=163752&uniqid=abc8d9c2dcfe5c5aa3e7cc3aba351aa50893b0413abc351b70d4b97b526c2f303c007ccf62256033a997268eabcaf51491972b78837873e13628c0e4e5d63d8f');
        // params
        params.forEach((v, k) => {
            if (fd.get(k) == null) {
                //params.delete(k);
            } else
                params.set(k, fd.get(k));
        });

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Origin': 'https://secure.shop-pro.jp',
            'Referer': ref_url,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'POST',
            protocol: 'https:',
            hostname: 'secure.shop-pro.jp',
            port: 443,
            path: '/?mode=confirm_end',
            headers: headers,
            data: params.toString(),
        });

        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
        }

        doc = str2doc(res.body);
        console.log(params.toString());

        console.log('fin');
    }
}

function findTask(task_id) {
    var o = null;
    lazyb.tasks.forEach(obj => {
        if (obj.id == task_id)
            o = obj;
    });
    return o;
}

function findTaskIndex(task_id) {
    var idx = 0;
    lazyb.tasks.forEach((obj, n) => {
        if (obj.id == task_id) {
            idx = n;
            return true;
        }
    });
    return idx;
}

function findAccount(account_id) {
    var o = null;
    lazyb.accounts.forEach(obj => {
        if (obj.id == account_id)
            o = obj;
    });
    return o;
}

function findAccountIndex(account_id) {
    var idx = 0;
    lazyb.accounts.forEach((obj, n) => {
        if (obj.id == account_id) {
            idx = n;
            return true;
        }
    });
    return idx;
}

function findProxy(proxy_id) {
    var o = null;
    lazyb.proxies.forEach(obj => {
        if (obj.id == proxy_id)
            o = obj;
    });
    return o;
}

function findBilling(billing_id) {
    var o = null;
    lazyb.billings.forEach(obj => {
        if (obj.id == billing_id)
            o = obj;
    });
    return o;
}

window.exec = async function(task_id, rid) {
    var task = findTask(task_id);
    var account = findAccount(task.account_id);
    var proxy = findProxy(task.proxy_id);
    var billing = findBilling(task.billing_id);

    var args = [task, account, proxy, billing];

    if (rid == 1) {
        var task_idx = findTaskIndex(task_id);
        lazyb.tasks[task_idx].notify_child = async(task_id, status) => {
            if (status == 'running') {
                // need to wait for the start time
                /*
                if (task.startTime.getTime() - new Date().getTime() <= 0)
                break;
                */

                var task_idx = findTaskIndex(task_id);
                var task = findTask(task_id);
                var account = findAccount(task.account_id);
                var proxy = findProxy(task.proxy_id);
                var billing = findBilling(task.billing_id);

                var args = [task, account, proxy, billing];

                lazyb.tasks[task_idx].invoked = true;

                var token = '';
                console.log('RUNNING TASK');

                for (;;) {
                    if (!lazyb.tasks[task_idx].running) {
                        console.log('SUSPENDED TASK');

                        lazyb.tasks[task_idx].invoked = false;
                        //lazyb.tasks[task_idx].allow_ctrl = false;

                        if (lazyb.tasks[task_idx].notify_main != null)
                            lazyb.tasks[task_idx].notify_main(task_id, 'suspended');
                        return;
                    } else {
                        if (lazyb_captcha['tokens'].length != 0) {
                            token = lazyb_captcha['tokens'].slice(-1)[0].response;
                            lazyb_captcha['tokens'].pop();

                            lazyb.tasks[task_idx].token = token;
                            break;
                        }
                    }
                    await sleep(1);
                }

                lazyb.tasks[task_idx].allow_ctrl = false;
                // time
                for (;;) {
                    if (task.startTime.getTime() - new Date().getTime() <= 0)
                        break;
                    await sleep(1);
                }

                await supyo(args, token);

                if (lazyb.tasks[task_idx].notify_main != null)
                    lazyb.tasks[task_idx].notify_main(task_id, 'done');
            }
        };
    } else if (rid == 203) {
        var task_idx = findTaskIndex(task_id);
        lazyb.tasks[task_idx].notify_child = async(task_id, status) => {
            if (status == 'running') {
                var task = findTask(task_id);
                var account = findAccount(task.account_id);
                var proxy = findProxy(task.proxy_id);
                var billing = findBilling(task.billing_id);

                var task_idx = findTaskIndex(task_id);
                var account_idx = findAccountIndex(task.account_id);

                var logined = false;

                var args = [task, account, proxy, billing];

                lazyb.tasks[task_idx].invoked = true;

                console.log('RUNNING TASK');

                // time
                if (!task.options.restock) {
                    for (;;) {
                        if (!lazyb.tasks[task_idx].running) {
                            console.log('SUSPENDED TASK');

                            lazyb.tasks[task_idx].invoked = false;

                            if (lazyb.tasks[task_idx].notify_main != null)
                                lazyb.tasks[task_idx].notify_main(task_id, 'suspended');
                            return;
                        } else {
                            if (task.startTime.getTime() - new Date().getTime() <= 0)
                                break;
                            else if (!logined && task.startTime.getTime() - new Date().getTime() <= 20 * 1000) {
                                if (lazyb.accounts[account_idx].temporary.cookie == '') {
                                    lazyb.accounts[account_idx].temporary.cookie = '1';
                                    var queue_id = lazyb.queues.types['1'].length;
                                    var queue_id2 = lazyb.queues.types['2'].length;
                                    lazyb.queues.types['1'].push({
                                        task_id: task.id,
                                        retailer_id: 203,
                                    });
                                    lazyb.queues.types['2'].push({
                                        task_id: task.id,
                                        retailer_id: 203,
                                    });

                                    await rakutenLogin(args);
                                    lazyb.queues.types['1'].splice(queue_id, 1);
                                    lazyb.queues.types['2'].splice(queue_id2, 1);

                                    logined = true;
                                } else {
                                    logined = true;
                                }
                            }
                        }
                        await sleep(1);
                    }

                    // wait in a queue
                    while (true) {
                        var wait = false;
                        lazyb.queues.types['1'].forEach((v, idx) => {
                            if (lazyb.queues.types['1'][idx].retailer_id == 203) {
                                wait = true;
                            }
                        });
                        if (!wait)
                            break;
                        await sleep(1);
                    }
                    while (true) {
                        var wait = false;
                        lazyb.queues.types['2'].forEach((v, idx) => {
                            if (lazyb.queues.types['2'][idx].retailer_id == 203) {
                                wait = true;
                            }
                        });
                        if (!wait)
                            break;
                        await sleep(1);
                    }

                    Log(now() + ' -> task[' + task.id + ']: started');

                    var tt = new Date().getTime();

                    /*
                    var queue_id = lazyb.queues.types['1'].length;
                    lazyb.queues.types['1'].push({
                        task_id: task.id,
                        retailer_id: 203,
                    });
*/
                    lazyb.tasks[task_idx].allow_ctrl = false;

                    try {
                        await rakutenCartIn(args);
                        await rakutenCheckOut(args);


                        lazyb.queues.types['1'].forEach((v, idx) => {
                            if (lazyb.queues.types['1'][idx].retailer_id == 203 && lazyb.queues.types['1'][idx].task_id == task.id)
                                lazyb.queues.types['1'].splice(idx, 1);
                        });
                        lazyb.queues.types['2'].forEach((v, idx) => {
                            if (lazyb.queues.types['2'][idx].retailer_id == 203 && lazyb.queues.types['2'][idx].task_id == task.id)
                                lazyb.queues.types['2'].splice(idx, 1);
                        });

                    } catch (ex) {
                        lazyb.queues.types['1'].forEach((v, idx) => {
                            if (lazyb.queues.types['1'][idx].retailer_id == 203 && lazyb.queues.types['1'][idx].task_id == task.id)
                                lazyb.queues.types['1'].splice(idx, 1);
                        });
                        lazyb.queues.types['2'].forEach((v, idx) => {
                            if (lazyb.queues.types['2'][idx].retailer_id == 203 && lazyb.queues.types['2'][idx].task_id == task.id)
                                lazyb.queues.types['2'].splice(idx, 1);
                        });

                    }

                    lazyb.queues.types['1'].splice(queue_id, 1);
                    Log(now() + ' -> task[' + task.id + ']: finished[' + new Date().getTime() - tt + ']');

                    if (lazyb.tasks[task_idx].notify_main != null)
                        lazyb.tasks[task_idx].notify_main(task_id, 'done');
                } else {

                    // wait in a queue
                    while (true) {
                        var wait = false;
                        lazyb.queues.types['1'].forEach((v, idx) => {
                            if (lazyb.queues.types['1'][idx].retailer_id == 203) {
                                wait = true;
                            }
                        });
                        if (!wait)
                            break;
                        await sleep(1);
                    }
                    while (true) {
                        var wait = false;
                        lazyb.queues.types['2'].forEach((v, idx) => {
                            if (lazyb.queues.types['2'][idx].retailer_id == 203) {
                                wait = true;
                            }
                        });
                        if (!wait)
                            break;
                        await sleep(1);
                    }


                    Log(now() + ' task[' + task.id + ']: started');

                    var tt = new Date().getTime();

                    /*
                          var queue_id = lazyb.queues.types['1'].length;
                    lazyb.queues.types['1'].push({
                        task_id: task.id,
                        retailer_id: 203,
                    });
                    */
                    if (lazyb.accounts[account_idx].temporary.cookie == '') {
                        lazyb.accounts[account_idx].temporary.cookie = '1';
                        var queue_id = lazyb.queues.types['1'].length;
                        var queue_id2 = lazyb.queues.types['2'].length;
                        lazyb.queues.types['1'].push({
                            task_id: task.id,
                            retailer_id: 203,
                        });
                        lazyb.queues.types['2'].push({
                            task_id: task.id,
                            retailer_id: 203,
                        });

                        await rakutenLogin(args);
                        lazyb.queues.types['1'].splice(queue_id, 1);
                        lazyb.queues.types['2'].splice(queue_id2, 1);

                    } else {}

                    lazyb.tasks[task_idx].allow_ctrl = false;


                    try {
                        await rakutenCartIn(args);
                        await rakutenCheckOut(args);


                        lazyb.queues.types['1'].forEach((v, idx) => {
                            if (lazyb.queues.types['1'][idx].retailer_id == 203 && lazyb.queues.types['1'][idx].task_id == task.id)
                                lazyb.queues.types['1'].splice(idx, 1);
                        });
                        lazyb.queues.types['2'].forEach((v, idx) => {
                            if (lazyb.queues.types['2'][idx].retailer_id == 203 && lazyb.queues.types['2'][idx].task_id == task.id)
                                lazyb.queues.types['2'].splice(idx, 1);
                        });

                        Log(now() + ' -> task[' + task.id + ']: finished[' + new Date().getTime() - tt + ']');

                        if (lazyb.tasks[task_idx].notify_main != null)
                            lazyb.tasks[task_idx].notify_main(task_id, 'done');
                    } catch (ex) {

                        lazyb.queues.types['1'].forEach((v, idx) => {
                            if (lazyb.queues.types['1'][idx].retailer_id == 203 && lazyb.queues.types['1'][idx].task_id == task.id)
                                lazyb.queues.types['1'].splice(idx, 1);
                        });
                        lazyb.queues.types['2'].forEach((v, idx) => {
                            if (lazyb.queues.types['2'][idx].retailer_id == 203 && lazyb.queues.types['2'][idx].task_id == task.id)
                                lazyb.queues.types['2'].splice(idx, 1);
                        });
                    }
                }
            }
        };
    } else if (rid == 3) {
        for (;;) {
            if (task.startTime.getTime() - new Date().getTime() <= 0)
                break;
            await sleep(5);
        }
        await spf3(args);
    } else if (rid == 2) {

    } else if (rid == 4) {
        await spf4(args);
    } else if (rid == 6) {
        for (;;) {
            if (task.startTime.getTime() - new Date().getTime() <= 0)
                break;
            await sleep(5);
        }
        await spf1(args);
    } else if (rid == 1111) {
        for (;;) {
            if (task.startTime.getTime() - new Date().getTime() <= 0)
                break;
            await sleep(5);
        }
        await google(args);
    }
}

async function google(args) {
    var task = args[0];
    var account = args[1];
    var proxy = args[2];

    var hostname = 'www.google.com';

    var headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ja;q=1, en-US;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Cookie': '',
    };
    var res = null;
    if (proxy == null) {
        res = await request({
            method: 'GET',
            protocol: 'https:',
            hostname: hostname,
            port: 443,
            path: '/', // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
            headers: headers,
            data: '',
        }, 'shift_jis');
    } else {
        res = await prequest({
            method: 'GET',
            protocol: 'https:',
            hostname: hostname,
            port: 443,
            path: '/', // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
            headers: headers,
            data: '',
        }, 'shift_jis', proxy.host, proxy.port);
    }

    console.log(res);
}

async function spf7() {
    var cookie = '';
    var doc = null;

    var ck = createCookieStore();

    var hostnames = ['www.billys-tokyo.net'];
    var login_paths = ['/shop/customer/menu.aspx'];
    var req_paths = ['/shop/cart/cart.aspx', '/shop/order/method.aspx', '/shop/order/estimate.aspx'];
    var ref_url = '';

    var proxy = null;
    try {
        console.log(new Date());
        cookie = ''; {
            if (1 == 1) {
                var params = new URLSearchParams('uid=a%40suddenattack.ga&pwd=manko123&order.x=84&order.y=21');

                params.set('uid', 'a@suddenattack.ga');
                params.set('pwd', 'manko123');

                console.log(params.toString());

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Origin': 'https://www.billys-tokyo.net',
                    'Referer': 'https://www.billys-tokyo.net/shop/customer/menu.aspx',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': params.toString().length,
                    'Cookie': cookie,
                };
                var res = null;
                if (1 == 1) {
                    res = await request({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostnames[0],
                        port: 443,
                        path: login_paths[1],
                        headers: headers,
                        data: params.toString(),
                    }, 'shift_jis');
                } else {
                    res = await prequest({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostnames[0],
                        port: 443,
                        path: login_paths[1],
                        headers: headers,
                        data: params.toString(),
                    }, 'shift_jis', proxy.host, proxy.port);
                }

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                console.log(res);
            }

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = null;
            if (1 == 1) {
                res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/shop/g/g5838400006044/',
                    headers: headers,
                    data: '',
                }, 'shift_jis');
            } else {
                res = await prequest({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/shop/g/g5838400006044/',
                    headers: headers,
                    data: '',
                }, 'shift_jis', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }


            doc = str2doc(res.body);
            console.log(doc);
        }

        // add cat
        {
            var form = doc.querySelector('form[name="frm"]');
            var options = form.querySelectorAll('select > option');

            var params = new URLSearchParams('goods=5074070012050&x=154&y=19');
            var x = randRange(10, 100),
                y = randRange(10, 100);


            var goods = '';
            var size = '27.5CM';
            options.forEach(elem => {
                var text = elem.textContent.trim();
                if (text.indexOf('CM') != -1) {
                    var vs = text.substr(0, text.indexOf('CM') + 2);

                    if (vs == size) {
                        goods = elem.value;
                        console.log(vs, goods);
                    }
                }
            });


            params.set('goods', goods);
            params.set('x', x);
            params.set('y', y);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://www.billys-tokyo.net',
                'Referer': 'https://www.billys-tokyo.net/shop/customer/menu.aspx',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': params.toString().length,
                'Cookie': cookie,
            };
            var res = null;
            if (1 == 1) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[0],
                    headers: headers,
                    data: params.toString(),
                }, 'shift_jis');
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[0],
                    headers: headers,
                    data: params.toString(),
                }, 'shift_jis', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            doc = str2doc(res.body);
            console.log(params.toString());
            console.log(doc);
            var doc33 = doc;


            var form = doc.forms[1];
            var fd = new FormData(form);

            try {
                var kk = form.innerText;
            } catch (ex) {
                var thr = null;
                thr.ERROR_001 = 0;
            }

            params = new URLSearchParams('refresh=true&rowcart1=727780&rowgoods1=5905270001049&qty1=1&submit.x=106&submit.y=22');
            // params
            params.forEach((v, k) => {
                if (fd.get(k) == null) {
                    //params.delete(k);
                } else
                    params.set(k, fd.get(k));

                console.log(k, fd.get(k));
            });

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://www.billys-tokyo.net',
                'Referer': ref_url,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res = null;
            if (proxy == null) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[0],
                    headers: headers,
                    data: params.toString(),
                });
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[0],
                    headers: headers,
                    data: params.toString(),
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            ref_url = 'https://' + hostname + req_paths[0];

            console.log(params.toString());
            console.log(res);

            var redir = 'https://' + hostname + res.headers.location;
            var uparam = splitUrl(redir);

            try {
                var kk = uparam.protocol;
            } catch (ex) {
                var thr = null;
                thr.ERROR_002 = 0;
            }
            console.log(redir, uparam);

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            if (proxy == null) {
                res = await request({
                    method: 'GET',
                    protocol: uparam.protocol,
                    hostname: uparam.hostname,
                    port: 443,
                    path: redir.replace('https://' + uparam.hostname, ''),
                    headers: headers,
                    data: '',
                }, 'shift_jis');
            } else {
                res = await prequest({
                    method: 'GET',
                    protocol: uparam.protocol,
                    hostname: uparam.hostname,
                    port: 443,
                    path: redir.replace('https://' + uparam.hostname, ''),
                    headers: headers,
                    data: '',
                }, 'shift_jis', proxy.host, proxy.port);
            }
            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
                ref_url = 'https://www.billys-tokyo.net' + req_paths[0];

                doc = str2doc(res.body);

            }
        }


        {

            if (1 == 1) {
                form = doc.forms[1];
                fd = new FormData(form);

                params = new URLSearchParams('mode=&dest=0&rowgoods1=5905270001049&qty1=1&refresh=true&method=2&submit.x=76&submit.y=22');
                // params
                params.forEach((v, k) => {
                    if (k == 'uid') {
                        params.set(k, account.email);
                    } else if (k == 'pwd') {
                        params.set(k, account.password);
                    } else if (fd.get(k) == null) {
                        //params.delete(k);
                    } else
                        params.set(k, fd.get(k));
                });


                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Referer': ref_url,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = null;
                if (proxy == null) {
                    res = await request({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostname,
                        port: 443,
                        path: req_paths[1],
                        headers: headers,
                        data: params.toString(),
                    });
                } else {
                    res = await prequest({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostname,
                        port: 443,
                        path: req_paths[1],
                        headers: headers,
                        data: params.toString(),
                    }, 'utf8', proxy.host, proxy.port);
                }

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                ref_url = 'https://' + hostname + req_paths[1];

                console.log(params.toString());
                console.log(res);

                redir = 'https://' + hostname + res.headers.location;
                uparam = splitUrl(redir);
                console.log(redir, uparam);

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                if (proxy == null) {
                    res = await request({
                        method: 'GET',
                        protocol: uparam.protocol,
                        hostname: uparam.hostname,
                        port: 443,
                        path: redir.replace('https://' + uparam.hostname, ''),
                        headers: headers,
                        data: '',
                    }, 'shift_jis');
                } else {
                    res = await prequest({
                        method: 'GET',
                        protocol: uparam.protocol,
                        hostname: uparam.hostname,
                        port: 443,
                        path: redir.replace('https://' + uparam.hostname, ''),
                        headers: headers,
                        data: '',
                    }, 'shift_jis', proxy.host, proxy.port);
                }
                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }
            }

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            if (proxy == null) {
                res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostname,
                    port: 443,
                    path: req_paths[1],
                    headers: headers,
                    data: '',
                }, 'shift_jis');
            } else {
                res = await prequest({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostname,
                    port: 443,
                    path: req_paths[1],
                    headers: headers,
                    data: '',
                }, 'shift_jis', proxy.host, proxy.port);
            }
            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            doc = str2doc(res.body);

        }

        {
            ref_url = 'https://www.billys-tokyo.net' + req_paths[1];

            doc = str2doc(res.body);
            console.log(params.toString());


            form = doc.forms[0];
            fd = new FormData(form);

            params = new URLSearchParams('mode=&dest=0&rowgoods1=5905270001049&qty1=1&refresh=true&method=2&submit.x=76&submit.y=22');
            // params
            params.forEach((v, k) => {
                if (fd.get(k) == null) {
                    //params.delete(k);
                } else
                    params.set(k, fd.get(k));
            });

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://www.billys-tokyo.net',
                'Referer': ref_url,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res = null;
            if (proxy == null) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostname,
                    port: 443,
                    path: req_paths[1],
                    headers: headers,
                    data: params.toString(),
                });
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostname,
                    port: 443,
                    path: req_paths[1],
                    headers: headers,
                    data: params.toString(),
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            ref_url = 'https://' + hostname + req_paths[1];

            console.log(params.toString());
            console.log(res);

            redir = 'https://' + hostname + res.headers.location;
            uparam = splitUrl(redir);
            console.log(redir, uparam);

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            if (proxy == null) {
                res = await request({
                    method: 'GET',
                    protocol: uparam.protocol,
                    hostname: uparam.hostname,
                    port: 443,
                    path: redir.replace('https://' + uparam.hostname, ''),
                    headers: headers,
                    data: '',
                }, 'shift_jis');
            } else {
                res = await prequest({
                    method: 'GET',
                    protocol: uparam.protocol,
                    hostname: uparam.hostname,
                    port: 443,
                    path: redir.replace('https://' + uparam.hostname, ''),
                    headers: headers,
                    data: '',
                }, 'shift_jis', proxy.host, proxy.port);
            }
            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            doc = str2doc(res.body);
        }

        {
            ref_url = 'https://www.billys-tokyo.net' + req_paths[1];

            doc = str2doc(res.body);
            console.log(params.toString());


            form = doc.forms[0];
            fd = new FormData(form);

            params = new URLSearchParams('estimate=220124&comment=&crsirefo_hidden=1839782e14d65f79391ca9e09c01bdc32b4c2dd1ef85b55c3e3e452e10ab8193&submit.x=55&submit.y=5');
            // params
            params.forEach((v, k) => {
                if (fd.get(k) == null) {
                    //params.delete(k);
                } else
                    params.set(k, fd.get(k));
            });

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://www.billys-tokyo.net',
                'Referer': ref_url,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res = null;
            if (proxy == null) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostname,
                    port: 443,
                    path: req_paths[2],
                    headers: headers,
                    data: params.toString(),
                });
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostname,
                    port: 443,
                    path: req_paths[2],
                    headers: headers,
                    data: params.toString(),
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            ref_url = 'https://' + hostname + req_paths[2];

            console.log(params.toString());
            console.log(res);

            redir = 'https://' + hostname + res.headers.location;
            uparam = splitUrl(redir);
            console.log(redir, uparam);

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            if (proxy == null) {
                res = await request({
                    method: 'GET',
                    protocol: uparam.protocol,
                    hostname: uparam.hostname,
                    port: 443,
                    path: redir.replace('https://' + uparam.hostname, ''),
                    headers: headers,
                    data: '',
                }, 'shift_jis');
            } else {
                res = await prequest({
                    method: 'GET',
                    protocol: uparam.protocol,
                    hostname: uparam.hostname,
                    port: 443,
                    path: redir.replace('https://' + uparam.hostname, ''),
                    headers: headers,
                    data: '',
                }, 'shift_jis', proxy.host, proxy.port);
            }
            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            doc = str2doc(res.body);
            console.log(doc);
        }

        //break;
    } catch (ex) {
        console.log(ex);
    }
}
async function spf6() {
    var cookie = '';
    var doc = null;

    var ck = createCookieStore();

    var hostnames = ['www.yamaotoko.jp', 'www.makeshop.jp'];
    var req_paths = [
        '/ssl/?ssltype=login&db=yamaotoko',
        '/shop/basket.html',
        '/ssl/?ssltype=order&db=yamaotoko&_ga=2.42715301.1227585242.1548734981-2017845956.1548734981'
    ];

    try {
        console.log(new Date());
        cookie = ''; {
            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = null;
            if (1 == 1) {
                res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/index.html',
                    headers: headers,
                    data: '',
                }, 'euc-jp');
            } else {
                res = await prequest({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/index.html',
                    headers: headers,
                    data: '',
                }, 'euc-jp', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            console.log(cookie);

            var params = new URLSearchParams('type=login&code=&brandcode=&ssl_login_return_url=%252Findex.html&is_newpage_ip_limit=&sub_type=&opt=&id=a%40suddenattack.ga&passwd=manko123&auto_login=on');

            params.set('id', 'b@suddenattack.ga');
            params.set('passwd', 'manko123');

            console.log(params.toString());

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://www.makeshop.jp',
                'Referer': 'https://www.makeshop.jp/ssl/slogin/?_ga=2.81522455.1227585242.1548734981-2017845956.1548734981',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res = null;
            if (1 == 1) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[1],
                    port: 443,
                    path: req_paths[0],
                    headers: headers,
                    data: params.toString(),
                }, 'euc-jp');
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[1],
                    port: 443,
                    path: req_paths[0],
                    headers: headers,
                    data: params.toString(),
                }, 'euc-jp', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }


            var bb = str2doc(res.body).body.innerHTML;
            bb = bb.substr(bb.indexOf('https://www.yamaotoko.jp/shop/login_ssl.html?'));
            bb = bb.substr(0, bb.indexOf('\''));

            var u = new URL(bb);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = null;
            if (1 == 1) {
                res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: u.host,
                    port: 443,
                    path: u.pathname + u.search,
                    headers: headers,
                    data: '',
                }, 'euc-jp');
            } else {
                res = await prequest({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: u.host,
                    port: 443,
                    path: u.pathname + u.search,
                    headers: headers,
                    data: '',
                }, 'euc-jp', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            console.log(cookie);


            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            res = null;
            if (1 == 1) {
                res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/shopdetail/000000000926/ct3/page2/order/',
                    headers: headers,
                    data: '',
                }, 'euc-jp');
            } else {
                res = await prequest({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/shopdetail/000000000926/ct3/page2/order/',
                    headers: headers,
                    data: '',
                }, 'euc-jp', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            doc = str2doc(res.body);

            params = new URLSearchParams('taxview=&price1=12%2C000&taxview=&brand_option=4_1&spcode=4&spcode2=1&amount=1&admin_id=yamaotoko&brandcode=000000000926&brandcode=000000000926&typep=&ordertype=&opts=');
            var form = doc.querySelector('form[name="form1"]');
            var fd = new FormData(form);

            var stockList = form.querySelector('table.stockList');
            var mysize = '27.5cm';
            var sizes = [];

            console.log(stockList);

            stockList.querySelectorAll('th').forEach(th => {
                if (th.textContent.indexOf('cm') != -1)
                    sizes.push(th.nextElementSibling.firstElementChild.value + ':' + th.textContent.trim());
            });

            params.forEach((v, k) => {
                if (fd.get(k) === undefined) {

                } else
                    params.set(k, fd.get(k));
            });

            sizes.forEach(d => {
                var sd = d.split(':');
                var sv = sd[0].split('_');

                if (sd[1] == mysize) {
                    params.set('brand_option', sd[0]);
                    params.set('spcode', sv[0]);
                    params.set('spcode2', sv[1]);
                    return;
                }
            });

            console.log(params.toString());

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Referer': 'https://www.yamaotoko.jp/shopdetail/000000000926/ct3/page2/order/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            res = null;
            if (1 == 1) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[1],
                    headers: headers,
                    data: params.toString(),
                }, 'euc-jp');
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[1],
                    headers: headers,
                    data: params.toString(),
                }, 'euc-jp', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            params = new URLSearchParams('ssl_login_id=190129000001&ssl_login_key=1afbe976229ee13cf45d9f48f194916b&ssl_tempid=5c289d09c5f0009c995a2e63ed967ce8&refurl=&rts_id=');

            var login_id = ck.get('login_id');
            params.set('ssl_login_id', login_id);
            params.set('ssl_login_key', ck.get(login_id + '_key'));
            params.set('ssl_tempid', ck.get('tempid'));
            console.log(cookie);

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://www.yamaotoko.jp',
                'Referer': 'https://www.yamaotoko.jp/shopdetail/000000000926/ct3/page2/order/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            res = null;
            if (1 == 1) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[1],
                    port: 443,
                    path: req_paths[2],
                    headers: headers,
                    data: params.toString(),
                }, 'euc-jp');
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[1],
                    port: 443,
                    path: req_paths[2],
                    headers: headers,
                    data: params.toString(),
                }, 'euc-jp', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            console.log(EscapeEUCJP('ほほ'));
            doc = str2doc(res.body);

            form = doc.querySelector('form[name="form1"]');
            fd = new FormData(form);

            params = new URLSearchParams('sender=repme1&sender_kana=repme2&emergency_1=080&emergency_2=8888&emergency_3=8888&emergency3_1=&emergency3_2=&emergency3_3=&email=a%40suddenattack.ga&sender_post1=150&sender_post2=0001&zip_old1=&sender_area=13&sender_addr=repme3&sender_addr2=repme4&receiver_user_type=X&receiver=repme5&receiver_kana=repme6&emergency2_1=080&emergency2_2=8888&emergency2_3=8888&post1=150&post2=0001&zip_old2=&area=13&address=repme7&address2=repme8&deli_year=2019&deli_month=01&deli_day=30&deli_time=repme9&message1=&db=yamaotoko&message=repme10&ssologin=&malllogin=&login_page=&login_error_msg=&shop_point_way=none&shop_point_way_option_value=&shop_use_point=0&gmo_point_way=&gmo_point_way_option_value=&gmo_use_point=0&mall_point_way=&mall_point_way_option_value=&mall_use_point=0&amazon_order_reference_id_for_address=&auto_login=on');
            params.forEach((v, k) => {
                if (fd.get(k) === undefined) {

                } else if (k == 'receiver') {
                    params.set(k, fd.get('sender'));
                } else if (k == 'receiver_kana') {
                    params.set(k, fd.get('sender_kana'));
                } else if (k == 'address') {
                    params.set(k, fd.get('sender_addr'));
                } else if (k == 'address2') {
                    params.set(k, fd.get('sender_addr2'));
                } else if (k == 'message') {
                    params.set(k, '伝達メッセージ : ');
                } else
                    params.set(k, fd.get(k));
            });

            console.log(params.toString());
            return;


            var form = doc.querySelector('.product-add-form > form');
            var fd = new FormData(form);

            var params = new URLSearchParams('product=120439&selected_configurable_option=120436&related_product=&form_key=v41VpJ7p48J2ap2K&super_attribute%5B148%5D=220&qty=1');

            params.set('form_key', fd.get('form_key'));

            console.log(params.toString());

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://gr8.jp',
                'Referer': 'https://gr8.jp/men/helmut-lang-overlay-logo-s-s-050-black',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res = null;
            if (1 == 1) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: form.action.replace('https://' + hostnames[0], ''),
                    headers: headers,
                    data: params.toString(),
                });
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: form.action.replace('https://' + hostnames[0], ''),
                    headers: headers,
                    data: params.toString(),
                }, 'euc-jp', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }
            console.log(res);
        }
    } catch (ex) {
        console.log(ex);
    }
}
async function spf5() {
    var cookie = '';
    var doc = null;

    var ck = createCookieStore();

    var hostnames = ['gr8.jp'];
    var req_paths = [
        '/men/customer/ajax/login',
        '/men/checkout/',
        '/men/rest/m_en/V1/carts/mine/shipping-information',
        '/men/rest/m_en/V1/carts/mine/payment-information'
    ];

    try {
        console.log(new Date());
        cookie = ''; {
            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = null;
            if (1 == 1) {
                res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/men/mastermind-japan-shirt-011-2-black',
                    headers: headers,
                    data: '',
                });
            } else {
                res = await prequest({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/men/nike-acg-nike-lab-acg-aop-t-shirt-323-fur',
                    headers: headers,
                    data: '',
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            // most need to obtain item info.
            console.log(cookie);
            console.log(str2doc(res.body));

            doc = str2doc(res.body);

            var form = doc.querySelector('.product-add-form > form');
            var fd = new FormData(form);

            var params = new URLSearchParams('product=120439&selected_configurable_option=120436&related_product=&form_key=v41VpJ7p48J2ap2K&super_attribute%5B148%5D=220&qty=1');

            params.set('form_key', fd.get('form_key'));

            console.log(params.toString());

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://gr8.jp',
                'Referer': 'https://gr8.jp/men/helmut-lang-overlay-logo-s-s-050-black',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res = null;
            if (1 == 1) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: form.action.replace('https://' + hostnames[0], ''),
                    headers: headers,
                    data: params.toString(),
                });
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: form.action.replace('https://' + hostnames[0], ''),
                    headers: headers,
                    data: params.toString(),
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            console.log(res);
        }
        // Login
        {
            var json_t = '{"username":"nubotay@utoo.email","password":"!manko123","context":"checkout"}';

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://gr8.jp',
                'Referer': 'https://gr8.jp/men/checkout/',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': '*/*',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
                'Content-Length': json_t.length,
                'Cookie': cookie,
            };
            var res = null;
            if (1 == 1) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[0],
                    headers: headers,
                    data: json_t,
                });
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[0],
                    headers: headers,
                    data: json_t,
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            console.log(cookie);
            console.log(res);
        }

        {
            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Referer': 'https://gr8.jp/men/checkout/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = null;
            if (1 == 1) {
                res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[1],
                    headers: headers,
                    data: '',
                });
            } else {
                res = await prequest({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[1],
                    headers: headers,
                    data: '',
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            window.doo = str2doc(res.body);
            console.log(doo);


            var bs = doo.body.innerHTML;
            var jsont = bs.substr(bs.indexOf('window.checkoutConfig')).replace('window.checkoutConfig = ', '');
            jsont = jsont.substr(0, jsont.indexOf('}};') + 2);
            window.checkoutConfig = JSON.parse(jsont);

            var o1 = Object.assign({}, checkoutConfig.customerData.addresses[0]);
            var o2 = null;

            var region = Object.assign({}, o1.region);
            delete o1.default_billing;
            delete o1.default_shipping;
            delete o1.inline;
            delete o1.region;
            o1 = Object.assign(region, o1);
            o1 = Object.assign({
                saveInAddressBook: null
            }, o1);

            o2 = Object.assign({}, o1);
            delete o2.saveInAddressBook;


            var o1 = Object.assign({}, checkoutConfig.customerData.addresses[0]);
            var o2 = null;

            var region = Object.assign({}, o1.region);
            delete o1.default_billing;
            delete o1.default_shipping;
            delete o1.inline;
            delete o1.region;
            o1 = Object.assign(region, o1);
            o1 = Object.assign({
                saveInAddressBook: null
            }, o1);

            delete Object.assign(o1, {
                ['countryId']: o1['country_id']
            })['country_id'];
            delete Object.assign(o1, {
                ['customerAddressId']: o1['id']
            })['id'];
            delete Object.assign(o1, {
                ['customerId']: o1['customer_id']
            })['customer_id'];
            delete Object.assign(o1, {
                ['regionCode']: o1['region_code']
            })['region_code'];
            delete Object.assign(o1, {
                ['regionId']: o1['region_id']
            })['region_id'];

            o2 = Object.assign({}, o1);
            delete o2.saveInAddressBook;


            var post = {
                addressInformation: {
                    billing_address: o1,
                    shipping_address: o2,
                    shipping_carrier_code: 'yamatoshipping',
                    shipping_method_code: 'Yamato Shipping',
                    extension_attributes: {
                        vw_delivery_time: 'いつでも'
                    },
                }
            };

            o1 = Object.assign({}, checkoutConfig.customerData.addresses[0]);

            var region = Object.assign({}, o1.region);
            delete o1.default_billing;
            delete o1.default_shipping;
            delete o1.inline;
            delete o1.region;
            o1 = Object.assign(region, o1);
            o1 = Object.assign({
                saveInAddressBook: null
            }, o1);

            delete Object.assign(o1, {
                ['countryId']: o1['country_id']
            })['country_id'];
            delete Object.assign(o1, {
                ['customerAddressId']: o1['id']
            })['id'];
            delete Object.assign(o1, {
                ['customerId']: o1['customer_id']
            })['customer_id'];
            delete Object.assign(o1, {
                ['regionCode']: o1['region_code']
            })['region_code'];
            delete Object.assign(o1, {
                ['regionId']: o1['region_id']
            })['region_id'];

            var post2 = {
                billingAddress: o1,
                cartId: checkoutConfig.quoteData.entity_id,
                paymentMethod: {
                    additional_data: null,
                    method: "veriteworks_cod",
                    po_number: null
                }
            }


            var jsonp = JSON.stringify(post);
            var jsonp2 = JSON.stringify(post2);
            var jsonp3 = '{"paymentInfo":{"payment":"veriteworks_cod"}}';

            console.log(jsonp);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://gr8.jp',
                'Referer': 'https://gr8.jp/men/checkout/',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': '*/*',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
                'Content-Length': jsonp3.length,
                'Cookie': cookie,
            };
            var res = null;
            if (1 == 1) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/men/rest/m_en/V1/vwcod/collect/totals',
                    headers: headers,
                    data: jsonp3,
                });
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/men/rest/m_en/V1/vwcod/collect/totals',
                    headers: headers,
                    data: jsonp,
                }, 'utf8', proxy.host, proxy.port);
            }

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://gr8.jp',
                'Referer': 'https://gr8.jp/men/checkout/',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': '*/*',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
                'Content-Length': jsonp.length,
                'Cookie': cookie,
            };
            var res = null;
            if (1 == 1) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[2],
                    headers: headers,
                    data: jsonp,
                });
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[2],
                    headers: headers,
                    data: jsonp,
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            console.log(cookie);
            console.log(res);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://gr8.jp',
                'Referer': 'https://gr8.jp/men/checkout/',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': '*/*',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
                'Content-Length': jsonp2.length,
                'Cookie': cookie,
            };
            var res = null;
            if (1 == 1) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[3],
                    headers: headers,
                    data: jsonp2,
                });
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[3],
                    headers: headers,
                    data: jsonp2,
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            console.log(cookie);
            console.log(res);

        }
    } catch (ex) {

        console.log(ex);
    }
}

async function calif(args) {
    /*
    var task = args[0];
    var account = args[1];
    var proxy = args[2];
    var billing = args[3];
    */
    var proxy = null;

    var cookie = '';
    var doc = null;

    var ck = createCookieStore();

    var hostnames = ['calif.cc'];
    var req_paths = [
        '/auth?next=%2C%2Fmember%2F&link=HD_LOGIN',
        '/auth?',
    ];
    var ref = 'https://calif.cc/brand/xlarge/item/XLE0118W0003?via=recommend';

    /*
    for (; ;) {
        if (task.startTime.getTime() - new Date().getTime() <= 1000 * 20)
            break;
        await sleep(5);
    }
    */

    try {
        console.log(new Date());

        // LOGIN
        cookie = ''; {
            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Referer': ref,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = null;
            if (proxy == null) {
                res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[0],
                    headers: headers,
                    data: '',
                });
            } else {
                res = await prequest({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[0],
                    headers: headers,
                    data: '',
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            doc = str2doc(res.body);
            console.log(cookie);
            console.log(str2doc(res.body));

            var form = doc.querySelector('form[name="loginForm"]');
            var fd = new FormData(form);

            var params = new URLSearchParams('Token.Default=e6ad588b-5839-4ad5-a00f-17a7697111f3&next=%2C%2Fmember%2F&op=login&next=%2C%2Fmember%2F&loginAccount=b%40suddenattack.ga&password=manko123');
            //params.set('loginAccount', account.email);
            //params.set('password', account.password);
            params.set('Token.Default', fd.get('Token.Default'));

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://calif.cc',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': params.toString().length,
                'Cookie': cookie,
            };
            var res = null;
            if (proxy == null) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[1],
                    headers: headers,
                    data: params.toString(),
                });
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[1],
                    headers: headers,
                    data: params.toString(),
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            console.log(params.toString());
            console.log(res);
        }

        {
            var item_url = '/brand/xlarge/item/XLE0118W0004?areaid=sp190201XLE_SRM';
            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Referer': ref,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = null;
            if (proxy == null) {
                res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: item_url,
                    headers: headers,
                    data: '',
                });
            } else {
                res = await prequest({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: item_url,
                    headers: headers,
                    data: '',
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            doc = str2doc(res.body);

            var form = doc.querySelector('form[name="inputCartForm1_0"]');
            var fd = new FormData(form);

            var params = new URLSearchParams('ssc=CLFXLE0118W0003102101&amnt=1&actk=RjD15khW&cgsc=');
            //params.set('loginAccount', account.email);
            //params.set('password', account.password);
            params.set('ssc', fd.get('ssc'));
            params.set('actk', fd.get('actk'));

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://calif.cc',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': params.toString().length,
                'Cookie': cookie,
            };
            var res = null;
            if (proxy == null) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/order/api/cart.do?op=add',
                    headers: headers,
                    data: params.toString(),
                });
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/order/api/cart.do?op=add',
                    headers: headers,
                    data: params.toString(),
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            console.log(res.body);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Referer': ref,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = null;
            if (proxy == null) {
                res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/order/cart?link=HD_CART',
                    headers: headers,
                    data: '',
                });
            } else {
                res = await prequest({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/order/cart?link=HD_CART',
                    headers: headers,
                    data: '',
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            doc = str2doc(res.body);

            var form = doc.querySelector('form[action="/order/reg"]');
            console.log(form);
            var fd = new FormData(form);
            var cgsc = '/order/reg?cgsc=' + fd.get('cgsc');


            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Referer': ref,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = null;
            if (proxy == null) {
                res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: cgsc,
                    headers: headers,
                    data: '',
                });
            } else {
                res = await prequest({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: cgsc,
                    headers: headers,
                    data: '',
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            doc = str2doc(res.body);
            console.log(doc);


            var form = doc.querySelector('form[action="/order/reg"]');
            var fd = new FormData(form);

            var params = new URLSearchParams('Token.Default=c478ec99-a1d9-4ed1-a8bd-92ad9a33b0e3&exhibitionBrandIdArray=XLE01&op=submit&order=2C6_L8XMZpEe2tJt4Dh4qw');
            params.set('Token.Default', fd.get('Token.Default'));
            params.set('exhibitionBrandIdArray', fd.get('exhibitionBrandIdArray'));
            params.set('order', fd.get('order'));

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://calif.cc',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': params.toString().length,
                'Cookie': cookie,
            };
            var res = null;
            if (proxy == null) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/order/reg',
                    headers: headers,
                    data: params.toString(),
                });
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/order/reg',
                    headers: headers,
                    data: params.toString(),
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            console.log(res);
        }
    } catch (ex) {
        console.log(ex);
    }
}

async function rakuma() {
    var cookie = '';
    var doc = null;

    var ck = createCookieStore();

    var hostnames = ['web.fril.jp', 'cp.adidas.jp', 'crm.adidas.com', 'linkpt.cardservice.co.jp'];
    var req_paths = [
        'https://shop.adidas.jp/api/cart/add_cart_api.cgi?itemBrcd=&itemKcod=G27707&itemSzcd=29&pod=1&api_url=https:%2F%2Fshop.adidas.jp%2Fapi%2Fcart%2Fadd_cart_api.cgi&api_method=GET&color_mode=itemKcod&mode=bulk',
        '/f/v1/pri/login/check/',
        '/api/cart/get_checkout_info.cgi',
        '/accounts/authentication',
        '/sp/ACS.saml2', '/fp/sso/login/',
        '/f/v1/pri/room/enter/', '/f/v1/pri/room/wait/',
        '/api/cart/pay_order.cgi',
        '/cgi-bin/token/token.cgi'
    ];

    try {
        cookie = 'shows_app_review_dialog=true; _fril_user_session_id=aac967355db7043fb209f8c3e007687e; _ra=1549120043271|fcf37685-4437-44ae-81ff-3fdf2009ddcd'; {
            var params = new URLSearchParams('utf8=%E2%9C%93&authenticity_token=PGX37lA7fMTXlDJ32hTBw7hDPT2JqS2cl%2FB6PKcUbLpQFB%2BUV6VIOVkxOnv57hKBuFdUgT6jXLHKS3finDqmhw%3D%3D&user_coupon_id=0730312&button=');
            params.set('user_coupon_id', 0930312);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://shop.adidas.jp',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': params.toString().length,
                'Cookie': cookie,
            };
            var res = null;
            if (null == null) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/v2/purchase/direct_payment',
                    headers: headers,
                    data: params.toString(),
                });
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[1],
                    headers: headers,
                    data: params.toString(),
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            window.doc4 = str2doc(res.body);
            var str = doc4.querySelector('button.selected-link').textContent.trim().replace('- ', '').replace(' 円', '');
            console.log(doc4.querySelector('button.selected-link'));
            console.log(doc4);
        }
    } catch (ex) {
        console.log(ex);
    }
}
async function spf4(args) {
    var task = args[0];
    var account = args[1];
    var proxy = args[2];
    var billing = args[3];

    var cookie = '';
    var doc = null;

    var ck = createCookieStore();

    var hostnames = ['shop.adidas.jp', 'cp.adidas.jp', 'crm.adidas.com', 'linkpt.cardservice.co.jp'];
    var req_paths = [
        'https://shop.adidas.jp/api/cart/add_cart_api.cgi?itemBrcd=&itemKcod=G27707&itemSzcd=29&pod=1&api_url=https:%2F%2Fshop.adidas.jp%2Fapi%2Fcart%2Fadd_cart_api.cgi&api_method=GET&color_mode=itemKcod&mode=bulk',
        '/f/v1/pri/login/check/',
        '/api/cart/get_checkout_info.cgi',
        '/accounts/authentication',
        '/sp/ACS.saml2', '/fp/sso/login/',
        '/f/v1/pri/room/enter/', '/f/v1/pri/room/wait/',
        '/api/cart/pay_order.cgi',
        '/cgi-bin/token/token.cgi'
    ];

    for (;;) {
        if (task.startTime.getTime() - new Date().getTime() <= 1000 * 20)
            break;
        await sleep(5);
    }

    try {
        console.log(new Date());
        cookie = ''; {
            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = null;
            if (proxy == null) {
                res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/', // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
                    headers: headers,
                    data: '',
                });
            } else {
                res = await prequest({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/', // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
                    headers: headers,
                    data: '',
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            console.log(cookie);
            console.log(str2doc(res.body));
        }

        {
            var params = new URLSearchParams('email=b%40suddenattack.ga&password=manko123&email_lookup=1');
            params.set('email', account.email);
            params.set('password', account.password);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Origin': 'https://shop.adidas.jp',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res = null;
            if (proxy == null) {
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[1],
                    headers: headers,
                    data: params.toString(),
                });
            } else {
                res = await prequest({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: req_paths[1],
                    headers: headers,
                    data: params.toString(),
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            window.res_r1 = res;
        }

        // START LOGIN
        {
            {
                var json = JSON.parse('{"email":"b@suddenattack.ga","password":"manko123","countryOfSite":"JP","communicationLanguage":"ja","pfStartSSOURL":"https://cp.adidas.jp/idp/startSSO.ping","idpAdapterId":"adidasIdP10","partnerSpId":"sp:bbfadidasJP","targetResource":"https://shop.adidas.jp/checkout/","inErrorResource":"https://shop.adidas.jp/404/","loginUrl":"https://shop.adidas.jp/fp/login/"}');
                json.email = account.email;
                json.password = account.password;

                var jt = JSON.stringify(json);

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Origin': 'https://shop.adidas.jp',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Client-Id': '62wi38jgwliizcyxz5f193dtfoweqywh',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                    'Content-Length': jt.length,
                    'Cookie': cookie,
                };
                var res = null;
                if (proxy == null) {
                    res = await request({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostnames[2],
                        port: 443,
                        path: req_paths[3],
                        headers: headers,
                        data: jt,
                    });
                } else {
                    res = await prequest({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostnames[2],
                        port: 443,
                        path: req_paths[3],
                        headers: headers,
                        data: jt,
                    }, 'utf8', proxy.host, proxy.port);
                }

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }
                console.log(res);

                var redir = JSON.parse(res.body).redirectionUrl;
                var uparam = splitUrl(redir);

                try {
                    var kk = uparam.protocol;
                } catch (ex) {
                    var thr = null;
                    thr.ERROR_002 = 0;
                }

                console.log(res.body);

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                res = null;
                if (proxy == null) {
                    res = await request({
                        method: 'GET',
                        protocol: 'https:',
                        hostname: hostnames[1],
                        port: 443,
                        path: redir.replace('https://' + uparam.hostname, ''),
                        headers: headers,
                        data: '',
                    });
                } else {
                    res = await prequest({
                        method: 'GET',
                        protocol: 'https:',
                        hostname: hostnames[1],
                        port: 443,
                        path: redir.replace('https://' + uparam.hostname, ''),
                        headers: headers,
                        data: '',
                    }, 'utf8', proxy.host, proxy.port);
                }

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                console.log(res);

                // redir 1
                var redir = res.headers.location.replace('https://cp.adidas.jp:443', 'https://cp.adidas.jp');
                var uparam = splitUrl(redir);

                try {
                    var kk = uparam.protocol;
                } catch (ex) {
                    var thr = null;
                    thr.ERROR_002 = 0;
                }
                console.log(redir);

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                if (proxy == null) {
                    res = await request({
                        method: 'GET',
                        protocol: uparam.protocol,
                        hostname: uparam.hostname,
                        port: 443,
                        path: redir.replace('https://' + uparam.hostname, ''),
                        headers: headers,
                        data: '',
                    });
                } else {
                    res = await prequest({
                        method: 'GET',
                        protocol: uparam.protocol,
                        hostname: uparam.hostname,
                        port: 443,
                        path: redir.replace('https://' + uparam.hostname, ''),
                        headers: headers,
                        data: '',
                    }, 'utf8', proxy.host, proxy.port);
                }
                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                // redir2
                redir = res.headers.location.replace('https://cp.adidas.jp:443', 'https://cp.adidas.jp');
                uparam = splitUrl(redir);

                try {
                    var kk = uparam.protocol;
                } catch (ex) {
                    var thr = null;
                    thr.ERROR_002 = 0;
                }
                console.log(redir);

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                if (proxy == null) {
                    res = await request({
                        method: 'GET',
                        protocol: uparam.protocol,
                        hostname: uparam.hostname,
                        port: 443,
                        path: redir.replace('https://' + uparam.hostname, ''),
                        headers: headers,
                        data: '',
                    });
                } else {
                    res = await prequest({
                        method: 'GET',
                        protocol: uparam.protocol,
                        hostname: uparam.hostname,
                        port: 443,
                        path: redir.replace('https://' + uparam.hostname, ''),
                        headers: headers,
                        data: '',
                    }, 'utf8', proxy.host, proxy.port);
                }
                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                var doc = str2doc(res.body);
                console.log(doc);

                var form = doc.forms[0];
                var fd = new FormData(form);

                var params = new URLSearchParams('RelayState=https%3A%2F%2Fshop.adidas.jp%2Fcheckout%2F&SAMLResponse=33');
                params.set('RelayState', fd.get('RelayState'));
                params.set('SAMLResponse', fd.get('SAMLResponse'));

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Origin': 'https://cp.adidas.jp',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                res = null;
                if (proxy == null) {
                    res = await request({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostnames[1],
                        port: 443,
                        path: req_paths[4],
                        headers: headers,
                        data: params.toString(),
                    });
                } else {
                    res = await prequest({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostnames[1],
                        port: 443,
                        path: req_paths[4],
                        headers: headers,
                        data: params.toString(),
                    }, 'utf8', proxy.host, proxy.port);
                }

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                doc = str2doc(res.body);
                console.log(doc);

                var form = doc.forms[0];
                var fd = new FormData(form);

                var params = new URLSearchParams('REF=0DB98BAA0C074AE4C7DF8791EB62DB16A15B37CACF958326836B6D6D0005&TargetResource=https%3A%2F%2Fshop.adidas.jp%2Fcheckout%2F');
                params.set('REF', fd.get('REF'));
                params.set('TargetResource', fd.get('TargetResource'));

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Origin': 'https://cp.adidas.jp',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                res = null;
                if (proxy == null) {
                    res = await request({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostnames[0],
                        port: 443,
                        path: req_paths[5],
                        headers: headers,
                        data: params.toString(),
                    });
                } else {
                    res = await prequest({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostnames[0],
                        port: 443,
                        path: req_paths[5],
                        headers: headers,
                        data: params.toString(),
                    }, 'utf8', proxy.host, proxy.port);
                }

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                console.log(res);
            }
        }

        for (;;) {
            if (task.startTime.getTime() - new Date().getTime() <= 0)
                break;
            await sleep(5);
        }

        console.log('START: ' + (new Date())); {
            for (;;) {
                var itemu = new URL(task.urls);
                var itemKcod = itemu.href;
                var itemSzcd = '';

                itemKcod = itemKcod.replace('https://shop.adidas.jp/products/', '').replace('/', '');

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res = null;
                if (proxy == null) {
                    res = await request({
                        method: 'GET',
                        protocol: 'https:',
                        hostname: hostnames[0],
                        port: 443,
                        path: itemu.pathname + itemu.search, // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
                        headers: headers,
                        data: '',
                    });
                } else {
                    res = await prequest({
                        method: 'GET',
                        protocol: 'https:',
                        hostname: hostnames[0],
                        port: 443,
                        path: itemu.pathname + itemu.search, // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
                        headers: headers,
                        data: '',
                    }, 'utf8', proxy.host, proxy.port);
                }
                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                window.doo = str2doc(res.body);
                doc = window.doo;
                try {
                    var lis = doc.querySelector('.productBuy_select_wrapper').querySelector('.inputSelect_insteadBox').querySelectorAll('.inputSelect_list > li');

                    var sii = task.size;
                    lis.forEach(li => {
                        var st = li.querySelector('span').textContent.trim();
                        if (st.indexOf('cm') != -1 && st == sii + 'cm') {
                            console.log('found the size: ' + st);
                            itemSzcd = $(li).attr('data-code');
                        }
                    });

                    if (itemSzcd != '')
                        break;
                } catch (ex) {
                    console.log('Waiting for launch...');
                }

                await sleep(10);
            }

            var ur = new URLSearchParams(req_paths[0]);
            ur.set('itemKcod', itemKcod);
            ur.set('itemSzcd', itemSzcd);

            ur = new URL(decodeURIComponent(ur.toString()));

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = null;
            if (proxy == null) {
                res = await request({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: ur.pathname + ur.search.replace('https://shop.adidas.jp/api/cart/add_cart_api.cgi', 'https:%2F%2Fshop.adidas.jp%2Fapi%2Fcart%2Fadd_cart_api.cgi'), // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
                    headers: headers,
                    data: '',
                });
            } else {
                res = await prequest({
                    method: 'GET',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: ur.pathname + ur.search.replace('https://shop.adidas.jp/api/cart/add_cart_api.cgi', 'https:%2F%2Fshop.adidas.jp%2Fapi%2Fcart%2Fadd_cart_api.cgi'), // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
                    headers: headers,
                    data: '',
                }, 'utf8', proxy.host, proxy.port);
            }

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            //console.log(cookie);
            //console.log(res.body);
        }
        // Pay Logic
        {
            {
                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res = null;
                if (proxy == null) {
                    res = await request({
                        method: 'GET',
                        protocol: 'https:',
                        hostname: hostnames[0],
                        port: 443,
                        path: req_paths[2], // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
                        headers: headers,
                        data: '',
                    });
                } else {
                    res = await prequest({
                        method: 'GET',
                        protocol: 'https:',
                        hostname: hostnames[0],
                        port: 443,
                        path: req_paths[2], // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
                        headers: headers,
                        data: '',
                    }, 'utf8', proxy.host, proxy.port);
                }

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                //console.log(res.body);
                var json = JSON.parse(res.body);
                var info = json;
                console.log(info);

                var params = new URLSearchParams('id=a659ebcab27049e4af0caa67730065de&sid=aa');
                params.set('id', json.cart_info.waiting_room.waiting_room_id);
                params.set('sid', ck.get('eccc'));

                //console.log(params.toString());

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Origin': 'https://shop.adidas.jp',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                res = null;
                if (proxy == null) {
                    res = await request({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostnames[0],
                        port: 443,
                        path: req_paths[6],
                        headers: headers,
                        data: params.toString(),
                    });
                } else {
                    res = await prequest({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostnames[0],
                        port: 443,
                        path: req_paths[6],
                        headers: headers,
                        data: params.toString(),
                    }, 'utf8', proxy.host, proxy.port);
                }

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                json = JSON.parse(res.body);

                params = new URLSearchParams('token=a');
                params.set('token', json.token);

                //console.log(params.toString());

                // need to check(botained waiting_room_token or not)
                await sleep(1000);

                for (;;) {
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Origin': 'https://shop.adidas.jp',
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie,
                    };
                    res = null;
                    if (proxy == null) {
                        res = await request({
                            method: 'POST',
                            protocol: 'https:',
                            hostname: hostnames[0],
                            port: 443,
                            path: req_paths[7],
                            headers: headers,
                            data: params.toString(),
                        });
                    } else {
                        res = await prequest({
                            method: 'POST',
                            protocol: 'https:',
                            hostname: hostnames[0],
                            port: 443,
                            path: req_paths[7],
                            headers: headers,
                            data: params.toString(),
                        }, 'utf8', proxy.host, proxy.port);
                    }

                    if (res.headers.hasOwnProperty('set-cookie')) {
                        var c = res.headers['set-cookie'];
                        ck.init(cookie);
                        for (var i = 0; i < c.length; i++) {
                            var base = c[i].substring(0, c[i].indexOf(';'))
                            var key = base.substring(0, base.indexOf('='));
                            var value = base.substring(base.indexOf('=') + 1);

                            if (ck.get(key) == undefined) {
                                ck.add(key, value);
                            } else if (ck.get(key) != undefined && ck.get(key) != value) {
                                ck.set(key, value);
                            }

                            cookie = ck.getAll();
                        }
                    }

                    if (JSON.parse(res.body).token !== undefined)
                        break;

                    await sleep(400);
                }

                var waiting_room_token = JSON.parse(res.body).token;
                //console.log(waiting_room_token);

                var ip_code_3d = info.cart_info.cart_settlement_info.creditcard.ip_code_3d;
                var xml = str2xml('<?xml version="1.0" encoding="utf-8"?><request service="token" action="newcard"><authentication><clientip>39318</clientip></authentication><card><cvv>111</cvv><number>1111</number><expires><year>20</year><month>12</month></expires><name></name></card></request>');

                xml.documentElement.querySelector('clientip').textContent = ip_code_3d;
                xml.documentElement.querySelector('cvv').textContent = billing.payment.cvv;
                xml.documentElement.querySelector('number').textContent = billing.payment.cardNumber;
                xml.documentElement.querySelector('year').textContent = '20' + billing.payment.expiration.split('/')[1];
                xml.documentElement.querySelector('month').textContent = billing.payment.expiration.split('/')[0];

                console.log(xml.documentElement.querySelector('year').textContent);
                var xml_text = new XMLSerializer().serializeToString(xml);

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Origin': 'https://shop.adidas.jp',
                    'Referer': 'https://shop.adidas.jp/checkout/',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'text/xml',
                    'Content-Length': xml_text.length,
                    'Cookie': cookie,
                };
                res = null;
                if (proxy == null) {
                    res = await request({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostnames[3],
                        port: 443,
                        path: req_paths[9],
                        headers: headers,
                        data: xml_text,
                    });
                } else {
                    res = await prequest({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostnames[3],
                        port: 443,
                        path: req_paths[9],
                        headers: headers,
                        data: xml_text,
                    }, 'utf8', proxy.host, proxy.port);
                }

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                //console.log(res.body);

                xml = str2xml(res.body);
                var zeus_token_value = xml.documentElement.querySelector('token_key').textContent;
                var zeus_token_masked_card_no = xml.documentElement.querySelector('masked_card_number').textContent;
                var zeus_token_masked_cvv = xml.documentElement.querySelector('masked_cvv').textContent;
                var zeus_token_return_card_expires_month = xml.documentElement.querySelector('card_expires_month').textContent;
                var zeus_token_return_card_expires_year = xml.documentElement.querySelector('card_expires_year').textContent;

                //console.log('zeus_token_return_card_expires_year: ' + zeus_token_return_card_expires_year);

                var params = null;

                // if already regsitered cart on Adidas.
                if (11 == 22) {
                    params = new URLSearchParams('custom_agree_flag=&x=1548594700&ccid=1p2mLY4bz0MV7HaFMDqamh5Qc9J7BjZsQqcd5VneBAaVmHdqPYAscgKXLTGeH7AzKdPJ8LVArwjuXOBJR3DGP4Mt&cart_view_date=20190127&access_key_hash=ca8a4dafecd88b5fb0b03f307a0672e7efae5c6931b208b2a9c736a740515135&custBirt=1980-06-01&ecom_user_flag=1&juchImai=&juchImai2=&juchHflg=1&juchOnam=%E4%BB%96%E3%81%AE&juchOfur=%E3%82%B1%E3%83%B3%E3%82%B1%E3%83%B3&juchOzip=1101111&juchOpre=&juchOad=%E5%8C%97%E6%B5%B7%E9%81%93%E3%81%BB%E3%81%8A%E3%81%8A%E3%81%8A&juchOad1=&juchOad2=1111&juchOtel=08088888888&juchAnam=&juchAfur=&juchAzip=&juchACountryCode=&juchApre=&juchAad=&juchAad1=&juchAad2=&juchAtel=&juchInam=&juchIfur=&juchIzip=&juchIpre=&juchIad=&juchIad1=&juchIad2=&juchItel=&store_DCD=&store_NM=&store_TEL=&store_ZIP=&store_ADR=&juchGnam=%E4%BB%96%E3%81%AE&juchGfur=%E3%82%B1%E3%83%B3%E3%82%B1%E3%83%B3&juchGzip=1101111&juchGpre=%E5%8C%97%E6%B5%B7%E9%81%93&juchGad1=%E3%81%BB%E3%81%8A%E3%81%8A%E3%81%8A&juchGad2=1111&juchGtel=08088888888&save_address_1=&save_address_3=&save_address_4=&juchKess=2&usecardflg=0&juchOflg=0&juchOday_y=&juchOday_m=&juchOday_d=&juchOday_label=%E6%8C%87%E5%AE%9A%E3%81%AA%E3%81%97%EF%BC%88%E6%9C%80%E7%9F%AD%E3%81%A7%E3%81%AE%E9%85%8D%E9%80%81%E3%81%A8%E3%81%AA%E3%82%8A%E3%81%BE%E3%81%99%EF%BC%89&juchOTim=00&juchOTim_label=%E6%8C%87%E5%AE%9A%E3%81%AA%E3%81%97&juchGift=0&custom_agree_on=&waiting_room_token=acb6a9a180a426d1706a92ea77a2c6cc412aecd27e9a47c2025f7d90509dd0c2');

                    params.set('x', info.cart_info.checkout_purchase_info.x);
                    params.set('ccid', info.cart_info.checkout_purchase_info.ccid);
                    params.set('cart_view_date', info.cart_info.checkout_purchase_info.cart_view_date);
                    params.set('access_key_hash', info.cart_info.checkout_purchase_info.access_key_hash);
                    params.set('custBirt', info.cart_info.member_info.birt);
                    params.set('juchOnam', info.cart_info.member_info.name_last);
                    params.set('juchOfur', info.cart_info.member_info.name_first);
                    params.set('juchOzip', info.cart_info.member_info.zip);
                    params.set('juchOad', info.cart_info.member_info.address1);
                    params.set('juchOad2', info.cart_info.member_info.address2);
                    params.set('juchOtel', info.cart_info.member_info.tel);
                    params.set('juchGnam', info.cart_info.member_info.name_last);
                    params.set('juchGfur', info.cart_info.member_info.name_first);
                    params.set('juchGzip', info.cart_info.member_info.zip);
                    params.set('juchGpre', info.cart_info.member_info.prefecture);
                    params.set('juchGad1', info.cart_info.member_info.city);
                    params.set('juchGad2', info.cart_info.member_info.address2);
                    params.set('juchGtel', info.cart_info.member_info.tel);
                    //params.set('zeus_token_masked_card_no', zeus_token_value);
                    //params.set('zeus_token_value', zeus_token_masked_card_no);
                    //params.set('zeus_token_masked_cvv', zeus_token_masked_cvv);
                    //params.set('zeus_token_return_card_expires_month', zeus_token_return_card_expires_month);
                    //params.set('zeus_token_return_card_expires_year', zeus_token_return_card_expires_year);
                    params.set('waiting_room_token', waiting_room_token);

                } else {
                    params = new URLSearchParams('custom_agree_flag=&x=1549020158&ccid=1FfgF8gxnKlxnbRK86Hr%2BwiD22DmLrVe4seq9OcCshTF8nSEQk9foUGsk5GPFDadleQWncWmLLyCLHuMW6SLsdfW&cart_view_date=20190201&access_key_hash=41fbfdd54b944870226b0a65893ac84cba31029e90add005d0d12dc958ac7757&custBirt=1980-06-01&ecom_user_flag=1&juchImai=&juchImai2=&juchHflg=1&juchOnam=%E4%BB%96%E3%81%AE&juchOfur=%E3%82%B1%E3%83%B3%E3%82%B1%E3%83%B3&juchOzip=1101111&juchOpre=&juchOad=%E5%8C%97%E6%B5%B7%E9%81%93%E3%81%BB%E3%81%8A%E3%81%8A%E3%81%8A&juchOad1=&juchOad2=1111&juchOtel=08088888888&juchAnam=&juchAfur=&juchAzip=&juchACountryCode=&juchApre=&juchAad=&juchAad1=&juchAad2=&juchAtel=&juchInam=&juchIfur=&juchIzip=&juchIpre=&juchIad=&juchIad1=&juchIad2=&juchItel=&store_DCD=&store_NM=&store_TEL=&store_ZIP=&store_ADR=&juchGnam=%E4%BB%96%E3%81%AE&juchGfur=%E3%82%B1%E3%83%B3%E3%82%B1%E3%83%B3&juchGzip=1101111&juchGpre=%E5%8C%97%E6%B5%B7%E9%81%93&juchGad1=%E3%81%BB%E3%81%8A%E3%81%8A%E3%81%8A&juchGad2=1111&juchGtel=08088888888&save_address_1=&save_address_3=&save_address_4=&juchKess=2&save_card_evacuation=checked&usecardflg_evacuation=1&zeus_token_masked_card_no=4205%2A%2A%2A%2A%2A%2A%2A%2A7707&zeus_token_value=wbLZVWYHiWcbhrW6QJ7QLY4pqFCiCv.KAz9uu9YQmXM.JGtOneMbHk9AmVsuMnutwsgPrU1i5_VPyBa_0a9xzg&zeus_token_masked_cvv=%2A%2A%2A&zeus_token_return_card_expires_month=10&zeus_token_return_card_expires_year=2024&juchOflg=0&juchOday_y=&juchOday_m=&juchOday_d=&juchOday_label=%E6%8C%87%E5%AE%9A%E3%81%AA%E3%81%97%EF%BC%88%E6%9C%80%E7%9F%AD%E3%81%A7%E3%81%AE%E9%85%8D%E9%80%81%E3%81%A8%E3%81%AA%E3%82%8A%E3%81%BE%E3%81%99%EF%BC%89&juchOTim=00&juchOTim_label=%E6%8C%87%E5%AE%9A%E3%81%AA%E3%81%97&juchGift=0&custom_agree_on=&waiting_room_token=c6a651c3241853a5715881cbf5cde8afd5b8a359e58381ec55b90ac15d51e8a7');

                    params.set('x', info.cart_info.checkout_purchase_info.x);
                    params.set('ccid', info.cart_info.checkout_purchase_info.ccid);
                    params.set('cart_view_date', info.cart_info.checkout_purchase_info.cart_view_date);
                    params.set('access_key_hash', info.cart_info.checkout_purchase_info.access_key_hash);
                    params.set('custBirt', info.cart_info.member_info.birt);
                    params.set('juchOnam', info.cart_info.member_info.name_last);
                    params.set('juchOfur', info.cart_info.member_info.name_first);
                    params.set('juchOzip', info.cart_info.member_info.zip);
                    params.set('juchOad', info.cart_info.member_info.address1);
                    params.set('juchOad2', info.cart_info.member_info.address2);
                    params.set('juchOtel', info.cart_info.member_info.tel);
                    params.set('juchGnam', info.cart_info.member_info.name_last);
                    params.set('juchGfur', info.cart_info.member_info.name_first);
                    params.set('juchGzip', info.cart_info.member_info.zip);
                    params.set('juchGpre', info.cart_info.member_info.prefecture);
                    params.set('juchGad1', info.cart_info.member_info.city);
                    params.set('juchGad2', info.cart_info.member_info.address2);
                    params.set('juchGtel', info.cart_info.member_info.tel);
                    params.set('zeus_token_masked_card_no', zeus_token_masked_card_no);
                    params.set('zeus_token_value', zeus_token_value);
                    params.set('zeus_token_masked_cvv', zeus_token_masked_cvv);
                    params.set('zeus_token_return_card_expires_month', zeus_token_return_card_expires_month);
                    params.set('zeus_token_return_card_expires_year', zeus_token_return_card_expires_year);
                    params.set('waiting_room_token', waiting_room_token);
                }
                /*
                params.set('x', info.);
                params.set('x', info.);
                params.set('x', info.);
                params.set('x', info.);
                params.set('x', info.);
                params.set('x', info.);
                */

                console.log('\n\ntrying to pay...');
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Origin': 'https://shop.adidas.jp',
                    'Referer': 'https://shop.adidas.jp/checkout/',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                res = null;
                if (proxy == null) {
                    res = await request({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostnames[0],
                        port: 443,
                        path: req_paths[8],
                        headers: headers,
                        data: params.toString(),
                    });
                } else {
                    res = await prequest({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostnames[0],
                        port: 443,
                        path: req_paths[8],
                        headers: headers,
                        data: params.toString(),
                    }, 'utf8', proxy.host, proxy.port);
                }

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                console.log(params.toString());

                console.log('PURCHASED: ' + (new Date()));
                console.log(res.body);
                return;
            }
        }
    } catch (ex) {
        console.log(ex);
    }

}
async function spf3(args) {
    var task = args[0];
    var account = args[1];
    var proxy = args[2];

    var csrf = '';
    var cookie = '';
    var doc = null;
    var ldoc = null;

    var items = [];

    const snf0 = '<meta name="csrf-token" content="';

    var ck = createCookieStore();
    let d = new Date();

    var login_paths = ['/shop/customer/menu.aspx'];
    var req_paths = ['/shop/cart/cart.aspx', '/shop/order/method.aspx', '/shop/order/estimate.aspx'];
    var ref_url = '';
    var hostname = 'www.atmos-tokyo.com';

    for (;;) {
        try {
            cookie = ''; {
                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                var res = null;
                if (proxy == null) {
                    res = await request({
                        method: 'GET',
                        protocol: 'https:',
                        hostname: hostname,
                        port: 443,
                        path: login_paths[0], // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
                        headers: headers,
                        data: '',
                    }, 'shift_jis');
                } else {
                    res = await prequest({
                        method: 'GET',
                        protocol: 'https:',
                        hostname: hostname,
                        port: 443,
                        path: login_paths[0], // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
                        headers: headers,
                        data: '',
                    }, 'shift_jis', proxy.host, proxy.port);
                }

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                ref_url = 'https://www.atmos-tokyo.com' + login_paths[0];

                console.log(cookie);
                console.log(str2doc(res.body));
                doc = str2doc(res.body);
            }

            if (33 == 11) {
                var form = doc.forms[1];
                var fd = new FormData(form);
                var action = form.action;

                var params = new URLSearchParams('uid=b%40suddenattack.ga&pwd=manko123&order.x=92&order.y=1&crsirefo_hidden=918a6966be5131922a946f9fc3e14217dfa9d47d108a561ff5e902d98ba7af66');

                // params
                params.forEach((v, k) => {
                    if (k == 'uid') {
                        params.set(k, account.email);
                    } else if (k == 'pwd') {
                        params.set(k, account.password);
                    } else if (fd.get(k) == null) {
                        //params.delete(k);
                    } else
                        params.set(k, fd.get(k));
                });

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Referer': ref_url,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = null;
                if (proxy == null) {
                    res = await request({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostname,
                        port: 443,
                        path: login_paths[0],
                        headers: headers,
                        data: params.toString(),
                    });
                } else {
                    res = await prequest({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostname,
                        port: 443,
                        path: login_paths[0],
                        headers: headers,
                        data: params.toString(),
                    }, 'utf8', proxy.host, proxy.port);
                }

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                console.log(res);


                ref_url = 'https://www.atmos-tokyo.com' + login_paths[0];
            }

            {
                var params = new URLSearchParams('goods=cm997hbda220cmred000&x=121&y=20');

                params.set('goods', new URL(task.urls).pathname.replace('/shop/g/g', '').replace('/', ''));
                // option1 = size, option2 = color

                // params
                /*
                params.forEach((v, k) => {
                    if (k == 'option1') {
                        params.set(k, '70379441,2');
                    } else if (k == 'option2') {
                        params.set(k, '70379442,0');
                    } else if (fd.get(k) == null) {
                        //params.delete(k);
                    } else
                        params.set(k, fd.get(k));
                });
                */

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Referer': ref_url,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = null;
                if (proxy == null) {
                    res = await request({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostname,
                        port: 443,
                        path: req_paths[0],
                        headers: headers,
                        data: params.toString(),
                    }, 'shift_jis');
                } else {
                    res = await prequest({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostname,
                        port: 443,
                        path: req_paths[0],
                        headers: headers,
                        data: params.toString(),
                    }, 'shift_jis', proxy.host, proxy.port);
                }

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                ref_url = 'https://www.atmos-tokyo.com' + req_paths[0];

                doc = str2doc(res.body);
                console.log(params.toString());
                console.log(doc);
                var doc33 = doc;


                var form = doc.forms[0];
                var fd = new FormData(form);

                try {
                    var kk = form.innerText;
                } catch (ex) {
                    var thr = null;
                    thr.ERROR_001 = 0;
                }

                params = new URLSearchParams('refresh=true&rowcart1=1494480&rowgoods1=bq6546-013f09xlblck00&qty1=1&submit.x=136&submit.y=28');
                // params
                params.forEach((v, k) => {
                    if (fd.get(k) == null) {
                        //params.delete(k);
                    } else
                        params.set(k, fd.get(k));

                    console.log(k, fd.get(k));
                });

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Referer': ref_url,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = null;
                if (proxy == null) {
                    res = await request({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostname,
                        port: 443,
                        path: req_paths[0],
                        headers: headers,
                        data: params.toString(),
                    });
                } else {
                    res = await prequest({
                        method: 'POST',
                        protocol: 'https:',
                        hostname: hostname,
                        port: 443,
                        path: req_paths[0],
                        headers: headers,
                        data: params.toString(),
                    }, 'utf8', proxy.host, proxy.port);
                }

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                ref_url = 'https://' + hostname + req_paths[0];

                console.log(params.toString());
                console.log(res);

                var redir = 'https://' + hostname + res.headers.location;
                var uparam = splitUrl(redir);

                try {
                    var kk = uparam.protocol;
                } catch (ex) {
                    var thr = null;
                    thr.ERROR_002 = 0;
                }
                console.log(redir, uparam);

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                if (proxy == null) {
                    res = await request({
                        method: 'GET',
                        protocol: uparam.protocol,
                        hostname: uparam.hostname,
                        port: 443,
                        path: redir.replace('https://' + uparam.hostname, ''),
                        headers: headers,
                        data: '',
                    }, 'shift_jis');
                } else {
                    res = await prequest({
                        method: 'GET',
                        protocol: uparam.protocol,
                        hostname: uparam.hostname,
                        port: 443,
                        path: redir.replace('https://' + uparam.hostname, ''),
                        headers: headers,
                        data: '',
                    }, 'shift_jis', proxy.host, proxy.port);
                }
                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                    ref_url = 'https://www.atmos-tokyo.com' + req_paths[1];

                    doc = str2doc(res.body);

                }


                {

                    if (1 == 1) {
                        form = doc.forms[0];
                        fd = new FormData(form);

                        params = new URLSearchParams('uid=b%40suddenattack.ga&pwd=manko123&order.x=87&order.y=13&crsirefo_hidden=3f289d9a6597967438d71ad99d6edc927809ece9405a6f6b467ac0759ff7db9');
                        // params
                        params.forEach((v, k) => {
                            if (k == 'uid') {
                                params.set(k, account.email);
                            } else if (k == 'pwd') {
                                params.set(k, account.password);
                            } else if (fd.get(k) == null) {
                                //params.delete(k);
                            } else
                                params.set(k, fd.get(k));
                        });


                        var headers = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                            'Referer': ref_url,
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                            'Accept-Language': 'ja;q=1, en-US;q=0.9',
                            'Accept-Encoding': 'gzip, deflate',
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Cookie': cookie,
                        };
                        var res = null;
                        if (proxy == null) {
                            res = await request({
                                method: 'POST',
                                protocol: 'https:',
                                hostname: hostname,
                                port: 443,
                                path: req_paths[1],
                                headers: headers,
                                data: params.toString(),
                            });
                        } else {
                            res = await prequest({
                                method: 'POST',
                                protocol: 'https:',
                                hostname: hostname,
                                port: 443,
                                path: req_paths[1],
                                headers: headers,
                                data: params.toString(),
                            }, 'utf8', proxy.host, proxy.port);
                        }

                        if (res.headers.hasOwnProperty('set-cookie')) {
                            var c = res.headers['set-cookie'];
                            ck.init(cookie);
                            for (var i = 0; i < c.length; i++) {
                                var base = c[i].substring(0, c[i].indexOf(';'))
                                var key = base.substring(0, base.indexOf('='));
                                var value = base.substring(base.indexOf('=') + 1);

                                if (ck.get(key) == undefined) {
                                    ck.add(key, value);
                                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                                    ck.set(key, value);
                                }

                                cookie = ck.getAll();
                            }
                        }

                        ref_url = 'https://' + hostname + req_paths[1];

                        console.log(params.toString());
                        console.log(res);

                        redir = 'https://' + hostname + res.headers.location;
                        uparam = splitUrl(redir);
                        console.log(redir, uparam);

                        headers = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                            'Accept-Language': 'ja;q=1, en-US;q=0.9',
                            'Accept-Encoding': 'gzip, deflate',
                            'Cookie': cookie,
                        };
                        if (proxy == null) {
                            res = await request({
                                method: 'GET',
                                protocol: uparam.protocol,
                                hostname: uparam.hostname,
                                port: 443,
                                path: redir.replace('https://' + uparam.hostname, ''),
                                headers: headers,
                                data: '',
                            }, 'shift_jis');
                        } else {
                            res = await prequest({
                                method: 'GET',
                                protocol: uparam.protocol,
                                hostname: uparam.hostname,
                                port: 443,
                                path: redir.replace('https://' + uparam.hostname, ''),
                                headers: headers,
                                data: '',
                            }, 'shift_jis', proxy.host, proxy.port);
                        }
                        if (res.headers.hasOwnProperty('set-cookie')) {
                            var c = res.headers['set-cookie'];
                            ck.init(cookie);
                            for (var i = 0; i < c.length; i++) {
                                var base = c[i].substring(0, c[i].indexOf(';'))
                                var key = base.substring(0, base.indexOf('='));
                                var value = base.substring(base.indexOf('=') + 1);

                                if (ck.get(key) == undefined) {
                                    ck.add(key, value);
                                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                                    ck.set(key, value);
                                }

                                cookie = ck.getAll();
                            }
                        }
                    }

                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    if (proxy == null) {
                        res = await request({
                            method: 'GET',
                            protocol: 'https:',
                            hostname: hostname,
                            port: 443,
                            path: req_paths[1],
                            headers: headers,
                            data: '',
                        }, 'shift_jis');
                    } else {
                        res = await prequest({
                            method: 'GET',
                            protocol: 'https:',
                            hostname: hostname,
                            port: 443,
                            path: req_paths[1],
                            headers: headers,
                            data: '',
                        }, 'shift_jis', proxy.host, proxy.port);
                    }
                    if (res.headers.hasOwnProperty('set-cookie')) {
                        var c = res.headers['set-cookie'];
                        ck.init(cookie);
                        for (var i = 0; i < c.length; i++) {
                            var base = c[i].substring(0, c[i].indexOf(';'))
                            var key = base.substring(0, base.indexOf('='));
                            var value = base.substring(base.indexOf('=') + 1);

                            if (ck.get(key) == undefined) {
                                ck.add(key, value);
                            } else if (ck.get(key) != undefined && ck.get(key) != value) {
                                ck.set(key, value);
                            }

                            cookie = ck.getAll();
                        }
                    }

                    doc = str2doc(res.body);

                }

                {
                    ref_url = 'https://www.atmos-tokyo.com' + req_paths[1];

                    doc = str2doc(res.body);
                    console.log(params.toString());


                    form = doc.forms[0];
                    fd = new FormData(form);

                    params = new URLSearchParams('mode=&dest=0&nation_r0=1&rowgoods1=136064-006a260cmgray00&qty1=1&refresh=true&date_detail_spec=&time_spec=00&coupon=&promotion_code=&method=2&submit.x=104&submit.y=17');
                    // params
                    params.forEach((v, k) => {
                        if (fd.get(k) == null) {
                            //params.delete(k);
                        } else
                            params.set(k, fd.get(k));
                    });

                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Referer': ref_url,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie,
                    };
                    var res = null;
                    if (proxy == null) {
                        res = await request({
                            method: 'POST',
                            protocol: 'https:',
                            hostname: hostname,
                            port: 443,
                            path: req_paths[1],
                            headers: headers,
                            data: params.toString(),
                        });
                    } else {
                        res = await prequest({
                            method: 'POST',
                            protocol: 'https:',
                            hostname: hostname,
                            port: 443,
                            path: req_paths[1],
                            headers: headers,
                            data: params.toString(),
                        }, 'utf8', proxy.host, proxy.port);
                    }

                    if (res.headers.hasOwnProperty('set-cookie')) {
                        var c = res.headers['set-cookie'];
                        ck.init(cookie);
                        for (var i = 0; i < c.length; i++) {
                            var base = c[i].substring(0, c[i].indexOf(';'))
                            var key = base.substring(0, base.indexOf('='));
                            var value = base.substring(base.indexOf('=') + 1);

                            if (ck.get(key) == undefined) {
                                ck.add(key, value);
                            } else if (ck.get(key) != undefined && ck.get(key) != value) {
                                ck.set(key, value);
                            }

                            cookie = ck.getAll();
                        }
                    }

                    ref_url = 'https://' + hostname + req_paths[1];

                    console.log(params.toString());
                    console.log(res);

                    redir = 'https://' + hostname + res.headers.location;
                    uparam = splitUrl(redir);
                    console.log(redir, uparam);

                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    if (proxy == null) {
                        res = await request({
                            method: 'GET',
                            protocol: uparam.protocol,
                            hostname: uparam.hostname,
                            port: 443,
                            path: redir.replace('https://' + uparam.hostname, ''),
                            headers: headers,
                            data: '',
                        }, 'shift_jis');
                    } else {
                        res = await prequest({
                            method: 'GET',
                            protocol: uparam.protocol,
                            hostname: uparam.hostname,
                            port: 443,
                            path: redir.replace('https://' + uparam.hostname, ''),
                            headers: headers,
                            data: '',
                        }, 'shift_jis', proxy.host, proxy.port);
                    }
                    if (res.headers.hasOwnProperty('set-cookie')) {
                        var c = res.headers['set-cookie'];
                        ck.init(cookie);
                        for (var i = 0; i < c.length; i++) {
                            var base = c[i].substring(0, c[i].indexOf(';'))
                            var key = base.substring(0, base.indexOf('='));
                            var value = base.substring(base.indexOf('=') + 1);

                            if (ck.get(key) == undefined) {
                                ck.add(key, value);
                            } else if (ck.get(key) != undefined && ck.get(key) != value) {
                                ck.set(key, value);
                            }

                            cookie = ck.getAll();
                        }
                    }

                    doc = str2doc(res.body);
                }

                {
                    ref_url = 'https://www.atmos-tokyo.com' + req_paths[1];

                    doc = str2doc(res.body);
                    console.log(params.toString());


                    form = doc.forms[0];
                    fd = new FormData(form);

                    params = new URLSearchParams('estimate=467859&comment=&crsirefo_hidden=3f289d9a6597967438d71ad99d6edc927809ece9405a6f6b467ac0759ff7db9e&submit.x=73&submit.y=17');
                    // params
                    params.forEach((v, k) => {
                        if (fd.get(k) == null) {
                            //params.delete(k);
                        } else
                            params.set(k, fd.get(k));
                    });

                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Referer': ref_url,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie,
                    };
                    var res = null;
                    if (proxy == null) {
                        res = await request({
                            method: 'POST',
                            protocol: 'https:',
                            hostname: hostname,
                            port: 443,
                            path: req_paths[2],
                            headers: headers,
                            data: params.toString(),
                        });
                    } else {
                        res = await prequest({
                            method: 'POST',
                            protocol: 'https:',
                            hostname: hostname,
                            port: 443,
                            path: req_paths[2],
                            headers: headers,
                            data: params.toString(),
                        }, 'utf8', proxy.host, proxy.port);
                    }

                    if (res.headers.hasOwnProperty('set-cookie')) {
                        var c = res.headers['set-cookie'];
                        ck.init(cookie);
                        for (var i = 0; i < c.length; i++) {
                            var base = c[i].substring(0, c[i].indexOf(';'))
                            var key = base.substring(0, base.indexOf('='));
                            var value = base.substring(base.indexOf('=') + 1);

                            if (ck.get(key) == undefined) {
                                ck.add(key, value);
                            } else if (ck.get(key) != undefined && ck.get(key) != value) {
                                ck.set(key, value);
                            }

                            cookie = ck.getAll();
                        }
                    }

                    ref_url = 'https://' + hostname + req_paths[2];

                    console.log(params.toString());
                    console.log(res);

                    redir = 'https://' + hostname + res.headers.location;
                    uparam = splitUrl(redir);
                    console.log(redir, uparam);

                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cookie': cookie,
                    };
                    if (proxy == null) {
                        res = await request({
                            method: 'GET',
                            protocol: uparam.protocol,
                            hostname: uparam.hostname,
                            port: 443,
                            path: redir.replace('https://' + uparam.hostname, ''),
                            headers: headers,
                            data: '',
                        }, 'shift_jis');
                    } else {
                        res = await prequest({
                            method: 'GET',
                            protocol: uparam.protocol,
                            hostname: uparam.hostname,
                            port: 443,
                            path: redir.replace('https://' + uparam.hostname, ''),
                            headers: headers,
                            data: '',
                        }, 'shift_jis', proxy.host, proxy.port);
                    }
                    if (res.headers.hasOwnProperty('set-cookie')) {
                        var c = res.headers['set-cookie'];
                        ck.init(cookie);
                        for (var i = 0; i < c.length; i++) {
                            var base = c[i].substring(0, c[i].indexOf(';'))
                            var key = base.substring(0, base.indexOf('='));
                            var value = base.substring(base.indexOf('=') + 1);

                            if (ck.get(key) == undefined) {
                                ck.add(key, value);
                            } else if (ck.get(key) != undefined && ck.get(key) != value) {
                                ck.set(key, value);
                            }

                            cookie = ck.getAll();
                        }
                    }

                    doc = str2doc(res.body);
                }

                break;
            }
        } catch (ex) {
            console.log(ex);
        }

        await sleep(200);
    }
}

async function spf3_() {
    var csrf = '';
    var cookie = '';
    var doc = null;
    var ldoc = null;

    var items = [];

    const snf0 = '<meta name="csrf-token" content="';

    var ck = createCookieStore();
    let d = new Date();

    var login_paths = ['/shop/customer/menu.aspx'];
    var req_paths = ['/shop/cart/cart.aspx', '/shop/order/method.aspx', '/shop/order/estimate.aspx'];
    var ref_url = '';
    var hostname = 'www.atmos-tokyo.com';

    {
        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'GET',
            protocol: 'https:',
            hostname: hostname,
            port: 443,
            path: login_paths[0], // or /gold/mitasneakers/ectool/rnewitem/1407/design.html
            headers: headers,
            data: '',
        }, 'shift_jis');

        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
        }

        ref_url = 'https://www.atmos-tokyo.com' + login_paths[0];

        console.log(cookie);
        console.log(str2doc(res.body));
        doc = str2doc(res.body);
    }

    {
        var form = doc.forms[1];
        var fd = new FormData(form);
        var action = form.action;

        var params = new URLSearchParams('uid=b%40suddenattack.ga&pwd=manko123&order.x=92&order.y=1&crsirefo_hidden=918a6966be5131922a946f9fc3e14217dfa9d47d108a561ff5e902d98ba7af66');

        // params
        params.forEach((v, k) => {
            if (k == 'uid') {
                params.set(k, 'b@suddenattack.ga');
            } else if (k == 'pwd') {
                params.set(k, 'manko123');
            } else if (fd.get(k) == null) {
                //params.delete(k);
            } else
                params.set(k, fd.get(k));
        });

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Referer': ref_url,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'POST',
            protocol: 'https:',
            hostname: hostname,
            port: 443,
            path: login_paths[0],
            headers: headers,
            data: params.toString(),
        });

        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
        }

        console.log(res);


        ref_url = 'https://www.atmos-tokyo.com' + login_paths[0];
    }

    {
        var form = doc.forms[0];
        var fd = new FormData(form);
        var action = form.action;

        var params = new URLSearchParams('goods=cm997hbda220cmred000&x=121&y=20');

        // option1 = size, option2 = color

        // params
        /*
        params.forEach((v, k) => {
            if (k == 'option1') {
                params.set(k, '70379441,2');
            } else if (k == 'option2') {
                params.set(k, '70379442,0');
            } else if (fd.get(k) == null) {
                //params.delete(k);
            } else
                params.set(k, fd.get(k));
        });
        */

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Referer': ref_url,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'POST',
            protocol: 'https:',
            hostname: hostname,
            port: 443,
            path: req_paths[0],
            headers: headers,
            data: params.toString(),
        });

        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
        }

        ref_url = 'https://www.atmos-tokyo.com' + req_paths[0];

        doc = str2doc(res.body);
        console.log(params.toString());


        form = doc.forms[0];
        fd = new FormData(form);

        params = new URLSearchParams('refresh=true&rowcart1=1494480&rowgoods1=136064-006a260cmgray00&qty1=1&submit.x=136&submit.y=28');
        // params
        params.forEach((v, k) => {
            if (fd.get(k) == null) {
                //params.delete(k);
            } else
                params.set(k, fd.get(k));
        });

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Referer': ref_url,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'POST',
            protocol: 'https:',
            hostname: hostname,
            port: 443,
            path: req_paths[0],
            headers: headers,
            data: params.toString(),
        });

        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
        }

        ref_url = 'https://' + hostname + req_paths[0];

        console.log(params.toString());
        console.log(res);

        var redir = 'https://' + hostname + res.headers.location;
        var uparam = splitUrl(redir);
        console.log(redir, uparam);

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Cookie': cookie,
        };
        res = await request({
            method: 'GET',
            protocol: uparam.protocol,
            hostname: uparam.hostname,
            port: 443,
            path: redir.replace('https://' + uparam.hostname, ''),
            headers: headers,
            data: '',
        }, 'shift_jis');
        if (res.headers.hasOwnProperty('set-cookie')) {
            var c = res.headers['set-cookie'];
            ck.init(cookie);
            for (var i = 0; i < c.length; i++) {
                var base = c[i].substring(0, c[i].indexOf(';'))
                var key = base.substring(0, base.indexOf('='));
                var value = base.substring(base.indexOf('=') + 1);

                if (ck.get(key) == undefined) {
                    ck.add(key, value);
                } else if (ck.get(key) != undefined && ck.get(key) != value) {
                    ck.set(key, value);
                }

                cookie = ck.getAll();
            }
            ref_url = 'https://www.atmos-tokyo.com' + req_paths[1];

            doc = str2doc(res.body);
            console.log(params.toString());

        }


        {

            if (33 == 1) {
                form = doc.forms[0];
                fd = new FormData(form);

                params = new URLSearchParams('uid=b%40suddenattack.ga&pwd=manko123&order.x=87&order.y=13&crsirefo_hidden=3f289d9a6597967438d71ad99d6edc927809ece9405a6f6b467ac0759ff7db9');
                // params
                params.forEach((v, k) => {
                    if (fd.get(k) == null) {
                        //params.delete(k);
                    } else
                        params.set(k, fd.get(k));
                });
                params.set('uid', 'b@suddenattack.ga');
                params.set('pwd', 'manko123');

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Referer': ref_url,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie,
                };
                var res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostname,
                    port: 443,
                    path: req_paths[1],
                    headers: headers,
                    data: params.toString(),
                });

                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }

                ref_url = 'https://' + hostname + req_paths[1];

                console.log(params.toString());
                console.log(res);

                redir = 'https://' + hostname + res.headers.location;
                uparam = splitUrl(redir);
                console.log(redir, uparam);

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': cookie,
                };
                res = await request({
                    method: 'GET',
                    protocol: uparam.protocol,
                    hostname: uparam.hostname,
                    port: 443,
                    path: redir.replace('https://' + uparam.hostname, ''),
                    headers: headers,
                    data: '',
                }, 'shift_jis');
                if (res.headers.hasOwnProperty('set-cookie')) {
                    var c = res.headers['set-cookie'];
                    ck.init(cookie);
                    for (var i = 0; i < c.length; i++) {
                        var base = c[i].substring(0, c[i].indexOf(';'))
                        var key = base.substring(0, base.indexOf('='));
                        var value = base.substring(base.indexOf('=') + 1);

                        if (ck.get(key) == undefined) {
                            ck.add(key, value);
                        } else if (ck.get(key) != undefined && ck.get(key) != value) {
                            ck.set(key, value);
                        }

                        cookie = ck.getAll();
                    }
                }
            }

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            res = await request({
                method: 'GET',
                protocol: 'https:',
                hostname: hostname,
                port: 443,
                path: req_paths[1],
                headers: headers,
                data: '',
            }, 'shift_jis');
            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            doc = str2doc(res.body);

        }

        {
            ref_url = 'https://www.atmos-tokyo.com' + req_paths[1];

            doc = str2doc(res.body);
            console.log(params.toString());


            form = doc.forms[0];
            fd = new FormData(form);

            params = new URLSearchParams('mode=&dest=0&nation_r0=1&rowgoods1=136064-006a260cmgray00&qty1=1&refresh=true&date_detail_spec=&time_spec=00&coupon=&promotion_code=&method=2&submit.x=104&submit.y=17');
            // params
            params.forEach((v, k) => {
                if (fd.get(k) == null) {
                    //params.delete(k);
                } else
                    params.set(k, fd.get(k));
            });

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Referer': ref_url,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'POST',
                protocol: 'https:',
                hostname: hostname,
                port: 443,
                path: req_paths[1],
                headers: headers,
                data: params.toString(),
            });

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            ref_url = 'https://' + hostname + req_paths[1];

            console.log(params.toString());
            console.log(res);

            redir = 'https://' + hostname + res.headers.location;
            uparam = splitUrl(redir);
            console.log(redir, uparam);

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            res = await request({
                method: 'GET',
                protocol: uparam.protocol,
                hostname: uparam.hostname,
                port: 443,
                path: redir.replace('https://' + uparam.hostname, ''),
                headers: headers,
                data: '',
            }, 'shift_jis');
            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            doc = str2doc(res.body);
        }

        {
            ref_url = 'https://www.atmos-tokyo.com' + req_paths[1];

            doc = str2doc(res.body);
            console.log(params.toString());


            form = doc.forms[0];
            fd = new FormData(form);

            params = new URLSearchParams('estimate=467859&comment=&crsirefo_hidden=3f289d9a6597967438d71ad99d6edc927809ece9405a6f6b467ac0759ff7db9e&submit.x=73&submit.y=17');
            // params
            params.forEach((v, k) => {
                if (fd.get(k) == null) {
                    //params.delete(k);
                } else
                    params.set(k, fd.get(k));
            });

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Referer': ref_url,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'POST',
                protocol: 'https:',
                hostname: hostname,
                port: 443,
                path: req_paths[2],
                headers: headers,
                data: params.toString(),
            });

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            ref_url = 'https://' + hostname + req_paths[2];

            console.log(params.toString());
            console.log(res);

            redir = 'https://' + hostname + res.headers.location;
            uparam = splitUrl(redir);
            console.log(redir, uparam);

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja;q=1, en-US;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            res = await request({
                method: 'GET',
                protocol: uparam.protocol,
                hostname: uparam.hostname,
                port: 443,
                path: redir.replace('https://' + uparam.hostname, ''),
                headers: headers,
                data: '',
            }, 'shift_jis');
            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            doc = str2doc(res.body);
        }

        return;
    }
}

async function nike(ock) {
    var access_token = '';
    var cookie = '';
    var doc = null;

    var items = [];

    var ck = createCookieStore();

    function rnd(len) {
        var letters = 'abcdef';
        var numbers = '0123456789';
        var str = letters + letters.toLocaleLowerCase() + numbers;

        var ret = '';

        for (var i = 0; i < len; i++) {
            ret += str.charAt(Math.floor(Math.random() * str.length));
        }
        return ret;
    }

    var req_paths = ['/shop/cart/cart.aspx', '/shop/order/method.aspx', '/shop/order/estimate.aspx'];
    var ref_url = '';
    var hostnames = ['s3.nikecdn.com', 'api.nike.com', 'www.nike.com', 'unite.nike.com']

    // get cookie
    if (1 == 2) {
        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36',
            'Origin': 'https://www.nike.com',
            'Connection': 'close',
            'X-NewRelic-ID': 'VQYGVF5SCBADUVBRBgAGVg==',
            'Referer': 'https://www.nike.com/jp/ja_jp',
            'Accept': '*/*',
            'Accept-Language': 'en-us',
            'Cookie': cookie,
        };
        var res = await request({
            method: 'GET',
            protocol: 'https:',
            hostname: hostnames[2],
            port: 443,
            path: '/public/e1ba0f8a6170db888b07d6359213d',
            headers: headers,
            data: '',
        });

        ck = updateCookieStore(ck, cookie, res);
        cookie = ck.getAll();
    }

    // login logic (pending)
    if (1 == 1) {
        cookie = '';
        var ref = 'https://s3.nikecdn.com/unite/mobile.html?mid=08457895229216778591210823154223404456?iOSSDKVersion=3.0.0&clientId=G64vA0b95ZruUtGk1K0FkAgaO3Ch30sj&uxId=com.nike.commerce.snkrs.ios&view=none&locale=ja_JP&backendEnvironment=identity';
        var ref2 = '/login?appVersion=540&experienceVersion=438&uxid=com.nike.commerce.snkrs.ios&locale=ja_JP&backendEnvironment=identity&browser=Apple%20Computer%2C%20Inc.&os=undefined&mobile=true&native=true&visit=1&visitor=923db8ab-4c2c-1ddb-75e2-ad9fe13ef1fe';

        var sensor_data = '{"sensor_data":"7a74G7m23Vrp0o5c9056512.4-1,2,-94,-100,Mozilla/5.0 (iPhone; CPU iPhone OS 10_2 like Mac OS X) AppleWebKit/602.3.12 (KHTML, like Gecko) Mobile/14C92,uaend,2419,20030107,ja-jp,Gecko,0,0,0,0,381276,6145419,320,568,320,568,320,568,undefined,,cpen:0,i1:0,dm:0,cwen:0,non:1,opc:0,fc:0,sc:0,wrc:0,isc:0,vib:0,bat:0,x11:0,x12:1,8174,0.13986349969,774803072699.5,loc:-1,2,-94,-101,do_en,dm_en,t_en-1,2,-94,-105,-1,2,-94,-102,-1,2,-94,-108,-1,2,-94,-110,-1,2,-94,-117,-1,2,-94,-111,-1,2,-94,-109,-1,2,-94,-114,-1,2,-94,-103,-1,2,-94,-112,https://s3.nikecdn.com/unite/mobile.html?mid=08457895229216778591210823154223404456?iOSSDKVersion=3.0.0&clientId=G64vA0b95ZruUtGk1K0FkAgaO3Ch30sj&uxId=com.nike.commerce.snkrs.ios&view=none&locale=ja_JP&backendEnvironment=identity-1,2,-94,-115,1,0,0,0,0,0,0,34,0,1549606145399,-999999,16577,0,0,2762,0,0,57,0,0,3822CC84035E18C94AB4170B826BF5FE~-1~YAAQZawsFyLMtK5oAQAAn6Y1zAF2tky5ZiebOpp/MO/RvDMVXa1SVsKKvZqxj1941JmM57tHPG1Ht65kI16LxBmeLigcSGlz3huqw7Ub7gr045G0QxOc7c0z5IalSIkgwcu+J5A4WLX9RlfnAmmkD0zQZsXbTrD9/mp3bo9A+dROY8J82nRKQ037FuONuM73/+RvIa8K6OO/F9zu6n5DGokdWzLN51uQrH9Gk2DWERXMBWUoFkoBwBKzJ8JVQyTipPntdLsdOaePxZfi3jyTX7+tf51Fk5Fjl0UjEY0=~-1~-1~-1,29888,-1,-1,25165904-1,2,-94,-106,0,0-1,2,-94,-119,-1-1,2,-94,-122,0,0,0,0,1,0,0-1,2,-94,-123,-1,2,-94,-70,-1-1,2,-94,-80,94-1,2,-94,-116,153635805-1,2,-94,-118,89731-1,2,-94,-121,;40;-1;0"}';
        var sensor_data2 = '{"sensor_data":"7a74G7m23Vrp0o5c9056512.4-1,2,-94,-100,Mozilla/5.0 (iPhone; CPU iPhone OS 10_2 like Mac OS X) AppleWebKit/602.3.12 (KHTML, like Gecko) Mobile/14C92,uaend,2419,20030107,ja-jp,Gecko,0,0,0,0,381276,6145419,320,568,320,568,320,568,undefined,,cpen:0,i1:0,dm:0,cwen:0,non:1,opc:0,fc:0,sc:0,wrc:0,isc:0,vib:0,bat:0,x11:0,x12:1,8174,0.376771067188,774803072699.5,loc:-1,2,-94,-101,do_en,dm_en,t_en-1,2,-94,-105,-1,2,-94,-102,-1,2,-94,-108,-1,2,-94,-110,-1,2,-94,-117,-1,2,-94,-111,0,257,0.00,-0.60,0.23;-1,2,-94,-109,0,256,-0.00,-0.01,0.03,0.04,0.09,-9.78,-0.01,-0.28,0.12;1,354,0.00,-0.00,0.01,0.04,0.10,-9.79,0.13,0.08,0.05;-1,2,-94,-114,-1,2,-94,-103,-1,2,-94,-112,https://s3.nikecdn.com/unite/mobile.html?mid=08457895229216778591210823154223404456?iOSSDKVersion=3.0.0&clientId=G64vA0b95ZruUtGk1K0FkAgaO3Ch30sj&uxId=com.nike.commerce.snkrs.ios&view=none&locale=ja_JP&backendEnvironment=identity-1,2,-94,-115,1,0,0,257,611,0,868,354,0,1549606145399,27,16577,0,0,2762,0,0,355,867,0,3822CC84035E18C94AB4170B826BF5FE~-1~YAAQZawsFyLMtK5oAQAAn6Y1zAF2tky5ZiebOpp/MO/RvDMVXa1SVsKKvZqxj1941JmM57tHPG1Ht65kI16LxBmeLigcSGlz3huqw7Ub7gr045G0QxOc7c0z5IalSIkgwcu+J5A4WLX9RlfnAmmkD0zQZsXbTrD9/mp3bo9A+dROY8J82nRKQ037FuONuM73/+RvIa8K6OO/F9zu6n5DGokdWzLN51uQrH9Gk2DWERXMBWUoFkoBwBKzJ8JVQyTipPntdLsdOaePxZfi3jyTX7+tf51Fk5Fjl0UjEY0=~-1~-1~-1,29888,594,-506329147,25165904-1,2,-94,-106,7,1-1,2,-94,-119,-1-1,2,-94,-122,0,0,0,0,1,0,0-1,2,-94,-123,-1,2,-94,-70,-799479183;dis;;true;true;true;-540;false;32;32;true;false;-1-1,2,-94,-80,4894-1,2,-94,-116,153635805-1,2,-94,-118,96851-1,2,-94,-121,;2;87;0"}';
        var sensor_data3 = '{"sensor_data":"7a74G7m23Vrp0o5c9056512.4-1,2,-94,-100,Mozilla/5.0 (iPhone; CPU iPhone OS 10_2 like Mac OS X) AppleWebKit/602.3.12 (KHTML, like Gecko) Mobile/14C92,uaend,2419,20030107,ja-jp,Gecko,0,0,0,0,381276,6145419,320,568,320,568,320,568,undefined,,cpen:0,i1:0,dm:0,cwen:0,non:1,opc:0,fc:0,sc:0,wrc:0,isc:0,vib:0,bat:0,x11:0,x12:1,8174,0.836484706418,774803072699.5,loc:-1,2,-94,-101,do_en,dm_en,t_en-1,2,-94,-105,-1,2,-94,-102,-1,2,-94,-108,-1,2,-94,-110,-1,2,-94,-117,-1,2,-94,-111,0,257,0.00,-0.60,0.23;1,360,0.00,-0.60,0.23;-1,2,-94,-109,0,256,-0.00,-0.01,0.03,0.04,0.09,-9.78,-0.01,-0.28,0.12;1,354,0.00,-0.00,0.01,0.04,0.10,-9.79,0.13,0.08,0.05;-1,2,-94,-114,-1,2,-94,-103,-1,2,-94,-112,https://s3.nikecdn.com/unite/mobile.html?mid=08457895229216778591210823154223404456?iOSSDKVersion=3.0.0&clientId=G64vA0b95ZruUtGk1K0FkAgaO3Ch30sj&uxId=com.nike.commerce.snkrs.ios&view=none&locale=ja_JP&backendEnvironment=identity-1,2,-94,-115,1,0,0,618,611,0,1229,360,0,1549606145399,27,16577,0,0,2762,0,0,361,1227,0,3822CC84035E18C94AB4170B826BF5FE~-1~YAAQZawsFyLMtK5oAQAAn6Y1zAF2tky5ZiebOpp/MO/RvDMVXa1SVsKKvZqxj1941JmM57tHPG1Ht65kI16LxBmeLigcSGlz3huqw7Ub7gr045G0QxOc7c0z5IalSIkgwcu+J5A4WLX9RlfnAmmkD0zQZsXbTrD9/mp3bo9A+dROY8J82nRKQ037FuONuM73/+RvIa8K6OO/F9zu6n5DGokdWzLN51uQrH9Gk2DWERXMBWUoFkoBwBKzJ8JVQyTipPntdLsdOaePxZfi3jyTX7+tf51Fk5Fjl0UjEY0=~-1~-1~-1,29888,594,-506329147,25165904-1,2,-94,-106,6,2-1,2,-94,-119,-1-1,2,-94,-122,0,0,0,0,1,0,0-1,2,-94,-123,-1,2,-94,-70,-799479183;dis;;true;true;true;-540;false;32;32;true;false;-1-1,2,-94,-80,4894-1,2,-94,-116,153635805-1,2,-94,-118,97986-1,2,-94,-121,;2;87;0"}';

        var data2 = '{"username":"a@g.cc","password":"Manko123","client_id":"G64vA0b95ZruUtGk1K0FkAgaO3Ch30sj","ux_id":"com.nike.commerce.snkrs.ios","grant_type":"password"}';
        //data = data.replace('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36', 'Mozilla/5.0 (Linux; Android 8.1.0; KYT33 Build/3.020VE.0072.a;wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/66.0.3359.126 Safari/537.36');

        if (1 == 1) {
            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36',
                'Connection': 'close',
                'Referer': ref,
                'X-NewRelic-ID': 'VQYGVF5SCBADUVBRBgAGVg==',
                'Accept': '*/*',
                'Accept-Language': 'en-us',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'GET',
                protocol: 'https:',
                hostname: hostnames[0],
                port: 443,
                path: ref.replace('https://' + hostnames[0], ''),
                headers: headers,
                data: '',
            });

            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36',
                'Connection': 'close',
                'Referer': ref,
                'X-NewRelic-ID': 'VQYGVF5SCBADUVBRBgAGVg==',
                'Accept': '*/*',
                'Accept-Language': 'en-us',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'GET',
                protocol: 'https:',
                hostname: hostnames[0],
                port: 443,
                path: ref.replace('https://' + hostnames[0], ''),
                headers: headers,
                data: '',
            });

            if (res.headers.hasOwnProperty('set-cookie')) {
                var c = res.headers['set-cookie'];
                ck.init(cookie);
                for (var i = 0; i < c.length; i++) {
                    var base = c[i].substring(0, c[i].indexOf(';'))
                    var key = base.substring(0, base.indexOf('='));
                    var value = base.substring(base.indexOf('=') + 1);

                    if (ck.get(key) == undefined) {
                        ck.add(key, value);
                    } else if (ck.get(key) != undefined && ck.get(key) != value) {
                        ck.set(key, value);
                    }

                    cookie = ck.getAll();
                }
            }

            await sleep(400);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36',
                'Connection': 'close',
                'Referer': ref,
                'X-NewRelic-ID': 'VQYGVF5SCBADUVBRBgAGVg==',
                'Accept': '*/*',
                'Accept-Language': 'en-us',
                'Accept-Encoding': 'gzip, deflate',
                'Cookie': cookie,
            };
            var res = await request({
                method: 'GET',
                protocol: 'https:',
                hostname: hostnames[0],
                port: 443,
                path: '/public/ad3818fb4170db888b07d6359213d',
                headers: headers,
                data: '',
            });

            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();

            //console.log(cookie, 'cookie1');



            var sensor_id = '7a74G7m23Vrp0o5c9056531';
            var static_abck = '3822CC84035E18C94AB4170B826BF5FE~-1~YAAQZawsFyLMtK5oAQAAn6Y1zAF2tky5ZiebOpp/MO/RvDMVXa1SVsKKvZqxj1941JmM57tHPG1Ht65kI16LxBmeLigcSGlz3huqw7Ub7gr045G0QxOc7c0z5IalSIkgwcu+J5A4WLX9RlfnAmmkD0zQZsXbTrD9/mp3bo9A+dROY8J82nRKQ037FuONuM73/+RvIa8K6OO/F9zu6n5DGokdWzLN51uQrH9Gk2DWERXMBWUoFkoBwBKzJ8JVQyTipPntdLsdOaePxZfi3jyTX7+tf51Fk5Fjl0UjEY0=~-1~-1~-1';

            sensor_data.replace('7a74G7m23Vrp0o5c9056512', sensor_id);
            sensor_data2.replace('7a74G7m23Vrp0o5c9056512', sensor_id);
            sensor_data3.replace('7a74G7m23Vrp0o5c9056512', sensor_id);

            sensor_data.replace(static_abck, ck.get('_abck'));
            sensor_data2.replace(static_abck, ck.get('_abck'));
            sensor_data3.replace(static_abck, ck.get('_abck'));

            console.log('abck: ' + ck.get('_abck'));
            for (var i = 0; i < 3; i++) {
                var data = '';

                if (i == 0)
                    data = sensor_data;
                else if (i == 1)
                    data = sensor_data2;
                else if (i == 2) {
                    data = sensor_data3;
                }

                console.log(data.length);
                var headers = {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_2 like Mac OS X) AppleWebKit/602.3.12 (KHTML, like Gecko) Mobile/14C92',
                    'Connection': 'close',
                    'Origin': 'https://s3.nikecdn.com',
                    'Referer': ref,
                    'X-NewRelic-ID': 'VQYGVF5SCBADUVBRBgAGVg==',
                    'Accept': '*/*',
                    'Accept-Language': 'en-us',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'text/plain;charset=UTF-8',
                    'Cookie': cookie,
                };
                res = await request({
                    method: 'POST',
                    protocol: 'https:',
                    hostname: hostnames[0],
                    port: 443,
                    path: '/public/ad3818fb4170db888b07d6359213d',
                    headers: headers,
                    data: data,
                }, 'utf8', '127.0.0.1', '31389');

                if (i == 2) {
                    ck = updateCookieStore(ck, cookie, res);
                    cookie = ck.getAll();

                    console.log(res);
                }
                await sleep(400);
            }

            ref2 = ref2.replace('923db8ab-4c2c-1ddb-75e2-ad9fe13ef1fe', '3151403d-118b-47d1-9ca1-fd2c5b63fa0d');
            var headers = {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_2 like Mac OS X) AppleWebKit/602.3.12 (KHTML, like Gecko) Mobile/14C92',
                'Connection': 'close',
                'Origin': 'https://s3.nikecdn.com',
                'Referer': ref,
                'X-NewRelic-ID': 'VQYGVF5SCBADUVBRBgAGVg==',
                'Accept': '*/*',
                'Accept-Language': 'en-us',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'text/plain; charset=UTF-8',
                'Content-Length': data2.length,
                'Cookie': cookie,
            };
            res = await request({
                method: 'POST',
                protocol: 'https:',
                hostname: hostnames[0],
                port: 443,
                path: ref2,
                headers: headers,
                data: data2
            }, 'utf8', '192.168.0.5', '7777');

            ck = updateCookieStore(ck, cookie, res);
            cookie = ck.getAll();
            console.log(res, cookie);
        }
        return;
    }

    {
        //var xxx = await tokenRefresh('eyJhbGciOiJSUzI1NiIsImtpZCI6IjA3ZmQ4ZGJmLTU3NDktNDlkNC05NDNkLTIzNDIwMmNiYjk3MXNpZyJ9.eyJ0cnVzdCI6MTAwLCJpYXQiOjE1NTA0NTIxNTMsImV4cCI6MTU4MTk4ODE1MywiaXNzIjoib2F1dGgyaWR0IiwianRpIjoiYjQ0YTM3YjktMmZiNS00ZDRlLTk2MzUtMDhiYWI5Y2JhZTllIiwibGF0IjoxNTQ4Njg0ODg5LCJhdWQiOiJvYXV0aDJpZHQiLCJjbGkiOiJxRzlmSmJuTWNCUEFNR2liUFJHSTcyWnI4OWw4Q0Q0UiIsInN1YiI6ImE2NGY3YTY4LTgwMWMtNDQyZC04MDcyLTUwYTliZWRmYTZlOSIsInNidCI6Im5pa2U6cGx1cyJ9.hGLXD87REDLZjiagPv_4MxAZAicsC8S-uGY2oRnifFymg1HKWlX-F3dpj2COZAl0sx1HXUQDY6oV5bA4YYt6TTaRSSSMmschKCUIFuK7xhe4N8J0__qI66faFDc3Bzb2tT41TxfFeSORKQtslohjka5fHj-rry36DoqlBKGSfcZ4M1ywz-zzR_aqAiRHTD2tXRic4d3S-hX5t1LbRJvCIp2fFf79osO-oUu1d0vdsaGw96UvboiPP06AWYjlFRyx3ZbWYc-fPl50CnN_LEjLrr2Itzlb_ckSixeCwlABVRynhLis-ljldTTyyVTvAdSBMM3hpHyhpiqCXrAeWmUQAg');
        //console.log(xxx);
        //return;
        async function tokenRefresh(access_token) {
            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/x-www-form-urlencoded',
            };
            var json = JSON.parse('{"refresh_token":"","client_id":"qG9fJbnMcBPAMGibPRGI72Zr89l8CD4R","grant_type":"refresh_token"}');
            json.refresh_token = access_token;

            var res = await request({
                method: 'POST',
                protocol: 'https:',
                hostname: 'unite.nike.com',
                port: 443,
                path: '/tokenRefresh?platform=android&browser=uniteSDK&mobile=true&native=true&uxid=com.nike.commerce.snkrs.droid&locale=ja_JP&osVersion=22&sdkVersion=2.8.1&backendEnvironment=identity',
                headers: headers,
                data: JSON.stringify(json),
            });

            console.log(JSON.parse(res.body));

            return JSON.parse(res.body).access_token;
        }
        async function os2(access_token) {
            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + access_token,
            };
            var res = await request({
                method: 'GET',
                protocol: 'https:',
                hostname: 'api.nike.com',
                port: 443,
                path: '/user/commerce',
                headers: headers,
                data: '',
            });

            return res.body;
        }
        async function os3(access_token, method, url, req) {
            var _url = new URL(url);

            var headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json; charset=UTF-8',
                'Authorization': 'Bearer ' + access_token,
            };
            var res = await request({
                method: method,
                protocol: 'https:',
                hostname: _url.hostname,
                port: 443,
                path: _url.href.replace(_url.protocol + '//' + _url.hostname, ''),
                headers: headers,
                data: req,
            });

            return res.body;
        }

        var cf = function(ppp, json) {
            var base = JSON.parse('{"country":"JP","currency":"JPY","items":[{"id":"cd7f5e1d-bd58-4440-9a39-c2c05c91404e","shippingAddress":{"address1":"","address3":"","city":"","country":"","postalCode":"","state":""},"skuId":""}]}');
            if (1 == 2) {
                base.country = ppp.country;
                base.currency = ppp.currency;
            }

            base.items[0].id = rnd(8) + '-' + rnd(4) + '-' + rnd(4) + '-' + rnd(4) + '-' + rnd(12);
            base.items[0].skuId = ppp.currentItem.skuId;
            base.items[0].shippingAddress.address1 = json.address.shipping.line1;
            base.items[0].shippingAddress.address3 = json.address.shipping.line3;
            base.items[0].shippingAddress.city = json.address.shipping.locality;
            base.items[0].shippingAddress.country = json.address.shipping.country;
            base.items[0].shippingAddress.postalCode = json.address.shipping.code;
            base.items[0].shippingAddress.state = json.address.shipping.province;

            return base;
        }

        var cf2 = function(ppp, json) {
            var base = JSON.parse('{"request":{"channel":"SNKRS","clientInfo":{"client":"com.nike.commerce.snkrs.droid","deviceId":"0500Wb3E+oJtQlmU/IbsWRkTZmWUgD1JCAUyquyilPw01FWVuGJR+J9h7Zz7X83biv/AwKgzHUJi7gvt5rZjad1e25BtE+y7kzHCM/KDybJjrya9JGz3zJUgYOL4gLO3PgCAIg8vIFqdp2SrBZhff62Wf9zDj5VbewjENATnZHg+zBFkI46k0hwrpcuY3JOlGSfHhvXsWPJq3kv3sMGb7GvGmg3OPEC9KAoqN96pxh+VC7UvKCO3Jsgk5ouUAN+2CrQbr/pZ5Dvt163DMGLGpU+0qd1Om1R9/YgTT/2ePpLUcFFj5skj1+1GGrvMkiuDuBZ9t2azXdnJ3oKs6pngf9WpOsHpN828YrBqcdhvxUzwB4TN8ICQCSmUSd79YjEMyndVzYWm5Dh0Ba/zMKdLHQ5Yt4JHTNzTo+JFcMmRgkpKej8DcQ7iMZMGl0R/LlW2jc4RD9eXdGDp0LFaLU97kbP/QwBIEKAFWjYzRb8rHBZIsQGTBz7YRqljNEz1eQCNN19G"},"country":"JP","currency":"JPY","email":"","invoiceInfo":[],"items":[{"contactInfo":{"email":"","phoneNumber":""},"id":"e1be6809-3ebb-45ab-960b-153b6f5a46c0","quantity":1,"recipient":{"altFirstName":"","altLastName":"","firstName":"","lastName":""},"shippingAddress":{"address1":"","address3":"","city":"","country":"JP","postalCode":"","state":""},"shippingMethod":"GROUND_SERVICE","skuId":"","valueAddedServices":[]}],"locale":"ja_JP"}}');

            if (1 == 2) {
                base.request.country = ppp.country;
                base.request.currency = ppp.currency;
                base.request.locale = ppp.locale;
            }
            base.request.items[0].id = rnd(8) + '-' + rnd(4) + '-' + rnd(4) + '-' + rnd(4) + '-' + rnd(12);
            base.request.items[0].skuId = ppp.currentItem.skuId;
            base.request.items[0].shippingAddress.address1 = json.address.shipping.line1;
            base.request.items[0].shippingAddress.address3 = json.address.shipping.line3;
            base.request.items[0].shippingAddress.city = json.address.shipping.locality;
            base.request.items[0].shippingAddress.country = json.address.shipping.country;
            base.request.items[0].shippingAddress.postalCode = json.address.shipping.code;
            base.request.items[0].shippingAddress.state = json.address.shipping.province;
            base.request.email = json.emails.primary.email;
            base.request.items[0].contactInfo.email = json.emails.primary.email;
            base.request.items[0].contactInfo.phoneNumber = json.address.shipping.phone.primary;
            base.request.items[0].recipient.altFirstName = json.address.shipping.name.alternate.given;
            base.request.items[0].recipient.altLastName = json.address.shipping.name.alternate.family;
            base.request.items[0].recipient.firstName = json.address.shipping.name.primary.given;
            base.request.items[0].recipient.lastName = json.address.shipping.name.primary.family;

            return base;
        }

        var cf3 = function(ppp, json) {
            var base = JSON.parse('{"address1":"","address2":"","address3":"","alternateFirstName":"","alternateLastName":"","city":"","country":"JP","firstName":"","guid":"f5a52ae0-c906-4e6b-83ed-fc107dae7022","label":"","lastName":"","phoneNumber":"","postalCode":"","preferred":true,"state":""}');

            base.address1 = json.address.shipping.line1;
            base.address3 = json.address.shipping.line3;
            base.alternateFirstName = json.address.shipping.name.alternate.given;
            base.alternateLastName = json.address.shipping.name.alternate.family;
            base.city = json.address.shipping.locality;
            base.country = json.address.shipping.country;
            base.firstName = json.address.shipping.name.primary.given;
            base.lastName = json.address.shipping.name.primary.family;
            base.alternateLastName = json.address.shipping.name.alternate.family;
            base.alternateLastName = json.address.shipping.name.alternate.family;
            base.phoneNumber = json.address.shipping.phone.primary;
            base.postalCode = json.address.shipping.code;
            base.preferred = json.address.shipping.preferred;
            base.state = json.address.shipping.province;

            return base;
        }


        var cf4 = function(ppp, json, checkoutId, paymentId) {
            var base = JSON.parse('{"checkoutId":"ca46a22f-133a-458f-930a-bdea9ea9b91d","country":"JP","currency":"JPY","items":[{"productId":"ba72c4f1-fd06-5a5d-a42e-902066460de4","shippingAddress":{"address1":"","address3":"","city":"","country":"JP","postalCode":"","state":""}}],"paymentInfo":[{"billingInfo":{"address":{"address1":"","address3":"","city":"","country":"JP","postalCode":"","state":""},"contactInfo":{"email":"","phoneNumber":""},"name":{"firstName":"","lastName":""}},"id":"ba66e1be-9939-4a2a-b1c4-b82056e10a3d","paymentId":"","type":"CreditCard"}],"total":"10260"}');

            if (1 == 2) {
                base.country = ppp.country;
                base.currency = ppp.currency;
            }
            base.checkoutId = checkoutId;
            base.paymentInfo[0].paymentId = paymentId;
            base.total = ppp.currentItem.price;

            base.items[0].productId = ppp.currentItem.pid;
            base.items[0].shippingAddress.address1 = json.address.shipping.line1;
            base.items[0].shippingAddress.address3 = json.address.shipping.line3;
            base.items[0].shippingAddress.city = json.address.shipping.locality;
            base.items[0].shippingAddress.country = json.address.shipping.country;
            base.items[0].shippingAddress.postalCode = json.address.shipping.code;
            base.items[0].shippingAddress.state = json.address.shipping.province;

            base.paymentInfo[0].billingInfo.address.address1 = json.address.shipping.line1;
            base.paymentInfo[0].billingInfo.address.address3 = json.address.shipping.line3;
            base.paymentInfo[0].billingInfo.address.city = json.address.shipping.locality;
            base.paymentInfo[0].billingInfo.address.country = json.address.shipping.country;
            base.paymentInfo[0].billingInfo.address.postalCode = json.address.shipping.code;
            base.paymentInfo[0].billingInfo.address.state = json.address.shipping.province;
            base.paymentInfo[0].billingInfo.contactInfo.email = json.emails.primary.email;
            base.paymentInfo[0].billingInfo.contactInfo.phoneNumber = json.address.shipping.phone.primary;
            base.paymentInfo[0].billingInfo.name.firstName = json.address.shipping.name.primary.given;
            base.paymentInfo[0].billingInfo.name.lastName = json.address.shipping.name.primary.family;
            return base;
        }

        var cf5 = function(ppp, json, paymentToken, priceChecksum) {
            var base = JSON.parse('{"request":{"channel":"SNKRS","clientInfo":{"client":"com.nike.commerce.snkrs.droid","deviceId":"0500Wb3E+oJtQlmU/IbsWRkTZmWUgD1JCAUyquyilPw01FWVuGJR+J9h7Zz7X83biv/AwKgzHUJi7gvt5rZjad1e25BtE+y7kzHCM/KDybJjrya9JGz3zJUgYOL4gLO3PgCAIg8vIFqdp2SrBZhff62Wf9zDj5VbewjENATnZHg+zBFkI46k0hwrpcuY3JOlGSfHhvXsWPJq3kv3sMGb7GvGmg3OPEC9KAoqN96pxh+VC7UvKCO3Jsgk5ouUAN+2CrQbr/pZ5Dvt163DMGLGpU+0qd1Om1R9/YgTT/2ePpLUcFFj5skj1+1GGrvMkiuDuBZ9t2azXdnJ3oKs6pngf9WpOsHpN828YrBqcdhvxUzwB4TN8ICQCSmUSd79YjEMyndVzYWm5Dh0Ba/zMKdLHQ5Yt4JHTNzTo+JFcMmRgkpKej8DcQ7iMZMGl0R/LlW2jc4RD9eXdGDp0LFaLU97kbP/QwBIEKAFWjYzRb8rHBZIsQGTBz7YRqljNEz1eQCNN19G"},"country":"JP","currency":"JPY","email":"","invoiceInfo":[],"items":[{"contactInfo":{"email":"","phoneNumber":""},"id":"e1be6809-3ebb-45ab-960b-153b6f5a46c0","quantity":1,"recipient":{"altFirstName":"","altLastName":"","firstName":"","lastName":""},"shippingAddress":{"address1":"","address3":"","city":"","country":"JP","postalCode":"","state":""},"shippingMethod":"GROUND_SERVICE","skuId":"9a610f83-e227-5767-b125-68e2f64417bf","valueAddedServices":[]}],"locale":"ja_JP","paymentToken":"ab5e9843-3c97-4174-a8bb-bb10e780a976","priceChecksum":"553c940883df6c31347fd14e5a550efd"}}');
            if (1 == 2) {
                base.request.country = ppp.country;
                base.request.currency = ppp.currency;
                base.request.locale = ppp.locale;
            }

            base.request.paymentToken = paymentToken;
            base.request.priceChecksum = priceChecksum;

            base.request.items[0].id = rnd(8) + '-' + rnd(4) + '-' + rnd(4) + '-' + rnd(4) + '-' + rnd(12);
            base.request.items[0].skuId = ppp.currentItem.skuId;
            base.request.items[0].shippingAddress.address1 = json.address.shipping.line1;
            base.request.items[0].shippingAddress.address3 = json.address.shipping.line3;
            base.request.items[0].shippingAddress.city = json.address.shipping.locality;
            base.request.items[0].shippingAddress.country = json.address.shipping.country;
            base.request.items[0].shippingAddress.postalCode = json.address.shipping.code;
            base.request.items[0].shippingAddress.state = json.address.shipping.province;
            base.request.email = json.emails.primary.email;
            base.request.items[0].contactInfo.email = json.emails.primary.email;
            base.request.items[0].contactInfo.phoneNumber = json.address.shipping.phone.primary;
            base.request.items[0].recipient.altFirstName = json.address.shipping.name.alternate.given;
            base.request.items[0].recipient.altLastName = json.address.shipping.name.alternate.family;
            base.request.items[0].recipient.firstName = json.address.shipping.name.primary.given;
            base.request.items[0].recipient.lastName = json.address.shipping.name.primary.family;

            return base;
        }

        var cf6 = function(ppp, json, checkoutId, launchId, paymentToken, priceChecksum) {
            var base = JSON.parse('{"channel":"SNKRS","checkoutId":"8e0b1cde-7984-48eb-81b3-a1ee7302fe0f","currency":"JPY","deviceId":"0500NVzX1470tGMHOCAl+nFJLr1sapHxgu0ThNQp6mfyV7PZHXJifrJi3jEIioU2tF3Jxv7Rkk8x7xcTnAEKZD4eZF5tD76NZn0wCY1ZmyYDP4W+2jDMZksrDBMBs590vxE9aNIjDTzoAyznoNsdpsMPMK9R87CqRNIPBexir3zrDRjnGNWNWg6kmma1VgF4D/cSsUj2gKvXCYqD9N6I0wlDh9a5b/ukUtHNug+fl08vR2sGRAk4ixvJn2Ff57FDStxscSyFQNmr8AK1kWPmfUfbZQT1ZOrqH7ej7WnrR8HJgUtMA9uApLMabLYMKBWiiR97EPmXfAy5OWjegp/uDMVrXs4UIv//fH/YxbyZEGZ1bKLDcF5CHnECIKHzkwmRsIwiVQE3x02C8W17DdOh/galqCvYnxFNSzyfMan5bF25/pJuj6SnwgvC6ngOip8gde+b4w+08DJ3J36nWu27Wb4kN3qwHiWGnhVajxHYqbu8Iphx0cjrJUtDQIA0kTNtlKug","launchId":"1bae17a9-384a-4da9-b9f4-9d4fdd897695","locale":"ja_JP","paymentToken":"237e014d-1a0e-4424-b47b-2ee07aca16d1","priceChecksum":"b7afda941031c761775ad4241f3004f2","shipping":{"address":{"address1":"2194","address3":"大川町富田西","city":"さぬき市","country":"JP","postalCode":"761-0901","state":"JP-37"},"method":"GROUND_SERVICE","recipient":{"email":"okayrop2@yahoo.co.jp","phoneNumber":"818086393985","altFirstName":"ショウ","altLastName":"マルヤマ","firstName":"翔","lastName":"丸山"}},"skuId":"c50eda1e-d3d4-521c-a965-640d51dc5cfa"}');

            if (1 == 2) {
                base.currency = ppp.currency;
                base.locale = ppp.locale;
            }

            base.checkoutId = checkoutId;
            base.launchId = launchId;
            base.paymentToken = paymentToken;
            base.priceChecksum = priceChecksum;

            base.skuId = ppp.currentItem.skuId;
            base.shipping.address.address1 = json.address.shipping.line1;
            base.shipping.address.address3 = json.address.shipping.line3;
            base.shipping.address.city = json.address.shipping.locality;
            base.shipping.address.country = json.address.shipping.country;
            base.shipping.address.postalCode = json.address.shipping.code;
            base.shipping.address.state = json.address.shipping.province;
            base.shipping.recipient.email = json.emails.primary.email;
            base.shipping.recipient.phoneNumber = json.address.shipping.phone.primary;
            base.shipping.recipient.altFirstName = json.address.shipping.name.alternate.given;
            base.shipping.recipient.altLastName = json.address.shipping.name.alternate.family;
            base.shipping.recipient.firstName = json.address.shipping.name.primary.given;
            base.shipping.recipient.lastName = json.address.shipping.name.primary.family;

            return base;
        }

        var ppp = {
            currentItem: {
                pid: '',
                skuId: '',
                price: ''
            }
        };
        var launchId = '';
        var didenter = false;
        var access_token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjA3ZmQ4ZGJmLTU3NDktNDlkNC05NDNkLTIzNDIwMmNiYjk3MXNpZyJ9.eyJ0cnVzdCI6MTAwLCJpYXQiOjE1NTA1NDQ3MzIsImV4cCI6MTU4MjA4MDczMiwiaXNzIjoib2F1dGgyaWR0IiwianRpIjoiNjAyOGIyODUtMTVlYy00ZjMwLTliYmEtYWQ3ZTNmMzY1MmVkIiwibGF0IjoxNTQ4Njg0ODg5LCJhdWQiOiJvYXV0aDJpZHQiLCJjbGkiOiJxRzlmSmJuTWNCUEFNR2liUFJHSTcyWnI4OWw4Q0Q0UiIsInN1YiI6ImE2NGY3YTY4LTgwMWMtNDQyZC04MDcyLTUwYTliZWRmYTZlOSIsInNidCI6Im5pa2U6cGx1cyJ9.enDNFZmJSB0BpkybxTsMysQblPtbDlBg-k_m5W2-IjnpcIBQ-fjdhmjmr_oUYDHklLZ6dJD895kWWzDo4C_WA9uM2s_he47Jvx5M6OGfFWNMpAgsvtqmrNICNNDHZfCCn7kXBhIUFbtiMw-egHwtDKI5txlAK07aiickx7EIfdY6WvXw-ugi_roVqepTQ1ERhwGOZAD37DZIaxjj6eadhPlGGrmWQxTxPtErIssGA49OiUROmkruaQ_dcm-uANuucqz49GDlZ9eHh-nA1ecscbvyvj-onV-qFcdSHzICM_fch51coA_TG_ICdbrILmFKYFF2sggsPInXle9BmL0OvA';

        {

            ppp.currentItem.pid = '89af76cb-6839-53d6-8fbd-9fc2ce1a5503';
            ppp.currentItem.skuId = '8ff8a7b5-cc3d-5f54-b3a4-31bcd5650cfd';
            ppp.currentItem.price = '17280';

            access_token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjA3ZmQ4ZGJmLTU3NDktNDlkNC05NDNkLTIzNDIwMmNiYjk3MXNpZyJ9.eyJ0cnVzdCI6MTAwLCJpYXQiOjE1NTA1NDQ3MzIsImV4cCI6MTU4MjA4MDczMiwiaXNzIjoib2F1dGgyaWR0IiwianRpIjoiNjAyOGIyODUtMTVlYy00ZjMwLTliYmEtYWQ3ZTNmMzY1MmVkIiwibGF0IjoxNTQ4Njg0ODg5LCJhdWQiOiJvYXV0aDJpZHQiLCJjbGkiOiJxRzlmSmJuTWNCUEFNR2liUFJHSTcyWnI4OWw4Q0Q0UiIsInN1YiI6ImE2NGY3YTY4LTgwMWMtNDQyZC04MDcyLTUwYTliZWRmYTZlOSIsInNidCI6Im5pa2U6cGx1cyJ9.enDNFZmJSB0BpkybxTsMysQblPtbDlBg-k_m5W2-IjnpcIBQ-fjdhmjmr_oUYDHklLZ6dJD895kWWzDo4C_WA9uM2s_he47Jvx5M6OGfFWNMpAgsvtqmrNICNNDHZfCCn7kXBhIUFbtiMw-egHwtDKI5txlAK07aiickx7EIfdY6WvXw-ugi_roVqepTQ1ERhwGOZAD37DZIaxjj6eadhPlGGrmWQxTxPtErIssGA49OiUROmkruaQ_dcm-uANuucqz49GDlZ9eHh-nA1ecscbvyvj-onV-qFcdSHzICM_fch51coA_TG_ICdbrILmFKYFF2sggsPInXle9BmL0OvA';
            access_token = await tokenRefresh(access_token);
            userInfo = JSON.parse(await os2(access_token));


            // run this func before passed the start selling time/

            {
                res = JSON.parse(await os3(access_token, 'GET', 'https://api.nike.com/snkrs/content/v1?country=JP&language=ja&offset=0&orderBy=lastUpdated', ''));

                var threads = res.threads;
                var got = false;

                var tIndexs = [];

                for (var i = 0; i < threads.length; i++) {
                    var product = threads[i].product;

                    // find out the product by style code
                    if (product.style = '555088') {
                        tIndexs.push(i);
                        got = true;
                        break;
                    }
                }

                if (got) {
                    var thread = threads[tIndexs[0]];
                    var product = thread.product;

                    var pid = product.id;
                    var skuId = '';
                    var price = product.price.currentRetailPrice;

                    product.skus.forEach((sku) => {
                        if (sku.nikeSize == size) {
                            skuId = sku.id;
                            return;
                        }
                    });

                    if (skuId != '') {

                        // write here your logic of join a entry
                        for (;;) {
                            try {
                                var checkoutId = rnd(8) + '-' + rnd(4) + '-' + rnd(4) + '-' + rnd(4) + '-' + rnd(12);
                                var creditCardInfoId = rnd(8) + '-' + rnd(4) + '-' + rnd(4) + '-' + rnd(4) + '-' + rnd(12);
                                var paymentId = '';
                                var type = '';
                                var cardType = '';
                                var accountNumber = '';
                                var priceChecksum = '';
                                var paymentToken = '';

                                // await os1();
                                if (1 == 2) {
                                    var access_token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjA3ZmQ4ZGJmLTU3NDktNDlkNC05NDNkLTIzNDIwMmNiYjk3MXNpZyJ9.eyJ0cnVzdCI6MTAwLCJpYXQiOjE1NTA0NTIxNTMsImV4cCI6MTU4MTk4ODE1MywiaXNzIjoib2F1dGgyaWR0IiwianRpIjoiYjQ0YTM3YjktMmZiNS00ZDRlLTk2MzUtMDhiYWI5Y2JhZTllIiwibGF0IjoxNTQ4Njg0ODg5LCJhdWQiOiJvYXV0aDJpZHQiLCJjbGkiOiJxRzlmSmJuTWNCUEFNR2liUFJHSTcyWnI4OWw4Q0Q0UiIsInN1YiI6ImE2NGY3YTY4LTgwMWMtNDQyZC04MDcyLTUwYTliZWRmYTZlOSIsInNidCI6Im5pa2U6cGx1cyJ9.hGLXD87REDLZjiagPv_4MxAZAicsC8S-uGY2oRnifFymg1HKWlX-F3dpj2COZAl0sx1HXUQDY6oV5bA4YYt6TTaRSSSMmschKCUIFuK7xhe4N8J0__qI66faFDc3Bzb2tT41TxfFeSORKQtslohjka5fHj-rry36DoqlBKGSfcZ4M1ywz-zzR_aqAiRHTD2tXRic4d3S-hX5t1LbRJvCIp2fFf79osO-oUu1d0vdsaGw96UvboiPP06AWYjlFRyx3ZbWYc-fPl50CnN_LEjLrr2Itzlb_ckSixeCwlABVRynhLis-ljldTTyyVTvAdSBMM3hpHyhpiqCXrAeWmUQAg';
                                    var access_token = await tokenRefresh(access_token);
                                    console.log(access_token);

                                    var userInfo = JSON.parse(await os2(access_token));

                                    console.log('got token & info');
                                }
                                //get launchId
                                //res = JSON.parse(await os3(access_token, 'GET', 'https://api.nike.com/launch/launch_views/v2/?filter=productId(' + ppp.currentItem.pid + ')', ''));
                                //launchId = res.objects[0].id;


                                var req = cf3(ppp, userInfo);
                                var res = JSON.parse(await os3(access_token, 'POST', 'https://api.nike.com/commerce/storedpayments/consumer/storedpayments?currency=JPY', JSON.stringify(req)));
                                console.log(res);
                                paymentId = res.payments[0].paymentId;
                                type = res.payments[0].type;
                                cardType = res.payments[0].cardType;
                                accountNumber = res.payments[0].accountNumber;

                                req = cf2(ppp, userInfo);
                                res = JSON.parse(await os3(access_token, 'PUT', 'https://api.nike.com/buy/checkout_previews/v2/' + checkoutId, JSON.stringify(req)));
                                res = JSON.parse(await os3(access_token, 'GET', 'https://api.nike.com/buy/checkout_previews/v2/jobs/' + checkoutId, ''));

                                console.log(res);
                                //res = await os3(access_token, 'POST', 'https://api.nike.com/paymentcc/creditcardsubmit/creditcardsubmit/' + creditCardInfoId + '/store', '{"cvNumber":"388"}');

                                req = cf4(ppp, userInfo, checkoutId, paymentId);
                                res = JSON.parse(await os3(access_token, 'POST', 'https://api.nike.com/payment/preview/v2', JSON.stringify(req)));
                                paymentToken = res.id;

                                res = JSON.parse(await os3(access_token, 'GET', 'https://api.nike.com/payment/preview/v2/jobs/' + paymentToken, ''));

                                try {
                                    priceChecksum = res.response.priceChecksum;
                                } catch (ex) {
                                    priceChecksum = '';
                                }

                                // buy
                                if (1 == 2) {
                                    req = cf5(userInfo, paymentToken, priceChecksum);
                                    res = JSON.parse(await os3(access_token, 'PUT', 'https://api.nike.com/buy/checkouts/v2/' + checkoutId, JSON.stringify(req)));
                                    res = JSON.parse(await os3(access_token, 'GET', 'https://api.nike.com/buy/checkouts/v2/jobs/' + checkoutId, ''));
                                }

                                //entry
                                req = cf6(ppp, userInfo, checkoutId, launchId, paymentToken, priceChecksum);
                                res = JSON.parse(await os3(access_token, 'POST', 'https://api.nike.com/launch/entries/v2', JSON.stringify(req)));
                                console.log(res);
                                res = JSON.parse(await os3(access_token, 'GET', 'https://api.nike.com/launch/entries/v2' + res.id, ''));
                                console.log(res);

                                didenter = true;
                            } catch (ex) {
                                console.log(ex);
                                didenter = false;
                            }

                            if (didenter)
                                break;
                            await sleep(100);
                        }
                    }
                }

                return;
            }

            for (;;) {
                res = JSON.parse(await os3(access_token, 'GET', 'https://api.nike.com/snkrs/content/v1?country=JP&language=ja&offset=0&orderBy=lastUpdated', ''));

                var threads = res.threads;
                var got = false;

                var tIndexs = [];

                for (var i = 0; i < threads.length; i++) {
                    var product = threads[i].product;
                    var startSellDate = product.startSellDate;

                    if (startSellDate !== undefined && startSellDate.indexOf('2019-02-21') >= 0) {
                        tIndexs.push(i);
                        got = true;
                    }
                }

                if (got) {
                    var size = '9.5';
                    var keywords = ['shadow']
                    for (var i = 0; i < tIndexs.length; i++) {
                        var thread = threads[tIndexs[i]];
                        var product = thread.product;

                        ppp.currentItem.pid = product.id;
                        ppp.currentItem.skuId = '';
                        ppp.currentItem.price = product.price.currentRetailPrice;

                        var seo = thread.seoSlug.toLowerCase();
                        var keyword_inc = 0;

                        keywords.forEach((element) => {
                            if (seo.indexOf(element) >= 0) {
                                keyword_inc++;
                            }
                        });

                        if (keywords.length == keyword_inc) {
                            product.skus.forEach((sku) => {
                                if (sku.nikeSize == size) {
                                    ppp.currentItem.skuId = sku.id;
                                    return;
                                }
                            });
                        }
                        if (ppp.currentItem.skuId != '') {
                            break;
                        }
                    }
                    if (ppp.currentItem.skuId != '') {
                        break;
                    }
                }
                await sleep(100);
            }

            for (;;) {
                try {
                    res = JSON.parse(await os3(access_token, 'GET', 'https://api.nike.com/launch/launch_views/v2/?filter=productId(' + ppp.currentItem.pid + ')', ''));

                    var objects = res.objects;
                    if (objects.length != 0) {
                        for (var i = 0; i < objects.length; i++) {
                            if (objects[i].startEntryDate.indexOf('2019-02-21') >= 0) {
                                console.log(objects[i]);
                                launchId = objects[i].id;
                                console.log('新しいエントリーを見つけました。' + (new Date()));


                                var cnn = 0;
                                for (;;) {

                                    {
                                        try {
                                            var checkoutId = rnd(8) + '-' + rnd(4) + '-' + rnd(4) + '-' + rnd(4) + '-' + rnd(12);
                                            var creditCardInfoId = rnd(8) + '-' + rnd(4) + '-' + rnd(4) + '-' + rnd(4) + '-' + rnd(12);
                                            var paymentId = '';
                                            var type = '';
                                            var cardType = '';
                                            var accountNumber = '';
                                            var priceChecksum = '';
                                            var paymentToken = '';

                                            // await os1();
                                            if (1 == 2) {
                                                var access_token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjA3ZmQ4ZGJmLTU3NDktNDlkNC05NDNkLTIzNDIwMmNiYjk3MXNpZyJ9.eyJ0cnVzdCI6MTAwLCJpYXQiOjE1NTA0NTIxNTMsImV4cCI6MTU4MTk4ODE1MywiaXNzIjoib2F1dGgyaWR0IiwianRpIjoiYjQ0YTM3YjktMmZiNS00ZDRlLTk2MzUtMDhiYWI5Y2JhZTllIiwibGF0IjoxNTQ4Njg0ODg5LCJhdWQiOiJvYXV0aDJpZHQiLCJjbGkiOiJxRzlmSmJuTWNCUEFNR2liUFJHSTcyWnI4OWw4Q0Q0UiIsInN1YiI6ImE2NGY3YTY4LTgwMWMtNDQyZC04MDcyLTUwYTliZWRmYTZlOSIsInNidCI6Im5pa2U6cGx1cyJ9.hGLXD87REDLZjiagPv_4MxAZAicsC8S-uGY2oRnifFymg1HKWlX-F3dpj2COZAl0sx1HXUQDY6oV5bA4YYt6TTaRSSSMmschKCUIFuK7xhe4N8J0__qI66faFDc3Bzb2tT41TxfFeSORKQtslohjka5fHj-rry36DoqlBKGSfcZ4M1ywz-zzR_aqAiRHTD2tXRic4d3S-hX5t1LbRJvCIp2fFf79osO-oUu1d0vdsaGw96UvboiPP06AWYjlFRyx3ZbWYc-fPl50CnN_LEjLrr2Itzlb_ckSixeCwlABVRynhLis-ljldTTyyVTvAdSBMM3hpHyhpiqCXrAeWmUQAg';
                                                var access_token = await tokenRefresh(access_token);
                                                console.log(access_token);

                                                var userInfo = JSON.parse(await os2(access_token));

                                                console.log('got token & info');
                                            }
                                            //get launchId
                                            //res = JSON.parse(await os3(access_token, 'GET', 'https://api.nike.com/launch/launch_views/v2/?filter=productId(' + ppp.currentItem.pid + ')', ''));
                                            //launchId = res.objects[0].id;


                                            var req = cf3(ppp, userInfo);
                                            var res = JSON.parse(await os3(access_token, 'POST', 'https://api.nike.com/commerce/storedpayments/consumer/storedpayments?currency=JPY', JSON.stringify(req)));
                                            console.log(res);
                                            paymentId = res.payments[0].paymentId;
                                            type = res.payments[0].type;
                                            cardType = res.payments[0].cardType;
                                            accountNumber = res.payments[0].accountNumber;

                                            req = cf2(ppp, userInfo);
                                            res = JSON.parse(await os3(access_token, 'PUT', 'https://api.nike.com/buy/checkout_previews/v2/' + checkoutId, JSON.stringify(req)));
                                            res = JSON.parse(await os3(access_token, 'GET', 'https://api.nike.com/buy/checkout_previews/v2/jobs/' + checkoutId, ''));

                                            console.log(res);
                                            //res = await os3(access_token, 'POST', 'https://api.nike.com/paymentcc/creditcardsubmit/creditcardsubmit/' + creditCardInfoId + '/store', '{"cvNumber":"388"}');

                                            req = cf4(ppp, userInfo, checkoutId, paymentId);
                                            res = JSON.parse(await os3(access_token, 'POST', 'https://api.nike.com/payment/preview/v2', JSON.stringify(req)));
                                            paymentToken = res.id;

                                            res = JSON.parse(await os3(access_token, 'GET', 'https://api.nike.com/payment/preview/v2/jobs/' + paymentToken, ''));

                                            try {
                                                priceChecksum = res.response.priceChecksum;
                                            } catch (ex) {
                                                priceChecksum = '';
                                            }

                                            // buy
                                            if (1 == 2) {
                                                req = cf5(userInfo, paymentToken, priceChecksum);
                                                res = JSON.parse(await os3(access_token, 'PUT', 'https://api.nike.com/buy/checkouts/v2/' + checkoutId, JSON.stringify(req)));
                                                res = JSON.parse(await os3(access_token, 'GET', 'https://api.nike.com/buy/checkouts/v2/jobs/' + checkoutId, ''));
                                            }

                                            //entry
                                            req = cf6(ppp, userInfo, checkoutId, launchId, paymentToken, priceChecksum);
                                            res = JSON.parse(await os3(access_token, 'POST', 'https://api.nike.com/launch/entries/v2', JSON.stringify(req)));
                                            console.log(res);
                                            res = JSON.parse(await os3(access_token, 'GET', 'https://api.nike.com/launch/entries/v2' + res.id, ''));
                                            console.log(res);

                                            didenter = true;
                                        } catch (ex) {
                                            console.log(ex);
                                            didenter = false;
                                        }
                                    }
                                    if (didenter) {
                                        console.log('エントリーしました。' + (new Date()));
                                        break;
                                    }
                                    await sleep(100);
                                }
                                break;
                            }
                        }
                    }
                    if (didenter)
                        break;
                } catch (ex) {
                    if (33333 == 1) {

                    }
                }
                await sleep(500);
            }
        }
    }
}

(async() => {
    //await sleep(4000);
    //await spf4();
    // await spf0();
    //await spf1();
    //console.log(dt);
    //await spf2();
    //await spf3();
    //await nike();
    //await spf5();
    //await spf6();
    //await spf7();
    //await rakuma();
    //await calif();
    //await nike(0);
    //await rakuten4popi(null);
    //await supyo();



    /*
    (async () => { await rakuten4popi(0); })();
    (async () => { await rakuten4popi(1); })();
    (async () => { await rakuten4popi(2); })();
    */

    
   var headers = {
    'User-Agent': 'fefefefe',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ja;q=1, en-US;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
};

var start = new Date().getTime();
var res = await request({
    method: 'GET',
    url: 'http://localhost/react.php',
    headers: headers,
    data: '',
}, 'utf8');

console.log(res);
    return;
    var str = 'A'.repeat(0x100000);
    for (var i = 0; i < 10; i++) {

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
        };

        var start = new Date().getTime();
        var res = await request({
            method: 'PUT',
            url: 'http://localhost/aaaa',
            headers: headers,
            data: str.repeat(100),
        }, 'utf8');

    }

    await sleep(2000);
    // first time, send the test request for assign memory. 
    {
        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
        };

        var start = new Date().getTime();
        var res = await request({
            method: 'GET',
            url: 'https://www.google.com',
            headers: headers,
            data: '',
        }, 'utf8');
    }

    //await ug_shaft();

    return;
    (async() => {
        return;
        await sleep(2000);
        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Cookie': '',
        };
        var res = null;

        for (var i = 0; i < 1; i++) {
            var startTime = new Date().getTime();
            res = await request({
                method: 'GET',
                url: 'https://item.rakuten.co.jp/yamada-denki/1177992013/',
                headers: headers,
                data: ''
            }, 'utf8');
            console.log(new Date().getTime() - startTime);
            await sleep(10);
        }

    })();
    return;
    var headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ja;q=1, en-US;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
    };

    var start = new Date().getTime();
    var res = await request({
        method: 'POST',
        url: 'https://www.googfaf3433le.com',
        headers: headers,
        data: '',
    }, 'utf8');

    console.log(res);
    return;
    await sleep(3000);
    var headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ja;q=1, en-US;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
    };

    var start = new Date().getTime();
    var res = await request({
        method: 'GET',
        url: 'https://www.googfaf3433le.com',
        headers: headers,
        data: '',
    }, 'utf8');

    return;
    (async() => {
        await rakutenLogin(0);
        var ti = new Date().getTime();

        await Promise.all(new Array(3).fill(0).map(async(v, idx) => {
            await rakutenCartIn(idx);
        }));

        await rakutenCheckOut(0);
        console.log(new Date().getTime() - ti);
    })();
    //console.log('rip ');

    setTimeout(async() => {
        return;
        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja;q=1, en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
        };

        var start = new Date().getTime();
        var res = await request({
            method: 'GET',
            url: 'https://www.google.com',
            headers: headers,
            data: '',
        }, 'utf8');
        //　明日やること：センサー処理と、検知処理、そしてVM Protectとファイルの暗号化・JSの難読化

        console.log(new Date().getTime() - start);


        /*
        await Promise.all(new Array(4).fill(0).map(async (v, i) => {
            var res = await request({
                method: 'GET',
                url: 'https://www.google.com',
                headers: headers,
                data: '',
            }, 'utf8');
            //　明日やること：センサー処理と、検知処理、そしてVM Protectとファイルの暗号化・JSの難読化
        
            console.log(res);
        }));
        */

    }, 500);
})();