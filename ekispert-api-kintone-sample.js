(function($) {
    "use strict";

    // 駅すぱあとWebサービスのアクセスキー
    var ekispertAccessKey = 'uDZd3GV0IR686CrodlTdLYRi2GHDKVuEmvDHRdE8';

    // レコード詳細・編集画面の表示時に処理を実行
    kintone.events.on(["app.record.create.show", "app.record.edit.show"], function(event) {
        const record = event.record;
        const tableField = record["明細"]; // 明細テーブルのフィールドコードを指定

        // 明細テーブルの各行を処理
        tableField.value.forEach((row) => {
            const transportationField = row.value["交通手段"]; // 交通手段のフィールドコード
            const amountField = row.value["数値"]; // 金額のフィールドコード

            if (transportationField.value === "駅すぱあと") {
                amountField.disabled = true; // 駅すぱあとが選ばれたら金額を無効化
            }
        });

        return event;
    });

    // 交通手段の変更時のイベント
    kintone.events.on(["app.record.create.change.交通手段", "app.record.edit.change.交通手段"], function(event) {
        const record = event.record;
        const tableField = record["明細"];

        tableField.value.forEach((row, index) => {
            const transportationField = row.value["交通手段"];
            const amountField = row.value["数値"];

            if (transportationField.value === "駅すぱあと" && !amountField.value) {   // 交通手段が「駅すぱあと」かつ、金額が空の場合
                if ($('#course-result').length) { $('#course-result').remove(); }

                var coursePartSpace = document.createElement('div');
                coursePartSpace.id = 'course-result';
                kintone.app.record.getSpaceElement('course-result-space').appendChild(coursePartSpace);

                var changeRow = event.changes.row;
                var date = changeRow.value['日付'].value.replace(/-/g, '');
                var depStationPart;
                var arrStationPart;
                var coursePart;
                var depStationCode;
                var arrStationCode;
                var conditionPart;
            
                swal({
                  title: '駅を入力してください',
                  html:'<div style="height: 500px;"><div id="condition"></div>出発<div id="input-dep-station"></div>到着<div id="input-arr-station"></div></div>',
                  onOpen: function () {
                    // 探索条件パーツ
                    conditionPart = new expGuiCondition(document.getElementById('condition'));
                    conditionPart.setConfigure('ssl', true);
                    conditionPart.setConfigure('key', ekispertAccessKey);
                    conditionPart.dispCondition();

                    // 出発駅パーツ
                    depStationPart = new expGuiStation(document.getElementById('input-dep-station'));
                    depStationPart.setConfigure('ssl', true);
                    depStationPart.setConfigure('key', ekispertAccessKey);
                    depStationPart.dispStation();
            
                    // 到着駅パーツ
                    arrStationPart = new expGuiStation(document.getElementById('input-arr-station'));
                    arrStationPart.setConfigure('ssl', true);
                    arrStationPart.setConfigure('key', ekispertAccessKey);
                    arrStationPart.dispStation();
            
                    // 探索結果パーツ
                    coursePart = new expGuiCourse(document.getElementById('course-result'));
                    coursePart.setConfigure('ssl', true);
                    coursePart.setConfigure('key', ekispertAccessKey);
                    coursePart.setConfigure('window', true);    // 経路をポップアップ表示する
            
                  },
                  preConfirm: function () {  // 駅名入力ポップアップでOKボタンを押したときにコールされる
                    return new Promise(function() {
                      depStationCode = depStationPart.getStationCode();
                      arrStationCode = arrStationPart.getStationCode();
                      if (!depStationCode || !arrStationCode) {
                        swal.showValidationError('駅を選択してください。');

                        return;
                      }

                      var searchObject = coursePart.createSearchInterface();
                      searchObject.setDate(date);
                      searchObject.setSearchType('plain');
                      searchObject.setViaList(depStationCode + ':' + arrStationCode);
                      searchObject.setAnswerCount(conditionPart.getAnswerCount());
                      searchObject.setSort(conditionPart.getSortType());
                      searchObject.setConditionDetail(conditionPart.getConditionDetail());
                      searchObject.setPriceType(conditionPart.getPriceType());

                      coursePart.bind('select', function() {    // 経路が確定した時にコールされる
                        coursePart.changeCourse(coursePart.getResultNo());
                        var selectRoute = {};
                        var onewayPrice = coursePart.getPrice(coursePart.PRICE_ONEWAY);
                        var pointList = coursePart.getPointList().split(',');
                        var lineList = coursePart.getLineList().split(',');
                        var routeStr = '';
                        for (var j = 0; j < pointList.length; j++) {
                          if (lineList[j]) {
                            routeStr += pointList[j] + ' - [' + lineList[j] + '] - '
                          } else {
                            routeStr += pointList[j]
                          }
                        }
                        selectRoute = {
                          route: routeStr,
                          price: onewayPrice
                        }

                        // テーブル値の更新
                        var rec = kintone.app.record.get();
                        var tableRecord = rec.record['明細'].value;
            
                        tableRecord[index].value['数値'].value = selectRoute.price
                        tableRecord[index].value['数値'].disabled = true;

                        tableRecord[index].value['経路'].value = selectRoute.route
                        tableRecord[index].value['経路'].disabled = true;

                        kintone.app.record.set(rec);

                        // 受け付けポップアップの表示
                        swal({
                          title: '受け付けました！',
                          type: 'success'
                        })
                      });

                      coursePart.bind('close', function() { // 経路選択ポップアップが閉じた時にコールされる
                        return;
                      })

                      // 経路探索を実行
                      coursePart.search(searchObject, function(isSuccess) {
                        if(!isSuccess){
                          swal.showValidationError('探索結果が取得できませんでした');

                          return;
                        }
                      });
                    })
                  }
                }).then(function (result) {  // 駅名入力ポップアップが閉じた時にコールされる
                })
            }
            else {　// 交通手段が「駅すぱあと」かつ、金額が空、以外の場合
            }
        });

        return event;
    });
})(jQuery);
