// Theme initialization (loaded in <head> to prevent flash of unstyled content)
(function () {
    const THEME_STORAGE_KEY = "zone_vault_live_theme";
    try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        const theme = saved === "light" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", theme);
    } catch (e) {
        document.documentElement.setAttribute("data-theme", "dark");
    }
})();
