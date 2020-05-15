$(async function () {
    // weview stuff
    window.wvContainer = [];
    window.create_webview = async function (task_id) {

        Function.prototype.toString_ = function () {
            return "(" + this.toString() + ")();";
        };

        var webview_html = '<webview src="about:blank" style="height: 200px;"></webview>';

        // Modify the user agent for all requests to the following urls.
        const filter = {
            urls: ['*://*/*']
        }

        var webview_elem = $(document.createElement('webview'));
        wvContainer.push(webview_elem[0]);
        var lastIndex = wvContainer.length - 1;

        webview_elem.attr('src', 'about:blank');
        webview_elem.attr('style', 'width: 200px; height: 250px; background-color: white;float:left;display: none');
        webview_elem.attr('index', lastIndex);
        webview_elem.attr('task_id', task_id);

        var w = $('#iko').append(webview_elem);

        setTimeout(() => {
            if (!$('.arrow').hasClass('appeared')) {
                $('.arrow').click();
            }
            webview_elem.css('display', '');
        }, 100);

        wvContainer[lastIndex].addEventListener('console-message', (e) => {
            console.log('Guest page logged a message:', e.message)
        })

        function now() { var d_ = new Date(); var dst_ = d_.toLocaleString('ja') + ':' + ('000' + d_.getMilliseconds()).slice(-3); return dst_; }

        const loadstart = (e) => {
            console.log(now() + 'loadstart');
            //wv001.removeEventListener('did-start-loading', loadstart);
            wvContainer[lastIndex].getWebContents().session.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
                //console.log(details.resourceType);
                if (details.url.indexOf('https://assets.supremenewyork.com/assets/') != -1 && (details.resourceType === 'stylesheet' || details.resourceType === 'image')) {
                    callback({ cancel: true });
                    return;
                } else if (details.resourceType === 'script') {
                    var cancel = false;
                    for (var i = 0; i < details.requestHeaders.length; ++i) {
                        if (details.requestHeaders[i].name === 'Referer') {
                            if (details.requestHeaders[i].value.indexOf('https://www.supremenewyork.com/') != -1 && (details.url.indexOf('https://www.gstatic.com') != -1 || details.url.indexOf('https://connect.facebook.net') != -1
                                || details.url.indexOf('https://ssl.google-analytics.com/') != -1 || details.url.indexOf('https://cdn.mxpnl.com') != -1 || details.url.indexOf('https://www.google.com') != -1)) {
                                cancel = true;
                                break;
                            }
                        }
                    }

                    if (cancel) {
                        callback({ cancel: true });
                        return;
                    }
                }

                callback({ cancel: false, requestHeaders: details.requestHeaders })
            });
        };
        const domready = async (e) => {
            console.log('domready');

            wvContainer[lastIndex].getZoomLevel((zoomLevel) => {
                if (zoomLevel != -2) {
                    wvContainer[lastIndex].setZoomLevel(-2);
                }
            });
            wvContainer[lastIndex].executeJavaScript(
                (function () {
                    window.addEventListener('message', (e) => {
                        var object = e.data;
                        window[object.name] = object.data;
                    });
                }).toString_()
            );

            if (wvContainer[lastIndex].billing !== undefined) {
                var billing = wvContainer[lastIndex].billing;

                var token = lazyb_captcha['tokens2'].slice(-1)[0].response;
                lazyb_captcha['tokens2'].pop();

                wvContainer[lastIndex].contentWindow.postMessage({ name: 'billing', data: billing }, '*');
                wvContainer[lastIndex].contentWindow.postMessage({ name: 'captcha_token', data: token }, '*');

                //wv001.billing = undefined;

                await sleep(20); // 100 ~ 200
                wvContainer[lastIndex].executeJavaScript(
                    (async function () {
                        function now() { var d_ = new Date(); var dst_ = d_.toLocaleString('ja') + ':' + ('000' + d_.getMilliseconds()).slice(-3); return dst_; };

                        var billing = window.billing;
                        var token = window.captcha_token;
                        // var billingNameInp = $('#order_billing_name');
                        //billingNameInp.val(window.billing.shippingAddress.lastName + ' ' + window.billing.shippingAddress.firstName);

                        var p2 = {
                            set: (selector, value) => {
                                if (selector == '[name="order[terms]"][type="checkbox"]')
                                    $(selector).prop('checked', true);
                                else
                                    $(selector).val(value);
                            }
                        }
                        p2.set('[name="order[billing_name]"]', billing.shippingAddress.lastName + ' ' + billing.shippingAddress.firstName);
                        p2.set('[name="order[email]"]', billing.shippingAddress.email);
                        p2.set('[name="order[tel]"]', billing.shippingAddress.phone);
                        p2.set('[name="order[billing_zip]"]', billing.shippingAddress.postalCode);
                        p2.set('[name="order[billing_state]"]', ' ' + billing.shippingAddress.state);
                        p2.set('[name="order[billing_city]"]', billing.shippingAddress.city);
                        p2.set('[name="order[billing_address]"]', billing.shippingAddress.address1);
                        //p2.set('same_as_billing_address', '1');
                        p2.set('[name="credit_card[type]"]', billing.payment.cardType);
                        // test mode
                        //$('[name="credit_card[type]"]').val('cod').change(); //要注意!
                        p2.set('[name="credit_card[cnb]"]', billing.payment.cardNumber.substring(0, 4) + ' ' + billing.payment.cardNumber.substring(4, 8) + ' ' + billing.payment.cardNumber.substring(8, 12) + ' ' + billing.payment.cardNumber.substring(12, 16));
                        p2.set('[name="credit_card[month]"]', billing.payment.expiration.split('/')[0]);
                        p2.set('[name="credit_card[year]"]', '20' + billing.payment.expiration.split('/')[1]);
                        p2.set('[name="credit_card[vval]"]', billing.payment.cvv);
                        p2.set('[name="order[terms]"][type="checkbox"]', '1');

                        // init
                        $('div.g-recaptcha').html('<div class="grecaptcha-badge" data-style="bottomright" style="width: 256px; height: 60px; transition: right 0.3s ease 0s; position: fixed; bottom: 14px; right: -186px; box-shadow: gray 0px 0px 5px;"><div class="grecaptcha-logo"></div><div class="grecaptcha-error"></div><textarea id="g-recaptcha-response" name="g-recaptcha-response" class="g-recaptcha-response" style="width: 250px; height: 40px; border: 1px solid rgb(193, 193, 193); margin: 10px 25px; padding: 0px; resize: none; display: none;"></textarea></div>');

                        // token
                        $('#g-recaptcha-response').val(token);
                        console.log(now() + 'js: ' + token);
                        window.checkoutAfterCaptcha();
                        console.log(now() + 'trying to purchase...!');
                    }).toString_()
                );

                // propagated that queued 
            }
        }
        await sleep(1000);
        // wvContainer[0].addEventListener('did-frame-finish-load', loadstart);
        wvContainer[lastIndex].addEventListener('did-finish-load', domready);
        wvContainer[lastIndex].loadURL('https://www.supremenewyork.com/shop/all');
    }

    {
        // 移動する要素の親要素(スワイプ後の位置を確認するのに使用)
        var swWrap = $('#swipe');
        // 移動する要素
        var main = $('main');
        var sw = swWrap.find('.bgImage');
        var arrow = sw.find('.arrow');
        var touched = false;

        var this_ = document.querySelector('.bgImage');
        var body = $(document.body);
        var isTouch = ('ontouchstart' in window);
        // 初期位置
        var basePoint = 22;
        sw.css({
            top: -sw.height() + 40
        });

        var patch001 = false;

        $('.button-collapse').on('click', () => {
            $('#slide-out').removeClass('patch');
            patch001 = false;
        });
        $(window).resize(() => {

            if (!touched) {
                sw.css({
                    top: -sw.height() + 40
                });
            }

            if ($('#sidenav-overlay').length) {
                $('#sidenav-overlay').remove();
            }

            if ($(window).width() >= 1440) {
                if (!patch001) {
                    $('#slide-out').addClass('patch');
                    patch001 = true;
                }
            }
        });

        $(document).keydown((e) => {
            if (e.which === 123) {
                ipcRenderer.send('opendev');
            }
        });
        $('#payment-cc_number').keypress((e) => {
            var txt = String.fromCharCode(e.which);
            if (!txt.match(/[0-9]/)) {
                return false;
            } else {
                var str = e.target.value.split(' ').join('');
                if ((str.length != 0 && str.length % 4 == 0) && str.length <= 15)
                    e.target.value += ' ';
            }
        });

        $(document).on('click', function (e) {
            if (!$(e.target).closest('.bgImage > .arrow').length) {
                if (touched)
                    arrow.trigger('click');
            }
        });

        arrow.on('click', (e) => {
            if (!touched) {
                touched = true;

                sw.animate({
                    top: 0
                }, 300);

                arrow.addClass('appeared');
                main.delay(4).queue(function () {
                    $(this).addClass('blur');
                    $(this).dequeue();
                });
            } else {
                touched = false;

                sw.animate({
                    top: -sw.height() + 40
                }, {
                        complete: function () {
                            $('.log-view').attr('style', 'transform: translate3d(0px, 0px, 0px); transition-duration: 0ms;');
                        }
                    }, 300);

                arrow.removeClass('appeared');
                main.delay(4).queue(function () {
                    $(this).removeClass('blur');
                    $(this).dequeue();
                });
            }
        });
    }
    {
        var opcheck1 = $('#defaultunChecked1');
        var opcheck2 = $('#defaultunChecked2');
        var opcheck3 = $('#defaultunChecked3');
        var opcheck4 = $('#defaultunChecked4');
        var opcheck5 = $('#defaultunChecked5');
        var opcheck6 = $('#defaultunChecked6');

        var opshiplist = $('#opshippinglist');
        var opreloadinterval = $('#opreloadinterval');
        var opcheckindelay = $('#opcheckindelay');
        var opc4 = opcheck4.parent().next().children().eq(0);
        var opc5 = opcheck5.parent().next().children().eq(0);
        var opc6 = opcheck6.parent().next().children().eq(0);

        opshiplist.hide();
        opreloadinterval.hide();
        opcheckindelay.hide();
        opc4.hide();
        opc5.hide();
        opc6.hide();

        opcheck2.change(() => {
            if (opcheck2.prop("checked")) {
                opreloadinterval.slideDown(400);
            }
            else {
                opreloadinterval.slideUp(400);
            }
        });
        opcheck3.change(() => {
            if (opcheck3.prop("checked")) {
                opcheckindelay.slideDown(400);
            }
            else {
                opcheckindelay.slideUp(400);
            }
        });
        opcheck4.change(() => {
            if (opcheck4.prop("checked")) {
                opc4.slideDown(400);
            }
            else {
                opc4.slideUp(400);
            }
        });
        opcheck5.change(() => {
            if (opcheck5.prop("checked")) {
                opc5.slideDown(400);
            }
            else {
                opc5.slideUp(400);
            }
        });
        opcheck6.change(() => {
            if (opcheck6.prop("checked")) {
                opc6.slideDown(400);
            }
            else {
                opc6.slideUp(400);
            }
        });

        return;
        opcheck3.change(() => {
            if (opcheck3.prop("checked")) {
                opshiplist.slideDown(400);
            }
            else {
                opshiplist.slideUp(400);
            }
        });
    }
});