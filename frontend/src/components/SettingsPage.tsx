import React, { useState } from "react";
import { LanguageOption, View } from "../types";
import { useApp } from "../context/AppContext";
import { userService } from "../services/api";

export const SettingsPage: React.FC = () => {
  const {
    targetLanguage,
    setTargetLanguage,
    customTargetLanguages,
    setCustomTargetLanguages,
    addCustomTargetLanguage,
    removeCustomTargetLanguage,
    setCurrentView,
    analysisDisplayMode,
    setAnalysisDisplayMode,
  } = useApp();

  // Using userId 1 for server API calls (same as other parts of the app)
  const { user, setUser } = useApp();
  const userId = user?.id ?? 1;

  const [newLangCode, setNewLangCode] = useState("");
  const [newLangName, setNewLangName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    if (!user) {
      // Prompt for sign-in modal (quick flow): open login/register prompt
      const username = prompt('Enter a username to create a local account:');
      if (!username) return;
      const password = prompt('Enter a password:');
      if (!password) return;
      try {
        const res = await userService.register({ username, password }).catch(() => null);
        if (res && res.token) {
          try { localStorage.setItem('authToken', res.token); } catch (e) {}
          setUser({ id: res.id, username: res.username });
        }
      } catch (e) {
        console.warn('Registration failed', e);
      }
    }
    if (!newLangCode || !newLangName) return;
    const opt = { code: newLangCode, name: newLangName };
    setIsSaving(true);
    try {
      const res = await userService.addUserLanguage(userId, opt).catch(() => null);
      if (res) {
        // server returns the updated list
        setCustomTargetLanguages(res || []);
      } else {
        addCustomTargetLanguage(opt);
        // also persist to server if available
        userService.addUserLanguage(userId, opt).catch(() => null);
      }
    } catch (e) {
      console.warn("Failed to persist language to server, saved locally", e);
      addCustomTargetLanguage(opt);
    } finally {
      setIsSaving(false);
      setNewLangCode("");
      setNewLangName("");
    }
  };

  const handleRemove = async (code: string) => {
    try {
      const res = await userService.removeUserLanguage(userId, code).catch(() => null);
      if (res) {
        setCustomTargetLanguages(res || []);
      } else {
        removeCustomTargetLanguage(code);
        userService.removeUserLanguage(userId, code).catch(() => null);
      }
    } catch (e) {
      console.warn("Failed to remove language on server", e);
      removeCustomTargetLanguage(code);
    }
  };

  const handleSetDefault = async (code: string) => {
    try {
      const res = await userService.setDefaultLanguage(userId, code).catch(() => null);
      if (res) {
        setTargetLanguage(res.targetLanguage || code);
      } else {
        setTargetLanguage(code);
        userService.setDefaultLanguage(userId, code).catch(() => null);
      }
    } catch (e) {
      console.warn("Failed to persist default language on server", e);
      setTargetLanguage(code);
    }
  };

  const handleSetDisplayMode = (mode: "panel" | "popup") => {
    setAnalysisDisplayMode(mode);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => setCurrentView(View.Dashboard)}
        className="mb-4 text-sm text-slate-400"
      >
        ← Back
      </button>
      <h2 className="text-2xl font-bold text-white mb-4">Settings</h2>

      <section className="bg-slate-800/40 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-white mb-2">Target Languages</h3>
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <label className="text-slate-400 text-sm">Current:</label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-200 text-sm"
            >
              {[
                { code: "Chinese", name: "Chinese" },
                ...(customTargetLanguages || []),
              ].map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3">
            <h4 className="text-sm text-slate-300 mb-2">Add new language</h4>
            <div className="flex gap-2">
              <input
                placeholder="code (eg 'Korean')"
                value={newLangCode}
                onChange={(e) => setNewLangCode(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-200 text-sm"
              />
              <input
                placeholder="name"
                value={newLangName}
                onChange={(e) => setNewLangName(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-200 text-sm"
              />
              <button
                onClick={handleAdd}
                className="px-3 py-1 bg-sky-600 rounded-md text-white"
              >
                Add
              </button>
            </div>
          </div>

          <div className="mt-3">
            <h4 className="text-sm text-slate-300 mb-2">Custom languages</h4>
            <div className="space-y-2">
              {(customTargetLanguages || []).map((c) => (
                <div
                  key={c.code}
                  className="flex items-center justify-between bg-slate-700/30 p-2 rounded-md"
                >
                  <div>
                    <div className="font-semibold text-white">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.code}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSetDefault(c.code)}
                      className="px-2 py-1 bg-emerald-600 rounded-md text-white text-sm"
                    >
                      Set Default
                    </button>
                    <button
                      onClick={() => handleRemove(c.code)}
                      className="px-2 py-1 bg-red-600 rounded-md text-white text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-800/40 p-4 rounded-lg">
        <h3 className="font-semibold text-white mb-2">Reader Settings</h3>
        <div className="text-slate-400 text-sm space-y-3">
          <div>
            <p className="text-sm text-slate-300 mb-2">Analysis Display</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleSetDisplayMode("panel")}
                className={`px-3 py-1 rounded-md text-sm ${analysisDisplayMode === "panel" ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-200 hover:bg-slate-700/80"}`}
              >
                Side Panel
              </button>
              <button
                onClick={() => handleSetDisplayMode("popup")}
                className={`px-3 py-1 rounded-md text-sm ${analysisDisplayMode === "popup" ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-200 hover:bg-slate-700/80"}`}
              >
                Popup
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-300 mb-2">Text Selection</p>
            <p className="text-slate-400 text-sm">Controls related to selection behavior will appear here (e.g. auto-analyze, select-to-highlight). Add additional options as needed.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
