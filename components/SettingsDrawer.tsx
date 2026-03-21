"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@base-ui/react/drawer";
import { authClient } from "@/lib/auth-client";
import { Settings } from "lucide-react";

type Theme = "light" | "dark" | "system";

export default function SettingsDrawer() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("system");

  const user = session?.user;

  function handleLogout() {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/sign-in"),
      },
    });
  }

  return (
    <Drawer.Root swipeDirection="right">
      <Drawer.Trigger className="inline-flex items-center justify-center p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors">
        <Settings className="w-4 h-4" />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop className="[--backdrop-opacity:0.2] [--bleed:3rem] dark:[--backdrop-opacity:0.7] fixed inset-0 z-50 min-h-dvh bg-black opacity-[calc(var(--backdrop-opacity)*(1-var(--drawer-swipe-progress)))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-[swiping]:duration-0 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)] supports-[-webkit-touch-callout:none]:absolute" />
        <Drawer.Viewport className="[--viewport-padding:0px] supports-[-webkit-touch-callout:none]:[--viewport-padding:0.625rem] fixed inset-0 z-50 flex items-stretch justify-end p-(--viewport-padding)">
          <Drawer.Popup className="[--bleed:3rem] supports-[-webkit-touch-callout:none]:[--bleed:0px] h-full w-92 max-w-[calc(100vw-3rem+3rem)] -mr-12 bg-gray-50 p-6 pr-18 text-gray-900 outline-1 outline-gray-200 overflow-y-auto overscroll-contain touch-auto [transform:translateX(var(--drawer-swipe-movement-x))] transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-[swiping]:select-none data-[ending-style]:[transform:translateX(calc(100%-var(--bleed)+var(--viewport-padding)+2px))] data-[starting-style]:[transform:translateX(calc(100%-var(--bleed)+var(--viewport-padding)+2px))] data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)] supports-[-webkit-touch-callout:none]:mr-0 supports-[-webkit-touch-callout:none]:w-[20rem] supports-[-webkit-touch-callout:none]:max-w-[calc(100vw-20px)] supports-[-webkit-touch-callout:none]:rounded-[10px] supports-[-webkit-touch-callout:none]:pr-6 dark:outline-gray-300">
            <Drawer.Content className="mx-auto w-full max-w-lg flex flex-col h-full">
              <Drawer.Title className="-mt-1.5 mb-6 text-lg font-medium">
                Settings
              </Drawer.Title>

              {/* Account section */}
              <div className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Account
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-gray-500">Name</span>
                    <span className="text-[13px] text-gray-900">{user?.name ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-gray-500">Email</span>
                    <span className="text-[13px] text-gray-900">{user?.email ?? "—"}</span>
                  </div>
                </div>
              </div>

              {/* Appearance section */}
              <div className="border-t border-gray-100 pt-6 mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Appearance
                </p>
                <div className="inline-flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                  {(["light", "dark", "system"] as Theme[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => setTheme(option)}
                      className={`px-3 py-1.5 text-[13px] font-medium rounded-md capitalize transition-all ${
                        theme === option
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 pt-6 mt-auto flex items-center justify-end gap-2">
                <button
                  onClick={handleLogout}
                  className="flex h-10 items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-3.5 text-base font-medium text-rose-600 select-none hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-rose-800 active:bg-rose-100"
                >
                  Log out
                </button>
                <Drawer.Close className="flex h-10 items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3.5 text-base font-medium text-gray-900 select-none hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-gray-100">
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
