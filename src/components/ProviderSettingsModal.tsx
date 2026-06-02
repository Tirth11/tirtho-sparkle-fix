import { useEffect, useState } from "react";
import { Check, Loader2, Key, ShieldCheck, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Status = {
  lovable: { configured: boolean; source: "env" | "missing" };
  nvidia: {
    envConfigured: boolean;
    userOverride: boolean;
    activeSource: "user" | "env" | "missing";
    maskedKey: string | null;
    testOk: boolean | null;
    testError?: string;
  };
};

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function ProviderSettingsModal({ open, onClose }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/provider-status", { headers: await authHeader() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus((await res.json()) as Status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setNewKey("");
      refresh();
    }
  }, [open]);

  const saveKey = async (clear = false) => {
    setSaving(true);
    try {
      const res = await fetch("/api/provider-status", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ nvidiaKey: clear ? null : newKey }),
      });
      const data = (await res.json()) as { ok?: boolean; testOk?: boolean; testError?: string; message?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.message ?? "Save failed");
        return;
      }
      if (data.testOk === false) {
        toast.warning(`Key saved but test failed: ${data.testError ?? "unknown"}`);
      } else {
        toast.success(clear ? "NVIDIA key cleared" : "NVIDIA key saved & verified");
      }
      setNewKey("");
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Provider settings</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {loading && !status ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading status…
            </div>
          ) : status ? (
            <>
              {/* Lovable AI */}
              <ProviderRow
                name="Lovable AI Gateway"
                ok={status.lovable.configured}
                detail={
                  status.lovable.configured
                    ? "LOVABLE_API_KEY present (env)"
                    : "LOVABLE_API_KEY missing"
                }
              />

              {/* NVIDIA */}
              <div className="rounded-xl border border-border p-3">
                <ProviderRow
                  name="NVIDIA Build"
                  ok={status.nvidia.testOk === true}
                  warn={status.nvidia.testOk === false}
                  detail={
                    status.nvidia.activeSource === "missing"
                      ? "No key configured"
                      : `Active key: ${status.nvidia.maskedKey} · source: ${status.nvidia.activeSource === "user" ? "your override" : "environment"}${status.nvidia.testOk === false ? ` · test: ${status.nvidia.testError}` : status.nvidia.testOk ? " · verified" : ""}`
                  }
                />

                <div className="mt-3 space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Update NVIDIA API key (overrides environment)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Key className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type={showKey ? "text" : "password"}
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="nvapi-..."
                        className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-16 text-xs font-mono outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        {showKey ? "Hide" : "Show"}
                      </button>
                    </div>
                    <button
                      onClick={() => saveKey(false)}
                      disabled={saving || newKey.trim().length < 20}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Save
                    </button>
                  </div>
                  {status.nvidia.userOverride && (
                    <button
                      onClick={() => saveKey(true)}
                      disabled={saving}
                      className="text-[11px] text-muted-foreground underline hover:text-destructive"
                    >
                      Clear my override and use environment key
                    </button>
                  )}
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Stored privately in your account. Takes effect immediately for new
                    messages — no redeploy needed. Get a free key at build.nvidia.com.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Could not load status.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProviderRow({ name, ok, warn, detail }: { name: string; ok: boolean; warn?: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          ok
            ? "bg-emerald-500/15 text-emerald-500"
            : warn
              ? "bg-amber-500/15 text-amber-500"
              : "bg-destructive/15 text-destructive"
        }`}
      >
        {ok ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-[11px] text-muted-foreground break-all">{detail}</div>
      </div>
    </div>
  );
}
