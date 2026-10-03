# Town automatic progression and readable travel hints

User request: keep travel hints clear and continue every cleared town game automatically. The existing grade, subject, learning objective, question generation and game identities are unchanged. Routes: /town, five educational modes and six casual games, plus the shopping story.

Walking hints now occupy a solid dedicated row above the viewport. Successful results retain their reward display for 2.2 seconds of visible time, then call the existing next-stage/restart transition. Failure keeps manual retry; reward settlement is unchanged. Saved solved educational runs also continue, and level 20 continues into endless play. Leaving cancels the pending animation frame. Shopping rewards automatically lead to the next mission location.

Evidence: test_auto_advance.mjs covers one-shot, paused time and cancellation; progression browser verifies desktop/mobile level 19, 20 and endless rewards; feedback browser exercises all five educational modes with real movement; controls browser checks hints do not intersect vehicle buttons.
