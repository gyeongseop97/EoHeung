Exit code: 0
Wall time: 0.8 seconds
Output:
(function () {
  "use strict";

  function improveDashboardControls() {
    var dashboard = document.getElementById("dashboard");
    if (!dashboard) return;

    dashboard.querySelectorAll(".metric.today-game-clickable").forEach(function (card) {
      if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "0");
      if (!card.hasAttribute("role")) card.setAttribute("role", "button");
      if (!card.hasAttribute("aria-label")) card.setAttribute("aria-label", "?ㅻ뒛 寃쎄린 ?곸꽭 蹂닿린");
      if (card.dataset.dashboardKeyboardReady === "1") return;

      card.dataset.dashboardKeyboardReady = "1";
      card.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        card.click();
      });
    });
  }

  function start() {
    improveDashboardControls();
    var dashboard = document.getElementById("dashboard");
    if (!dashboard || typeof MutationObserver === "undefined") return;
    new MutationObserver(improveDashboardControls).observe(dashboard, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

