import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from kbo_season import classify, parse_schedule_html, parse_standings_html, verified_standings, TEAM_KO


class KboSeasonTests(unittest.TestCase):
    def test_multiword_types(self):
        for text, expected in [('Regular', ('REGULAR',None,None)), ('Preseason', ('PRESEASON',None,None)),
                               ('Wild card game1',('POSTSEASON','WC',1)), ('Semi-playoff game3',('POSTSEASON','준PO',3)),
                               ('Playoff final game5',('POSTSEASON','PO',5)), ('Korean Series game7',('POSTSEASON','KS',7))]:
            self.assertEqual(classify(text),expected)

    def test_cells_and_rowspan_preserve_type_and_zero_scores(self):
        html='''<span>2026.10</span><table><tr><td title="DATE" rowspan="2">10.15(THU)</td>
          <td title="TYPE" rowspan="2">Korean Series game1</td><td class="TIME">18:30</td>
          <td title="GAME">SAMSUNG</td><td title="GAME">0:0</td><td title="GAME">KT</td><td class="LOCATION">SUWON</td></tr>
          <tr><td class="TIME">18:30</td><td title="GAME">KT</td><td title="GAME">:</td><td title="GAME">SAMSUNG</td><td class="LOCATION">DAEGU</td></tr>
          <tr><td title="DATE">10.16(FRI)</td><td title="TYPE">Playoff final game5</td><td class="TIME">18:30</td>
          <td title="GAME">KIA</td><td title="GAME">:</td><td title="GAME">SAMSUNG</td><td class="ETC">RAIN</td></tr></table>'''
        games,year,month=parse_schedule_html(html)
        self.assertEqual((year,month),(2026,10))
        self.assertEqual(len(games),3)
        self.assertEqual(games[0]['status'],'FINISHED')
        self.assertEqual(games[0]['away_score'],0)
        self.assertEqual(games[1]['postseason_round'],'KS')
        self.assertEqual(games[1]['status'],'SCHEDULED')
        self.assertIsNone(games[1]['away_score'])
        self.assertEqual(games[2]['status'],'POSTPONED')
        self.assertEqual(games[2]['postseason_round'],'PO')

    def test_missing_or_wrong_year_is_rejected(self):
        with self.assertRaises(ValueError):
            parse_schedule_html('<table></table>')
        with self.assertRaises(ValueError):
            parse_standings_html('<input name="y" id="inputYear" value="2025">',2026)

    def test_partial_standings_do_not_replace_archive(self):
        with self.assertRaises(ValueError):
            parse_standings_html('<input name="y" id="inputYear" value="2026">',2026)

    def test_historical_table_is_cross_checked_against_720_games(self):
        teams=list(TEAM_KO.values())
        games=[]
        for pair in range(5):
            for n in range(144):
                games.append({'source_key':f'{pair}-{n}','season_type':'REGULAR','status':'FINISHED',
                              'away_team':teams[pair*2],'home_team':teams[pair*2+1],
                              'away_score':2 if n<90+pair else 0,'home_score':1})
        wrong=[{'team':team,'g':144,'w':72,'l':72,'d':0} for team in teams]
        rows,method=verified_standings(wrong,games)
        self.assertEqual(method,'official_results_verified')
        self.assertEqual(rows[0]['w'],94)
        self.assertEqual(len(rows),10)
        self.assertEqual(sum(r['g'] for r in rows),1440)


if __name__ == '__main__':
    unittest.main()
