class luckle {
    static home() {
        crumb.children().eq(1).hide();
        crumb.children().eq(2).hide();
        $('div[href="/luckle/item/new"]').hide();
        $('div[href="/luckle/home"]').fadeIn('slow');
    }
}
class luckle_item {
    static new() {
        var elem = $('a[href="/luckle/item/new"]');
        crumb.children().eq(1).show().find('a').text(elem.parents().eq(3).find('a').eq(0).text());
        crumb.children().eq(2).show().text(elem.text());

        // logic
        $('div[href="/luckle/home"]').hide();
        $('div[href="/luckle/item/new"]').fadeIn('slow');
    }
    static edit() {
        var elem = $('a[href="/luckle/item/edit"]');
        crumb.children().eq(1).find('a').text(elem.parents().eq(3).find('a').eq(0).text());
        crumb.children().eq(2).text(elem.text());

        // logic
    }
    static delete() {
        var elem = $('a[href="/luckle/item/delete"]');
        crumb.children().eq(1).find('a').text(elem.parents().eq(3).find('a').eq(0).text());
        crumb.children().eq(2).text(elem.text());

        // logic
    }
    static list() {
        var elem = $('a[href="/luckle/item/list"]');
        crumb.children().eq(1).find('a').text(elem.parents().eq(3).find('a').eq(0).text());
        crumb.children().eq(2).text(elem.text());

        // logic
    }
}

class rakuma_item {
    static new() {
        $('#ccc').text('/rakuma/item/new');
    }
    static edit() {
        $('#ccc').text('/rakuma/item/edit');
    }
    static delete() {
        $('#ccc').text('/rakuma/item/delete');
    }
}

var crumb = $('.breadcrumb.primary-color');

page('/luckle/home', luckle.home);
page('/luckle/item/new', luckle_item.new);
page('/luckle/item/edit', luckle_item.edit);
page('/luckle/item/delete', luckle_item.delete);

page('/rakuma/item/new', rakuma_item.new);
page('/rakuma/item/edit', rakuma_item.edit);
page('/rakuma/item/delete', rakuma_item.delete);
page.start();
