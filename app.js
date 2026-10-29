(() => {
  "use strict";
  const config = window.MEDCOR_ANALYTICS_CONFIG || { enabled: false, ga4Id: "", clarityId: "" };
  const params = new URLSearchParams(window.location.search);
  const requestedVariant = (params.get("variant") || "a").toLowerCase();
  const variant = requestedVariant === "b" ? "b" : "a";
  const heroTitle = document.getElementById("hero-title");
  const consentStatus = document.getElementById("consent-status");
  const acceptButton = document.getElementById("consent-accept");
  const rejectButton = document.getElementById("consent-reject");
  const revokeButton = document.getElementById("consent-revoke");
  const STORAGE_KEY = "medcor_training_analytics_consent";

  if (variant === "b" && heroTitle) {
    heroTitle.textContent = "Потрібне обстеження в Одесі? Дізнайтеся, як записатися";
  }
  document.documentElement.dataset.variant = variant;
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  function readConsent() {
    try { return sessionStorage.getItem(STORAGE_KEY); } catch (_) { return null; }
  }
  function writeConsent(value) {
    try { sessionStorage.setItem(STORAGE_KEY, value); return true; } catch (_) { return false; }
  }
  function setStatus(text) {
    if (consentStatus) consentStatus.textContent = text;
  }
  function updateButtons(consent) {
    if (acceptButton) acceptButton.hidden = consent === "granted";
    if (rejectButton) rejectButton.hidden = consent === "granted";
    if (revokeButton) revokeButton.hidden = consent !== "granted";
  }
  function safePagePath() {
    // Do not transmit query parameters, fragments, or arbitrary user-supplied URL data.
    return window.location.pathname || "/";
  }
  function sendGAEvent(name, params = {}) {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, { page_path: safePagePath(), variant, ...params });
    }
  }
  function activateAnalytics() {
    if (!config.enabled) {
      setStatus("Аналітика не активована: власник проєкту ще не налаштував ідентифікатори GA4 і Clarity.");
      return;
    }
    const cleanPath = safePagePath();
    if (config.ga4Id && /^G-[A-Z0-9]+$/i.test(config.ga4Id)) {
      const ga = document.createElement("script");
      ga.async = true;
      ga.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(config.ga4Id);
      document.head.appendChild(ga);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function(){ window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", config.ga4Id, {
        send_page_view: false,
        page_title: "Навчальний лендінг — Медкор Зюйд",
        page_location: window.location.origin + cleanPath,
        page_referrer: ""
      });
      sendGAEvent("page_view", { page_title: "Навчальний лендінг — Медкор Зюйд" });
      sendGAEvent("experiment_view", { experiment_name: config.experimentName || "hero_headline_v1" });
    }
    if (config.clarityId && /^[a-z0-9]+$/i.test(config.clarityId)) {
      // Clarity ConsentV2: analytics is granted only after explicit opt-in; ads remain denied.
      window.clarity = window.clarity || function(){ (window.clarity.q = window.clarity.q || []).push(arguments); };
      window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
      const clarityScript = document.createElement("script");
      clarityScript.async = true;
      clarityScript.src = "https://www.clarity.ms/tag/" + encodeURIComponent(config.clarityId);
      document.head.appendChild(clarityScript);
    }
    if (!config.ga4Id && !config.clarityId) {
      setStatus("Згоду збережено для цієї вкладки, але жоден трекер не завантажено: ідентифікатори не налаштовані.");
    } else {
      setStatus("Згоду на навчальну аналітику надано для цієї вкладки.");
    }
  }
  const existingConsent = readConsent();
  updateButtons(existingConsent);
  if (existingConsent === "granted") activateAnalytics();
  else if (existingConsent === "denied") setStatus("Ви відмовилися від аналітики. Трекери не завантажуються.");

  if (acceptButton) acceptButton.addEventListener("click", () => {
    if (!writeConsent("granted")) {
      setStatus("Сховище недоступне. Для приватності аналітику не активовано.");
      return;
    }
    updateButtons("granted");
    activateAnalytics();
  });
  if (rejectButton) rejectButton.addEventListener("click", () => {
    if (!writeConsent("denied")) {
      setStatus("Відмову застосовано для цієї сторінки; сховище недоступне, трекери не завантажуються.");
      return;
    }
    updateButtons("denied");
    setStatus("Ви відмовилися від аналітики. Трекери не завантажуються.");
  });
  if (revokeButton) revokeButton.addEventListener("click", () => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
    window.location.reload();
  });

  document.querySelectorAll("[data-cta]").forEach((el) => {
    el.addEventListener("click", () => {
      if (readConsent() !== "granted" || !config.enabled) return;
      const placement = el.getAttribute("data-cta") || "unknown";
      sendGAEvent("contact_open", { placement });
    });
  });
})();
