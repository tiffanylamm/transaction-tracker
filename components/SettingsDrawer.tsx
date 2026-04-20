"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@base-ui/react/drawer";
import { authClient } from "@/lib/auth-client";
import { Settings, HardDrive, Loader } from "lucide-react";

type Theme = "light" | "dark" | "system";

interface SettingsDrawerProps {
  showTotalsRow: boolean;
  onToggleTotalsRow: (val: boolean) => void;
  showGroupFilters: boolean;
  onToggleGroupFilters: (val: boolean) => void;
}

export default function SettingsDrawer({ showTotalsRow, onToggleTotalsRow, showGroupFilters, onToggleGroupFilters }: SettingsDrawerProps) {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
    return "system";
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (theme === "system") {
      document.documentElement.classList.toggle("dark", mq.matches);
      const handler = (e: MediaQueryListEvent) =>
        document.documentElement.classList.toggle("dark", e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  function handleThemeChange(newTheme: Theme) {
    localStorage.setItem("theme", newTheme);
    setTheme(newTheme);
  }

  const user = session?.user;

  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/drive/token")
      .then((r) => setDriveConnected(r.ok))
      .catch(() => setDriveConnected(false));
  }, []);

  function handleConnectDrive() {
    setDriveConnecting(true);
    window.location.href = "/api/drive/connect";
  }

  async function handleDeleteAccount() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    await fetch("/api/user", { method: "DELETE" });
    await authClient.signOut();
    router.push("/sign-in");
  }

  function handleLogout() {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/sign-in"),
      },
    });
  }

  return (
    <Drawer.Root swipeDirection="right">
      <Drawer.Trigger className="inline-flex items-center justify-center p-1.5 text-gray-900 hover:bg-gray-50 dark:text-foreground dark:hover:bg-[#424242] rounded transition-colors">
        <Settings className="w-4 h-4" />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop className="[--backdrop-opacity:0.2] [--bleed:3rem] dark:[--backdrop-opacity:0.7] fixed inset-0 z-50 min-h-dvh bg-black opacity-[calc(var(--backdrop-opacity)*(1-var(--drawer-swipe-progress)))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-[swiping]:duration-0 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)] supports-[-webkit-touch-callout:none]:absolute" />
        <Drawer.Viewport className="[--viewport-padding:0px] supports-[-webkit-touch-callout:none]:[--viewport-padding:0.625rem] fixed inset-0 z-50 flex items-stretch justify-end p-(--viewport-padding)">
          <Drawer.Popup className="[--bleed:3rem] supports-[-webkit-touch-callout:none]:[--bleed:0px] h-full w-92 max-w-[calc(100vw-3rem+3rem)] -mr-12 bg-gray-50 dark:bg-[#1b1b1b] p-6 pr-18 text-gray-900 dark:text-foreground outline-1 outline-gray-200 dark:outline-gray-700 overflow-y-auto overscroll-contain touch-auto [transform:translateX(var(--drawer-swipe-movement-x))] transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-[swiping]:select-none data-[ending-style]:[transform:translateX(calc(100%-var(--bleed)+var(--viewport-padding)+2px))] data-[starting-style]:[transform:translateX(calc(100%-var(--bleed)+var(--viewport-padding)+2px))] data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)] supports-[-webkit-touch-callout:none]:mr-0 supports-[-webkit-touch-callout:none]:w-[20rem] supports-[-webkit-touch-callout:none]:max-w-[calc(100vw-20px)] supports-[-webkit-touch-callout:none]:rounded-[10px] supports-[-webkit-touch-callout:none]:pr-6">
            <Drawer.Content className="mx-auto w-full max-w-lg flex flex-col h-full">
              <Drawer.Title className="-mt-1.5 mb-6 text-lg font-medium">
                Settings
              </Drawer.Title>

              {/* Account section */}
              <div className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
                  Account
                </p>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-gray-600 dark:text-gray-400">
                      Name
                    </span>
                    <span className="text-[13px] text-gray-900 dark:text-foreground">
                      {user?.name ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-gray-600 dark:text-gray-400">
                      Email
                    </span>
                    <span className="text-[13px] text-gray-900 dark:text-foreground">
                      {user?.email ?? "—"}
                    </span>
                  </div>
                  <div className="pt-1 self-end">
                    {confirmDelete ? (
                      <div className="rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950 p-3 space-y-2">
                        <p className="text-[12px] text-rose-700 dark:text-rose-300">
                          This will permanently delete your account and all your
                          data. This cannot be undone.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleting}
                            className="flex h-7 items-center justify-center rounded bg-rose-600 dark:bg-rose-700 px-3 text-[12px] font-medium text-white hover:bg-rose-700 dark:hover:bg-rose-600 disabled:opacity-50"
                          >
                            {deleting ? "Deleting…" : "Yes, delete my account"}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="text-[12px] text-gray-500 dark:text-gray-400 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="hover:text-rose-600 dark:hover:text-rose-400 px-3 py-1.5 text-[13px] font-medium rounded-md capitalize transition-all bg-white dark:bg-[#424242] text-gray-900 dark:text-foreground shadow-sm"
                      >
                        Delete account
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Appearance section */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-6 mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
                  Appearance
                </p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] font-medium text-gray-600 dark:text-gray-400">
                      Show Total Amount
                    </span>
                    <button
                      role="switch"
                      aria-checked={showTotalsRow}
                      onClick={() => onToggleTotalsRow(!showTotalsRow)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${showTotalsRow ? "bg-gray-900 dark:bg-gray-100" : "bg-gray-200 dark:bg-gray-700"}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white dark:bg-gray-900 shadow-sm transition-transform mt-0.5 ${showTotalsRow ? "translate-x-4.5" : "translate-x-0.5"}`}
                      />
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] font-medium text-gray-600 dark:text-gray-400">
                      Show Group Filters
                    </span>
                    <button
                      role="switch"
                      aria-checked={showGroupFilters}
                      onClick={() => onToggleGroupFilters(!showGroupFilters)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${showGroupFilters ? "bg-gray-900 dark:bg-gray-100" : "bg-gray-200 dark:bg-gray-700"}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white dark:bg-gray-900 shadow-sm transition-transform mt-0.5 ${showGroupFilters ? "translate-x-4.5" : "translate-x-0.5"}`}
                      />
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] font-medium text-gray-600 dark:text-gray-400">
                      Display
                    </span>
                    <div className="inline-flex bg-gray-100 dark:bg-neutral-800 rounded-lg p-0.5 gap-0.5">
                      {(["light", "dark", "system"] as Theme[]).map(
                        (option) => (
                          <button
                            key={option}
                            onClick={() => handleThemeChange(option)}
                            className={`px-3 py-1.5 text-[13px] font-medium rounded-md capitalize transition-all ${
                              theme === option
                                ? "bg-white dark:bg-[#424242] text-gray-900 dark:text-foreground shadow-sm"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            {option}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Integrations section */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-6 mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
                  Integrations
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-[13px] font-medium text-gray-600 dark:text-gray-400">
                      Google Drive
                    </span>
                  </div>
                  {driveConnected === null ? (
                    <Loader className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                  ) : driveConnected ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-medium tracking-wide bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                      Connected
                    </span>
                  ) : (
                    <button
                      onClick={handleConnectDrive}
                      disabled={driveConnecting}
                      className="inline-flex items-center text-[12px] font-medium text-gray-900 dark:text-foreground px-2 py-0.5 rounded border border-transparent hover:border-gray-900 dark:hover:border-foreground disabled:opacity-50"
                    >
                      {driveConnecting ? "Connecting…" : "Connect"}
                    </button>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-6 mt-auto flex items-center justify-end gap-2">
                <button
                  onClick={handleLogout}
                  className="flex h-10 items-center justify-center rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950 px-3.5 text-base font-medium text-rose-600 dark:text-rose-400 select-none hover:bg-rose-100 dark:hover:bg-rose-900 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-rose-800 active:bg-rose-100 dark:active:bg-rose-900"
                >
                  Log out
                </button>
                <Drawer.Close className="flex h-10 items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1b1b1b] px-3.5 text-base font-medium text-gray-900 dark:text-foreground select-none hover:bg-gray-100 dark:hover:bg-[#424242] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-gray-100 dark:active:bg-[#424242]">
                  Close
                </Drawer.Close>
              </div>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
