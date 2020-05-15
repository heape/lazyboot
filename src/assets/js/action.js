(async () => {


    // nike callback
    if (1 == 2) {
        /*
        window.webview = document.getElementById('wv');
        webview.addEventListener('ipc-message', function (event) {
            switch (event.channel) {
                case 'access_token':
                    var access_token = JSON.parse(event.args[0]).access_token;
                    nikeLoginCallback(access_token, curAccount);
                    webview.loadURL('about:blank');
                    //nike(event.args[0]);
                    break;
                case 'log':
                    console.log(event.args[0]);
                    break;
            }
        });
        */

        window.nikeLogin = function (account) {
            window.curAccount = account;
            const loadPage = () => {
                webview.send('getAccount', account);
                webview.removeEventListener('dom-ready', loadPage);
            };
            webview.loadURL('https://store.nike.com/jp/ja_jp/?l=shop,login_register');
            webview.addEventListener('dom-ready', loadPage);

            $('#settings-ac-add').prop('disabled', true);
        }

        window.nikeLoginCallback = async function (access_token, account) {
            var obj = addAccessToken(access_token, account);
            lazyb = (await execdb()).lazyb;

            console.log(access_token, obj);

            $('#settings-ac-add').prop('disabled', false);
        }

        function addAccessToken(access_token, account) {
            var o = null;
            lazyb.accounts.forEach((obj, index) => {
                if (obj.id == account.id) {
                    lazyb.accounts[index].access_token = access_token;
                    o = obj;
                }
            });
            return o;
        }
    }
    // setup main lazyb object
    {
        function findRetailer(name) {
            var o = null;
            var names = Object.getOwnPropertyNames(lazyb.retailers);
            names.forEach(n => {
                lazyb.retailers[n].forEach(obj => {
                    if (obj.name == name)
                        o = obj;
                });
            });
            return o;
        }
        function findRetailerById(retailer_id) {
            var o = null;
            var names = Object.getOwnPropertyNames(lazyb.retailers);
            names.forEach(n => {
                lazyb.retailers[n].forEach(obj => {
                    if (obj.id == retailer_id)
                        o = obj;
                });
            });
            return o.name;
        }
        function findTask(task_id) {
            var o = null;
            lazyb.tasks.forEach(obj => {
                if (obj.id == task_id)
                    o = obj;
            });
            return o;
        }
        function findAccounts(retailer_id) {
            var o = [];
            lazyb.accounts.forEach(obj => {
                if (obj.retailer_id == retailer_id)
                    o.push(obj);
            });
            return o;
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
        function findProxyIndex(proxy_id) {
            var o = null;
            lazyb.proxies.forEach((obj, n) => {
                if (obj.id == proxy_id)
                    o = n;
            });
            return o;
        }
        function findBilling(billing_id) {
            var o = null;
            lazyb.billings.forEach(v => {
                if (v.id == billing_id)
                    o = v;
            });

            return o;
        }
        function findBillingIndex(billing_id) {
            var o = null;
            lazyb.billings.forEach((v, idx) => {
                if (v.id == billing_id)
                    o = idx;
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

        /*
        window.lazyb_captcha = {
            tokens: [{
                response: 'feawaewfjwkiaw',
                expire: 1000849759
            }]
        }
        */

        var retailers = {
            general: [
                { id: 1, name: 'Supreme' },
                { id: 2, name: 'SNKRS' },
                { id: 3, name: 'Atmos' },
                { id: 4, name: 'Adidas' },
            ],
            rakuten: [
                { id: 200, name: 'yamaotoko' },
                { id: 201, name: 'mitan' },
                { id: 202, name: 'project1-6' },
                { id: 203, name: 'rakutenTest' },
            ],
        };

        window.lazyb_captcha = {
            tokens: [],
            tokens2: []
        }
        window.lazyb = {
            retailers: retailers, tasks: [], proxies: [], billings: [], accounts: [], queues: {
                types: {
                    '1': [],
                    '2': [],
                }
            }
        };
        //lazyb.retailers = retailers;

        var Datastore = require('nedb');
        window.db = new Datastore({
            filename: 'resources/app/src/assets/ds/database.db',
            autoload: true
        });

        window.execdb = function (readOnly = false) {
            var created_at = new Date().getTime(), updated_at = created_at;
            var doc = {
                lazyb: lazyb,
                created_at: created_at,
                updated_at: updated_at,
            };

            return new Promise(resolve => {
                // insert or update doc
                db.find({}, function (err, docs) {
                    if (docs.length == 0) {
                        // insert
                        db.insert(doc, function (error, newDoc) {
                            resolve(newDoc);
                        });
                    } else {
                        if (readOnly) {
                            // check for retailers updates
                            if (JSON.stringify(retailers) !== JSON.stringify(docs[0].lazyb.retailers)) {
                                // update
                                docs[0].lazyb.retailers = retailers;
                                db.update({ _id: docs[0]._id }, {
                                    lazyb: docs[0].lazyb,
                                    created_at: docs[0].created_at,
                                    updated_at: doc.updated_at,
                                }, function (error) {
                                    resolve({
                                        lazyb: docs[0].lazyb,
                                        created_at: docs[0].created_at,
                                        updated_at: doc.updated_at,
                                    });
                                });
                            } else {
                                // nothing
                                resolve(docs[0]);
                            }
                        } else {
                            // update
                            db.update({ _id: docs[0]._id }, {
                                lazyb: doc.lazyb,
                                created_at: docs[0].created_at,
                                updated_at: doc.updated_at,
                            }, function (error) {
                                resolve({
                                    lazyb: doc.lazyb,
                                    created_at: docs[0].created_at,
                                    updated_at: doc.updated_at,
                                });
                            });
                        }
                    }
                });
            });
        };

        lazyb = (await execdb(true)).lazyb;
        lazyb.queues = {
            types: {
                '1': [],
                '2': [],
            }
        };

        lazyb.accounts.forEach((o, idx) => {
            if (o.temporary.cookie != '') {
                lazyb.accounts[idx].temporary.cookie = '';
            }
        });
        lazyb = (await execdb()).lazyb;
    }

    // restore Tasks
    {

        lazyb.tasks.forEach((t, idx) => {

            var task_id = t.id;

            var tbody = $('#task-table > tbody');
            var tr = tbody.children('tr').eq(0).clone().removeAttr('style');
            tr.attr('task_id', task_id);
            var columns = tr.children();

            var retailer = findRetailerById(t.retailer_id);
            var retailer_id = t.retailer_id;
            var product = t.keywords; // keywords;
            var size = t.js_size;
            var style = t.js_style;
            var startTime = 'manual';
            var proxy = 'none';
            var status = 'idle';

            columns.eq(0).text(task_id);
            columns.eq(1).text(retailer);
            columns.eq(2).text(product);
            columns.eq(3).text(size);
            columns.eq(4).text(style);
            columns.eq(5).text(startTime);
            columns.eq(6).text(proxy);
            columns.eq(7).text(status);

            // initiate and pause task
            columns.eq(8).find('span > button').eq(0).on('click', function hoho(e) {
                var oclass = 'btn btn-success btn-rounded btn-sm0 m-0 waves-effect waves-light';
                //var modified = 'btn btn-danger btn-rounded btn-sm0 m-0';

                var columns_ = $(this).parents('tr').children().eq(8);
                var original = '<button type="button" class="btn btn-success btn-rounded btn-sm0 m-0 waves-effect waves-light" style="top: 0"><i class="fa fa-play-circle"></i></button>';
                var modified = '<button type="button" class="btn btn-danger btn-rounded btn-sm0 m-0 waves-effect waves-light" style="top: 1px"><i class="fa fa-pause-circle"></i></button>';
                var id = parseInt($(this).parents('tr').children().eq(0).text(), 10);
                lazyb.tasks.forEach((o, n) => {
                    if (o.id == id) {

                        //$('button[data-target="#basicExampleModal"]').click();

                        /*
                        if ($(e.target).attr('class') == original) {
                            $(e.target).attr('class', modified);
                            $(e.target).children('i').attr('class', 'fa fa-pause-circle');
                        }
                        else {
                            $(e.target).attr('class', original);
                            $(e.target).children('i').attr('class', 'fa fa-play-circle');
                        }
                        */

                        function updateStatus(task_id, status) {
                            var tbody = $('#task-table > tbody');
                            var tr = tbody.find('tr[task_id="' + task_id + '"]');
                            var columns = tr.children();

                            columns.eq(7).text(status);
                        }

                        // initiate
                        if ($(this).attr('class').indexOf(oclass) != -1) {
                            if (lazyb.tasks[n].done)
                                return;
                            if (!lazyb.tasks[n].allow_ctrl)
                                return;

                            var old = $(this).replaceWith(modified);
                            old.off('click');
                            old.remove();

                            var tbn1 = columns_.find('span > button').eq(0);
                            tbn1.on('click', hoho);

                            if (!lazyb.tasks[n].queued) {
                                (async () => { await exec(id, retailer_id); })();
                                lazyb.tasks[n].queued = true;
                            }

                            if (!lazyb.tasks[n].running) {
                                lazyb.tasks[n].running = true;

                                if (lazyb.tasks[n].invoked)
                                    return true;

                                if (lazyb.tasks[n].notify_main == null)
                                    lazyb.tasks[n].notify_main = async (task_id, status) => {
                                        if (status == 'done') {
                                            var original = '<button type="button" class="btn btn-success btn-rounded btn-sm0 m-0 waves-effect waves-light" style="top: 0"><i class="fa fa-play-circle"></i></button>';
                                            var modified = '<button type="button" class="btn btn-danger btn-rounded btn-sm0 m-0 waves-effect waves-light" style="top: 1px"><i class="fa fa-pause-circle"></i></button>';

                                            var tr = tbody.find('tr[task_id="' + task_id + '"]');
                                            var columns_ = tr.children().eq(8);
                                            var tmp = columns_.find('span > button').eq(0);

                                            var old = tmp.replaceWith(original);
                                            old.off('click');
                                            old.remove();

                                            var tbn1 = columns_.find('span > button').eq(0);
                                            tbn1.on('click', hoho);

                                            var task_idx = findTaskIndex(task_id);
                                            lazyb.tasks[task_idx].done = true;
                                            lazyb.tasks[task_idx].running = false;
                                            lazyb.tasks[task_idx].invoked = false;
                                            lazyb.tasks[task_idx].allow_ctrl = false;
                                            lazyb.tasks[task_idx].token = null;
                                            lazyb.tasks[task_idx].notify_child = null;
                                            lazyb.tasks[task_idx].notify_main = null;

                                            updateStatus(task_id, 'idle');

                                            (async () => { lazyb = (await execdb()).lazyb; })();
                                        } else if ('suspended') {
                                            updateStatus(task_id, 'idle');

                                            (async () => { lazyb = (await execdb()).lazyb; })();
                                        }
                                    };

                                if (lazyb.tasks[n].notify_child != null) {
                                    lazyb.tasks[n].notify_child(lazyb.tasks[n].id, 'running');
                                    updateStatus(lazyb.tasks[n].id, 'running');
                                }
                            }

                            (async () => { lazyb = (await execdb()).lazyb; })();
                        }
                        // pause
                        else {
                            if (lazyb.tasks[n].done)
                                return true;
                            if (!lazyb.tasks[n].allow_ctrl)
                                return;

                            var old = $(this).replaceWith(original);
                            old.off('click');
                            old.remove();

                            var tbn1 = columns_.find('span > button').eq(0);
                            tbn1.on('click', hoho);

                            if (lazyb.tasks[n].running) {
                                lazyb.tasks[n].running = false;

                                if (lazyb.tasks[n].invoked)
                                    return true;

                                /*
                                if (lazyb.tasks[n].notify_main == null)
                                    lazyb.tasks[n].notify_main = async (task_id, status, tmp) => {
                                        if (status == 'done') {
                                            var original = '<button type="button" class="btn btn-success btn-rounded btn-sm0 m-0 waves-effect waves-light" style="top: 0"><i class="fa fa-play-circle"></i></button>';
                                            var modified = '<button type="button" class="btn btn-danger btn-rounded btn-sm0 m-0 waves-effect waves-light" style="top: 1px"><i class="fa fa-pause-circle"></i></button>';

                                            var columns_ = tmp.parents('tr').children().eq(8);

                                            var old = tmp.replaceWith(modified);
                                            old.off('click');
                                            old.remove();

                                            var tbn1 = columns_.find('span > button').eq(0);
                                            tbn1.on('click', hoho);

                                            var task_idx = findTaskIndex(task_id);
                                            lazyb.tasks[task_idx].done = true;
                                            alert(1);
                                        }
                                    };
                                    */

                                /*
                            if (lazyb.tasks[n].notify_child != null)
                                lazyb.tasks[n].notify_child(lazyb.tasks[n].id, 'idle', tbn1);
                                */
                            }

                            (async () => { lazyb = (await execdb()).lazyb; })();
                        }
                    }
                });
                columns_ = null;
            });

            // edit task
            columns.eq(8).find('span > button').eq(1).on('click', (e) => {
                var task_id = parseInt($(e.target).parents('tr').children().eq(0).text(), 10);
                lazyb.tasks.forEach((o, n) => {
                    if (o.id == task_id) {
                        $('#add-task-btn').hide();
                        $('#edit-task-btn').show();
                        $('#task-creation-quantity').hide();

                        // task editing
                        task_restore(task_id);
                        function task_restore(task_id) {
                            var task = null;
                            lazyb.tasks.forEach(obj => {
                                if (obj.id == task_id) {
                                    task = obj;
                                    return true;
                                }
                            });

                            {

                                var retailer_id = task.retailer_id;
                                var sac = findAccounts(retailer_id);
                                var wrap = task_accountsList;

                                var inputs = wrap.find('input');
                                var skip = false;

                                if (inputs.length != 0) {
                                    inputs.each((idx, elem) => {
                                        if ($(elem).is(':checked')) {
                                            skip = true;
                                            return true;
                                        }
                                    });
                                }
                                if (!skip) {
                                    wrap.empty();
                                    sac.forEach((o, n) => {
                                        if (o.retailer_id == retailer_id) {
                                            clone = ac_option.clone();
                                            clone.find('input').attr('name', 'fakegr00');
                                            clone.find('input').attr('id', 'mac' + n);
                                            clone.find('input').attr('oid', o.id);
                                            clone.find('label').attr('for', 'mac' + n);
                                            clone.find('label').text(o.email);

                                            wrap.append(clone);
                                            clone = null;
                                        }
                                    });

                                    if (task.js_account_id != 0)
                                        $('input[name="fakegr00"][oid="' + task.js_account_id + '"]').prop('checked', true).change();
                                }
                            }

                            {
                                var wrap = task_proxiesList;

                                var inputs = wrap.find('input');
                                var skip = false;
                                var retailer_id = task.retailer_id;

                                if (inputs.length != 0) {
                                    inputs.each((idx, elem) => {
                                        if ($(elem).is(':checked')) {
                                            skip = true;
                                            return true;
                                        }
                                    });
                                }

                                if (!skip) {
                                    wrap.empty();
                                    lazyb.proxies.forEach((o, n) => {
                                        if (o.retailer_id == retailer_id) {
                                            clone = ac_option.clone();
                                            clone.find('input').attr('name', 'fakegr01');
                                            clone.find('input').attr('id', 'mpr' + n);
                                            clone.find('input').attr('oid', o.id);
                                            clone.find('label').attr('for', 'mpr' + n);
                                            clone.find('label').text(o.profile);

                                            wrap.append(clone);
                                            clone = null;
                                        }
                                    });

                                    if (task.js_proxy_id != 0)
                                        $('input[name="fakegr01"][oid="' + task.js_proxy_id + '"]').prop('checked', true).change();
                                }
                            }

                            {
                                var wrap = task_billingsList;
                                var inputs = wrap.find('input');
                                var skip = false;
                                var retailer_id = $('#task-rt-select').find('select').val().toInt();

                                if (inputs.length != 0) {
                                    inputs.each((idx, elem) => {
                                        if ($(elem).is(':checked')) {
                                            skip = true;
                                            return true;
                                        }
                                    });
                                }
                                if (!skip) {
                                    wrap.empty();
                                    lazyb.billings.forEach((o, n) => {
                                        clone = ac_option.clone();
                                        clone.find('input').attr('name', 'fakegr02');
                                        clone.find('input').attr('id', 'mbi' + n);
                                        clone.find('input').attr('oid', o.id);
                                        clone.find('label').attr('for', 'mbi' + n);
                                        clone.find('label').text(o.profile);

                                        wrap.append(clone);
                                    });

                                    if (task.js_billing_id != 0) {
                                        $('input[name="fakegr02"][oid="' + task.js_billing_id + '"]').prop('checked', true).change();
                                    }
                                }
                            }

                            if (task.js_input_date != '')
                                $('#input_date').val(task.js_input_date).change();
                            else
                                $('#input_date').val('').change();
                            if (task.js_input_time != '')
                                $('#input_time').val(task.js_input_time).change();
                            else
                                $('#input_time').val('').change();


                            $('#form7').val(task.js_keywords).change();
                            $('#task-item-size').val(task.js_size).change();
                            $('#task-item-style').val(task.js_style).change();

                            var options1 = $('#task-rt-select').find('select').find('option');
                            var options2 = $('div.task-item-categories > select').find('option');

                            options1[task.js_retailer].value;
                            options2[task.js_category].value;
                            $('#task-rt-select').find('select').val(options1[task.js_retailer].value).trigger('click');
                            $('div.task-item-categories > select').val(options2[task.js_category].value).trigger('click');

                            var options = task.options;

                            if (options['use_mobile'])
                                $('#defaultunChecked1').prop('checked', true).change();
                            else
                                $('#defaultunChecked1').prop('checked', false).change();

                            if (options['reload_interval'] != -1) {
                                $('#defaultunChecked2').prop('checked', true).change();
                                $('#opreloadinterval').find('input').val(options['reload_interval']).change();
                            } else {
                                $('#defaultunChecked2').prop('checked', false).change();
                                $('#opreloadinterval').find('input').val('').change();
                            }

                            if (options['checkin_delay'] != -1) {
                                $('#defaultunChecked3').prop('checked', true).change();
                                $('#opcheckindelay').find('input').val(options['checkin_delay']).change();
                            } else {
                                $('#defaultunChecked3').prop('checked', false).change();
                                $('#opcheckindelay').find('input').val('').change();
                            }
                            if (options['checkout_delay'] != -1) {
                                $('#defaultunChecked4').prop('checked', true).change();
                                $('#opcheckoutdelay').find('input').val(options['checkout_delay']).change();
                            } else {
                                $('#defaultunChecked4').prop('checked', false).change();
                                $('#opcheckoutdelay').find('input').val('').change();
                            }

                            if (options['attempt_count'] != -1) {
                                $('#defaultunChecked5').prop('checked', true).change();
                                $('#opattemptcount').find('input').val(options['attempt_count']).change();
                            } else {
                                $('#defaultunChecked5').prop('checked', false).change();
                                $('#opattemptcount').find('input').val('').change();
                            }

                            if (options['attempt_delay'] != -1) {
                                $('#defaultunChecked6').prop('checked', true).change();
                                $('#opattemptdelay').find('input').val(options['attempt_delay']).change();
                            } else {
                                $('#defaultunChecked6').prop('checked', false).change();
                                $('#opattemptdelay').find('input').val('').change();
                            }
                        }

                        $('#basicExampleModal').attr('task_id', task_id).modal('show');

                        //$('button[data-target="#basicExampleModal"]').click();
                    }
                });
            });

            // delete task
            columns.eq(8).find('span > button').eq(2).on('click', async (e) => {
                var id = parseInt($(e.target).parents('tr').children().eq(0).text(), 10);

                lazyb.tasks.forEach(async (o, n) => {
                    if (o.id == id) {
                        if (o.running && o.allow_ctrl) {
                            lazyb.tasks[n].running = false;
                            while (true) {
                                if (!lazyb.tasks[n].invoked)
                                    break;
                                await sleep(1);
                            }

                            lazyb.tasks.splice(n, 1);
                            lazyb = (await execdb()).lazyb;


                            $(e.target).parents('tr').remove();
                            console.log('running');
                            return true;
                        } else if (!o.running) {
                            lazyb.tasks.splice(n, 1);
                            lazyb = (await execdb()).lazyb;

                            $(e.target).parents('tr').remove();
                            console.log('not running');
                            return true;
                        }
                    }
                });
            });
            tbody.append(tr);

            columns = null;

            // (async () => { await exec(id, retailer_id); })();
        });
    }

    // restore proxies
    {
        lazyb.proxies.forEach((o, n) => {
            var proxy = o;
            var proxy_id = proxy.id;
            var retailerName = findRetailerById(proxy.retailer_id);

            // supreme
            if (proxy.retailer_id == 1) {
                var tbody = $('#proxy-table > tbody');
                var tr = tbody.children('tr').eq(0).clone().removeAttr('style');
                tr.attr('proxy_id', proxy_id);
                var columns = tr.children();
                var buttons = columns.find('button');

                var server = '127.0.0.1:8080'; // keywords;
                var responseTime = '.....';

                columns.eq(0).text(proxy_id); // Proxy ID
                columns.eq(1).text(retailerName); // Retailer
                columns.eq(2).text(proxy.host); // Server
                columns.eq(3).text(proxy.port); // Port
                columns.eq(4).text(proxy.user == null ? 'none' : proxy.user); // Username
                columns.eq(5).text(proxy.password == null ? 'none' : proxy.password); // Password
                columns.eq(6).text(responseTime); // Response Time

                // check proxy
                buttons.eq(0).on('click', async (e) => {
                    var tr = $(e.target).parents('tr');
                    var responseTimeColumn = tr.children().eq(6);

                    var proxy_id = tr.attr('proxy_id').toInt();
                    var proxy = findProxy(proxy_id);

                    var proxyUrl = '';
                    if (proxy != null) {
                        if (proxy.user == null)
                            proxyUrl = proxy.host + ':' + proxy.port;
                        else
                            proxyUrl = proxy.host + ':' + proxy.port + ':' + proxy.user + ':' + proxy.password;
                    }

                    var headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'ja;q=1, en-US;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                    };

                    console.log(proxyUrl);

                    var start = new Date().getTime();
                    var res = await request({
                        method: 'GET',
                        url: 'https://wwww.apple.com/',
                        headers: headers,
                        data: '',
                        proxy: proxyUrl
                    }, 'utf8');

                    console.log(res);

                    if (res.hasOwnProperty('error')) {
                        responseTimeColumn.text('unable to connect');
                        return;
                    } else {
                        responseTime.text((new Date().getTime() - start));
                    }
                });

                // delete proxy
                buttons.eq(1).on('click', async (e) => {
                    var tr = $(e.target).parents('tr');
                    var proxy_id = tr.attr('proxy_id').toInt();
                    var proxy_idx = findProxyIndex(proxy_id);

                    tr.remove();

                    lazyb.proxies.splice(proxy_idx, 1);
                    lazyb = (await execdb()).lazyb;
                });

                tbody.append(tr);

                columns = null;
                buttons = null;
            }
        });
    }
    // init
    {
        if (!String.prototype.toInt) {
            String.prototype.toInt = function (radix = 10) {
                return parseInt(this.toString(), radix);
            };
        }

        if (!Array.prototype.reverseFor) {
            Array.prototype.reverseFor = function (cb) {
                for (var i = this.length - 1; i >= 0; i--) {
                    cb(this[i], i);
                }
            };
        }

        Function.prototype.toString_ = function () {
            return "(" + this.toString() + ")();";
        };

        String.prototype.decode = function () {
            return decodeURI(this);
        };

        // オブザーバインスタンスを作成
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // console.log(mutation.target);
                if (mutation.target.getAttribute('style').indexOf('display: none;') != -1) {
                    $('#add-task-btn').show();
                    $('#edit-task-btn').hide();
                    $('#task-creation-quantity').show();

                    // init
                    task_accountsList.empty();
                    task_proxiesList.empty();
                    task_billingsList.empty();
                }
            });
        });

        const attrs = ["style"];
        const config = {
            attributes: true,
            attributeFilter: attrs,
        };

        observer.observe($('#basicExampleModal')[0], config);

        (() => {
            lazyb.accounts.forEach(async (o, idx) => {
                if (o.retailer_id == 203 && o.temporary.addresses == null) {
                    await getShippingAddresses([o]);
                    if (lazyb.accounts[idx].temporary.addresses != null) {
                        // success
                        lazyb = (await execdb()).lazyb;
                    }
                }
            });
        })();
    }

    var idx = 0;
    var idx2 = 0;
    var idx3 = 0;
    var idx4 = 0;


    // setup indices
    function updateIndexes() {
        if (lazyb.accounts.slice(-1).length != 0)
            idx = lazyb.accounts.slice(-1)[0].id;
        else
            idx = 0;
        if (lazyb.tasks.slice(-1).length != 0)
            idx2 = lazyb.tasks.slice(-1)[0].id;
        else
            idx2 = 0;
        if (lazyb.proxies.slice(-1).length != 0)
            idx3 = lazyb.proxies.slice(-1)[0].id;
        else
            idx3 = 0;
        if (lazyb.billings.slice(-1).length != 0)
            idx4 = lazyb.billings.slice(-1)[0].id;
        else
            idx4 = 0;
    };

    updateIndexes();

    $('#deleteTasks').on('click', async () => {
        lazyb.tasks = [];
        updateIndexes();
        lazyb = (await execdb()).lazyb;

        if (1 == 1) {
            var tbody = $('#task-table > tbody');
            var trs = tbody.find('tr');
            if (trs.length > 1) {
                var html = '<tr style="display: none">' + trs.eq(0).html() + '</tr>';
                tbody.empty();
                tbody.html(html);
            }
        } else {
            var tbody = $('#task-table > tbody');
            var trs = tbody.find('tr');

            trs.each((n, e) => {
                $(e).find('.table-actions > button').eq(0).click();
            });
        }
    });
    $('#startTasks').on('click', async () => {
        var tbody = $('#task-table > tbody');
        var trs = tbody.find('tr');

        trs.each((n, e) => {
            var ch = $(e).children();
            if (ch.eq(7).text().trim() == 'idle')
                ch.find('button').eq(0).trigger('click');
            ch = null;
        });

        trs = null;
    });
    $('#stopTasks').on('click', async () => {
        var tbody = $('#task-table > tbody');
        var trs = tbody.find('tr');

        trs.each((n, e) => {
            var ch = $(e).children();
            if (ch.eq(7).text().trim() == 'running')
                ch.find('button').eq(0).trigger('click');
            ch = null;
        });

        trs = null;
    });
    $('#settings-google-login').on('click', () => {
        ipcRenderer.send('google-authorize');
    });
    $('#settings-ac-add').on('click', async () => {
        var tbody = $('.settings-ac-table01 > table > tbody');
        var tr = tbody.children('tr').eq(0).clone().removeAttr('style');
        var columns = tr.children();

        var id = ++idx;
        var email = $('#defaultLoginFormEmail').val();
        var password = $('#defaultLoginFormPassword').val();
        var retailer_id = findRetailer($('#settings-ac-select').find('input').eq(0).val().trim()).id;

        lazyb.accounts.push({
            id: id,
            email: email,
            password: password,
            access_token: '',
            temporary: {
                addresses: null,
                cookie: '',
                updated_at: -1,
            },
            retailer_id: retailer_id, // retailer id
        });
        lazyb = (await execdb()).lazyb;

        (async (o, idx) => {
            if (o.retailer_id == 203 && o.temporary.addresses == null) {
                await getShippingAddresses([o]);
                if (lazyb.accounts[idx].temporary.addresses != null) {
                    // success
                    lazyb = (await execdb()).lazyb;
                }
            }
        })(lazyb.accounts.slice(-1)[0], lazyb.accounts.length - 1);

        //(async () => { await rakutenLogin(lazyb.accounts.slice(-1)[0]); })();

        if (retailer_id == 2)
            nikeLogin(lazyb.accounts.slice(-1)[0]);

        columns.eq(0).text(id);
        columns.eq(1).text(email);
        columns.eq(2).find('span > button').eq(1).on('click', (e) => {
            var id = parseInt($(e.target).parents('tr').children().eq(0).text(), 10);
            lazyb.accounts.forEach(async (o, n) => {
                if (o.id == id) {
                    lazyb.accounts.splice(n, 1);
                    lazyb = (await execdb()).lazyb;
                }
            });
            $(e.target).parents('tr').remove();
        });
        tbody.append(tr);
    });

    var proxy_checker = $('#proxy-checker');
    proxy_checker.find('button').on('click', () => {
        function swing(element, index) {
            (async (elem) => {
                elem.addClass('danger');
                await sleep(100);
                elem.addClass('vibration');
                var index_ = index == 0 ? 1 : index;
                await sleep(1200 - (index_ * 2 - (index - 1)));
                elem.removeClass('danger vibration');
            })(element, 1);
        }

        var proxy_data = $('#proxy-server').val().trim();
        if (proxy_data == '') {
            swing($('#proxy-server'));

            proxy_data = null;
            return true;
        }
        var proxy_parts = proxy_data.split(':');
        if (proxy_parts.length == 2 || proxy_parts.length == 4) {
            var host = proxy_parts[0];
            var port = proxy_parts[1];
            var user = null; var password = null;
            if (proxy_parts.length == 4) {
                user = proxy_parts[2];
                password = proxy_parts[3];
            }
            proxy_checker.find('button').prop('disabled', true);
            (async () => {
                var pdata = null;
                if (user == null)
                    pdata = host + ':' + port;
                else
                    pdata = host + ':' + port + ':' + user + ':' + password;

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                };

                var start = new Date().getTime();
                var res = await request({
                    method: 'GET',
                    url: 'https://www.apple.com',
                    headers: headers,
                    data: '',
                    proxy: pdata
                }, 'utf8');

                console.log(res);

                proxy_checker.find('button').prop('disabled', false);
                proxy_checker.find('p').text((new Date().getTime() - start) + ' ms');

                res = null;
            })();

            proxy_parts = null;
        }
    });

    var task_accountSelector = $('#taccount-selector');
    var task_proxySelector = $('#tproxy-selector');
    var task_billingSelector = $('#tbilling-selector');
    var task_optionSelector = $('#toption-selector');
    var task_modalPerform = $('#centralModalSm').find('.modal-footer').find('button').eq(1);
    var task_accountsList = $('#centralModalSm').find('.wrap').find('div[list="accounts"]');
    var task_proxiesList = $('#centralModalSm').find('.wrap').find('div[list="proxies"]');
    var task_billingsList = $('#centralModalSm').find('.wrap').find('div[list="billings"]');
    var task_optionsList = $('#centralModalSm').find('.wrap').find('div[list="options"]');

    var billing_createDiv = $('#centralModalSm2').find('div[action="create"]');
    var billing_saveDiv = $('#centralModalSm2').find('div[action="save"]');
    var billing_deleteDiv = $('#centralModalSm2').find('div[action="delete"]');
    var billing_profile = $('input#billing-profile');
    var billing_modalFooter = $('#centralModalSm2').find('.modal-footer');
    var billing_modalPerform = billing_modalFooter.find('button').eq(1);
    var billing_modalWrap = $('#centralModalSm2').find('.wrap');

    var proxy_createDiv = $('#centralModalSm3').find('div[action="create"]');
    var proxy_checkDiv = $('#centralModalSm3').find('div[action="check"]');
    var proxy_editDiv = $('#centralModalSm3').find('div[action="edit"]');
    var proxy_deleteDiv = $('#centralModalSm3').find('div[action="delete"]');
    var proxy_serverInput = $('#proxy-server');
    var proxy_profileInput = $('#proxy-profile');
    var proxy_retailerSelect = $('select.retailer.selector');
    var proxy_retailerSelect2 = $('select.retailer.selector2');
    var proxy_modalFooter = $('#centralModalSm3').find('.modal-footer');
    var proxy_modalPerform = proxy_modalFooter.find('button').eq(1);
    var proxy_modalWrap = $('#centralModalSm3').find('.wrap');

    {
        // オブザーバインスタンスを作成
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // console.log(mutation.target);
                if (mutation.target.getAttribute('style').indexOf('display: none;') != -1) {
                    // クローズ処理
                    billing_createDiv.css('display', '');
                    billing_saveDiv.css('display', '');
                    billing_deleteDiv.css('display', '');
                }
            });
        });

        const attrs = ["style"];
        const config = {
            attributes: true,
            attributeFilter: attrs,
        };

        observer.observe($('#centralModalSm2')[0], config);
    }

    {
        // オブザーバインスタンスを作成
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // console.log(mutation.target);
                if (mutation.target.getAttribute('style').indexOf('display: none;') != -1) {
                    // クローズ処理
                    proxy_createDiv.css('display', '');
                    proxy_checkDiv.css('display', '');
                    proxy_editDiv.css('display', '');
                    proxy_deleteDiv.css('display', '');
                }
            });
        });

        const attrs = ["style"];
        const config = {
            attributes: true,
            attributeFilter: attrs,
        };

        observer.observe($('#centralModalSm3')[0], config);
    }

    billing_modalPerform.on('click', async (e) => {
        $('#centralModalSm2').modal('hide');

        if (billing_modalWrap.attr('mode') == 'create') {
            var shippingAddress = {};
            shippingAddress['firstName'] = '';
            shippingAddress['lastName'] = '';
            shippingAddress['email'] = '';
            shippingAddress['phone'] = '';
            shippingAddress['country'] = '1';
            shippingAddress['postalCode'] = '';
            shippingAddress['state'] = '';
            shippingAddress['city'] = '';
            shippingAddress['address1'] = '';
            shippingAddress['address2'] = '';

            lazyb.billings.push({
                id: ++idx4,
                payment: {
                    email: '',
                    holderName: '',
                    phone: '',
                    cardType: '',
                    cardNumber: '',
                    expiration: '',
                    cvv: '',
                },
                shippingAddress: shippingAddress,
                billingAddress: {

                },
                profile: billing_profile.val(),
            });
            lazyb = (await execdb()).lazyb;

            {
                var select = $('select.billing.selector');
                var option = null;
                var v = lazyb.billings.slice(-1)[0];

                option = $(document.createElement('option'));
                option.val(v.id);
                option.text(v.profile);

                select.append(option);

                select.materialSelect('destroy');
                select.materialSelect();


                // clear billing-profile
                $('#billing-profile').val('');

                // billing save button
                var save_btn = billing_modalPerform;
                save_btn.prop('disabled', true);

                select.val(v.id);


                // clear inputs
                var inputs1 = $('div.bwrap.pt-2').find('input');
                var inputs2 = $('div#shipping-details').find('input');

                inputs1.each((idx, elem_) => {
                    var elem = $(elem_);
                    if (!elem.hasClass('select-dropdown'))
                        elem.val('');
                });
                inputs2.each((idx, elem_) => {
                    var elem = $(elem_);
                    if (!elem.hasClass('select-dropdown'))
                        elem.val('');
                });
            }
        } else if (billing_modalWrap.attr('mode') == 'save') {
            function DetectCreditCardNumber(ccNum) {
                var visaRegEx = /^(?:4[0-9]{12}(?:[0-9]{3})?)$/;
                var mastercardRegEx = /^(?:5[1-5][0-9]{14})$/;
                var amexpRegEx = /^(?:3[47][0-9]{13})$/;
                var discovRegEx = /^(?:6(?:011|5[0-9][0-9])[0-9]{12})$/;
                var jcbRegEx = /^((?:2131|1800|35\d{3})\d{11})$/;

                if (visaRegEx.test(ccNum)) {
                    return 'visa';
                } else if (mastercardRegEx.test(ccNum)) {
                    return 'mastercard';
                } else if (amexpRegEx.test(ccNum)) {
                    return 'amex';
                } else if (discovRegEx.test(ccNum)) {
                    return 'discover';
                } else if (jcbRegEx.test(ccNum)) {
                    return 'jcb';
                }
                return '';
            }

            var email = $('#payment-email').val().trim();
            var holderName = $('#payment-holdername').val().trim();
            var phone = $('#payment-phone').val().trim();
            var cardNumber = $('#payment-cc_number').val().trim().split(' ').join('');
            var cardType = DetectCreditCardNumber(cardNumber);
            var expiration = ('00' + parseInt($('#payment-cc_mo').val(), 10)).slice(-2) + '/' + ('00' + parseInt($('#payment-cc_yr').val(), 10)).slice(-2);
            var cvv = $('#payment-cc_cvv').val().trim();
            var profile = $('#billing-profile').val().trim();


            var valid = true;
            var shippingAddress = {};
            var div = $('#shipping-details');
            var inputs = div.find('input'), selects = div.find('select');
            inputs.each((index, element) => {
                if (index == 0)
                    shippingAddress['firstName'] = element.value.trim();
                else if (index == 1)
                    shippingAddress['lastName'] = element.value.trim();
                else if (index == 2)
                    shippingAddress['email'] = element.value.trim();
                else if (index == 3)
                    shippingAddress['phone'] = element.value.trim();
                else if (index == 4) {

                }
                else if (index == 5)
                    shippingAddress['postalCode'] = element.value.trim();
                else if (index == 6)
                    shippingAddress['state'] = element.value.trim();
                else if (index == 7)
                    shippingAddress['city'] = element.value.trim();
                else if (index == 8)
                    shippingAddress['address1'] = element.value.trim();
                else if (index == 9)
                    shippingAddress['address2'] = element.value.trim();
            });

            // shipping form
            shippingAddress['country'] = selects.eq(0).val().trim();

            var billing_selector = $('select.billing.selector');
            if (billing_selector.val() == null) {
                // not selected

                return;
            }
            var billing_id = billing_selector.val().trim().toInt();
            var billing_idx = findBillingIndex(billing_id);

            lazyb.billings[billing_idx].payment = {
                email: email,
                holderName: holderName,
                phone: phone,
                cardType: cardType,
                cardNumber: cardNumber,
                expiration: expiration,
                cvv: cvv,
            };

            lazyb.billings[billing_idx].shippingAddress = shippingAddress;
            lazyb.billings[billing_idx].billingAddress = {};
            //lazyb.billings[billing_idx].profile = profile;
            lazyb = (await execdb()).lazyb;

            if (1 == 2) {
                var select = $('select.billing.selector');
                var option = null;
                var v = lazyb.billings.slice(-1)[0];

                option = $(document.createElement('option'));
                option.val(v.id);
                option.text(v.profile);

                select.append(option);

                select.materialSelect('destroy');
                select.materialSelect();


                // clear billing-profile
                $('#billing-profile').val('');

                // billing save button
                return;
                var save_btn = billing_save;
                save_btn.prop('disabled', true);
            }
        } else if (billing_modalWrap.attr('mode') == 'delete') {
            var billing_selector = $('select.billing.selector');
            if (billing_selector.val() == null) {
                // not selected

                return;
            }
            var billing_id = billing_selector.val().trim().toInt();
            var billing_idx = findBillingIndex(billing_id);

            lazyb.billings.splice(billing_idx, 1);
            lazyb = (await execdb()).lazyb;


            // remove option
            var option = select.find('option[value="' + billing_id + '"]');
            option.remove();

            select.materialSelect('destroy');
            select.materialSelect();

            {
                var billing_id = select.find('option').eq(1).val();
                var billing = findBilling(billing_id);

                var email = billing.payment.email;
                var holderName = billing.payment.holderName;
                var phone = billing.payment.phone;
                var type = billing.payment.cardType;
                var cardNumber = billing.payment.cardNumber;
                var expiration = billing.payment.expiration;
                var cvv = billing.payment.cvv;
                var profile = billing.profile;

                $('#payment-email').val('').val(email);
                $('#payment-holdername').val('').val(holderName);
                $('#payment-phone').val('').val(phone);
                $('#payment-cc_number').val('').val(cardNumber);
                $('#payment-cc_cvv').val('').val(cvv);
                $('#payment-cc_mo').val('').val(expiration.split('/')[0]);
                $('#payment-cc_yr').val('').val(expiration.split('/')[1]);
                //$('#billing-profile').val(profile);

                var shippingAddress = billing.shippingAddress;
                var div = $('#shipping-details');
                var inputs = div.find('input'), selects = div.find('select');
                inputs.each((index, element) => {
                    if (index == 0)
                        $(element).val('').val(shippingAddress['firstName']);
                    else if (index == 1)
                        $(element).val('').val(shippingAddress['lastName']);
                    else if (index == 2)
                        $(element).val('').val(shippingAddress['email']);
                    else if (index == 3)
                        $(element).val('').val(shippingAddress['phone']);
                    else if (index == 4) {

                    }
                    else if (index == 5)
                        $(element).val('').val(shippingAddress['postalCode']);
                    else if (index == 6)
                        $(element).val('').val(shippingAddress['state']);
                    else if (index == 7)
                        $(element).val('').val(shippingAddress['city']);
                    else if (index == 8)
                        $(element).val('').val(shippingAddress['address1']);
                    else if (index == 9)
                        $(element).val('').val(shippingAddress['address2']);
                });

                // shipping form
                selects.eq(0).val(shippingAddress['country']);
            }
        }
    });


    proxy_retailerSelect2.change(() => {
        var retailer_id = proxy_retailerSelect2.val().trim().toInt();

        var tbody = $('#proxy-table > tbody');
        var clonedtr = tbody.children('tr').slice(0, 1).eq(0).clone(); // get the first tr element

        tbody.empty();
        tbody.append(clonedtr);

        lazyb.proxies.forEach((o, n) => {
            if (o.retailer_id == retailer_id) {
                var proxy = o;
                var proxy_id = proxy.id;
                var retailerName = findRetailerById(proxy.retailer_id);

                var tr = tbody.children('tr').eq(0).clone().removeAttr('style');
                tr.attr('proxy_id', proxy_id);
                var columns = tr.children();
                var buttons = columns.find('button');

                var server = '127.0.0.1:8080'; // keywords;
                var responseTime = '.....';

                columns.eq(0).text(proxy_id); // Proxy ID
                columns.eq(1).text(retailerName); // Retailer
                columns.eq(2).text(proxy.host); // Server
                columns.eq(3).text(proxy.port); // Port
                columns.eq(4).text(proxy.user == null ? 'none' : proxy.user); // Username
                columns.eq(5).text(proxy.password == null ? 'none' : proxy.password); // Password
                columns.eq(6).text(responseTime); // Response Time

                // check proxy
                buttons.eq(0).on('click', function hoho(e) {
                    proxy_modalWrap.attr('mode', 'check');

                    proxy_createDiv.css('display', 'none');
                    proxy_editDiv.css('display', 'none');
                    proxy_deleteDiv.css('display', 'none');

                    //proxy_modalPerform.prop('disabled', true);
                    proxy_modalPerform.text('check');
                    $('#centralModalSm3').modal('show');
                });

                // delete proxy
                buttons.eq(1).on('click', async (e) => {
                    var tr = $(e.target).parents('tr');
                    var proxy_id = tr.attr('proxy_id').toInt();
                    var proxy_idx = findProxyIndex(proxy_id);

                    tr.remove();

                    lazyb.proxies.splice(proxy_idx, 1);
                    lazyb = (await execdb()).lazyb;
                });


                tbody.append(tr);

                columns = null;
                buttons = null;
            }
        });
    });

    proxy_modalPerform.on('click', async (e) => {
        // $('#centralModalSm3').modal('hide');
        function swing(element, index) {
            (async (elem, index) => {
                elem.addClass('danger');
                await sleep(100);
                elem.addClass('vibration');
                var index_ = index == 0 ? 1 : index;
                await sleep(1200 - (index_ * 2 - (index - 1)));
                elem.removeClass('danger vibration');
            })(element, 1);
        }
        if (proxy_modalWrap.attr('mode') == 'create') {
            var retailer_id = proxy_retailerSelect.val().trim().toInt();
            var retailerName = findRetailerById(retailer_id);

            var success = true;
            var proxy_server = proxy_serverInput.val().trim();

            if (proxy_server == '') {
                swing(proxy_serverInput);


                return true;
            }

            var proxy_lines = proxy_server.split('\n');
            if (proxy_lines[0] == '') {
                return true;
            }

            // validation
            proxy_lines.forEach((v, i) => {
                var proxy_parts = v.split(':');
                if (proxy_parts.length == 1 && proxy_parts[0] == '') {
                    swing(proxy_serverInput);

                    proxy_parts = null;
                    success = false;
                    return true;
                }
                if (proxy_parts.length == 2 || proxy_parts.length == 4) {
                    var host = proxy_parts[0];
                    var port = proxy_parts[1];
                    var user = null; var password = null;
                    if (proxy_parts.length == 4) {
                        user = proxy_parts[2];
                        password = proxy_parts[3];
                    }
                } else {
                    swing(proxy_serverInput);

                    proxy_parts = null;
                    success = false;
                    return true;
                }
            });

            if (!success)
                return;

            proxy_retailerSelect2.val(retailer_id).change();
            proxy_lines.forEach(async (v, i) => {
                var proxy_parts = v.split(':');
                if (proxy_parts.length == 1 && proxy_parts[0] == '') {
                    swing(proxy_serverInput);

                    proxy_parts = null;
                    success = false;
                    return true;
                }
                if (proxy_parts.length == 2 || proxy_parts.length == 4) {
                    var host = proxy_parts[0];
                    var port = proxy_parts[1];
                    var user = null; var password = null;
                    if (proxy_parts.length == 4) {
                        user = proxy_parts[2];
                        password = proxy_parts[3];
                    }

                    lazyb.proxies.push({
                        id: ++idx3,
                        host: host,
                        port: port,
                        user: user,
                        password: password,
                        retailer_id: retailer_id,
                        profile: host + ':' + port,
                    });

                    var proxy = lazyb.proxies.slice(-1)[0];
                    var proxy_id = proxy.id;

                    var tbody = $('#proxy-table > tbody');
                    var tr = tbody.children('tr').eq(0).clone().removeAttr('style');
                    tr.attr('proxy_id', proxy_id);
                    var columns = tr.children();
                    var buttons = columns.find('button');

                    var server = '127.0.0.1:8080'; // keywords;
                    var responseTime = '.....';

                    columns.eq(0).text(proxy_id); // Proxy ID
                    columns.eq(1).text(retailerName); // Retailer
                    columns.eq(2).text(proxy.host); // Server
                    columns.eq(3).text(proxy.port); // Port
                    columns.eq(4).text(proxy.user == null ? 'none' : proxy.user); // Username
                    columns.eq(5).text(proxy.password == null ? 'none' : proxy.password); // Password
                    columns.eq(6).text(responseTime); // Response Time

                    // check proxy
                    buttons.eq(0).on('click', async (e) => {
                        var tr = $(e.target).parents('tr');
                        var responseTimeColumn = tr.children().eq(6);

                        var proxy_id = tr.attr('proxy_id').toInt();
                        var proxy = findProxy(proxy_id);

                        var proxyUrl = '';
                        if (proxy != null) {
                            if (proxy.user == null)
                                proxyUrl = proxy.host + ':' + proxy.port;
                            else
                                proxyUrl = proxy.host + ':' + proxy.port + ':' + proxy.user + ':' + proxy.password;
                        }

                        var headers = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                            'Accept-Language': 'ja;q=1, en-US;q=0.9',
                            'Accept-Encoding': 'gzip, deflate',
                        };

                        var start = new Date().getTime();
                        var res = await request({
                            method: 'GET',
                            url: 'https://wwww.apple.com',
                            headers: headers,
                            data: '',
                            proxy: proxyUrl
                        }, 'utf8');

                        if (res.hasOwnProperty('error')) {

                            responseTimeColumn.text('unable to connect');
                            return;
                        }
                    });

                    // delete proxy
                    buttons.eq(1).on('click', async (e) => {
                        var tr = $(e.target).parents('tr');
                        var proxy_id = tr.attr('proxy_id').toInt();
                        var proxy_idx = findProxyIndex(proxy_id);

                        tr.remove();

                        lazyb.proxies.splice(proxy_idx, 1);
                        lazyb = (await execdb()).lazyb;
                    });


                    tbody.append(tr);

                    columns = null;
                    buttons = null;
                } else {
                    swing(proxy_serverInput);

                    proxy_parts = null;
                    success = false;
                    return true;
                }
            });

            if (success) {
                lazyb = (await execdb()).lazyb;

                $('#centralModalSm3').modal('hide');
            }
        } else if (proxy_modalWrap.attr('mode') == 'delete') {
            var tbody = $('#proxy-table > tbody');
            var clonedtr = tbody.children('tr').slice(0, 1).eq(0).clone(); // get the first tr element

            tbody.empty();
            tbody.append(clonedtr);

            var selectedRetailerId = proxy_retailerSelect2.val().trim().toInt();
            lazyb.proxies.reverseFor((o, n) => {
                if (o.retailer_id == selectedRetailerId) {
                    lazyb.proxies.splice(n, 1);
                }
            });

            lazyb = (await execdb()).lazyb;
            $('#centralModalSm3').modal('hide');
        }
    });
    $('button#billing-create-new').on('click', (e) => {
        billing_modalWrap.attr('mode', 'create');

        $('#centralModalSm2').find('div[action="save"]').css('display', 'none');
        $('#centralModalSm2').find('div[action="delete"]').css('display', 'none');

        billing_modalPerform.prop('disabled', true);
        billing_modalPerform.text('create');
        $('#centralModalSm2').modal('show');
    });
    $('button#proxy-create-new').on('click', (e) => {
        proxy_modalWrap.attr('mode', 'create');

        proxy_checkDiv.css('display', 'none');
        proxy_editDiv.css('display', 'none');
        proxy_deleteDiv.css('display', 'none');

        //proxy_modalPerform.prop('disabled', true);
        proxy_modalPerform.text('create');
        $('#centralModalSm3').modal('show');
    });
    $('button#proxy-delete-all').on('click', (e) => {
        proxy_modalWrap.attr('mode', 'delete');

        proxy_checkDiv.css('display', 'none');
        proxy_editDiv.css('display', 'none');
        proxy_createDiv.css('display', 'none');

        //proxy_modalPerform.prop('disabled', true);
        proxy_modalPerform.text('delete all');
        $('#centralModalSm3').modal('show');
    });


    {
        // オブザーバインスタンスを作成
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // console.log(mutation.target);
                if (mutation.target.getAttribute('style').indexOf('display: none;') != -1) {
                    // クローズ処理
                    task_accountsList.css('display', '');
                    task_proxiesList.css('display', '');
                    task_billingsList.css('display', '');
                    task_optionsList.css('display', '');
                }
            });
        });

        const attrs = ["style"];
        const config = {
            attributes: true,
            attributeFilter: attrs,
        };

        observer.observe($('#centralModalSm')[0], config);
    }

    task_modalPerform.on('click', () => {
        $('#centralModalSm').modal('hide');
    });

    var routines = [];
    task_accountSelector.on('click', () => {
        var retailer_id = $('#task-rt-select').find('select').val().toInt();
        var sac = findAccounts(retailer_id);
        var wrap = task_accountsList;

        var inputs = wrap.find('input');
        var skip = false;

        if (inputs.length != 0) {
            inputs.each((idx, elem) => {
                if ($(elem).is(':checked')) {
                    skip = true;
                    return true;
                }
            });
        }
        if (!skip) {
            wrap.empty();
            sac.forEach((o, n) => {
                if (o.retailer_id == retailer_id) {
                    clone = ac_option.clone();
                    clone.find('input').attr('name', 'fakegr00');
                    clone.find('input').attr('id', 'mac' + n);
                    clone.find('input').attr('oid', o.id);
                    clone.find('label').attr('for', 'mac' + n);
                    clone.find('label').text(o.email);

                    wrap.append(clone);
                    clone = null;
                }
            });
        }

        task_proxiesList.css('display', 'none');
        task_billingsList.css('display', 'none');
        task_optionsList.css('display', 'none');
        $('#centralModalSm').modal('show');
    });
    task_proxySelector.on('click', () => {
        var wrap = task_proxiesList;

        var inputs = wrap.find('input');
        var skip = false;
        var retailer_id = $('#task-rt-select').find('select').val().toInt();

        if (inputs.length != 0) {
            inputs.each((idx, elem) => {
                if ($(elem).is(':checked')) {
                    skip = true;
                    return true;
                }
            });
        }

        if (!skip) {
            wrap.empty();
            lazyb.proxies.forEach((o, n) => {
                if (o.retailer_id == retailer_id) {
                    clone = ac_option.clone();
                    clone.find('input').attr('name', 'fakegr01');
                    clone.find('input').attr('id', 'mpr' + n);
                    clone.find('input').attr('oid', o.id);
                    clone.find('label').attr('for', 'mpr' + n);
                    clone.find('label').text(o.profile);

                    wrap.append(clone);
                    clone = null;
                }
            });
        }

        task_accountsList.css('display', 'none');
        task_billingsList.css('display', 'none');
        task_optionsList.css('display', 'none');
        $('#centralModalSm').modal('show');
    });
    task_billingSelector.on('click', () => {
        var wrap = task_billingsList;
        var inputs = wrap.find('input');
        var skip = false;
        var retailer_id = $('#task-rt-select').find('select').val().toInt();

        if (inputs.length != 0) {
            inputs.each((idx, elem) => {
                if ($(elem).is(':checked')) {
                    skip = true;
                    return true;
                }
            });
        }
        if (!skip) {
            wrap.empty();
            lazyb.billings.forEach((o, n) => {
                clone = ac_option.clone();
                clone.find('input').attr('name', 'fakegr02');
                clone.find('input').attr('id', 'mbi' + n);
                clone.find('input').attr('oid', o.id);
                clone.find('label').attr('for', 'mbi' + n);
                clone.find('label').text(o.profile);

                wrap.append(clone);
            });
        }

        if (retailer_id == 203) {
            var checks = task_accountsList;
            var account_id = -1;
            var acchk = false;
            checks.each((n, e) => {
                if ($(e).is(':checked')) {
                    acchk = true;
                    account_id = parseInt($(e).attr('oid'));
                }
            });
            if (account_id != -1) {
                var addresses = lazyb.accounts[findAccountIndex(account_id)].temporary.addresses;
                var size = addresses.size;

                for (var i = 0; i < size; i++) {
                    clone = ac_option.clone();
                    clone.find('input').attr('name', 'fakegr02');
                    clone.find('input').attr('id', 'mbi' + i);
                    clone.find('input').attr('oid', i + 1);
                    clone.find('label').attr('for', 'mbi' + i);
                    clone.find('label').text(addresses[i + 1].data);

                    wrap.append(clone);
                }
            }
        }


        task_accountsList.css('display', 'none');
        task_proxiesList.css('display', 'none');
        task_optionsList.css('display', 'none');
        $('#centralModalSm').modal('show');
    });
    task_optionSelector.on('click', () => {

        task_proxiesList.css('display', 'none');
        task_billingsList.css('display', 'none');
        task_accountsList.css('display', 'none');
        $('#centralModalSm').modal('show');
    });

    var ac_option = $(`<div class="form-check">
    <input type="radio" class="form-check-input" id="mac0" name="groupOfMaterialRadios">
    <label class="form-check-label" for="mac0"></label>
</div>`);

    var task_modal_ac = $('#task-modal-ac').hide();
    var task_modal_pr = $('#task-modal-pr').hide();
    var task_modal_bl = $('#task-modal-bl').hide();
    $('#login-switch > label > input').change(() => {
        var retailer_id = findRetailer($('#basicExampleModal > div > div > div.modal-body > div:nth-child(3) > div > div.col-6.mx-auto > div > input').val().trim()).id;
        var sac = findAccounts(retailer_id);

        var sw = $('#login-switch > label > input');
        if (sw.is(':checked')) {

            task_modal_ac.children().empty();
            sac.forEach((o, n) => {
                clone = ac_option.clone();
                clone.find('input').attr('name', 'fakegr00');
                clone.find('input').attr('id', 'mac' + n);
                clone.find('input').attr('oid', o.id);
                clone.find('label').attr('for', 'mac' + n);
                clone.find('label').text(o.email);

                task_modal_ac.children().append(clone);
            });

            task_modal_ac.fadeIn(250);
        } else {
            task_modal_ac.fadeOut(100);
        }
    });
    $('#proxy-switch > label > input').change(() => {
        var sw = $('#proxy-switch > label > input');
        if (sw.is(':checked')) {

            task_modal_pr.children().empty();
            lazyb.proxies.forEach((o, n) => {
                clone = ac_option.clone();
                clone.find('input').attr('name', 'fakegr01');
                clone.find('input').attr('id', 'mpr' + n);
                clone.find('input').attr('oid', o.id);
                clone.find('label').attr('for', 'mpr' + n);
                clone.find('label').text(o.profile);

                task_modal_pr.children().append(clone);
            });

            task_modal_pr.fadeIn(250);
        } else {
            task_modal_pr.fadeOut(100);
        }
    });
    $('#billing-switch > label > input').change(() => {
        var sw = $('#billing-switch > label > input');
        if (sw.is(':checked')) {

            task_modal_bl.children().empty();
            lazyb.billings.forEach((o, n) => {
                clone = ac_option.clone();
                clone.find('input').attr('name', 'fakegr02');
                clone.find('input').attr('id', 'mbi' + n);
                clone.find('input').attr('oid', o.id);
                clone.find('label').attr('for', 'mbi' + n);
                clone.find('label').text(o.profile);

                task_modal_bl.children().append(clone);
            });

            var retailer_id = findRetailer($('#task-rt-select').find('input').eq(0).val().trim()).id;

            if (retailer_id == 203) {
                var checks = task_modal_ac.children().find('input');
                var account_id = -1;
                var acchk = false;
                checks.each((n, e) => {
                    if ($(e).is(':checked')) {
                        acchk = true;
                        account_id = parseInt($(e).attr('oid'));
                    }
                });
                if (account_id != -1) {
                    var addresses = lazyb.accounts[findAccountIndex(account_id)].temporary.addresses;
                    var size = addresses.size;

                    for (var i = 0; i < size; i++) {
                        clone = ac_option.clone();
                        clone.find('input').attr('name', 'fakegr02');
                        clone.find('input').attr('id', 'mbi' + i);
                        clone.find('input').attr('oid', i + 1);
                        clone.find('label').attr('for', 'mbi' + i);
                        clone.find('label').text(addresses[i + 1].data);

                        task_modal_bl.children().append(clone);
                    }
                }
            }

            task_modal_bl.fadeIn(250);
        } else {
            task_modal_bl.children().empty();
            task_modal_bl.fadeOut(100);
        }
    });
    {
        var sw = $('#imitate-switch > label > input');

        var div = $('#billing-details');
        var inputs = div.find('input'), selects = div.find('select');
        inputs.each((index, element) => {
            element.disabled = true;
        });
        selects.each((index, element) => {
            element.disabled = true;
        });
    }
    $('#imitate-switch > label > input').change(() => {
        var sw = $('#imitate-switch > label > input');
        if (sw.is(':checked')) {

            var div = $('#billing-details');
            var inputs = div.find('input'), selects = div.find('select');
            inputs.each((index, element) => {
                element.disabled = false;
            });
            selects.each((index, element) => {
                element.disabled = false;
            });

        } else {
            var div = $('#billing-details');
            var inputs = div.find('input'), selects = div.find('select');
            inputs.each((index, element) => {
                element.disabled = true;
            });
            selects.each((index, element) => {
                element.disabled = true;
            });
        }
    });
    $('#settings-ac-select').find('select').change(async () => {
        if (lazyb.accounts.length == 0)
            return;

        var tbody = $('.settings-ac-table01 > table > tbody');
        var trs = tbody.children('tr');
        for (var i = 0; i < trs.length; i++) {
            var tr = trs.eq(i);
            if (tr.attr('style') == 'display: none')
                continue;
            tr.remove();
        }

        var retailer_id = findRetailer($('#settings-ac-select').find('input').eq(0).val().trim()).id;

        idx = lazyb.accounts.slice(-1)[0].id;
        for (var i = 0; i < lazyb.accounts.length; i++) {
            if (lazyb.accounts[i].retailer_id != retailer_id)
                continue;

            var tr = trs.eq(0).clone().removeAttr('style');
            var columns = tr.children();

            var id = lazyb.accounts[i].id;
            var email = lazyb.accounts[i].email;
            var password = lazyb.accounts[i].password;

            columns.eq(0).text(id);
            columns.eq(1).text(email);
            columns.eq(2).find('span > button').eq(1).on('click', async (e) => {
                var id = parseInt($(e.target).parents('tr').children().eq(0).text(), 10);
                lazyb.accounts.forEach((o, n) => {
                    if (o.id == id) {
                        //console.log(o);
                        lazyb.accounts.splice(n, 1);
                    }
                });
                lazyb = (await execdb()).lazyb;
                $(e.target).parents('tr').remove();
            });
            tbody.append(tr);
        }
    });

    $('#task-rt-select').find('select').change(async () => {
        var e_use_mobile = $('#defaultunChecked1');
        var pads2 = [$('#task-item-style'), $('task-item-size'),]
        var e_task_item_style = $('#task-item-style');
        var e_task_item_size = $('task-item-size');
        var e_task_categories_input = $('div.task-item-categories').find('input');
        var e_task_categories_select = $('div.task-item-categories').find('select');

        var pads = [];
        for (var i = 0; i < 4; i++)
            pads.push($('#defaultunChecked_pad0' + (i)));

        var retailer_id = findRetailer($('#task-rt-select').find('input').eq(0).val().trim()).id;
        if (retailer_id == 203) {
            e_use_mobile.prop('disabled', true).change();


            if (pads[0].is(':disabled')) {
                for (var i = 0; i < 4; i++)
                    pads[i].prop('disabled', false);
            }
        } else {
            if (e_use_mobile.is(':disabled')) {
                e_use_mobile.prop('disabled', false).change();
            }
            if (!pads[0].is(':disabled')) {
                for (var i = 0; i < 4; i++)
                    pads[i].prop('disabled', true);
            }
        }
    });

    $('#proxy-save-btn').on('click', async () => {
        var proxy_server = $('#proxy-server').val().trim();
        if (proxy_server == '')
            return true;

        var proxy_parts = proxy_server.split(':');
        if (proxy_parts.length == 2 || proxy_parts.length == 4) {
            var host = proxy_parts[0];
            var port = proxy_parts[1];
            var user = null; var password = null;
            if (proxy_parts.length == 4) {
                user = proxy_parts[2];
                password = proxy_parts[3];
            }
            var profile = $('#proxy-profile').val();

            lazyb.proxies.push({
                id: ++idx3,
                host: host,
                port: port,
                user: user,
                password: password,
                profile: profile,
            });
            lazyb = (await execdb()).lazyb;
        }
    });

    var billing_delete = $('#billing-delete');
    billing_delete.on('click', async () => {

        billing_modalWrap.attr('mode', 'delete');

        $('#centralModalSm2').find('div[action="create"]').css('display', 'none');
        $('#centralModalSm2').find('div[action="save"]').css('display', 'none');

        billing_modalPerform.prop('disabled', false);
        billing_modalPerform.text('delete');

        $('#centralModalSm2').modal('show');
        return;

        var billing_selector = $('select.billing.selector');
        if (billing_selector.val() == null) {
            // not selected

            return;
        }
        var billing_id = billing_selector.val().trim().toInt();
        var billing_idx = findBillingIndex(billing_id);

        lazyb.billings.splice(billing_idx, 1);
        lazyb = (await execdb()).lazyb;


        // remove option
        var option = select.find('option[value="' + billing_id + '"]');
        option.remove();

        select.materialSelect('destroy');
        select.materialSelect();

        {
            var billing_id = select.find('option').eq(1).val();
            var billing = findBilling(billing_id);

            var email = billing.payment.email;
            var holderName = billing.payment.holderName;
            var phone = billing.payment.phone;
            var type = billing.payment.cardType;
            var cardNumber = billing.payment.cardNumber;
            var expiration = billing.payment.expiration;
            var cvv = billing.payment.cvv;
            var profile = billing.profile;

            $('#payment-email').val('').val(email);
            $('#payment-holdername').val('').val(holderName);
            $('#payment-phone').val('').val(phone);
            $('#payment-cc_number').val('').val(cardNumber);
            $('#payment-cc_cvv').val('').val(cvv);
            $('#payment-cc_mo').val('').val(expiration.split('/')[0]);
            $('#payment-cc_yr').val('').val(expiration.split('/')[1]);
            //$('#billing-profile').val(profile);

            var shippingAddress = billing.shippingAddress;
            var div = $('#shipping-details');
            var inputs = div.find('input'), selects = div.find('select');
            inputs.each((index, element) => {
                if (index == 0)
                    $(element).val('').val(shippingAddress['firstName']);
                else if (index == 1)
                    $(element).val('').val(shippingAddress['lastName']);
                else if (index == 2)
                    $(element).val('').val(shippingAddress['email']);
                else if (index == 3)
                    $(element).val('').val(shippingAddress['phone']);
                else if (index == 4) {

                }
                else if (index == 5)
                    $(element).val('').val(shippingAddress['postalCode']);
                else if (index == 6)
                    $(element).val('').val(shippingAddress['state']);
                else if (index == 7)
                    $(element).val('').val(shippingAddress['city']);
                else if (index == 8)
                    $(element).val('').val(shippingAddress['address1']);
                else if (index == 9)
                    $(element).val('').val(shippingAddress['address2']);
            });

            // shipping form
            selects.eq(0).val(shippingAddress['country']);
        }
    });

    var billing_save = $('#billing-save');
    billing_save.on('click', async () => {
        var invalid = false;
        var div = $('#shipping-details');
        var inputs = div.find('input'), selects = div.find('select');
        inputs.each((index, element) => {
            if (element.value.trim() == '') {
                (async () => {
                    $(element).addClass('danger');
                    await sleep(100);
                    $(element).addClass('vibration');
                    var index_ = index == 0 ? 1 : index;
                    await sleep(1200 - (index_ * 2 - (index - 1)));
                    $(element).removeClass('danger vibration');
                })();

                invalid = true;
            }
        });

        if (invalid)
            return;

        billing_modalWrap.attr('mode', 'save');

        $('#centralModalSm2').find('div[action="create"]').css('display', 'none');
        $('#centralModalSm2').find('div[action="delete"]').css('display', 'none');

        billing_modalPerform.prop('disabled', false);
        billing_modalPerform.text('save');
        $('#centralModalSm2').modal('show');
    });

    // Initialization
    {
        var select = $('select.billing.selector');
        var option = null;

        lazyb.billings.forEach((v, i) => {
            option = $(document.createElement('option'));
            option.val(v.id);
            option.text(v.profile);

            select.append(option);
            option = 0;
        });

        if (option == 0) {
            select.materialSelect('destroy');
            select.materialSelect();
        }

        // billing save button
        var save_btn = billing_modalPerform; // $('#billing-save-btn');
        save_btn.prop('disabled', true);

        $('#billing-profile').keydown(async (e) => {
            await sleep(10);
            if ($(e.target).val().length == 0) {
                if (!save_btn.is(':disabled')) {
                    save_btn.prop('disabled', true);
                }
            } else {
                if (save_btn.is(':disabled')) {
                    save_btn.prop('disabled', false);
                }
            }
        });
    }
    $('select.billing.selector').change((e) => {
        var billing_id = $(e.target).val().trim().toInt();
        var billing = findBilling(billing_id);

        var email = billing.payment.email;
        var holderName = billing.payment.holderName;
        var phone = billing.payment.phone;
        var type = billing.payment.cardType;
        var cardNumber = billing.payment.cardNumber;
        cardNumber = cardNumber.substring(0, 4) + ' ' + cardNumber.substring(4, 8) + ' ' + cardNumber.substring(8, 12) + ' ' + cardNumber.substring(12, 16)
        var expiration = billing.payment.expiration;
        var cvv = billing.payment.cvv;
        var profile = billing.profile;

        $('#payment-email').val('').val(email);
        $('#payment-holdername').val('').val(holderName);
        $('#payment-phone').val('').val(phone);
        $('#payment-cc_number').val('').val(cardNumber);
        $('#payment-cc_cvv').val('').val(cvv);
        $('#payment-cc_mo').val('').val(expiration.split('/')[0]);
        $('#payment-cc_yr').val('').val(expiration.split('/')[1]);
        //$('#billing-profile').val(profile);

        var shippingAddress = billing.shippingAddress;
        var div = $('#shipping-details');
        var inputs = div.find('input'), selects = div.find('select');
        inputs.each((index, element) => {
            if (index == 0)
                $(element).val('').val(shippingAddress['firstName']);
            else if (index == 1)
                $(element).val('').val(shippingAddress['lastName']);
            else if (index == 2)
                $(element).val('').val(shippingAddress['email']);
            else if (index == 3)
                $(element).val('').val(shippingAddress['phone']);
            else if (index == 4) {

            }
            else if (index == 5)
                $(element).val('').val(shippingAddress['postalCode']);
            else if (index == 6)
                $(element).val('').val(shippingAddress['state']);
            else if (index == 7)
                $(element).val('').val(shippingAddress['city']);
            else if (index == 8)
                $(element).val('').val(shippingAddress['address1']);
            else if (index == 9)
                $(element).val('').val(shippingAddress['address2']);
        });

        // shipping form
        selects.eq(0).val(shippingAddress['country']);
    });
    // edit task(s)
    $('#edit-task-btn').on('click', async () => {
        /*
        var checks = task_modal_ac.children().find('input');
        var checks2 = task_modal_pr.children().find('input');
        var checks3 = task_modal_bl.children().find('input');
        */
        var checks = task_accountsList.find('input');
        var checks2 = task_proxiesList.find('input');
        var checks3 = task_billingsList.find('input');

        var retailerName = $('#task-rt-select').find('input').val().trim();
        var task_id = $('#basicExampleModal').attr('task_id').trim().toInt();

        var acchk = false;
        var prchk = false;
        var blchk = false;
        var account_id = 0;
        var proxy_id = 0;
        var billing_id = 0;

        checks.each((n, e) => {
            if ($(e).is(':checked')) {
                acchk = true;
                account_id = parseInt($(e).attr('oid'));
            }
        });

        checks2.each((n, e) => {
            if ($(e).is(':checked')) {
                prchk = true;
                proxy_id = parseInt($(e).attr('oid'));
            }
        });
        checks3.each((n, e) => {
            if ($(e).is(':checked')) {
                blchk = true;
                billing_id = parseInt($(e).attr('oid'));
            }
        });
        var options = {};
        {
            var use0_0 = $('#defaultunChecked_pad00').is(':checked'); // restock
            var use0_1 = $('#defaultunChecked_pad01').is(':checked'); // お知らせ受信
            var use0_2 = $('#defaultunChecked_pad02').is(':checked'); // レビューする
            var use0_3 = $('#defaultunChecked_pad03').is(':checked'); // お気に入り追加

            var use1 = $('#defaultunChecked1').is(':checked');
            var use2 = $('#defaultunChecked2').is(':checked');
            var use3 = $('#defaultunChecked3').is(':checked');
            var use4 = $('#defaultunChecked4').is(':checked');
            var use5 = $('#defaultunChecked5').is(':checked');
            var use6 = $('#defaultunChecked6').is(':checked');

            options['restock'] = false;
            options['subscribe'] = false;
            options['review'] = false;
            options['addfavorite'] = false;

            if (use0_0)
                options['restock'] = true;
            if (use0_1)
                options['subscribe'] = true;
            if (use0_2)
                options['review'] = true;
            if (use0_3)
                options['addfavorite'] = true;

            if (use1)
                options['use_mobile'] = true;
            else
                options['use_mobile'] = false;
            if (use2)
                options['reload_interval'] = $('#opreloadinterval').find('input').val().toInt();
            else
                options['reload_interval'] = -1;
            if (use3)
                options['checkin_delay'] = $('#opcheckindelay').find('input').val().toInt();
            else
                options['checkin_delay'] = -1;
            if (use4)
                options['checkout_delay'] = $('#opcheckoutdelay').find('input').val().toInt();
            else
                options['checkout_delay'] = -1;
            if (use5)
                options['attempt_count'] = $('#opattemptcount').find('input').val().toInt();
            else
                options['attempt_count'] = -1;
            if (use6)
                options['attempt_delay'] = $('#opattemptdelay').find('input').val().toInt();
            else
                options['attempt_delay'] = -1;
        }

        var keywords = $('#form7').val().trim();
        var js_keywords = keywords;
        keywords = '+' + keywords; var sp = keywords.split(' ');
        for (var i = 0; i < sp.length; i++) if (sp[i] == '') sp.splice(i, 1);
        keywords = sp.join(',+');

        var size = $('#task-item-size').val().trim();
        var js_size = size;
        size = '+' + size; var sp = size.split(' ');
        for (var i = 0; i < sp.length; i++) if (sp[i] == '') sp.splice(i, 1);
        size = sp.join(',+');

        var style = $('#task-item-style').val().trim();
        var js_style = style;
        style = '+' + style; var sp = style.split(' ');
        for (var i = 0; i < sp.length; i++) if (sp[i] == '') sp.splice(i, 1);
        style = sp.join(',+');
        var category = $('div.task-item-categories > input').val().trim();
        var js_category = $('div.task-item-categories > select')[0].selectedIndex;

        lazyb.tasks.forEach((o, n) => {
            if (o.id == task_id) {
                lazyb.tasks[n].product = '...';
                lazyb.tasks[n].keywords = keywords;
                lazyb.tasks[n].urls = js_keywords;
                lazyb.tasks[n].category = category;
                lazyb.tasks[n].size = size;
                lazyb.tasks[n].style = style;
                lazyb.tasks[n].startTime = new Date($('#input_date').val() + ' ' + $('#input_time').val());
                lazyb.tasks[n].status = 'idle';
                lazyb.tasks[n].retailer_id = findRetailer($('#task-rt-select').find('input').val().trim()).id; // retailer id
                lazyb.tasks[n].proxy_id = proxy_id;
                lazyb.tasks[n].account_id = account_id;
                lazyb.tasks[n].options = options;
                lazyb.tasks[n].js_retailer = $('#task-rt-select').find('select')[0].selectedIndex;
                lazyb.tasks[n].js_keywords = js_keywords;
                lazyb.tasks[n].js_style = js_style;
                lazyb.tasks[n].js_size = js_size;
                lazyb.tasks[n].js_input_date = $('#input_date').val();
                lazyb.tasks[n].js_input_time = $('#input_time').val();
                lazyb.tasks[n].js_category = js_category;
                lazyb.tasks[n].js_login_checked = $('#login-switch > label > input').is(':checked');
                lazyb.tasks[n].js_proxy_checked = $('#proxy-switch > label > input').is(':checked');
                lazyb.tasks[n].js_billing_checked = $('#billing-switch > label > input').is(':checked');
                lazyb.tasks[n].js_account_id = account_id;
                lazyb.tasks[n].js_proxy_id = proxy_id;
                lazyb.tasks[n].js_billing_id = billing_id;
                return true;
            }
        });
        lazyb = (await execdb()).lazyb;
        {
            // var task_id = lazyb.tasks.slice(-1)[0].id;

            var tbody = $('#task-table > tbody');
            var tr = tbody.find('tr[task_id="' + task_id + '"]');
            var columns = tr.children();

            var retailer = retailerName;
            var retailer_id = lazyb.tasks.slice(-1)[0].retailer_id;
            var product = keywords;
            var size = size;
            var style = style;
            var startTime = 'manual';
            var proxy = 'none';
            var status = 'idle';

            if (prchk)
                proxy = findProxy(proxy_id).profile;

            columns.eq(0).text(task_id);
            columns.eq(1).text(retailer);
            columns.eq(2).text(product);
            columns.eq(3).text(size);
            columns.eq(4).text(style);
            columns.eq(5).text(startTime);
            columns.eq(6).text(proxy);
            columns.eq(7).text(status);
        }

        var tt = findTask(task_id);
        if (tt.retailer_id == 203) {
            (async (task_id, item_url) => {

                function updateProductName(name, item_url) {

                    lazyb.tasks.forEach((o, idx) => {
                        if (o.js_keywords == item_url) {
                            var tbody = $('#task-table > tbody');
                            var tr = tbody.find('tr[task_id="' + o.id + '"]');
                            var columns = tr.children();

                            columns.eq(2).text(name);
                            lazyb.tasks[idx].keywords = name;
                        }
                    });
                }

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': '',
                };

                var res = await request({
                    method: 'GET',
                    url: item_url,
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                var doc = str2doc(res.body);
                var item_name = doc.querySelector('title').textContent.trim();
                if (item_name != null) {
                    updateProductName(item_name, item_url);
                    lazyb = (await execdb()).lazyb;
                }
            })(task_id, tt.js_keywords);
        }
    });

    // add task(s)
    $('#add-task-btn').on('click', async () => {
        /*
        var checks = task_modal_ac.children().find('input');
        var checks2 = task_modal_pr.children().find('input');
        var checks3 = task_modal_bl.children().find('input');
        */
        var checks = task_accountsList.find('input');
        var checks2 = task_proxiesList.find('input');
        var checks3 = task_billingsList.find('input');

        var retailerName = $('#task-rt-select').find('input').val().trim();


        var acchk = false;
        var prchk = false;
        var blchk = false;
        var account_id = 0;
        var proxy_id = 0;
        var billing_id = 0;

        checks.each((n, e) => {
            if ($(e).is(':checked')) {
                acchk = true;
                account_id = parseInt($(e).attr('oid'));
            }
        });

        checks2.each((n, e) => {
            if ($(e).is(':checked')) {
                prchk = true;
                proxy_id = parseInt($(e).attr('oid'));
            }
        });
        checks3.each((n, e) => {
            if ($(e).is(':checked')) {
                blchk = true;
                billing_id = parseInt($(e).attr('oid'));
            }
        });


        var options = {};
        {
            var use0_0 = $('#defaultunChecked_pad00').is(':checked'); // restock
            var use0_1 = $('#defaultunChecked_pad01').is(':checked'); // お知らせ受信
            var use0_2 = $('#defaultunChecked_pad02').is(':checked'); // レビューする
            var use0_3 = $('#defaultunChecked_pad03').is(':checked'); // お気に入り追加

            var use1 = $('#defaultunChecked1').is(':checked');
            var use2 = $('#defaultunChecked2').is(':checked');
            var use3 = $('#defaultunChecked3').is(':checked');
            var use4 = $('#defaultunChecked4').is(':checked');
            var use5 = $('#defaultunChecked5').is(':checked');
            var use6 = $('#defaultunChecked6').is(':checked');

            options['restock'] = false;
            options['subscribe'] = false;
            options['review'] = false;
            options['addfavorite'] = false;

            if (use0_0)
                options['restock'] = true;
            if (use0_1)
                options['subscribe'] = true;
            if (use0_2)
                options['review'] = true;
            if (use0_3)
                options['addfavorite'] = true;

            if (use1)
                options['use_mobile'] = true;
            else
                options['use_mobile'] = false;
            if (use2)
                options['reload_interval'] = $('#opreloadinterval').find('input').val().toInt();
            else
                options['reload_interval'] = -1;
            if (use3)
                options['checkin_delay'] = $('#opcheckindelay').find('input').val().toInt();
            else
                options['checkin_delay'] = -1;
            if (use4)
                options['checkout_delay'] = $('#opcheckoutdelay').find('input').val().toInt();
            else
                options['checkout_delay'] = -1;
            if (use5)
                options['attempt_count'] = $('#opattemptcount').find('input').val().toInt();
            else
                options['attempt_count'] = -1;
            if (use6)
                options['attempt_delay'] = $('#opattemptdelay').find('input').val().toInt();
            else
                options['attempt_delay'] = -1;
        }

        var keywords = $('#form7').val().trim();
        var js_keywords = keywords;
        keywords = '+' + keywords; var sp = keywords.split(' ');
        for (var i = 0; i < sp.length; i++) if (sp[i] == '') sp.splice(i, 1);
        keywords = sp.join(',+');

        var size = $('#task-item-size').val().trim();
        var js_size = size;
        size = '+' + size; var sp = size.split(' ');
        for (var i = 0; i < sp.length; i++) if (sp[i] == '') sp.splice(i, 1);
        size = sp.join(',+');

        var style = $('#task-item-style').val().trim();
        var js_style = style;
        style = '+' + style; var sp = style.split(' ');
        for (var i = 0; i < sp.length; i++) if (sp[i] == '') sp.splice(i, 1);
        style = sp.join(',+');

        var category = $('div.task-item-categories > input').val().trim();
        var js_category = $('div.task-item-categories > select')[0].selectedIndex;

        var task_quantity = $('#task-creation-quantity').val().trim().toInt();

        var retailer_id = findRetailer($('#task-rt-select').find('input').val().trim()).id;
        for (var i = 0; i < task_quantity; i++) {
            lazyb.tasks.push({
                id: ++idx2,
                product: '...',
                keywords: keywords,
                urls: js_keywords,
                category: category,
                size: size,
                style: style,
                startTime: new Date(),//new Date($('#input_date').val() + ' ' + $('#input_time').val()),
                status: 'wating',
                retailer_id: retailer_id, // retailer id
                proxy_id: proxy_id, // proxy id
                billing_id: billing_id, // billing id
                account_id: account_id, // account id
                running: false,
                queued: false,
                invoked: false,
                allow_ctrl: true,
                done: false,
                token: null,
                notify_child: null,
                notify_main: null,
                options: options,
                temporary: {
                    doc: null,
                },
                js_retailer: $('#task-rt-select').find('select')[0].selectedIndex,
                js_keywords: js_keywords,
                js_style: js_style,
                js_size: js_size,
                js_input_date: $('#input_date').val(),
                js_input_time: $('#input_time').val(),
                js_category: js_category,
                js_login_checked: $('#login-switch > label > input').is(':checked'),
                js_proxy_checked: $('#proxy-switch > label > input').is(':checked'),
                js_billing_checked: $('#billing-switch > label > input').is(':checked'),
                js_account_id: account_id,
                js_proxy_id: proxy_id,
                js_billing_id: billing_id,
            });
            lazyb = (await execdb()).lazyb;

            if (prchk)
                lazyb.tasks.slice(-1)[0].proxy_id = proxy_id;
            if (blchk)
                lazyb.tasks.slice(-1)[0].billing_id = billing_id;

            // create a webiew element
            {
                //options['use_mobile'] = true;

                var task = lazyb.tasks.slice(-1)[0];
                if (!task.options['use_mobile'])
                    create_webview(task.id);
            }
            //$('#login-switch > label > input').prop('checked', false).change();

            {
                var task_id = lazyb.tasks.slice(-1)[0].id;

                var tbody = $('#task-table > tbody');
                var tr = tbody.children('tr').eq(0).clone().removeAttr('style');
                tr.attr('task_id', task_id);
                var columns = tr.children();

                var retailer = retailerName;
                var retailer_id = lazyb.tasks.slice(-1)[0].retailer_id;
                var product = 'unnamed'; // keywords;
                var size = size;
                var style = style;
                var startTime = 'manual';
                var proxy = 'none';
                var status = 'idle';

                if (prchk)
                    proxy = findProxy(proxy_id).profile;


                columns.eq(0).text(task_id);
                columns.eq(1).text(retailer);
                columns.eq(2).text(product);
                columns.eq(3).text(size);
                columns.eq(4).text(style);
                columns.eq(5).text(startTime);
                columns.eq(6).text(proxy);
                columns.eq(7).text(status);

                // initiate and pause task
                columns.eq(8).find('span > button').eq(0).on('click', function hoho(e) {
                    var oclass = 'btn btn-success btn-rounded btn-sm0 m-0 waves-effect waves-light';
                    //var modified = 'btn btn-danger btn-rounded btn-sm0 m-0';

                    var columns_ = $(this).parents('tr').children().eq(8);
                    var original = '<button type="button" class="btn btn-success btn-rounded btn-sm0 m-0 waves-effect waves-light" style="top: 0"><i class="fa fa-play-circle"></i></button>';
                    var modified = '<button type="button" class="btn btn-danger btn-rounded btn-sm0 m-0 waves-effect waves-light" style="top: 1px"><i class="fa fa-pause-circle"></i></button>';
                    var id = parseInt($(this).parents('tr').children().eq(0).text(), 10);
                    lazyb.tasks.forEach((o, n) => {
                        if (o.id == id) {

                            //$('button[data-target="#basicExampleModal"]').click();

                            /*
                            if ($(e.target).attr('class') == original) {
                                $(e.target).attr('class', modified);
                                $(e.target).children('i').attr('class', 'fa fa-pause-circle');
                            }
                            else {
                                $(e.target).attr('class', original);
                                $(e.target).children('i').attr('class', 'fa fa-play-circle');
                            }
                            */

                            function updateStatus(task_id, status) {
                                var tbody = $('#task-table > tbody');
                                var tr = tbody.find('tr[task_id="' + task_id + '"]');
                                var columns = tr.children();

                                columns.eq(7).text(status);
                            }

                            // initiate
                            if ($(this).attr('class').indexOf(oclass) != -1) {
                                if (lazyb.tasks[n].done)
                                    return;
                                if (!lazyb.tasks[n].allow_ctrl)
                                    return;

                                var old = $(this).replaceWith(modified);
                                old.off('click');
                                old.remove();

                                var tbn1 = columns_.find('span > button').eq(0);
                                tbn1.on('click', hoho);

                                if (!lazyb.tasks[n].queued) {
                                    (async () => { await exec(id, retailer_id); })();
                                    lazyb.tasks[n].queued = true;
                                }

                                if (!lazyb.tasks[n].running) {
                                    lazyb.tasks[n].running = true;

                                    if (lazyb.tasks[n].invoked)
                                        return true;

                                    if (lazyb.tasks[n].notify_main == null)
                                        lazyb.tasks[n].notify_main = async (task_id, status) => {
                                            if (status == 'done') {
                                                var original = '<button type="button" class="btn btn-success btn-rounded btn-sm0 m-0 waves-effect waves-light" style="top: 0"><i class="fa fa-play-circle"></i></button>';
                                                var modified = '<button type="button" class="btn btn-danger btn-rounded btn-sm0 m-0 waves-effect waves-light" style="top: 1px"><i class="fa fa-pause-circle"></i></button>';

                                                var tr = tbody.find('tr[task_id="' + task_id + '"]');
                                                var columns_ = tr.children().eq(8);
                                                var tmp = columns_.find('span > button').eq(0);

                                                var old = tmp.replaceWith(original);
                                                old.off('click');
                                                old.remove();

                                                var tbn1 = columns_.find('span > button').eq(0);
                                                tbn1.on('click', hoho);

                                                var task_idx = findTaskIndex(task_id);
                                                lazyb.tasks[task_idx].done = true;
                                                lazyb.tasks[task_idx].running = false;
                                                lazyb.tasks[task_idx].invoked = false;
                                                lazyb.tasks[task_idx].allow_ctrl = false;
                                                lazyb.tasks[task_idx].token = null;
                                                lazyb.tasks[task_idx].notify_child = null;
                                                lazyb.tasks[task_idx].notify_main = null;

                                                updateStatus(task_id, 'idle');

                                                (async () => { lazyb = (await execdb()).lazyb; })();
                                            } else if ('suspended') {
                                                updateStatus(task_id, 'idle');

                                                (async () => { lazyb = (await execdb()).lazyb; })();
                                            }
                                        };

                                    if (lazyb.tasks[n].notify_child != null) {
                                        lazyb.tasks[n].notify_child(lazyb.tasks[n].id, 'running');
                                        updateStatus(lazyb.tasks[n].id, 'running');
                                    }
                                }

                                (async () => { lazyb = (await execdb()).lazyb; })();
                            }
                            // pause
                            else {
                                if (lazyb.tasks[n].done)
                                    return true;
                                if (!lazyb.tasks[n].allow_ctrl)
                                    return;

                                var old = $(this).replaceWith(original);
                                old.off('click');
                                old.remove();

                                var tbn1 = columns_.find('span > button').eq(0);
                                tbn1.on('click', hoho);

                                if (lazyb.tasks[n].running) {
                                    lazyb.tasks[n].running = false;

                                    if (lazyb.tasks[n].invoked)
                                        return true;

                                    /*
                                    if (lazyb.tasks[n].notify_main == null)
                                        lazyb.tasks[n].notify_main = async (task_id, status, tmp) => {
                                            if (status == 'done') {
                                                var original = '<button type="button" class="btn btn-success btn-rounded btn-sm0 m-0 waves-effect waves-light" style="top: 0"><i class="fa fa-play-circle"></i></button>';
                                                var modified = '<button type="button" class="btn btn-danger btn-rounded btn-sm0 m-0 waves-effect waves-light" style="top: 1px"><i class="fa fa-pause-circle"></i></button>';
     
                                                var columns_ = tmp.parents('tr').children().eq(8);
     
                                                var old = tmp.replaceWith(modified);
                                                old.off('click');
                                                old.remove();
     
                                                var tbn1 = columns_.find('span > button').eq(0);
                                                tbn1.on('click', hoho);
     
                                                var task_idx = findTaskIndex(task_id);
                                                lazyb.tasks[task_idx].done = true;
                                                alert(1);
                                            }
                                        };
                                        */

                                    /*
                                if (lazyb.tasks[n].notify_child != null)
                                    lazyb.tasks[n].notify_child(lazyb.tasks[n].id, 'idle', tbn1);
                                    */
                                }

                                (async () => { lazyb = (await execdb()).lazyb; })();
                            }
                        }
                    });
                    columns_ = null;
                });

                // edit task
                columns.eq(8).find('span > button').eq(1).on('click', (e) => {
                    var task_id = parseInt($(e.target).parents('tr').children().eq(0).text(), 10);
                    lazyb.tasks.forEach((o, n) => {
                        if (o.id == task_id) {
                            $('#add-task-btn').hide();
                            $('#edit-task-btn').show();
                            $('#task-creation-quantity').hide();

                            // task editing
                            task_restore(task_id);
                            function task_restore(task_id) {
                                var task = null;
                                lazyb.tasks.forEach(obj => {
                                    if (obj.id == task_id) {
                                        task = obj;
                                        return true;
                                    }
                                });

                                /*
                                if (task.js_account_id != 0) {
                                    $('#account-switch > label > input').prop('checked', true).change();
                                    $('input[name="fakegr00"][oid="' + task.js_account_id + '"]').prop('checked', true).change();
                                } else {
                                    $('#account-switch > label > input').prop('checked', false).change();
                                    $('input[name="fakegr00"][oid="' + task.js_account_id + '"]').prop('checked', false).change();
                                }
                                if (task.js_proxy_id != 0) {
                                    $('#proxy-switch > label > input').prop('checked', true).change();
                                    $('input[name="fakegr01"][oid="' + task.js_proxy_id + '"]').prop('checked', true).change();
                                } else {
                                    $('#proxy-switch > label > input').prop('checked', false).change();
                                    $('input[name="fakegr01"][oid="' + task.js_proxy_id + '"]').prop('checked', false).change();
                                }
                                if (task.js_billing_id != 0) {
                                    $('#billing-switch > label > input').prop('checked', true).change();
                                    $('input[name="fakegr02"][oid="' + task.js_billing_id + '"]').prop('checked', true).change();
                                } else {
                                    $('#billing-switch > label > input').prop('checked', false).change();
                                    $('input[name="fakegr02"][oid="' + task.js_billing_id + '"]').prop('checked', false).change();
                                }
                                */

                                {

                                    var retailer_id = task.retailer_id;
                                    var sac = findAccounts(retailer_id);
                                    var wrap = task_accountsList;

                                    var inputs = wrap.find('input');
                                    var skip = false;

                                    if (inputs.length != 0) {
                                        inputs.each((idx, elem) => {
                                            if ($(elem).is(':checked')) {
                                                skip = true;
                                                return true;
                                            }
                                        });
                                    }
                                    if (!skip) {
                                        wrap.empty();
                                        sac.forEach((o, n) => {
                                            if (o.retailer_id == retailer_id) {
                                                clone = ac_option.clone();
                                                clone.find('input').attr('name', 'fakegr00');
                                                clone.find('input').attr('id', 'mac' + n);
                                                clone.find('input').attr('oid', o.id);
                                                clone.find('label').attr('for', 'mac' + n);
                                                clone.find('label').text(o.email);

                                                wrap.append(clone);
                                                clone = null;
                                            }
                                        });

                                        if (task.js_account_id != 0)
                                            $('input[name="fakegr00"][oid="' + task.js_account_id + '"]').prop('checked', true).change();
                                    }
                                }

                                {
                                    var wrap = task_proxiesList;

                                    var inputs = wrap.find('input');
                                    var skip = false;
                                    var retailer_id = task.retailer_id;

                                    if (inputs.length != 0) {
                                        inputs.each((idx, elem) => {
                                            if ($(elem).is(':checked')) {
                                                skip = true;
                                                return true;
                                            }
                                        });
                                    }

                                    if (!skip) {
                                        wrap.empty();
                                        lazyb.proxies.forEach((o, n) => {
                                            if (o.retailer_id == retailer_id) {
                                                clone = ac_option.clone();
                                                clone.find('input').attr('name', 'fakegr01');
                                                clone.find('input').attr('id', 'mpr' + n);
                                                clone.find('input').attr('oid', o.id);
                                                clone.find('label').attr('for', 'mpr' + n);
                                                clone.find('label').text(o.profile);

                                                wrap.append(clone);
                                                clone = null;
                                            }
                                        });

                                        if (task.js_proxy_id != 0)
                                            $('input[name="fakegr01"][oid="' + task.js_proxy_id + '"]').prop('checked', true).change();
                                    }
                                }

                                {
                                    var wrap = task_billingsList;
                                    var inputs = wrap.find('input');
                                    var skip = false;
                                    var retailer_id = $('#task-rt-select').find('select').val().toInt();

                                    if (inputs.length != 0) {
                                        inputs.each((idx, elem) => {
                                            if ($(elem).is(':checked')) {
                                                skip = true;
                                                return true;
                                            }
                                        });
                                    }
                                    if (!skip) {
                                        wrap.empty();
                                        lazyb.billings.forEach((o, n) => {
                                            clone = ac_option.clone();
                                            clone.find('input').attr('name', 'fakegr02');
                                            clone.find('input').attr('id', 'mbi' + n);
                                            clone.find('input').attr('oid', o.id);
                                            clone.find('label').attr('for', 'mbi' + n);
                                            clone.find('label').text(o.profile);

                                            wrap.append(clone);
                                        });

                                        if (task.js_billing_id != 0) {
                                            $('input[name="fakegr02"][oid="' + task.js_billing_id + '"]').prop('checked', true).change();
                                        }
                                    }
                                }


                                if (task.js_input_date != '')
                                    $('#input_date').val(task.js_input_date).change();
                                else
                                    $('#input_date').val('').change();
                                if (task.js_input_time != '')
                                    $('#input_time').val(task.js_input_time).change();
                                else
                                    $('#input_time').val('').change();


                                $('#form7').val(task.js_keywords).change();
                                $('#task-item-size').val(task.js_size).change();
                                $('#task-item-style').val(task.js_style).change();

                                var options1 = $('#task-rt-select').find('select').find('option');
                                var options2 = $('div.task-item-categories > select').find('option');

                                options1[task.js_retailer].value;
                                options2[task.js_category].value;
                                $('#task-rt-select').find('select').val(options1[task.js_retailer].value).trigger('click');
                                $('div.task-item-categories > select').val(options2[task.js_category].value).trigger('click');

                                var options = task.options;

                                if (options['use_mobile'])
                                    $('#defaultunChecked1').prop('checked', true).change();
                                else
                                    $('#defaultunChecked1').prop('checked', false).change();

                                if (options['reload_interval'] != -1) {
                                    $('#defaultunChecked2').prop('checked', true).change();
                                    $('#opreloadinterval').find('input').val(options['reload_interval']).change();
                                } else {
                                    $('#defaultunChecked2').prop('checked', false).change();
                                    $('#opreloadinterval').find('input').val('').change();
                                }

                                if (options['checkin_delay'] != -1) {
                                    $('#defaultunChecked3').prop('checked', true).change();
                                    $('#opcheckindelay').find('input').val(options['checkin_delay']).change();
                                } else {
                                    $('#defaultunChecked3').prop('checked', false).change();
                                    $('#opcheckindelay').find('input').val('').change();
                                }
                                if (options['checkout_delay'] != -1) {
                                    $('#defaultunChecked4').prop('checked', true).change();
                                    $('#opcheckoutdelay').find('input').val(options['checkout_delay']).change();
                                } else {
                                    $('#defaultunChecked4').prop('checked', false).change();
                                    $('#opcheckoutdelay').find('input').val('').change();
                                }

                                if (options['attempt_count'] != -1) {
                                    $('#defaultunChecked5').prop('checked', true).change();
                                    $('#opattemptcount').find('input').val(options['attempt_count']).change();
                                } else {
                                    $('#defaultunChecked5').prop('checked', false).change();
                                    $('#opattemptcount').find('input').val('').change();
                                }

                                if (options['attempt_delay'] != -1) {
                                    $('#defaultunChecked6').prop('checked', true).change();
                                    $('#opattemptdelay').find('input').val(options['attempt_delay']).change();
                                } else {
                                    $('#defaultunChecked6').prop('checked', false).change();
                                    $('#opattemptdelay').find('input').val('').change();
                                }
                            }

                            $('#basicExampleModal').attr('task_id', task_id).modal('show');

                            //$('button[data-target="#basicExampleModal"]').click();
                        }
                    });
                });

                // delete task
                columns.eq(8).find('span > button').eq(2).on('click', async (e) => {
                    var id = parseInt($(e.target).parents('tr').children().eq(0).text(), 10);

                    lazyb.tasks.forEach(async (o, n) => {
                        if (o.id == id) {
                            if (o.running && o.allow_ctrl) {
                                lazyb.tasks[n].running = false;
                                while (true) {
                                    if (!lazyb.tasks[n].invoked)
                                        break;
                                    await sleep(1);
                                }

                                lazyb.tasks.splice(n, 1);
                                lazyb = (await execdb()).lazyb;


                                $(e.target).parents('tr').remove();
                                console.log('running');
                                return true;
                            } else if (!o.running) {
                                lazyb.tasks.splice(n, 1);
                                lazyb = (await execdb()).lazyb;

                                $(e.target).parents('tr').remove();
                                console.log('not running');
                                return true;
                            }
                        }
                    });
                });
                tbody.append(tr);

                columns = null;

                // (async () => { await exec(id, retailer_id); })();
            }
        }

        if (retailer_id == 203) {
            (async (task_id, item_url) => {

                function updateProductName(name, item_url) {

                    lazyb.tasks.forEach((o, idx) => {
                        if (o.js_keywords == item_url) {
                            var tbody = $('#task-table > tbody');
                            var tr = tbody.find('tr[task_id="' + o.id + '"]');
                            var columns = tr.children();

                            columns.eq(2).text(name);
                            lazyb.tasks[idx].keywords = name;
                        }
                    });
                }

                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja;q=1, en-US;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': '',
                };

                var res = await request({
                    method: 'GET',
                    url: item_url,
                    headers: headers,
                    data: '',
                }, 'euc-jp');

                var doc = str2doc(res.body);
                var item_name = doc.querySelector('title').textContent.trim();
                if (item_name != null) {
                    updateProductName(item_name, item_url);
                    lazyb = (await execdb()).lazyb;
                }
            })(lazyb.tasks.slice(-1)[0].id, js_keywords);
        }
    });
})();