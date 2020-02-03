FoEproxy.addHandler('HiddenRewardService', 'getOverview', (data, postData) => {
    HiddenRewards.Cache = data.responseData.hiddenRewards;

    if (MainParser.Buildings !== null) {
        HiddenRewards.prepareData();
    }
});

/**
 *
 * @type {{init: HiddenRewards.init, prepareData: HiddenRewards.prepareData, BuildBox: HiddenRewards.BuildBox, Cache: null}}
 */
let HiddenRewards = {

    Cache: null,
    IsPrepared: false,

	/**
	 * Box in den DOM
	 */
    init: () => {
        if( $('#HiddenRewardBox').length < 1 ) {

			HTML.AddCssFile('hidden-rewards');

			HTML.Box({
				'id': 'HiddenRewardBox',
				'title': i18n('Boxes.HiddenRewards.Title'),
				'auto_close': false,
				'dragdrop': true,
				'minimize': true
			});

			moment.locale(i18n('Local'));
		}
        HiddenRewards.BuildBox();
    },

	/**
	 * Daten aufbereiten
	 */
    prepareData: () => {
        let data = [];

        for(let idx in HiddenRewards.Cache) {
            let position = HiddenRewards.Cache[idx].position.context;

            let SkipEvent = true;
            if (position === 'cityRoadSmall') {
                for (let i in MainParser.Buildings) {
                    if (!MainParser.Buildings.hasOwnProperty(i)) continue;
                    if (MainParser.Buildings[i]['type'] === 'street' && MainParser.Buildings[i]['width'] === 2) {
                        SkipEvent = false;
                        break;
                    }
                }
            }
            else if (position === 'cityRoadBit') {
                for (let i in MainParser.Buildings) {
                    if (!MainParser.Buildings.hasOwnProperty(i)) continue;
                    if (MainParser.Buildings[i]['type'] === 'street' && MainParser.Buildings[i]['width'] === 1) {
                        SkipEvent = false;
                        break;
                    }
                }
            }
            else {
                SkipEvent = false;
            }

            if (SkipEvent) {
                continue;
            }
            
            const positionI18nLookupKey = 'HiddenRewards.Positions.'+position;
            const positionI18nLookup = i18n(positionI18nLookupKey);

            if (positionI18nLookupKey !== positionI18nLookup) {
                position = positionI18nLookup;
            }

            data.push({
                type: HiddenRewards.Cache[idx].type,
                position: position,
                starts: HiddenRewards.Cache[idx].startTime,
                expires: HiddenRewards.Cache[idx].expireTime,
            });
        }

        data.sort(function (a, b) {
            if(a.expires < b.expires) return -1;
            if(a.expires > b.expires) return 1;
            return 0;
        });

        HiddenRewards.Cache = data;

        if ($('#HiddenRewardBox').length >= 1) {
            HiddenRewards.BuildBox();
        }
    },
       

	/**
	 * Inhalt der Box in den BoxBody legen
	 */
    BuildBox:()=> {
        let h = [];

        h.push('<table class="foe-table">');

        h.push('<thead>');
            h.push('<tr>');
                h.push('<th>' + i18n('HiddenRewards.Table.type') + '</th>');
                h.push('<th>' + i18n('HiddenRewards.Table.position') + '</th>');
                h.push('<th>' + i18n('HiddenRewards.Table.expires') + '</th>');
            h.push('</tr>');
        h.push('</thead>');

        h.push('<tbody>');

        let cnt = 0;
        for (let idx in HiddenRewards.Cache) {

        	if(!HiddenRewards.Cache.hasOwnProperty(idx)){
        		break;
			}

            let hiddenReward = HiddenRewards.Cache[idx];

            let StartTime = moment.unix(hiddenReward.starts),
                EndTime = moment.unix(hiddenReward.expires);

            if (EndTime > new Date().getTime()) {
                h.push('<tr>');
                h.push('<td class="incident ' + hiddenReward.type + '" title="' + hiddenReward.type + '">&nbsp;</td>');
                h.push('<td>' + hiddenReward.position + '</td>');
                if (StartTime > new Date().getTime()) {
                    h.push('<td class="warning">' + i18n('Boxes.HiddenRewards.Appears') + ' ' + moment.unix(hiddenReward.starts).fromNow() + '</td>');
                }
                else {
                    h.push('<td class="">' + i18n('Boxes.HiddenRewards.Disappears') + ' ' + moment.unix(hiddenReward.expires).fromNow() + '</td>');
                }
                h.push('</tr>');
                cnt++;
            }
        }
        if (cnt === 0) {
            h.push('<td colspan="3">' + i18n('Boxes.HiddenRewards.NoEvents') + '</td>');
        }

        h.push('</tbody>');

        h.push('</table>');

        $('#HiddenRewardBoxBody').html(h.join(''));
    }
};
