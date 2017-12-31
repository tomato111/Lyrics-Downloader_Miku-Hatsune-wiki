﻿pl = {
    name: 'xplugin_NicoAnimeSP',
    label: 'Nico Anime SP',
    author: 'tomato111',
    onStartUp: function () { // 最初に一度だけ呼び出される
        this.menuitem.Flag = MF_DISABLED;
        var _this = this;

        this.prop = {
            x: 15,
            y: 0,
            width: 10,
            height: 10,
            Color: {
                Ellipse_normal: setAlpha(prop.Style.Color.Text, 40),
                Ellipse_hover: setAlpha(prop.Style.Color.PlayingText, 96)
            }
        };


        //============================================
        //== Nico Anime SP Object ====================
        //============================================
        this.NAS = new function () {
            var _menu, _item_list;

            this.onPaint = function (gr) {
                gr.FillEllipse(_this.prop.x, _this.prop.y, _this.prop.width, _this.prop.height, this.hover ? _this.prop.Color.Ellipse_hover : _this.prop.Color.Ellipse_normal);
            };

            this.repaint = function () {
                window.RepaintRect(_this.prop.x - 1, _this.prop.y - 1, _this.prop.width + 2, _this.prop.height + 2);
            };

            this.refresh = function (x, y) {

                getHTML(null, 'GET', 'http://ch.nicovideo.jp/anime-sp', ASYNC, 0, function (request, depth, file) {

                    var res = request.responseText;
                    //console(res);

                    var menu_items = [ // header
                        {
                            Flag: MF_STRING,
                            Caption: '(Refresh)',
                            Func: function () { _this.NAS.refresh(x, y); }
                        },
                        {
                            Flag: MF_SEPARATOR
                        }
                    ];

                    res = res.replace(/[\t ]*(?:\r\n|\r|\n)[\t ]*/g, '');
                    var CutoutRE = new RegExp('(?:<span class="badge br|<p class="g-live-airtime).+?</form>', 'ig');
                    var SearchRE = new RegExp(
                        '(?:<span class="badge br" title="">(.+?)</span>.+?)?' // $1:放送開始までの時間(1ヶ月以上先や放送中はバッジが付かない)
                        + '<p class="g-live-airtime (\\w+)".+?' // $2:状態(reserved, open, onair, aired)
                        + '<span class="count">([\\d,]+)</span>.+?' // $3:タイムシフト予約数
                        + '<input type="hidden" name="vid" value="(\\d+)">' // $4:放送番号
                        + '<input type="hidden" name="title" value="(.+?)">' // $5:放送タイトル
                        + '<input type="hidden" name="open_time" value="(\\d+)">' // $6:開場時刻(Unixtime)
                        + '<input type="hidden" name="start_time" value="(\\d+)">' // $7:放送時刻(Unixtime)
                        , 'i'
                    );
                    while (CutoutRE.test(res) && SearchRE.test(RegExp.lastMatch)) {
                        var item = {
                            time_to_start: RegExp.$1,
                            status: RegExp.$2,
                            timeshift_count: RegExp.$3,
                            air_id: RegExp.$4,
                            air_title: RegExp.$5,
                            open_time: RegExp.$6,
                            start_time: RegExp.$7
                        };
                        item = createLiveMenuItem(item);
                        if (item.Caption !== menu_items[menu_items.length - 1].Caption) // onair時に発生する重複を除く
                            menu_items.push(item);
                    }

                    menu_items.push( // footer
                        {
                            Flag: MF_SEPARATOR
                        },
                        {
                            Flag: MF_STRING,
                            Caption: 'ニコニコアニメスペシャル\t' + (menu_items.slice(2).length - (res.match(CutoutRE) || []).length).toString().replace(/^0$/, ''),
                            Func: function () { FuncCommand('http://ch.nicovideo.jp/anime-sp'); }
                        }
                    );

                    _menu = buildMenu(menu_items);
                    _item_list = buildMenu.item_list;

                    _this.NAS.popup(x, y);

                },
                    { 'If-Modified-Since': 'Thu, 01 Jun 1970 00:00:00 GMT' } // キャッシュがどうしても邪魔をするので、強制的に最新データを取りに行く
                );

                function createLiveMenuItem(item) {
                    //console("//--Item--"); for (var key in item) { console(key + ": " + item[key]); }
                    var url = 'http://live.nicovideo.jp/watch/lv' + item.air_id;
                    var gate_url = url.replace('watch', 'gate');
                    var open_date = new Date(item.open_time * 1000);
                    var start_date = new Date(item.start_time * 1000);
                    var now_date = new Date();

                    if (item.time_to_start === '') {
                        if (item.status === 'reserved')
                            item.time_to_start = '4w+';
                        if (item.status === 'onair')
                            item.time_to_start = '+' + Math.floor((now_date - start_date) / 1000 / 60) + 'm';
                    }
                    else if (item.status === 'open')
                        item.time_to_start = '-' + item.time_to_start;

                    var caption = item.time_to_start.replaceEach('分後|分以内', 'm', '時間後', 'h', '日後', 'd', '週間後', 'w', 'i')
                        + ': ' + item.air_title.decodeHTMLEntities().replace(/&/g, '&&')
                        + ' (' + item.timeshift_count + ')'
                        + '\t' + ('0' + (start_date.getMonth() + 1)).slice(-2)
                        + '/' + ('0' + start_date.getDate()).slice(-2)
                        + ' (' + ['日', '月', '火', '水', '木', '金', '土'][start_date.getDay()]
                        + ') ' + ('0' + start_date.getHours()).slice(-2)
                        + ':' + ('0' + start_date.getMinutes()).slice(-2)
                        + ' (' + (open_date - start_date) / 1000 / 60 + 'm)';

                    return {
                        Flag: item.status === 'open' || item.status === 'onair' ? MF_CHECKED : MF_STRING,
                        Caption: caption,
                        Func: function () { FuncCommand(utils.IsKeyPressed(VK_CONTROL) ? gate_url : url); }
                    };
                }

            };

            this.popup = function (x, y) {
                if (!_item_list) {
                    this.refresh(x, y);
                }
                else {
                    Menu.isShown = true;
                    var ret = _menu.TrackPopupMenu(x, y);
                    if (ret !== 0)
                        _item_list[ret].Func();
                    (function () { Menu.isShown = false; _this.onLeave(); }).timeout(10);
                }
            };

        };

    },
    onClick: function (x, y, mask) { // パネルクリック時に呼び出される // trueを返すと本体のクリックイベントをキャンセル
        if (this.NAS.hover) {
            this.NAS.popup(x + 1, y);
            return true;
        }
    },
    onMove: function (x, y) { // パネルにマウスポインタを置くと呼び出され続ける
        if (!Edit.isStarted) {
            var p = this.prop;
            if (!this.NAS.hover && x >= p.x && y >= p.y && x <= p.x + p.width && y <= p.y + p.height) {
                this.NAS.hover = true;
                this.NAS.repaint();
            }
            if (this.NAS.hover && (x < p.x || y < p.y || x > p.x + p.width || y > p.y + p.height)) {
                this.NAS.hover = false;
                this.NAS.repaint();
            }
        }
    },
    onLeave: function () { // パネルからマウスポインタが離れた時に呼び出される
        if (!Menu.isShown) {
            this.NAS.hover = false;
            this.NAS.repaint();
        }
    },
    onPaint: function (gr) { // 描画イベントが発生した時に呼び出される
        if (!Edit.isStarted)
            this.NAS.onPaint(gr);
    }
};
