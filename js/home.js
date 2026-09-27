(function () {
  const I = window.CMI18N;
  const applyLang = (code) => {
    const meta = I.langs.find((l) => l.code === code) || I.langs[0];
    const t = I.dict[code] || I.dict.en;
    document.documentElement.lang = meta.code;
    document.documentElement.dir = meta.dir;
    localStorage.setItem("cm-lang", code);
    document.querySelectorAll("[data-i]").forEach((el) => {
      const k = el.getAttribute("data-i");
      if (t[k]) el.textContent = t[k];
    });
    document.querySelectorAll("[data-ph]").forEach((el) => {
      const k = el.getAttribute("data-ph");
      if (t[k]) el.setAttribute("placeholder", t[k]);
    });
    const box = document.getElementById("region-links");
    if (box) {
      box.innerHTML = I.langs.map((l) => `<a href="${l.region}" rel="noopener noreferrer" hreflang="${l.hreflang}">${l.name}</a>`).join(" ");
    }
  };

  window.CM_setLang = applyLang;

  document.addEventListener("DOMContentLoaded", () => {
    applyLang(localStorage.getItem("cm-lang") || "en");
    document.getElementById("lang-toggle")?.addEventListener("click", () => {
      document.getElementById("lang-list")?.classList.toggle("open");
    });
    document.querySelectorAll("[data-lang]").forEach((btn) => {
      btn.addEventListener("click", () => applyLang(btn.getAttribute("data-lang")));
    });

    const forced = new URLSearchParams(location.search).get("month");
    const now = new Date();
    if (forced) {
      const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const i = names.findIndex((n) => n.toLowerCase().startsWith(forced.toLowerCase()));
      if (i >= 0) now.setMonth(i);
    }
    const month = window.CM_monthSet(now);
    const host = document.getElementById("acrostic");
    if (host) {
      document.getElementById("month-name") && (document.getElementById("month-name").textContent = month.name);
      host.innerHTML = month.words.map((w, i) => {
        const letter = (month.name[i] || w[0]).toUpperCase();
        return `<div class="acro-row"><span class="letter">${letter}</span><span class="phrase">${w}</span></div>`;
      }).join("") + `<svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f3c7c4" d="M12 21s-6.4-4.2-9.2-8.1C.7 10.3 1.2 7 3.8 5.6 6 4.5 8.2 5.4 12 9c3.8-3.6 6-4.5 8.2-3.4 2.6 1.4 3.1 4.7 1 7.3C18.4 16.8 12 21 12 21z"/></svg>`;
    }

    const video = document.getElementById("opener-video");
    const next = document.getElementById("month-stage");
    const go = () => next?.scrollIntoView({ behavior: "smooth" });
    if (video) {
      video.addEventListener("ended", go);
      video.addEventListener("error", () => {
        document.getElementById("opener-fallback")?.classList.add("show");
        setTimeout(go, 6500);
      });
      const play = video.play();
      if (play && play.catch) play.catch(() => setTimeout(go, 6500));
    } else {
      setTimeout(go, 6500);
    }
    document.getElementById("skip-opener")?.addEventListener("click", go);

    const form = document.getElementById("note-form");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("form-status");
      const parts = ["aWZ1dHVyZXByb29m", "QGljbG91ZC5jb20="];
      const endpoint = "https://formsubmit.co/ajax/" + atob(parts.join(""));
      const data = {
        name: form.name.value,
        email: form.email.value,
        note: form.note.value,
        _subject: "CoreyMcDaniel.com note"
      };
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data)
        });
        status.textContent = res.ok ? (I.dict[localStorage.getItem("cm-lang") || "en"].sent) : (I.dict.en.fail);
      } catch {
        status.textContent = I.dict.en.fail;
      }
    });
  });
})();
