// Shared by the server layout and the client theme code (no "use client",
// so the server can read the real string).
export const THEME_KEY = "ride-buddy-theme";

// Runs inline in <head> before anything paints, so there's no flash of the
// wrong theme. Kept tiny and dependency-free on purpose.
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",d?"#121314":"#f6f3ee");}catch(e){document.documentElement.dataset.theme="light";}})();`;
