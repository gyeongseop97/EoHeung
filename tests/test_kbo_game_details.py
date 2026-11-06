import copy
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from kbo_game_details import parse_game,walkoff

FIXTURE=json.loads((Path(__file__).parent/"fixtures"/"game-details-20261101.json").read_text(encoding="utf-8"))

def scoreboard(away,home,a,h):
    return {"T_SCORE_CN":away,"B_SCORE_CN":home,"table2":{"rows":[{"row":[{"Text":str(x)} for x in a]},{"row":[{"Text":str(x)} for x in h]}]}}

class GameDetailsTests(unittest.TestCase):
    def test_real_official_pitching_totals_and_non_walkoff_home_win(self):
        result=parse_game(**FIXTURE)
        self.assertEqual(result["gameId"],"20261101HTSS0")
        self.assertEqual(result["homeRuns"],0)
        self.assertEqual(result["strikeouts"],6)
        self.assertEqual(result["struckOut"],7)
        self.assertEqual(result["home_score"],6)
        self.assertFalse(result["walkoffWin"])

    def test_headers_can_move_without_swapping_hr_and_strikeouts(self):
        fixture=copy.deepcopy(FIXTURE)
        for pitcher in fixture["box"]["arrPitcher"]:
            data=pitcher["table"]
            data["headers"][0]["row"].reverse()
            for row in data["rows"]:row["row"].reverse()
        self.assertEqual(parse_game(**fixture)["strikeouts"],6)

    def test_missing_hr_column_does_not_become_zero(self):
        fixture=copy.deepcopy(FIXTURE)
        fixture["box"]["arrPitcher"][0]["table"]["headers"][0]["row"][11]["Text"]="unknown"
        with self.assertRaises(ValueError):parse_game(**fixture)

    def test_wrong_game_or_score_is_rejected(self):
        fixture=copy.deepcopy(FIXTURE);fixture["score"]["G_ID"]="different-game"
        with self.assertRaises(ValueError):parse_game(**fixture)
        fixture=copy.deepcopy(FIXTURE);fixture["score"]["B_SCORE_CN"]=99
        with self.assertRaises(ValueError):parse_game(**fixture)

    def test_walkoff_ninth_extra_inning_and_unplayed_ninth(self):
        self.assertTrue(walkoff(scoreboard(2,3,[0]*8+[2],[0]*8+["3X"])))
        self.assertTrue(walkoff(scoreboard(1,2,[0]*8+[1,0],[0]*8+[1,"1X"])))
        self.assertFalse(walkoff(scoreboard(1,3,[0]*8+[1],[3]+[0]*7+["X"])))
        self.assertFalse(walkoff(scoreboard(3,1,[0]*8+[3],[0]*8+[1])))

    def test_incomplete_or_unverifiable_innings_stay_unknown(self):
        self.assertIsNone(walkoff(scoreboard(1,3,[0]*8+[1],[0]*8+[2])))
        self.assertIsNone(walkoff(scoreboard(1,3,[1]+[0]*6,[3]+[0]*6)))

if __name__=="__main__":unittest.main()
