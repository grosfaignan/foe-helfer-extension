/*
 *
 * **************************************************************************************
 *
 * Dateiname:                 calculator.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 14:31 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let Calculator = {

	ForderBonus: 90,
    EntityOverview: [],
    SoundFile: new Audio(extUrl + 'vendor/sounds/message.mp3'),
    PlayerName: undefined,
    LastPlayerID: 0,
    PlayInfoSound: null,
	PlayOverviewInfoSound: null,
	DetailViewIsNewer: false,
	OpenedFromOverview: undefined,
	AutoOpenKR: false,
	Rankings : undefined,
	CityMapEntity : undefined,
	Overview : undefined,


	/**
	* Kostenrechner öffnen
	*
	*/
	Open: () => {

		// Nur Übersicht verfügbar
		if (Calculator.Overview !== undefined && Calculator.CityMapEntity === undefined) {
			Calculator.ShowOverview(false);
			Calculator.AutoOpenKR = true;
		}

		// Nur Detailansicht verfügbar
		else if (Calculator.CityMapEntity !== undefined && Calculator.Overview === undefined) {
			Calculator.Show();
		}

		// Beide verfügbar
		else if (Calculator.CityMapEntity !== undefined && Calculator.Overview !== undefined) {
			let BuildingInfo = Calculator.Overview.find(obj => {
				return obj['city_entity_id'] === Calculator.CityMapEntity['cityentity_id'] && obj['player']['player_id'] === Calculator.CityMapEntity['player_id'];
			});

			// Beide gehören zum selben Spieler => beide anzeigen
			if (BuildingInfo !== undefined) {
				Calculator.ShowOverview();
				Calculator.Show();
			}

			// Unterschiedliche Spieler => Öffne die neuere Ansicht
			else {
				if (Calculator.DetailViewIsNewer) {
					Calculator.Show();
				}
				else {
					Calculator.ShowOverview();
					Calculator.AutoOpenKR = true;
				}
			}
		}
	},


	/**
	 * Kostenrechner anzeigen
	 *
	 */
	Show: () => {
		Calculator.AutoOpenKR = false;

        // moment.js global setzen
        moment.locale(MainParser.Language);

        // Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
        if ($('#costCalculator').length === 0) {
            let spk = localStorage.getItem('CalculatorTone');

            if (spk === null) {
                localStorage.setItem('CalculatorTone', 'deactivated');
                Calculator.PlayInfoSound = false;

            } else {
                Calculator.PlayInfoSound = (spk !== 'deactivated');
            }

            let ab = localStorage.getItem('CalculatorForderBonus');

            // alten Wert übernehmen, wenn vorhanden
            if (ab !== null) {
				Calculator.ForderBonus = parseFloat(ab);
			}

            HTML.Box({
				'id': 'costCalculator',
				'title': i18n('Boxes.Calculator.Title'),
				'ask': i18n('Boxes.Calculator.HelpLink'),
				'auto_close': true,
				'dragdrop': true,
				'minimize': true,
				'speaker': 'CalculatorTone'
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('calculator');

			Calculator.CurrentPlayer = parseInt(localStorage.getItem('current_player_id'));

			// schnell zwischen den Prozenten wechseln
			$('#costCalculator').on('click', '.btn-toggle-arc', function () {
				Calculator.ForderBonus = parseFloat($(this).data('value'));
				$('#costFactor').val(Calculator.ForderBonus);
				localStorage.setItem('CalculatorForderBonus', Calculator.ForderBonus);
				Calculator.CalcBody();
			});

			// wenn der Wert des Archebonus verändert wird, Event feuern
			$('#costCalculator').on('blur', '#costFactor', function () {
				Calculator.ForderBonus = parseFloat($('#costFactor').val());
				localStorage.setItem('CalculatorForderBonus', Calculator.ForderBonus);
				Calculator.CalcBody();
			});

			$('#costCalculator').on('click', '#CalculatorTone', function () {

				let disabled = $(this).hasClass('deactivated');

				localStorage.setItem('CalculatorTone', (disabled ? '' : 'deactivated'));
				Calculator.PlayInfoSound = !!disabled;

				if (disabled === true) {
					$('#CalculatorTone').removeClass('deactivated');
				} else {
					$('#CalculatorTone').addClass('deactivated');
				}
			});

        }

		let PlayerID = Calculator.CityMapEntity['player_id'],
            h = [];

        // Wenn sich Spieler geändert hat, dann BuildingName/PlayerName zurücksetzen
		if (Calculator.CityMapEntity['player_id'] !== Calculator.LastPlayerID) {
			Calculator.PlayerName = undefined;
			Calculator.ClanName = undefined;
		}

		Calculator.OpenedFromOverview = false;
        // Übersicht vorhanden
		if (Calculator.Overview !== undefined) {
            // Übersicht laden + passendes LG
            let BuildingInfo = Calculator.Overview.find(obj => {
				return obj['city_entity_id'] === Calculator.CityMapEntity['cityentity_id'];
            });

            // Übersicht vom richtigen Spieler vorhanden => Spielername auslesen
			if (BuildingInfo !== undefined && BuildingInfo['player']['player_id'] === PlayerID) {
				Calculator.OpenedFromOverview = true;
				Calculator.PlayerName = BuildingInfo['player']['name'];
			}
        }

		if (Calculator.PlayerName === undefined && PlayerDict[Calculator.CityMapEntity['player_id']] !== undefined) {
			Calculator.PlayerName = PlayerDict[PlayerID]['PlayerName'];
		}
		if (PlayerDict[PlayerID] !== undefined && PlayerDict[PlayerID]['ClanName'] !== undefined) {
			Calculator.ClanName = PlayerDict[PlayerID]['ClanName'];
		}

        // BuildingName konnte nicht aus der BuildingInfo geladen werden
		let BuildingName = BuildingNamesi18n[Calculator.CityMapEntity['cityentity_id']]['name'];
		let Level = (Calculator.CityMapEntity['level'] !== undefined ? Calculator.CityMapEntity['level'] : 0);
		let MaxLevel = (Calculator.CityMapEntity['max_level'] !== undefined ? Calculator.CityMapEntity['max_level'] : 0);

        h.push('<div class="text-center dark-bg" style="padding:5px 0 3px;">');

        // LG - Daten + Spielername
		h.push('<p class="header"><strong><span>' + BuildingName + '</span>');
		if (Calculator.PlayerName !== undefined) {
			h.push('<br>' + Calculator.PlayerName + (Calculator.ClanName !== undefined ? ' - ' + Calculator.ClanName : ''));
		}
        h.push('</strong><br>' + i18n('Boxes.Calculator.Step') + '' + Level + ' &rarr; ' + (Level + 1) + ' ' + i18n('Boxes.Calculator.MaxLevel') + ': ' + MaxLevel + '</p>');

        // FP im Lager
        h.push('<p>' + i18n('Boxes.Calculator.AvailableFP') + ': <strong class="fp-storage">' + HTML.Format(StrategyPoints.AvailableFP) + '</strong></p>');

		h.push('</div>');

		h.push('<div class="dark-bg costFactorWrapper">');

		h.push('<div>');

		// Zusätzliche Buttons für die Standard Prozente
		let own_arc = '<button class="btn btn-default btn-toggle-arc" data-value="' + MainParser.ArkBonus + '">' + MainParser.ArkBonus + '%</button>';

		// ... und korrekt einsortieren
		if (MainParser.ArkBonus < 85) {
			h.push(own_arc);
		}

		h.push('<button class="btn btn-default btn-toggle-arc" data-value="85">85%</button>');

		if (MainParser.ArkBonus > 85 && MainParser.ArkBonus < 90) {
			h.push(own_arc);
		}

		h.push('<button class="btn btn-default btn-toggle-arc" data-value="90">90%</button>');

		if (MainParser.ArkBonus > 90) {
			h.push(own_arc);
		}

		h.push('<br>');

		h.push('<span><strong>' + i18n('Boxes.Calculator.FriendlyInvestment') + '</strong> ' + '<input type="number" id="costFactor" step="0.1" min="12" max="200" value="' + Calculator.ForderBonus + '">%</span>');

		h.push('</div><div>');

		h.push(i18n('Boxes.Calculator.ArkBonus') + ': ' + MainParser.ArkBonus + '%<br>');
		h.push('<strong>' + i18n('Boxes.Calculator.Sniping') + '</strong><br>');

        h.push('</div>');

        h.push('</div>');

        // Tabelle zusammen fummeln
		h.push('<table style="width:100%"><tbody><tr>');
		h.push('<td><table id="costTableFordern" class="foe-table"></table></td>');
		h.push('<td><table id="costTableBPMeds" class="foe-table"></table></td>');
		h.push('<td><table id="costTableSnipen" class="foe-table"></table></td>');
		h.push('</tr></tbody></table>');

        // Wieviel fehlt noch bis zum leveln?
		let rest = (Calculator.CityMapEntity['state']['invested_forge_points'] === undefined ? Calculator.CityMapEntity['state']['forge_points_for_level_up'] : Calculator.CityMapEntity['state']['forge_points_for_level_up'] - Calculator.CityMapEntity['state']['invested_forge_points']);

		h.push('<div class="text-center" style="margin-top:5px;margin-bottom:5px;"><em>' + i18n('Boxes.Calculator.Up2LevelUp') + ': <span id="up-to-level-up" style="color:#FFB539">' + HTML.Format(rest) + '</span> ' + i18n('Boxes.Calculator.FP') + '</em></div>');

		h.push(Calculator.GetRecurringQuestsLine());

        // in die bereits vorhandene Box drücken
        $('#costCalculator').find('#costCalculatorBody').html(h.join(''));

        // Stufe ist noch nicht freigeschaltet
		if (Calculator.CityMapEntity['level'] === Calculator.CityMapEntity['max_level']) {
            $('#costCalculator').find('#costCalculatorBody').append($('<div />').addClass('lg-not-possible').attr('data-text', i18n('Boxes.Calculator.LGNotOpen')));

		}

		// es fehlt eine Straßenanbindung
		else if (Calculator.CityMapEntity['connected'] === undefined) {
            $('#costCalculator').find('#costCalculatorBody').append($('<div />').addClass('lg-not-possible').attr('data-text', i18n('Boxes.Calculator.LGNotConnected')));
        }

        Calculator.CalcBody();
	},


	/**
	 * Zeile für Schleifenquests generieren
	 * *
	 * */
	GetRecurringQuestsLine: () => {
		let h = [];

		// Schleifenquest für "Benutze FP" suchen
		for (let Quest of MainParser.Quests) {
			if (Quest.questGiver.id === 'scientist' && Quest.type === 'generic' && Quest.abortable === true) {
				for (let cond of Quest.successConditions) {
					let CurrentProgress = cond.currentProgress !== undefined ? cond.currentProgress : 0;
					let MaxProgress = cond.maxProgress;
					if (CurrentEraID <= 3 || MaxProgress > 20) { // Unterscheidung Buyquests von UseQuests: Bronze/Eiszeit haben nur UseQuests, Rest hat Anzahl immer >15, Buyquests immer <=15
						let RecurringQuestString;
						if (MaxProgress - CurrentProgress !== 0) {
							RecurringQuestString = HTML.Format(MaxProgress - CurrentProgress) + i18n('Boxes.Calculator.FP');
						}
						else {
							RecurringQuestString = i18n('Boxes.Calculator.Done');
						}

						h.push('<div class="text-center" style="margin-top:5px;margin-bottom:5px;"><em>' + i18n('Boxes.Calculator.ActiveRecurringQuest') + ' <span id="recurringquests" style="color:#FFB539">' + RecurringQuestString + '</span></em></div>');
					}
				}
			}
		}

		return h.join();
	},


	/**
	 * Der Tabellen-Körper mit allen Funktionen
	 *
	 */
	CalcBody: ()=> {
		let hFordern = [],
			hBPMeds = [],
			hSnipen = [],
			BestKurs = 999999,
			BestKursNettoFP = 0,
			BestKursEinsatz = 999999,
			arc = 1 + (MainParser.ArkBonus / 100),
			ForderArc = 1 + (Calculator.ForderBonus / 100);

        let EigenPos,
            EigenBetrag = 0;

        // Ränge durchsteppen, Suche nach Eigeneinzahlung
		for (let i = 0; i < Calculator.Rankings.length;i++) {
			if (Calculator.Rankings[i]['player']['player_id'] !== undefined && Calculator.Rankings[i]['player']['player_id'] === ExtPlayerID) {
                EigenPos = i;
				EigenBetrag = (isNaN(parseInt(Calculator.Rankings[i]['forge_points']))) ? 0 : parseInt(Calculator.Rankings[i]['forge_points']);
                break;
            }
		}

		let ForderStates = [],
			SnipeStates = [],
			FPNettoRewards = [],
			FPRewards = [],
			BPRewards = [],
			MedalRewards = [],
			ForderFPRewards = [],
			ForderRankCosts = [],
			SnipeRankCosts = [],
			Einzahlungen = [],
			BestGewinn = -999999,
			SnipeLastRankCost = undefined;

		for (let i = 0; i < Calculator.Rankings.length; i++) {
			let Rank,
				CurrentFP,
				TotalFP,
				RestFP,
				IsSelf = false;

			if (Calculator.Rankings[i]['rank'] === undefined || Calculator.Rankings[i]['rank'] === -1) {
				continue;
			}
			else {
				Rank = Calculator.Rankings[i]['rank'] - 1;
			}

			if (Calculator.Rankings[i]['reward'] === undefined) break; // Ende der Belohnungsränge => raus

			ForderStates[Rank] = undefined; // NotPossible / WorseProfit / Self / NegativeProfit / LevelWarning / Profit
			SnipeStates[Rank] = undefined; // NotPossible / WorseProfit / Self / NegativeProfit / LevelWarning / Profit
			FPNettoRewards[Rank] = 0;
			FPRewards[Rank] = 0;
			BPRewards[Rank] = 0;
			MedalRewards[Rank] = 0;
			ForderFPRewards[Rank] = 0;
			ForderRankCosts[Rank] = undefined;
			SnipeRankCosts[Rank] = undefined;
			Einzahlungen[Rank] = 0;

			if (Calculator.Rankings[i]['reward']['strategy_point_amount'] !== undefined)
				FPNettoRewards[Rank] = Math.round(Calculator.Rankings[i]['reward']['strategy_point_amount']);

			if (Calculator.Rankings[i]['reward']['blueprints'] !== undefined)
				BPRewards[Rank] = Math.round(Calculator.Rankings[i]['reward']['blueprints']);

			if (Calculator.Rankings[i]['reward']['resources']['medals'] !== undefined)
				MedalRewards[Rank] = Math.round(Calculator.Rankings[i]['reward']['resources']['medals']);

			FPRewards[Rank] = Math.round(FPNettoRewards[Rank] * arc);
			BPRewards[Rank] = Math.round(BPRewards[Rank] * arc);
			MedalRewards[Rank] = Math.round(MedalRewards[Rank] * arc);
			ForderFPRewards[Rank] = Math.round(FPNettoRewards[Rank] * ForderArc);

			if (EigenPos !== undefined && i > EigenPos) {
				ForderStates[Rank] = 'NotPossible';
				SnipeStates[Rank] = 'NotPossible';
				continue;
			}

			if (Calculator.Rankings[i]['player']['player_id'] !== undefined && Calculator.Rankings[i]['player']['player_id'] === ExtPlayerID)
				IsSelf = true;

			if (Calculator.Rankings[i]['forge_points'] !== undefined)
				Einzahlungen[Rank] = Calculator.Rankings[i]['forge_points'];

			CurrentFP = (Calculator.CityMapEntity['state']['invested_forge_points'] !== undefined ? Calculator.CityMapEntity['state']['invested_forge_points'] : 0) - EigenBetrag;
			TotalFP = Calculator.CityMapEntity['state']['forge_points_for_level_up'];
			RestFP = TotalFP - CurrentFP;

			if (IsSelf) {
				ForderStates[Rank] = 'Self';
				SnipeStates[Rank] = 'Self';

				for (let j = i + 1; j < Calculator.Rankings.length; j++) {
					//Spieler selbst oder Spieler gelöscht => nächsten Rang überprüfen
					if (Calculator.Rankings[j]['rank'] !== undefined && Calculator.Rankings[j]['rank'] !== -1 && Calculator.Rankings[j]['forge_points'] !== undefined) {
						SnipeRankCosts[Rank] = Math.round((Calculator.Rankings[j]['forge_points'] + RestFP) / 2);
						break;
					}
				}

				if (SnipeRankCosts[Rank] === undefined)
					SnipeRankCosts[Rank] = Math.round(RestFP / 2); // Keine Einzahlung gefunden => Rest / 2

				ForderRankCosts[Rank] = Math.max(ForderFPRewards[Rank], SnipeRankCosts[Rank]);
			}
			else {
				SnipeRankCosts[Rank] = Math.round((Einzahlungen[Rank] + RestFP) / 2);
				ForderRankCosts[Rank] = Math.max(ForderFPRewards[Rank], SnipeRankCosts[Rank]);
				ForderRankCosts[Rank] = Math.min(ForderRankCosts[Rank], RestFP);

				let ExitLoop = false;

				// Platz schon vergeben
				if (SnipeRankCosts[Rank] <= Einzahlungen[Rank]) {
					ForderRankCosts[Rank] = 0;
					ForderStates[Rank] = 'NotPossible';
					ExitLoop = true;
				}
				else {
					if (ForderRankCosts[Rank] === RestFP) {
						ForderStates[Rank] = 'LevelWarning';
					}
					else if (ForderRankCosts[Rank] <= ForderFPRewards[Rank]) {
						ForderStates[Rank] = 'Profit';
					}
					else {
						ForderStates[Rank] = 'NegativeProfit';
					}
				}

				// Platz schon vergeben
				if (SnipeRankCosts[Rank] <= Einzahlungen[Rank]) {
					SnipeRankCosts[Rank] = 0;
					SnipeStates[Rank] = 'NotPossible';
					ExitLoop = true;
				}
				else {
					if (SnipeRankCosts[Rank] === RestFP) {
						SnipeStates[Rank] = 'LevelWarning';
					}
					else if (FPRewards[Rank] < SnipeRankCosts[Rank]) {
						SnipeStates[Rank] = 'NegativeProfit';
					}
					else {
						SnipeStates[Rank] = 'Profit';
					}
				}

				if (ExitLoop)
					continue;

				// Selbe Kosten wie vorheriger Rang => nicht belegbar
				if (SnipeLastRankCost !== undefined && SnipeRankCosts[Rank] === SnipeLastRankCost) {
					ForderStates[Rank] = 'NotPossible';
					ForderRankCosts[Rank] = undefined;
					SnipeStates[Rank] = 'NotPossible';
					SnipeRankCosts[Rank] = undefined;
					ExitLoop = true;
				}
				else {
					SnipeLastRankCost = SnipeRankCosts[Rank];
				}

				if (ExitLoop)
					continue;

				let CurrentGewinn = FPRewards[Rank] - SnipeRankCosts[Rank];
				if (CurrentGewinn > BestGewinn) {
					if (SnipeStates[Rank] !== 'LevelWarning')
						BestGewinn = CurrentGewinn;
				}
				else {
					SnipeStates[Rank] = 'WorseProfit';
					ForderStates[Rank] = 'WorseProfit';
				}
			}
		}

		// Tabellen ausgeben
		hFordern.push('<thead>' +
			'<th>#</th>' +
			'<th>' + i18n('Boxes.Calculator.Commitment') + '</th>' +
			'<th>' + i18n('Boxes.Calculator.Profit') + '</th>' +
			'</thead>');

		hBPMeds.push('<thead>' +
			'<th>' + i18n('Boxes.Calculator.BPs') + '</th>' +
			'<th>' + i18n('Boxes.Calculator.Meds') + '</th>' +
			'</thead>');

		hSnipen.push('<thead>' +
			'<th>' + i18n('Boxes.Calculator.Commitment') + '</th>' +
			'<th>' + i18n('Boxes.Calculator.Profit') + '</th>' +
			'<th>' + i18n('Boxes.Calculator.Rate') + '</th>' +
			'</thead>');

		for (let Rank = 0; Rank < ForderRankCosts.length; Rank++) {
			let ForderCosts = (ForderStates[Rank] === 'Self' ? Einzahlungen[Rank] : ForderFPRewards[Rank]),
				SnipeCosts = (SnipeStates[Rank] === 'Self' ? Einzahlungen[Rank] : SnipeRankCosts[Rank]);

			let ForderGewinn = FPRewards[Rank] - ForderCosts,
				ForderRankDiff = (ForderRankCosts[Rank] !== undefined ? ForderRankCosts[Rank] - ForderFPRewards[Rank] : 0),
				SnipeGewinn = FPRewards[Rank] - SnipeCosts,
				Kurs = (FPNettoRewards[Rank] > 0 ? Math.round(SnipeCosts / FPNettoRewards[Rank] * 1000)/10 : 0);

			if (SnipeStates[Rank] !== 'Self' && Kurs > 0) {
				if (Kurs < BestKurs) {
					BestKurs = Kurs;
					BestKursNettoFP = FPNettoRewards[Rank];
					BestKursEinsatz = SnipeRankCosts[Rank];
				}
			}


			// Fördern

			let RowClass,
				RankClass,
				RankText = Rank + 1, //Default: Rangnummer
				RankTooltip = [],

				EinsatzClass = (ForderFPRewards[Rank] > StrategyPoints.AvailableFP ? 'error' : ''), //Default: rot wenn Vorrat nicht ausreichend, sonst gelb
				EinsatzText = HTML.Format(ForderFPRewards[Rank]) + Calculator.FormatForderRankDiff(ForderRankDiff), //Default: Einsatz + ForderRankDiff
				EinsatzTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTForderCosts'), { 'nettoreward': FPNettoRewards[Rank], 'forderfactor': (100 + Calculator.ForderBonus), 'costs': ForderFPRewards[Rank] })],

				GewinnClass = (ForderGewinn >= 0 ? 'success' : 'error'), //Default: Grün wenn >= 0 sonst rot
				GewinnText = HTML.Format(ForderGewinn), //Default: Gewinn
				GewinnTooltip,

				KursClass,
				KursText,
				KursTooltip = [];

			if (ForderFPRewards[Rank] > StrategyPoints.AvailableFP) {
				EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTForderFPStockLow'), { 'fpstock': StrategyPoints.AvailableFP, 'costs': ForderFPRewards[Rank], 'tooless': (ForderFPRewards[Rank] - StrategyPoints.AvailableFP) }));
			}

			if (ForderGewinn > 0) {
				GewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTProfit'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'costs': ForderFPRewards[Rank], 'profit': ForderGewinn })]
			}
			else {
				GewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTLoss'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'costs': ForderFPRewards[Rank], 'loss': 0-ForderGewinn })]
			}

			if (ForderStates[Rank] === 'Self') {
				RowClass = 'info-row';

				RankClass = 'info';

				if (Einzahlungen[Rank] < ForderFPRewards[Rank]) {
					EinsatzClass = 'error';
					EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTPaidTooLess'), { 'paid': Einzahlungen[Rank], 'topay': ForderFPRewards[Rank], 'tooless': ForderFPRewards[Rank] - Einzahlungen[Rank] }));
				}
				else if (Einzahlungen[Rank] > ForderFPRewards[Rank]) {
					EinsatzClass = 'warning';
					EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTPaidTooMuch'), { 'paid': Einzahlungen[Rank], 'topay': ForderFPRewards[Rank], 'toomuch': Einzahlungen[Rank] - ForderFPRewards[Rank]}));
				}
				else {
					EinsatzClass = 'info';
				}

				EinsatzText = HTML.Format(Einzahlungen[Rank]);
				if (Einzahlungen[Rank] !== ForderFPRewards[Rank]) {
					EinsatzText += '/' + HTML.Format(ForderFPRewards[Rank]);
				}
				EinsatzText += Calculator.FormatForderRankDiff(ForderRankDiff);


				if (ForderRankDiff > 0 && Einzahlungen[Rank] < ForderRankCosts[Rank]) {
					EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTForderNegativeProfit'), { 'fpcount': ForderRankDiff, 'totalfp': ForderRankCosts[Rank] }));
				}
				else if (ForderRankDiff < 0) {
					EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTLevelWarning'), { 'fpcount': (0 - ForderRankDiff), 'totalfp': ForderRankCosts[Rank] }));
				}

				if (ForderGewinn > 0) {
					GewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTProfitSelf'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'paid': Einzahlungen[Rank], 'profit': ForderGewinn })]
				}
				else {
					GewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTLossSelf'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'paid': Einzahlungen[Rank], 'loss': 0 - ForderGewinn })]
				}

				GewinnClass = 'info';
			}
			else if (ForderStates[Rank] === 'NegativeProfit') {
				RowClass = 'bg-red';

				RankClass = 'error';

				EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTForderNegativeProfit'), { 'fpcount': ForderRankDiff, 'totalfp': ForderRankCosts[Rank] }));

				GewinnClass = 'error';
			}
			else if (ForderStates[Rank] === 'LevelWarning') {
				RowClass = 'bg-yellow';

				RankClass = '';

				EinsatzTooltip.push(i18n('Boxes.Calculator.LevelWarning'));
				if (ForderRankDiff < 0) {
					EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTLevelWarning'), { 'fpcount': (0 - ForderRankDiff), 'totalfp': ForderRankCosts[Rank] }));
				}
			}
			else if (ForderStates[Rank] === 'Profit') {
				RowClass = 'bg-green';

				RankClass = 'success';
			}
			else {
				RowClass = 'text-grey';

				RankClass = '';

				EinsatzText = HTML.Format(ForderFPRewards[Rank]);

				GewinnText = '-';
				GewinnTooltip = [];
			}

			hFordern.push('<tr class="' + RowClass + '">');
			hFordern.push('<td class="text-center"><strong class="' + RankClass + ' td-tooltip" title="' + RankTooltip.join('<br>') + '">' + RankText + '</strong></td>');
			hFordern.push('<td class="text-center"><strong class="' + EinsatzClass + ' td-tooltip" title="' + EinsatzTooltip.join('<br>') + '">' + EinsatzText + '</strong></td>');
			hFordern.push('<td class="text-center"><strong class="' + GewinnClass + ' td-tooltip" title="' + GewinnTooltip.join('<br>') + '">' + GewinnText + '</strong></td>');
			hFordern.push('</tr>');


			//else if (ForderStates[Rank] === 'LevelWarning') {
			//	let ToolTip = ;
			//}



			// BP+Meds

			RowClass = '';

			if (ForderStates[Rank] === 'NotPossible' && SnipeStates[Rank] === 'NotPossible') {
				RowClass = 'text-grey';
			}
			else if (ForderStates[Rank] === 'WorseProfit' && SnipeStates[Rank] === 'WorseProfit') {
				RowClass = 'text-grey';
			}
			else if (ForderStates[Rank] === 'Self' && SnipeStates[Rank] === 'Self') {
				RowClass = 'info-row';
			}
			else if (ForderStates[Rank] === 'NegativeProfit' && SnipeStates[Rank] === 'NegativeProfit') {
				RowClass = 'bg-red';
			}
			else if (ForderStates[Rank] === 'LevelWarning' && SnipeStates[Rank] === 'LevelWarning') {
				RowClass = 'bg-yellow';
			}
			else if (ForderStates[Rank] === 'Profit' && SnipeStates[Rank] === 'Profit') {
				RowClass = 'bg-green';
			}

			hBPMeds.push('<tr class="' + RowClass + '">');
			hBPMeds.push('<td class="text-center">' + HTML.Format(BPRewards[Rank]) + '</td>');
			hBPMeds.push('<td class="text-center">' + HTML.Format(MedalRewards[Rank]) + '</td>');
			hBPMeds.push('</tr>');


			// Snipen

			EinsatzClass = (SnipeRankCosts[Rank] > StrategyPoints.AvailableFP ? 'error' : ''); //Default: rot wenn Vorrat nicht ausreichend, sonst gelb
			EinsatzText = HTML.Format(SnipeRankCosts[Rank]) //Default: Einsatz
			EinsatzTooltip = [];

			GewinnClass = (SnipeGewinn >= 0 ? 'success' : 'error'); //Default: Grün wenn >= 0 sonst rot
			GewinnText = HTML.Format(SnipeGewinn); //Default: Gewinn
			GewinnTooltip = [];

			KursClass = (SnipeGewinn >= 0 ? 'success' : 'error'); //Default: Grün wenn Gewinn sonst rot
			KursText = (SnipeGewinn >= 0 ? Calculator.FormatKurs(Kurs) : '-'); //Default: Kurs anzeigen bei Gewinn
			KursTooltip = [];

			if (SnipeRankCosts[Rank] > StrategyPoints.AvailableFP) {
				EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTSnipeFPStockLow'), { 'fpstock': StrategyPoints.AvailableFP, 'costs': SnipeRankCosts[Rank], 'tooless': (SnipeRankCosts[Rank] - StrategyPoints.AvailableFP) }));
			}

			if (SnipeGewinn > 0) {
				GewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTProfit'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'costs': SnipeCosts, 'profit': SnipeGewinn })]
			}
			else {
				GewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTLoss'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'costs': SnipeCosts, 'loss': 0-SnipeGewinn })]
			}

			if (SnipeStates[Rank] === 'Self') {
				RowClass = 'info-row';

				RankClass = 'info';

				if (Einzahlungen[Rank] < SnipeRankCosts[Rank]) {
					EinsatzClass = 'error';
					EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTPaidTooLess'), { 'paid': Einzahlungen[Rank], 'topay': SnipeRankCosts[Rank], 'tooless': SnipeRankCosts[Rank] - Einzahlungen[Rank] }));
				}
				else {
					EinsatzClass = 'info';
				}

				EinsatzText = HTML.Format(Einzahlungen[Rank]);
				if (Einzahlungen[Rank] < SnipeRankCosts[Rank]) {
					EinsatzText += '/' + HTML.Format(SnipeRankCosts[Rank]);
				}

				GewinnClass = 'info';
				if (SnipeGewinn > 0) {
					GewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTProfitSelf'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'paid': SnipeCosts, 'profit': SnipeGewinn })]
				}
				else {
					GewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTLossSelf'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'paid': SnipeCosts, 'loss': 0 - SnipeGewinn })]
				}

				KursClass = 'info';
				KursText = Calculator.FormatKurs(Kurs);
				KursTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTRate'), { 'costs': Einzahlungen[Rank], 'nettoreward': FPNettoRewards[Rank], 'rate': Kurs }));
			}
			else if (SnipeStates[Rank] === 'NegativeProfit') {
				RowClass = 'bg-red';
			}
			else if (SnipeStates[Rank] === 'LevelWarning') {
				RowClass = 'bg-yellow';

				EinsatzTooltip.push(i18n('Boxes.Calculator.LevelWarning'));
			}
			else if (SnipeStates[Rank] === 'Profit') {
				RowClass = 'bg-green';

				KursTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTRate'), { 'costs': SnipeRankCosts[Rank], 'nettoreward': FPNettoRewards[Rank], 'rate': Kurs }));

				Calculator.PlaySound();
			}
			else { // NotPossible/WorseProfit
				RowClass = 'text-grey';

				EinsatzText = '-';

				GewinnText = '-';
				GewinnTooltip = [];

				KursText = '-';
			}

			hSnipen.push('<tr class="' + RowClass + '">');
			hSnipen.push('<td class="text-center"><strong class="' + EinsatzClass + ' td-tooltip" title="' + EinsatzTooltip.join('<br>') + '">' + EinsatzText + '</strong></td>');
			hSnipen.push('<td class="text-center"><strong class="' + GewinnClass + ' td-tooltip" title="' + GewinnTooltip.join('<br>') + '">' + GewinnText + '</strong></td>');
			hSnipen.push('<td class="text-center"><strong class="' + KursClass + ' td-tooltip" title="' + KursTooltip.join('<br>') + '">' + KursText + '</strong></td>');
			hSnipen.push('</tr>');
		}

		$('#costTableFordern').html(hFordern.join(''));
		$('#costTableBPMeds').html(hBPMeds.join(''));
		$('#costTableSnipen').html(hSnipen.join(''));

		Calculator.RefreshGreatBuildingsDB({
			playerId: Calculator.CityMapEntity['player_id'],
			name: Calculator.CityMapEntity['cityentity_id'],
			level: Calculator.CityMapEntity['level'],
			currentFp: Calculator.CityMapEntity['state']['invested_forge_points'],
			bestRateNettoFp: BestKursNettoFP,
			bestRateCosts: BestKursEinsatz
		});

		$('.td-tooltip').tooltip({
			html: true,
			container: '#costCalculator'
		});
	},


	/**
	 * Aktualisiert die GBs in der IndexDB
	 *
	 * */
	RefreshGreatBuildingsDB: async(GreatBuilding) => {
		await IndexDB.addUserFromPlayerDictIfNotExists(GreatBuilding['playerId'], true);

		let CurrentGB = await IndexDB.db.greatbuildings
			.where({ playerId: GreatBuilding['playerId'], name: GreatBuilding['name'] })
			.first();

		if (CurrentGB === undefined) {
			await IndexDB.db.greatbuildings.add({
				playerId: GreatBuilding['playerId'],
				name: GreatBuilding['name'],
				level: GreatBuilding['level'],
				currentFp: GreatBuilding['currentFp'],
				bestRateNettoFp: GreatBuilding['bestRateNettoFp'],
				bestRateCosts: GreatBuilding['bestRateCosts'],
				date: new Date()
			});
		}
		else {
			await IndexDB.db.greatbuildings.update(CurrentGB.id, {
				level: GreatBuilding['level'],
				currentFp: GreatBuilding['currentFp'],
				bestRateNettoFp: GreatBuilding['bestRateNettoFp'],
				bestRateCosts: GreatBuilding['bestRateCosts'],
				date: new Date()
			});
		}
		/* Ende Neuer Code: */
    },


	/**
	 * Formatiert den Kurs
	 * *
	 * * @param Kurs
	 * */
	FormatKurs: (Kurs) => {
		if (Kurs === 0) {
			return '-';
		}
		else {
			return HTML.Format(Kurs) + '%';
		}
	},


	/**
	 * Formatiert die +/- Anzeige neben dem Ertrag (falls vorhanden)
	 * *
	 * *@param ForderRankDiff
	 * */
	FormatForderRankDiff: (ForderRankDiff) => {
		if (ForderRankDiff < 0) {
			return ' <small class="text-success">' + HTML.Format(ForderRankDiff) + '</small>';
		}
		else if (ForderRankDiff === 0) {
			return '';
		}
		else { // > 0
			return ' <small class="error">+' + HTML.Format(ForderRankDiff) + '</small>';
		}
	},


	/**
	 * Übersicht der LGs scannen
	 *
	 * @param DisableAudio
	 */
    ShowOverview: async(DisableAudio)=> {

		let arc = ((parseFloat(MainParser.ArkBonus) + 100) / 100)

		// nix drin, raus
		if (Calculator.Overview === undefined)
		{
			return;
		}

		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if( $('#LGOverviewBox').length === 0 )
        {
            let spk = localStorage.getItem('CalculatorOverviewTone');

            if (spk === null) {
                localStorage.setItem('CalculatorOverviewTone', 'deactivated');
                Calculator.PlayOverviewInfoSound = false;

            } else {
                Calculator.PlayOverviewInfoSound = (spk !== 'deactivated');
            }

			HTML.Box({
				'id': 'LGOverviewBox',
				'title': i18n('Boxes.LGOverviewBox.Title'),
				'auto_close': true,
				'dragdrop': true,
				'speaker': 'CalculatorOverviewTone'
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('calculator');

			$('#LGOverviewBox').on('click', '#CalculatorOverviewTone', function () {

				let disabled = $(this).hasClass('deactivated');

				localStorage.setItem('CalculatorOverviewTone', (disabled ? '' : 'deactivated'));
				Calculator.PlayOverviewInfoSound = !!disabled;

				if (disabled === true) {
					$('#CalculatorOverviewTone').removeClass('deactivated');
				} else {
					$('#CalculatorOverviewTone').addClass('deactivated');
				}
			});
		}


		let h = [],
			PlayerName = Calculator.Overview['0']['player']['name'];

		h.push('<div class="text-center dark-bg" style="padding:5px 0 3px;">');

		h.push('<p class="head-bar">' +
				'<strong>' + PlayerName + ' </strong>' +
				'<span class="color-description">?' +
					'<span>' +
						'<span style="color:#FFB539">' + i18n('Boxes.LGOverviewBox.Tooltip.FoundNew') + '</span>' +
						'<span style="color:#29b206">' + i18n('Boxes.LGOverviewBox.Tooltip.FoundAgain') + '</span>' +
						'<span style="color:#FF6000">' + i18n('Boxes.LGOverviewBox.Tooltip.NoPayment') + '</span>' +
					'</span>' +
				'</span>' +
			'</p>');

		h.push('</div>');
		h.push('<table id="OverviewTable" class="foe-table">');

		h.push('<thead>' +
			'<tr>' +
				'<th>' + i18n('Boxes.LGOverviewBox.Building') + '</th>' +
				'<th class="text-center">' + i18n('Boxes.LGOverviewBox.Level') + '</th>' +
				'<th class="text-center">' + i18n('Boxes.LGOverviewBox.PaidTotal') + '</th>' +
				'<th class="text-center">' + i18n('Boxes.LGOverviewBox.Profit') + '</th>' +
				'<th class="text-center">' + i18n('Boxes.LGOverviewBox.Rate') + '</th>' +
			'</tr>' +
		'</thead>');

		let PlayAudio = false,
			LGFound = false;

		// alle LGs der Übersicht durchsteppen
		for (let i in Calculator.Overview)
		{
			if (Calculator.Overview.hasOwnProperty(i))
			{
				let PlayerID = Calculator.Overview[i]['player']['player_id'],
					EntityID = Calculator.Overview[i]['city_entity_id'],
					GBName = Calculator.Overview[i]['name'],
					GBLevel = Calculator.Overview[i]['level'],
					CurrentProgress = Calculator.Overview[i]['current_progress'],
					MaxProgress = Calculator.Overview[i]['max_progress'],
					Rank = Calculator.Overview[i]['rank'];

				let Gewinn = undefined,
					BestKurs = undefined,
					StrongClass;

				let CurrentGB = await IndexDB.db.greatbuildings
					.where({ playerId: PlayerID, name: EntityID })
					.first();

				// LG gefunden mit selbem Level und investierten FP => Wert bekannt
				if (CurrentGB != undefined && CurrentGB['level'] === GBLevel && CurrentGB['currentFp'] == CurrentProgress) {
					BestKursNettoFP = CurrentGB['bestRateNettoFp'];
					BestKursEinsatz = CurrentGB['bestRateCosts'];
					BestKurs = Math.round(BestKursEinsatz / BestKursNettoFP * 1000) / 10;
					Gewinn = Math.round(BestKursNettoFP * arc) - BestKursEinsatz;
                }

				let EraName = GreatBuildings.GetEraName(EntityID);

				if (CurrentProgress === undefined)
				{
					CurrentProgress = 0;
				}

				let Era = Technologies.Eras[EraName];
				let P1 = 0;
				if (GreatBuildings.Rewards[Era] && GreatBuildings.Rewards[Era][GBLevel]) {
					P1 = GreatBuildings.Rewards[Era][GBLevel];
                }

				if (Rank === undefined && P1 * arc >= (MaxProgress - CurrentProgress) / 2) // Noch nicht eingezahlt und Gewinn theoretisch noch möglich
				{
					if (Gewinn === undefined || Gewinn >= 0)
					{
						LGFound = true;
						let GewinnString = undefined,
							KursString = undefined;

						if (CurrentProgress === 0)
						{
							StrongClass = ' class="warning"'; // Möglicherweise nicht freigeschaltet
							GewinnString = HTML.Format(Math.round(P1 * arc) - Math.ceil((MaxProgress - CurrentProgress) / 2));
							KursString = Calculator.FormatKurs(Math.round(MaxProgress / P1 / 2 * 1000) / 10);
						}
						else if (Gewinn === undefined)
						{
							StrongClass = '';
							PlayAudio = true;
							GewinnString = '???';
							KursString = '???%';
						}
						else
						{
							StrongClass = ' class="success"';
							PlayAudio = true;
							GewinnString = HTML.Format(Gewinn);
							KursString = Calculator.FormatKurs(BestKurs);
						}

						h.push('<tr>');
						h.push('<td><strong' + StrongClass + '>' + (i-0+1) + ': ' + GBName + '</strong></td>');
						h.push('<td class="text-center"><strong' + StrongClass + '>' + GBLevel + '</strong></td>');
						h.push('<td class="text-center"><strong' + StrongClass + '>' + HTML.Format(CurrentProgress) + ' / ' + HTML.Format(MaxProgress) + '</strong></td>');
						h.push('<td class="text-center"><strong' + StrongClass + '>' + GewinnString + '</strong></td>');
						h.push('<td class="text-center"><strong' + StrongClass + '>' + KursString + '</strong></td>');
						h.push('</tr>');
					}
				}
			}
		}

		h.push('</table>');

		// Gibt was zu holen
		if (LGFound)
		{
            if (PlayAudio && !DisableAudio)
			{
				Calculator.PlayOverviewSound();
			}
		}

		// gibt nichts zu holen
		else {
			h = [];

			h.push('<div class="text-center yellow-strong nothing-to-get">' + HTML.i18nReplacer(
				i18n('Boxes.LGOverviewBox.NothingToGet'),
				{
					'player' : PlayerName
				}
			) + '</div>');
		}

        $('#LGOverviewBox').find('#LGOverviewBoxBody').html(h.join(''));
	},


	/**
	 * Spielt einen Sound im Calculator ab
	 *
	 * @returns {string}
	 */
    PlaySound: () => {
        if (Calculator.PlayInfoSound) {
            Calculator.SoundFile.play();
        }
    },


    /**
    * Spielt einen Sound in der Overview ab
    *
    * @returns {string}
    */
    PlayOverviewSound: () => {
        if (Calculator.PlayOverviewInfoSound) {
            Calculator.SoundFile.play();
        }
    },
};
